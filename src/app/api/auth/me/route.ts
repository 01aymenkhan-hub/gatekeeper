import { NextResponse } from 'next/server';
import { getSessionUser, TOKEN_COOKIE_NAME } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        gateAccess: {
          select: {
            gate: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        },
      },
    });

    if (!dbUser || !dbUser.active) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    const gates = dbUser.gateAccess.map((ga: { gate: { id: string; name: string; type: string } }) => ga.gate);

    return NextResponse.json({
      authenticated: true,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
        gates,
      },
    });
  } catch (error) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 500 });
  }
}
