import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const gateId = searchParams.get('gateId');

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const gateFilter = gateId && gateId !== 'ALL' ? { entryGateId: gateId } : {};

    // 1. Total visits today
    const totalToday = await prisma.visit.count({
      where: {
        checkInTime: { gte: startOfToday, lte: endOfToday },
        ...gateFilter,
      },
    });

    // 2. Currently inside (status = CHECKED_IN)
    const currentlyInside = await prisma.visit.count({
      where: {
        status: 'CHECKED_IN',
        ...gateFilter,
      },
    });

    // 3. Checked out today
    const totalCheckOutsToday = await prisma.visit.count({
      where: {
        status: 'CHECKED_OUT',
        checkOutTime: { gte: startOfToday, lte: endOfToday },
        ...(gateId && gateId !== 'ALL' ? { exitGateId: gateId } : {}),
      },
    });

    // 4. Overstay count (> 8 hours inside)
    const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000);
    const overstayCount = await prisma.visit.count({
      where: {
        status: 'CHECKED_IN',
        checkInTime: { lt: eightHoursAgo },
        ...gateFilter,
      },
    });

    // 5. Category breakdown today
    const todayVisits = await prisma.visit.findMany({
      where: {
        checkInTime: { gte: startOfToday, lte: endOfToday },
        ...gateFilter,
      },
      include: {
        person: {
          select: { category: true },
        },
      },
    });

    const categoryBreakdown: Record<string, number> = {
      VISITOR: 0,
      VENDOR: 0,
      INTERVIEW: 0,
      SPECIAL_GUEST: 0,
      CONTRACTOR: 0,
      DELIVERY: 0,
    };

    todayVisits.forEach((v: { person?: { category: string } | null }) => {
      const cat = v.person?.category || 'VISITOR';
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;
    });

    // 6. Recent visits
    const recentVisits = await prisma.visit.findMany({
      take: 10,
      orderBy: { checkInTime: 'desc' },
      where: gateFilter,
      include: {
        person: true,
        entryGate: true,
        exitGate: true,
        checkedInBy: { select: { id: true, name: true } },
      },
    });

    // 7. Active visitors inside list
    const activeVisitors = await prisma.visit.findMany({
      where: {
        status: 'CHECKED_IN',
        ...gateFilter,
      },
      orderBy: { checkInTime: 'desc' },
      take: 15,
      include: {
        person: true,
        entryGate: true,
      },
    });

    return NextResponse.json({
      success: true,
      stats: {
        totalToday,
        currentlyInside,
        totalCheckInsToday: totalToday,
        totalCheckOutsToday,
        overstayCount,
        vendorsToday: categoryBreakdown.VENDOR,
        interviewsToday: categoryBreakdown.INTERVIEW,
        specialGuestsToday: categoryBreakdown.SPECIAL_GUEST,
        contractorsToday: categoryBreakdown.CONTRACTOR,
        deliveriesToday: categoryBreakdown.DELIVERY,
        visitorsToday: categoryBreakdown.VISITOR,
        categoryBreakdown,
        recentVisits,
        activeVisitors,
      },
    });
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}
