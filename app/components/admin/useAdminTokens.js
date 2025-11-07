"use client";

import { useMemo } from "react";

export default function useAdminTokens(overrides = {}) {
  const tokens = {
    blue: "#0b56c9",
    text: "#0f172a",
    fontFamily:
      '"Public Sans", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
    borderRadius: 12,
    fontSize: 13,
    controlHeight: 36,
    ...overrides.tokens,
  };

  const shell = {
    shellW: "94%",
    maxW: 1140,
    ...overrides.shell,
  };

  const theme = useMemo(
    () => ({
      token: {
        colorPrimary: tokens.blue,
        colorText: tokens.text,
        fontFamily: tokens.fontFamily,
        borderRadius: tokens.borderRadius,
        fontSize: tokens.fontSize,
        controlHeight: tokens.controlHeight,
      },
      components: {
        Button: { borderRadius: 10 },
      },
      ...overrides.theme,
    }),
    [tokens, overrides.theme]
  );

  const styles = useMemo(
    () => ({
      /* ===== page scaffolding ===== */
      pageSection: {
        width: "100%",
        position: "relative",
        minHeight: "100dvh",
        display: "flex",
        alignItems: "flex-start",
        padding: "56px 0",
        overflowX: "hidden",
      },
      pageBg: {
        position: "absolute",
        inset: 0,
        background:
          "linear-gradient(180deg, #f8fbff 0%, #eef5ff 40%, #ffffff 100%)",
        zIndex: 0,
      },
      container: {
        width: shell.shellW,
        maxWidth: shell.maxW,
        margin: "0 auto",
        paddingTop: 12,
        position: "relative",
        zIndex: 1,
      },

      /* ===== shared cards ===== */
      cardOuter: {
        background: "#ffffff",
        borderRadius: 16,
        border: "1px solid #e6eeff",
        boxShadow:
          "0 10px 40px rgba(11, 86, 201, 0.07), 0 3px 12px rgba(11,86,201,0.05)",
        overflow: "hidden",
      },
      cardHeaderBar: {
        height: 20,
        background:
          "linear-gradient(90deg, #0b56c9 0%, #0b56c9 65%, rgba(11,86,201,0.35) 100%)",
      },
      cardInner: { padding: "12px 14px 14px", position: "relative" },
      cardTitle: {
        fontSize: 18,
        fontWeight: 800,
        color: "#0b3e91",
        margin: "8px 0",
      },
      totalBadgeWrap: {
        position: "absolute",
        right: 14,
        top: 8,
        display: "grid",
        gap: 4,
        justifyItems: "end",
        background: "#fff",
        border: "1px solid #e6eeff",
        borderRadius: 12,
        padding: "6px 12px",
        boxShadow: "0 6px 18px rgba(11,86,201,0.08)",
      },
      totalBadgeLabel: { fontSize: 12, color: "#0b3e91", fontWeight: 600 },
      totalBadgeValue: {
        fontSize: 16,
        color: tokens.blue,
        fontWeight: 800,
        lineHeight: 1,
      },

      /* ===== sections / table head / pagination ===== */
      sectionHeader: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 8,
      },
      sectionTitle: { fontSize: 18, fontWeight: 800, color: "#0b3e91" },

      pagination: {
        marginTop: 12,
        display: "grid",
        gridTemplateColumns: "36px 1fr 36px",
        alignItems: "center",
        justifyItems: "center",
        gap: 8,
      },
      pageText: { fontSize: 12, color: "#475569" },

      /* ===== general controls ===== */
      iconBtn: { borderRadius: 8 },

      /* ===== form label/value (detail modal) ===== */
      label: { fontSize: 11.5, color: "#64748b" },
      value: {
        fontWeight: 600,
        color: "#0f172a",
        background: "#f8fafc",
        border: "1px solid #e8eeff",
        borderRadius: 10,
        padding: "8px 10px",
        boxShadow: "inset 0 2px 6px rgba(11,86,201,0.05)",
        wordBreak: "break-word",
      },
      modalShell: {
        position: "relative",
        background: "#fff",
        borderRadius: 16,
        padding: "14px 14px 8px",
        boxShadow: "0 10px 36px rgba(11,86,201,0.08)",
      },
    }),
    [shell.shellW, shell.maxW, tokens.blue]
  );

  return { tokens, shell, theme, styles };
}

export const ADMIN_DEFAULTS = {
  blue: "#0b56c9",
  text: "#0f172a",
};

