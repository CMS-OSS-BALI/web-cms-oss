"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo } from "react";
import { Button, Menu, Tooltip, ConfigProvider, Grid } from "antd";
import { LogOut } from "lucide-react";
import useSidebarViewModel from "./useSidebarViewModel";
import logo from "@/public/images/logo-removebg-preview.png";
import "./sidebar.css";

export default function Sidebar({ collapsed }) {
  const { MENU, isActive, onLogout } = useSidebarViewModel();
  const screens = Grid.useBreakpoint();

  // auto-collapse di layar kecil, tapi tetap hormati prop collapsed
  const isCollapsed = collapsed ?? !screens.lg;

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

  // Matikan pill background bawaan AntD saat collapsed
  const collapsedMenuTheme = {
    hashed: false,
    components: {
      Menu: {
        itemHoverBg: "transparent",
        itemSelectedBg: "transparent",
        itemActiveBg: "transparent",
      },
    },
  };

  const menuEl = (
    <Menu
      mode="inline"
      theme="dark"
      items={items}
      selectedKeys={selectedKey ? [selectedKey] : []}
      inlineCollapsed={isCollapsed}
      style={{ background: "transparent", borderRight: "none" }}
      className={`sidebar-menu ${isCollapsed ? "is-collapsed-menu" : ""}`}
    />
  );

  return (
    <aside
      id="admin-sidebar"
      className={`sidebar ${isCollapsed ? "is-collapsed" : ""}`}
    >
      {/* Logo — SELALU CENTER */}
      <div className="sidebar-logo">
        <Link
          href="/admin/dashboard"
          aria-label="Go to Dashboard"
          className="sidebar-logo-link"
        >
          <Image
            src={logo}
            alt="Logo"
            priority
            sizes="140px"
            className="sidebar-logo-img"
          />
        </Link>
      </div>

      {/* Nav */}
      {isCollapsed ? (
        <ConfigProvider theme={collapsedMenuTheme}>{menuEl}</ConfigProvider>
      ) : (
        menuEl
      )}

      {/* Bottom logout */}
      <div className="sidebar-bottom">
        {isCollapsed ? (
          <Tooltip title="Logout" placement="right">
            <Button
              danger
              onClick={onLogout}
              className="sidebar-logout icon-only"
              icon={<LogOut size={18} />}
            />
          </Tooltip>
        ) : (
          <Button
            danger
            block
            onClick={onLogout}
            className="sidebar-logout"
            style={{ height: 40, borderRadius: 9999 }}
          >
            Logout
          </Button>
        )}
      </div>

      {/* Safety override terakhir */}
      <style jsx global>{`
        .sidebar.is-collapsed .ant-menu-item,
        .sidebar.is-collapsed .ant-menu-item:hover,
        .sidebar.is-collapsed .ant-menu-item-active,
        .sidebar.is-collapsed .ant-menu-item-selected,
        .sidebar.is-collapsed .ant-menu-item > a,
        .sidebar.is-collapsed .ant-menu-item > a:hover {
          background: transparent !important;
          box-shadow: none !important;
        }
      `}</style>
    </aside>
  );
}
