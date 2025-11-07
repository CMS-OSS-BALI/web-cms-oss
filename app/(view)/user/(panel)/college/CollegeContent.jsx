"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import useCollegeViewModel from "./useCollegeViewModel";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, FreeMode } from "swiper/modules";
import "swiper/css";
import "swiper/css/free-mode";
import { Pagination } from "antd";
import "antd/dist/reset.css";

/* ---------- util kecil ---------- */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || "";
const buildSupabasePublicUrl = (objectPath = "") => {
  const raw = String(objectPath || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/")) return raw;
  const path = raw.replace(/^\/+/, "");
  if (!path) return "";
  if (!SUPABASE_URL || !SUPABASE_BUCKET) return `/${path}`;
  return `${SUPABASE_URL.replace(
    /\/+$/,
    ""
  )}/storage/v1/object/public/${SUPABASE_BUCKET}/${path}`;
};
const normalizeImgSrc = (input) => {
  const raw = (input || "").trim();
  if (!raw)
    return "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg'/>";
  const storage = buildSupabasePublicUrl(raw);
  if (storage) return storage;
  if (/^https?:\/\//i.test(raw)) return raw;
  return raw.startsWith("/") ? raw : `/${raw}`;
};

const BulletIcon = ({ type }) => {
  const p = {
    width: 18,
    height: 18,
    fill: "none",
    stroke: "#1E56B6",
    strokeWidth: 2,
  };
  if (type === "pin")
    return (
      <svg viewBox="0 0 24 24" {...p}>
        <path d="M12 22s7-5.33 7-12a7 7 0 1 0-14 0c0 6.67 7 12 7 12Z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    );
  if (type === "money")
    return (
      <svg viewBox="0 0 24 24" {...p}>
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  if (type === "cap")
    return (
      <svg viewBox="0 0 24 24" {...p}>
        <path d="M22 10L12 5 2 10l10 5 10-5Z" />
        <path d="M6 12v4c3 2 9 2 12 0v-4" />
      </svg>
    );
  // default generic
  return (
    <svg viewBox="0 0 24 24" {...p}>
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
};

/* ---------- constants swiper ---------- */
const RELEVANT_CAMPUS_SWIPER_CLASS = "college-relevant-campus-swiper";
const MARQUEE_SPEED = 6000;
const marqueeAutoplay = {
  delay: 0,
  disableOnInteraction: false,
  pauseOnMouseEnter: false,
};
const marqueeFreeMode = { enabled: true, momentum: false, sticky: false };

/* ================== styles (ringkas) ================== */
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

  findBleed: {
    width: "100vw",
    marginLeft: "calc(50% - 50vw)",
    marginRight: "calc(50% - 50vw)",
    background: "linear-gradient(90deg, #E6F3FF 0%, #F5FAFF 35%, #FFFFFF 70%)",
  },
  findSection: {
    position: "relative",
    padding: "clamp(32px, 6vw, 80px) 16px",
    overflow: "hidden",
  },
  findInner: {
    width: "min(1180px, 92%)",
    margin: "0 auto",
    textAlign: "center",
  },
  findTitle: {
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

  majors: {
    section: { position: "relative", padding: "40px 0 36px" },
    inner: { width: "min(1180px, 92%)", margin: "0 auto" },
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
    grid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 },
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

    iconPlain: { width: 140, height: 140, objectFit: "contain" },

    majorTitle: {
      margin: 0,
      color: "#0B2F74",
      fontWeight: 900,
      letterSpacing: ".04em",
      textTransform: "uppercase",
      fontSize: 18,
    },
  },

  rec: {
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
  },

  search: {
    wrap: { width: "min(1180px, 96%)", margin: "50px auto 36px" },
    row: { display: "flex", gap: 16, alignItems: "center" },
    shell: {
      position: "relative",
      display: "grid",
      alignItems: "center",
      gridTemplateColumns: "48px 1fr",
      gap: 0,
      height: 62,
      flex: 1,
      borderRadius: 999,
      background: "#fff",
      border: "2px solid #1962BF",
      boxShadow:
        "0 10px 24px rgba(15,23,42,.10), inset 0 -3px 0 rgba(25,98,191,.15)",
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
        "0 10px 24px rgba(15,23,42,.10), inset 0 -3px 0 rgba(25,98,191,.15)",
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
  },

  uni: {
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
      justifyContent: "flex-end",
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
  },

  relevant: {
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
  },

  cta: {
    section: { padding: "10px 0 110px", background: "#fff" },
    container: { width: "min(1180px, 96%)", margin: "0 auto" },
    card: {
      background: "#0B56B8",
      color: "#fff",
      padding: "32px clamp(18px,3vw,40px) 40px",
      borderRadius: "24px 120px 20px 80px",
      boxShadow: "0 20px 44px rgba(11,86,184,.25)",
    },
    title: {
      margin: 0,
      fontWeight: 900,
      textTransform: "uppercase",
      letterSpacing: ".06em",
      fontSize: "clamp(24px,4.6vw,48px)",
    },
    body: {
      margin: "14px 0 26px",
      maxWidth: 900,
      fontSize: "clamp(14px,2.1vw,20px)",
      lineHeight: 1.75,
      letterSpacing: ".02em",
      opacity: 0.98,
    },
    btn: {
      display: "inline-flex",
      alignItems: "center",
      gap: 12,
      height: 48,
      padding: "0 22px",
      background: "#fff",
      color: "#0B56B8",
      border: "2px solid #CFE0FF",
      borderRadius: 999,
      fontWeight: 800,
      fontSize: 16,
      textDecoration: "none",
      boxShadow:
        "0 10px 22px rgba(10,40,110,.18), inset 0 -3px 0 rgba(10,40,110,.06)",
      transition: "transform .18s ease, box-shadow .18s ease",
    },
    btnHover: {
      transform: "translateY(-2px)",
      boxShadow:
        "0 14px 28px rgba(10,40,110,.22), inset 0 -3px 0 rgba(10,40,110,.06)",
    },
    btnIcon: { width: 20, height: 20 },
  },
};

/* ================== Component ================== */
export default function CollegeContent({ locale = "id" }) {
  // search state (jurusan / program)
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("");
  const [qApplied, setQApplied] = useState("");
  const [countryApplied, setCountryApplied] = useState("");
  const inputRef = useRef(null);
  const listRef = useRef(null);

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

  const doSearch = () => {
    setQApplied(query);
    setCountryApplied(country);
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      query ? url.searchParams.set("q", query) : url.searchParams.delete("q");
      country
        ? url.searchParams.set("country", country)
        : url.searchParams.delete("country");
      window.history.replaceState({}, "", url.toString());
    }
  };

  const {
    hero,
    findProgram,
    popularMajors,
    search,
    recommendedUniversity = {},
    universities = [],
    jpMatchesByCollegeId = {},
    scholarshipCTA = null,
  } = useCollegeViewModel({
    locale,
    q: qApplied,
    country: countryApplied,
    perPage: 100,
  });

  const t = (id, en) => (locale === "en" ? en : id);

  /* relevant campus */
  const relevantCampus = useMemo(
    () =>
      Array.isArray(recommendedUniversity?.relevantCampus)
        ? recommendedUniversity.relevantCampus
        : [],
    [recommendedUniversity]
  );
  const hasMultipleRelevantCampus = relevantCampus.length > 1;
  const relevantCampusAutoplay = hasMultipleRelevantCampus
    ? marqueeAutoplay
    : undefined;

  /* pagination */
  const PAGE_SIZE = 3;
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [qApplied, countryApplied, universities]);

  const pageItems = useMemo(() => {
    const arr = universities || [];
    const start = (page - 1) * PAGE_SIZE;
    return arr.slice(start, start + PAGE_SIZE);
  }, [universities, page]);

  const inferCountry = (u) => {
    if (u.country) return String(u.country).trim();
    const pinText = (u.bullets || []).find((b) => b.icon === "pin")?.text || "";
    return String(pinText)
      .split(/[–—-]|,/)[0]
      .trim();
  };
  const countries = useMemo(() => {
    const set = new Set(
      (universities || [])
        .map(inferCountry)
        .filter(Boolean)
        .map((s) => s.replace(/\s+/g, " "))
    );
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [universities]);

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
      <div style={styles.findBleed}>
        <section style={styles.findSection}>
          <div style={styles.findInner}>
            <h2 style={styles.findTitle}>{findProgram.title}</h2>
          </div>
        </section>
      </div>

      {/* POPULAR MAJORS */}
      <section style={styles.majors.section}>
        <div style={styles.majors.inner}>
          <div style={{ marginBottom: 28 }}>
            <h3 style={styles.majors.heading}>
              {locale === "en" ? "POPULAR MAJORS" : "JURUSAN POPULER"}
            </h3>
            <div style={styles.majors.underline} />
          </div>

          <div className="majors-grid" style={styles.majors.grid}>
            {(popularMajors || []).map((m) => (
              <article
                key={m.id}
                style={styles.majors.card}
                onMouseEnter={(e) =>
                  Object.assign(e.currentTarget.style, {
                    transform: "translateY(-2px)",
                    boxShadow: "0 16px 36px rgba(15,23,42,.16)",
                  })
                }
                onMouseLeave={(e) =>
                  Object.assign(e.currentTarget.style, {
                    transform: "",
                    boxShadow: "0 12px 28px rgba(15,23,42,.12)",
                  })
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.icon}
                  alt={m.title}
                  style={styles.majors.iconPlain}
                />

                <h4 style={styles.majors.majorTitle}>
                  {(m.title || "").toUpperCase()}
                </h4>
              </article>
            ))}
          </div>
        </div>

        {/* responsif grid */}
        <style>{`
          @media (max-width: 1024px) { .majors-grid { grid-template-columns: repeat(2, 1fr); } }
          @media (max-width: 640px)  { .majors-grid { grid-template-columns: 1fr; } }
        `}</style>
      </section>

      {/* HEADING + SEARCH */}
      <section style={{ paddingBottom: 0 }}>
        <div style={styles.rec.block}>
          <h2 style={styles.rec.title}>
            {recommendedUniversity?.title ||
              (locale === "en"
                ? "RECOMMENDED UNIVERSITY"
                : "RECOMMENDED UNIVERSITY")}
          </h2>
          <p style={styles.rec.subtitle}>
            {recommendedUniversity?.subtitle ||
              (locale === "en"
                ? "Find Your Path At Leading Universities Worldwide"
                : "Temukan jalurmu di universitas-universitas terkemuka dunia")}
          </p>
        </div>

        <div style={styles.search.wrap}>
          <div className="search-row-stack" style={styles.search.row}>
            <div style={styles.search.shell}>
              <button
                type="button"
                aria-label="Search"
                style={styles.search.iconBtn}
                onClick={doSearch}
              >
                <svg
                  viewBox="0 0 24 24"
                  style={styles.search.icon}
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
                style={styles.search.input}
                aria-label={search.label}
              />
            </div>

            <div style={styles.search.filterPill}>
              <select
                aria-label={
                  locale === "en" ? "Filter country" : "Filter negara"
                }
                value={country}
                onChange={(e) => {
                  setCountry(e.target.value);
                  setCountryApplied(e.target.value);
                  if (typeof window !== "undefined") {
                    const url = new URL(window.location.href);
                    e.target.value
                      ? url.searchParams.set("country", e.target.value)
                      : url.searchParams.delete("country");
                    window.history.replaceState({}, "", url.toString());
                  }
                }}
                style={styles.search.countrySelect}
              >
                <option value="">
                  {locale === "en" ? "All Countries" : "Semua Negara"}
                </option>
                {countries.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <svg
                viewBox="0 0 24 24"
                style={styles.search.chevron}
                fill="none"
                stroke="#1962BF"
                strokeWidth="2"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
          </div>
        </div>

        <style>{`@media (max-width: 640px){ .search-row-stack { flex-direction: column; gap: 12px; } }`}</style>
      </section>

      {/* UNIVERSITY LIST */}
      <section ref={listRef} style={styles.uni.section}>
        <style>{`
          @media (max-width: 860px) {
            .uni-card { grid-template-columns: 1fr; padding-bottom: 56px; }
            .uni-logo { height: 120px; aspect-ratio: auto; }
          }
        `}</style>

        {(universities || []).length === 0 ? (
          <div style={styles.uni.empty}>
            {locale === "en"
              ? `No university found for “${qApplied || countryApplied || ""}”.`
              : `Tidak ada kampus untuk “${qApplied || countryApplied || ""}”.`}
          </div>
        ) : (
          <div style={styles.uni.list}>
            {pageItems.map((u) => {
              const src = normalizeImgSrc(u.logo_url);
              const external = /^https?:\/\//i.test(src);
              const jpMatch = jpMatchesByCollegeId[String(u.id)] || null;
              const matchCount =
                (jpMatch?.jurusan?.length || 0) + (jpMatch?.prodi?.length || 0);

              return (
                <article
                  key={u.id}
                  className="uni-card"
                  style={styles.uni.card}
                >
                  <div className="uni-logo" style={styles.uni.logoWrap}>
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
                    <h3 style={styles.uni.title}>
                      {(u.name || "").toUpperCase()}
                    </h3>
                    <p style={styles.uni.excerpt}>{u.excerpt || ""}</p>
                    <div style={styles.uni.bullets}>
                      {(u.bullets || []).map((b, i) => (
                        <div key={i} style={styles.uni.bulletItem}>
                          <BulletIcon type={b.icon} />
                          <span>{b.text}</span>
                        </div>
                      ))}
                      {matchCount > 0 && (
                        <div
                          style={styles.uni.bulletItem}
                          title={t(
                            "Jumlah kecocokan program/jurusan berdasarkan pencarian",
                            "Number of program/major matches from your search"
                          )}
                        >
                          <BulletIcon />
                          <span>
                            {locale === "en"
                              ? `${matchCount} matching program(s)`
                              : `${matchCount} program/jurusan cocok`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={styles.uni.footer}>
                    <a href={u.href || "#"} style={styles.uni.viewMore}>
                      {locale === "en" ? "View More" : "Selengkapnya"}
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

      {/* RELEVANT CAMPUS (marquee) */}
      <section style={styles.relevant.section}>
        <div style={styles.relevant.inner}>
          <div style={styles.relevant.titleWrap}>
            <h2 style={styles.relevant.title}>
              {locale === "en" ? "RELEVANT CAMPUS" : "KAMPUS RELEVAN"}
            </h2>
            <div style={styles.relevant.underline} />
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
                        style={styles.relevant.card}
                        onMouseEnter={(e) =>
                          Object.assign(e.currentTarget.style, {
                            transform: "translateY(-3px)",
                            boxShadow: "0 14px 32px rgba(15,23,42,.14)",
                          })
                        }
                        onMouseLeave={(e) =>
                          Object.assign(e.currentTarget.style, {
                            transform: "",
                            boxShadow: "0 10px 26px rgba(15,23,42,.10)",
                          })
                        }
                      >
                        <div style={styles.relevant.logoBox}>
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
                            onError={(e) =>
                              e.currentTarget
                                ?.closest(".swiper-slide")
                                ?.remove()
                            }
                          />
                        </div>
                      </div>
                    </SwiperSlide>
                  );
                })}
              </Swiper>

              <style>{`
                .${RELEVANT_CAMPUS_SWIPER_CLASS} { overflow: visible; padding: 6px 2px; }
                .${RELEVANT_CAMPUS_SWIPER_CLASS} .swiper-wrapper { align-items: stretch; }
                .${RELEVANT_CAMPUS_SWIPER_CLASS} .swiper-slide { height: auto; display: flex; align-items: stretch; }
                .${RELEVANT_CAMPUS_SWIPER_CLASS} .swiper-pagination,
                .${RELEVANT_CAMPUS_SWIPER_CLASS} .swiper-button-next,
                .${RELEVANT_CAMPUS_SWIPER_CLASS} .swiper-button-prev { display: none !important; }
              `}</style>
            </>
          ) : (
            <div style={styles.uni.empty}>
              {locale === "en"
                ? "No relevant campus yet."
                : "Belum ada kampus relevan."}
            </div>
          )}
        </div>
      </section>

      {/* ====== SCHOLARSHIP CTA ====== */}
      {scholarshipCTA?.title && (
        <section style={styles.cta.section}>
          <div style={styles.cta.container}>
            <article style={styles.cta.card}>
              <h2 style={styles.cta.title}>{scholarshipCTA.title}</h2>
              <p style={styles.cta.body}>{scholarshipCTA.body}</p>

              <a
                href={scholarshipCTA.href}
                style={styles.cta.btn}
                onMouseEnter={(e) =>
                  Object.assign(e.currentTarget.style, styles.cta.btnHover)
                }
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "";
                  e.currentTarget.style.boxShadow = styles.cta.btn.boxShadow;
                }}
              >
                {scholarshipCTA.ctaLabel}
                <svg
                  viewBox="0 0 24 24"
                  style={styles.cta.btnIcon}
                  fill="none"
                  stroke="#4A76C8"
                  strokeWidth="2"
                >
                  <path d="M5 12h14" />
                  <path d="m13 6 6 6-6 6" />
                </svg>
              </a>
            </article>
          </div>
        </section>
      )}
    </>
  );
}
