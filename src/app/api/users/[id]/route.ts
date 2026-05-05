import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import bcrypt from "bcryptjs";

// PATCH /api/users/[id] — update user
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    const {
      full_name,
      email,
      phone,
      role,
      customer_id,
      status,
      timezone,
      password,
    } = body;

    // Build dynamic update
    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (full_name !== undefined)  { updates.push(`full_name = $${idx++}`);  values.push(full_name); }
    if (email !== undefined)      { updates.push(`email = $${idx++}`);      values.push(email); }
    if (phone !== undefined)      { updates.push(`phone = $${idx++}`);      values.push(phone || null); }
    if (role !== undefined)       { updates.push(`role = $${idx++}`);       values.push(role); }
    if (customer_id !== undefined){ updates.push(`customer_id = $${idx++}`);values.push(customer_id || null); }
    if (status !== undefined)     { updates.push(`status = $${idx++}`);     values.push(status); }
    if (timezone !== undefined)   { updates.push(`timezone = $${idx++}`);   values.push(timezone); }

    // Password change (hash it)
    if (password && password.length >= 6) {
      const hash = await bcrypt.hash(password, 10);
      updates.push(`password_hash = $${idx++}`);
      values.push(hash);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: "No fields to update" },
        { status: 400 }
      );
    }

    values.push(id);
    const result = await query(
      `UPDATE users SET ${updates.join(", ")}
       WHERE id = $${idx} AND deleted_at IS NULL
       RETURNING id, username, email, full_name, phone, role, 
                 customer_id, status, timezone, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error("Users PATCH error:", error);
    if (error.code === "23505") {
      return NextResponse.json(
        { success: false, error: "Email already in use" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] — soft delete
export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const result = await query(
      `UPDATE users SET deleted_at = NOW(), status = 'inactive'
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING id, username`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `User ${result.rows[0].username} deleted`,
    });
  } catch (error: any) {
    console.error("Users DELETE error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}