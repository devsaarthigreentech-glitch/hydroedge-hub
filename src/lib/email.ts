// // // import nodemailer from "nodemailer";

// // // // ============================================================================
// // // // Email transporter — configured once, reused for all sends
// // // // ============================================================================

// // // const transporter = nodemailer.createTransport({
// // //   service: "gmail",
// // //   auth: {
// // //     user: process.env.GMAIL_USER || "",
// // //     pass: process.env.GMAIL_APP_PASSWORD || "",
// // //   },
// // // });

// // // const FROM_ADDRESS = process.env.GMAIL_FROM || process.env.GMAIL_USER || "";
// // // const FROM_NAME = "SGT Hydroedge Alerts";

// // // // ============================================================================
// // // // Send an alert email
// // // // ============================================================================

// // // export interface AlertEmailData {
// // //   to: string;
// // //   contactName: string;
// // //   customerName: string;
// // //   severity: "critical" | "warning";
// // //   systemName: string;        // "GreenX" or "GreenDrive"
// // //   message: string;
// // //   action: string;
// // //   deviceName: string;
// // //   deviceImei: string;
// // //   deviceModel: string;
// // //   timestamp: string;
// // // }

// // // export async function sendAlertEmail(data: AlertEmailData): Promise<{ success: boolean; error?: string }> {
// // //   if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
// // //     return { success: false, error: "GMAIL_USER and GMAIL_APP_PASSWORD not configured in .env.local" };
// // //   }

// // //   const subject = `${data.severity === "critical" ? "🔴 CRITICAL" : "🟡 WARNING"} ${data.systemName} Alert — ${data.deviceName}`;

// // //   try {
// // //     await transporter.sendMail({
// // //       from: `"${FROM_NAME}" <${FROM_ADDRESS}>`,
// // //       to: data.to,
// // //       subject,
// // //       html: buildAlertHtml(data),
// // //     });
// // //     return { success: true };
// // //   } catch (err: any) {
// // //     console.error("[EMAIL ERROR]", err.message);
// // //     return { success: false, error: err.message };
// // //   }
// // // }

// // // // ============================================================================
// // // // Send a test email (for verifying setup)
// // // // ============================================================================

// // // export async function sendTestEmail(to: string): Promise<{ success: boolean; error?: string }> {
// // //   if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
// // //     return { success: false, error: "GMAIL_USER and GMAIL_APP_PASSWORD not configured" };
// // //   }

// // //   try {
// // //     await transporter.sendMail({
// // //       from: `"${FROM_NAME}" <${FROM_ADDRESS}>`,
// // //       to,
// // //       subject: "✅ SGT Hydroedge — Email Notifications Working",
// // //       html: `
// // //         <div style="font-family: -apple-system, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px;">
// // //           <div style="background: #f0fdf4; border: 2px solid #86efac; border-radius: 12px; padding: 24px; text-align: center;">
// // //             <div style="font-size: 48px; margin-bottom: 12px;">✅</div>
// // //             <div style="font-size: 18px; font-weight: 700; color: #15803d; margin-bottom: 8px;">
// // //               Email Setup Successful
// // //             </div>
// // //             <div style="font-size: 13px; color: #166534;">
// // //               Alert notifications from SGT Hydroedge are working correctly.
// // //             </div>
// // //             <div style="font-size: 11px; color: #6b7280; margin-top: 16px;">
// // //               Sent at ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST
// // //             </div>
// // //           </div>
// // //         </div>
// // //       `,
// // //     });
// // //     return { success: true };
// // //   } catch (err: any) {
// // //     return { success: false, error: err.message };
// // //   }
// // // }

// // // // ============================================================================
// // // // HTML email template
// // // // ============================================================================

// // // function buildAlertHtml(data: AlertEmailData): string {
// // //   const isCritical = data.severity === "critical";
// // //   const headerBg = isCritical ? "#dc2626" : "#d97706";
// // //   const alertBg = isCritical ? "#fef2f2" : "#fffbeb";
// // //   const alertBorder = isCritical ? "#fecaca" : "#fde68a";
// // //   const alertTextColor = isCritical ? "#991b1b" : "#92400e";
// // //   const alertActionColor = isCritical ? "#b91c1c" : "#b45309";

// // //   return `
// // // <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">

// // //   <!-- Header -->
// // //   <div style="background: ${headerBg}; padding: 24px 32px; border-radius: 12px 12px 0 0;">
// // //     <h1 style="color: white; margin: 0; font-size: 20px; font-weight: 700;">
// // //       ${isCritical ? "🔴 CRITICAL ALERT" : "🟡 WARNING"}
// // //     </h1>
// // //     <p style="color: rgba(255,255,255,0.9); margin: 6px 0 0; font-size: 14px;">
// // //       ${data.systemName} System Health Monitor
// // //     </p>
// // //   </div>

