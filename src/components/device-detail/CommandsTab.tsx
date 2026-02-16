"use client";

import React, { useState, useEffect } from "react";
import { Device, Command } from "@/types";
import { Icons } from "@/components/ui/Icons";
import { COMMAND_PRESETS } from "@/lib/constants";
import { formatTimestamp } from "@/lib/utils";

interface CommandsTabProps {
  device: Device;
}

export function CommandsTab({ device }: CommandsTabProps) {
  const [commandText, setCommandText] = useState("");
  const [commands, setCommands] = useState<Command[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch command history on mount and every 5 seconds
  useEffect(() => {
    fetchCommandHistory();
    const interval = setInterval(fetchCommandHistory, 5000);
    return () => clearInterval(interval);
  }, [device.id]);

  const fetchCommandHistory = async () => {
    try {
      const response = await fetch(`/api/commands?device_id=${device.id}`);
      const data = await response.json();
      
      if (data.success) {
        setCommands(data.data);
      }
    } catch (error) {
      console.error('Error fetching command history:', error);
    }
  };

  const handleSend = async () => {
    if (!commandText.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: device.id,
          command: commandText,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setCommandText("");
        fetchCommandHistory(); // Refresh list
      } else {
        alert('Failed to queue command: ' + data.error);
      }
    } catch (error) {
      console.error('Error sending command:', error);
      alert('Error sending command');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", marginBottom: 16 }}>
        Send Command
      </div>
      
      {/* Command presets */}
      <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
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
        {/* Digital output controls */}
        <button onClick={() => setCommandText("setdigout 1??? 60 0 0 0")} style={{background: "#2a2a2a", border: "1px solid #3a3a3a", borderRadius: 6, padding: "6px 12px", color: "#00e676", fontSize: 11, cursor: "pointer", fontFamily: "inherit"}}>
          DOUT1 ON (60s)
        </button>
        <button onClick={() => setCommandText("setdigout 0??? 0 0 0 0")} style={{background: "#2a2a2a", border: "1px solid #3a3a3a", borderRadius: 6, padding: "6px 12px", color: "#ef4444", fontSize: 11, cursor: "pointer", fontFamily: "inherit"}}>
          DOUT1 OFF
        </button>
      </div>

      {/* Command input */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <input
          value={commandText}
          onChange={(e) => setCommandText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type GPRS command (e.g. getinfo, setdigout 1??? 60 0 0 0)..."
          disabled={loading}
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
          disabled={loading || !commandText.trim()}
          style={{
            background: loading ? "#555" : "#7c3aed",
            border: "none",
            borderRadius: 6,
            padding: "10px 20px",
            color: "#fff",
            fontWeight: 700,
            fontSize: 12,
            cursor: loading ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontFamily: "inherit",
          }}
        >
          <Icons.Send /> {loading ? "QUEUING..." : "QUEUE"}
        </button>
      </div>

      {/* Info message */}
      <div style={{
        background: "rgba(59, 130, 246, 0.1)",
        border: "1px solid rgba(59, 130, 246, 0.3)",
        borderRadius: 6,
        padding: "10px 12px",
        marginBottom: 16,
        fontSize: 11,
        color: "#93c5fd",
      }}>
        <Icons.Info /> Command will be queued and sent when device connects to the server
      </div>

      {/* Command history */}
      <div style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", marginBottom: 10 }}>
        Command History
      </div>
      {commands.length === 0 && (
        <div style={{ color: "#525252", fontSize: 12, padding: 20, textAlign: "center" }}>
          No commands sent yet. Queue a command above.
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
                    : cmd.status === "pending"
                    ? "rgba(251, 191, 36, 0.2)"
                    : cmd.status === "sent"
                    ? "rgba(59, 130, 246, 0.2)"
                    : "rgba(239, 68, 68, 0.2)",
                color:
                  cmd.status === "executed"
                    ? "#4ade80"
                    : cmd.status === "pending"
                    ? "#fbbf24"
                    : cmd.status === "sent"
                    ? "#60a5fa"
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
                marginTop: 6,
              }}
            >
              Response: {cmd.response}
            </div>
          )}
          {cmd.error_message && (
            <div
              style={{
                fontSize: 12,
                color: "#f87171",
                fontFamily: "monospace",
                background: "#2e1a1a",
                padding: "6px 10px",
                borderRadius: 4,
                marginTop: 6,
              }}
            >
              Error: {cmd.error_message}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}