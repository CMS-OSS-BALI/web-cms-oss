"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import useCollegeViewModel from "./useCollegeViewModel";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, FreeMode } from "swiper/modules";
import "swiper/css";
import "swiper/css/free-mode";
import { Pagination } from "antd";
import {
  isExternalAsset,
  toPublicStorageUrl,
} from "@/app/utils/publicCdnClient";
import "antd/dist/reset.css";

/* ---------- Storage helpers (gateway/CDN) ---------- */
function toPublicUrlMaybe(input) {
  const raw = String(input || "").trim();
  if (!raw) return "";
  if (isExternalAsset(raw)) return raw;
  if (raw.startsWith("/")) return raw;
  return toPublicStorageUrl(raw);
}
function normalizeImgSrc(input) {
  return (
    toPublicUrlMaybe(input) ||
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg'/>"
  );
}

/* ---------- Icons ---------- */
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
  return (
    <svg viewBox="0 0 24 24" {...p}>
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
};

/* ---------- swiper ---------- */
const RELEVANT_CAMPUS_SWIPER_CLASS = "college-relevant-campus-swiper";
const MARQUEE_SPEED = 6000;
const marqueeAutoplay = {
  delay: 0,
  disableOnInteraction: false,
  pauseOnMouseEnter: false,
};
const marqueeFreeMode = { enabled: true, momentum: false, sticky: false };

/* ---------- reveal on scroll ---------- */
function useRevealOnScroll(deps = []) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const prefersReduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const markVisible = (els) =>
      els.forEach((el) => el.classList.add("is-visible"));

    if (prefersReduce) {
      markVisible(Array.from(document.querySelectorAll(".reveal")));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.16, rootMargin: "0px 0px -10% 0px" }
    );

    const observeAll = () => {
      document
        .querySelectorAll(".reveal:not(.is-visible)")
        .forEach((el) => io.observe(el));
    };

    observeAll();
    const mo = new MutationObserver(observeAll);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, deps);
}

