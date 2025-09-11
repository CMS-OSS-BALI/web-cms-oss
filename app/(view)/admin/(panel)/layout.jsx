"use client";

import { useState } from "react";
import Sidebar from "../sidebar/sidebar";
import Header from "../header/header"; // ⟵ NEW
import Footer from "../footer/footer";

export default function PanelLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`admin-shell ${collapsed ? "is-collapsed" : ""}`}>
      <Sidebar collapsed={collapsed} /> {/* toggle-nya di header */}
      <main className="admin-content bg-app">
        <Header
          collapsed={collapsed}
          onToggleSidebar={() => setCollapsed((v) => !v)}
        />
        <div className="admin-main">
          <div className="page-scroll">
            {children}
            <Footer />
          </div>
        </div>
      </main>
    </div>
  );
}
