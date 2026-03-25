"use client";

import React from "react";
import { Icons } from "@/components/ui/Icons";
import { THEME } from "@/lib/theme";

interface DeviceSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function DeviceSearchBar({
  searchQuery,
  onSearchChange,
}: DeviceSearchBarProps) {
  return (
    <div
      style={{
        height: 48,
        background: THEME.background.card,
        borderTop: `1px solid ${THEME.border.light}`,
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        gap: 10,
      }}
    >
      <Icons.Search />
      <input
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Filter: name or IMEI..."
        style={{
          flex: 1,
          background: "transparent",
          border: `1px solid ${THEME.border.light}`,
          outline: "none",
          color: "#e0e0e0",
          fontSize: 13,
          fontFamily: "inherit",
        }}
      />
      {searchQuery && (
        <button
          onClick={() => onSearchChange("")}
          style={{
            background: "none",
            border: "none",
            color: "#6b7280",
            cursor: "pointer",
            padding: 4,
            display: "flex",
          }}
        >
          <Icons.Close />
        </button>
      )}
    </div>
  );
}
