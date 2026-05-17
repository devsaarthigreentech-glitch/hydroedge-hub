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
// import { sendTestEmail } from "@/lib/email";

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
//   const result = await sendTestEmail({
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
//     charAt: function (pos: number): string {
//       throw new Error("Function not implemented.");
//     },
//     charCodeAt: function (index: number): number {
//       throw new Error("Function not implemented.");
//     },
//     concat: function (...strings: string[]): string {
//       throw new Error("Function not implemented.");
//     },
//     indexOf: function (searchString: string, position?: number): number {
//       throw new Error("Function not implemented.");
//     },
//     lastIndexOf: function (searchString: string, position?: number): number {
//       throw new Error("Function not implemented.");
//     },
//     localeCompare: function (that: string): number {
//       throw new Error("Function not implemented.");
//     },
//     match: function (regexp: string | RegExp): RegExpMatchArray | null {
//       throw new Error("Function not implemented.");
//     },
//     replace: function (searchValue: string | RegExp, replaceValue: string): string {
//       throw new Error("Function not implemented.");
//     },
//     search: function (regexp: string | RegExp): number {
//       throw new Error("Function not implemented.");
//     },
//     slice: function (start?: number, end?: number): string {
//       throw new Error("Function not implemented.");
//     },
//     split: function (separator: string | RegExp, limit?: number): string[] {
//       throw new Error("Function not implemented.");
//     },
//     substring: function (start: number, end?: number): string {
//       throw new Error("Function not implemented.");
//     },
//     toLowerCase: function (): string {
//       throw new Error("Function not implemented.");
//     },
//     toLocaleLowerCase: function (locales?: string | string[]): string {
//       throw new Error("Function not implemented.");
//     },
//     toUpperCase: function (): string {
//       throw new Error("Function not implemented.");
//     },
//     toLocaleUpperCase: function (locales?: string | string[]): string {
//       throw new Error("Function not implemented.");
//     },
//     trim: function (): string {
//       throw new Error("Function not implemented.");
//     },
//     length: 0,
//     substr: function (from: number, length?: number): string {
//       throw new Error("Function not implemented.");
//     },
//     codePointAt: function (pos: number): number | undefined {
//       throw new Error("Function not implemented.");
//     },
//     includes: function (searchString: string, position?: number): boolean {
//       throw new Error("Function not implemented.");
//     },
//     endsWith: function (searchString: string, endPosition?: number): boolean {
//       throw new Error("Function not implemented.");
//     },
//     normalize: function (form: "NFC" | "NFD" | "NFKC" | "NFKD"): string {
//       throw new Error("Function not implemented.");
//     },
//     repeat: function (count: number): string {
//       throw new Error("Function not implemented.");
//     },
//     startsWith: function (searchString: string, position?: number): boolean {
//       throw new Error("Function not implemented.");
//     },
//     anchor: function (name: string): string {
//       throw new Error("Function not implemented.");
//     },
//     big: function (): string {
//       throw new Error("Function not implemented.");
//     },
//     blink: function (): string {
//       throw new Error("Function not implemented.");
//     },
//     bold: function (): string {
//       throw new Error("Function not implemented.");
//     },
//     fixed: function (): string {
//       throw new Error("Function not implemented.");
//     },
//     fontcolor: function (color: string): string {
//       throw new Error("Function not implemented.");
//     },
//     fontsize: function (size: number): string {
//       throw new Error("Function not implemented.");
//     },
//     italics: function (): string {
//       throw new Error("Function not implemented.");
//     },
//     link: function (url: string): string {
//       throw new Error("Function not implemented.");
//     },
//     small: function (): string {
//       throw new Error("Function not implemented.");
//     },
//     strike: function (): string {
//       throw new Error("Function not implemented.");
//     },
//     sub: function (): string {
//       throw new Error("Function not implemented.");
//     },
//     sup: function (): string {
//       throw new Error("Function not implemented.");
//     },
//     padStart: function (maxLength: number, fillString?: string): string {
//       throw new Error("Function not implemented.");
//     },
//     padEnd: function (maxLength: number, fillString?: string): string {
//       throw new Error("Function not implemented.");
//     },
//     trimEnd: function (): string {
//       throw new Error("Function not implemented.");
//     },
//     trimStart: function (): string {
//       throw new Error("Function not implemented.");
//     },
//     trimLeft: function (): string {
//       throw new Error("Function not implemented.");
//     },
//     trimRight: function (): string {
//       throw new Error("Function not implemented.");
//     },
//     matchAll: function (regexp: RegExp): RegExpStringIterator<RegExpExecArray> {
//       throw new Error("Function not implemented.");
//     },
//     replaceAll: function (searchValue: string | RegExp, replaceValue: string): string {
//       throw new Error("Function not implemented.");
//     },
//     at: function (index: number): string | undefined {
//       throw new Error("Function not implemented.");
//     },
//     isWellFormed: function (): boolean {
//       throw new Error("Function not implemented.");
//     },
//     toWellFormed: function (): string {
//       throw new Error("Function not implemented.");
//     },
//     [Symbol.iterator]: function (): StringIterator<string> {
//       throw new Error("Function not implemented.");
//     }
//   });

//   return NextResponse.json({
//     success: result.success,
//     message: result.success
//       ? `Sample alert email sent to ${to}`
//       : `Failed: ${result.error}`,
//   });
// }
