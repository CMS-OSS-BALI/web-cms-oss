"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Skeleton } from "antd";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import "swiper/css";

import useOverseasViewModel from "./useOverseasViewModel";
import { sanitizeHtml } from "@/app/utils/dompurify";

/* ============================= */
/* Brand Palette (pusat kendali) */
const PALETTE = {
  primary: "#0B56C9",
  primaryDark: "#084A94",
  primaryDeep: "#063E7C",
  primarySoftA: "rgba(11,86,201,0.12)",
  primarySoftB: "rgba(11,86,201,0.08)",
  ink: "#0F172A",
  inkSoft: "#334155",
  white: "#FFFFFF",
  surface: "#F8FAFC",
  border: "#E5E7EB",
  shadowMain: "0 22px 44px rgba(11,86,201,.22)",
  shadowCard: "0 12px 28px rgba(15,23,42,.08)",
  shadowChip: "0 10px 24px rgba(11,86,201,.18)",
};

/* ===== Locale helper (client-side, konsisten dengan halaman lain) ===== */
const pickLocaleClient = (lang, ls, fallback = "id") => {
  const v = String(lang || ls || fallback)
    .slice(0, 2)
    .toLowerCase();
  return v === "en" ? "en" : "id";
};

function useRevealOnScroll(deps = []) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const prefersReduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const applyDelayVar = (el) => {
      const d = el.getAttribute("data-rvd");
      if (d) el.style.setProperty("--rvd", d);
    };

    const showAll = (nodes) => {
      nodes.forEach((el) => {
        applyDelayVar(el);
        el.classList.add("is-visible");
      });
    };

    if (prefersReduce) {
      showAll(Array.from(document.querySelectorAll(".reveal")));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            applyDelayVar(e.target);
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.16, rootMargin: "0px 0px -10% 0px" }
    );

    const observe = () =>
      document
        .querySelectorAll(".reveal:not(.is-visible)")
        .forEach((el) => io.observe(el));

    observe();

    const mo = new MutationObserver(observe);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, deps);
}

function useHeroParallax(ref) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = ref.current;
    if (!root) return;
    const prefersReduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const isDesktop = () => window.innerWidth >= 992;
    if (prefersReduce || !isDesktop()) return;
    const copy = root.querySelector(".js-hero-copy");
    if (!copy) return;
    const onMove = (e) => {
      const r = root.getBoundingClientRect();
      const cx = (e.clientX - r.left) / r.width - 0.5;
      const cy = (e.clientY - r.top) / r.height - 0.5;
      copy.style.transform = `translate3d(${cx * 6}px, ${cy * 6}px, 0)`;
    };
    const onLeave = () => {
      copy.style.transform = "";
    };
    root.addEventListener("mousemove", onMove);
    root.addEventListener("mouseleave", onLeave);
    return () => {
      root.removeEventListener("mousemove", onMove);
      root.removeEventListener("mouseleave", onLeave);
    };
  }, [ref]);
}

/* ============================= */
const FONT_FAMILY =
  '"Public Sans", system-ui, -apple-system, Segoe UI, Roboto, sans-serif';

