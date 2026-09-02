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

        const { device_name, device_type, asset_name, asset_type, sim_number, customer_id, notes, tested, name_lock, system_voltage, set_ain1_raw, weekly_report } = body;

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

        // device_name is freely editable for as long as the device is UNLOCKED.
        // Once locked it is immutable — unlock it first to rename.
        if (device_name !== undefined && !current.name_locked) {
            if (typeof device_name !== 'string' || !device_name.trim()) {
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

        // NOTE: the manual device_name update is applied AFTER the naming gate
        // below — if the gate fires it sets device_name itself, and pushing it
        // here too would produce "multiple assignments to same column".

        // 12 or 24 only — anything else would silently mis-threshold the
        // external-power alarm, so reject it here rather than let the database
        // CHECK surface as a 500.
        if (system_voltage !== undefined) {
            const v = system_voltage === null || system_voltage === "" ? null : Number(system_voltage);
            if (v !== null && v !== 12 && v !== 24) {
                return NextResponse.json(
                    { success: false, error: 'System voltage must be 12, 24, or empty' },
                    { status: 400 }
                );
            }
            updates.push(`system_voltage = $${paramCount}`);
            values.push(v);
            paramCount++;
        }

        // Commissioned setpoint, stored as the RAW Ain.1 value in millivolts —
        // the same units io_records uses for io_id 9. Deviation alarms compare
        // raw against raw so they survive a change to the amps divisor.
        // The health panel alarms on a >10% deviation from this, so a bad value
        // produces false alarms rather than a visible error — validate it.
        // Empty string / null clears it, which suppresses the deviation alarms.
        if (set_ain1_raw !== undefined) {
            const raw = set_ain1_raw === null || set_ain1_raw === "" ? null : Number(set_ain1_raw);
            if (raw !== null && (!Number.isFinite(raw) || raw <= 0 || raw > 60000)) {
                return NextResponse.json(
                    { success: false, error: 'Set point must be an Ain.1 raw value between 0 and 60000, or empty' },
                    { status: 400 }
                );
            }
            updates.push(`set_ain1_raw = $${paramCount}`);
            values.push(raw);
            paramCount++;
        }

        // Weekly report inclusion override — see db/migrations/008.
        if (weekly_report !== undefined) {
            if (!['auto', 'always', 'never'].includes(weekly_report)) {
                return NextResponse.json(
                    { success: false, error: 'Weekly report must be auto, always, or never' },
                    { status: 400 }
                );
            }
            updates.push(`weekly_report = $${paramCount}`);
            values.push(weekly_report);
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

        // Free-text label for the physical asset this unit is installed on.
        // Purely descriptive — it plays no part in the naming gate below.
        if (asset_type !== undefined) {
            if (asset_type !== null && typeof asset_type !== 'string') {
                return NextResponse.json(
                    { success: false, error: 'Asset type series must be text' },
                    { status: 400 }
                );
            }
            if (asset_type && asset_type.length > 100) {
                return NextResponse.json(
                    { success: false, error: 'Asset type series is too long (max 100 characters)' },
                    { status: 400 }
                );
            }
            updates.push(`asset_type = $${paramCount}`);
            values.push(asset_type ? asset_type.trim() : null);
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

        // ── Naming gate ──────────────────────────────────────────────
        // Assignment and locking are ATOMIC: a number is only drawn from the
        // sequence at the same moment the name is locked. This matters because
        // nextval() is non-transactional — if a device could sit in an
        // "assigned but unlocked" state, every subsequent save would draw a
        // fresh number and silently burn the series.
        const effectiveCustomerId = customer_id !== undefined ? customer_id : current.customer_id;
        const effectiveAssetName = asset_name !== undefined ? asset_name : current.asset_name;
        const effectiveTested = tested !== undefined ? tested : current.tested;

        // A device that already carries a SERIES name must never be renumbered,
        // even if it is unlocked and re-saved with tested still ticked.
        // Free-text placeholder names (Device-123456, "bench unit 3", etc.)
        // are NOT series names and remain eligible for assignment.
        const hasSeriesName = /^SGT-G[DXMI]-\d{4}-\d+$/.test(current.device_name || '');

        let nameAssigned = false;

        if (
            AUTO_NAME_ASSIGNMENT_ENABLED &&
            !current.name_locked &&
            !hasSeriesName &&
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

        // Manual name edit — only when the gate didn't assign a name itself,
        // and only while the device is unlocked.
        if (!nameAssigned && device_name !== undefined && !current.name_locked) {
            updates.push(`device_name = $${paramCount}`);
            values.push(device_name.trim());
            paramCount++;
        }

        // Persist a plain tested toggle when the gate didn't fire.
        if (!nameAssigned && tested !== undefined) {
            updates.push(`tested = $${paramCount}`);
            values.push(tested);
            paramCount++;
        }

        // Plain lock/unlock toggle when the gate didn't fire.
        // Unticking unlocks the name so it can be freely edited again.
        if (!nameAssigned && name_lock !== undefined) {
            updates.push(`name_locked = $${paramCount}`);
            values.push(name_lock);
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