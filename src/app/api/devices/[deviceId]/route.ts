import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

// ── Auto-naming series switch ───────────────────────────────────────────
// TRUE  = Tested-gated auto-naming/locking is ACTIVE. device_name is
//         server-generated as SGT-XX-MMYY-#### once a device has a customer,
//         an asset type, and tested=true — then permanently locked.
//         Any device_name sent by the client is ignored.
// FALSE = manual naming; device_name accepted from the client, gate never fires.
//
// If ever set back to false and then true again, re-run reenable_autonaming.sql
// first: existing names must be locked and the sequences advanced past any
// manually-assigned numbers, or devices will be silently renamed.
// Sequences were last set 2026-07-25: GD=24, GX=30 (next are 0025 / 0031).
const AUTO_NAME_ASSIGNMENT_ENABLED = true;

// Fixed, hard-coded whitelist — never built from user input.
const ASSET_CODE_MAP: Record<string, { code: string; sequence: string }> = {
    EOW: { code: "GD", sequence: "device_seq_gd" },
    DG: { code: "GX", sequence: "device_seq_gx" },
    Marine: { code: "GM", sequence: "device_seq_mr" },
    Industrial: { code: "GI", sequence: "device_seq_in" },
};

export async function PATCH(
    request: NextRequest,
    context : {params : Promise<{ deviceId : string}>}
) {
    try {
        const { deviceId } = await context.params;
        const body = await request.json();

        const { device_name, device_type, asset_name, sim_number, customer_id, notes, tested } = body;

        // Fetch current state — needed to evaluate the naming gate correctly,
        // and to know name_locked even while the gate is paused.
        const currentResult = await query(
            `SELECT customer_id, asset_name, tested, name_locked, device_name
             FROM devices WHERE id = $1 AND deleted_at IS NULL`,
            [deviceId]
        );

        if (currentResult.rows.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Device not found' },
                { status: 404 }
            );
        }

        const current = currentResult.rows[0];

        const updates = [];
        const values = [];
        let paramCount = 1;

        // Manual device_name entry — only validated/applied while auto-naming
        // is disabled. When enabled, any client-sent device_name is ignored.
        if (!AUTO_NAME_ASSIGNMENT_ENABLED && device_name !== undefined) {
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

        if (notes !== undefined && notes !== null && notes.length > 2000) {
            return NextResponse.json(
                { success: false, error: 'Notes are too long (max 2000 characters)' },
                { status: 400 }
            );
        }

        if (!AUTO_NAME_ASSIGNMENT_ENABLED && device_name !== undefined) {
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

        if (notes !== undefined) {
            updates.push(`notes = $${paramCount}`);
            values.push(notes);
            paramCount++;
        }

        // ── Naming gate (currently PAUSED — see AUTO_NAME_ASSIGNMENT_ENABLED) ──
        // When re-enabled: fires the very first time all three conditions are
        // true for a device whose name isn't locked yet. After that, name_locked
        // permanently blocks any further renaming, no matter what changes.
        const effectiveCustomerId = customer_id !== undefined ? customer_id : current.customer_id;
        const effectiveAssetName = asset_name !== undefined ? asset_name : current.asset_name;
        const effectiveTested = tested !== undefined ? tested : current.tested;

        let nameAssigned = false;

        if (
            AUTO_NAME_ASSIGNMENT_ENABLED &&
            !current.name_locked &&
            effectiveTested === true &&
            effectiveCustomerId &&
            effectiveAssetName &&
            ASSET_CODE_MAP[effectiveAssetName]
        ) {
            const { code, sequence } = ASSET_CODE_MAP[effectiveAssetName];
            const seqRes = await query(`SELECT nextval('${sequence}') AS n`);
            const num = seqRes.rows[0].n as number;

            const now = new Date();
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const yy = String(now.getFullYear()).slice(-2);
            const newName = `SGT-${code}-${mm}${yy}-${String(num).padStart(4, '0')}`;

            updates.push(`device_name = $${paramCount}`); values.push(newName); paramCount++;
            updates.push(`name_locked = $${paramCount}`); values.push(true); paramCount++;
            updates.push(`tested = $${paramCount}`); values.push(true); paramCount++;
            nameAssigned = true;
        }

        // If naming wasn't triggered this call, still persist a plain `tested` toggle if sent.
        if (!nameAssigned && tested !== undefined) {
            updates.push(`tested = $${paramCount}`);
            values.push(tested);
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
            message : 'Device updated sucessfully',
            data: result.rows[0]
        });

    } catch (err) {
        console.error('Error updating device : ',err);
        return NextResponse.json({
            success: false,
            error : 'Failed to update device',
            message: err
        },
        {status : 500}
    );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ deviceId: string }> }
  ) {
    try {
        const resolved = await params;
        const deviceId = resolved.deviceId;
  
      const sql = `
        DELETE FROM devices
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