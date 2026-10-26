import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

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

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawCardNo = searchParams.get('cardNo') || '';
    const formatted = formatCardNoForStorage(rawCardNo);
    const targetKey = normalizeCardKey(rawCardNo);

    if (!targetKey) {
      return NextResponse.json({
        available: false,
        cardNo: formatted,
        normalizedCardNo: formatted,
        error: 'Visitor Card Number is required',
      });
    }

    const activeVisitsWithCards = await prisma.visit.findMany({
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

    const conflictingVisit = activeVisitsWithCards.find(
      (v) => v.visitorCardNo && normalizeCardKey(v.visitorCardNo) === targetKey
    );

    if (conflictingVisit) {
      return NextResponse.json({
        available: false,
        cardNo: formatted,
        normalizedCardNo: formatted,
        code: 'CARD_ALREADY_ASSIGNED',
        error: 'This card is already assigned. Please choose another available card.',
      });
    }

    return NextResponse.json({
      available: true,
      cardNo: formatted,
      normalizedCardNo: formatted,
    });
  } catch (error: unknown) {
    console.error('Card availability check error:', error);
    return NextResponse.json(
      { error: 'Failed to check card availability' },
      { status: 500 }
    );
  }
}
