"use client";

import React, { useState } from "react";
import { Device, Command } from "@/types";
import { Icons } from "@/components/ui/Icons";
import { COMMAND_PRESETS } from "@/lib/constants";
import { formatTimestamp } from "@/lib/utils";

interface CommandsTabProps {
  device: Device;
  commands: Command[];
  onSendCommand: (command: string) => void;
}

export function CommandsTab({ device, commands, onSendCommand }: CommandsTabProps) {
  const [commandText, setCommandText] = useState("");

  const handleSend = () => {
    if (!commandText.trim()) return;
    onSendCommand(commandText);
    setCommandText("");
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", marginBottom: 16 }}>
        Send Command
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        {COMMAND_PRESETS.map((cmd) => (
          <button
            key={cmd}
            onClick={() => setCommandText(cmd)}
            style={{
              background: "#2a2a2a",
              border: "1px solid #3a3a3a",
              borderRadius: 6,
              padding: "6px 12px",
              color: "#c4b5fd",
              fontSize: 11,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {cmd}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <input
          value={commandText}
          onChange={(e) => setCommandText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type GPRS command (e.g. getinfo)..."
          style={{
            flex: 1,
            background: "#1e1e1e",
            border: "1px solid #333",
            borderRadius: 6,
            padding: "10px 14px",
            color: "#e2e8f0",
            fontSize: 13,
            fontFamily: "inherit",
            outline: "none",
          }}
        />
        <button
          onClick={handleSend}
          style={{
            background: "#7c3aed",
            border: "none",
            borderRadius: 6,
            padding: "10px 20px",
            color: "#fff",
            fontWeight: 700,
            fontSize: 12,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontFamily: "inherit",
          }}
        >
          <Icons.Send /> SEND
        </button>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", marginBottom: 10 }}>
        Command History
      </div>
      {commands.length === 0 && (
        <div style={{ color: "#525252", fontSize: 12, padding: 20, textAlign: "center" }}>
          No commands sent yet. Use the quick buttons above or type a command.
        </div>
      )}
      {commands.map((cmd) => (
        <div
          key={cmd.id}
          style={{
            background: "#242424",
            borderRadius: 8,
            padding: "12px 16px",
            marginBottom: 8,
            border: "1px solid #333",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span
              style={{
                fontSize: 9,
                padding: "2px 8px",
                borderRadius: 3,
                fontWeight: 700,
                background:
                  cmd.status === "executed"
                    ? "rgba(0, 200, 83, 0.2)"
                    : cmd.status === "sent"
                    ? "rgba(251, 191, 36, 0.2)"
                    : "rgba(239, 68, 68, 0.2)",
                color:
                  cmd.status === "executed"
                    ? "#4ade80"
                    : cmd.status === "sent"
                    ? "#fbbf24"
                    : "#f87171",
                textTransform: "uppercase",
              }}
            >
              {cmd.status}
            </span>
            <code style={{ fontSize: 13, color: "#c4b5fd", fontWeight: 600 }}>{cmd.command}</code>
            <span style={{ fontSize: 10, color: "#525252", marginLeft: "auto" }}>
              {formatTimestamp(cmd.sent_at)}
            </span>
          </div>
          {cmd.response && (
            <div
              style={{
                fontSize: 12,
                color: "#4ade80",
                fontFamily: "monospace",
                background: "#1a2e1a",
                padding: "6px 10px",
                borderRadius: 4,
              }}
            >
              Response: {cmd.response}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