// // //   <!-- Body -->
// // //   <div style="padding: 28px 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">

// // //     <p style="font-size: 15px; color: #111827; margin: 0 0 20px; line-height: 1.5;">
// // //       Hi ${data.contactName || data.customerName},
// // //     </p>

// // //     <!-- Alert box -->
// // //     <div style="background: ${alertBg}; border: 1px solid ${alertBorder}; border-radius: 10px; padding: 18px 20px; margin-bottom: 24px;">
// // //       <p style="font-size: 15px; font-weight: 600; color: ${alertTextColor}; margin: 0 0 6px;">
// // //         ${data.message}
// // //       </p>
// // //       <p style="font-size: 13px; color: ${alertActionColor}; margin: 0;">
// // //         → ${data.action}
// // //       </p>
// // //     </div>

// // //     <!-- Device details table -->
// // //     <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
// // //       <tr style="border-bottom: 1px solid #f3f4f6;">
// // //         <td style="padding: 10px 0; font-size: 12px; color: #9ca3af; font-weight: 600; text-transform: uppercase; width: 120px;">Device</td>
// // //         <td style="padding: 10px 0; font-size: 14px; color: #111827; font-weight: 500;">${data.deviceName}</td>
// // //       </tr>
// // //       <tr style="border-bottom: 1px solid #f3f4f6;">
// // //         <td style="padding: 10px 0; font-size: 12px; color: #9ca3af; font-weight: 600; text-transform: uppercase;">IMEI</td>
// // //         <td style="padding: 10px 0; font-size: 14px; color: #111827; font-family: monospace;">${data.deviceImei}</td>
// // //       </tr>
// // //       <tr style="border-bottom: 1px solid #f3f4f6;">
// // //         <td style="padding: 10px 0; font-size: 12px; color: #9ca3af; font-weight: 600; text-transform: uppercase;">Model</td>
// // //         <td style="padding: 10px 0; font-size: 14px; color: #111827;">${data.deviceModel}</td>
// // //       </tr>
// // //       <tr style="border-bottom: 1px solid #f3f4f6;">
// // //         <td style="padding: 10px 0; font-size: 12px; color: #9ca3af; font-weight: 600; text-transform: uppercase;">Customer</td>
// // //         <td style="padding: 10px 0; font-size: 14px; color: #111827;">${data.customerName}</td>
// // //       </tr>
// // //       <tr>
// // //         <td style="padding: 10px 0; font-size: 12px; color: #9ca3af; font-weight: 600; text-transform: uppercase;">Time</td>
// // //         <td style="padding: 10px 0; font-size: 14px; color: #111827;">${new Date(data.timestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</td>
// // //       </tr>
// // //     </table>

// // //     <p style="font-size: 12px; color: #9ca3af; margin: 20px 0 0; line-height: 1.5;">
// // //       This is an automated alert from the ${data.systemName} health monitoring system.<br>
// // //       SGT Hydroedge
// // //     </p>
// // //   </div>
// // // </div>`;
// // // }
// // import nodemailer from "nodemailer";

// // // ============================================================================
// // // Email transporter — configured once, reused for all sends
// // // ============================================================================

// // const transporter = nodemailer.createTransport({
// //   service: "gmail",
// //   auth: {
// //     user: process.env.GMAIL_USER || "",
// //     pass: process.env.GMAIL_APP_PASSWORD || "",
// //   },
// // });

// // const FROM_ADDRESS = process.env.GMAIL_FROM || process.env.GMAIL_USER || "";
// // const FROM_NAME = "SGT Hydroedge Alerts";

// // // Support team emails — always CC'd on every alert
// // const SUPPORT_EMAILS = (process.env.SUPPORT_EMAILS || "ajinkya@sgthydroedge.com,mangesh@sgthydroedge.com")
// //   .split(",")
// //   .map((e) => e.trim())
// //   .filter(Boolean);

// // // ============================================================================
// // // Send an alert email
// // // ============================================================================

// // export interface AlertEmailData {
// //   to: string[];              // customer user emails
// //   cc?: string[];             // support team (auto-added if not provided)
// //   contactName: string;
// //   customerName: string;
// //   severity: "critical" | "warning";
// //   systemName: string;
// //   message: string;
// //   action: string;
// //   deviceName: string;
// //   deviceImei: string;
// //   deviceModel: string;
// //   timestamp: string;
// // }

