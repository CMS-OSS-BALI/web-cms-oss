"use client";

import Link from "next/link";
import Image from "next/image";
import useSidebarViewModel from "./useSidebarViewModel";
import "./sidebar.css";

/**
 * Sidebar menerima prop collapsed (boolean) dari PanelLayout.
 * - className "is-collapsed" akan mengubah lebar & menyembunyikan teks.
 * - aria-expanded di-ikat untuk aksesibilitas.
 */
export default function Sidebar({ collapsed = false }) {
  const { MENU, isActive, isChildActive, brand } = useSidebarViewModel();

  const renderNode = (item, depth = 0) => {
    const Active = isActive(item.href) || isChildActive(item.children || []);
    const Icon = item.icon;

    return (
      <li key={item.href} className={`sb-li depth-${depth}`}>
        <Link
          href={item.href}
          className={`sb-item ${Active ? "is-active" : ""}`}
          aria-current={Active ? "page" : undefined}
          // Saat collapsed, beri title agar tetap terbaca via tooltip browser
          title={collapsed ? item.label : undefined}
        >
          <span className="sb-item-rail" />
          {Icon ? <Icon size={18} className="sb-ic" aria-hidden /> : null}
          {/* Sembunyikan teks saat collapsed, tapi tetap ada untuk screen reader */}
          <span className="sb-txt" aria-hidden={collapsed ? "true" : "false"}>
            {item.label}
          </span>
        </Link>

        {item.children?.length ? (
          <ul
            className={`sb-sub depth-${depth + 1}`}
            role="group"
            aria-label={item.label}
          >
            {item.children.map((c) => renderNode(c, depth + 1))}
          </ul>
        ) : null}
      </li>
    );
  };

  return (
    <aside
      className={`sb-root ${collapsed ? "is-collapsed" : ""}`}
      aria-label="Sidebar Navigation"
      aria-expanded={!collapsed}
    >
      <div className="sb-brand">
        <div className="sb-logo" aria-hidden="true">
          {brand.logoUrl ? (
            <Image
              src={brand.logoUrl}
              alt="logo"
              width={28}
              height={28}
              className="sb-logo-img"
              priority
            />
          ) : (
            <div className="sb-logo-fallback">O</div>
          )}
        </div>
        <div className="sb-brand-name">{brand.name}</div>
      </div>

      <nav className="sb-nav">
        <ul className="sb-menu">{MENU.map((item) => renderNode(item, 0))}</ul>
      </nav>
    </aside>
  );
}
