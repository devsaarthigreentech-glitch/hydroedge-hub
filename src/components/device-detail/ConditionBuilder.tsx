"use client";

// ============================================================================
// Condition builder for the Logs & Messages tab
// ----------------------------------------------------------------------------
// Lets a user build "ain.1 < 0.2 && din.1 == true" from dropdowns instead of
// typing it. The expression line underneath is read-only: it shows what the
// rows mean, in the same notation an engineer would write.
// ============================================================================

import React from "react";
import { THEME } from "@/lib/theme";
import { COMMON_PARAMS, MAX_CONDITIONS, getParam } from "@/lib/io-params";
import type { ConditionOp, MatchMode } from "@/lib/io-logs-query";

export interface ConditionDraft {
  id: number;
  ioId: number | null;
  op: ConditionOp;
  value: string;    // display units; "1"/"0" for ON/OFF parameters
  value2: string;   // upper bound, "is between" only
}

const NUMBER_OPS: { op: ConditionOp; label: string; symbol: string }[] = [
  { op: "lt", label: "is less than", symbol: "<" },
  { op: "lte", label: "is at most", symbol: "<=" },
  { op: "gt", label: "is more than", symbol: ">" },
  { op: "gte", label: "is at least", symbol: ">=" },
  { op: "eq", label: "is exactly", symbol: "==" },
  { op: "neq", label: "is not", symbol: "!=" },
  { op: "between", label: "is between", symbol: "" },
];

let nextId = 1;
export function newCondition(): ConditionDraft {
  return { id: nextId++, ioId: null, op: "lt", value: "", value2: "" };
}

const isNum = (s: string) => s.trim() !== "" && !isNaN(Number(s));

/**
 * The `where` query value for /api/io-logs (see parseConditions), or a message
 * naming the first row that is not filled in.
 */
export function conditionsToQuery(
  conditions: ConditionDraft[]
): { where: string; ioIds: number[] } | { error: string } {
  const parts: string[] = [];
  const ioIds: number[] = [];
  for (let i = 0; i < conditions.length; i++) {
    const c = conditions[i];
    const n = conditions.length > 1 ? `Condition ${i + 1}` : "Condition";
    if (c.ioId === null) return { error: `${n}: choose a parameter, or remove it` };
    if (!isNum(c.value)) return { error: `${n}: enter a value for ${getParam(c.ioId)?.name}` };
    if (c.op === "between") {
      if (!isNum(c.value2)) return { error: `${n}: enter the second value for ${getParam(c.ioId)?.name}` };
      parts.push(`${c.ioId}:between:${Number(c.value)}:${Number(c.value2)}`);
    } else {
      parts.push(`${c.ioId}:${c.op}:${Number(c.value)}`);
    }
    if (!ioIds.includes(c.ioId)) ioIds.push(c.ioId);
  }
  return { where: parts.join(","), ioIds };
}

/** "ain.1 < 0.2 && din.1 == true" — empty until every row is filled in. */
export function expressionText(conditions: ConditionDraft[], match: MatchMode): string {
  const terms: string[] = [];
  for (const c of conditions) {
    const p = c.ioId === null ? undefined : getParam(c.ioId);
    if (!p || !isNum(c.value)) return "";
    if (p.onOff) {
      terms.push(`${p.name} == ${c.value === "1" ? "true" : "false"}`);
    } else if (c.op === "between") {
      if (!isNum(c.value2)) return "";
      const lo = Math.min(Number(c.value), Number(c.value2));
      const hi = Math.max(Number(c.value), Number(c.value2));
      const t = `${p.name} >= ${lo} && ${p.name} <= ${hi}`;
      terms.push(conditions.length > 1 ? `(${t})` : t);
    } else {
      terms.push(`${p.name} ${NUMBER_OPS.find((o) => o.op === c.op)!.symbol} ${Number(c.value)}`);
    }
  }
  return terms.join(match === "any" ? " || " : " && ");
}

// ── Styles ──────────────────────────────────────────────────────────────────

const fieldStyle: React.CSSProperties = {
  background: "white",
  border: `2px solid ${THEME.border.light}`,
  borderRadius: 8,
  padding: "9px 12px",
  color: THEME.text.primary,
  fontSize: 13,
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box",
  minWidth: 0,
};

const proseStyle: React.CSSProperties = { fontSize: 13, color: THEME.text.secondary };

// ── Component ───────────────────────────────────────────────────────────────

interface Props {
  conditions: ConditionDraft[];
  match: MatchMode;
  onChange: (conditions: ConditionDraft[]) => void;
  onMatchChange: (match: MatchMode) => void;
}

