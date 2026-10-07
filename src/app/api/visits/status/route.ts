import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { normalizeSearchValue, getCnicHyphenatedVariants } from '@/lib/searchUtils';

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim();
    const mode = searchParams.get('mode'); // e.g. 'checkout'

    if (!q) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    const rawQ = q;
    const normQ = normalizeSearchValue(rawQ);
    const digitsOnly = rawQ.replace(/\D/g, '');
    const cnicVariants = getCnicHyphenatedVariants(digitsOnly);

    let personIds: string[] = [];
    let visitRows: Array<{ id: string; personId: string; visitorCardNo: string | null; visitNumber: string }> = [];

    try {
      // 1. PostgreSQL query with regex replacement to ignore hyphens, spaces, and punctuation
      const personResults = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "persons"
        WHERE 
          REGEXP_REPLACE(COALESCE("cnicNumber", ''), '[^a-zA-Z0-9]', '', 'g') ILIKE ${'%' + normQ + '%'}
          OR REGEXP_REPLACE(COALESCE("dlsNumber", ''), '[^a-zA-Z0-9]', '', 'g') ILIKE ${'%' + normQ + '%'}
          OR REGEXP_REPLACE(COALESCE("phoneNumber", ''), '[^a-zA-Z0-9]', '', 'g') ILIKE ${'%' + normQ + '%'}
          OR "fullName" ILIKE ${'%' + rawQ + '%'}
        LIMIT 20
      `;
      personIds = personResults.map((r) => r.id);

      const visitResults = await prisma.$queryRaw<
        Array<{ id: string; personId: string; visitorCardNo: string | null; visitNumber: string }>
      >`
        SELECT id, "personId", "visitorCardNo", "visitNumber" FROM "visits"
        WHERE 
          REGEXP_REPLACE(COALESCE("visitorCardNo", ''), '[^a-zA-Z0-9]', '', 'g') ILIKE ${'%' + normQ + '%'}
          OR REGEXP_REPLACE(COALESCE("passCode", ''), '[^a-zA-Z0-9]', '', 'g') ILIKE ${'%' + normQ + '%'}
          OR REGEXP_REPLACE(COALESCE("visitNumber", ''), '[^a-zA-Z0-9]', '', 'g') ILIKE ${'%' + normQ + '%'}
          OR "hostName" ILIKE ${'%' + rawQ + '%'}
        LIMIT 20
      `;
      visitRows = visitResults;
    } catch (rawError) {
      console.warn('Raw query failed, falling back to standard Prisma query:', rawError);
      // Fallback using Prisma OR conditions
      const fallbackPersons = await prisma.person.findMany({
        where: {
          OR: [
            { cnicNumber: { contains: rawQ, mode: 'insensitive' as const } },
            { dlsNumber: { contains: rawQ, mode: 'insensitive' as const } },
            { phoneNumber: { contains: rawQ } },
            { fullName: { contains: rawQ, mode: 'insensitive' as const } },
            ...cnicVariants.map((v) => ({ cnicNumber: { contains: v, mode: 'insensitive' as const } })),
            ...(normQ ? [{ cnicNumber: { contains: normQ, mode: 'insensitive' as const } }] : []),
          ],
        },
        select: { id: true },
        take: 20,
      });
      personIds = fallbackPersons.map((p) => p.id);

      const fallbackVisits = await prisma.visit.findMany({
        where: {
          OR: [
            { visitorCardNo: { contains: rawQ, mode: 'insensitive' as const } },
            { passCode: { contains: rawQ, mode: 'insensitive' as const } },
            { visitNumber: { contains: rawQ, mode: 'insensitive' as const } },
            { hostName: { contains: rawQ, mode: 'insensitive' as const } },
            ...(normQ ? [
              { visitorCardNo: { contains: normQ, mode: 'insensitive' as const } },
              { passCode: { contains: normQ, mode: 'insensitive' as const } },
            ] : []),
          ],
        },
        select: { id: true, personId: true, visitorCardNo: true, visitNumber: true },
        take: 20,
      });
      visitRows = fallbackVisits;
    }

    // Combine all person IDs
    const allPersonIdSet = new Set<string>(personIds);
    visitRows.forEach((v) => allPersonIdSet.add(v.personId));

    if (allPersonIdSet.size === 0) {
      return NextResponse.json({
        found: false,
        matches: [],
        message: 'No record found matching the search criteria',
      });
    }

    // Fetch complete person records with recent visits
    const persons = await prisma.person.findMany({
      where: {
        id: { in: Array.from(allPersonIdSet) },
      },
      include: {
        visits: {
          orderBy: { checkInTime: 'desc' },
          take: 5,
          include: {
            entryGate: true,
            exitGate: true,
            checkedInBy: { select: { id: true, name: true } },
          },
        },
      },
    });

    // Build matches array
    const matches = await Promise.all(
      persons.map(async (p) => {
        const activeVisit = p.visits.find((v) => v.status === 'CHECKED_IN') || null;
        const totalVisits = await prisma.visit.count({
          where: { personId: p.id },
        });

        const latestVisit = p.visits[0] || null;
        const currentCardNo = activeVisit?.visitorCardNo || latestVisit?.visitorCardNo || null;

        return {
          id: p.id,
          person: p,
          activeVisit,
          isCurrentlyInside: !!activeVisit,
          latestVisit,
          totalVisits,
          cardNo: currentCardNo,
          recentVisits: p.visits,
        };
      })
    );

    // Sort matches intelligently:
    // 1. Exact normalized CNIC match
    // 2. Exact normalized card match
    // 3. For checkout mode: active inside visits first
    // 4. Inside visits before outside
    matches.sort((a, b) => {
      const aCnicNorm = normalizeSearchValue(a.person.cnicNumber);
      const bCnicNorm = normalizeSearchValue(b.person.cnicNumber);
      if (aCnicNorm === normQ && bCnicNorm !== normQ) return -1;
      if (bCnicNorm === normQ && aCnicNorm !== normQ) return 1;

      const aCardNorm = normalizeSearchValue(a.cardNo);
      const bCardNorm = normalizeSearchValue(b.cardNo);
      if (aCardNorm === normQ && bCardNorm !== normQ) return -1;
      if (bCardNorm === normQ && aCardNorm !== normQ) return 1;

      if (a.isCurrentlyInside && !b.isCurrentlyInside) return -1;
      if (!a.isCurrentlyInside && b.isCurrentlyInside) return 1;

      return 0;
    });

    if (matches.length === 0) {
      return NextResponse.json({
        found: false,
        matches: [],
        message: 'No record found matching the search criteria',
      });
    }

    const primary = matches[0];

    return NextResponse.json({
      found: true,
      matches,
      // Backward compatibility fields for existing consumers
      person: primary.person,
      isCurrentlyInside: primary.isCurrentlyInside,
      activeVisit: primary.activeVisit,
      totalVisits: primary.totalVisits,
      recentVisits: primary.recentVisits,
    });
  } catch (error: any) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to check person status' },
      { status: 500 }
    );
  }
}
