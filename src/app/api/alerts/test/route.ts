// // import { NextRequest, NextResponse } from "next/server";
// // import { sendTestEmail, sendAlertEmail } from "@/lib/email";

// // // ============================================================================
// // // GET  /api/alerts/test?to=you@email.com         → sends a test email
// // // POST /api/alerts/test  { to, type: "alert" }   → sends a sample alert email
// // // ============================================================================

// // export async function GET(request: NextRequest) {
// //   const to = request.nextUrl.searchParams.get("to");

// //   if (!to) {
// //     return NextResponse.json({
// //       success: false,
// //       error: "Pass ?to=your@email.com to send a test email",
// //       config: {
// //         GMAIL_USER: process.env.GMAIL_USER ? "✅ Set" : "❌ Missing",
// //         GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD ? "✅ Set" : "❌ Missing",
// //         GMAIL_FROM: process.env.GMAIL_FROM || "(not set — will use GMAIL_USER)",
// //       },
// //     });
// //   }

// //   const result = await sendTestEmail(to);

// //   return NextResponse.json({
// //     success: result.success,
// //     message: result.success
// //       ? `Test email sent to ${to}`
// //       : `Failed: ${result.error}`,
// //     from: process.env.GMAIL_FROM || process.env.GMAIL_USER,
// //   });
// // }

// // export async function POST(request: NextRequest) {
// //   const body = await request.json();
// //   const to = body.to;

// //   if (!to) {
// //     return NextResponse.json({ success: false, error: "Missing 'to' field" }, { status: 400 });
// //   }

// //   // Send a sample alert email to verify the template looks correct
// //   const result = await sendAlertEmail({
// //     to,
// //     contactName: "Test User",
// //     customerName: "Demo Company",
// //     severity: "critical",
// //     systemName: "GreenDrive",
// //     message: "Abnormal: engine is ON but no output current",
// //     action: "Contact Saarthi Support immediately",
// //     deviceName: "DEMO-VEHICLE-01 (Test Device)",
// //     deviceImei: "350000000000001",
// //     deviceModel: "EOW",
// //     timestamp: new Date().toISOString(),
// //   });

// //   return NextResponse.json({
// //     success: result.success,
// //     message: result.success
// //       ? `Sample alert email sent to ${to}`
// //       : `Failed: ${result.error}`,
// //   });
// // }
// import { NextRequest, NextResponse } from "next/server";
// import { sendTestEmail, sendAlertEmail } from "@/lib/email";

// // ============================================================================
// // GET  /api/alerts/test?to=you@email.com         → sends a test email
// // POST /api/alerts/test  { to, type: "alert" }   → sends a sample alert email
// // ============================================================================

// export async function GET(request: NextRequest) {
//   const to = request.nextUrl.searchParams.get("to");

//   if (!to) {
//     return NextResponse.json({
//       success: false,
//       error: "Pass ?to=your@email.com to send a test email",
//       config: {
//         GMAIL_USER: process.env.GMAIL_USER ? "✅ Set" : "❌ Missing",
//         GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD ? "✅ Set" : "❌ Missing",
//         GMAIL_FROM: process.env.GMAIL_FROM || "(not set — will use GMAIL_USER)",
//       },
//     });
//   }

//   const result = await sendTestEmail(to);

//   return NextResponse.json({
//     success: result.success,
//     message: result.success
//       ? `Test email sent to ${to}`
//       : `Failed: ${result.error}`,
//     from: process.env.GMAIL_FROM || process.env.GMAIL_USER,
//   });
// }

// export async function POST(request: NextRequest) {
//   const body = await request.json();
//   const to = body.to;

//   if (!to) {
//     return NextResponse.json({ success: false, error: "Missing 'to' field" }, { status: 400 });
//   }

//   // Send a sample alert email to verify the template looks correct
//   const result = await sendAlertEmail({
//     to,
//     contactName: "Test User",
//     customerName: "Demo Company",
//     severity: "critical",
//     systemName: "GreenDrive",
//     message: "Abnormal: engine is ON but no output current",
//     action: "Contact Saarthi Support immediately",
//     deviceName: "DEMO-VEHICLE-01 (Test Device)",
//     deviceImei: "350000000000001",
//     deviceModel: "EOW",
//     timestamp: new Date().toISOString(),
//   });

//   return NextResponse.json({
//     success: result.success,
//     message: result.success
//       ? `Sample alert email sent to ${to}`
//       : `Failed: ${result.error}`,
//   });
// }

import { NextRequest, NextResponse } from "next/server";
import { sendTestEmail, sendBatchAlertEmail } from "@/lib/email";

// ============================================================================
// GET  /api/alerts/test?to=you@email.com         → sends a simple test email
// POST /api/alerts/test  { to }                  → sends a sample batch alert
// ============================================================================

export async function GET(request: NextRequest) {
  const to = request.nextUrl.searchParams.get("to");

  if (!to) {
    return NextResponse.json({
      success: false,
      error: "Pass ?to=your@email.com to send a test email",
      config: {
        GMAIL_USER: process.env.GMAIL_USER ? "✅ Set" : "❌ Missing",
        GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD ? "✅ Set" : "❌ Missing",
        GMAIL_FROM: process.env.GMAIL_FROM || "(not set — will use GMAIL_USER)",
      },
    });
  }

  const result = await sendTestEmail(to);

  return NextResponse.json({
    success: result.success,
    message: result.success
      ? `Test email sent to ${to}`
      : `Failed: ${result.error}`,
    from: process.env.GMAIL_FROM || process.env.GMAIL_USER,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const to = body.to;

  if (!to) {
    return NextResponse.json({ success: false, error: "Missing 'to' field" }, { status: 400 });
  }

  // Send a sample batch alert email with multiple alerts to preview the template
  const result = await sendBatchAlertEmail({
    to: [to],
    cc: [],   // no CC for test
    contactName: "Test User",
    customerName: "Demo Company",
    alerts: [
      {
        deviceName: "DEMO-VEHICLE-01 (Test Device)",
        deviceImei: "350000000000001",
        deviceModel: "EOW",
        severity: "critical",
        message: "Abnormal: engine is ON but no output current",
        action: "Contact Saarthi Support immediately",
      },
      {
        deviceName: "DEMO-VEHICLE-02 (Generator)",
        deviceImei: "350000000000002",
        deviceModel: "380KVA",
        severity: "warning",
        message: "Main water tank level is low",
        action: "Fill the main water tank",
      },
    ],
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json({
    success: result.success,
    message: result.success
      ? `Sample batch alert email sent to ${to}`
      : `Failed: ${result.error}`,
  });
}