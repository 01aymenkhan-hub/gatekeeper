import { NextResponse } from 'next/server';
import { TOKEN_COOKIE_NAME, getSessionUser } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function POST() {
  try {
    const user = await getSessionUser();
    if (user) {
      await logAudit({
        action: 'USER_LOGOUT',
        entityType: 'User',
        entityId: user.id,
        performedById: user.id,
      });
    }

    const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
    response.cookies.set(TOKEN_COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
    return response;
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
