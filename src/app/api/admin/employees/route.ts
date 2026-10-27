import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser, getEmployeeSessionUser, EmployeeApprovalStatus } from '@/lib/auth';

export interface AdminEmployeeRow {
  id: string;
  name: string;
  email: string;
  departmentId: string | null;
  departmentName: string | null;
  position: string | null;
  phoneNumber: string | null;
  approvalStatus: EmployeeApprovalStatus;
  active: boolean;
  approvedAt: Date | null;
  approvedById: string | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  totalInvitations: number;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      const empUser = await getEmployeeSessionUser();
      if (empUser) {
        return NextResponse.json(
          { error: 'Forbidden: Employees cannot access Admin endpoints.' },
          { status: 403 }
        );
      }
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: Administrator access required.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const summaryOnly = searchParams.get('summaryOnly') === 'true';

    const countRows = await prisma.$queryRaw<Array<{ pendingCount: number }>>`
      SELECT COUNT(*)::int AS "pendingCount"
      FROM "users"
      WHERE "role"::text = 'EMPLOYEE'
        AND COALESCE("approvalStatus"::text, 'PENDING') = 'PENDING'
    `;
    const pendingCount = countRows[0]?.pendingCount ?? 0;

    if (summaryOnly) {
      return NextResponse.json({
        success: true,
        pendingCount,
      });
    }

    const allEmployeeRows = await prisma.$queryRaw<AdminEmployeeRow[]>`
      SELECT
        u."id",
        u."name",
        u."email",
        u."departmentId",
        COALESCE(d."name", u."departmentName", 'Unassigned') AS "departmentName",
        u."position",
        u."phoneNumber",
        COALESCE(u."approvalStatus"::text, 'PENDING') AS "approvalStatus",
        u."active",
        u."approvedAt",
        u."approvedById",
        u."rejectedAt",
        u."rejectionReason",
        u."createdAt",
        u."updatedAt",
        (
          SELECT COUNT(*)::int
          FROM "guest_invitations" gi
          WHERE gi."employeeId" = u."id"
        ) AS "totalInvitations"
      FROM "users" u
      LEFT JOIN "departments" d ON d."id" = u."departmentId"
      WHERE u."role"::text = 'EMPLOYEE'
      ORDER BY
        CASE WHEN COALESCE(u."approvalStatus"::text, 'PENDING') = 'PENDING' THEN 0
             WHEN COALESCE(u."approvalStatus"::text, 'PENDING') = 'REJECTED' THEN 1
             ELSE 2
        END ASC,
        u."createdAt" DESC
    `;

    const requests = allEmployeeRows;
    const employees = allEmployeeRows.filter((row) => row.approvalStatus === 'APPROVED');

    return NextResponse.json({
      success: true,
      pendingCount,
      requests,
      employees,
    });
  } catch (error: unknown) {
    console.error('Error fetching admin employees:', error);
    return NextResponse.json(
      { error: 'Failed to load employee records.' },
      { status: 500 }
    );
  }
}
