"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const NAV_ITEMS = [
  {
    id: "home",
    label: "Beranda",
    href: "/user/landing-page",
    matchers: ["/user/landing-page", "/user"],
    isDefault: true,
  },
  {
    id: "services",
    label: "Layanan",
    href: "/user/services",
    matchers: ["/user/services"],
  },
  {
    id: "event",
    label: "Event",
    href: "/user/events",
    matchers: ["/user/events"],
  },
  {
    id: "partners",
    label: "Mitra",
    href: "/user/partners",
    matchers: ["/user/partners"],
  },
  {
    id: "majors",
    label: "Jurusan",
    href: "/user/majors",
    matchers: ["/user/majors"],
  },
  { id: "blog", label: "Berita", href: "/user/blog", matchers: ["/user/blog"] },
  {
    id: "about",
    label: "About Us",
    href: "/user/aboutus?menu=about", // <— optional: konsistenkan juga
    matchers: ["/user/aboutus"],
  },
  {
    id: "career",
    label: "Career With Us",
    href: "/user/career?menu=career", // <— tambahkan query agar force aktif
    matchers: ["/user/career"],
  },
];

const LANG_OPTIONS = [
  { value: "id", label: "Indonesia", flag: "/images/indonesia.png" },
  { value: "en", label: "English", flag: "/images/inggris.png" },
];

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

export function useHeaderUViewModel() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [isMenuOpen, setMenuOpen] = useState(false);

  const [lang, setLang] = useState("id");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("oss.lang");
    if (saved) setLang(saved);
  }, []);
  const changeLang = (val) => {
    setLang(val);
    if (typeof window !== "undefined")
      window.localStorage.setItem("oss.lang", val);
  };

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const navItems = useMemo(() => {
    // 1) aktif via path terpanjang yang match
    let activeId = NAV_ITEMS.find((i) => i.isDefault)?.id;
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
