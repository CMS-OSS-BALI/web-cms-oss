"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import useCollegeViewModel from "./useCollegeViewModel";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, FreeMode } from "swiper/modules";
import "swiper/css";
import "swiper/css/free-mode";

/* Ant Design Pagination */
import { Pagination } from "antd";
import "antd/dist/reset.css";

/* ================= HERO ================= */
const styles = {
  hero: { marginTop: "calc(-1 * clamp(48px, 8vw, 84px))", background: "#fff" },
  heroBleed: { width: "100vw", marginLeft: "calc(50% - 50vw)" },
  heroImgFrame: {
    position: "relative",
    width: "100vw",
    height: "clamp(720px, 100vh, 1280px)",
    background: "#e8f0ff",
    overflow: "hidden",
    boxShadow: "0 24px 48px rgba(15,23,42,.14)",
  },
  heroOverlay: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(100deg, rgba(11,35,76,.55) 0%, rgba(11,35,76,.35) 35%, rgba(11,35,76,.18) 60%, rgba(11,35,76,0) 85%)",
    zIndex: 1,
  },
  heroContentLeft: {
    position: "absolute",
    left: "max(24px, 6vw)",
    top: "50%",
    transform: "translateY(-50%)",
    maxWidth: 720,
    textAlign: "left",
    zIndex: 2,
  },
  heroTitle: {
    margin: 0,
    color: "#2456b7",
    lineHeight: 1.02,
    fontWeight: 800,
    letterSpacing: ".6px",
    textTransform: "uppercase",
    fontSize: "clamp(36px, 6.2vw, 96px)",
  },
};

/* ========== FIND YOUR PROGRAM (Full Bleed Title) ========== */
const findStyles = {
  bleed: {
    width: "100vw",
    marginLeft: "calc(50% - 50vw)",
    marginRight: "calc(50% - 50vw)",
    background: "linear-gradient(90deg, #E6F3FF 0%, #F5FAFF 35%, #FFFFFF 70%)",
  },
  section: {
    position: "relative",
    padding: "clamp(32px, 6vw, 80px) 16px",
    overflow: "hidden",
  },
  inner: { width: "min(1180px, 92%)", margin: "0 auto", textAlign: "center" },
  title: {
    margin: 0,
    lineHeight: 1.1,
    fontWeight: 900,
    letterSpacing: ".06em",
    textTransform: "uppercase",
    fontSize: "clamp(22px, 4.6vw, 54px)",
    backgroundImage: "linear-gradient(180deg, #1F4EA3 0%, #69A9FF 100%)",
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
  },
};

/* ================= POPULER JURUSAN ================= */
const majorStyles = {
  section: { position: "relative", padding: "40px 0 36px" },
  inner: { width: "min(1180px, 92%)", margin: "0 auto" },
  headingWrap: { marginBottom: 28 },
  heading: {
    margin: 0,
    color: "#0B2F74",
    fontWeight: 900,
    letterSpacing: ".04em",
    textTransform: "uppercase",
    fontSize: "clamp(22px, 3.2vw, 34px)",
  },
  underline: {
    width: 120,
    height: 6,
    background: "#1F4EA3",
    borderRadius: 8,
    marginTop: 10,
  },
  stripe: {
    position: "absolute",
    left: "50%",
    transform: "translateX(-50%)",
    top: "calc(50% + 6px)",
    width: "min(1600px, 96vw)",
    height: 86,
    background: "#0B3E91",
    borderRadius: 8,
    zIndex: 0,
  },
  grid: {
    position: "relative",
    zIndex: 1,
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 24,
  },
  card: {
    background: "#fff",
    borderRadius: 20,
    padding: "26px 22px 20px",
    boxShadow: "0 12px 28px rgba(15,23,42,.12)",
    display: "grid",
    placeItems: "center",
    gap: 16,
    transition: "transform .18s ease, box-shadow .18s ease",
  },
  cardHover: {
    transform: "translateY(-2px)",
    boxShadow: "0 16px 36px rgba(15,23,42,.16)",
  },
  iconWrap: {
    width: 140,
    height: 140,
    borderRadius: 16,
    background: "linear-gradient(180deg,#F6FAFF 0%,#FFFFFF 100%)",
    display: "grid",
    placeItems: "center",
    boxShadow: "0 6px 14px rgba(15,23,42,.08) inset",
  },
  iconImg: { width: 120, height: 120, objectFit: "contain" },
  majorTitle: {
    margin: 0,
    color: "#0B2F74",
    fontWeight: 900,
    letterSpacing: ".04em",
    textTransform: "uppercase",
    fontSize: 18,
  },
  media: `
    @media (max-width: 1024px) { .majors-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 640px)  { .majors-grid { grid-template-columns: 1fr; } .major-stripe { height: 72px; } }
  `,
};

