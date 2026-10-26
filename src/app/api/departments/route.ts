import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import {
  DepartmentRecord,
  normalizeDepartmentName,
  cleanAndValidateWhatsapp,
} from '@/lib/departmentUtils';

const INITIAL_DEPARTMENTS = [
  { name: 'Accounts', hodName: 'Head of Accounts', whatsappNumber: '03001000001' },
  { name: 'Admin', hodName: 'Head of Administration', whatsappNumber: '03001000002' },
  { name: 'IT', hodName: 'Head of IT', whatsappNumber: '03001000003' },
  { name: 'Operations', hodName: 'Head of Operations', whatsappNumber: '03001000004' },
  { name: 'Procurement', hodName: 'Head of Procurement', whatsappNumber: '03001000005' },
  { name: 'Production', hodName: 'Head of Production', whatsappNumber: '03001000006' },
];

async function ensureInitialDepartmentsSeeded() {
  try {
    const countRows = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS "count" FROM "departments"
    `;
    const currentCount = countRows[0]?.count ?? 0;
    if (currentCount > 0) return;

    // Check if an admin has ever managed departments; if so, respect empty state
    const previousDeptAudit = await prisma.auditLog.findFirst({
      where: {
        action: {
          in: ['CREATE_DEPARTMENT', 'UPDATE_DEPARTMENT', 'DELETE_DEPARTMENT', 'SEED_DEPARTMENTS'],
        },
      },
      select: { id: true },
    });

    if (previousDeptAudit) return;

    for (const dept of INITIAL_DEPARTMENTS) {
      const id = `dept_${crypto.randomBytes(10).toString('hex')}`;
      const normalizedName = normalizeDepartmentName(dept.name);
      await prisma.$executeRaw`
        INSERT INTO "departments" ("id", "name", "normalizedName", "hodName", "whatsappNumber", "active", "createdAt", "updatedAt")
        VALUES (${id}, ${dept.name}, ${normalizedName}, ${dept.hodName}, ${dept.whatsappNumber}, true, NOW(), NOW())
        ON CONFLICT ("normalizedName") DO NOTHING
      `;
    }

    // Link existing visits that match seeded department names
    await prisma.$executeRaw`
      UPDATE "visits" v
      SET "departmentId" = d."id"
      FROM "departments" d
      WHERE v."departmentId" IS NULL
        AND LOWER(TRIM(v."department")) = d."normalizedName"
    `;

    await logAudit({
      action: 'SEED_DEPARTMENTS',
      entityType: 'Department',
      details: { seededCount: INITIAL_DEPARTMENTS.length },
    });
  } catch (err) {
    console.warn('Department initial seed check warning:', err);
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureInitialDepartmentsSeeded();

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const rows = activeOnly
      ? await prisma.$queryRaw<DepartmentRecord[]>`
          SELECT
            d."id",
            d."name",
            d."normalizedName",
            d."hodName",
            d."whatsappNumber",
            d."active",
            d."createdAt",
            d."updatedAt",
            (
              SELECT COUNT(*)::int
              FROM "visits" v
              WHERE v."departmentId" = d."id"
                 OR (v."departmentId" IS NULL AND LOWER(TRIM(v."department")) = d."normalizedName")
            ) AS "visitCount"
          FROM "departments" d
          WHERE d."active" = true
          ORDER BY d."name" ASC
        `
      : await prisma.$queryRaw<DepartmentRecord[]>`
          SELECT
            d."id",
            d."name",
            d."normalizedName",
            d."hodName",
            d."whatsappNumber",
            d."active",
            d."createdAt",
            d."updatedAt",
            (
              SELECT COUNT(*)::int
              FROM "visits" v
              WHERE v."departmentId" = d."id"
                 OR (v."departmentId" IS NULL AND LOWER(TRIM(v."department")) = d."normalizedName")
            ) AS "visitCount"
          FROM "departments" d
          ORDER BY d."name" ASC
        `;

    return NextResponse.json({
      success: true,
      departments: rows,
    });
  } catch (error: unknown) {
    console.error('Error fetching departments:', error);
    return NextResponse.json(
      { error: 'Failed to load departments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: Only administrators can manage departments' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const rawName = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : '';
    const rawHodName = typeof body.hodName === 'string' ? body.hodName.trim().replace(/\s+/g, ' ') : '';
    const rawWhatsapp = typeof body.whatsappNumber === 'string' ? body.whatsappNumber : '';

    if (!rawName) {
      return NextResponse.json(
        { error: 'Department Name is required.' },
        { status: 400 }
      );
    }

    if (!rawHodName) {
      return NextResponse.json(
        { error: 'Head of Department (HOD) Name is required.' },
        { status: 400 }
      );
    }

    const whatsappValidation = cleanAndValidateWhatsapp(rawWhatsapp);
    if (!whatsappValidation.valid) {
      return NextResponse.json(
        { error: whatsappValidation.error },
        { status: 400 }
      );
    }

    const normalizedName = normalizeDepartmentName(rawName);

    const existing = await prisma.$queryRaw<Array<{ id: string; name: string }>>`
      SELECT "id", "name"
      FROM "departments"
      WHERE "normalizedName" = ${normalizedName}
      LIMIT 1
    `;

    if (existing.length > 0) {
      return NextResponse.json(
        { error: `A department named "${existing[0].name}" already exists.` },
        { status: 409 }
      );
    }

    const newId = `dept_${crypto.randomBytes(10).toString('hex')}`;

    await prisma.$executeRaw`
      INSERT INTO "departments" ("id", "name", "normalizedName", "hodName", "whatsappNumber", "active", "createdAt", "updatedAt")
      VALUES (${newId}, ${rawName}, ${normalizedName}, ${rawHodName}, ${whatsappValidation.cleaned}, true, NOW(), NOW())
    `;

    // Link any historical visits matching this department name
    await prisma.$executeRaw`
      UPDATE "visits"
      SET "departmentId" = ${newId}
      WHERE "departmentId" IS NULL
        AND LOWER(TRIM("department")) = ${normalizedName}
    `;

    const createdRows = await prisma.$queryRaw<DepartmentRecord[]>`
      SELECT
        "id",
        "name",
        "normalizedName",
        "hodName",
        "whatsappNumber",
        "active",
        "createdAt",
        "updatedAt"
      FROM "departments"
      WHERE "id" = ${newId}
      LIMIT 1
    `;

    await logAudit({
      action: 'CREATE_DEPARTMENT',
      entityType: 'Department',
      entityId: newId,
      details: {
        name: rawName,
        hodName: rawHodName,
        whatsappNumber: whatsappValidation.cleaned,
      },
      performedById: user.id,
    });

    return NextResponse.json(
      {
        success: true,
        department: createdRows[0],
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Error creating department:', error);
    return NextResponse.json(
      { error: 'Failed to create department' },
      { status: 500 }
    );
  }
}
