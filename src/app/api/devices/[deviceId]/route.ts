import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function PATCH(
    request: NextRequest,
    context : {params : Promise<{ deviceId : string}>}
) {
    try {
        const { deviceId } = await context.params;
        const body = await request.json();

        const { device_name } = body;

        if(!device_name){
            return NextResponse.json(
                {success : false, error : 'device_name is required'},
                {status : 400}
            );
        }

        if(device_name.length > 100){
            return NextResponse.json(
                {success : false, error : 'device_name is too long, max 100 characters allowed'},
                {status : 400}
            );
        }

        const result = await query(
            `
            UPDATE devices
            SET device_name = $1, updated_at = now()
            where id = $2 and deleted_at IS NULL
            RETURNING *
            `,
            [device_name, deviceId]
        );

        if(result.rows.length === 0){
            return NextResponse.json(
                {success: false, error: 'Device not found'},
                {status : 404}
            );
        }

        return NextResponse.json({
            sucess: true,
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