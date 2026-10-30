import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { generatePassCode } from '@/lib/qrUtils';
import {
  validateDocumentImageDataUrl,
  sanitizeVisitsWithDbFlags,
  sanitizePersonForClient,
} from '@/lib/personSanitizer';

function formatCardNoForStorage(raw: string): string {
  return raw
    .trim()
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

function normalizeCardKey(raw: string): string {
  return raw
    .trim()
    .replace(/[\s\-_.]+/g, '')
    .toUpperCase();
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      fullName,
      fatherHusbandName,
      cnicNumber,
      dlsNumber,
      category = 'VISITOR',
      gender,
      dateOfBirth,
      dateOfIssue,
      dateOfExpiry,
      licensingAuthority,
      identification,
      presentAddress,
      permanentAddress,
      phoneNumber,
      photoUrl,
      cnicImageData,
      dlsImageData,
      company,
      hostName,
      department,
      departmentId,
      purpose,
      visitorCardNo,
      vehicleNo,
      belongings,
      entryGateId,
      notes,
    } = body;

    if (!fullName || !fullName.trim()) {
      return NextResponse.json({ error: 'Full name is required' }, { status: 400 });
    }

    if (!hostName || !hostName.trim()) {
      return NextResponse.json({ error: 'Host person name is required' }, { status: 400 });
    }

    // Resolve Department (supports both departmentId and department name)
    let resolvedDepartmentId: string | null =
      typeof departmentId === 'string' && departmentId.trim() ? departmentId.trim() : null;
    let resolvedDepartmentName: string =
      typeof department === 'string' ? department.trim() : '';

    if (resolvedDepartmentId) {
      try {
        const deptRows = await prisma.$queryRaw<
          Array<{ id: string; name: string; active: boolean }>
        >`
          SELECT "id", "name", "active"
          FROM "departments"
          WHERE "id" = ${resolvedDepartmentId}
          LIMIT 1
        `;
        if (deptRows.length > 0) {
          resolvedDepartmentId = deptRows[0].id;
          resolvedDepartmentName = deptRows[0].name;
        } else {
          resolvedDepartmentId = null;
        }
      } catch {
        resolvedDepartmentId = null;
      }
    } else if (resolvedDepartmentName) {
      try {
        const normalizedDept = resolvedDepartmentName.toLowerCase().replace(/\s+/g, ' ');
        const deptRows = await prisma.$queryRaw<Array<{ id: string; name: string }>>`
          SELECT "id", "name"
          FROM "departments"
          WHERE "normalizedName" = ${normalizedDept}
          LIMIT 1
        `;
        if (deptRows.length > 0) {
          resolvedDepartmentId = deptRows[0].id;
          resolvedDepartmentName = deptRows[0].name;
        }
      } catch {
        // Non-fatal fallback: keep resolvedDepartmentName
      }
    }

    if (!resolvedDepartmentName) {
      return NextResponse.json({ error: 'Department is required' }, { status: 400 });
    }

    // Manual Visitor Card Number validation: required, never auto-generated
    const formattedCardNo = visitorCardNo ? formatCardNoForStorage(String(visitorCardNo)) : '';
    const cardComparisonKey = visitorCardNo ? normalizeCardKey(String(visitorCardNo)) : '';

    if (!formattedCardNo || !cardComparisonKey) {
      return NextResponse.json(
        { error: 'Visitor Card Number is required. Please enter the number printed on the physical card.' },
        { status: 400 }
      );
    }

    // Phone number is optional; if provided (non-empty), validate 11 digits starting with 03
    const cleanPhone =
      typeof phoneNumber === 'string' && phoneNumber.trim().length > 0
        ? phoneNumber.trim()
        : null;

    if (cleanPhone && !/^03\d{9}$/.test(cleanPhone)) {
      return NextResponse.json(
        { error: 'Phone number must be an 11-digit Pakistani mobile number starting with 03 (e.g. 03001234567)' },
        { status: 400 }
      );
    }

    // Resolve and enforce Gate authorization from server-side session & UserGateAccess
    let resolvedGateId: string | null =
      typeof entryGateId === 'string' && entryGateId.trim() ? entryGateId.trim() : null;

    if (user.role === 'OPERATOR') {
      const operatorGateAccess = await prisma.userGateAccess.findMany({
        where: { userId: user.id },
        include: { gate: true },
      });
      const assignedActiveGates = operatorGateAccess
        .map((ga) => ga.gate)
        .filter((g): g is NonNullable<typeof g> => Boolean(g && g.active));

      if (assignedActiveGates.length === 0) {
        return NextResponse.json(
          {
            error:
              'No gate is assigned to your Operator account. Please contact an Administrator to assign a gate before checking in visitors.',
            code: 'NO_GATE_ASSIGNED',
          },
          { status: 403 }
        );
      }

      if (resolvedGateId) {
        const isAssigned = assignedActiveGates.some((g) => g.id === resolvedGateId);
        if (!isAssigned) {
          return NextResponse.json(
            {
              error: 'You are not authorized to check in visitors at the selected gate.',
              code: 'UNAUTHORIZED_GATE',
            },
            { status: 403 }
          );
        }
      } else {
        resolvedGateId = assignedActiveGates[0].id;
      }
    } else {
      // ADMIN: validate requested gate if provided, otherwise fall back to first active gate
      if (resolvedGateId) {
        const dbGate = await prisma.gate.findFirst({
          where: { id: resolvedGateId, active: true },
        });
        if (!dbGate) {
          resolvedGateId = null;
        }
      }
      if (!resolvedGateId) {
        const defaultGate = await prisma.gate.findFirst({
          where: { active: true },
          orderBy: { createdAt: 'asc' },
        });
        if (defaultGate) {
          resolvedGateId = defaultGate.id;
        } else {
          const newGate = await prisma.gate.create({
            data: {
              name: 'Main Gate - Entry & Exit',
              type: 'BOTH',
              active: true,
            },
          });
          resolvedGateId = newGate.id;
        }
      }
    }

    const cleanCnic = cnicNumber ? cnicNumber.trim() : null;
    const cleanDls = dlsNumber ? dlsNumber.trim() : null;

    // Concurrency-safe transaction: acquire advisory lock on normalized card key,
    // verify card is not assigned to any active visitor, verify person is not blacklisted or already inside,
    // and atomically create the visit record.
    const { visit, person } = await prisma.$transaction(async (tx) => {
      const lockNamespaceKey = `gk_card_${cardComparisonKey}`;
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
        (v) => v.visitorCardNo && normalizeCardKey(v.visitorCardNo) === cardComparisonKey
      );

      if (duplicateCardVisit) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const conflictErr: any = new Error(
          'This card is already assigned. Please choose another available card.'
        );
        conflictErr.status = 409;
        conflictErr.code = 'CARD_ALREADY_ASSIGNED';
        throw conflictErr;
      }

      const duplicatePendingInvitation = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id"
        FROM "guest_invitations"
        WHERE "status"::text = 'PENDING'
          AND "normalizedCardKey" IS NOT NULL
          AND "normalizedCardKey" = ${cardComparisonKey}
        LIMIT 1
      `;

      if (duplicatePendingInvitation.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const conflictErr: any = new Error(
          'This card is already preassigned to an upcoming invited guest. Please choose another available card.'
        );
        conflictErr.status = 409;
        conflictErr.code = 'CARD_ALREADY_ASSIGNED';
        throw conflictErr;
      }

      let existingPerson = null;

      if (cleanCnic) {
        existingPerson = await tx.person.findUnique({
          where: { cnicNumber: cleanCnic },
        });
      }

      if (!existingPerson && cleanDls) {
        existingPerson = await tx.person.findUnique({
          where: { dlsNumber: cleanDls },
        });
      }

      if (!existingPerson && cleanPhone) {
        existingPerson = await tx.person.findFirst({
          where: { phoneNumber: cleanPhone },
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
        const activeVisit = await tx.visit.findFirst({
          where: {
            personId: existingPerson.id,
            status: { in: ['CHECKED_IN', 'OVERSTAY'] },
            checkOutTime: null,
          },
        });

        if (activeVisit) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const alreadyInsideErr: any = new Error(
            `Warning: This person is already checked in (Visit #${activeVisit.visitNumber}). Please check them out before new entry.`
          );
          alreadyInsideErr.status = 409;
          alreadyInsideErr.activeVisitId = activeVisit.id;
          alreadyInsideErr.visitNumber = activeVisit.visitNumber;
          throw alreadyInsideErr;
        }
      }

      const personData = {
        fullName: fullName.trim(),
        fatherHusbandName: fatherHusbandName?.trim() || null,
        cnicNumber: cleanCnic,
        dlsNumber: cleanDls,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        category: category as any,
        gender: gender?.trim() || null,
        dateOfBirth: dateOfBirth?.trim() || null,
        dateOfIssue: dateOfIssue?.trim() || null,
        dateOfExpiry: dateOfExpiry?.trim() || null,
        licensingAuthority: licensingAuthority?.trim() || null,
        identification: identification?.trim() || null,
        presentAddress: presentAddress?.trim() || null,
        permanentAddress: permanentAddress?.trim() || null,
        phoneNumber: cleanPhone || existingPerson?.phoneNumber || null,
        photoUrl: photoUrl || existingPerson?.photoUrl || null,
        company: company?.trim() || null,
        belongings: belongings?.trim() || null,
      };

      const savedPerson = existingPerson
        ? await tx.person.update({
            where: { id: existingPerson.id },
            data: personData,
          })
        : await tx.person.create({
            data: personData,
          });

      const today = new Date();
      const datePrefix = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
      const todayVisitsCount = await tx.visit.count({
        where: {
          checkInTime: {
            gte: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0),
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
          hostName: hostName.trim(),
          department: resolvedDepartmentName,
          purpose: purpose?.trim() || null,
          visitorCardNo: formattedCardNo,
          vehicleNo: vehicleNo?.trim() || null,
          belongings: belongings?.trim() || null,
          status: 'CHECKED_IN',
          entryGateId: resolvedGateId,
          checkedInById: user.id,
          notes: notes?.trim() || null,
        },
        include: {
          person: true,
          entryGate: true,
          checkedInBy: { select: { id: true, name: true } },
        },
      });

      if (resolvedDepartmentId) {
        await tx.$executeRaw`
          UPDATE "visits"
          SET "departmentId" = ${resolvedDepartmentId}
          WHERE "id" = ${createdVisit.id}
        `;
      }

      return { visit: createdVisit, person: savedPerson };
    });

    // Save scanned CNIC / DLS document images using parameterized SQL so cached Prisma DMMF never rejects the columns
    let imageStorageStatus: 'saved' | 'failed' | 'none' = 'none';
    let imageStorageError: string | null = null;
    const hasIncomingCnicImage = typeof cnicImageData === 'string' && cnicImageData.trim().length > 0;
    const hasIncomingDlsImage = typeof dlsImageData === 'string' && dlsImageData.trim().length > 0;

    if (hasIncomingCnicImage || hasIncomingDlsImage) {
      let validCnicData: string | null = null;
      let validCnicMime: string | null = null;
      let validDlsData: string | null = null;
      let validDlsMime: string | null = null;
      const validationErrors: string[] = [];

      if (hasIncomingCnicImage) {
        try {
          const cnicValidation = validateDocumentImageDataUrl(cnicImageData);
          validCnicData = cnicValidation.normalizedDataUrl;
          validCnicMime = cnicValidation.mime;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Invalid image';
          validationErrors.push(`CNIC image: ${msg}`);
        }
      }

      if (hasIncomingDlsImage) {
        try {
          const dlsValidation = validateDocumentImageDataUrl(dlsImageData);
          validDlsData = dlsValidation.normalizedDataUrl;
          validDlsMime = dlsValidation.mime;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Invalid image';
          validationErrors.push(`Driving Licence image: ${msg}`);
        }
      }

      if (validationErrors.length > 0) {
        imageStorageStatus = 'failed';
        imageStorageError = validationErrors.join('; ');
      }

      if (validCnicData || validDlsData) {
        try {
          if (validCnicData && validDlsData) {
            await prisma.$executeRaw`
              UPDATE "persons"
              SET "cnicImageData" = ${validCnicData},
                  "cnicImageMime" = ${validCnicMime},
                  "dlsImageData" = ${validDlsData},
                  "dlsImageMime" = ${validDlsMime},
                  "updatedAt" = NOW()
              WHERE "id" = ${person.id}
            `;
          } else if (validCnicData) {
            await prisma.$executeRaw`
              UPDATE "persons"
              SET "cnicImageData" = ${validCnicData},
                  "cnicImageMime" = ${validCnicMime},
                  "updatedAt" = NOW()
              WHERE "id" = ${person.id}
            `;
          } else if (validDlsData) {
            await prisma.$executeRaw`
              UPDATE "persons"
              SET "dlsImageData" = ${validDlsData},
                  "dlsImageMime" = ${validDlsMime},
                  "updatedAt" = NOW()
              WHERE "id" = ${person.id}
            `;
          }

          if (validationErrors.length === 0) {
            imageStorageStatus = 'saved';
          }
        } catch (imgErr: unknown) {
          const msg = imgErr instanceof Error ? imgErr.message : 'Database update failed';
          console.error('Failed to store identity document image for person:', person.id, msg);
          imageStorageStatus = 'failed';
          imageStorageError = 'Failed to save scanned ID card image to database.';
        }
      }
    }

    await logAudit({
      action: 'CHECK_IN',
      entityType: 'Visit',
      entityId: visit.id,
      details: {
        visitNumber: visit.visitNumber,
        personName: person.fullName,
        cnic: person.cnicNumber,
        host: visit.hostName,
        department: visit.department,
        departmentId: resolvedDepartmentId,
        cardNo: visit.visitorCardNo,
        imageStorageStatus,
      },
      performedById: user.id,
    });

    const [sanitizedVisit] = await sanitizeVisitsWithDbFlags([
      {
        ...visit,
        departmentId: resolvedDepartmentId,
      },
    ]);

    return NextResponse.json({
      success: true,
      message: 'Visitor checked in successfully',
      visit: sanitizedVisit,
      imageStorageStatus,
      imageStorageError,
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
          person: err.person ? sanitizePersonForClient(err.person) : undefined,
          activeVisitId: err.activeVisitId,
          visitNumber: err.visitNumber,
        },
        { status: err.status }
      );
    }

    console.error('Check-in error:', error);
    return NextResponse.json(
      { error: err?.message || 'Failed to complete check-in' },
      { status: 500 }
    );
  }
}
