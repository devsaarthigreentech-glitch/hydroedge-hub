import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// GET /api/users — list all users with customer info
// export async function GET(req: NextRequest) {
//   try {
//     const { searchParams } = new URL(req.url);
//     const customerId = searchParams.get("customer_id");

//     let sql = `
//       SELECT 
//         u.id, u.username, u.email, u.full_name, u.phone,
//         u.role, u.customer_id, u.status,
//         u.last_login_at, u.created_at, u.updated_at,
//         u.preferred_language, u.timezone,
//         c.name AS customer_name,
//         c.company_name AS customer_company,
//         c.customer_type
//       FROM users u
//       LEFT JOIN customers c ON c.id = u.customer_id
//       WHERE u.deleted_at IS NULL
//     `;
//     const params: any[] = [];

//     if (customerId) {
//       params.push(customerId);
//       sql += ` AND u.customer_id = $${params.length}`;
//     }

//     sql += ` ORDER BY u.created_at DESC`;

//     const result = await query(sql, params);

//     return NextResponse.json({
//       success: true,
//       data: result.rows,
//       total: result.rows.length,
//     });
//   } catch (error: any) {
//     console.error("Users GET error:", error);
//     return NextResponse.json(
//       { success: false, error: error.message },
//       { status: 500 }
//     );
//   }
// }
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customer_id");

    let sql = `
      SELECT 
        u.id, u.username, u.email, u.full_name, u.phone,
        u.role, u.customer_id, u.status,
        u.last_login_at, u.created_at, u.updated_at,
        u.preferred_language, u.timezone,
        c.name AS customer_name,
        c.company_name AS customer_company,
        c.customer_type
      FROM users u
      LEFT JOIN customers c ON c.id = u.customer_id
      WHERE u.deleted_at IS NULL
    `;
    const params: any[] = [];

    // Non-admin users can only see users from their own customer
    if (user?.role !== 'super_admin' && user?.customerId) {
      params.push(user.customerId);
      sql += ` AND u.customer_id = $${params.length}`;
    } else if (customerId) {
      params.push(customerId);
      sql += ` AND u.customer_id = $${params.length}`;
    }

    sql += ` ORDER BY u.created_at DESC`;

    const result = await query(sql, params);

    return NextResponse.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
    });
  } catch (error: any) {
    console.error("Users GET error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/users — create a new user
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      username,
      email,
      password,
      full_name,
      phone,
      role = "user",
      customer_id,
      timezone = "Asia/Kolkata",
    } = body;

    // Validation
    if (!username || !email || !password) {
      return NextResponse.json(
        { success: false, error: "Username, email and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Check duplicates
    const existing = await query(
      `SELECT id FROM users 
       WHERE (username = $1 OR email = $2) AND deleted_at IS NULL`,
      [username, email]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: "Username or email already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    const result = await query(
      `INSERT INTO users (
        username, email, password_hash, full_name, phone,
        role, customer_id, status, timezone
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8)
      RETURNING id, username, email, full_name, phone, role, 
                customer_id, status, timezone, created_at`,
      [username, email, password_hash, full_name || null, phone || null,
       role, customer_id || null, timezone]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error("Users POST error:", error);
    if (error.code === "23505") {
      return NextResponse.json(
        { success: false, error: "Username or email already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}