// // ============================================================================
// // API ROUTE: /api/customers
// // GET - Fetch all customers
// // POST - Create new customer
// // ============================================================================

// import { NextRequest, NextResponse } from 'next/server';
// import { query } from '@/lib/db';

// export async function GET() {
//   try {
//     const sql = `
//       SELECT 
//         id,
//         name,
//         email,
//         phone,
//         company_name,
//         customer_type,
//         status,
//         parent_customer_id,
//         hierarchy_level,
//         max_devices,
//         city,
//         state,
//         country,
//         created_at,
//         updated_at
//       FROM customers
//       WHERE deleted_at IS NULL
//       ORDER BY hierarchy_level, name
//     `;

//     const result = await query(sql);

//     return NextResponse.json({
//       success: true,
//       data: result.rows,
//       count: result.rowCount,
//     });
//   } catch (error: any) {
//     console.error('Error fetching customers:', error);
//     return NextResponse.json(
//       {
//         success: false,
//         error: 'Failed to fetch customers',
//         message: error.message,
//       },
//       { status: 500 }
//     );
//   }
// }

// export async function POST(request: NextRequest) {
//   try {
//     const body = await request.json();
//     const {
//       name,
//       email,
//       phone,
//       company_name,
//       customer_type,
//       parent_customer_id,
//       max_devices,
//       city,
//       state,
//       country,
//     } = body;

//     // Validate required fields
//     if (!name || !email) {
//       return NextResponse.json(
//         {
//           success: false,
//           error: 'Missing required fields: name and email',
//         },
//         { status: 400 }
//       );
//     }

//     // Note: hierarchy_path and hierarchy_level are auto-calculated by trigger
//     const sql = `
//       INSERT INTO customers (
//         name, email, phone, company_name, customer_type, 
//         parent_customer_id, max_devices, city, state, country,
//         status
//       )
//       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active')
//       RETURNING *
//     `;

//     const result = await query(sql, [
//       name,
//       email,
//       phone || null,
//       company_name || name,
//       customer_type || 'customer',
//       parent_customer_id || null,
//       max_devices || 10,
//       city || null,
//       state || null,
//       country || null,
//     ]);

//     return NextResponse.json({
//       success: true,
//       data: result.rows[0],
//       message: 'Customer created successfully',
//     });
//   } catch (error: any) {
//     console.error('Error creating customer:', error);
//     return NextResponse.json(
//       {
//         success: false,
//         error: 'Failed to create customer',
//         message: error.message,
//       },
//       { status: 500 }
//     );
//   }
// }

import { NextRequest, NextResponse } from "next/server";
import  pool  from "@/lib/db";

export async function GET() {
  const result = await pool.query(`
    SELECT * FROM customers
    WHERE deleted_at IS NULL
    ORDER BY hierarchy_level ASC, name ASC
  `);
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const {
    name,
    email,
    phone,
    company_name,
    parent_customer_id,
    customer_type,
    primary_location,
    timezone,
    plan_type,
    max_devices,
    max_users,
    max_api_calls_per_day,
    contact_person_name,
    contact_person_email,
    contact_person_phone,
    address_line1,
    address_line2,
    city,
    state,
    country,
    postal_code,
    notes,
  } = body;

  // Required field validation
  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json(
      { error: "Name and email are required" },
      { status: 400 }
    );
  }

  try {
    const result = await pool.query(
      `INSERT INTO customers (
        name, email, phone, company_name,
        parent_customer_id, customer_type,
        primary_location, timezone, plan_type,
        max_devices, max_users, max_api_calls_per_day,
        contact_person_name, contact_person_email, contact_person_phone,
        address_line1, address_line2, city, state, country, postal_code,
        notes
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6,
        $7, $8, $9,
        $10, $11, $12,
        $13, $14, $15,
        $16, $17, $18, $19, $20, $21,
        $22
      )
      RETURNING *`,
      [
        name.trim(),
        email.trim().toLowerCase(),
        phone || null,
        company_name || null,
        parent_customer_id || null,        // null = root customer
        customer_type || "customer",
        primary_location || null,
        timezone || "Asia/Kolkata",
        plan_type || "basic",
        max_devices || 10,
        max_users || 5,
        max_api_calls_per_day || 10000,
        contact_person_name || null,
        contact_person_email || null,
        contact_person_phone || null,
        address_line1 || null,
        address_line2 || null,
        city || null,
        state || null,
        country || null,
        postal_code || null,
        notes || null,
      ]
    );

    return NextResponse.json(result.rows[0], { status: 201 });

  } catch (err: any) {
    // Unique constraint violation on email
    if (err.code === "23505" && err.constraint === "customers_email_key") {
      return NextResponse.json(
        { error: "A customer with this email already exists" },
        { status: 409 }
      );
    }
    // Foreign key violation — invalid parent_customer_id
    if (err.code === "23503") {
      return NextResponse.json(
        { error: "Parent customer not found" },
        { status: 404 }
      );
    }
    console.error("Create customer error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}