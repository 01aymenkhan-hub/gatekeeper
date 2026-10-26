import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import {
  DepartmentRecord,
  normalizeDepartmentName,
  cleanAndValidateWhatsapp,
} from '@/lib/departmentUtils';

async function handleUpdateDepartment(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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

    const { id } = await context.params;
    const existingRows = await prisma.$queryRaw<DepartmentRecord[]>`
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
      WHERE "id" = ${id}
      LIMIT 1
    `;

    const existing = existingRows[0];
    if (!existing) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    const body = await request.json();

    const nextName =
      body.name !== undefined
        ? String(body.name).trim().replace(/\s+/g, ' ')
        : existing.name;
    const nextHodName =
      body.hodName !== undefined
        ? String(body.hodName).trim().replace(/\s+/g, ' ')
        : existing.hodName;
    const rawWhatsapp =
      body.whatsappNumber !== undefined
        ? String(body.whatsappNumber)
        : existing.whatsappNumber;
    const nextActive =
      typeof body.active === 'boolean' ? body.active : existing.active;

    if (!nextName) {
      return NextResponse.json(
        { error: 'Department Name is required.' },
        { status: 400 }
      );
    }

    if (!nextHodName) {
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

    const normalizedName = normalizeDepartmentName(nextName);

    const duplicateRows = await prisma.$queryRaw<Array<{ id: string; name: string }>>`
      SELECT "id", "name"
      FROM "departments"
      WHERE "normalizedName" = ${normalizedName}
        AND "id" <> ${id}
      LIMIT 1
    `;

    if (duplicateRows.length > 0) {
      return NextResponse.json(
        { error: `A department named "${duplicateRows[0].name}" already exists.` },
        { status: 409 }
      );
    }

    await prisma.$executeRaw`
      UPDATE "departments"
      SET "name" = ${nextName},
          "normalizedName" = ${normalizedName},
          "hodName" = ${nextHodName},
          "whatsappNumber" = ${whatsappValidation.cleaned},
          "active" = ${nextActive},
          "updatedAt" = NOW()
      WHERE "id" = ${id}
    `;

    const updatedRows = await prisma.$queryRaw<DepartmentRecord[]>`
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
      WHERE "id" = ${id}
      LIMIT 1
    `;

    await logAudit({
      action: 'UPDATE_DEPARTMENT',
      entityType: 'Department',
      entityId: id,
      details: {
        previousName: existing.name,
        name: nextName,
        hodName: nextHodName,
        whatsappNumber: whatsappValidation.cleaned,
        active: nextActive,
      },
      performedById: user.id,
    });

    return NextResponse.json({
      success: true,
      department: updatedRows[0],
    });
  } catch (error: unknown) {
    console.error('Error updating department:', error);
    return NextResponse.json(
      { error: 'Failed to update department' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleUpdateDepartment(request, context);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleUpdateDepartment(request, context);
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: Only administrators can delete departments' },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    const existingRows = await prisma.$queryRaw<DepartmentRecord[]>`
      SELECT
        "id",
        "name",
        "normalizedName",
        "hodName",
        "whatsappNumber",
        "active"
      FROM "departments"
      WHERE "id" = ${id}
      LIMIT 1
    `;

    const existing = existingRows[0];
    if (!existing) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    // Preserve historical visits by ensuring their department name snapshot is retained and unlinking departmentId
    await prisma.$executeRaw`
      UPDATE "visits"
      SET "department" = COALESCE(NULLIF(TRIM("department"), ''), ${existing.name}),
          "departmentId" = NULL
      WHERE "departmentId" = ${id}
    `;

    await prisma.$executeRaw`
      DELETE FROM "departments"
      WHERE "id" = ${id}
    `;

    await logAudit({
      action: 'DELETE_DEPARTMENT',
      entityType: 'Department',
      entityId: id,
      details: {
        name: existing.name,
        hodName: existing.hodName,
        whatsappNumber: existing.whatsappNumber,
      },
      performedById: user.id,
    });

    return NextResponse.json({
      success: true,
      message: `Department "${existing.name}" has been deleted. Historical visitor records were preserved.`,
    });
  } catch (error: unknown) {
    console.error('Error deleting department:', error);
    return NextResponse.json(
      { error: 'Failed to delete department' },
      { status: 500 }
    );
  }
}
