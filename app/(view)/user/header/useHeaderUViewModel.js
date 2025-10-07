"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/* ================= helpers ================= */
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

function normalizeLang(val) {
  const normalized = (val || "").toString().toLowerCase();
  if (normalized === "en") return "en";
  if (normalized === "id") return "id";
  return null;
}

function setHtmlLang(l) {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("lang", l);
  }
}
function replaceUrlLang(l) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.set("lang", l);
  window.history.replaceState({}, "", url.toString());
}

/* ================= i18n nav ================= */
const NAV_ID = [
  {
    id: "home",
    href: "/user/landing-page",
    matchers: ["/user/landing-page", "/user"],
    isDefault: true,
    label: "Beranda",
  },
  {
    id: "layanan",
    href: "/user/layanan",
    matchers: [
      "/user/layanan",
      "/user/english-course",
      "/user/accommodation",
      "/user/overseas",
      "/user/visa-apply",
      "/user/document-translation",
      "/user/leads",
    ],
    label: "Layanan",
  },
  {
    id: "event",
    href: "/user/events?menu=events",
    matchers: ["/user/events", "/user/leads"],
    label: "Event",
  },
  {
    id: "partners",
    href: "/user/partners?menu=partners",
    matchers: ["/user/partners", "/user/leads"],
    label: "Mitra",
  },
  {
    id: "College",
    href: "/user/college",
    matchers: ["/user/college", "/user/leads"],
    label: "Kampus",
  },
  {
    id: "blog",
    href: "/user/blog?menu=blog",
    matchers: ["/user/blog", "/user/leads"],
    label: "Berita",
  },
  {
    id: "about",
    href: "/user/aboutus?menu=about",
    matchers: ["/user/aboutus", "/user/leads"],
    label: "Tentang Kami",
  },
  {
    id: "career",
    href: "/user/career?menu=career",
    matchers: ["/user/career", "/user/leads"],
    label: "Karier Bersama Kami",
  },
];

const NAV_EN = [
  {
    id: "home",
    href: "/user/landing-page",
    matchers: ["/user/landing-page", "/user"],
    isDefault: true,
    label: "Home",
  },
  {
    id: "layanan",
    href: "/user/layanan",
    matchers: [
      "/user/layanan",
      "/user/english-course",
      "/user/accommodation",
      "/user/overseas",
      "/user/visa-apply",
      "/user/document-translation",
      "/user/leads",
    ],
    label: "Services",
  },
  {
    id: "event",
    href: "/user/events?menu=events",
    matchers: ["/user/events", "/user/leads"],
    label: "Events",
  },
  {
    id: "partners",
    href: "/user/partners?menu=partners",
    matchers: ["/user/partners", "/user/leads"],
    label: "Partners",
  },
  {
    id: "College",
    href: "/user/college",
    matchers: ["/user/college", "/user/leads"],
    label: "College",
  },
  {
    id: "blog",
    href: "/user/blog?menu=blog",
    matchers: ["/user/blog", "/user/leads"],
    label: "Blog",
  },
  {
    id: "about",
    href: "/user/aboutus?menu=about",
    matchers: ["/user/aboutus", "/user/leads"],
    label: "About Us",
  },
  {
    id: "career",
    href: "/user/career?menu=career",
    matchers: ["/user/career", "/user/leads"],
    label: "Career With Us",
  },
];

const LANG_OPTIONS = [
  { value: "id", label: "Indonesia", flag: "/images/indonesia.png" },
  { value: "en", label: "English", flag: "/images/inggris.png" },
];

/* ================= hook ================= */
export function useHeaderUViewModel() {
  const pathname = usePathname();
  const search = useSearchParams();

  const initialQueryLang = useMemo(
    () => normalizeLang(search?.get("lang")),
    [search]
  );

  const [isMenuOpen, setMenuOpen] = useState(false);
  const [lang, setLang] = useState(() => initialQueryLang ?? "id");
  const [hasMounted, setHasMounted] = useState(false);
  const [langResolved, setLangResolved] = useState(false);
  const [lastQueryLang, setLastQueryLang] = useState(initialQueryLang);

  useEffect(() => setHasMounted(true), []);

  useEffect(() => {
    if (!hasMounted) return;

    const normalizedQuery = initialQueryLang;
    const queryChanged = normalizedQuery !== lastQueryLang;

    if (queryChanged) {
      setLastQueryLang(normalizedQuery);
      if (normalizedQuery) {
        if (normalizedQuery !== lang) {
          if (langResolved) {
            setLangResolved(false);
          }
          setLang(normalizedQuery);
          return;
        }
        if (!langResolved) {
          setLangResolved(true);
        }
        return;
      }
    }

    if (!langResolved && !normalizedQuery && typeof window !== "undefined") {
      const stored = normalizeLang(localStorage.getItem("oss.lang"));
      if (stored && stored !== lang) {
        setLang(stored);
        return;
      }
      setLangResolved(true);
      return;
    }

    if (!langResolved) {
      setLangResolved(true);
    }
  }, [hasMounted, initialQueryLang, lastQueryLang, lang, langResolved]);

  useEffect(() => {
    if (!hasMounted || !langResolved) return;
    if (typeof window !== "undefined") {
      localStorage.setItem("oss.lang", lang);
    }
    setHtmlLang(lang);
    replaceUrlLang(lang);
  }, [lang, hasMounted, langResolved]);

  // tutup menu saat ganti halaman
  useEffect(() => setMenuOpen(false), [pathname]);

  const changeLang = useCallback((val) => {
    setLang(val === "en" ? "en" : "id");
  }, []);

  const NAV_SRC = lang === "en" ? NAV_EN : NAV_ID;

  const navItems = useMemo(() => {
    // 1) aktif berdasarkan path terpanjang yang match
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

    // 2) override via ?menu=<navId>
    const forced = search?.get("menu");
    if (forced) {
      const found = NAV_SRC.find((i) => i.id === forced);
      if (found) activeId = found.id;
    }

    return NAV_SRC.map((item) => ({
      ...item,
      isActive: item.id === activeId,
    }));
  }, [pathname, search, NAV_SRC]);

  const logo =
    lang === "en"
      ? {
          src: "/images/loading.png",
          alt: "OSS Bali",
          href: "/user/landing-page",
        }
      : {
          src: "/images/loading.png",
          alt: "OSS Bali",
          href: "/user/landing-page",
        };

  const langLabel = lang === "en" ? "Language" : "Bahasa";

  return {
    logo,
    navItems,
    isMenuOpen,
    toggleMenu: () => setMenuOpen((s) => !s),
    closeMenu: () => setMenuOpen(false),

    // i18n
    lang,
    langs: LANG_OPTIONS,
    changeLang,
    langLabel,
  };
}
