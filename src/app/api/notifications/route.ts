import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser, getEmployeeSessionUser } from '@/lib/auth';
import { AppNotificationRow } from '@/lib/notifications';

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    const empUser = !user ? await getEmployeeSessionUser() : null;

    if (!user && !empUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limitParam = parseInt(searchParams.get('limit') || '35', 10);
    const limit = Math.min(Math.max(limitParam || 35, 5), 100);

    if (empUser) {
      const notifications = await prisma.$queryRaw<AppNotificationRow[]>`
        SELECT
          "id",
          "recipientUserId",
          "recipientRole",
          "type",
          "title",
          "message",
          "visitId",
          "visitId" AS "visitorId",
          "invitationId",
          "parcelId",
          "vipGuestId",
          "operatorUserId",
          "targetUrl",
          "dedupeKey",
          "isRead",
          "createdAt"
        FROM "app_notifications"
        WHERE "recipientUserId" = ${empUser.id}
        ORDER BY "createdAt" DESC
        LIMIT ${limit}
      `;

      const unreadCount = notifications.filter((n) => !n.isRead).length;

      return NextResponse.json({
        success: true,
        unreadCount,
        notifications,
      });
    }

    // Admin or Operator session
    const role = user!.role;
    const userId = user!.id;

    const notifications = await prisma.$queryRaw<AppNotificationRow[]>`
      SELECT
        "id",
        "recipientUserId",
        "recipientRole",
        "type",
        "title",
        "message",
        "visitId",
        "visitId" AS "visitorId",
        "invitationId",
        "parcelId",
        "vipGuestId",
        "operatorUserId",
        "targetUrl",
        "dedupeKey",
        "isRead",
        "createdAt"
      FROM "app_notifications"
      WHERE "recipientUserId" = ${userId}
         OR ("recipientUserId" IS NULL AND "recipientRole" = ${role})
      ORDER BY "createdAt" DESC
      LIMIT ${limit}
    `;

    const unreadCountRows = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS "count"
      FROM "app_notifications"
      WHERE "isRead" = false
        AND (
          "recipientUserId" = ${userId}
          OR ("recipientUserId" IS NULL AND "recipientRole" = ${role})
        )
    `;

    let pendingEmployeeCount = 0;
    let pendingOperatorCount = 0;

    if (role === 'ADMIN') {
      const pendingCounts = await prisma.$queryRaw<
        Array<{ empCount: number; opCount: number }>
      >`
        SELECT
          COUNT(*) FILTER (WHERE "role"::text = 'EMPLOYEE' AND COALESCE("approvalStatus"::text, 'PENDING') = 'PENDING')::int AS "empCount",
          COUNT(*) FILTER (WHERE "role"::text = 'OPERATOR' AND COALESCE("approvalStatus"::text, 'APPROVED') = 'PENDING')::int AS "opCount"
        FROM "users"
      `;
      pendingEmployeeCount = pendingCounts[0]?.empCount ?? 0;
      pendingOperatorCount = pendingCounts[0]?.opCount ?? 0;
    }

    return NextResponse.json({
      success: true,
      unreadCount: unreadCountRows[0]?.count ?? 0,
      pendingEmployeeCount,
      pendingOperatorCount,
      notifications,
    });
  } catch (error: unknown) {
    console.error('[Notifications GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to load notifications.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getSessionUser();
    const empUser = !user ? await getEmployeeSessionUser() : null;

    if (!user && !empUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const notificationId =
      typeof body.notificationId === 'string' ? body.notificationId.trim() : '';
    const idsFromArray: string[] = Array.isArray(body.ids)
      ? body.ids.filter(
          (id: unknown): id is string =>
            typeof id === 'string' && id.trim().length > 0
        )
      : [];
    const targetIds = notificationId
      ? [notificationId]
      : idsFromArray;

    if (empUser) {
      if (targetIds.length > 0) {
        for (const tid of targetIds) {
          await prisma.$executeRaw`
            UPDATE "app_notifications"
            SET "isRead" = true
            WHERE "id" = ${tid}
              AND "recipientUserId" = ${empUser.id}
          `;
        }
      } else {
        await prisma.$executeRaw`
          UPDATE "app_notifications"
          SET "isRead" = true
          WHERE "recipientUserId" = ${empUser.id}
            AND "isRead" = false
        `;
      }
      return NextResponse.json({ success: true });
    }

    const role = user!.role;
    const userId = user!.id;

    if (targetIds.length > 0) {
      for (const tid of targetIds) {
        await prisma.$executeRaw`
          UPDATE "app_notifications"
          SET "isRead" = true
          WHERE "id" = ${tid}
            AND (
              "recipientUserId" = ${userId}
              OR ("recipientUserId" IS NULL AND "recipientRole" = ${role})
            )
        `;
      }
    } else {
      await prisma.$executeRaw`
        UPDATE "app_notifications"
        SET "isRead" = true
        WHERE "isRead" = false
          AND (
            "recipientUserId" = ${userId}
            OR ("recipientUserId" IS NULL AND "recipientRole" = ${role})
          )
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('[Notifications PATCH] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update notifications.' },
      { status: 500 }
    );
  }
}
