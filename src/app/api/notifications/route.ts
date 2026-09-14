import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";

// ============================================================================
// GET   /api/notifications  — who currently receives alert emails
// PATCH /api/notifications  — flip a company or a person on/off
//
// The alert scan (POST /api/alerts/check) emails a person only when their
// company is subscribed AND they are subscribed AND they are active AND they
// have an email address. This endpoint reports and edits the first two.
//
// Scoping: a session that carries a customerId belongs to a customer user
// (same rule as /api/users and /api/customers). They only ever see and edit
// their own company and its people. Super admins see everything.
// ============================================================================

/** The customer id a session is confined to, or null for a fleet-wide admin. */
async function scopedCustomerId(): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (user?.role !== "super_admin" && user?.customerId) return user.customerId;
  } catch {
    /* no session — treat as unscoped so a broken auth layer doesn't hide data from admins */
  }
  return null;
}

export async function GET() {
  try {
    const scope = await scopedCustomerId();
    const scopeParams = scope ? [scope] : [];

    const customersResult = await query(`
      SELECT c.id, c.name, c.company_name, c.status,
             COALESCE(c.notifications_enabled, TRUE) AS notifications_enabled,
             COUNT(d.id) FILTER (
               WHERE d.deleted_at IS NULL
                 AND d.device_type = 'FMC650'
                 AND d.asset_name IN ('DG', 'EOW')
             )::int AS alertable_devices
        FROM customers c
        LEFT JOIN devices d ON d.customer_id = c.id
       WHERE c.deleted_at IS NULL
         ${scope ? "AND c.id = $1" : ""}
       GROUP BY c.id
       ORDER BY c.name
    `, scopeParams);

    const usersResult = await query(`
      SELECT id, customer_id, username, full_name, email, role, status,
             COALESCE(notifications_enabled, TRUE) AS notifications_enabled
        FROM users
       WHERE deleted_at IS NULL
         AND customer_id IS NOT NULL
         ${scope ? "AND customer_id = $1" : ""}
       ORDER BY full_name NULLS LAST, username
    `, scopeParams);

    const usersByCustomer: Record<string, any[]> = {};
    for (const u of usersResult.rows) {
      (usersByCustomer[u.customer_id] ||= []).push({
        ...u,
        // Why this person will or will not be emailed, without the caller
        // having to re-derive the rule.
        receives:
          u.notifications_enabled &&
          u.status === "active" &&
          !!u.email,
      });
    }

    const data = customersResult.rows.map((c) => {
      const users = usersByCustomer[c.id] || [];
      const subscribed = c.notifications_enabled
        ? users.filter((u) => u.receives)
        : [];
      return {
        ...c,
        users,
        user_count: users.length,
        // Effective recipients: company switch gates everyone below it.
        recipient_count: subscribed.length,
        recipients: subscribed.map((u) => u.email),
      };
    });

    return NextResponse.json({
      success: true,
      data,
      // Tells the UI to drop the fleet-wide chrome (tiles, search, filters).
      scoped: !!scope,
      summary: {
        companies:              data.length,
        companies_subscribed:   data.filter((c) => c.notifications_enabled).length,
        companies_unsubscribed: data.filter((c) => !c.notifications_enabled).length,
        total_recipients:       data.reduce((n, c) => n + c.recipient_count, 0),
      },
    });
  } catch (error: any) {
    console.error("GET /api/notifications error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PATCH body: { scope: "customer" | "user", id: string, enabled: boolean }
export async function PATCH(req: NextRequest) {
  try {
    const { scope, id, enabled } = await req.json();

    if (scope !== "customer" && scope !== "user") {
      return NextResponse.json(
        { success: false, error: 'scope must be "customer" or "user"' },
        { status: 400 }
      );
    }
    if (!id) {
      return NextResponse.json({ success: false, error: "id is required" }, { status: 400 });
    }
    if (typeof enabled !== "boolean") {
      return NextResponse.json(
        { success: false, error: "enabled must be true or false" },
        { status: 400 }
      );
    }

    const table = scope === "customer" ? "customers" : "users";
    const label = scope === "customer" ? "name" : "COALESCE(full_name, username)";

    // Customer users may only flip their own company or people inside it.
    // Enforced in the WHERE clause so an out-of-scope id simply matches nothing.
    const ownCustomer = await scopedCustomerId();
    const ownerCol = scope === "customer" ? "id" : "customer_id";
    const params: any[] = [enabled, id];
    if (ownCustomer) params.push(ownCustomer);

    const result = await query(
      `UPDATE ${table}
          SET notifications_enabled = $1, updated_at = NOW()
        WHERE id = $2 AND deleted_at IS NULL
          ${ownCustomer ? `AND ${ownerCol} = $3` : ""}
        RETURNING id, ${label} AS label, notifications_enabled`,
      params
    );

    if (result.rows.length === 0) {
      // Either it doesn't exist or it belongs to another company — same answer
      // either way, so a customer user can't probe other companies' ids.
      return NextResponse.json(
        { success: false, error: `${scope} not found` },
        { status: ownCustomer ? 403 : 404 }
      );
    }

    const row = result.rows[0];
    return NextResponse.json({
      success: true,
      data: { scope, ...row },
      message: `${row.label} ${enabled ? "subscribed to" : "unsubscribed from"} alert emails`,
    });
  } catch (error: any) {
    console.error("PATCH /api/notifications error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