/* ================== styles ================== */
const styles = {
  /* HERO */
  hero: { marginTop: "calc(-1 * clamp(48px, 8vw, 84px))", background: "#fff" },
  heroBleed: {
    width: "100vw",
    marginLeft: "calc(50% - 50vw)",
    marginRight: "calc(50% - 50vw)",
    marginBottom: "-12px",
  },
  heroImgFrame: {
    position: "relative",
    width: "100vw",
    height: "calc(100vh - var(--nav-h, 88px))",
    minHeight: "calc(100svh - var(--nav-h, 88px))",
    paddingBottom: "clamp(24px, 5vw, 72px)",
    background: "#e8f0ff",
    overflow: "hidden",
  },
  heroOverlay: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(180deg, rgba(15,38,82,.65) 0%, rgba(15,38,82,.55) 40%, rgba(15,38,82,.45) 70%, rgba(15,38,82,.35) 100%)",
    zIndex: 1,
  },
  heroContent: {
    position: "absolute",
    inset: 0,
    zIndex: 2,
    display: "grid",
    gridTemplateRows: "1fr auto",
    alignItems: "center",
    padding: "clamp(16px, 4vw, 40px)",
  },
  heroText: {
    alignSelf: "center",
    width: "min(1140px, 92%)",
    margin: "0 auto",
    color: "#fff",
  },
  heroTitleLine1: {
    margin: 0,
    fontWeight: 600,
    letterSpacing: ".02em",
    fontSize: "clamp(20px, 3.2vw, 38px)",
    lineHeight: 1.2,
  },
  heroTitleLine2: {
    margin: "8px 0 0",
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: ".08em",
    fontSize: "clamp(26px, 5.2vw, 60px)",
    lineHeight: 1.02,
  },
  heroSearchWrap: {
    alignSelf: "end",
    width: "min(1140px, 92%)",
    margin: "0 auto clamp(18px, 3vw, 36px)",
  },
  heroSearchRow: {
    display: "flex",
    gap: 18,
    alignItems: "center",
    justifyContent: "space-between",
  },

  /* Search pills */
  search: {
    shell: {
      position: "relative",
      display: "grid",
      alignItems: "center",
      gridTemplateColumns: "48px 1fr",
      height: 62,
      flex: 1,
      borderRadius: 16,
      background: "rgba(255,255,255,.96)",
      border: "2px solid rgba(255,255,255,.5)",
      boxShadow: "0 12px 26px rgba(0,0,0,.18)",
      padding: "0 6px",
      backdropFilter: "saturate(1.3) blur(2px)",
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
      border: "none",
      background: "transparent",
      cursor: "pointer",
    },
    icon: { width: 24, height: 24 },
    filterPill: {
      height: 62,
      minWidth: 190,
      display: "flex",
      alignItems: "center",
      position: "relative",
      padding: "0 18px",
      borderRadius: 16,
      background: "rgba(255,255,255,.96)",
      border: "2px solid rgba(255,255,255,.5)",
      boxShadow: "0 12px 26px rgba(0,0,0,.18)",
      backdropFilter: "saturate(1.3) blur(2px)",
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
      opacity: 0.9,
    },
  },

  /* LIST */
  uni: {
    section: { width: "min(1180px, 96%)", margin: "0 auto 80px" },
    list: { display: "grid", gap: 24 },
    card: {
      position: "relative",
      display: "grid",
      gridTemplateColumns: "180px 1fr",
      gap: 18,
      padding: "18px 18px 56px",
      background: "#fff",
      borderRadius: 14,
      border: "1px solid rgba(13,38,78,.08)",
      boxShadow: "0 10px 28px rgba(15,23,42,.10)",
      transition: "transform .2s ease, box-shadow .2s ease",
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
      fontSize: "clamp(18px, 2.6vw, 24px)",
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
      padding: "10px 16px",
      borderRadius: 999,
      fontWeight: 800,
      fontSize: 12,
      textDecoration: "none",
      boxShadow: "0 6px 16px rgba(15,23,42,.10)",
      transition: "transform .16s ease, box-shadow .16s ease",
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

  /* RELEVANT CAMPUS */
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
      fontSize: "clamp(22px,4.6vw,46px)",
    },
    underline: {
      width: 220,
      height: 4,
      background: "#4b8dd9",
      borderRadius: 999,
      margin: "8px auto 0",
    },

    // ⬇️ SQUARE CARD 1:1
    card: {
      background: "#fff",
      borderRadius: 18,
      boxShadow: "0 10px 26px rgba(15,23,42,.10)",
      padding: 18,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
      aspectRatio: "1 / 1", // <- memastikan kotak 1:1
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
};

/* ================== Component ================== */
export default function CollegeContent({ locale = "id" }) {
  /* init reveal on scroll */
  useRevealOnScroll([]);

  /* search state */
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
    search,
    recommendedUniversity = {},
    universities = [],
    jpMatchesByCollegeId = {},
  } = useCollegeViewModel({
    locale,
    q: qApplied,
    country: countryApplied,
    perPage: 100,
  });

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

  /* country list */
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
      {/* ============== HERO ============== */}
      <section style={styles.hero}>
        <div style={styles.heroBleed}>
          <div className="hero-frame" style={styles.heroImgFrame}>
            <Image
              src={normalizeImgSrc(hero.image)}
              alt={hero.imageAlt || "Study Abroad"}
              fill
              priority
              sizes="100vw"
              style={{
                objectFit: "cover",
                objectPosition: hero.objectPosition || "70% 50%",
                filter: "saturate(0.98) contrast(1.02)",
              }}
              unoptimized={isExternalAsset(normalizeImgSrc(hero.image))}
            />
            <div style={styles.heroOverlay} />

            <div style={styles.heroContent}>
              <div style={styles.heroText}>
                <p
                  className="reveal"
                  data-anim="down"
                  style={{ ...styles.heroTitleLine1, ["--rvd"]: "80ms" }}
                >
                  {hero.titleLine1}
                </p>
                <p
                  className="reveal"
                  data-anim="up"
                  style={{ ...styles.heroTitleLine2, ["--rvd"]: "160ms" }}
                >
                  {hero.titleLine2}
                </p>
              </div>

              <div
                className="reveal"
                data-anim="up"
                style={{ ...styles.heroSearchWrap, ["--rvd"]: "240ms" }}
              >
                <div className="hero-search-row" style={styles.heroSearchRow}>
                  <div className="hs-search" style={styles.search.shell}>
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
                      placeholder={
                        locale === "en" ? "Search Campus" : "Cari Kampus"
                      }
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && doSearch()}
                      style={styles.search.input}
                      aria-label={search.label}
                    />
                  </div>

                  <div className="hs-filter" style={styles.search.filterPill}>
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
            </div>

            {/* responsive helpers */}
            <style>{`
              @supports (height: 100dvh) {
                .hero-frame { height: calc(100dvh - var(--nav-h, 88px)); }
              }
              @supports (height: 100svh) {
                .hero-frame { min-height: calc(100svh - var(--nav-h, 88px)); }
              }
            `}</style>
          </div>
        </div>
      </section>

      {/* ========== UNIVERSITY LIST ========== */}
      <section ref={listRef} style={styles.uni.section}>
        <style>{`
          .uni-card:focus-within,
          .uni-card:focus {
            outline: 3px solid #5aa8ff;
            outline-offset: 2px;
          }
          @media (hover:hover){
            .uni-card:hover{
              transform: translateY(-3px);
              box-shadow: 0 16px 36px rgba(15,23,42,.14);
            }
            .uni-card:hover a { transform: translateY(-1px); }
          }

          /* MOBILE: logo di atas, deskripsi di bawah */
          @media (max-width: 900px) {
            .uni-card { 
              grid-template-columns: 1fr !important;
              padding-bottom: 56px; 
            }
            .uni-logo{
              width: 100%;
              aspect-ratio: 3 / 1;
              border-radius: 12px;
              background: #f6f7fb;
            }
            .uni-footer{ 
              position: static !important; 
              margin-top: 12px; 
              justify-content: flex-end; 
            }
          }
          @media (max-width: 520px) {
            .uni-card { gap: 12px; padding: 14px 14px 20px; }
          }
        `}</style>

        {(universities || []).length === 0 ? (
          <div
            className="reveal"
            data-anim="zoom"
            style={{ ...styles.uni.empty, ["--rvd"]: "60ms" }}
          >
            {locale === "en"
              ? `No university found for “${qApplied || countryApplied || ""}”.`
              : `Tidak ada kampus untuk “${qApplied || countryApplied || ""}”.`}
          </div>
        ) : (
          <div style={styles.uni.list}>
            {pageItems.map((u, idx) => {
              const src = normalizeImgSrc(u.logo_url);
              const external = isExternalAsset(src);
              const jpMatch = jpMatchesByCollegeId[String(u.id)] || null;
              const matchCount =
                (jpMatch?.jurusan?.length || 0) + (jpMatch?.prodi?.length || 0);

              return (
                <article
                  key={u.id}
                  className="uni-card reveal"
                  data-anim="up"
                  style={{
                    ...styles.uni.card,
                    ["--rvd"]: `${(idx % 6) * 70}ms`,
                  }}
                >
                  <div className="uni-logo" style={styles.uni.logoWrap}>
                    <Image
                      src={src}
                      alt={`${u.name} logo`}
                      fill
                      sizes="(max-width: 900px) 90vw, 180px"
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
                        <div
                          key={i}
                          className="reveal"
                          data-anim="left"
                          style={{
                            ...styles.uni.bulletItem,
                            ["--rvd"]: `${(i % 5) * 50}ms`,
                          }}
                        >
                          <BulletIcon type={b.icon} />
                          <span>{b.text}</span>
                        </div>
                      ))}
                      {matchCount > 0 && (
                        <div
                          className="reveal"
                          data-anim="left"
                          style={{
                            ...styles.uni.bulletItem,
                            ["--rvd"]: "180ms",
                          }}
                          title={
                            locale === "en"
                              ? "Number of program/major matches from your search"
                              : "Jumlah kecocokan program/jurusan berdasarkan pencarian"
                          }
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

                  <div className="uni-footer" style={styles.uni.footer}>
                    <a
                      href={u.href || "#"}
                      style={styles.uni.viewMore}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.boxShadow =
                          "0 10px 24px rgba(15,23,42,.16)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.boxShadow =
                          "0 6px 16px rgba(15,23,42,.10)")
                      }
                    >
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
          className="reveal"
          data-anim="up"
          style={{
            width: "min(1180px, 96%)",
            margin: "-70px auto 36px",
            display: "flex",
            justifyContent: "center",
            ["--rvd"]: "80ms",
          }}
        >
          <Pagination
            current={page}
            pageSize={PAGE_SIZE}
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

      {/* ========== RELEVANT CAMPUS (marquee) ========== */}
      <section style={styles.relevant.section}>
        <div style={styles.relevant.inner}>
          <div
            className="reveal"
            data-anim="down"
            style={{ ...styles.relevant.titleWrap, ["--rvd"]: "40ms" }}
          >
            <h2 style={styles.relevant.title}>
              {locale === "en" ? "RELEVANT CAMPUS" : "KAMPUS RELEVAN"}
            </h2>
            <div style={styles.relevant.underline} />
          </div>

          {relevantCampus.length > 0 ? (
            <>
              <Swiper
                className={`${RELEVANT_CAMPUS_SWIPER_CLASS} reveal`}
                data-anim="zoom"
                style={{ ["--rvd"]: "100ms" }}
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
                            title={c.name || "campus"}
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
                .${RELEVANT_CAMPUS_SWIPER_CLASS} .swiper-wrapper { align-items: stretch; transition-timing-function: linear !important; }
                .${RELEVANT_CAMPUS_SWIPER_CLASS} .swiper-slide { height: auto; display: flex; align-items: stretch; }
                .${RELEVANT_CAMPUS_SWIPER_CLASS} .swiper-pagination,
                .${RELEVANT_CAMPUS_SWIPER_CLASS} .swiper-button-next,
                .${RELEVANT_CAMPUS_SWIPER_CLASS} .swiper-button-prev { display: none !important; }
              `}</style>
            </>
          ) : (
            <div
              className="reveal"
              data-anim="zoom"
              style={{ ...styles.uni.empty, ["--rvd"]: "60ms" }}
            >
              {locale === "en"
                ? "No relevant campus yet."
                : "Belum ada kampus relevan."}
            </div>
          )}
        </div>
      </section>

      {/* ==== GLOBAL ANIMATION & RESPONSIVE TIDY ==== */}
      <style>{`
        /* Reveal animation */
        .reveal {
          opacity: 0;
          transform: var(--reveal-from, translate3d(0, 16px, 0));
          transition: opacity 680ms ease,
            transform 680ms cubic-bezier(0.21, 1, 0.21, 1);
          transition-delay: var(--rvd, 0ms);
          will-change: opacity, transform;
        }
        .reveal[data-anim="up"] { --reveal-from: translate3d(0, 18px, 0); }
        .reveal[data-anim="down"] { --reveal-from: translate3d(0, -18px, 0); }
        .reveal[data-anim="left"] { --reveal-from: translate3d(-18px, 0, 0); }
        .reveal[data-anim="right"] { --reveal-from: translate3d(18px, 0, 0); }
        .reveal[data-anim="zoom"] { --reveal-from: scale(0.96); }
        .reveal.is-visible { opacity: 1; transform: none; }
        @media (prefers-reduced-motion: reduce) {
          .reveal { transition: none !important; opacity: 1 !important; transform: none !important; }
        }

        html, body { overflow-x: clip; }

        /* <=768px: search & filter STACK */
        @media (max-width: 768px){
          :root { --nav-h: 72px; }
          .hero-search-row{
            flex-direction: column;
            gap: 12px;
            width: 100%;
          }
          .hero-search-row .hs-search,
          .hero-search-row .hs-filter{
            height: 56px !important;
            width: 100%;
            min-width: 0;
          }
          .hero-search-row .hs-filter{ padding: 0 18px !important; }
          .ant-pagination { font-size: 12px; }
        }
      `}</style>
    </>
  );
}
