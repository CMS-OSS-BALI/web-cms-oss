"use client";

import { useState } from "react";
import Sidebar from "../sidebar/sidebar";
import Header from "../header/header";
import Footer from "../footer/footer";

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
      <Sidebar collapsed={collapsed} /> {/* toggle-nya di header */}
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

        {/* area utama: column, page-scroll = fleksibel (scroll), footer = shrink 0 */}
        <div
          className="admin-main"
          style={{
            flex: "1 1 auto",
            display: "flex",
            flexDirection: "column",
            minHeight: 0, // penting agar child flex bisa overflow
          }}
        >
          <div
            className="page-scroll"
            style={{
              flex: "1 1 auto",
              minHeight: 0,
              overflow: "auto", // konten scroll di sini
              // optional padding jika butuh: padding: "0 clamp(16px, 4vw, 32px)",
            }}
          >
            {children}
          </div>

          {/* Footer diletakkan di luar area scroll supaya selalu di bawah */}
          <Footer
          // optional links:
          // links={[
          //   { href: "/terms", label: "S&K" },
          //   { href: "/privacy", label: "Privasi" },
          // ]}
          />
        </div>
      </main>
    </div>
  );
}
