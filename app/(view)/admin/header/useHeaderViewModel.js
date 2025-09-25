"use client";

import { usePathname } from "next/navigation";

const TITLE_MAP = {
  "/admin/dashboard": "Dashboard",
  "/admin/programs": "Programs",
  "/admin/events": "Events",
  "/admin/scanner": "Scanner",
  "/admin/partners": "Partners",
  "/admin/testimonials": "Testimonials",
  "/admin/merchants": "Mitra Dalam Negeri",
  "/admin/profile": "Profile",
};

export default function useHeaderViewModel() {
  const pathname = usePathname() || "/admin/dashboard";

  // ambil segmen pertama setelah /admin untuk judul
  // contoh: /admin/events/123 -> /admin/events
  let base = "/admin/dashboard";
  const parts = pathname.split("?")[0].split("/").filter(Boolean);
  if (parts[0] === "admin" && parts[1]) base = `/admin/${parts[1]}`;

  const title = TITLE_MAP[base] ?? "Dashboard";
  return { title };
}

