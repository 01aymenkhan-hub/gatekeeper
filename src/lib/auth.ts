import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import prisma from './prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'gatekeeper_secret_jwt_key_2026';
const TOKEN_COOKIE_NAME = 'gk_token';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'OPERATOR';
  gateIds?: string[];
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

export function verifyToken(token: string): AuthUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthUser;
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(TOKEN_COOKIE_NAME)?.value;
    if (!token) return null;
    return verifyToken(token);
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

export { TOKEN_COOKIE_NAME };