/* ========== RECOMMENDED UNIVERSITY (heading) ========== */
const recUniStyles = {
  block: {
    width: "min(1180px, 96%)",
    margin: "0 auto 12px",
    textAlign: "center",
  },
  title: {
    margin: 0,
    lineHeight: 1.1,
    fontWeight: 900,
    letterSpacing: ".06em",
    textTransform: "uppercase",
    fontSize: "clamp(22px, 4.2vw, 44px)",
    backgroundImage: "linear-gradient(180deg, #1F4EA3 0%, #69A9FF 100%)",
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
  },
  subtitle: {
    marginTop: 8,
    color: "#1F4EA3",
    fontWeight: 700,
    letterSpacing: ".02em",
    fontSize: "clamp(14px, 1.8vw, 20px)",
  },
};

/* ================= SEARCH BAR ================= */
const searchStyles = {
  wrap: { width: "min(1180px, 96%)", margin: "50px auto 36px" },
  row: { display: "flex", gap: 16, alignItems: "center" },
  shell: {
    position: "relative",
    display: "grid",
    alignItems: "center",
    gridTemplateColumns: "48px 1fr 1px 48px",
    gap: 0,
    height: 62,
    flex: 1,
    borderRadius: 999,
    background: "#fff",
    border: "2px solid #1962BF",
    boxShadow:
      "0 10px 24px rgba(15,23,42,.10), inset 0 -3px 0 rgba(25,98,191,.15), 0 2px 0 #e7d1e2",
    padding: "0 6px",
  },
  input: {
    width: "100%",
    height: "100%",
    border: "none",
    outline: "none",
    fontSize: 18,
    color: "#0B2F74",
    padding: "0 8px",
    background: "transparent",
  },
  iconBtn: {
    display: "grid",
    placeItems: "center",
    width: 48,
    height: 48,
    borderRadius: "50%",
    background: "transparent",
    border: "none",
    cursor: "pointer",
  },
  icon: { width: 24, height: 24 },
  divider: {
    height: "70%",
    width: 0,
    borderLeft: "2px dotted #1962BF",
    justifySelf: "center",
  },
  filterPill: {
    height: 62,
    minWidth: 180,
    display: "flex",
    alignItems: "center",
    position: "relative",
    padding: "0 18px",
    borderRadius: 999,
    background: "#fff",
    border: "2px solid #1962BF",
    boxShadow:
      "0 10px 24px rgba(15,23,42,.10), inset 0 -3px 0 rgba(25,98,191,.15), 0 2px 0 #e7d1e2",
  },
  countrySelect: {
    width: "100%",
    height: 44,
    border: "none",
    outline: "none",
    background: "transparent",
    fontWeight: 800,
    fontSize: 18,
    color: "#0B2F74",
    paddingRight: 28,
    cursor: "pointer",
    appearance: "none",
    WebkitAppearance: "none",
    MozAppearance: "none",
  },
  chevron: {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: "translateY(-50%)",
    width: 16,
    height: 16,
    pointerEvents: "none",
  },
};