export function ConditionBuilder({ conditions, match, onChange, onMatchChange }: Props) {
  const update = (id: number, patch: Partial<ConditionDraft>) =>
    onChange(conditions.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const setParam = (c: ConditionDraft, raw: string) => {
    const ioId = raw === "" ? null : Number(raw);
    const wasOnOff = c.ioId !== null && !!getParam(c.ioId)?.onOff;
    const isOnOff = ioId !== null && !!getParam(ioId)?.onOff;
    if (isOnOff) update(c.id, { ioId, op: "eq", value: "1", value2: "" });
    // Leaving an ON/OFF parameter: "1" would be read as a number, so clear it.
    else if (wasOnOff) update(c.id, { ioId, op: "lt", value: "", value2: "" });
    else update(c.id, { ioId });
  };

  const expression = expressionText(conditions, match);

  return (
    <div>
      {conditions.length === 0 ? (
        <div style={{ ...proseStyle, color: THEME.text.tertiary, marginBottom: 10 }}>
          No conditions — every record in the time range is shown.
        </div>
      ) : (
        <div style={{ ...proseStyle, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          {conditions.length === 1 ? (
            <span>Show records only when:</span>
          ) : (
            <>
              <span>Show records only when</span>
              <select
                value={match}
                onChange={(e) => onMatchChange(e.target.value as MatchMode)}
                aria-label="Match all or any condition"
                style={{ ...fieldStyle, fontWeight: 700, padding: "6px 10px" }}
              >
                <option value="all">ALL</option>
                <option value="any">ANY</option>
              </select>
              <span>of these are true:</span>
            </>
          )}
        </div>
      )}

      {conditions.map((c, i) => {
        const p = c.ioId === null ? undefined : getParam(c.ioId);
        return (
          <div key={c.id} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
            <select
              value={c.ioId ?? ""}
              onChange={(e) => setParam(c, e.target.value)}
              aria-label={`Condition ${i + 1} parameter`}
              style={{ ...fieldStyle, flex: "2 1 180px", fontFamily: "JetBrains Mono, monospace" }}
            >
              <option value="">Choose parameter…</option>
              {COMMON_PARAMS.map((cp) => (
                <option key={cp.io_id} value={cp.io_id}>
                  {cp.name}{cp.unit ? ` (${cp.unit})` : ""}
                </option>
              ))}
            </select>

            {p?.onOff ? (
              <>
                <span style={proseStyle}>is</span>
                <select
                  value={c.value}
                  onChange={(e) => update(c.id, { value: e.target.value })}
                  aria-label={`Condition ${i + 1} state`}
                  style={{ ...fieldStyle, flex: "1 1 100px", fontWeight: 700 }}
                >
                  <option value="1">ON</option>
                  <option value="0">OFF</option>
                </select>
              </>
            ) : (
              <>
                <select
                  value={c.op}
                  onChange={(e) => update(c.id, { op: e.target.value as ConditionOp })}
                  aria-label={`Condition ${i + 1} comparison`}
                  style={{ ...fieldStyle, flex: "1 1 140px" }}
                >
                  {NUMBER_OPS.map((o) => (
                    <option key={o.op} value={o.op}>{o.label}</option>
                  ))}
                </select>
                <input
                  type="number"
                  step="any"
                  value={c.value}
                  onChange={(e) => update(c.id, { value: e.target.value })}
                  placeholder="value"
                  aria-label={`Condition ${i + 1} value`}
                  style={{ ...fieldStyle, flex: "1 1 90px", width: 90 }}
                />
                {c.op === "between" && (
                  <>
                    <span style={proseStyle}>and</span>
                    <input
                      type="number"
                      step="any"
                      value={c.value2}
                      onChange={(e) => update(c.id, { value2: e.target.value })}
                      placeholder="value"
                      aria-label={`Condition ${i + 1} second value`}
                      style={{ ...fieldStyle, flex: "1 1 90px", width: 90 }}
                    />
                  </>
                )}
                {p?.unit && <span style={{ ...proseStyle, fontWeight: 600 }}>{p.unit}</span>}
              </>
            )}

            <button
              type="button"
              onClick={() => onChange(conditions.filter((x) => x.id !== c.id))}
              aria-label={`Remove condition ${i + 1}`}
              title="Remove condition"
              style={{
                background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
                fontSize: 18, lineHeight: 1, color: THEME.text.tertiary, padding: "4px 8px",
              }}
            >
              ×
            </button>
          </div>
        );
      })}

      {conditions.length < MAX_CONDITIONS && (
        <button
          type="button"
          onClick={() => onChange([...conditions, newCondition()])}
          style={{
            background: "white", color: THEME.primary[600],
            border: `2px dashed ${THEME.primary[200]}`, borderRadius: 8,
            padding: "7px 14px", fontWeight: 700, fontSize: 12,
            cursor: "pointer", fontFamily: "inherit",
          }}
        >
          + Add condition
        </button>
      )}

      {conditions.length > 0 && (
        <div style={{
          marginTop: 12, padding: "10px 14px", background: THEME.neutral[50],
          border: `1px solid ${THEME.border.light}`, borderRadius: 8,
          fontSize: 12, color: THEME.text.tertiary,
        }}>
          Expression:{" "}
          {expression ? (
            <span style={{ fontFamily: "JetBrains Mono, monospace", fontWeight: 600, color: THEME.text.primary }}>
              {expression}
            </span>
          ) : (
            <span>fill in every condition to see it</span>
          )}
        </div>
      )}
    </div>
  );
}
