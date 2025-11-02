"use client";

import { useState } from "react";
import Sidebar from "../sidebar/sidebar";
import Header from "../header/header";
import Footer from "../footer/footer";

/**
 * Catatan:
 * - className "is-collapsed" di root container tetap dipertahankan (opsional),
 *   tapi Sidebar juga menerima prop collapsed sehingga sinkron.
 */
export default function PanelLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className={`admin-shell ${collapsed ? "is-collapsed" : ""}`}
      style={{
        display: "flex",
        minHeight: "100dvh",
        width: "100%",
      }}
    >
      <Sidebar collapsed={collapsed} />

      <main
        className="admin-content bg-app"
        style={{
          flex: "1 1 auto",
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        <Header
          collapsed={collapsed}
          onToggleSidebar={() => setCollapsed((v) => !v)}
        />

        <div
          className="admin-main"
          style={{
            flex: "1 1 auto",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          <div
            className="page-scroll"
            style={{
              flex: "1 1 auto",
              minHeight: 0,
              overflow: "auto",
            }}
          >
            {children}
          </div>

          <Footer />
        </div>
      </main>
    </div>
  );
}