/* ================= UNIVERSITY LIST ================= */
const uniListStyles = {
  section: { width: "min(1180px, 96%)", margin: "0 auto 80px" },
  list: { display: "grid", gap: 24 },
  card: {
    position: "relative",
    display: "grid",
    gridTemplateColumns: "180px 1fr",
    gap: 18,
    padding: "18px 18px 48px",
    background: "#fff",
    borderRadius: 14,
    border: "1px solid rgba(13,38,78,.08)",
    boxShadow: "0 10px 28px rgba(15,23,42,.10)",
  },
  logoWrap: {
    position: "relative",
    width: "100%",
    aspectRatio: "1 / 1",
    borderRadius: 12,
    overflow: "hidden",
    background: "#f6f7fb",
    display: "grid",
    placeItems: "center",
  },
  title: {
    margin: "2px 0 10px",
    color: "#0B2F74",
    fontWeight: 900,
    letterSpacing: ".04em",
    textTransform: "uppercase",
    fontSize: "clamp(20px, 2.6vw, 26px)",
  },
  excerpt: { margin: 0, color: "#3a4c74", lineHeight: 1.6, fontSize: 14 },
  bullets: {
    marginTop: 10,
    display: "grid",
    gap: 8,
    color: "#16366c",
    fontWeight: 600,
    fontSize: 14,
  },
  bulletItem: { display: "flex", alignItems: "center", gap: 8 },
  footer: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end", // moved button to the right
  },
  viewMore: {
    border: "1px solid rgba(13,38,78,.18)",
    background: "#f7fbff",
    color: "#0B2F74",
    padding: "8px 14px",
    borderRadius: 999,
    fontWeight: 700,
    fontSize: 12,
    textDecoration: "none",
    boxShadow: "0 6px 16px rgba(15,23,42,.10)",
  },
  empty: {
    padding: "28px 18px",
    borderRadius: 12,
    background: "#f7fbff",
    color: "#0B2F74",
    fontWeight: 700,
    textAlign: "center",
    border: "1px dashed rgba(13,38,78,.25)",
  },
  media: `
    @media (max-width: 860px) {
      .uni-card { grid-template-columns: 1fr; padding-bottom: 56px; }
      .uni-logo { height: 120px; aspect-ratio: auto; }
    }
  `,
};

/* ================= RELEVANT CAMPUS ================= */
const relevantStyles = {
  section: { padding: "12px 0 88px", background: "#fff" },
  inner: { width: "min(1180px, 96%)", margin: "0 auto" },
  titleWrap: { textAlign: "center", marginBottom: 26 },
  title: {
    margin: 0,
    color: "#4b8dd9",
    fontWeight: 900,
    letterSpacing: ".06em",
    textTransform: "uppercase",
    fontSize: "clamp(24px,4.6vw,48px)",
  },
  underline: {
    width: 220,
    height: 4,
    background: "#4b8dd9",
    borderRadius: 999,
    margin: "8px auto 0",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 24,
    marginTop: 28,
  },
  card: {
    background: "#fff",
    borderRadius: 18,
    boxShadow: "0 10px 26px rgba(15,23,42,.10)",
    padding: 18,
    height: 132,
    display: "grid",
    placeItems: "center",
    transition: "transform .18s ease, box-shadow .18s ease",
  },
  logoBox: {
    position: "relative",
    width: "100%",
    height: "100%",
    borderRadius: 12,
    overflow: "hidden",
    display: "grid",
    placeItems: "center",
  },
  media: `
    .relcamp-grid img{object-fit:contain}
    @media (max-width: 980px){ .relcamp-grid{grid-template-columns: repeat(3,1fr)} }
    @media (max-width: 640px){ .relcamp-grid{grid-template-columns: repeat(2,1fr)} }
  `,
};

const RELEVANT_CAMPUS_SWIPER_CLASS = "college-relevant-campus-swiper";
const MARQUEE_SPEED = 6000;
const marqueeAutoplay = {
  delay: 0,
  disableOnInteraction: false,
  pauseOnMouseEnter: false,
};
const marqueeFreeMode = { enabled: true, momentum: false, sticky: false };

/* ========== SCHOLARSHIP CTA (styles) ========== */
const scholarshipStyles = {
  section: { padding: "10px 0 110px", background: "#fff" },
  title: {
    margin: 0,
    fontWeight: 900,
    letterSpacing: ".06em",
    textTransform: "uppercase",
    fontSize: "clamp(22px,4.6vw,44px)",
  },
  body: {
    margin: "14px 0 28px",
    fontSize: "clamp(14px,2.1vw,20px)",
    lineHeight: 1.6,
    opacity: 0.98,
  },
  cta: {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    background: "#fff",
    color: "#0B4DA6",
    padding: "10px 18px",
    borderRadius: 999,
    fontWeight: 800,
    fontSize: 14,
    textDecoration: "none",
    boxShadow: "0 10px 20px rgba(0,0,0,.12)",
    transition: "transform .18s ease, box-shadow .18s ease",
  },
};