// // export async function sendAlertEmail(data: AlertEmailData): Promise<{
// //   success: boolean;
// //   sentTo: string[];
// //   ccTo: string[];
// //   error?: string;
// // }> {
// //   if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
// //     return { success: false, sentTo: [], ccTo: [], error: "GMAIL_USER and GMAIL_APP_PASSWORD not configured" };
// //   }

// //   // Deduplicate: remove any support emails that are already in the "to" list
// //   const toList = [...new Set(data.to.filter(Boolean))];
// //   const ccList = [...new Set(
// //     (data.cc || SUPPORT_EMAILS).filter((email) => !toList.includes(email) && email)
// //   )];

// //   if (toList.length === 0 && ccList.length === 0) {
// //     return { success: false, sentTo: [], ccTo: [], error: "No recipients" };
// //   }

// //   const subject = `${data.severity === "critical" ? "🔴 CRITICAL" : "🟡 WARNING"} ${data.systemName} Alert — ${data.deviceName}`;

// //   try {
// //     await transporter.sendMail({
// //       from: `"${FROM_NAME}" <${FROM_ADDRESS}>`,
// //       to: toList.join(", "),
// //       cc: ccList.length > 0 ? ccList.join(", ") : undefined,
// //       subject,
// //       html: buildAlertHtml(data),
// //     });
// //     return { success: true, sentTo: toList, ccTo: ccList };
// //   } catch (err: any) {
// //     console.error("[EMAIL ERROR]", err.message);
// //     return { success: false, sentTo: toList, ccTo: ccList, error: err.message };
// //   }
// // }

// // // ============================================================================
// // // Send a test email
// // // ============================================================================

// // export async function sendTestEmail(to: string): Promise<{ success: boolean; error?: string }> {
// //   if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
// //     return { success: false, error: "GMAIL_USER and GMAIL_APP_PASSWORD not configured" };
// //   }

// //   try {
// //     await transporter.sendMail({
// //       from: `"${FROM_NAME}" <${FROM_ADDRESS}>`,
// //       to,
// //       subject: "✅ SGT Hydroedge — Email Notifications Working",
// //       html: `
// //         <div style="font-family: -apple-system, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px;">
// //           <div style="background: #f0fdf4; border: 2px solid #86efac; border-radius: 12px; padding: 24px; text-align: center;">
// //             <div style="font-size: 48px; margin-bottom: 12px;">✅</div>
// //             <div style="font-size: 18px; font-weight: 700; color: #15803d; margin-bottom: 8px;">
// //               Email Setup Successful
// //             </div>
// //             <div style="font-size: 13px; color: #166534;">
// //               Alert notifications from SGT Hydroedge are working correctly.
// //             </div>
// //             <div style="font-size: 11px; color: #6b7280; margin-top: 16px;">
// //               From: ${FROM_ADDRESS}<br>
// //               Sent at ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST
// //             </div>
// //           </div>
// //         </div>
// //       `,
// //     });
// //     return { success: true };
// //   } catch (err: any) {
// //     return { success: false, error: err.message };
// //   }
// // }

// // // ============================================================================
// // // HTML email template
// // // ============================================================================

// // function buildAlertHtml(data: AlertEmailData): string {
// //   const isCritical = data.severity === "critical";
// //   const headerBg = isCritical ? "#dc2626" : "#d97706";
// //   const alertBg = isCritical ? "#fef2f2" : "#fffbeb";
// //   const alertBorder = isCritical ? "#fecaca" : "#fde68a";
// //   const alertTextColor = isCritical ? "#991b1b" : "#92400e";
// //   const alertActionColor = isCritical ? "#b91c1c" : "#b45309";

// //   return `
// // <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">

// //   <!-- Header -->
// //   <div style="background: ${headerBg}; padding: 24px 32px; border-radius: 12px 12px 0 0;">
// //     <h1 style="color: white; margin: 0; font-size: 20px; font-weight: 700;">
// //       ${isCritical ? "🔴 CRITICAL ALERT" : "🟡 WARNING"}
// //     </h1>
// //     <p style="color: rgba(255,255,255,0.9); margin: 6px 0 0; font-size: 14px;">
// //       ${data.systemName} System Health Monitor
// //     </p>
// //   </div>

// //   <!-- Body -->
// //   <div style="padding: 28px 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">

// //     <p style="font-size: 15px; color: #111827; margin: 0 0 20px; line-height: 1.5;">
// //       Hi ${data.contactName || data.customerName},
// //     </p>

