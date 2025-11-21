// app/(view)/admin/sidebar/useSidebarViewModel.js
"use client";

import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import useAuthChannel from "@/app/hooks/useAuthChannel";
import {
  LayoutDashboard,
  CalendarDays,
  User,
  MessageSquareText,
  Store,
  GraduationCap,
  Users,
  QrCode,
  Megaphone,
  FileText,
  Layers,
  Activity,
} from "lucide-react";

/** ===== MENU: Prodi jadi child-nya Jurusan ===== */
export const MENU = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },

  {
    label: "Event",
    href: "/admin/events",
    icon: CalendarDays,
    children: [
      { label: "Data Student", href: "/admin/events/students" },
      { label: "Data Representative", href: "/admin/events/representatives" },
      { label: "Kode Voucher", href: "/admin/events/vouchers" },

      // ⬇️ NEW: menu Foto Event (previous_event_photos)
      { label: "Foto Event", href: "/admin/events/photos" },
    ],
  },

  { label: "Konsultan", href: "/admin/consultants", icon: User },
  { label: "Berita", href: "/admin/blog", icon: FileText },
  { label: "Mitra", href: "/admin/merchants", icon: Store },

  {
    label: "Kampus",
    href: "/admin/college",
    icon: GraduationCap,
    children: [
      {
        label: "Jurusan",
        href: "/admin/jurusan",
        children: [{ label: "Prodi", href: "/admin/prodi" }],
      },
    ],
  },

  { label: "Data Leads", href: "/admin/leads", icon: Users },
  // { label: "Data Referral", href: "/admin/referral", icon: QrCode },
  { label: "Layanan", href: "/admin/services", icon: Layers },
  { label: "Testimoni", href: "/admin/testimonials", icon: MessageSquareText },

  { label: "Aktivitas", href: "/admin/activity", icon: Activity },
  { label: "Blast", href: "/admin/blast", icon: Megaphone },
  { label: "Master Data", href: "/admin/master-data", icon: Layers },
];

/* ===== helpers rekursif untuk active state ===== */
function hrefIsActive(pathname, href) {
  return pathname === href || pathname.startsWith(href + "/");
}
export function findPathByHref(pathname, nodes = MENU) {
  for (const n of nodes) {
    if (n.children?.length) {
      const child = findPathByHref(pathname, n.children);
      if (child.length) return [n, ...child];
    }
    if (hrefIsActive(pathname, n.href)) return [n];
  }
  return [];
}

export default function useSidebarViewModel() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { onLogout } = useAuthChannel({ callbackUrl: "/admin/login-page" });

  const activeChain = findPathByHref(pathname, MENU);
  const isActive = (href) => activeChain.at(-1)?.href === href;
  const isChildActive = (children = []) =>
    findPathByHref(pathname, children).length > 0;

  const name = session?.user?.name || "Admin User";
  const email = session?.user?.email || "";
  const image = session?.user?.image || "";
  const initials = name
    .split(" ")
    .map((s) => s?.[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const profile = { name, email, image, initials };
  const brand = { name: "Admin OSS BALI", logoUrl: "/images/loading.png" };

  return { MENU, isActive, isChildActive, onLogout, profile, brand };
}
