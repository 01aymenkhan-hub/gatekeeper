import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { comparePassword, generateToken, TOKEN_COOKIE_NAME } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const roleCheck = await prisma.$queryRaw<
      Array<{ id: string; role: string; active: boolean }>
    >`
      SELECT "id", "role"::text AS "role", "active"
      FROM "users"
      WHERE "email" = ${normalizedEmail}
      LIMIT 1
    `;

    if (roleCheck.length === 0) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    if (roleCheck[0].role === 'EMPLOYEE') {
      return NextResponse.json(
        {
          error:
            'Employee accounts cannot sign in to the Admin/Operator portal. Please use the Employee Portal (/employee).',
        },
        { status: 403 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        gateAccess: {
          select: { gateId: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    if (!user.active) {
      return NextResponse.json(
        { error: 'Account is deactivated. Please contact an administrator.' },
        { status: 403 }
      );
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const gateIds = user.gateAccess.map((ga: { gateId: string }) => ga.gateId);

    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as 'ADMIN' | 'OPERATOR',
      gateIds,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        gateIds,
      },
    });

    // Set cookie
    response.cookies.set(TOKEN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    await logAudit({
      action: 'USER_LOGIN',
      entityType: 'User',
      entityId: user.id,
      details: { email: user.email, role: user.role },
      performedById: user.id,
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error during login' },
      { status: 500 }
    );
  }
}
