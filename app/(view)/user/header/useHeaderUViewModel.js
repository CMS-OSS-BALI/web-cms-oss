"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/** ------- Nav config ------- */
const NAV_ITEMS = [
  {
    id: "home",
    label: "Beranda",
    href: "/user/landing-page",
    matchers: ["/user/landing-page", "/user"],
    isDefault: true,
  },
  {
    id: "layanan",
    label: "Layanan",
    href: "/user/layanan",
    // Tambahkan semua path turunan layanan di sini
    matchers: [
      "/user/layanan",
      "/user/english-course",
      "/user/accommodation",
      "/user/overseas",
      "/user/visa-apply",
      "/user/document-translation",
      "/user/leads",
    ],
  },
  {
    id: "event",
    label: "Event",
    href: "/user/events?menu=events",
    matchers: ["/user/events", "/user/leads"],
  },
  {
    id: "partners",
    label: "Mitra",
    href: "/user/partners?menu=partners",
    matchers: ["/user/partners", "/user/leads"],
  },
  {
    id: "majors",
    label: "Jurusan",
    href: "/user/majors",
    matchers: ["/user/majors", "/user/leads"],
  },
  {
    id: "blog",
    label: "Berita",
    href: "/user/blog?menu=blog",
    matchers: ["/user/blog", "/user/leads"],
  },
  {
    id: "about",
    label: "About Us",
    href: "/user/aboutus?menu=about",
    matchers: ["/user/aboutus", "/user/leads"],
  },
  {
    id: "career",
    label: "Career With Us",
    href: "/user/career?menu=career",
    matchers: ["/user/career", "/user/leads"],
  },
];

const LANG_OPTIONS = [
  { value: "id", label: "Indonesia", flag: "/images/indonesia.png" },
  { value: "en", label: "English", flag: "/images/inggris.png" },
];

/** ------- helpers ------- */
function cleanPath(s) {
  if (!s) return "/";
  if (s.length > 1 && s.endsWith("/")) return s.slice(0, -1);
  return s;
}
function isPathMatch(pathname, base) {
  if (!pathname || !base) return false;
  const p = cleanPath(pathname);
  const b = cleanPath(base);
  if (b === "/") return p === "/";
  return p === b || p.startsWith(b + "/");
}

/** ------- hook VM ------- */
export function useHeaderUViewModel() {
  const pathname = usePathname();
  const search = useSearchParams();

  const [isMenuOpen, setMenuOpen] = useState(false);

  // language (opsional)
  const [lang, setLang] = useState("id");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("oss.lang");
    if (saved) setLang(saved);
  }, []);
  const changeLang = (val) => {
    setLang(val);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("oss.lang", val);
    }
  };

  useEffect(() => setMenuOpen(false), [pathname]);

  const navItems = useMemo(() => {
    // 1) aktif via path terpanjang yang match
    let activeId = NAV_ITEMS.find((i) => i.isDefault)?.id ?? "home";
    let bestLen = -1;

    for (const item of NAV_ITEMS) {
      for (const m of item.matchers || []) {
        if (isPathMatch(pathname, m) && m.length > bestLen) {
          activeId = item.id;
          bestLen = m.length;
        }
      }
    }

    // 2) override via ?menu=<navId>
    const forced = search?.get("menu");
    if (forced) {
      const found = NAV_ITEMS.find((i) => i.id === forced);
      if (found) activeId = found.id;
    }

    return NAV_ITEMS.map((item) => ({
      ...item,
      isActive: item.id === activeId,
    }));
  }, [pathname, search]);

  return {
    logo: {
      src: "/images/loading.png",
      alt: "OSS Bali",
      href: "/user/landing-page",
    },
    navItems,
    isMenuOpen,
    toggleMenu: () => setMenuOpen((s) => !s),
    closeMenu: () => setMenuOpen(false),
    lang,
    langs: LANG_OPTIONS,
    changeLang,
  };
}
