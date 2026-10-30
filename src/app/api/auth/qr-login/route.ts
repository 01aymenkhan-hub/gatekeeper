import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateToken, TOKEN_COOKIE_NAME, OPERATOR_STATUS_COOKIE_NAME } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import {
  cleanOperatorQrToken,
  hashOperatorQrToken,
  checkQrLoginRateLimit,
  resetQrLoginRateLimit,
} from '@/lib/operatorQr';

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'unknown-ip';

    const rateLimit = checkQrLoginRateLimit(ip);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many failed login attempts. Please wait a minute before trying again.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const rawToken = body?.token;

    if (!rawToken || typeof rawToken !== 'string') {
      return NextResponse.json(
        { error: 'No QR code data received. Please scan again.' },
        { status: 400 }
      );
    }

    const token = cleanOperatorQrToken(rawToken);

    // Safeguard: Check if this was a visitor checkout QR
    if (token.startsWith('GKP-') || token.startsWith('VIS-')) {
      return NextResponse.json(
        { error: 'This is a visitor pass, not an operator login QR code.' },
        { status: 400 }
      );
    }

    if (!token.startsWith('GKOP_')) {
      return NextResponse.json(
        { error: 'Invalid QR code. Please scan a valid GateShield Operator Card.' },
        { status: 400 }
      );
    }

    // Compute cryptographic SHA-256 hash to find the operator
    const tokenHash = hashOperatorQrToken(token);

    const userRows = await prisma.$queryRaw<
      Array<{
        id: string;
        email: string;
        name: string;
        role: string;
        active: boolean;
        operatorNumber: string | null;
        qrLoginRevokedAt: Date | null;
        approvalStatus: string;
      }>
    >`
      SELECT
        "id",
        "email",
        "name",
        "role"::text AS "role",
        "active",
        "operatorNumber",
        "qrLoginRevokedAt",
        COALESCE("approvalStatus"::text, 'APPROVED') AS "approvalStatus"
      FROM "users"
      WHERE "qrLoginHash" = ${tokenHash}
      LIMIT 1
    `;

    if (userRows.length === 0) {
      return NextResponse.json(
        { error: 'Unrecognized operator QR code. Please contact your administrator.' },
        { status: 401 }
      );
    }

    const user = userRows[0];

    if (user.approvalStatus !== 'APPROVED') {
      return NextResponse.json(
        { error: 'Operator account is not approved. Please contact an administrator.' },
        { status: 403 }
      );
    }

    // Check account status: deactivation invalidates login immediately
    if (!user.active) {
      return NextResponse.json(
        { error: 'Account is deactivated. Please contact an administrator.' },
        { status: 403 }
      );
    }

    // Check revocation status
    if (user.qrLoginRevokedAt) {
      return NextResponse.json(
        { error: 'This QR card has been revoked or replaced. Please request a new card.' },
        { status: 401 }
      );
    }

    // Reset rate limiter on successful authentication
    resetQrLoginRateLimit(ip);

    const gateAccess = await prisma.userGateAccess.findMany({
      where: { userId: user.id },
      select: { gateId: true },
    });

    const gateIds = gateAccess.map((ga) => ga.gateId);

    const sessionToken = generateToken({
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
        operatorNumber: user.operatorNumber || `OP-${user.id.slice(-6).toUpperCase()}`,
        gateIds,
      },
    });

    // Set secure HTTP-only cookie
    response.cookies.set(TOKEN_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    response.cookies.delete(OPERATOR_STATUS_COOKIE_NAME);

    await logAudit({
      action: 'OPERATOR_QR_LOGIN',
      entityType: 'User',
      entityId: user.id,
      details: {
        name: user.name,
        operatorNumber: user.operatorNumber,
        email: user.email,
        role: user.role,
      },
      performedById: user.id,
      ipAddress: ip,
    });

    return response;
  } catch (error: unknown) {
    console.error('[QR Login] Error:', error);
    const msg = error instanceof Error ? error.message : 'Authentication error during QR scan';
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}
