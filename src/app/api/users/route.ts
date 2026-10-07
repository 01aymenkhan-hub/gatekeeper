import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser, hashPassword } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin role required' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        gateAccess: {
          include: {
            gate: {
              select: { id: true, name: true, type: true },
            },
          },
        },
      },
    });

    return NextResponse.json({ success: true, users });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin role required' }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, password, role, gateIds } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: role === 'ADMIN' ? 'ADMIN' : 'OPERATOR',
        active: true,
        gateAccess: Array.isArray(gateIds) && gateIds.length > 0
          ? {
              create: gateIds.map((gateId: string) => ({ gateId })),
            }
          : undefined,
      },
      include: {
        gateAccess: {
          include: { gate: true },
        },
      },
    });

    await logAudit({
      action: 'CREATE_USER',
      entityType: 'User',
      entityId: newUser.id,
      details: { email: newUser.email, role: newUser.role },
      performedById: user.id,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        active: newUser.active,
        gateAccess: newUser.gateAccess,
      },
    });
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: error?.message || 'Failed to create user' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin role required' }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, email, role, active, password, gateIds } = body;

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const updateData: any = {};
    if (name) updateData.name = name.trim();
    if (email) {
      const normalizedEmail = email.toLowerCase().trim();
      const existing = await prisma.user.findFirst({
        where: {
          email: normalizedEmail,
          id: { not: id },
        },
      });
      if (existing) {
        return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
      }
      updateData.email = normalizedEmail;
    }
    if (role) updateData.role = role === 'ADMIN' ? 'ADMIN' : 'OPERATOR';
    if (active !== undefined) updateData.active = Boolean(active);
    if (password && password.trim().length >= 6) {
      updateData.passwordHash = await hashPassword(password.trim());
    }

    // Update user
    await prisma.user.update({
      where: { id },
      data: updateData,
    });

    // Update gate access if passed
    if (role === 'ADMIN') {
      // Admins have access to all gates, so clear specific gate mappings
      await prisma.userGateAccess.deleteMany({ where: { userId: id } });
    } else if (Array.isArray(gateIds)) {
      // Delete old access
      await prisma.userGateAccess.deleteMany({ where: { userId: id } });
      // Create new access
      if (gateIds.length > 0) {
        await prisma.userGateAccess.createMany({
          data: gateIds.map((gateId: string) => ({ userId: id, gateId })),
        });
      }
    }

    await logAudit({
      action: 'UPDATE_USER',
      entityType: 'User',
      entityId: id,
      details: {
        name: updateData.name,
        email: updateData.email,
        role: updateData.role,
        active: updateData.active,
        passwordChanged: Boolean(updateData.passwordHash),
        gateIds: role === 'ADMIN' ? 'ALL_GATES' : gateIds,
      },
      performedById: user.id,
    });

    return NextResponse.json({ success: true, message: 'Member updated successfully' });
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: error?.message || 'Failed to update user' }, { status: 500 });
  }
}
