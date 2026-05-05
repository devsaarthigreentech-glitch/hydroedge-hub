// ============================================================================
// TAB ROUTE PROTECTION - Blocks API access for restricted tabs
// ============================================================================
// Use this in your API routes to prevent customers from calling
// endpoints they shouldn't have access to (e.g., /api/commands).
// Even if someone hides the tab in the UI, they could still call
// the API directly — this prevents that.
// ============================================================================

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isTabAllowed, DeviceTab } from '@/lib/tab-permissions';
import { NextResponse } from 'next/server';

/**
 * Map API route patterns to the tab they belong to.
 * If a route isn't listed here, it's allowed for everyone.
 */
const ROUTE_TO_TAB: Record<string, DeviceTab> = {
  '/api/commands': 'commands',
  '/api/devices/config': 'config',
  '/api/devices/settings': 'settings',
  '/api/devices/edit': 'edit',
  '/api/devices/logs': 'logs',
};

/**
 * Check if the current user has access to a specific tab's API.
 * Use at the top of any protected API route handler.
 *
 * Usage in an API route:
 * ```ts
 * export async function POST(req: Request) {
 *   const denied = await checkTabAccess('commands');
 *   if (denied) return denied; // Returns 403 response
 *   // ... rest of your handler
 * }
 * ```
 */
export async function checkTabAccess(
  requiredTab: DeviceTab
): Promise<NextResponse | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Super admins (from admin panel) bypass all restrictions
  const role = (session.user as any).role;
  if (role === 'super_admin' || role === 'admin') {
    return null; // Allow
  }

  // Check customer type against tab permissions
  const customerType = (session.user as any).customerType || 'customer';

  if (!isTabAllowed(customerType, requiredTab)) {
    return NextResponse.json(
      {
        error: 'Access denied',
        message: `Your account type (${customerType}) does not have access to this feature.`,
      },
      { status: 403 }
    );
  }

  return null; // Allow
}