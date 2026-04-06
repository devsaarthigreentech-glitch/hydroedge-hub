import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import pool from "@/lib/db";

export async function GET() {
  try {
    // Get session to check role and customer_id
    const { authOptions } = await import("@/lib/auth");
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    let result;

    if (user.role === "super_admin" || !user.customerId) {
      // Super admin sees all devices
      result = await pool.query(
        `SELECT d.*, c.name AS customer_name
         FROM devices d
         LEFT JOIN customers c ON c.id = d.customer_id
         WHERE d.deleted_at IS NULL
         ORDER BY c.name, d.device_name`
      );
    } else {
      // Customer user sees only their devices
      result = await pool.query(
        `SELECT d.*, c.name AS customer_name
         FROM devices d
         LEFT JOIN customers c ON c.id = d.customer_id
         WHERE d.customer_id = $1
           AND d.deleted_at IS NULL
         ORDER BY d.device_name`,
        [user.customerId]
      );
    }

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error("Customer devices error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}