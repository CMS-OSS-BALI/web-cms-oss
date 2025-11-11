// Header.jsx
"use client";

import { useRouter } from "next/navigation";
import { Breadcrumb, Avatar, Badge, Tooltip, Dropdown } from "antd";
import { BellOutlined, UserOutlined, LogoutOutlined } from "@ant-design/icons";
import useHeaderViewModel from "./useHeaderViewModel";
import "./header.css";

export default function Header() {
  const vm = useHeaderViewModel();
  const router = useRouter();

  const menuItems = [
    { key: "profile", icon: <UserOutlined />, label: "Edit Profil" },
    { type: "divider" },
    { key: "logout", icon: <LogoutOutlined />, label: "Logout", danger: true },
  ];

  const onMenuClick = async ({ key }) => {
    if (key === "profile") router.push("/admin/profile");
    else if (key === "logout") await vm.onLogout();
  };

  return (
    <header className="ah-root" role="banner">
      <div className="ah-left">
        <Breadcrumb className="ah-bc" items={vm.breadcrumbs} />
      </div>

      <div className="ah-right">
        <Tooltip
          title="Notifikasi"
          placement="bottomRight"
          arrow
          getPopupContainer={() => document.body}
        >
          <Badge dot offset={[2, -2]}>
            <button className="ah-icon-btn" aria-label="Notifications">
              <BellOutlined />
            </button>
          </Badge>
        </Tooltip>

        <Dropdown
          trigger={["click"]}
          placement="bottomRight"
          menu={{ items: menuItems, onClick: onMenuClick }}
          arrow
          overlayStyle={{ marginTop: 10 }}
          getPopupContainer={() => document.body}
        >
          <button className="ah-avatar-btn" aria-label="User menu">
            {vm.user.image ? (
              <Avatar
                size={36}
                src={vm.user.image}
                className="ah-avatar"
                alt={vm.user.name}
              />
            ) : (
              <Avatar size={36} className="ah-avatar" alt={vm.user.name}>
                {vm.user.initials || <UserOutlined />}
              </Avatar>
            )}
          </button>
        </Dropdown>
      </div>
    </header>
  );
}