// //     <!-- Alert box -->
// //     <div style="background: ${alertBg}; border: 1px solid ${alertBorder}; border-radius: 10px; padding: 18px 20px; margin-bottom: 24px;">
// //       <p style="font-size: 15px; font-weight: 600; color: ${alertTextColor}; margin: 0 0 6px;">
// //         ${data.message}
// //       </p>
// //       <p style="font-size: 13px; color: ${alertActionColor}; margin: 0;">
// //         → ${data.action}
// //       </p>
// //     </div>

// //     <!-- Device details table -->
// //     <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
// //       <tr style="border-bottom: 1px solid #f3f4f6;">
// //         <td style="padding: 10px 0; font-size: 12px; color: #9ca3af; font-weight: 600; text-transform: uppercase; width: 120px;">Device</td>
// //         <td style="padding: 10px 0; font-size: 14px; color: #111827; font-weight: 500;">${data.deviceName}</td>
// //       </tr>
// //       <tr style="border-bottom: 1px solid #f3f4f6;">
// //         <td style="padding: 10px 0; font-size: 12px; color: #9ca3af; font-weight: 600; text-transform: uppercase;">IMEI</td>
// //         <td style="padding: 10px 0; font-size: 14px; color: #111827; font-family: monospace;">${data.deviceImei}</td>
// //       </tr>
// //       <tr style="border-bottom: 1px solid #f3f4f6;">
// //         <td style="padding: 10px 0; font-size: 12px; color: #9ca3af; font-weight: 600; text-transform: uppercase;">Model</td>
// //         <td style="padding: 10px 0; font-size: 14px; color: #111827;">${data.deviceModel}</td>
// //       </tr>
// //       <tr style="border-bottom: 1px solid #f3f4f6;">
// //         <td style="padding: 10px 0; font-size: 12px; color: #9ca3af; font-weight: 600; text-transform: uppercase;">Customer</td>
// //         <td style="padding: 10px 0; font-size: 14px; color: #111827;">${data.customerName}</td>
// //       </tr>
// //       <tr>
// //         <td style="padding: 10px 0; font-size: 12px; color: #9ca3af; font-weight: 600; text-transform: uppercase;">Time</td>
// //         <td style="padding: 10px 0; font-size: 14px; color: #111827;">${new Date(data.timestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</td>
// //       </tr>
// //     </table>

// //     <p style="font-size: 12px; color: #9ca3af; margin: 20px 0 0; line-height: 1.5;">
// //       This is an automated alert from the ${data.systemName} health monitoring system.<br>
// //       SGT Hydroedge
// //     </p>
// //   </div>
// // </div>`;
// // }
// import nodemailer from "nodemailer";

// // ============================================================================
// // Email transporter — configured once, reused for all sends
// // ============================================================================

// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: process.env.GMAIL_USER || "",
//     pass: process.env.GMAIL_APP_PASSWORD || "",
//   },
// });

// const FROM_ADDRESS = process.env.GMAIL_FROM || process.env.GMAIL_USER || "";
// const FROM_NAME = "SGT Hydroedge Alerts";

// // Support team emails — always CC'd on every alert
// const SUPPORT_EMAILS = (process.env.SUPPORT_EMAILS || "ajinkya@sgthydroedge.com,mangesh@sgthydroedge.com")
//   .split(",")
//   .map((e) => e.trim())
//   .filter(Boolean);

// // ============================================================================
// // Send an alert email
// // ============================================================================

// export interface AlertEmailData {
//   to: string[];              // customer user emails
//   cc?: string[];             // support team (auto-added if not provided)
//   contactName: string;
//   customerName: string;
//   severity: "critical" | "warning";
//   systemName: string;
//   message: string;
//   action: string;
//   deviceName: string;
//   deviceImei: string;
//   deviceModel: string;
//   timestamp: string;
// }

// export async function sendAlertEmail(data: AlertEmailData): Promise<{
//   success: boolean;
//   sentTo: string[];
//   ccTo: string[];
//   error?: string;
// }> {
//   if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
//     return { success: false, sentTo: [], ccTo: [], error: "GMAIL_USER and GMAIL_APP_PASSWORD not configured" };
//   }

//   // Deduplicate: remove any support emails that are already in the "to" list
//   const toList = [...new Set(data.to.filter(Boolean))];
//   const ccList = [...new Set(
//     (data.cc || SUPPORT_EMAILS).filter((email) => !toList.includes(email) && email)
//   )];

//   if (toList.length === 0 && ccList.length === 0) {
//     return { success: false, sentTo: [], ccTo: [], error: "No recipients" };
//   }

//   const subject = `${data.severity === "critical" ? "🔴 CRITICAL" : "🟡 WARNING"} ${data.systemName} Alert — ${data.deviceName}`;

