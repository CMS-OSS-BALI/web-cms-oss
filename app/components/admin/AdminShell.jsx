"use client";

import React from "react";
import { ConfigProvider } from "antd";
import useAdminTokens from "./useAdminTokens";

export default function AdminShell({
  title,
  totalLabel,
  totalValue,
  children,
  themeOverrides,
  tokensOverrides,
  shellOverrides,
}) {
  const { theme, styles } = useAdminTokens({
    theme: themeOverrides,
    tokens: tokensOverrides,
    shell: shellOverrides,
  });

  return (
    <ConfigProvider theme={theme} componentSize="middle">
      <section style={styles.pageSection}>
        <div aria-hidden style={styles.pageBg} />
        <div style={styles.container}>
          {/* Header Card */}
          <div style={styles.cardOuter}>
            <div style={styles.cardHeaderBar} />
            <div style={styles.cardInner}>
              <div style={styles.cardTitle}>{title}</div>
              <div style={styles.totalBadgeWrap}>
                <div style={styles.totalBadgeLabel}>{totalLabel}</div>
                <div style={styles.totalBadgeValue}>{totalValue ?? "—"}</div>
              </div>
            </div>
          </div>

          {/* Page Body */}
          {children}
        </div>
      </section>
    </ConfigProvider>
  );
}
