// // import { NextRequest, NextResponse } from "next/server";
// // import { query } from "@/lib/db";

// // export async function GET(
// //   req: NextRequest,
// //   { params }: { params: { id: string } }
// // ) {
// //   try {
// //     const { id } = params;

// //     // Fetch customer
// //     const customerResult = await query(
// //       `SELECT * FROM customers WHERE id = $1 AND deleted_at IS NULL`,
// //       [id]
// //     );

// //     if (customerResult.rows.length === 0) {
// //       return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });
// //     }

// //     const customer = customerResult.rows[0];

// //     // Fetch stats
// //     const statsResult = await query(
// //       `SELECT
// //         COUNT(*)                                            AS total_devices,
// //         COUNT(*) FILTER (WHERE connection_status = 'online') AS online_devices
// //        FROM devices
// //        WHERE customer_id = $1 AND deleted_at IS NULL`,
// //       [id]
// //     );

// //     const subResult = await query(
// //       `SELECT COUNT(*) AS sub_customers FROM customers WHERE parent_customer_id = $1 AND deleted_at IS NULL`,
// //       [id]
// //     );

// //     // Fetch distinct asset types for this customer's devices
// //     const assetResult = await query(
// //       `SELECT DISTINCT asset_type FROM devices
// //        WHERE customer_id = $1 AND asset_type IS NOT NULL AND deleted_at IS NULL
// //        ORDER BY asset_type`,
// //       [id]
// //     );

// //     return NextResponse.json({
// //       success: true,
// //       data: {
// //         ...customer,
// //         stats: {
// //           total_devices:  parseInt(statsResult.rows[0].total_devices),
// //           online_devices: parseInt(statsResult.rows[0].online_devices),
// //           sub_customers:  parseInt(subResult.rows[0].sub_customers),
// //         },
// //         asset_types: assetResult.rows.map((r) => r.asset_type),
// //       },
// //     });
// //   } catch (err: any) {
// //     console.error("GET /api/customers/[id] error:", err);
// //     return NextResponse.json({ success: false, error: err.message }, { status: 500 });
// //   }
// // }

// // export async function PATCH(
// //   req: NextRequest,
// //   { params }: { params: { id: string } }
// // ) {
// //   try {
// //     const { id } = params;
// //     const body = await req.json();

// //     const {
// //       name, email, phone, company_name, customer_type, status,
// //       plan_type, max_devices, timezone,
// //       contact_person_name, contact_person_email, contact_person_phone,
// //       address_line1, address_line2, city, state, country, postal_code, notes,
// //     } = body;

// //     const result = await query(
// //       `UPDATE customers SET
// //         name = $1, email = $2, phone = $3, company_name = $4,
// //         customer_type = $5, status = $6, plan_type = $7,
// //         max_devices = $8, timezone = $9,
// //         contact_person_name = $10, contact_person_email = $11, contact_person_phone = $12,
// //         address_line1 = $13, address_line2 = $14, city = $15,
// //         state = $16, country = $17, postal_code = $18, notes = $19,
// //         updated_at = NOW()
// //        WHERE id = $20 AND deleted_at IS NULL
// //        RETURNING *`,
// //       [
// //         name, email, phone || null, company_name || null,
// //         customer_type || "customer", status || "active", plan_type || "basic",
// //         max_devices || 10, timezone || "Asia/Kolkata",
// //         contact_person_name || null, contact_person_email || null, contact_person_phone || null,
// //         address_line1 || null, address_line2 || null, city || null,
// //         state || null, country || null, postal_code || null, notes || null,
// //         id,
// //       ]
// //     );

// //     if (result.rows.length === 0) {
// //       return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });
// //     }

// //     return NextResponse.json({ success: true, data: result.rows[0] });
// //   } catch (err: any) {
// //     console.error("PATCH /api/customers/[id] error:", err);
// //     return NextResponse.json({ success: false, error: err.message }, { status: 500 });
// //   }
// // }
// import { NextRequest, NextResponse } from "next/server";
// import { query } from "@/lib/db";

// export async function GET(
//   req: NextRequest,
//   { params }: { params: Promise<{ id: string }> }  // ← Promise type
// ) {
//   try {
//     const { id } = await params;  // ← await params first

//     const customerResult = await query(
//       `SELECT * FROM customers WHERE id = $1 AND deleted_at IS NULL`,
//       [id]
//     );