/* ================= Helpers ================= */
const BulletIcon = ({ type }) => {
  const common = { width: 18, height: 18 };
  if (type === "pin") {
    return (
      <svg
        viewBox="0 0 24 24"
        {...common}
        fill="none"
        stroke="#1E56B6"
        strokeWidth="2"
      >
        <path d="M12 22s7-5.33 7-12a7 7 0 1 0-14 0c0 6.67 7 12 7 12Z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    );
  }
  if (type === "money") {
    return (
      <svg
        viewBox="0 0 24 24"
        {...common}
        fill="none"
        stroke="#1E56B6"
        strokeWidth="2"
      >
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      {...common}
      fill="none"
      stroke="#1E56B6"
      strokeWidth="2"
    >
      <path d="M22 10L12 5 2 10l10 5 10-5Z" />
      <path d="M6 12v4c3 2 9 2 12 0v-4" />
    </svg>
  );
};

/* ===== Supabase public URL resolver (no image_public_url needed) ===== */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || "";

const buildSupabasePublicUrl = (objectPath = "") => {
  const path = String(objectPath).replace(/^\/+/, "");
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith("/")) return path; // local asset
  if (!SUPABASE_URL || !SUPABASE_BUCKET) {
    // fallback: try as local path (will 404 if not hosted)
    return `/${path}`;
  }
  const base = SUPABASE_URL.replace(/\/+$/, "");
  return `${base}/storage/v1/object/public/${SUPABASE_BUCKET}/${path}`;
};

const normalizeImgSrc = (input) => {
  const raw = (input || "").trim();
  if (!raw)
    return "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg'/>";
  // try supabase first if it's an object path
  const maybeStorage = buildSupabasePublicUrl(raw);
  if (maybeStorage) return maybeStorage;
  if (/^https?:\/\//i.test(raw)) return raw;
  return raw.startsWith("/") ? raw : `/${raw}`;
};

const pickLogo = (obj) =>
  // prioritise logo_url (Supabase objectPath), optional fallbacks to app assets
  obj?.logo_url || obj?.logo || obj?.image || obj?.image_url || "";

/* ================= Component ================= */
export default function CollegeContent({ locale = "id" }) {
  // local UI state (typing)
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("");

  // applied filters (fetch only when user submits)
  const [qApplied, setQApplied] = useState("");
  const [countryApplied, setCountryApplied] = useState("");

  // fetch with applied filters
  const {
    hero,
    findProgram,
    popularMajors,
    search,
    recommendedUniversity,
    universities,
    scholarshipCTA: scholarshipCTARaw,
  } = useCollegeViewModel({ locale, q: qApplied, country: countryApplied });

  const scholarshipCTA =
    scholarshipCTARaw && typeof scholarshipCTARaw === "object"
      ? scholarshipCTARaw
      : {};

  /* ------- Relevant Campus (robust) ------- */
  const relevantCampus = useMemo(() => {
    const raw =
      recommendedUniversity?.relevantCampus ??
      recommendedUniversity?.relevant_colleges ??
      recommendedUniversity?.relevant_college ??
      [];
    return Array.isArray(raw) ? raw : [];
  }, [recommendedUniversity]);

  const hasMultipleRelevantCampus = relevantCampus.length > 1;
  const relevantCampusAutoplay = hasMultipleRelevantCampus
    ? marqueeAutoplay
    : undefined;

  /* ------- refs & voice ------- */
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const [listening, setListening] = useState(false);

  const inferCountry = (u) => {
    if (u.country) return String(u.country).trim();
    const pinText = (u.bullets || []).find((b) => b.icon === "pin")?.text || "";
    return String(pinText)
      .split(/[–—-]|,/)[0]
      .trim();
  };

  // country options from current data
  const countries = useMemo(() => {
    const set = new Set(
      (universities || [])
        .map(inferCountry)
        .filter(Boolean)
        .map((s) => s.replace(/\s+/g, " "))
    );
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [universities]);

  // url -> state on first render
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q") || "";
    const c = params.get("country") || "";
    setQuery(q);
    setCountry(c);
    setQApplied(q);
    setCountryApplied(c);
  }, []);

  const SpeechRecognition = useMemo(() => {
    if (typeof window === "undefined") return null;
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }, []);

  const startVoice = () => {
    if (!SpeechRecognition) {
      alert(
        locale === "en"
          ? "Voice search not supported on this browser."
          : "Pencarian suara tidak didukung di browser ini."
      );
      return;
    }
    try {
      const rec = new SpeechRecognition();
      rec.lang = locale === "en" ? "en-US" : "id-ID";
      rec.interimResults = false;
      rec.maxAlternatives = 1;

      rec.onstart = () => setListening(true);
      rec.onend = () => setListening(false);
      rec.onerror = () => setListening(false);
      rec.onresult = (e) => {
        const text = e.results?.[0]?.[0]?.transcript || "";
        setQuery(text);
        setQApplied(text);
        inputRef.current?.focus();
        listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        if (typeof window !== "undefined") {
          const url = new URL(window.location.href);
          if (text) url.searchParams.set("q", text);
          else url.searchParams.delete("q");
          window.history.replaceState({}, "", url.toString());
        }
      };

      rec.start();
    } catch {
      setListening(false);
    }
  };

  const doSearch = () => {
    // apply filters → triggers fetch
    setQApplied(query);
    setCountryApplied(country);

    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (query) url.searchParams.set("q", query);
      else url.searchParams.delete("q");
      if (country) url.searchParams.set("country", country);
      else url.searchParams.delete("country");
      window.history.replaceState({}, "", url.toString());
    }
  };

  /* Pagination (AntD) */
  const PAGE_SIZE = 3;
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [qApplied, countryApplied]);

  const pageItems = useMemo(() => {
    const arr = universities || [];
    const start = (page - 1) * PAGE_SIZE;
    return arr.slice(start, start + PAGE_SIZE);
  }, [universities, page]);

  const t = (id, en) => (locale === "en" ? en : id);

  return (
    <>
      {/* HERO */}
      <section style={styles.hero}>
        <div style={styles.heroBleed}>
          <div style={styles.heroImgFrame}>
            <Image
              src={normalizeImgSrc(hero.image)}
              alt={hero.imageAlt || "Study Abroad"}
              fill
              priority
              sizes="100vw"
              style={{
                objectFit: "cover",
                objectPosition: hero.objectPosition || "40% 50%",
                filter: "saturate(0.98) contrast(1)",
              }}
            />
            <div style={styles.heroOverlay} />
            <div style={styles.heroContentLeft}>
              <h1 style={styles.heroTitle}>
                {hero.titleLine1}
                <br />
                {hero.titleLine2}
              </h1>
            </div>
          </div>
        </div>
      </section>

      {/* FIND PROGRAM */}
      <div style={findStyles.bleed}>
        <section style={findStyles.section}>
          <div style={findStyles.inner}>
            <h2 style={findStyles.title}>{findProgram.title}</h2>
          </div>
        </section>
      </div>

      {/* POPULER JURUSAN */}
      <section style={majorStyles.section}>
        <style>{majorStyles.media}</style>
        <div className="major-stripe" style={majorStyles.stripe} />
        <div style={majorStyles.inner}>
          <div style={majorStyles.headingWrap}>
            <h3 style={majorStyles.heading}>
              {t("JURUSAN POPULER", "POPULAR MAJORS")}
            </h3>
            <div style={majorStyles.underline} />
          </div>

          <div className="majors-grid" style={majorStyles.grid}>
            {(popularMajors || []).map((m) => (
              <article
                key={m.id}
                style={majorStyles.card}
                onMouseEnter={(e) =>
                  Object.assign(e.currentTarget.style, majorStyles.cardHover)
                }
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "";
                  e.currentTarget.style.boxShadow =
                    "0 12px 28px rgba(15,23,42,.12)";
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <div style={majorStyles.iconWrap}>
                  <img src={m.icon} alt={m.title} style={majorStyles.iconImg} />
                </div>
                <h4 style={majorStyles.majorTitle}>
                  {(m.title || "").toUpperCase()}
                </h4>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* HEADING + SEARCH BAR */}
      <section style={{ paddingBottom: 0 }}>
        <div style={recUniStyles.block}>
          <h2 style={recUniStyles.title}>{recommendedUniversity.title}</h2>
          <p style={recUniStyles.subtitle}>{recommendedUniversity.subtitle}</p>
        </div>

        <div style={searchStyles.wrap}>
          <div className="search-row-stack" style={searchStyles.row}>
            {/* Search shell */}
            <div style={searchStyles.shell}>
              <button
                type="button"
                aria-label="Search"
                style={searchStyles.iconBtn}
                onClick={doSearch}
              >
                <svg
                  viewBox="0 0 24 24"
                  style={searchStyles.icon}
                  fill="none"
                  stroke="#0B4DA6"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="7" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </button>

              <input
                ref={inputRef}
                type="text"
                placeholder={search.placeholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && doSearch()}
                style={searchStyles.input}
                aria-label={search.label}
              />

              <div style={searchStyles.divider} />

              <button
                type="button"
                aria-label={search.voiceHint}
                title={search.voiceHint}
                style={searchStyles.iconBtn}
                onClick={startVoice}
              >
                <svg
                  viewBox="0 0 24 24"
                  style={searchStyles.icon}
                  fill={listening ? "#0B4DA6" : "none"}
                  stroke="#0B4DA6"
                  strokeWidth="2"
                >
                  <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" />
                  <path d="M19 10a7 7 0 0 1-14 0" />
                  <path d="M12 17v4" />
                </svg>
              </button>
            </div>

            {/* Filter country pill */}
            <div style={searchStyles.filterPill}>
              <select
                aria-label={t("Filter negara", "Filter country")}
                title={t("Filter negara", "Filter country")}
                value={country}
                onChange={(e) => {
                  setCountry(e.target.value);
                  // apply immediately when country changed
                  setCountryApplied(e.target.value);
                  if (typeof window !== "undefined") {
                    const url = new URL(window.location.href);
                    if (e.target.value)
                      url.searchParams.set("country", e.target.value);
                    else url.searchParams.delete("country");
                    window.history.replaceState({}, "", url.toString());
                  }
                }}
                style={searchStyles.countrySelect}
              >
                <option value="">{t("Semua Negara", "All Countries")}</option>
                {countries.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <svg
                viewBox="0 0 24 24"
                style={searchStyles.chevron}
                fill="none"
                stroke="#1962BF"
                strokeWidth="2"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
          </div>
        </div>

        {/* Responsive stack for small screens */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @media (max-width: 640px){
                .search-row-stack { flex-direction: column; gap: 12px; }
              }
            `,
          }}
        />
      </section>

      {/* UNIVERSITY LIST */}
      <section ref={listRef} style={uniListStyles.section}>
        <style>{uniListStyles.media}</style>

        {(universities || []).length === 0 ? (
          <div style={uniListStyles.empty}>
            {locale === "en"
              ? `No university found for “${qApplied || countryApplied || ""}”.`
              : `Tidak ada kampus untuk “${qApplied || countryApplied || ""}”.`}
          </div>
        ) : (
          <div style={uniListStyles.list}>
            {pageItems.map((u) => {
              const raw = pickLogo(u);
              const src = normalizeImgSrc(raw);
              const external = /^https?:\/\//i.test(src);
              return (
                <article
                  key={u.id}
                  className="uni-card"
                  style={uniListStyles.card}
                >
                  <div className="uni-logo" style={uniListStyles.logoWrap}>
                    <Image
                      src={src}
                      alt={`${u.name} logo`}
                      fill
                      sizes="(max-width: 860px) 40vw, 180px"
                      style={{ objectFit: "contain" }}
                      unoptimized={external}
                    />
                  </div>

                  <div>
                    <h3 style={uniListStyles.title}>
                      {(u.name || "").toUpperCase()}
                    </h3>
                    <p style={uniListStyles.excerpt}>{u.excerpt || ""}</p>

                    {/* bullets aman meski kosong */}
                    <div style={uniListStyles.bullets}>
                      {(u.bullets || []).map((b, i) => (
                        <div key={i} style={uniListStyles.bulletItem}>
                          <BulletIcon type={b.icon} />
                          <span>{b.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={uniListStyles.footer}>
                    <a href={u.href || "#"} style={uniListStyles.viewMore}>
                      {t("Selengkapnya", "View More")}
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Pagination */}
      {(universities || []).length > 0 && (
        <div
          style={{
            width: "min(1180px, 96%)",
            margin: "-75px auto 36px",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <Pagination
            current={page}
            pageSize={3}
            total={(universities || []).length}
            showSizeChanger={false}
            onChange={(p) => {
              setPage(p);
              listRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
            }}
            showLessItems
          />
        </div>
      )}

      {/* RELEVANT CAMPUS (Marquee) */}
      <section style={relevantStyles.section}>
        <style>{relevantStyles.media}</style>
        <div style={relevantStyles.inner}>
          <div style={relevantStyles.titleWrap}>
            <h2 style={relevantStyles.title}>
              {t("KAMPUS RELEVAN", "RELEVANT CAMPUS")}
            </h2>
            <div style={relevantStyles.underline} />
          </div>

          {relevantCampus.length > 0 ? (
            <>
              <Swiper
                className={RELEVANT_CAMPUS_SWIPER_CLASS}
                modules={[Autoplay, FreeMode]}
                loop={hasMultipleRelevantCampus}
                speed={MARQUEE_SPEED}
                autoplay={relevantCampusAutoplay}
                slidesPerView="auto"
                spaceBetween={24}
                freeMode={relevantCampusAutoplay ? marqueeFreeMode : undefined}
                allowTouchMove={false}
              >
                {relevantCampus.map((c, idx) => {
                  if (!c?.logo_url) return null;
                  const src = normalizeImgSrc(c.logo_url);
                  return (
                    <SwiperSlide
                      key={c.id || idx}
                      style={{ width: "min(240px, 72vw)" }}
                    >
                      <div
                        style={relevantStyles.card}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "translateY(-3px)";
                          e.currentTarget.style.boxShadow =
                            "0 14px 32px rgba(15,23,42,.14)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "";
                          e.currentTarget.style.boxShadow =
                            "0 10px 26px rgba(15,23,42,.10)";
                        }}
                      >
                        <div style={relevantStyles.logoBox}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={src}
                            alt={`${c.name || "campus"} logo`}
                            loading="lazy"
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "contain",
                            }}
                            onError={(e) => {
                              e.currentTarget
                                ?.closest(".swiper-slide")
                                ?.remove();
                            }}
                          />
                        </div>
                      </div>
                    </SwiperSlide>
                  );
                })}
              </Swiper>

              <style
                dangerouslySetInnerHTML={{
                  __html: `
                    .${RELEVANT_CAMPUS_SWIPER_CLASS} { overflow: visible; padding: 6px 2px; }
                    .${RELEVANT_CAMPUS_SWIPER_CLASS} .swiper-wrapper { align-items: stretch; }
                    .${RELEVANT_CAMPUS_SWIPER_CLASS} .swiper-slide { height: auto; display: flex; align-items: stretch; }
                    .${RELEVANT_CAMPUS_SWIPER_CLASS} .swiper-pagination,
                    .${RELEVANT_CAMPUS_SWIPER_CLASS} .swiper-button-next,
                    .${RELEVANT_CAMPUS_SWIPER_CLASS} .swiper-button-prev { display: none !important; }
                  `,
                }}
              />
            </>
          ) : (
            <div style={uniListStyles.empty}>
              {t("Belum ada kampus relevan.", "No relevant campus yet.")}
            </div>
          )}
        </div>
      </section>

      {/* SCHOLARSHIP CTA */}
      <section style={scholarshipStyles.section}>
        <div style={{ width: "min(1180px, 96%)", margin: "0 auto" }}>
          <article
            style={{
              background: "#0B4DA6",
              color: "#fff",
              padding: "34px clamp(18px,3vw,40px) 40px",
              borderRadius: "28px 28px 20px 56px",
              boxShadow: "0 20px 44px rgba(11,77,166,.25)",
              position: "relative",
            }}
          >
            <h2 style={scholarshipStyles.title}>{scholarshipCTA.title}</h2>
            <p style={scholarshipStyles.body}>{scholarshipCTA.body}</p>

            <a
              href={scholarshipCTA.href}
              style={scholarshipStyles.cta}
              onMouseEnter={(e) =>
                Object.assign(e.currentTarget.style, {
                  transform: "translateY(-2px)",
                  boxShadow: "0 14px 24px rgba(0,0,0,.16)",
                })
              }
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "";
                e.currentTarget.style.boxShadow = "0 10px 20px rgba(0,0,0,.12)";
              }}
            >
              {scholarshipCTA.ctaLabel}
              <svg
                viewBox="0 0 24 24"
                style={{ width: 22, height: 22 }}
                fill="none"
                stroke="#9AA0A6"
                strokeWidth="2"
              >
                <path d="M5 12h14" />
                <path d="m13 6 6 6-6 6" />
              </svg>
            </a>
          </article>
        </div>
      </section>
    </>
  );
}