//   try {
//     await transporter.sendMail({
//       from: `"${FROM_NAME}" <${FROM_ADDRESS}>`,
//       to: toList.join(", "),
//       cc: ccList.length > 0 ? ccList.join(", ") : undefined,
//       subject,
//       html: buildAlertHtml(data),
//     });
//     return { success: true, sentTo: toList, ccTo: ccList };
//   } catch (err: any) {
//     console.error("[EMAIL ERROR]", err.message);
//     return { success: false, sentTo: toList, ccTo: ccList, error: err.message };
//   }
// }

// // ============================================================================
// // Send a test email
// // ============================================================================

// export async function sendTestEmail(to: string): Promise<{ success: boolean; error?: string }> {
//   if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
//     return { success: false, error: "GMAIL_USER and GMAIL_APP_PASSWORD not configured" };
//   }

//   try {
//     await transporter.sendMail({
//       from: `"${FROM_NAME}" <${FROM_ADDRESS}>`,
//       to,
//       subject: "✅ SGT Hydroedge — Email Notifications Working",
//       html: `
//         <div style="font-family: -apple-system, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px;">
//           <div style="background: #f0fdf4; border: 2px solid #86efac; border-radius: 12px; padding: 24px; text-align: center;">
//             <div style="font-size: 48px; margin-bottom: 12px;">✅</div>
//             <div style="font-size: 18px; font-weight: 700; color: #15803d; margin-bottom: 8px;">
//               Email Setup Successful
//             </div>
//             <div style="font-size: 13px; color: #166534;">
//               Alert notifications from SGT Hydroedge are working correctly.
//             </div>
//             <div style="font-size: 11px; color: #6b7280; margin-top: 16px;">
//               From: ${FROM_ADDRESS}<br>
//               Sent at ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST
//             </div>
//           </div>
//         </div>
//       `,
//     });
//     return { success: true };
//   } catch (err: any) {
//     return { success: false, error: err.message };
//   }
// }

// // ============================================================================
// // HTML email template
// // ============================================================================

// function buildAlertHtml(data: AlertEmailData): string {
//   const isCritical = data.severity === "critical";
//   const headerBg = isCritical ? "#dc2626" : "#d97706";
//   const alertBg = isCritical ? "#fef2f2" : "#fffbeb";
//   const alertBorder = isCritical ? "#fecaca" : "#fde68a";
//   const alertTextColor = isCritical ? "#991b1b" : "#92400e";
//   const alertActionColor = isCritical ? "#b91c1c" : "#b45309";

//   return `
// <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">

//   <!-- Header -->
//   <div style="background: ${headerBg}; padding: 24px 32px; border-radius: 12px 12px 0 0;">
//     <h1 style="color: white; margin: 0; font-size: 20px; font-weight: 700;">
//       ${isCritical ? "🔴 CRITICAL ALERT" : "🟡 WARNING"}
//     </h1>
//     <p style="color: rgba(255,255,255,0.9); margin: 6px 0 0; font-size: 14px;">
//       ${data.systemName} System Health Monitor
//     </p>
//   </div>

//   <!-- Body -->
//   <div style="padding: 28px 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">

//     <p style="font-size: 15px; color: #111827; margin: 0 0 20px; line-height: 1.5;">
//       Hi ${data.contactName || data.customerName},
//     </p>

//     <!-- Alert box -->
//     <div style="background: ${alertBg}; border: 1px solid ${alertBorder}; border-radius: 10px; padding: 18px 20px; margin-bottom: 24px;">
//       <p style="font-size: 15px; font-weight: 600; color: ${alertTextColor}; margin: 0 0 6px;">
//         ${data.message}
//       </p>
//       <p style="font-size: 13px; color: ${alertActionColor}; margin: 0;">
//         → ${data.action}
//       </p>
//     </div>