const styles = {
  sectionInner: {
    width: "min(1360px, 96%)",
    margin: "0 auto",
    fontFamily: FONT_FAMILY,
  },

  /* ---------- HERO ---------- */
  hero: {
    wrapper: {
      background: PALETTE.primary,
      borderRadius: 28,
      borderTopRightRadius: 120,
      borderBottomLeftRadius: 120,
      minHeight: 380,
      padding: "38px 48px",
      marginTop: "-8px",
      display: "grid",
      gridTemplateColumns: "1.1fr .9fr",
      gap: 28,
      alignItems: "center",
      color: PALETTE.white,
      boxShadow: "0 24px 54px rgba(3, 30, 88, 0.28)",
      fontFamily: FONT_FAMILY,
      position: "relative",
      overflow: "hidden",
    },
    left: {
      minWidth: 0,
      textAlign: "left",
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      gap: 8,
    },
    right: { display: "flex", justifyContent: "center" },
    heading: {
      margin: 0,
      fontSize: 54,
      lineHeight: 1.06,
      fontWeight: 800,
      letterSpacing: ".2px",
      color: "#fff",
      textTransform: "uppercase",
    },
    tagline: {
      margin: "14px 0 0",
      fontSize: 17,
      lineHeight: 1.7,
      color: "rgba(255,255,255,.92)",
      textAlign: "left",
      maxWidth: 680,
    },
    artWrap: { width: "min(500px, 92%)", height: 320 },
    globe: {
      width: "100%",
      height: "100%",
      objectFit: "contain",
      filter: "drop-shadow(0 12px 24px rgba(0,0,0,.18))",
    },
  },

  /* ---------- DESCRIPTION ---------- */
  desc: {
    section: { padding: "0 0 16px" },
    wrap: { marginTop: 64 },
    title: {
      margin: "0 0 12px",
      fontFamily: FONT_FAMILY,
      fontWeight: 800,
      fontSize: 44,
      lineHeight: 1.1,
      color: "#0f172a",
      letterSpacing: "0.01em",
      textTransform: "uppercase",
    },
    bodyWrap: { marginTop: 8, maxWidth: 1900 },
    body: {
      fontFamily: FONT_FAMILY,
      fontSize: 18,
      lineHeight: 1.9,
      letterSpacing: "0.01em",
      color: "#0f172a",
      margin: 0,
      textAlign: "justify",
      overflowWrap: "anywhere",
      wordBreak: "break-word",
      hyphens: "auto",
    },
    cardMobile: {
      background: "#fff",
      border: `1px solid ${PALETTE.border}`,
      borderRadius: 16,
      boxShadow: "0 10px 24px rgba(15,23,42,.04)",
      padding: "14px 16px",
    },
  },

  /* ---------- STUDY (card di desain) ---------- */
  study: {
    section: { padding: "12px 0 28px", marginTop: "clamp(50px, 8vw, 100px)" },

    grid: {
      display: "flex",
      alignItems: "stretch",
      gap: 32,
    },

    imgWrap: {
      flex: "0 0 min(420px, 45%)",
      width: "100%",
      minHeight: "clamp(260px, 52vh, 520px)",
      height: "100%",
      borderRadius: 24,
      overflow: "hidden",
      border: "none",
      boxShadow: "0 22px 44px rgba(15,23,42,.16)",
      background: "#E4EDF9",
      objectFit: "cover",
      objectPosition: "center",
    },

    rightCol: {
      flex: "1 1 0",
      display: "flex",
      flexDirection: "column",
      height: "100%",
    },

    title: {
      margin: 0,
      fontFamily: FONT_FAMILY,
      fontWeight: 800,
      fontSize: "clamp(22px, 3.4vw, 38px)",
      color: PALETTE.primary,
      letterSpacing: ".01em",
    },
    text: {
      marginTop: 10,
      color: PALETTE.ink,
      lineHeight: 1.8,
      fontSize: "clamp(14px, 1.6vw, 18px)",
      letterSpacing: ".01em",
      maxWidth: 640,
      textAlign: "justify",
    },
    pillWrap: {
      marginTop: 18,
      display: "grid",
      gap: 12,
      gridTemplateColumns: "1fr",
    },
    pill: {
      width: "100%",
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "14px 20px",
      background: PALETTE.primary,
      color: PALETTE.white,
      borderRadius: 9999,
      border: `1px solid ${PALETTE.primaryDark}`,
      boxShadow: "0 12px 26px rgba(11,86,201,.26)",
      fontWeight: 700,
      fontSize: 16,
      letterSpacing: ".01em",
      minHeight: 64,
    },
    pillIconImg: {
      width: 28,
      height: 28,
      objectFit: "contain",
      flexShrink: 0,
    },
    pillLabel: {
      flex: 1,
      textAlign: "left",
      fontSize: 16,
    },
  },

  /* ---------- LEVEL KAMPUS SECTION (hero + slider card) ---------- */
  campus: {
    section: {
      padding: "clamp(40px, 6vw, 72px) 0 clamp(44px, 7vw, 84px)",
      background: "#ffffff",
    },
    header: {
      textAlign: "center",
      marginBottom: "clamp(20px, 4vw, 32px)",
    },
    heading: {
      margin: 0,
      fontFamily: FONT_FAMILY,
      fontWeight: 800,
      fontSize: "clamp(24px, 4.5vw, 34px)",
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: PALETTE.primary,
    },
    subtitle: {
      marginTop: 6,
      fontSize: 14,
      color: "#6b7280",
    },
    heroShell: {
      margin: "0 auto",
      marginTop: "clamp(18px, 3.4vw, 24px)",
      borderRadius: 20,
      overflow: "hidden",
      boxShadow: "0 22px 44px rgba(15,23,42,.26)",
      border: "1px solid rgba(15,23,42,0.08)",
      maxWidth: 1100,
    },
    heroInner: {
      position: "relative",
      height: "clamp(240px, 40vw, 360px)",
      backgroundColor: "#111827",
      isolation: "isolate",
    },
    heroBg: {
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      objectFit: "cover",
      transform: "scale(1.02)",
    },
    heroOverlay: {
      position: "absolute",
      inset: 0,
      background:
        "linear-gradient(90deg, rgba(0,0,0,.60) 0%, rgba(0,0,0,.35) 45%, rgba(0,0,0,.1) 80%, rgba(0,0,0,.45) 100%)",
      zIndex: 1,
    },
    heroContent: {
      position: "relative",
      zIndex: 2,
      height: "100%",
      padding: "clamp(18px, 3vw, 28px) clamp(24px, 4vw, 40px)",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      textAlign: "center",
      color: "#fff",
      gap: 10,
    },
    heroLevelText: {
      margin: 0,
      fontSize: 40,
      fontWeight: 700,
      letterSpacing: "0.18em",
      textTransform: "uppercase",
      color: "rgba(248,250,252,0.9)",
    },
    heroBadge: {
      display: "none",
    },
    heroTitle: {
      margin: 0,
      fontWeight: 800,
      fontSize: "clamp(26px, 5vw, 40px)",
      letterSpacing: "0.02em",
      textAlign: "center",
    },
    heroMeta: {
      margin: 0,
      fontSize: 13,
      fontWeight: 500,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      textAlign: "center",
    },
    heroStars: {
      display: "flex",
      gap: 3,
      fontSize: 14,
      color: "#FACC15",
    },
    desc: {
      marginTop: "clamp(16px, 3vw, 22px)",
      textAlign: "center",
      maxWidth: 800,
      marginInline: "auto",
      fontSize: 15,
      lineHeight: 1.7,
      color: "#111827",
    },
    cardsShell: {
      marginTop: "clamp(20px, 3vw, 30px)",
    },
  },

  /* ---------- PELUANG LUAR NEGERI ---------- */
  opportunity: {
    section: {
      padding: "clamp(24px, 5vw, 60px) 0 clamp(18px, 5vw, 60px)",
    },
    header: {
      textAlign: "center",
      marginBottom: "clamp(24px, 4vw, 40px)",
    },
    title: {
      margin: 0,
      fontFamily: FONT_FAMILY,
      fontWeight: 800,
      fontSize: "clamp(20px, 3.2vw, 26px)",
      color: PALETTE.primary,
      letterSpacing: "0.05em",
    },
    underline: {
      margin: "14px auto 0",
      width: 120,
      height: 3,
      borderRadius: 9999,
      background: PALETTE.primary,
    },
    rowCard: {
      background: "#F3F7FF",
      borderRadius: 28,
      padding: "clamp(22px, 3.2vw, 30px)",
      display: "flex",
      alignItems: "center",
      gap: 30,
      border: "1px solid rgba(148,163,184,0.45)",
      boxShadow: "0 18px 44px rgba(15,23,42,0.12)",
    },
    textCol: {
      flex: "1 1 0",
      display: "flex",
      flexDirection: "column",
      textAlign: "justify",
      justifyContent: "center",
    },
    cardTitle: {
      margin: 0,
      fontFamily: FONT_FAMILY,
      fontWeight: 800,
      fontSize: "clamp(18px, 2.6vw, 24px)",
      color: PALETTE.primary,
      marginBottom: 12,
    },
    cardText: {
      margin: 0,
      fontFamily: FONT_FAMILY,
      fontSize: 14,
      lineHeight: 1.85,
      color: PALETTE.inkSoft,
      maxWidth: 620,
    },
    imgCol: {
      flex: "0 0 min(320px, 40%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    img: {
      width: "100%",
      height: "100%",
      maxWidth: 360,
      objectFit: "cover",
      borderRadius: 24,
    },
  },

  /* ---------- RUTE CERDAS FLOWCHART ---------- */
  route: {
    section: {
      padding: "clamp(18px, 4vw, 50px) 0 clamp(24px, 5vw, 64px)",
    },
    header: {
      textAlign: "center",
      marginBottom: "clamp(18px, 3.4vw, 28px)",
    },
    title: {
      margin: 0,
      fontFamily: FONT_FAMILY,
      fontWeight: 800,
      fontSize: "clamp(20px, 3vw, 26px)",
      color: PALETTE.primary,
      letterSpacing: "0.05em",
      textTransform: "uppercase",
    },
    underline: {
      margin: "12px auto 0",
      width: 220,
      height: 3,
      borderRadius: 9999,
      background: PALETTE.primary,
    },
    imgWrap: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    },
    img: {
      width: "100%",
      maxWidth: 820,
      height: "auto",
      display: "block",
    },
  },

  /* ---------- CTA KONSULTASI ---------- */
  cta: {
    section: {
      padding: "clamp(20px, 5vw, 40px) 0 clamp(32px, 6vw, 56px)",
    },
    shell: {
      position: "relative",
      borderRadius: 24,
      overflow: "hidden",
      background:
        "linear-gradient(90deg, #e9f3ff 0%, #d4ecff 36%, #9edcff 100%)",
      boxShadow: "0 20px 44px rgba(15,23,42,0.16)",
    },
    leftRail: {
      position: "absolute",
      top: 0,
      left: 0,
      bottom: 0,
      width: 18,
      background: PALETTE.primaryDark,
    },
    inner: {
      position: "relative",
      padding: "clamp(18px, 3vw, 26px) clamp(24px, 4vw, 42px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
    },
    text: {
      margin: 0,
      fontFamily: FONT_FAMILY,
      fontWeight: 700,
      fontSize: "clamp(16px, 2.1vw, 20px)",
      color: PALETTE.primaryDeep,
      maxWidth: 760,
    },
    buttonWrap: {
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-end",
      flexShrink: 0,
    },
    button: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "10px 26px",
      borderRadius: 9999,
      background: PALETTE.primary,
      color: "#fff",
      fontWeight: 600,
      fontSize: 14,
      border: "none",
      outline: "none",
      textDecoration: "none",
      boxShadow: "0 12px 26px rgba(11,86,201,0.32)",
      cursor: "pointer",
      whiteSpace: "nowrap",
      minWidth: 140,
    },
  },
};

