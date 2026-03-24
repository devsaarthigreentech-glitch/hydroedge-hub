import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// GET /api/customers/[id]/devices?asset_type=Solar+Plant
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(req.url);
    const assetType = searchParams.get("asset_type"); // null means "all"

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

    const result = await pool.query(sql, values);

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