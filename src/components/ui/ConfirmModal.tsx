"use client";

import React from "react";

// Theme-styled confirmation modal — replaces the browser's window.confirm.
// Works on both light and dark tab bodies (self-contained overlay).

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

export function ConfirmModal({
  open,
  options,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  options: ConfirmOptions | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open || !options) return null;
  const danger = options.danger;

  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed", inset: 0, zIndex: 3000,
        background: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 420, background: "#1e1e1e",
          border: "1px solid #333", borderRadius: 14,
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)", overflow: "hidden",
          fontFamily: "inherit", color: "#e2e8f0",
        }}
      >
        <div style={{ padding: "18px 20px 0", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 9, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
            background: danger ? "rgba(248,113,113,0.12)" : "rgba(124,58,237,0.14)",
          }}>
            {danger ? "⚠️" : "❔"}
          </div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{options.title}</div>
        </div>

        <div style={{ padding: "12px 20px 20px 68px", fontSize: 13, color: "#9ca3af", lineHeight: 1.5 }}>
          {options.message}
        </div>

        <div style={{ padding: "14px 20px", background: "#181818", borderTop: "1px solid #2a2a2a", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            onClick={onCancel}
            style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid #333", background: "transparent", color: "#cbd5e1", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
          >
            {options.cancelLabel || "Cancel"}
          </button>
          <button
            onClick={onConfirm}
            autoFocus
            style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: danger ? "#ef4444" : "#7c3aed", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
          >
            {options.confirmLabel || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Small hook so a tab can await a confirmation like window.confirm, but themed.
export function useConfirm() {
  const [open, setOpen] = React.useState(false);
  const [options, setOptions] = React.useState<ConfirmOptions | null>(null);
  const resolver = React.useRef<((v: boolean) => void) | null>(null);

  const confirm = React.useCallback((opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts);
    setOpen(true);
    return new Promise<boolean>((resolve) => { resolver.current = resolve; });
  }, []);

  const handle = (v: boolean) => { setOpen(false); resolver.current?.(v); resolver.current = null; };

  const modal = (
    <ConfirmModal open={open} options={options} onConfirm={() => handle(true)} onCancel={() => handle(false)} />
  );

  return { confirm, modal };
}