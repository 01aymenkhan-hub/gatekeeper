import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { getSessionUser, getEmployeeSessionUser } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { generatePassCode } from '@/lib/qrUtils';
import { sanitizeVisitsWithDbFlags, sanitizePersonForClient } from '@/lib/personSanitizer';
import { normalizeCardKey } from '@/lib/cardUtils';
import { GuestInvitationRecord } from '@/app/api/employee/invitations/route';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      const emp = await getEmployeeSessionUser();
      if (emp) {
        return NextResponse.json(
          { error: 'Forbidden: Employees cannot perform Operator gate check-ins.' },
          { status: 403 }
        );
      }
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: invitationId } = await context.params;
    if (!invitationId) {
      return NextResponse.json({ error: 'Invitation ID is required.' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const requestedGateId =
      typeof body.entryGateId === 'string' && body.entryGateId.trim()
        ? body.entryGateId.trim()
        : null;
    const confirmedCardNo =
      typeof body.confirmedCardNo === 'string' && body.confirmedCardNo.trim()
        ? body.confirmedCardNo.trim()
        : null;
    const vehicleNo =
      typeof body.vehicleNo === 'string' && body.vehicleNo.trim()
        ? body.vehicleNo.trim()
        : null;
    const notes =
      typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null;

    // Resolve and verify Operator's gate authorization
    const operatorGateAccess = await prisma.userGateAccess.findMany({
      where: { userId: user.id },
      include: { gate: true },
    });
    const assignedActiveGates = operatorGateAccess
      .map((ga) => ga.gate)
      .filter((g) => g && g.active);

    let resolvedGate: { id: string; name: string } | null = null;

    if (requestedGateId) {
      if (user.role === 'OPERATOR' && assignedActiveGates.length > 0) {
        const match = assignedActiveGates.find((g) => g.id === requestedGateId);
        if (!match) {
          return NextResponse.json(
            { error: 'Forbidden: You are not authorized to check in visitors at the selected gate.' },
            { status: 403 }
          );
        }
        resolvedGate = { id: match.id, name: match.name };
      } else {
        const dbGate = await prisma.gate.findFirst({
          where: { id: requestedGateId, active: true },
        });
        if (dbGate) {
          resolvedGate = { id: dbGate.id, name: dbGate.name };
        }
      }
    }

    if (!resolvedGate) {
      if (assignedActiveGates.length > 0) {
        resolvedGate = {
          id: assignedActiveGates[0].id,
          name: assignedActiveGates[0].name,
        };
      } else {
        const defaultGate = await prisma.gate.findFirst({
          where: { active: true },
          orderBy: { createdAt: 'asc' },
        });
        if (defaultGate) {
          resolvedGate = { id: defaultGate.id, name: defaultGate.name };
        } else {
          const createdGate = await prisma.gate.create({
            data: {
              name: 'Main Gate - Entry & Exit',
              type: 'BOTH',
              active: true,
            },
          });
          resolvedGate = { id: createdGate.id, name: createdGate.name };
        }
      }
    }

    // Mandatory Atomic Concurrency-Safe Check-In Transaction
    const { visit, person, updatedInvitation } = await prisma.$transaction(async (tx) => {
      // 1. Row-level lock on the guest_invitations record so concurrent check-in requests serialize
      const lockedRows = await tx.$queryRaw<GuestInvitationRecord[]>`
        SELECT
          "id",
          "employeeId",
          "employeeName",
          "departmentId",
          "departmentName",
          "guestName",
          "guestPhone",
          "guestCnic",
          "guestPhotoUrl",
          "visitorCardNo",
          "normalizedCardKey",
          "visitDate",
          "expectedArrivalTime",
          "expectedDurationWindow",
          "status"::text AS "status",
          "visitId",
          "actualCheckInTime",
          "actualCheckOutTime",
          "entryGateId",
          "entryGateName",
          "checkedInById",
          "checkedInByName",
          "reinvitedFromId",
          "createdAt",
          "updatedAt"
        FROM "guest_invitations"
        WHERE "id" = ${invitationId}
        FOR UPDATE
      `;

      const invitation = lockedRows[0];
      if (!invitation) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const notFoundErr: any = new Error('Guest invitation not found.');
        notFoundErr.status = 404;
        throw notFoundErr;
      }

      if (invitation.status !== 'PENDING') {
        const checkedByText = invitation.checkedInByName
          ? ` by ${invitation.checkedInByName}`
          : '';
        const gateText = invitation.entryGateName ? ` at ${invitation.entryGateName}` : '';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const conflictErr: any = new Error(
          `This guest has already been checked in${checkedByText}${gateText}.`
        );
        conflictErr.status = 409;
        conflictErr.code = 'INVITATION_ALREADY_CHECKED_IN';
        throw conflictErr;
      }

      // 2. Verify operator did not try to change the preassigned Visitor Card Number
      if (
        confirmedCardNo &&
        normalizeCardKey(confirmedCardNo) !== invitation.normalizedCardKey
      ) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cardMismatchErr: any = new Error(
          `Invited guest must use their preassigned Visitor Card Number (${invitation.visitorCardNo}).`
        );
        cardMismatchErr.status = 400;
        throw cardMismatchErr;
      }

      // 3. Acquire advisory lock on physical card key and verify no active visit holds it
      const lockNamespaceKey = `gk_card_${invitation.normalizedCardKey}`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockNamespaceKey}))`;

      const activeVisitsWithCards = await tx.visit.findMany({
        where: {
          status: { in: ['CHECKED_IN', 'OVERSTAY'] },
          checkOutTime: null,
          visitorCardNo: { not: null },
        },
        select: {
          id: true,
          visitorCardNo: true,
          visitNumber: true,
        },
      });

      const duplicateCardVisit = activeVisitsWithCards.find(
        (v) => v.visitorCardNo && normalizeCardKey(v.visitorCardNo) === invitation.normalizedCardKey
      );

      if (duplicateCardVisit) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cardConflictErr: any = new Error(
          `Visitor Card ${invitation.visitorCardNo} is currently in use by Visit #${duplicateCardVisit.visitNumber}.`
        );
        cardConflictErr.status = 409;
        cardConflictErr.code = 'CARD_ALREADY_ASSIGNED';
        throw cardConflictErr;
      }

      // 4. Find or create Person record (preserving historical visitor records)
      let existingPerson = null;
      if (invitation.guestCnic) {
        existingPerson = await tx.person.findUnique({
          where: { cnicNumber: invitation.guestCnic },
        });
      }
      if (!existingPerson && invitation.guestPhone) {
        existingPerson = await tx.person.findFirst({
          where: { phoneNumber: invitation.guestPhone },
        });
      }

      if (existingPerson && existingPerson.isBlacklisted) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const blacklistErr: any = new Error(
          `ACCESS DENIED: This person is blacklisted! Reason: ${existingPerson.blacklistReason || 'Security alert'}`
        );
        blacklistErr.status = 403;
        blacklistErr.blacklisted = true;
        blacklistErr.person = sanitizePersonForClient(existingPerson);
        throw blacklistErr;
      }

      if (existingPerson) {
        const activeVisitForPerson = await tx.visit.findFirst({
          where: {
            personId: existingPerson.id,
            status: { in: ['CHECKED_IN', 'OVERSTAY'] },
            checkOutTime: null,
          },
        });
        if (activeVisitForPerson) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const alreadyInsideErr: any = new Error(
            `This guest is already checked in (Visit #${activeVisitForPerson.visitNumber}).`
          );
          alreadyInsideErr.status = 409;
          throw alreadyInsideErr;
        }
      }

      const savedPerson = existingPerson
        ? await tx.person.update({
            where: { id: existingPerson.id },
            data: {
              fullName: invitation.guestName,
              cnicNumber: invitation.guestCnic || existingPerson.cnicNumber || null,
              phoneNumber: invitation.guestPhone || existingPerson.phoneNumber || null,
              photoUrl: invitation.guestPhotoUrl || existingPerson.photoUrl || null,
            },
          })
        : await tx.person.create({
            data: {
              fullName: invitation.guestName,
              cnicNumber: invitation.guestCnic || null,
              phoneNumber: invitation.guestPhone,
              photoUrl: invitation.guestPhotoUrl || null,
              category: 'SPECIAL_GUEST',
            },
          });

      // 5. Create Visit record
      const now = new Date();
      const datePrefix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
      const todayVisitsCount = await tx.visit.count({
        where: {
          checkInTime: {
            gte: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0),
          },
        },
      });
      const visitNumber = `VIS-${datePrefix}-${String(todayVisitsCount + 1).padStart(4, '0')}`;
      const passCode = generatePassCode();

      const createdVisit = await tx.visit.create({
        data: {
          visitNumber,
          passCode,
          personId: savedPerson.id,
          hostName: invitation.employeeName,
          department: invitation.departmentName,
          purpose: `Invited Guest (${invitation.expectedDurationWindow})`,
          visitorCardNo: invitation.visitorCardNo,
          vehicleNo,
          status: 'CHECKED_IN',
          checkInTime: now,
          entryGateId: resolvedGate!.id,
          checkedInById: user.id,
          notes: notes || `Pre-invited by ${invitation.employeeName} (${invitation.departmentName})`,
        },
        include: {
          person: true,
          entryGate: true,
          checkedInBy: { select: { id: true, name: true } },
        },
      });

      if (invitation.departmentId) {
        await tx.$executeRaw`
          UPDATE "visits"
          SET "departmentId" = ${invitation.departmentId}
          WHERE "id" = ${createdVisit.id}
        `;
      }

      // 6. Atomically transition invitation from PENDING -> CHECKED_IN
      const conditionalUpdateCount = await tx.$executeRaw`
        UPDATE "guest_invitations"
        SET "status" = 'CHECKED_IN'::"InvitationStatus",
            "visitId" = ${createdVisit.id},
            "actualCheckInTime" = ${now},
            "entryGateId" = ${resolvedGate!.id},
            "entryGateName" = ${resolvedGate!.name},
            "checkedInById" = ${user.id},
            "checkedInByName" = ${user.name},
            "updatedAt" = ${now}
        WHERE "id" = ${invitation.id}
          AND "status"::text = 'PENDING'
      `;

      if (conditionalUpdateCount === 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raceErr: any = new Error(
          'This guest invitation was just checked in by another operator.'
        );
        raceErr.status = 409;
        raceErr.code = 'INVITATION_ALREADY_CHECKED_IN';
        throw raceErr;
      }

      // 7. Create exactly ONE persistent arrival notification for the inviting employee
      const arrivalTimeFormatted = now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      const notifId = `ntf_${crypto.randomBytes(10).toString('hex')}`;
      const dedupeKey = `guest_arrived_${invitation.id}`;
      await tx.$executeRaw`
        INSERT INTO "app_notifications" (
          "id",
          "recipientUserId",
          "type",
          "title",
          "message",
          "invitationId",
          "visitId",
          "dedupeKey",
          "isRead",
          "createdAt"
        )
        VALUES (
          ${notifId},
          ${invitation.employeeId},
          'GUEST_ARRIVED',
          'Your Invited Guest Has Arrived',
          ${`Your guest ${invitation.guestName} (Card ${invitation.visitorCardNo}) has arrived and checked in at ${resolvedGate!.name} at ${arrivalTimeFormatted}.`},
          ${invitation.id},
          ${createdVisit.id},
          ${dedupeKey},
          false,
          ${now}
        )
        ON CONFLICT ("dedupeKey") DO NOTHING
      `;

      const updatedRows = await tx.$queryRaw<GuestInvitationRecord[]>`
        SELECT
          "id",
          "employeeId",
          "employeeName",
          "departmentId",
          "departmentName",
          "guestName",
          "guestPhone",
          "guestCnic",
          "guestPhotoUrl",
          "visitorCardNo",
          "normalizedCardKey",
          "visitDate",
          "expectedArrivalTime",
          "expectedDurationWindow",
          "status"::text AS "status",
          "visitId",
          NULL::text AS "visitNumber",
          "actualCheckInTime",
          "actualCheckOutTime",
          "entryGateId",
          "entryGateName",
          "checkedInById",
          "checkedInByName",
          "reinvitedFromId",
          "createdAt",
          "updatedAt"
        FROM "guest_invitations"
        WHERE "id" = ${invitation.id}
        LIMIT 1
      `;

      return {
        visit: createdVisit,
        person: savedPerson,
        updatedInvitation: updatedRows[0],
      };
    });

    await logAudit({
      action: 'CHECK_IN_INVITED_GUEST',
      entityType: 'Visit',
      entityId: visit.id,
      details: {
        invitationId,
        visitNumber: visit.visitNumber,
        guestName: person.fullName,
        visitorCardNo: visit.visitorCardNo,
        hostName: visit.hostName,
        department: visit.department,
        entryGateId: resolvedGate.id,
        entryGateName: resolvedGate.name,
      },
      performedById: user.id,
    });

    const [sanitizedVisit] = await sanitizeVisitsWithDbFlags([
      {
        ...visit,
        departmentId: updatedInvitation.departmentId,
      },
    ]);

    const remainingRows = await prisma.$queryRaw<Array<{ pendingCount: number }>>`
      SELECT COUNT(*)::int AS "pendingCount"
      FROM "guest_invitations"
      WHERE "status"::text = 'PENDING'
    `;

    return NextResponse.json({
      success: true,
      message: `${person.fullName} checked in at ${resolvedGate.name} using Card ${visit.visitorCardNo}.`,
      visit: sanitizedVisit,
      invitation: updatedInvitation,
      pendingCount: remainingRows[0]?.pendingCount ?? 0,
    });
  } catch (error: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = error as any;
    if (err?.status) {
      return NextResponse.json(
        {
          error: err.message,
          code: err.code,
          blacklisted: err.blacklisted,
          person: err.person,
        },
        { status: err.status }
      );
    }

    console.error('Invited guest check-in error:', error);
    return NextResponse.json(
      { error: 'Failed to check in invited guest.' },
      { status: 500 }
    );
  }
}
