"use client";

import Header from "../header/header-user";
import Footer from "../footer/footer-user";

export default function PanelLayout({ children }) {
  return (
    <div className="user-shell">
      <Header />
      <main className="user-main">
        <div className="user-content">{children}</div>
        <Footer />
      </main>
    </div>
  );
}
