// ============================================================================
// API ROUTE: /api/customers
// GET - Fetch all customers
// POST - Create new customer
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const sql = `
      SELECT 
        id,
        name,
        email,
        phone,
        company_name,
        customer_type,
        status,
        parent_customer_id,
        hierarchy_level,
        max_devices,
        city,
        state,
        country,
        created_at,
        updated_at
      FROM customers
      WHERE deleted_at IS NULL
      ORDER BY hierarchy_level, name
    `;

    const result = await query(sql);

    return NextResponse.json({
      success: true,
      data: result.rows,
      count: result.rowCount,
    });
  } catch (error: any) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch customers',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      email,
      phone,
      company_name,
      customer_type,
      parent_customer_id,
      max_devices,
      city,
      state,
      country,
    } = body;

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: name and email',
        },
        { status: 400 }
      );
    }

    // Note: hierarchy_path and hierarchy_level are auto-calculated by trigger
    const sql = `
      INSERT INTO customers (
        name, email, phone, company_name, customer_type, 
        parent_customer_id, max_devices, city, state, country,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active')
      RETURNING *
    `;

    const result = await query(sql, [
      name,
      email,
      phone || null,
      company_name || name,
      customer_type || 'customer',
      parent_customer_id || null,
      max_devices || 10,
      city || null,
      state || null,
      country || null,
    ]);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Customer created successfully',
    });
  } catch (error: any) {
    console.error('Error creating customer:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create customer',
        message: error.message,
      },
      { status: 500 }
    );
  }
}