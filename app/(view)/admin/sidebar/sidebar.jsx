"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo } from "react";
import { Button, Menu } from "antd";
import useSidebarViewModel from "./useSidebarViewModel";
import logo from "@/public/images/logo-removebg-preview.png";

export default function Sidebar() {
  const { MENU, isActive, onLogout } = useSidebarViewModel();

  const selectedKey = useMemo(() => {
    const active = MENU.find((i) => isActive(i.href));
    return active?.href;
  }, [MENU, isActive]);

  const items = useMemo(
    () =>
      MENU.map((item) => {
        const Icon = item.icon;
        return {
          key: item.href,
          icon: Icon ? (
            <span className="menu-icon">
              <Icon className="menu-icon-svg" strokeWidth={2} />
            </span>
          ) : null,
          label: <Link href={item.href}>{item.label}</Link>,
        };
      }),
    [MENU]
  );

  return (
    <aside className="sidebar">
      <div
        className="sidebar-logo"
        style={{
          padding: 12,
          textAlign: "center",
          background: "transparent",
          marginBottom: 12,
        }}
      >
        <Link
          href="/admin/dashboard"
          aria-label="Go to Dashboard"
          style={{ display: "inline-block", width: "100%" }}
        >
          <Image
            src={logo}
            alt="Logo"
            priority
            sizes="120px"
            style={{ width: 180, height: "auto", objectFit: "contain" }}
          />
        </Link>
      </div>

      {/* Nav */}
      <Menu
        mode="inline"
        theme="dark"
        items={items}
        selectedKeys={selectedKey ? [selectedKey] : []}
        style={{ background: "transparent", borderRight: "none" }}
        className="sidebar-menu"
      />

      {/* Bottom logout */}
      <div className="sidebar-bottom">
        <Button
          danger
          block
          onClick={onLogout}
          className="sidebar-logout"
          style={{ height: 40, borderRadius: 9999 }}
        >
          Logout
        </Button>
      </div>
    </aside>
  );
}
