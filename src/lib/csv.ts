// ============================================================================
// CSV helpers — csvRow/formatISTForCSV are used server-side by the export
// route; downloadBlob is browser-only.
// ============================================================================

type Cell = string | number | null | undefined;

function escapeCell(value: Cell): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  // Quote only when needed so the file stays readable in a text editor.
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** One CSV line, including its trailing CRLF. */
export function csvRow(cells: Cell[]): string {
  return cells.map(escapeCell).join(",") + "\r\n";
}

// Prepended to the file so Excel reads it as UTF-8 and units like °C survive.
export const CSV_BOM = "﻿";

// "2026-10-17 14:32:05" in IST — sortable, and Excel parses it as a date.
export function formatISTForCSV(ts: string | Date): string {
  const ist = new Date(new Date(ts).getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 19).replace("T", " ");
}

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
