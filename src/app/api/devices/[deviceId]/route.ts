import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { param } from "framer-motion/client";

export async function PATCH(
    request: NextRequest,
    context : {params : Promise<{ deviceId : string}>}
) {
    try {
        const { deviceId } = await context.params;
        const body = await request.json();

        const { device_name, device_type, asset_name, sim_number, customer_id } = body;

        const updates = [];
        const values = [];
        let paramCount = 1;

        if (device_name !== undefined) {  // ← Only validate if it's being updated
            if (!device_name.trim()) {
                return NextResponse.json(
                    { success: false, error: 'Device name cannot be empty' },
                    { status: 400 }
                );
            }
            
            if (device_name.length > 100) {
                return NextResponse.json(
                    { success: false, error: 'Device name is too long (max 100 characters)' },
                    { status: 400 }
                );
            }
        }

        if(device_name !== undefined){
            updates.push(`device_name = $${paramCount}`);
            values.push(device_name);
            paramCount++;
        }

        if(device_type !== undefined){
            updates.push(`device_type = $${paramCount}`);
            values.push(device_type);
            paramCount++;
        }

        if (asset_name !== undefined) {
            updates.push(`asset_name = $${paramCount}`);
            values.push(asset_name);
            paramCount++;
          }

        if(sim_number !== undefined){
            updates.push(`sim_number = $${paramCount}`);
            values.push(sim_number);
            paramCount++;
        }

        if (customer_id !== undefined) { 
            updates.push(`customer_id = $${paramCount}`); 
            values.push(customer_id); 
            paramCount++;
        }

        if(updates.length === 0){
            return NextResponse.json(
                {
                    success : false, error : 'No fields to update'
                }, 
                {
                    status: 400
                }
            );
        }

        updates.push(`updated_at = NOW()`);
        values.push(deviceId);

        const sql = 
            `
                UPDATE devices
                SET ${updates.join(', ')}
                WHERE id = $${paramCount}
                AND deleted_at IS NULL
                RETURNING *
            `;


        const result = await query(sql,values);

        if(result.rows.length === 0){
            return NextResponse.json(
                {success: false, error: 'Device not found'},
                {status : 404}
            );
        }

        return NextResponse.json({
            success: true,
            message : 'Device Name updated sucessfully',
            data: result.rows[0]
        });

    } catch (err) {
        console.error('Error updating device name : ',err);
        return NextResponse.json({
            success: false,
            error : 'Failed to update device name',
            message: err
        },
        {status : 500}
    );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
  ) {
    try {
      const deviceId = params.id;
  
      // Soft delete — keeps history intact, just marks it inactive
      // If you want hard delete, replace with: DELETE FROM devices WHERE id = $1
      const sql = `
        UPDATE devices 
        SET status = 'deleted', deleted_at = NOW(), updated_at = NOW()
        WHERE id = $1
        RETURNING id, device_name, imei
      `;
  
      const result = await query(sql, [deviceId]);
  
      if (result.rows.length === 0) {
        return NextResponse.json({ error: "Device not found" }, { status: 404 });
      }
  
      return NextResponse.json({ 
        success: true, 
        message: `Device ${result.rows[0].device_name} (${result.rows[0].imei}) deleted`,
        device: result.rows[0]
      });
    } catch (error) {
      console.error("DELETE /api/devices/[id] error:", error);
      return NextResponse.json({ error: "Failed to delete device" }, { status: 500 });
    }
  }