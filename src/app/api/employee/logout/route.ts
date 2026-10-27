import { NextResponse } from 'next/server';
import {
  EMPLOYEE_TOKEN_COOKIE_NAME,
  EMPLOYEE_STATUS_COOKIE_NAME,
} from '@/lib/auth';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(EMPLOYEE_TOKEN_COOKIE_NAME);
  response.cookies.delete(EMPLOYEE_STATUS_COOKIE_NAME);
  return response;
}