//     <!-- Device details table -->
//     <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
//       <tr style="border-bottom: 1px solid #f3f4f6;">
//         <td style="padding: 10px 0; font-size: 12px; color: #9ca3af; font-weight: 600; text-transform: uppercase; width: 120px;">Device</td>
//         <td style="padding: 10px 0; font-size: 14px; color: #111827; font-weight: 500;">${data.deviceName}</td>
//       </tr>
//       <tr style="border-bottom: 1px solid #f3f4f6;">
//         <td style="padding: 10px 0; font-size: 12px; color: #9ca3af; font-weight: 600; text-transform: uppercase;">IMEI</td>
//         <td style="padding: 10px 0; font-size: 14px; color: #111827; font-family: monospace;">${data.deviceImei}</td>
//       </tr>
//       <tr style="border-bottom: 1px solid #f3f4f6;">
//         <td style="padding: 10px 0; font-size: 12px; color: #9ca3af; font-weight: 600; text-transform: uppercase;">Model</td>
//         <td style="padding: 10px 0; font-size: 14px; color: #111827;">${data.deviceModel}</td>
//       </tr>
//       <tr style="border-bottom: 1px solid #f3f4f6;">
//         <td style="padding: 10px 0; font-size: 12px; color: #9ca3af; font-weight: 600; text-transform: uppercase;">Customer</td>
//         <td style="padding: 10px 0; font-size: 14px; color: #111827;">${data.customerName}</td>
//       </tr>
//       <tr>
//         <td style="padding: 10px 0; font-size: 12px; color: #9ca3af; font-weight: 600; text-transform: uppercase;">Time</td>
//         <td style="padding: 10px 0; font-size: 14px; color: #111827;">${new Date(data.timestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</td>
//       </tr>
//     </table>

//     <p style="font-size: 12px; color: #9ca3af; margin: 20px 0 0; line-height: 1.5;">
//       This is an automated alert from the ${data.systemName} health monitoring system.<br>
//       SGT Hydroedge
//     </p>
//   </div>
// </div>`;
// }
import nodemailer from "nodemailer";

// ============================================================================
// Email transporter
// ============================================================================

// The relay is configurable because the standard mail ports are not reliably
// reachable from this host. DigitalOcean blocks outbound 25, 465 and 587 —
// Gmail, Brevo and SendGrid all time out at the TCP level — while 2525 is open.
// That block has come and gone twice (Jun 22, then Aug 14 onward, three weeks
// of silent failure), so hard-coding Gmail on 587 is not something to go back
// to even if it starts working again.
//
// SMTP_* wins. The GMAIL_* names remain as fallbacks so an existing .env.local
// keeps working untouched, and so Gmail stays available wherever it is usable.
const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587", 10);
const SMTP_USER = process.env.SMTP_USER || process.env.GMAIL_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || "";

export const smtpConfigured = !!SMTP_USER && !!SMTP_PASS;

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  // 465 is implicit TLS. 587 and 2525 open in the clear and upgrade, so make
  // the upgrade mandatory — credentials must never cross unencrypted.
  secure: SMTP_PORT === 465,
  requireTLS: SMTP_PORT !== 465,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
  // Fail in seconds rather than hanging the whole scan when the port is blocked.
  connectionTimeout: 15_000,
  greetingTimeout: 15_000,
});

const FROM_ADDRESS = process.env.SMTP_FROM || process.env.GMAIL_FROM || SMTP_USER;
const FROM_NAME = "SGT Hydroedge Alerts";

// Support team — always CC'd
const SUPPORT_EMAILS = (process.env.SUPPORT_EMAILS || "ajinkya@sgthydroedge.com,mangesh@sgthydroedge.com")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);

// ============================================================================
// Types
// ============================================================================

export interface DeviceAlert {
  deviceName: string;
  deviceImei: string;
  deviceModel: string;
  severity: "critical" | "warning";
  message: string;
  action: string;
}

export interface BatchAlertEmailData {
  to: string[];
  cc?: string[];
  contactName: string;
  customerName: string;
  alerts: DeviceAlert[];
  timestamp: string;
  /**
   * "digest"    — the once-a-day roundup for this company (the default).
   * "immediate" — an urgent alert that bypassed the roundup and was sent on
   *               detection. Worth saying so in the email, otherwise a customer
   *               who expects one message a morning has no way to tell that
   *               this one arriving at 3am means something different.
   */
  dispatchKind?: "digest" | "immediate";
}

// ============================================================================
// Send a batched alert email (one email, all alerts for a customer)
// ============================================================================

