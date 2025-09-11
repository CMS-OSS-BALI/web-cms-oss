"use client";

import { Button, Tooltip } from "antd";
import { Menu as MenuIcon } from "lucide-react";
import useHeaderViewModel from "./useHeaderViewModel";
import "./header.css";

export default function Header({ collapsed, onToggleSidebar }) {
  const { title } = useHeaderViewModel();

  return (
    <header className="admin-topbar">
      <div className="topbar-left">
        <Tooltip
          title={collapsed ? "Tampilkan sidebar" : "Sembunyikan sidebar"}
          placement="bottom"
        >
          <Button
            type="text"
            className="hamburger-btn"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-controls="admin-sidebar"
            aria-expanded={!collapsed}
            onClick={onToggleSidebar}
            icon={<MenuIcon size={18} />}
          />
        </Tooltip>
      </div>

      <div className="topbar-right">
        {/* tempatkan action kanan (search, notif, user menu) kalau perlu */}
      </div>
    </header>
  );
}
