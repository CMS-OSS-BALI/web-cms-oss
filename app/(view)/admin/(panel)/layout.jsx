"use client";

import Sidebar from "../sidebar/sidebar";
import Footer from "../footer/footer";

export default function PanelLayout({ children }) {
  return (
    <div className="admin-shell">
      <Sidebar />
      <main className="admin-content bg-app">
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
