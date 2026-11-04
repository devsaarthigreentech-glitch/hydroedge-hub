"use client";

// Admin page: upload a NanoV3 .bin once, then update devices from their Firmware
// tab. The server checks the image and works out its version, size and SHA-256.

import React, { useState, useEffect, useCallback, useRef } from "react";

interface Firmware {
  id: string; version: string; sha256: string; size_bytes: number; url: string; source_name: string | null;
  notes: string | null; uploaded_by: string | null; uploaded_at: string;
  fetch_count: number; last_fetch_at: string | null;
}

const MUTED = "#64748b";
const fmtMB = (b: number) => `${(b / 1024 / 1024).toFixed(2)} MB`;
const fmtT = (t: string) => new Date(t).toLocaleString();

export function FirmwarePage() {
  const [list, setList] = useState<Firmware[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [version, setVersion] = useState("");
  const [needsVersion, setNeedsVersion] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/nano/firmware");
      const d = await res.json();
      if (d.success) { setList(d.data); setLoadErr(null); }
      else setLoadErr(d.error || "Could not load versions");
    } catch {
      setLoadErr("Network error");
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const upload = async () => {
    if (!file) return;
    setBusy(true);
    setMsg(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("notes", notes);
      if (version.trim()) form.append("version", version.trim());
      const res = await fetch("/api/nano/firmware", { method: "POST", body: form });
      if (res.status === 413) { setMsg({ ok: false, text: "The server refused a file this size: raise client_max_body_size in nginx (see FIRMWARE.md)." }); return; }
      const d = await res.json();
      if (!d.success) {
        setNeedsVersion(!!d.needsVersion);
        setMsg({ ok: false, text: d.error || "Upload failed" });
        return;
      }
      setMsg({ ok: true, text: d.duplicate ? `${d.version} is already uploaded (same image).` : `Uploaded ${d.version}.` });
      setFile(null); setNotes(""); setVersion(""); setNeedsVersion(false);
      if (input.current) input.current.value = "";
      load();
    } catch {
      setMsg({ ok: false, text: "Upload failed: network error" });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (f: Firmware) => {
    if (!window.confirm(`Delete firmware ${f.version}? Devices can no longer be updated to it.`)) return;
    const res = await fetch(`/api/nano/firmware?id=${f.id}`, { method: "DELETE" });
    const d = await res.json();
    if (!d.success) setMsg({ ok: false, text: d.error || "Delete failed" });
    load();
  };

  const field = { background: "#fff", border: "1px solid #cbd5e1", borderRadius: 6, padding: "8px 10px", fontSize: 13, color: "#0f172a", fontFamily: "inherit", outline: "none" } as const;

  return (
    <div style={{ padding: 24, background: "#f8fafc", minHeight: "100%" }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>Firmware</div>
      <div style={{ fontSize: 12, color: MUTED, marginTop: 4, marginBottom: 20, lineHeight: 1.6, maxWidth: 760 }}>
        Upload the app image from a NanoV3 build (<code>build/nano_v3.bin</code>) once. Then open a device, go to its Firmware tab and press Update.
        Version, size and SHA-256 come from the file itself.
      </div>

      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 12 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: MUTED }}>
          Firmware image (.bin)
          <input ref={input} type="file" accept=".bin" onChange={(e) => { setFile(e.target.files?.[0] || null); setMsg(null); setNeedsVersion(false); }} style={{ fontSize: 12 }} />
        </label>
        {needsVersion && (
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: MUTED }}>
            Version
            <input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="3.0.1" style={{ ...field, width: 100 }} />
          </label>
        )}
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: MUTED, flex: 1, minWidth: 220 }}>
          Note
          <input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} placeholder="What changed in this version" style={field} />
        </label>
        <button onClick={upload} disabled={!file || busy}
          style={{ background: "#16a34a", border: "none", borderRadius: 6, padding: "9px 20px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: !file || busy ? "default" : "pointer", opacity: !file || busy ? 0.5 : 1, fontFamily: "inherit" }}>
          {busy ? "Uploading…" : "Upload"}
        </button>
      </div>
      {msg && <div style={{ fontSize: 12, marginBottom: 12, color: msg.ok ? "#15803d" : "#b91c1c" }}>{msg.text}</div>}
      {loadErr && <div style={{ fontSize: 12, marginBottom: 12, color: "#b91c1c" }}>{loadErr}</div>}

      {list.length === 0 && !loadErr && <div style={{ padding: 30, textAlign: "center", color: MUTED, fontSize: 12 }}>No firmware uploaded yet.</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {list.map((f) => (
          <div key={f.id} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 16px", display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", minWidth: 60 }}>{f.version}</div>
            <div style={{ flex: 1, minWidth: 240 }}>
              {f.notes && <div style={{ fontSize: 13, color: "#334155", marginBottom: 3 }}>{f.notes}</div>}
              <div style={{ fontSize: 11, color: MUTED }}>
                {fmtMB(f.size_bytes)} · {fmtT(f.uploaded_at)}{f.uploaded_by ? ` · ${f.uploaded_by}` : ""}
                {" · "}{f.fetch_count ? `fetched ${f.fetch_count}× (last ${fmtT(f.last_fetch_at!)})` : "not fetched yet"}
              </div>
              <div style={{ fontSize: 10, color: "#94a3b8", fontFamily: "monospace", marginTop: 3, overflowWrap: "anywhere" }} title="SHA-256">{f.sha256}</div>
            </div>
            <button onClick={() => remove(f)} style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: 6, padding: "5px 10px", color: "#b91c1c", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
