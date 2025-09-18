"use client";

import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Layers,
  CalendarDays,
  Handshake,
  User,
  Store,
  MessageSquareText,
  QrCode,
  Megaphone,
} from "lucide-react";

export const MENU = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Programs", href: "/admin/programs", icon: Layers },
  { label: "Events", href: "/admin/events", icon: CalendarDays },
  { label: "Partners", href: "/admin/partners", icon: Handshake },
  {
    label: "Testimonials",
    href: "/admin/testimonials",
    icon: MessageSquareText,
  },
  { label: "Merchants", href: "/admin/merchants", icon: Store },
  { label: "Blast", href: "/admin/blast", icon: Megaphone },
  { label: "Profile", href: "/admin/profile", icon: User },
];

export default function useSidebarViewModel() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const isActive = (href) =>
    pathname === href || pathname.startsWith(href + "/");

  async function onLogout() {
    try {
      new BroadcastChannel("auth").postMessage("logout");
    } catch {}
    await signOut({ redirect: true, callbackUrl: "/admin/login-page" });
  }

  const name = session?.user?.name || "Admin User";
  const email = session?.user?.email || "";
  const image = session?.user?.image || "";
  const initials = name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const profile = { name, email, image, initials };

  return { MENU, isActive, onLogout, profile };
}
