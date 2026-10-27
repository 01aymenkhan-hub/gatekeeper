import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  comparePassword,
  generateEmployeeToken,
  EMPLOYEE_TOKEN_COOKIE_NAME,
  EMPLOYEE_STATUS_COOKIE_NAME,
  EmployeeApprovalStatus,
} from '@/lib/auth';
import { logAudit } from '@/lib/audit';

interface EmployeeLoginRow {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: string;
  active: boolean;
  approvalStatus: EmployeeApprovalStatus;
  departmentId: string | null;
  departmentName: string | null;
  position: string | null;
  phoneNumber: string | null;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawEmail = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!rawEmail || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const rows = await prisma.$queryRaw<EmployeeLoginRow[]>`
      SELECT
        "id",
        "email",
        "passwordHash",
        "name",
        "role"::text AS "role",
        "active",
        COALESCE("approvalStatus"::text, 'APPROVED') AS "approvalStatus",
        "departmentId",
        "departmentName",
        "position",
        "phoneNumber",
        "approvedAt",
        "rejectedAt",
        "rejectionReason",
        "createdAt"
      FROM "users"
      WHERE "email" = ${rawEmail}
      LIMIT 1
    `;

    const user = rows[0];
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    if (user.role !== 'EMPLOYEE') {
      return NextResponse.json(
        {
          error:
            'This portal is exclusively for Employees. Administrators and Operators must sign in at /login.',
        },
        { status: 403 }
      );
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    const safeProfile = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: 'EMPLOYEE' as const,
      approvalStatus: user.approvalStatus,
      departmentId: user.departmentId,
      departmentName: user.departmentName,
      position: user.position,
      phoneNumber: user.phoneNumber,
      active: user.active,
      approvedAt: user.approvedAt,
      rejectedAt: user.rejectedAt,
      rejectionReason: user.rejectionReason,
      createdAt: user.createdAt,
    };

    // Pending or Rejected applicants can check their status on /employee, but CANNOT access the protected Employee Dashboard
    if (user.approvalStatus === 'PENDING' || user.approvalStatus === 'REJECTED') {
      const statusToken = generateEmployeeToken({
        id: user.id,
        email: user.email,
        name: user.name,
        purpose: 'APPLICANT_STATUS',
      });

      const statusRes = NextResponse.json({
        success: true,
        authenticated: false,
        approvalStatus: user.approvalStatus,
        applicant: safeProfile,
        message:
          user.approvalStatus === 'PENDING'
            ? 'Your account registration is currently pending administrator approval.'
            : 'Your registration request was not approved by the administrator.',
      });

      statusRes.cookies.delete(EMPLOYEE_TOKEN_COOKIE_NAME);
      statusRes.cookies.set(EMPLOYEE_STATUS_COOKIE_NAME, statusToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });

      return statusRes;
    }

    if (!user.active) {
      return NextResponse.json(
        {
          error: 'Your employee account has been deactivated. Please contact an administrator.',
        },
        { status: 403 }
      );
    }

    const sessionToken = generateEmployeeToken({
      id: user.id,
      email: user.email,
      name: user.name,
      purpose: 'EMPLOYEE_SESSION',
    });

    const response = NextResponse.json({
      success: true,
      authenticated: true,
      approvalStatus: 'APPROVED',
      employee: safeProfile,
    });

    response.cookies.set(EMPLOYEE_TOKEN_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
    response.cookies.set(EMPLOYEE_STATUS_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    await logAudit({
      action: 'EMPLOYEE_LOGIN',
      entityType: 'User',
      entityId: user.id,
      details: {
        email: user.email,
        departmentName: user.departmentName,
        position: user.position,
      },
      performedById: user.id,
    });

    return response;
  } catch (error: unknown) {
    console.error('Employee login error:', error);
    return NextResponse.json(
      { error: 'Internal server error during employee login.' },
      { status: 500 }
    );
  }
}
