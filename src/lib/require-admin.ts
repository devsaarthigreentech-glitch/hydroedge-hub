// Server check for admin-only API routes. Same roles tab-guard treats as admins.
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';

export const isAdminRole = (role: unknown) => role === 'super_admin' || role === 'admin';

/** { denied } to return as-is, or { name } of the signed-in admin. */
export async function requireAdmin(): Promise<{ denied: NextResponse } | { name: string | null }> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { denied: NextResponse.json({ success: false, error: 'Sign in first' }, { status: 401 }) };
  if (!isAdminRole((session.user as any).role)) {
    return { denied: NextResponse.json({ success: false, error: 'Admins only' }, { status: 403 }) };
  }
  return { name: session.user.name || session.user.email || null };
}
