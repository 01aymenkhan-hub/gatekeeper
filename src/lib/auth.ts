import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import prisma from './prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'gatekeeper_secret_jwt_key_2026';
const TOKEN_COOKIE_NAME = 'gk_token';
const EMPLOYEE_TOKEN_COOKIE_NAME = 'gk_emp_token';
const EMPLOYEE_STATUS_COOKIE_NAME = 'gk_emp_applicant';

export type UserRole = 'ADMIN' | 'OPERATOR' | 'EMPLOYEE';
export type EmployeeApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'OPERATOR';
  gateIds?: string[];
}

export interface EmployeeAuthUser {
  id: string;
  email: string;
  name: string;
  role: 'EMPLOYEE';
  approvalStatus: EmployeeApprovalStatus;
  departmentId: string | null;
  departmentName: string | null;
  position: string | null;
  phoneNumber: string | null;
  active: boolean;
  approvedAt?: Date | string | null;
  rejectedAt?: Date | string | null;
  rejectionReason?: string | null;
  createdAt?: Date | string;
}

interface DbUserRow {
  id: string;
  email: string;
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

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      gateIds: user.gateIds || [],
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function generateEmployeeToken(user: {
  id: string;
  email: string;
  name: string;
  purpose: 'EMPLOYEE_SESSION' | 'APPLICANT_STATUS';
}): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: 'EMPLOYEE',
      purpose: user.purpose,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token: string): AuthUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthUser;
  } catch {
    return null;
  }
}

export function verifyEmployeeToken(
  token: string
): { id: string; email: string; name: string; role: 'EMPLOYEE'; purpose?: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      name: string;
      role: string;
      purpose?: string;
    };
    if (!decoded || !decoded.id || decoded.role !== 'EMPLOYEE') return null;
    return {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      role: 'EMPLOYEE',
      purpose: decoded.purpose,
    };
  } catch {
    return null;
  }
}

/**
 * Staff session check (ADMIN or OPERATOR only).
 * Automatically blocks EMPLOYEE accounts from accessing Admin or Operator routes.
 */
export async function getSessionUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(TOKEN_COOKIE_NAME)?.value;
    if (!token) return null;
    const decoded = verifyToken(token);
    if (!decoded || !decoded.id) return null;

    const rows = await prisma.$queryRaw<
      Array<{ id: string; email: string; name: string; role: string; active: boolean }>
    >`
      SELECT "id", "email", "name", "role"::text AS "role", "active"
      FROM "users"
      WHERE "id" = ${decoded.id}
      LIMIT 1
    `;

    const dbUser = rows[0];
    if (!dbUser || !dbUser.active) {
      return null;
    }

    // Strict vertical privilege separation: EMPLOYEE role is never allowed in staff session
    if (dbUser.role !== 'ADMIN' && dbUser.role !== 'OPERATOR') {
      return null;
    }

    return {
      ...decoded,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role,
    };
  } catch {
    return null;
  }
}

/**
 * Approved Employee session check (strictly requires role === 'EMPLOYEE', approvalStatus === 'APPROVED', active === true).
 */
export async function getEmployeeSessionUser(): Promise<EmployeeAuthUser | null> {
  try {
    const cookieStore = await cookies();
    const empToken =
      cookieStore.get(EMPLOYEE_TOKEN_COOKIE_NAME)?.value ||
      cookieStore.get(EMPLOYEE_STATUS_COOKIE_NAME)?.value;
    if (!empToken) return null;

    const decoded = verifyEmployeeToken(empToken);
    if (!decoded || !decoded.id) return null;

    const rows = await prisma.$queryRaw<DbUserRow[]>`
      SELECT
        "id",
        "email",
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
      WHERE "id" = ${decoded.id}
      LIMIT 1
    `;

    const dbUser = rows[0];
    if (
      !dbUser ||
      !dbUser.active ||
      dbUser.role !== 'EMPLOYEE' ||
      dbUser.approvalStatus !== 'APPROVED'
    ) {
      return null;
    }

    return {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: 'EMPLOYEE',
      approvalStatus: dbUser.approvalStatus,
      departmentId: dbUser.departmentId,
      departmentName: dbUser.departmentName,
      position: dbUser.position,
      phoneNumber: dbUser.phoneNumber,
      active: dbUser.active,
      approvedAt: dbUser.approvedAt,
      rejectedAt: dbUser.rejectedAt,
      rejectionReason: dbUser.rejectionReason,
      createdAt: dbUser.createdAt,
    };
  } catch {
    return null;
  }
}

/**
 * Applicant/Employee status check (returns PENDING, APPROVED, or REJECTED employee record for /employee portal status polling).
 * Does NOT grant access to protected employee dashboard endpoints unless approvalStatus === 'APPROVED'.
 */
export async function getEmployeePortalAccountFromCookies(): Promise<EmployeeAuthUser | null> {
  try {
    const cookieStore = await cookies();
    const empSessionToken = cookieStore.get(EMPLOYEE_TOKEN_COOKIE_NAME)?.value;
    const applicantToken = cookieStore.get(EMPLOYEE_STATUS_COOKIE_NAME)?.value;
    const rawToken = empSessionToken || applicantToken;
    if (!rawToken) return null;

    const decoded = verifyEmployeeToken(rawToken);
    if (!decoded || !decoded.id) return null;

    const rows = await prisma.$queryRaw<DbUserRow[]>`
      SELECT
        "id",
        "email",
        "name",
        "role"::text AS "role",
        "active",
        COALESCE("approvalStatus"::text, 'PENDING') AS "approvalStatus",
        "departmentId",
        "departmentName",
        "position",
        "phoneNumber",
        "approvedAt",
        "rejectedAt",
        "rejectionReason",
        "createdAt"
      FROM "users"
      WHERE "id" = ${decoded.id}
      LIMIT 1
    `;

    const dbUser = rows[0];
    if (!dbUser || dbUser.role !== 'EMPLOYEE') {
      return null;
    }

    return {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: 'EMPLOYEE',
      approvalStatus: dbUser.approvalStatus,
      departmentId: dbUser.departmentId,
      departmentName: dbUser.departmentName,
      position: dbUser.position,
      phoneNumber: dbUser.phoneNumber,
      active: dbUser.active,
      approvedAt: dbUser.approvedAt,
      rejectedAt: dbUser.rejectedAt,
      rejectionReason: dbUser.rejectionReason,
      createdAt: dbUser.createdAt,
    };
  } catch {
    return null;
  }
}

export async function requireAuthUser(requiredRole?: 'ADMIN' | 'OPERATOR'): Promise<AuthUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  if (requiredRole && user.role !== requiredRole && user.role !== 'ADMIN') {
    throw new Error('FORBIDDEN');
  }
  return user;
}

export {
  TOKEN_COOKIE_NAME,
  EMPLOYEE_TOKEN_COOKIE_NAME,
  EMPLOYEE_STATUS_COOKIE_NAME,
};
