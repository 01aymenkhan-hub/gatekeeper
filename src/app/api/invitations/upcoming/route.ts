import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser, getEmployeeSessionUser } from '@/lib/auth';
import { GuestInvitationRecord, EmployeeNotificationRecord } from '@/app/api/employee/invitations/route';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      const emp = await getEmployeeSessionUser();
      if (emp) {
        return NextResponse.json(
          { error: 'Forbidden: Employees cannot access Operator gate endpoints.' },
          { status: 403 }
        );
      }
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Shared across ALL gate operators regardless of gate assignment (never filtered by gate)
    const upcomingInvitations = await prisma.$queryRaw<GuestInvitationRecord[]>`
      SELECT
        gi."id",
        gi."employeeId",
        gi."employeeName",
        gi."departmentId",
        gi."departmentName",
        gi."guestName",
        gi."guestPhone",
        gi."guestCnic",
        gi."guestPhotoUrl",
        gi."visitorCardNo",
        gi."normalizedCardKey",
        gi."visitDate",
        gi."expectedArrivalTime",
        gi."expectedDurationWindow",
        gi."status"::text AS "status",
        gi."visitId",
        NULL::text AS "visitNumber",
        gi."actualCheckInTime",
        gi."actualCheckOutTime",
        gi."entryGateId",
        gi."entryGateName",
        gi."checkedInById",
        gi."checkedInByName",
        gi."reinvitedFromId",
        gi."createdAt",
        gi."updatedAt"
      FROM "guest_invitations" gi
      WHERE gi."status"::text = 'PENDING'
      ORDER BY gi."visitDate" ASC, gi."createdAt" DESC
    `;

    const operatorNotifications = await prisma.$queryRaw<EmployeeNotificationRecord[]>`
      SELECT
        "id",
        "recipientUserId",
        "type",
        "title",
        "message",
        "invitationId",
        "visitId",
        "isRead",
        "createdAt"
      FROM "app_notifications"
      WHERE "recipientRole" = 'OPERATOR'
      ORDER BY "createdAt" DESC
      LIMIT 15
    `;

    return NextResponse.json({
      success: true,
      pendingCount: upcomingInvitations.length,
      invitations: upcomingInvitations,
      notifications: operatorNotifications,
    });
  } catch (error: unknown) {
    console.error('Error loading upcoming guest invitations:', error);
    return NextResponse.json(
      { error: 'Failed to load upcoming guest invitations.' },
      { status: 500 }
    );
  }
}
