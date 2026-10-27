import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getEmployeeSessionUser } from '@/lib/auth';

export async function PATCH(request: NextRequest) {
  try {
    const emp = await getEmployeeSessionUser();
    if (!emp) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const notificationId =
      typeof body.notificationId === 'string' ? body.notificationId.trim() : '';

    if (notificationId) {
      await prisma.$executeRaw`
        UPDATE "app_notifications"
        SET "isRead" = true
        WHERE "id" = ${notificationId}
          AND "recipientUserId" = ${emp.id}
      `;
    } else {
      await prisma.$executeRaw`
        UPDATE "app_notifications"
        SET "isRead" = true
        WHERE "recipientUserId" = ${emp.id}
          AND "isRead" = false
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error marking employee notifications read:', error);
    return NextResponse.json(
      { error: 'Failed to update notifications.' },
      { status: 500 }
    );
  }
}
