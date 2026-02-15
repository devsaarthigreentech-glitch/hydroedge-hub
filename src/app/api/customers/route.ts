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
        company_name,
        customer_type,
        status,
        parent_customer_id,
        hierarchy_level,
        max_devices,
        city,
        country,
        email,
        phone,
        created_at,
        updated_at
      FROM customers
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
      company_name,
      customer_type,
      parent_customer_id,
      max_devices,
      city,
      country,
      email,
      phone,
    } = body;

    // Validate required fields
    if (!name || !company_name || !customer_type) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
        },
        { status: 400 }
      );
    }

    // Calculate hierarchy level
    let hierarchy_level = 0;
    if (parent_customer_id) {
      const parentResult = await query(
        'SELECT hierarchy_level FROM customers WHERE id = $1',
        [parent_customer_id]
      );
      if (parentResult.rows.length > 0) {
        hierarchy_level = parentResult.rows[0].hierarchy_level + 1;
      }
    }

    const sql = `
      INSERT INTO customers (
        name, company_name, customer_type, parent_customer_id,
        hierarchy_level, max_devices, city, country, email, phone,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active')
      RETURNING *
    `;

    const result = await query(sql, [
      name,
      company_name,
      customer_type,
      parent_customer_id,
      hierarchy_level,
      max_devices || 10,
      city,
      country,
      email,
      phone,
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
