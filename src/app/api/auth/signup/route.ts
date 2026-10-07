import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword, generateToken, TOKEN_COOKIE_NAME } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, role } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Check if this is the first user ever; if so, make them ADMIN
    const totalUsers = await prisma.user.count();
    const assignedRole = totalUsers === 0 ? 'ADMIN' : (role === 'ADMIN' ? 'ADMIN' : 'OPERATOR');

    const passwordHash = await hashPassword(password);

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: assignedRole,
        active: true,
      },
    });

    const token = generateToken({
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      gateIds: [],
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        gateIds: [],
      },
    });

    response.cookies.set(TOKEN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    await logAudit({
      action: 'USER_SIGNUP',
      entityType: 'User',
      entityId: newUser.id,
      details: { email: newUser.email, role: newUser.role },
      performedById: newUser.id,
    });

    return response;
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error during signup' },
      { status: 500 }
    );
  }
}
