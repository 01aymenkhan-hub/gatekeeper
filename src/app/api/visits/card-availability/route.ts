import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser, getEmployeeSessionUser } from '@/lib/auth';
import { formatCardNoForStorage, normalizeCardKey } from '@/lib/cardUtils';

export async function GET(request: NextRequest) {
  try {
    const staffUser = await getSessionUser();
    const empUser = staffUser ? null : await getEmployeeSessionUser();

    if (!staffUser && !empUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawCardNo = searchParams.get('cardNo') || '';
    const excludeInvitationId = searchParams.get('excludeInvitationId') || '';

    const formatted = formatCardNoForStorage(rawCardNo);
    const comparisonKey = normalizeCardKey(rawCardNo);

    if (!formatted || !comparisonKey) {
      return NextResponse.json({
        available: false,
        empty: true,
        formatted: '',
        message: 'Visitor Card Number is required.',
      });
    }

    // 1. Check active visits holding this card
    const activeVisits = await prisma.visit.findMany({
      where: {
        status: { in: ['CHECKED_IN', 'OVERSTAY'] },
        checkOutTime: null,
        visitorCardNo: { not: null },
      },
      select: {
        id: true,
        visitorCardNo: true,
        visitNumber: true,
        person: {
          select: {
            fullName: true,
          },
        },
      },
    });

    const conflictingVisit = activeVisits.find(
      (v) => v.visitorCardNo && normalizeCardKey(v.visitorCardNo) === comparisonKey
    );

    if (conflictingVisit) {
      return NextResponse.json({
        available: false,
        empty: false,
        formatted,
        conflictType: 'ACTIVE_VISIT',
        message: 'This card is already assigned to an active visitor. Please choose another available card.',
      });
    }

    // 2. Check pending guest invitations holding this card
    const pendingInvitations = excludeInvitationId
      ? await prisma.$queryRaw<
          Array<{ id: string; visitorCardNo: string; guestName: string }>
        >`
          SELECT "id", "visitorCardNo", "guestName"
          FROM "guest_invitations"
          WHERE "status"::text = 'PENDING'
            AND "normalizedCardKey" = ${comparisonKey}
            AND "id" <> ${excludeInvitationId}
          LIMIT 1
        `
      : await prisma.$queryRaw<
          Array<{ id: string; visitorCardNo: string; guestName: string }>
        >`
          SELECT "id", "visitorCardNo", "guestName"
          FROM "guest_invitations"
          WHERE "status"::text = 'PENDING'
            AND "normalizedCardKey" = ${comparisonKey}
          LIMIT 1
        `;

    if (pendingInvitations.length > 0) {
      return NextResponse.json({
        available: false,
        empty: false,
        formatted,
        conflictType: 'PENDING_INVITATION',
        message:
          'This card is already preassigned to an upcoming invited guest. Please choose another available card.',
      });
    }

    return NextResponse.json({
      available: true,
      empty: false,
      formatted,
      message: 'Visitor Card is available.',
    });
  } catch (error: unknown) {
    console.error('Card availability check error:', error);
    return NextResponse.json(
      { error: 'Failed to check card availability' },
      { status: 500 }
    );
  }
}
