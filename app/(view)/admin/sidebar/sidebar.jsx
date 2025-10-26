"use client";

import Link from "next/link";
import Image from "next/image";
import useSidebarViewModel from "./useSidebarViewModel";
import "./sidebar.css";

export default function Sidebar() {
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
        >
          <span className="sb-item-rail" />
          {Icon ? <Icon size={18} className="sb-ic" /> : null}
          <span className="sb-txt">{item.label}</span>
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
    <aside className="sb-root" aria-label="Sidebar Navigation">
      <div className="sb-brand">
        <div className="sb-logo" aria-hidden="true">
          {brand.logoUrl ? (
            <Image
              src={brand.logoUrl}
              alt="logo"
              width={28}
              height={28}
              className="sb-logo-img"
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
