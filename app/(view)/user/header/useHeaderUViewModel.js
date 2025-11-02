// app/(view)/user/header/useHeaderUViewModel.js
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

const readLangCookie = () => {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|;\s*)oss\.lang=(en|id)/);
  return match ? match[1] : "";
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

/** 🔧 Baru: urutan prioritas = URL > Cookie > localStorage > <html lang> > default */
const getInitialLangClient = () => {
  try {
    const url = new URL(window.location.href);
    const q = (url.searchParams.get("lang") || "").toLowerCase();
    const ck = (readLangCookie() || "").toLowerCase();
    const ls = (localStorage.getItem(LANG_COOKIE) || "").toLowerCase();
    const htmlLang = (
      document.documentElement.getAttribute("lang") || ""
    ).toLowerCase();

    const cand = q || ck || ls || htmlLang || "id";
    return normalizeLang(cand);
  } catch {
    const ck = (readLangCookie() || "").toLowerCase();
    const ls = (
      typeof localStorage !== "undefined"
        ? localStorage.getItem(LANG_COOKIE)
        : ""
    )?.toLowerCase();
    return normalizeLang(ck || ls || "id");
  }
};

const replaceUrlLang = (l) => {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  // keep URL clean
  url.searchParams.delete("menu");
  // ID is default (no ?lang), EN uses ?lang=en
  if (l === "en") {
    url.searchParams.set("lang", "en");
  } else {
    url.searchParams.delete("lang");
  }
  window.history.replaceState({}, "", url.toString());
};

/* ======================= i18n Nav ======================= */
/* ID */
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

/* EN */
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
export function useHeaderUViewModel() {
  const pathname = usePathname();

  const [isMenuOpen, setMenuOpen] = useState(false);
  const [lang, setLang] = useState("id");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      stripMenuParamFromCurrentUrl();

      const initial = getInitialLangClient();
      setLang(initial);

      // Sync ke <html lang> & URL & cookie & localStorage
      document.documentElement.setAttribute("lang", initial);
      replaceUrlLang(initial);
      writeLangCookie(initial);
      localStorage.setItem(LANG_COOKIE, initial);
    } catch {}
  }, []);

  useEffect(() => {
    if (!mounted) return;
    // hanya sync jika sudah mount
    localStorage.setItem(LANG_COOKIE, lang);
    writeLangCookie(lang);
    document.documentElement.setAttribute("lang", lang);
    replaceUrlLang(lang);
  }, [lang, mounted]);

  // close mobile menu on route change
  useEffect(() => setMenuOpen(false), [pathname]);

  const changeLang = useCallback(
    (val) => setLang(val === "en" ? "en" : "id"),
    []
  );

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