function Img({ src, alt, style, className, ...rest }) {
  return (
    <img
      src={src}
      alt={alt || ""}
      title={alt || ""}
      className={className}
      style={style}
      loading="lazy"
      {...rest}
      onError={(e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src =
          "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=1200&auto=format&fit=crop";
      }}
    />
  );
}

export default function OverseasContent({
  initialLocale = "id",
  locale: localeProp,
} = {}) {
  const search = useSearchParams();

  // baseLocale = seed dari server (initialLocale) atau prop override
  const baseLocale = localeProp || initialLocale || "id";

  // Locale final: ?lang= → localStorage → baseLocale
  const locale = useMemo(() => {
    const fromQuery = search?.get("lang") || "";
    const fromLs =
      typeof window !== "undefined"
        ? window.localStorage.getItem("oss.lang") || ""
        : "";
    return pickLocaleClient(fromQuery || baseLocale, fromLs);
  }, [search, baseLocale]);

  // Persist locale ke localStorage supaya dipakai halaman lain
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("oss.lang", locale);
      } catch {
        // ignore
      }
    }
  }, [locale]);

  const heroRef = useRef(null);
  const { content, isLoading } = useOverseasViewModel({ locale });

  const hero = content.hero || {};
  const levelCampus = content.levelCampus || null;
  const polyLevel = content.polytechnicLevel || null;
  const collegeLevel = content.collegeLevel || null; // LEVEL III
  const opportunity = content.opportunitySection || null;
  const opportunityRows = opportunity?.rows || [];
  const cta = content.ctaSection || null;

  const isEn = String(locale).slice(0, 2).toLowerCase() === "en";

  const safeDescription = useMemo(
    () =>
      sanitizeHtml(content.description || "", {
        allowedTags: [
          "b",
          "strong",
          "i",
          "em",
          "u",
          "a",
          "br",
          "ul",
          "ol",
          "li",
          "p",
        ],
      }),
    [content.description]
  );

  const [isNarrow, setIsNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 960px)");
    const update = () => setIsNarrow(mq.matches);
    update();
    mq.addEventListener
      ? mq.addEventListener("change", update)
      : mq.addListener(update);
    return () => {
      mq.removeEventListener
        ? mq.removeEventListener("change", update)
        : mq.removeListener(update);
    };
  }, []);

  useRevealOnScroll([isLoading]);
  useHeroParallax(heroRef);

  const sectionInnerStyle = useMemo(
    () => ({
      ...styles.sectionInner,
      width: isNarrow ? "100%" : "min(1360px, 96%)",
    }),
    [isNarrow]
  );

  const heroWrapperStyle = useMemo(
    () => ({
      ...styles.hero.wrapper,
      gridTemplateColumns: isNarrow ? "1fr" : "1.1fr .9fr",
      padding: isNarrow ? "28px 24px" : "38px 48px",
      minHeight: isNarrow ? 340 : 380,
      marginTop: isNarrow ? "-6px" : "-8px",
    }),
    [isNarrow]
  );
  const heroHeadingStyle = useMemo(
    () => ({ ...styles.hero.heading, fontSize: isNarrow ? 38 : 54 }),
    [isNarrow]
  );
  const heroArtStyle = useMemo(
    () => ({
      ...styles.hero.artWrap,
      width: isNarrow ? "100%" : "min(500px, 92%)",
      height: isNarrow ? 220 : 320,
    }),
    [isNarrow]
  );

  /* Study responsive tweaks (FLEX) */
  const studyGridStyle = useMemo(
    () => ({
      ...styles.study.grid,
      ...(isNarrow
        ? { flexDirection: "column", gap: 20 }
        : { flexDirection: "row" }),
    }),
    [isNarrow]
  );

  const studyImageStyle = useMemo(
    () => ({
      ...styles.study.imgWrap,
      ...(isNarrow
        ? {
            flex: "1 1 auto",
            minHeight: "clamp(220px, 55vw, 380px)",
          }
        : {}),
    }),
    [isNarrow]
  );

  const studyRightColStyle = useMemo(
    () => ({
      ...styles.study.rightCol,
      ...(isNarrow ? { flex: "1 1 auto", marginTop: 18 } : {}),
    }),
    [isNarrow]
  );

  const studyPillWrapStyle = useMemo(
    () => ({
      ...styles.study.pillWrap,
      ...(isNarrow ? { gap: 10 } : {}),
    }),
    [isNarrow]
  );
  const studyPillStyle = useMemo(
    () => ({
      ...styles.study.pill,
      ...(isNarrow
        ? { minHeight: 56, padding: "12px 16px", fontSize: 15 }
        : {}),
    }),
    [isNarrow]
  );

  const studMagTitleStyle = useMemo(
    () => ({
      ...styles.study.title,
      ...(isNarrow ? { textAlign: "center" } : {}),
    }),
    [isNarrow]
  );
  const studMagTextStyle = useMemo(
    () => ({
      ...styles.study.text,
      ...(isNarrow ? { textAlign: "left" } : {}),
    }),
    [isNarrow]
  );

  const descTitleStyle = useMemo(
    () => ({ ...styles.desc.title, fontSize: isNarrow ? 30 : 44 }),
    [isNarrow]
  );

  const descBodyStyle = useMemo(
    () => ({
      ...styles.desc.body,
      maxWidth: "unset",
      ...(isNarrow
        ? { textAlign: "left", fontSize: 16, lineHeight: 1.85 }
        : {}),
    }),
    [isNarrow]
  );

  const descBodyWrapStyle = useMemo(
    () => ({
      ...styles.desc.bodyWrap,
      ...(isNarrow ? styles.desc.cardMobile : {}),
    }),
    [isNarrow]
  );

  /* Level I – Universitas slider config */
  const levelCards = levelCampus?.cards || [];
  const levelLoop = levelCards.length > 4;
  const levelAutoplay = useMemo(
    () =>
      levelLoop
        ? {
            delay: 0,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
            waitForTransition: false,
          }
        : false,
    [levelLoop]
  );
  const levelSpeed = useMemo(
    () => Math.max(5000, Math.min(14000, Math.max(1, levelCards.length) * 900)),
    [levelCards.length]
  );

  /* Level II – Politeknik slider config */
  const polyCards = polyLevel?.cards || [];
  const polyLoop = polyCards.length > 4;
  const polyAutoplay = useMemo(
    () =>
      polyLoop
        ? {
            delay: 0,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
            waitForTransition: false,
          }
        : false,
    [polyLoop]
  );
  const polySpeed = useMemo(
    () => Math.max(5000, Math.min(14000, Math.max(1, polyCards.length) * 900)),
    [polyCards.length]
  );

  /* Level III – College slider config */
  const collegeCards = collegeLevel?.cards || [];
  const collegeLoop = collegeCards.length > 4;
  const collegeAutoplay = useMemo(
    () =>
      collegeLoop
        ? {
            delay: 0,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
            waitForTransition: false,
          }
        : false,
    [collegeLoop]
  );
  const collegeSpeed = useMemo(
    () =>
      Math.max(5000, Math.min(14000, Math.max(1, collegeCards.length) * 900)),
    [collegeCards.length]
  );

  const opportunityRow1Style = useMemo(
    () => ({
      ...styles.opportunity.rowCard,
      flexDirection: isNarrow ? "column" : "row",
    }),
    [isNarrow]
  );

  const opportunityRow2Style = useMemo(
    () => ({
      ...styles.opportunity.rowCard,
      flexDirection: isNarrow ? "column-reverse" : "row",
      marginTop: isNarrow ? 18 : 26,
    }),
    [isNarrow]
  );

  const opportunityTextColStyle = useMemo(
    () => ({
      ...styles.opportunity.textCol,
      ...(isNarrow ? { alignItems: "flex-start" } : {}),
    }),
    [isNarrow]
  );

  const opportunityImgColStyle = useMemo(
    () => ({
      ...styles.opportunity.imgCol,
      ...(isNarrow ? { width: "100%", flex: "0 0 auto", marginTop: 8 } : {}),
    }),
    [isNarrow]
  );

  /* CTA responsive */
  const ctaInnerStyle = useMemo(
    () => ({
      ...styles.cta.inner,
      flexDirection: isNarrow ? "column" : "row",
      alignItems: isNarrow ? "flex-start" : "center",
    }),
    [isNarrow]
  );

  const ctaTextStyle = useMemo(
    () => ({
      ...styles.cta.text,
      textAlign: isNarrow ? "left" : "left",
    }),
    [isNarrow]
  );

  const ctaButtonWrapStyle = useMemo(
    () => ({
      ...styles.cta.buttonWrap,
      justifyContent: isNarrow ? "flex-start" : "flex-end",
      width: isNarrow ? "100%" : "auto",
    }),
    [isNarrow]
  );

  return (
    <main
      className="page-wrap overseas-page"
      style={{ paddingBottom: 48, fontFamily: FONT_FAMILY }}
    >
      {/* ===== HERO ===== */}
      <section style={{ padding: "0 0 24px" }}>
        <div style={sectionInnerStyle}>
          <div
            style={heroWrapperStyle}
            ref={heroRef}
            className="reveal"
            data-anim="zoom"
          >
            <div
              style={styles.hero.left}
              className="reveal js-hero-copy"
              data-anim="left"
            >
              {isLoading ? (
                <Skeleton active paragraph={{ rows: 2 }} />
              ) : (
                <>
                  <h1
                    className="reveal"
                    data-anim="down"
                    style={heroHeadingStyle}
                  >
                    {hero.title}
                  </h1>
                  {hero.subtitle ? (
                    <p
                      className="reveal"
                      data-anim="up"
                      style={styles.hero.tagline}
                    >
                      {hero.subtitle}
                    </p>
                  ) : null}
                </>
              )}
            </div>

            <div
              style={styles.hero.right}
              className="reveal"
              data-anim="right"
              aria-hidden
            >
              {isLoading ? (
                <Skeleton.Image
                  active
                  style={{ width: "100%", height: 240, borderRadius: 18 }}
                />
              ) : hero.illustration ? (
                <div style={heroArtStyle}>
                  <Img
                    src={hero.illustration}
                    alt={
                      isEn
                        ? "Overseas study illustration"
                        : "Ilustrasi studi luar negeri"
                    }
                    style={styles.hero.globe}
                  />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* ===== DESCRIPTION ===== */}
      <section style={styles.desc.section}>
        <div style={sectionInnerStyle}>
          <div style={styles.desc.wrap}>
            <h2 className="reveal" data-anim="down" style={descTitleStyle}>
              {isEn ? "Program Description" : "Deskripsi Program"}
            </h2>
            <div style={descBodyWrapStyle}>
              {isLoading ? (
                <Skeleton active paragraph={{ rows: 4 }} />
              ) : (
                <div
                  className="reveal desc-content"
                  data-anim="up"
                  style={descBodyStyle}
                  dangerouslySetInnerHTML={{ __html: safeDescription }}
                />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ===== STUDI DI LUAR NEGERI ===== */}
      <section style={styles.study.section}>
        <div style={sectionInnerStyle}>
          <div style={studyGridStyle}>
            <Img
              className="reveal"
              data-anim="left"
              data-rvd="40ms"
              src={content.studySection?.image}
              alt={isEn ? "Studying abroad" : "Pendidikan di luar negeri"}
              style={studyImageStyle}
            />

            <div style={studyRightColStyle}>
              <h2
                className="reveal"
                data-anim="right"
                data-rvd="80ms"
                style={studMagTitleStyle}
              >
                {content.studySection?.title}
              </h2>
              <p
                className="reveal"
                data-anim="up"
                data-rvd="120ms"
                style={studMagTextStyle}
              >
                {content.studySection?.text}
              </p>

              <div
                className="reveal"
                data-anim="zoom"
                data-rvd="180ms"
                style={studyPillWrapStyle}
              >
                {(content.studySection?.pills || []).map((p, i) => (
                  <div
                    key={p.id || i}
                    className="pill-item"
                    style={studyPillStyle}
                  >
                    <Img
                      src={p.icon}
                      alt={p.label}
                      style={styles.study.pillIconImg}
                    />
                    <span style={styles.study.pillLabel}>{p.label}</span>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: "auto" }} />
            </div>
          </div>
        </div>
      </section>

      {/* ===== LEVEL I – UNIVERSITAS ===== */}
      {levelCampus && (
        <section style={styles.campus.section}>
          <div style={sectionInnerStyle}>
            <div
              style={styles.campus.header}
              className="reveal"
              data-anim="down"
            >
              <h2 style={styles.campus.heading}>{levelCampus.heading}</h2>
              <p style={styles.campus.subtitle}>{levelCampus.subtitle}</p>
            </div>

            <div
              className="reveal"
              data-anim="zoom"
              data-rvd="60ms"
              style={styles.campus.heroShell}
            >
              <div style={styles.campus.heroInner}>
                {levelCampus.hero?.background && (
                  <Img
                    src={levelCampus.hero.background}
                    alt={levelCampus.hero.title}
                    style={styles.campus.heroBg}
                  />
                )}
                <div style={styles.campus.heroOverlay} />
                <div style={styles.campus.heroContent}>
                  <p style={styles.campus.heroLevelText}>LEVEL I</p>
                  <h3 style={styles.campus.heroTitle}>
                    {levelCampus.hero?.title}
                  </h3>
                  <p style={styles.campus.heroMeta}>
                    <span>{levelCampus.hero?.label}</span>
                    <span style={styles.campus.heroStars} aria-hidden="true">
                      {Array.from({
                        length: levelCampus.hero?.rating || 0,
                      }).map((_, i) => (
                        <span key={i}>★</span>
                      ))}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {levelCampus.description && (
              <p
                className="reveal"
                data-anim="up"
                data-rvd="120ms"
                style={styles.campus.desc}
              >
                {levelCampus.description}
              </p>
            )}

            {levelCards.length > 0 && (
              <div style={styles.campus.cardsShell}>
                <div
                  className="reveal"
                  data-anim="up"
                  data-rvd="160ms"
                  style={{ width: "100%" }}
                >
                  <Swiper
                    className="level-campus-swiper"
                    modules={[Autoplay]}
                    slidesPerView="auto"
                    spaceBetween={16}
                    loop={levelLoop}
                    loopAdditionalSlides={
                      levelLoop ? Math.max(10, levelCards.length) : 0
                    }
                    speed={levelSpeed}
                    allowTouchMove
                    autoplay={levelAutoplay}
                    observer
                    observeParents
                    watchSlidesProgress
                  >
                    {levelCards.map((card, idx) => (
                      <SwiperSlide
                        key={card.id || idx}
                        style={{ width: "var(--level-card-w)" }}
                      >
                        <article className="level-kampus-card">
                          <img
                            className="level-kampus-icon"
                            src={card.icon}
                            alt={card.title}
                            title={card.title}
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.src =
                                "/images/placeholder-icon.png";
                            }}
                          />
                          <h4 className="level-kampus-title">{card.title}</h4>
                          <p className="level-kampus-desc">{card.desc}</p>
                        </article>
                      </SwiperSlide>
                    ))}
                  </Swiper>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ===== LEVEL II – POLITEKNIK ===== */}
      {polyLevel && (
        <section
          style={{
            ...styles.campus.section,
            paddingTop: 0,
          }}
        >
          <div style={sectionInnerStyle}>
            <div
              style={styles.campus.header}
              className="reveal"
              data-anim="down"
            >
              <h2 style={styles.campus.heading}>{polyLevel.heading}</h2>
              <p style={styles.campus.subtitle}>{polyLevel.subtitle}</p>
            </div>

            <div
              className="reveal"
              data-anim="zoom"
              data-rvd="60ms"
              style={styles.campus.heroShell}
            >
              <div style={styles.campus.heroInner}>
                {polyLevel.hero?.background && (
                  <Img
                    src={polyLevel.hero.background}
                    alt={polyLevel.hero.title}
                    style={styles.campus.heroBg}
                  />
                )}
                <div style={styles.campus.heroOverlay} />
                <div style={styles.campus.heroContent}>
                  <p style={styles.campus.heroLevelText}>LEVEL II</p>
                  <h3 style={styles.campus.heroTitle}>
                    {polyLevel.hero?.title}
                  </h3>
                  <p style={styles.campus.heroMeta}>
                    <span>{polyLevel.hero?.label}</span>
                    <span style={styles.campus.heroStars} aria-hidden="true">
                      {Array.from({
                        length: polyLevel.hero?.rating || 0,
                      }).map((_, i) => (
                        <span key={i}>★</span>
                      ))}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {polyLevel.description && (
              <p
                className="reveal"
                data-anim="up"
                data-rvd="120ms"
                style={styles.campus.desc}
              >
                {polyLevel.description}
              </p>
            )}

            {polyCards.length > 0 && (
              <div style={styles.campus.cardsShell}>
                <div
                  className="reveal"
                  data-anim="up"
                  data-rvd="160ms"
                  style={{ width: "100%" }}
                >
                  <Swiper
                    className="level-campus-swiper"
                    modules={[Autoplay]}
                    slidesPerView="auto"
                    spaceBetween={16}
                    loop={polyLoop}
                    loopAdditionalSlides={
                      polyLoop ? Math.max(10, polyCards.length) : 0
                    }
                    speed={polySpeed}
                    allowTouchMove
                    autoplay={polyAutoplay}
                    observer
                    observeParents
                    watchSlidesProgress
                  >
                    {polyCards.map((card, idx) => (
                      <SwiperSlide
                        key={card.id || idx}
                        style={{ width: "var(--level-card-w)" }}
                      >
                        <article className="level-kampus-card">
                          <img
                            className="level-kampus-icon"
                            src={card.icon}
                            alt={card.title}
                            title={card.title}
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.src =
                                "/images/placeholder-icon.png";
                            }}
                          />
                          <h4 className="level-kampus-title">{card.title}</h4>
                          <p className="level-kampus-desc">{card.desc}</p>
                        </article>
                      </SwiperSlide>
                    ))}
                  </Swiper>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ===== LEVEL III – COLLEGE ===== */}
      {collegeLevel && (
        <section
          style={{
            ...styles.campus.section,
            paddingTop: 0,
          }}
        >
          <div style={sectionInnerStyle}>
            <div
              style={styles.campus.header}
              className="reveal"
              data-anim="down"
            >
              <h2 style={styles.campus.heading}>{collegeLevel.heading}</h2>
              <p style={styles.campus.subtitle}>{collegeLevel.subtitle}</p>
            </div>

            <div
              className="reveal"
              data-anim="zoom"
              data-rvd="60ms"
              style={styles.campus.heroShell}
            >
              <div style={styles.campus.heroInner}>
                {collegeLevel.hero?.background && (
                  <Img
                    src={collegeLevel.hero.background}
                    alt={collegeLevel.hero.title}
                    style={styles.campus.heroBg}
                  />
                )}
                <div style={styles.campus.heroOverlay} />
                <div style={styles.campus.heroContent}>
                  <p style={styles.campus.heroLevelText}>LEVEL III</p>
                  <h3 style={styles.campus.heroTitle}>
                    {collegeLevel.hero?.title}
                  </h3>
                  <p style={styles.campus.heroMeta}>
                    <span>{collegeLevel.hero?.label}</span>
                    <span style={styles.campus.heroStars} aria-hidden="true">
                      {Array.from({
                        length: collegeLevel.hero?.rating || 0,
                      }).map((_, i) => (
                        <span key={i}>★</span>
                      ))}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {collegeLevel.description && (
              <p
                className="reveal"
                data-anim="up"
                data-rvd="120ms"
                style={styles.campus.desc}
              >
                {collegeLevel.description}
              </p>
            )}

            {collegeCards.length > 0 && (
              <div style={styles.campus.cardsShell}>
                <div
                  className="reveal"
                  data-anim="up"
                  data-rvd="160ms"
                  style={{ width: "100%" }}
                >
                  <Swiper
                    className="level-campus-swiper"
                    modules={[Autoplay]}
                    slidesPerView="auto"
                    spaceBetween={16}
                    loop={collegeLoop}
                    loopAdditionalSlides={
                      collegeLoop ? Math.max(10, collegeCards.length) : 0
                    }
                    speed={collegeSpeed}
                    allowTouchMove
                    autoplay={collegeAutoplay}
                    observer
                    observeParents
                    watchSlidesProgress
                  >
                    {collegeCards.map((card, idx) => (
                      <SwiperSlide
                        key={card.id || idx}
                        style={{ width: "var(--level-card-w)" }}
                      >
                        <article className="level-kampus-card">
                          <img
                            className="level-kampus-icon"
                            src={card.icon}
                            alt={card.title}
                            title={card.title}
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.src =
                                "/images/placeholder-icon.png";
                            }}
                          />
                          <h4 className="level-kampus-title">{card.title}</h4>
                          <p className="level-kampus-desc">{card.desc}</p>
                        </article>
                      </SwiperSlide>
                    ))}
                  </Swiper>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ===== PELUANG DI LUAR NEGERI ===== */}
      {opportunity && opportunityRows.length > 0 && (
        <section style={styles.opportunity.section}>
          <div style={sectionInnerStyle}>
            <div
              className="reveal"
              data-anim="down"
              style={styles.opportunity.header}
            >
              <h2 style={styles.opportunity.title}>{opportunity.heading}</h2>
              <div style={styles.opportunity.underline} />
            </div>

            {/* Row 1: teks kiri, gambar kanan (mobile: gambar di bawah) */}
            {opportunityRows[0] && (
              <div
                className="reveal"
                data-anim="up"
                data-rvd="40ms"
                style={opportunityRow1Style}
              >
                <div style={opportunityTextColStyle}>
                  <h3 style={styles.opportunity.cardTitle}>
                    {opportunityRows[0].title}
                  </h3>
                  <p style={styles.opportunity.cardText}>
                    {opportunityRows[0].text}
                  </p>
                </div>

                <div style={opportunityImgColStyle}>
                  <Img
                    src={opportunityRows[0].image}
                    alt={opportunityRows[0].title}
                    style={styles.opportunity.img}
                  />
                </div>
              </div>
            )}

            {/* Row 2: desktop gambar kiri, teks kanan; mobile teks atas, gambar bawah */}
            {opportunityRows[1] && (
              <div
                className="reveal"
                data-anim="up"
                data-rvd="120ms"
                style={opportunityRow2Style}
              >
                <div style={opportunityImgColStyle}>
                  <Img
                    src={opportunityRows[1].image}
                    alt={opportunityRows[1].title}
                    style={styles.opportunity.img}
                  />
                </div>

                <div style={opportunityTextColStyle}>
                  <h3 style={styles.opportunity.cardTitle}>
                    {opportunityRows[1].title}
                  </h3>
                  <p style={styles.opportunity.cardText}>
                    {opportunityRows[1].text}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ===== RUTE CERDAS MENUJU KAMPUS & KARIR LUAR NEGERI ===== */}
      <section style={styles.route.section}>
        <div style={sectionInnerStyle}>
          <div className="reveal" data-anim="down" style={styles.route.header}>
            <h2 style={styles.route.title}>
              {isEn
                ? "Smart Route to Overseas Campus and Career"
                : "Rute Cerdas Menuju Kampus dan Karir Luar Negeri"}
            </h2>
            <div style={styles.route.underline} />
          </div>

          <div
            className="reveal"
            data-anim="up"
            data-rvd="80ms"
            style={styles.route.imgWrap}
          >
            <Img
              src="/overseas/rute-cerdas-flowchart.svg"
              alt={
                isEn
                  ? "Flowchart of smart route to overseas campus and career"
                  : "Flowchart rute cerdas menuju kampus dan karir luar negeri"
              }
              style={styles.route.img}
            />
          </div>
        </div>
      </section>

      {/* ===== CTA KONSULTASI ===== */}
      {cta && (
        <section style={styles.cta.section}>
          <div style={sectionInnerStyle}>
            <div
              className="reveal"
              data-anim="up"
              data-rvd="80ms"
              style={styles.cta.shell}
            >
              <div style={styles.cta.leftRail} aria-hidden="true" />
              <div style={ctaInnerStyle}>
                <p style={ctaTextStyle}>{cta.title}</p>
                <div style={ctaButtonWrapStyle}>
                  <a
                    href={cta.buttonHref || "#"}
                    className="cta-consult-button"
                    style={styles.cta.button}
                  >
                    {cta.buttonLabel}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ===== GLOBAL STYLES ===== */}
      <style jsx global>{`
        ::selection {
          background: ${PALETTE.primary};
          color: ${PALETTE.white};
        }

        /* Reveal utilities */
        .reveal {
          opacity: 0;
          transform: var(--reveal-from, translate3d(0, 16px, 0));
          transition: opacity 680ms ease,
            transform 680ms cubic-bezier(0.21, 1, 0.21, 1);
          transition-delay: var(--rvd, 0ms);
          will-change: opacity, transform;
        }
        .reveal[data-anim="up"] {
          --reveal-from: translate3d(0, 18px, 0);
        }
        .reveal[data-anim="down"] {
          --reveal-from: translate3d(0, -18px, 0);
        }
        .reveal[data-anim="left"] {
          --reveal-from: translate3d(-18px, 0, 0);
        }
        .reveal[data-anim="right"] {
          --reveal-from: translate3d(18px, 0, 0);
        }
        .reveal[data-anim="zoom"] {
          --reveal-from: scale(0.96);
        }
        .reveal.is-visible {
          opacity: 1;
          transform: none;
        }

        .desc-content p {
          margin: 10px 0 0;
        }
        .desc-content p + p {
          margin-top: 10px;
        }
        .desc-content ul,
        .desc-content ol {
          margin: 10px 0 0;
          padding-left: 1.25rem;
        }
        .desc-content li {
          margin: 6px 0;
        }
        .desc-content a {
          color: ${PALETTE.primary};
          text-decoration: underline;
          text-underline-offset: 2px;
          text-decoration-thickness: 1.5px;
        }
        .desc-content img {
          max-width: 100%;
          height: auto;
          border-radius: 12px;
          margin: 10px 0;
        }

        @media (prefers-reduced-motion: reduce) {
          .reveal {
            transition: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
          .pill-item {
            transform: none !important;
          }
        }

        @media (hover: hover) {
          .pill-item {
            transition: transform 0.18s ease, filter 0.18s ease;
          }
          .pill-item:hover {
            transform: translateY(-2px);
            filter: saturate(1.06);
          }
        }

        /* CTA button hover/focus */
        .cta-consult-button {
          transition: transform 0.16s ease, box-shadow 0.16s ease,
            background-color 0.16s ease;
        }
        .cta-consult-button:hover {
          background-color: ${PALETTE.primaryDark};
          box-shadow: 0 16px 30px rgba(11, 86, 201, 0.4);
          transform: translateY(-1px);
        }
        .cta-consult-button:active {
          transform: translateY(0);
          box-shadow: 0 8px 18px rgba(11, 86, 201, 0.3);
        }
        .cta-consult-button:focus-visible {
          outline: 2px solid #eff6ff;
          outline-offset: 2px;
        }

        /* ===== Level Kampus Swiper (dipakai Level I, II, III) ===== */
        :root {
          --level-card-w: clamp(220px, 24vw, 260px);
        }

        .level-campus-swiper {
          overflow: visible;
          padding-block: 4px;
        }

        .level-campus-swiper .swiper-wrapper {
          transition-timing-function: linear !important;
          align-items: stretch;
        }

        .level-campus-swiper .swiper-slide {
          width: var(--level-card-w);
          height: auto;
          display: flex;
        }

        .level-kampus-card {
          width: 100%;
          height: 100%;
          min-height: 200px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          text-align: center;
          padding: 18px 18px 20px;
          border-radius: 22px;
          background: radial-gradient(
              140% 120% at -10% -10%,
              rgba(255, 255, 255, 0.28) 0%,
              transparent 45%
            ),
            linear-gradient(180deg, #0b56c9 0%, #084a94 55%, #063e7c 100%);
          box-shadow: 0 18px 34px rgba(8, 42, 116, 0.38);
          color: #fff;
        }

        /* 🔎 Ikon diperbesar */
        .level-kampus-icon {
          width: 128px;
          height: 128px;
          object-fit: contain;
          display: block;
          margin-bottom: 14px;
        }

        .level-kampus-title {
          margin: 0 0 6px 0;
          font-weight: 800;
          font-size: 15px;
          letter-spacing: 0.02em;
        }

        .level-kampus-desc {
          margin: 0;
          font-size: 13px;
          line-height: 1.6;
          color: rgba(241, 245, 255, 0.92);
        }

        /* ✨ Hover: card sedikit membesar */
        @media (hover: hover) {
          .level-kampus-card {
            transition: transform 0.18s ease, box-shadow 0.18s ease,
              filter 0.18s ease;
          }
          .level-kampus-card:hover {
            transform: translateY(-4px) scale(1.04);
            filter: saturate(1.08);
            box-shadow: 0 24px 44px rgba(8, 42, 116, 0.45);
          }
        }

        @media (max-width: 767px) {
          .level-kampus-card {
            padding: 14px 14px 16px;
          }

          /* Ikon tetap lebih besar di mobile tapi tidak kebesaran */
          .level-kampus-icon {
            width: 92px;
            height: 92px;
          }
        }

        /* Anti horizontal scroll hanya di halaman ini */
        .overseas-page {
          overflow-x: hidden;
        }
        @supports (overflow: clip) {
          .overseas-page {
            overflow-x: clip;
          }
        }
      `}</style>
    </main>
  );
}
