"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

const LANG_COOKIE = "oss.lang";
const LANG_COOKIE_MAX_AGE = 60 * 60 * 24 * 180; // 180 hari

/* ======================= Helpers ======================= */
const normalizeLang = (value, fallback = "id") => {
  const base = String(value || "")
    .trim()
    .toLowerCase();
  if (base.startsWith("en")) return "en";
  if (base.startsWith("id")) return "id";
  return fallback === "en" ? "en" : "id";
};

const writeLangCookie = (lang) => {
  if (typeof document === "undefined") return;
  const normalized = normalizeLang(lang);
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";
  document.cookie = `${LANG_COOKIE}=${normalized}; path=/; max-age=${LANG_COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
};

const cleanPath = (s) =>
  !s ? "/" : s.length > 1 && s.endsWith("/") ? s.slice(0, -1) : s;

const stripMenuParamFromCurrentUrl = () => {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.has("menu")) {
      url.searchParams.delete("menu");
      window.history.replaceState({}, "", url.toString());
    }
  } catch {}
};

const replaceUrlLang = (l) => {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.delete("menu");
  // ID default: tanpa ?lang. EN: ?lang=en
  if (l === "en") {
    url.searchParams.set("lang", "en");
  } else {
    url.searchParams.delete("lang");
  }
  window.history.replaceState({}, "", url.toString());
};

/* ======================= i18n Nav ======================= */
const NAV_ID = [
  {
    id: "home",
    label: "Beranda",
    href: "/",
    matchers: ["/", "/user", "/user/landing-page"],
    isDefault: true,
  },
  {
    id: "layanan",
    label: "Layanan",
    href: "/user/layanan",
    matchers: [
      "/user/layanan",
      "/user/english-course",
      "/user/accommodation",
      "/user/overseas-study",
      "/user/visa-apply",
      "/user/doc.translate",
      "/user/leads",
    ],
  },
  {
    id: "event",
    label: "Event",
    href: "/user/events",
    matchers: [
      "/user/events",
      "/user/leads",
      "/user/form-ticket",
      "/user/form-rep",
    ],
  },
  {
    id: "partners",
    label: "Mitra Dalam Negeri",
    href: "/user/mitra-dalam-negeri",
    matchers: [
      "/user/mitra-dalam-negeri",
      "/user/partners",
      "/user/form-mitra",
      "/user/leads",
    ],
  },
  {
    id: "college",
    label: "Kampus",
    href: "/user/college",
    matchers: ["/user/college", "/user/majors", "/user/leads"],
  },
  {
    id: "blog",
    label: "Berita",
    href: "/user/blog",
    matchers: ["/user/blog", "/user/leads"],
  },
  {
    id: "about",
    label: "Tentang Kami",
    href: "/user/aboutus",
    matchers: ["/user/aboutus", "/user/leads"],
  },
  {
    id: "career",
    label: "Karier Bersama Kami",
    href: "/user/career",
    matchers: ["/user/career", "/user/leads"],
  },
];

const NAV_EN = [
  {
    id: "home",
    label: "Home",
    href: "/",
    matchers: ["/", "/user", "/user/landing-page"],
    isDefault: true,
  },
  {
    id: "layanan",
    label: "Services",
    href: "/user/layanan",
    matchers: [
      "/user/layanan",
      "/user/english-course",
      "/user/accommodation",
      "/user/overseas-study",
      "/user/visa-apply",
      "/user/doc.translate",
      "/user/leads",
    ],
  },
  {
    id: "event",
    label: "Events",
    href: "/user/events",
    matchers: [
      "/user/events",
      "/user/leads",
      "/user/form-ticket",
      "/user/form-rep",
    ],
  },
  {
    id: "partners",
    label: "Partners",
    href: "/user/mitra-dalam-negeri",
    matchers: [
      "/user/mitra-dalam-negeri",
      "/user/partners",
      "/user/form-mitra",
      "/user/leads",
    ],
  },
  {
    id: "college",
    label: "Campuses",
    href: "/user/college",
    matchers: ["/user/college", "/user/majors", "/user/leads"],
  },
  {
    id: "blog",
    label: "News",
    href: "/user/blog",
    matchers: ["/user/blog", "/user/leads"],
  },
  {
    id: "about",
    label: "About Us",
    href: "/user/aboutus",
    matchers: ["/user/aboutus", "/user/leads"],
  },
  {
    id: "career",
    label: "Career With Us",
    href: "/user/career",
    matchers: ["/user/career", "/user/leads"],
  },
];

const LANG_OPTIONS = [
  { value: "id", label: "Indonesia", flag: "/images/indonesia.png" },
  { value: "en", label: "English", flag: "/images/inggris.png" },
];

/* ======================= Hook ======================= */
export function useHeaderUViewModel({ initialLang = "id" } = {}) {
  const pathname = usePathname();

  const [isMenuOpen, setMenuOpen] = useState(false);
  // Seed dari server → tidak baca localStorage/cookie pada first paint
  const [lang, setLang] = useState(() => normalizeLang(initialLang, "id"));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      stripMenuParamFromCurrentUrl();
      // Sync atribut html lang dan URL (tanpa mengubah state awal)
      document.documentElement.setAttribute("lang", lang);
      replaceUrlLang(lang);
      // Persist preferensi ke cookie & localStorage (post-hydration)
      writeLangCookie(lang);
      localStorage.setItem(LANG_COOKIE, lang);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist & reflect ketika user mengubah bahasa
  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(LANG_COOKIE, lang);
      writeLangCookie(lang);
      document.documentElement.setAttribute("lang", lang);
      replaceUrlLang(lang);
    } catch {}
  }, [lang, mounted]);

  // close mobile menu on route change
  useEffect(() => setMenuOpen(false), [pathname]);

  const changeLang = useCallback((val) => {
    setLang(val === "en" ? "en" : "id");
  }, []);

  const NAV_SRC = lang === "en" ? NAV_EN : NAV_ID;

  const navItems = useMemo(() => {
    let activeId =
      (NAV_SRC.find((i) => i.isDefault) || NAV_SRC[0])?.id ?? "home";
    let bestLen = -1;

    for (const item of NAV_SRC) {
      for (const m of item.matchers || []) {
        const p = cleanPath(pathname);
        const b = cleanPath(m);
        const matched =
          b === "/" ? p === "/" : p === b || p.startsWith(b + "/");
        if (matched && m.length > bestLen) {
          activeId = item.id;
          bestLen = m.length;
        }
      }
    }

    return NAV_SRC.map((item) => ({ ...item, isActive: item.id === activeId }));
  }, [pathname, NAV_SRC]);

  return {
    logo: { src: "/images/loading.png", alt: "OSS Bali", href: "/" },
    navItems,
    isMenuOpen,
    toggleMenu: () => setMenuOpen((s) => !s),
    closeMenu: () => setMenuOpen(false),
    lang,
    langs: LANG_OPTIONS,
    changeLang,
    langLabel: lang === "en" ? "Language" : "Bahasa",
  };
}
