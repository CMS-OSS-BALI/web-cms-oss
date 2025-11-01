"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/* ======================= Helpers ======================= */
const cleanPath = (s) =>
  !s ? "/" : s.length > 1 && s.endsWith("/") ? s.slice(0, -1) : s;

const isPathMatch = (pathname, base) => {
  if (!pathname || !base) return false;
  const p = cleanPath(pathname);
  const b = cleanPath(base);
  if (b === "/") return p === "/";
  return p === b || p.startsWith(b + "/");
};

const getInitialLangClient = () => {
  // Call this ONLY on client (after mount)
  const url = new URL(window.location.href);
  const q = (url.searchParams.get("lang") || "").toLowerCase();
  const ls = (localStorage.getItem("oss.lang") || "").toLowerCase();
  const cand = q || ls || "id";
  return cand.startsWith("en") ? "en" : "id";
};

const setHtmlLang = (l) => {
  if (typeof document !== "undefined")
    document.documentElement.setAttribute("lang", l);
};

const replaceUrlLang = (l) => {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.set("lang", l);
  window.history.replaceState({}, "", url.toString());
};

/* ======================= i18n Nav ======================= */
/* ID */
const NAV_ID = [
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
    href: "/user/events?menu=events",
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
    href: "/user/mitra-dalam-negeri?menu=partners",
    matchers: [
      "/user/mitra-dalam-negeri", // NEW primary route
      "/user/partners", // legacy support
      "/user/form-mitra", // alias support if ever used
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
    href: "/user/blog?menu=blog",
    matchers: ["/user/blog", "/user/leads"],
  },
  {
    id: "about",
    label: "Tentang Kami",
    href: "/user/aboutus?menu=about",
    matchers: ["/user/aboutus", "/user/leads"],
  },
  {
    id: "career",
    label: "Karier Bersama Kami",
    href: "/user/career?menu=career",
    matchers: ["/user/career", "/user/leads"],
  },
];

/* EN */
const NAV_EN = [
  {
    id: "home",
    label: "Home",
    href: "/user/landing-page",
    matchers: ["/user/landing-page", "/user"],
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
    href: "/user/events?menu=events",
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
    href: "/user/mitra-dalam-negeri?menu=partners",
    matchers: [
      "/user/mitra-dalam-negeri", // NEW primary route
      "/user/partners", // legacy support
      "/user/form-mitra", // alias support
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

const normalizeMenuId = (m) => {
  const x = String(m || "").toLowerCase();
  if (x === "majors" || x === "jurusan") return "college";
  // Map various partner aliases to the same nav id
  if (["partners", "partner", "mitra", "mitra-dalam-negeri"].includes(x))
    return "partners";
  return x;
};

/* ======================= Hook ======================= */
export function useHeaderUViewModel() {
  const pathname = usePathname();
  const search = useSearchParams();

  const [isMenuOpen, setMenuOpen] = useState(false);

  // IMPORTANT: match server render first -> default "id"
  const [lang, setLang] = useState("id");
  const [mounted, setMounted] = useState(false);

  // After mount, read real lang from URL/localStorage and update.
  useEffect(() => {
    setMounted(true);
    try {
      const initial = getInitialLangClient();
      setLang(initial);
      setHtmlLang(initial);
      replaceUrlLang(initial);
      localStorage.setItem("oss.lang", initial);
    } catch {}
  }, []);

  // Persist + reflect when user changes language (only after mounted)
  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem("oss.lang", lang);
    setHtmlLang(lang);
    replaceUrlLang(lang);
  }, [lang, mounted]);

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
        if (isPathMatch(pathname, m) && m.length > bestLen) {
          activeId = item.id;
          bestLen = m.length;
        }
      }
    }

    const forcedRaw = search?.get("menu");
    const forced = normalizeMenuId(forcedRaw);
    if (forced) {
      const found = NAV_SRC.find((i) => i.id === forced);
      if (found) activeId = found.id;
    }

    return NAV_SRC.map((item) => ({ ...item, isActive: item.id === activeId }));
  }, [pathname, search, NAV_SRC]);

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
    langLabel: lang === "en" ? "Language" : "Bahasa",
  };
}