export async function sendBatchAlertEmail(data: BatchAlertEmailData): Promise<{
  success: boolean;
  sentTo: string[];
  ccTo: string[];
  error?: string;
}> {
  if (!smtpConfigured) {
    return { success: false, sentTo: [], ccTo: [], error: "SMTP_USER and SMTP_PASS (or GMAIL_USER / GMAIL_APP_PASSWORD) not configured" };
  }

  const toList = [...new Set(data.to.filter(Boolean))];
  const ccList = [...new Set(
    (data.cc || SUPPORT_EMAILS).filter((email) => !toList.includes(email) && email)
  )];

  if (toList.length === 0 && ccList.length === 0) {
    return { success: false, sentTo: [], ccTo: [], error: "No recipients" };
  }

  const critCount = data.alerts.filter((a) => a.severity === "critical").length;
  const warnCount = data.alerts.filter((a) => a.severity === "warning").length;
  const deviceCount = new Set(data.alerts.map((a) => a.deviceImei)).size;

  // Subject line summarizes the batch. An urgent send is marked so it stands
  // out from the daily roundup in a crowded inbox.
  const isImmediate = data.dispatchKind === "immediate";
  const subject = isImmediate
    ? `🚨 URGENT — ${data.alerts[0]?.message || "Critical alert"} — ${data.customerName}`
    : critCount > 0
    ? `🔴 ${critCount} Critical Alert${critCount > 1 ? "s" : ""}${warnCount > 0 ? ` + ${warnCount} Warning${warnCount > 1 ? "s" : ""}` : ""} — ${data.customerName}`
    : `🟡 ${warnCount} Warning${warnCount > 1 ? "s" : ""} — ${data.customerName}`;

  try {
    await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_ADDRESS}>`,
      to: toList.join(", "),
      cc: ccList.length > 0 ? ccList.join(", ") : undefined,
      subject,
      html: buildBatchAlertHtml(data, critCount, warnCount, deviceCount),
    });
    return { success: true, sentTo: toList, ccTo: ccList };
  } catch (err: any) {
    console.error("[EMAIL ERROR]", err.message);
    return { success: false, sentTo: toList, ccTo: ccList, error: err.message };
  }
}

// ============================================================================
// Send an arbitrary HTML email through the same transporter
// ----------------------------------------------------------------------------
// Used by the weekly customer report (src/lib/weekly-report.ts), which builds
// its own HTML. Recipient handling is identical to the alert batch: the To
// list is de-duplicated, and support is CC'd unless the caller passes its own
// cc list (an empty array means "no CC", which is what test mode wants).
// ============================================================================

export interface HtmlEmailData {
  to: string[];
  cc?: string[];
  subject: string;
  html: string;
  /** Display name for the From header. Defaults to the alerts sender name. */
  fromName?: string;
}

export async function sendHtmlEmail(data: HtmlEmailData): Promise<{
  success: boolean;
  sentTo: string[];
  ccTo: string[];
  error?: string;
}> {
  if (!smtpConfigured) {
    return { success: false, sentTo: [], ccTo: [], error: "SMTP_USER and SMTP_PASS (or GMAIL_USER / GMAIL_APP_PASSWORD) not configured" };
  }

  const toList = [...new Set(data.to.filter(Boolean))];
  const ccList = [...new Set(
    (data.cc || SUPPORT_EMAILS).filter((email) => !toList.includes(email) && email)
  )];

  if (toList.length === 0 && ccList.length === 0) {
    return { success: false, sentTo: [], ccTo: [], error: "No recipients" };
  }

  try {
    await transporter.sendMail({
      from: `"${data.fromName || FROM_NAME}" <${FROM_ADDRESS}>`,
      to: toList.join(", "),
      cc: ccList.length > 0 ? ccList.join(", ") : undefined,
      subject: data.subject,
      html: data.html,
    });
    return { success: true, sentTo: toList, ccTo: ccList };
  } catch (err: any) {
    console.error("[EMAIL ERROR]", err.message);
    return { success: false, sentTo: toList, ccTo: ccList, error: err.message };
  }
}

// ============================================================================
// Send test email (unchanged)
// ============================================================================

export async function sendTestEmail(to: string): Promise<{ success: boolean; error?: string }> {
  if (!smtpConfigured) {
    return { success: false, error: "SMTP_USER and SMTP_PASS (or GMAIL_USER / GMAIL_APP_PASSWORD) not configured" };
  }

  try {
    await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_ADDRESS}>`,
      to,
      subject: "✅ SGT Hydroedge — Email Notifications Working",
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px;">
          <div style="background: #f0fdf4; border: 2px solid #86efac; border-radius: 12px; padding: 24px; text-align: center;">
            <div style="font-size: 48px; margin-bottom: 12px;">✅</div>
            <div style="font-size: 18px; font-weight: 700; color: #15803d; margin-bottom: 8px;">Email Setup Successful</div>
            <div style="font-size: 13px; color: #166534;">Alert notifications from SGT Hydroedge are working correctly.</div>
            <div style="font-size: 11px; color: #6b7280; margin-top: 16px;">
              From: ${FROM_ADDRESS}<br>
              Sent at ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST
            </div>
          </div>
        </div>
      `,
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ============================================================================
// HTML template — batch alert email
// ============================================================================

function buildBatchAlertHtml(
  data: BatchAlertEmailData,
  critCount: number,
  warnCount: number,
  deviceCount: number
): string {
  const isImmediate = data.dispatchKind === "immediate";
  const hasCritical = critCount > 0;
  // An urgent send always reads red, whatever the severity mix underneath it.
  const headerBg = isImmediate || hasCritical ? "#dc2626" : "#d97706";

  // Group alerts by device
  const byDevice: Record<string, DeviceAlert[]> = {};
  for (const alert of data.alerts) {
    const key = alert.deviceImei;
    if (!byDevice[key]) byDevice[key] = [];
    byDevice[key].push(alert);
  }

  // Build alert rows HTML
  const alertRowsHtml = Object.entries(byDevice)
    .map(([imei, alerts]) => {
      const device = alerts[0];
      const systemName = device.deviceModel === "EOW" ? "GreenDrive" : "GreenX";

      const alertItemsHtml = alerts
        .map((a) => {
          const isCrit = a.severity === "critical";
          return `
            <div style="background: ${isCrit ? "#fef2f2" : "#fffbeb"}; border: 1px solid ${isCrit ? "#fecaca" : "#fde68a"}; border-radius: 8px; padding: 12px 14px; margin-bottom: 6px;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <span style="font-size: 8px; font-weight: 700; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; background: ${isCrit ? "#dc2626" : "#d97706"}; color: white;">
                  ${a.severity}
                </span>
              </div>
              <div style="font-size: 14px; font-weight: 600; color: ${isCrit ? "#991b1b" : "#92400e"}; margin-bottom: 3px;">
                ${a.message}
              </div>
              <div style="font-size: 12px; color: ${isCrit ? "#b91c1c" : "#b45309"};">
                → ${a.action}
              </div>
            </div>
          `;
        })
        .join("");

      return `
        <div style="margin-bottom: 20px; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden;">
          <!-- Device header -->
          <div style="background: #f8fafc; padding: 12px 16px; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center;">
            <div style="flex: 1;">
              <div style="font-size: 14px; font-weight: 700; color: #0f172a;">${device.deviceName}</div>
              <div style="font-size: 11px; color: #64748b; margin-top: 2px; font-family: monospace;">${imei}</div>
            </div>
            <div style="text-align: right;">
              <span style="font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 4px; background: ${device.deviceModel === "EOW" ? "#fff7ed" : "#eff6ff"}; color: ${device.deviceModel === "EOW" ? "#c2410c" : "#1d4ed8"}; border: 1px solid ${device.deviceModel === "EOW" ? "#fed7aa" : "#bfdbfe"};">
                ${systemName} · ${device.deviceModel}
              </span>
            </div>
          </div>
          <!-- Alerts for this device -->
          <div style="padding: 12px 16px;">
            ${alertItemsHtml}
          </div>
        </div>
      `;
    })
    .join("");

  // Summary line
  const summaryParts: string[] = [];
  if (critCount > 0) summaryParts.push(`${critCount} critical`);
  if (warnCount > 0) summaryParts.push(`${warnCount} warning${warnCount > 1 ? "s" : ""}`);

  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 620px; margin: 0 auto; background: #ffffff;">

  <!-- Header -->
  <div style="background: ${headerBg}; padding: 24px 28px; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 20px; font-weight: 700;">
      ${isImmediate ? "🚨 Urgent Alert" : `${hasCritical ? "🔴" : "🟡"} Daily System Health Summary`}
    </h1>
    <p style="color: rgba(255,255,255,0.9); margin: 6px 0 0; font-size: 13px;">
      ${summaryParts.join(" + ")} across ${deviceCount} device${deviceCount > 1 ? "s" : ""} · ${data.customerName}
    </p>
  </div>

  <!-- Body -->
  <div style="padding: 24px 28px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">

    <p style="font-size: 14px; color: #111827; margin: 0 0 20px; line-height: 1.5;">
      Hi ${data.contactName || data.customerName},
    </p>

    <p style="font-size: 13px; color: #4b5563; margin: 0 0 20px; line-height: 1.5;">
      ${isImmediate
        ? `This needs attention now and has been sent ahead of your daily summary. Detected at
           <strong>${new Date(data.timestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</strong>:`
        : `Here is the current status of your devices as of
           <strong>${new Date(data.timestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</strong>:`}
    </p>

    <!-- Alert cards grouped by device -->
    ${alertRowsHtml}

    <!-- Footer -->
    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
      <p style="font-size: 11px; color: #9ca3af; margin: 0; line-height: 1.6;">
        This is an automated alert from the SGT Hydroedge health monitoring system.<br>
        ${isImmediate
          ? "Urgent faults are sent as soon as they are detected. Everything else arrives in one daily summary."
          : "You receive one summary a day listing every device that currently needs attention. Urgent faults are sent separately, as soon as they are detected."}
      </p>
    </div>
  </div>
</div>`;
}