//     if (customerResult.rows.length === 0) {
//       return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });
//     }

//     const customer = customerResult.rows[0];

//     const statsResult = await query(
//       `SELECT
//         COUNT(*)                                               AS total_devices,
//         COUNT(*) FILTER (WHERE connection_status = 'online')  AS online_devices
//        FROM devices
//        WHERE customer_id = $1 AND deleted_at IS NULL`,
//       [id]
//     );

//     const subResult = await query(
//       `SELECT COUNT(*) AS sub_customers FROM customers
//        WHERE parent_customer_id = $1 AND deleted_at IS NULL`,
//       [id]
//     );

//     const assetResult = await query(
//       `SELECT DISTINCT asset_type FROM devices
//        WHERE customer_id = $1 AND asset_type IS NOT NULL AND deleted_at IS NULL
//        ORDER BY asset_type`,
//       [id]
//     );

//     return NextResponse.json({
//       success: true,
//       data: {
//         ...customer,
//         stats: {
//           total_devices:  parseInt(statsResult.rows[0].total_devices),
//           online_devices: parseInt(statsResult.rows[0].online_devices),
//           sub_customers:  parseInt(subResult.rows[0].sub_customers),
//         },
//         asset_types: assetResult.rows.map((r) => r.asset_type),
//       },
//     });
//   } catch (err: any) {
//     console.error("GET /api/customers/[id] error:", err);
//     return NextResponse.json({ success: false, error: err.message }, { status: 500 });
//   }
// }

// export async function PATCH(
//   req: NextRequest,
//   { params }: { params: Promise<{ id: string }> }  // ← Promise type
// ) {
//   try {
//     const { id } = await params;  // ← await params first
//     const body = await req.json();

//     const {
//       name, email, phone, company_name, customer_type, status,
//       plan_type, max_devices, timezone,
//       contact_person_name, contact_person_email, contact_person_phone,
//       address_line1, address_line2, city, state, country, postal_code, notes,
//     } = body;

//     const result = await query(
//       `UPDATE customers SET
//         name = $1, email = $2, phone = $3, company_name = $4,
//         customer_type = $5, status = $6, plan_type = $7,
//         max_devices = $8, timezone = $9,
//         contact_person_name = $10, contact_person_email = $11, contact_person_phone = $12,
//         address_line1 = $13, address_line2 = $14, city = $15,
//         state = $16, country = $17, postal_code = $18, notes = $19,
//         updated_at = NOW()
//        WHERE id = $20 AND deleted_at IS NULL
//        RETURNING *`,
//       [
//         name, email, phone || null, company_name || null,
//         customer_type || "customer", status || "active", plan_type || "basic",
//         max_devices || 10, timezone || "Asia/Kolkata",
//         contact_person_name || null, contact_person_email || null, contact_person_phone || null,
//         address_line1 || null, address_line2 || null, city || null,
//         state || null, country || null, postal_code || null, notes || null,
//         id,
//       ]
//     );

//     if (result.rows.length === 0) {
//       return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });
//     }

//     return NextResponse.json({ success: true, data: result.rows[0] });
//   } catch (err: any) {
//     console.error("PATCH /api/customers/[id] error:", err);
//     return NextResponse.json({ success: false, error: err.message }, { status: 500 });
//   }
// }
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db"; // ← shared pool, not new Pool()

// GET /api/customers/[id]/devices?asset_type=Solar+Plant
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // ← Promise type
) {
  try {
    const { id } = await params; // ← await params first
    const { searchParams } = new URL(req.url);
    const assetType = searchParams.get("asset_type");

    let sql = `
      SELECT
        d.*,
        c.name AS customer_name,
        c.company_name AS customer_company
      FROM devices d
      LEFT JOIN customers c ON c.id = d.customer_id
      WHERE d.customer_id = $1
        AND d.deleted_at IS NULL
    `;
    const values: any[] = [id];

    if (assetType) {
      sql += ` AND d.asset_type = $2`;
      values.push(assetType);
    }

    sql += ` ORDER BY d.connection_status DESC, d.device_name ASC`;

    const result = await query(sql, values); // ← shared query, not pool.query

    return NextResponse.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
    });
  } catch (err: any) {
    console.error("GET /api/customers/[id]/devices error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}