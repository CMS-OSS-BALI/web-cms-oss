"use client";

import { useMemo, useEffect, useRef } from "react";
import { Card, Col, Image, Row, Typography, Collapse } from "antd";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";

import Link from "next/link";
import { useLandingViewModel } from "./useLandingViewModel";
import { sanitizeHtml } from "@/app/utils/dompurify";

const { Title, Paragraph } = Typography;

const CONSULTANT_DETAIL_BASE = "/user/landing-page";
const LEADS_PATH = "/user/leads";

/** ===== Popular route map (klik kartu -> rute ini) ===== */
const POPULAR_ROUTE_MAP = {
  "eng-course": "/user/english-course",
  "translate-doc": "/user/doc.translate",
  "study-overseas": "/user/overseas-study",
  "visa-apply": "/user/visa-apply",
  accommodation: "/user/accommodation", // sesuai permintaan (1 m)
};

/* helpers */
const A = (v) => (Array.isArray(v) ? v : []);
const slugify = (s = "") =>
  String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const TARGET_IMAGE_ASPECT = 16 / 9;
const toFiniteNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const resolveImage16x9 = (input, fallback = "/images/fallback.jpg") => {
  const queue = [input];
  const seen = new Set();

  while (queue.length) {
    const value = queue.shift();
    if (!value) continue;

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
      continue;
    }

    if (Array.isArray(value)) {
      queue.unshift(...value);
      continue;
    }

    if (typeof value !== "object") continue;
    if (seen.has(value)) continue;
    seen.add(value);

    const formats = value.formats || value.variants;
    if (formats && typeof formats === "object") {
      const candidates = [];
      Object.values(formats).forEach((fmt) => {
        if (!fmt) return;

        const collect = (entry) => {
          if (!entry) return;
          if (Array.isArray(entry)) {
            entry.forEach(collect);
            return;
          }
          if (typeof entry === "string") {
            const str = entry.trim();
            if (str) {
              candidates.push({ url: str, width: 0, ratio: null });
            }
            return;
          }
          if (typeof entry !== "object") return;

          const urlValue =
            typeof entry.url === "string"
              ? entry.url
              : typeof entry.src === "string"
              ? entry.src
              : typeof entry.href === "string"
              ? entry.href
              : "";

          if (!urlValue) {
            if (entry.url) queue.unshift(entry.url);
            if (entry.src) queue.unshift(entry.src);
            if (entry.href) queue.unshift(entry.href);
            return;
          }

          const width = toFiniteNumber(entry.width ?? entry.w ?? entry.Width);
          const height = toFiniteNumber(
            entry.height ?? entry.h ?? entry.Height
          );
          const ratio = width && height && height !== 0 ? width / height : null;

          candidates.push({
            url: urlValue,
            width: width || 0,
            ratio,
          });
        };

        collect(fmt);
      });

      if (candidates.length) {
        candidates.sort((a, b) => {
          const diffA =
            typeof a.ratio === "number"
              ? Math.abs(a.ratio - TARGET_IMAGE_ASPECT)
              : Number.POSITIVE_INFINITY;
          const diffB =
            typeof b.ratio === "number"
              ? Math.abs(b.ratio - TARGET_IMAGE_ASPECT)
              : Number.POSITIVE_INFINITY;
          if (diffA !== diffB) return diffA - diffB;
          return (b.width || 0) - (a.width || 0);
        });

        const best = candidates[0];
        if (best?.url) return best.url;
      }
    }

    const ratioKeys = [
      "image16x9",
      "image_16x9",
      "image_16_9",
      "image169",
      "image_169",
      "url16x9",
      "url_16x9",
      "url169",
      "url_169",
      "cover16x9",
      "cover_16x9",
      "cover169",
      "landscape",
      "landscapeUrl",
      "landscape_url",
      "landscape16x9",
      "landscape_16x9",
      "poster16x9",
      "poster_16x9",
      "image9x16",
      "image_9x16",
      "image_9_16",
      "image916",
      "image_916",
      "url9x16",
      "url_9x16",
      "url916",
      "url_916",
      "cover9x16",
      "cover_9x16",
      "cover916",
      "portrait",
      "portraitUrl",
      "portrait_url",
      "portrait9x16",
      "portrait_9x16",
      "poster9x16",
      "poster_9x16",
    ];
    for (const key of ratioKeys) {
      if (value[key]) queue.unshift(value[key]);
    }

    const directKeys = [
      "url",
      "urlDefault",
      "src",
      "href",
      "path",
      "location",
      "file",
      "file_url",
      "fileUrl",
      "public_url",
      "publicUrl",
      "image_public_url",
      "imagePublicUrl",
      "default",
      "originalUrl",
      "original_url",
    ];
    for (const key of directKeys) {
      if (!value[key]) continue;
      const candidate = value[key];
      if (typeof candidate === "string") {
        const trimmed = candidate.trim();
        if (trimmed) return trimmed;
      } else {
        queue.unshift(candidate);
      }
    }

    if (value.data) queue.unshift(value.data);
    if (value.attributes) queue.unshift(value.attributes);
  }

  return fallback;
};

const CONTAINER = { width: "min(1220px, 96%)", margin: "0 auto" };

const toYouTubeEmbed = (input) => {
  try {
    const u = new URL(input);
    let id = "";
    if (u.hostname.includes("youtu.be")) id = u.pathname.replace("/", "");
    else id = u.searchParams.get("v") || "";
    id = id.split("?")[0].split("&")[0];
    return id
      ? `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&controls=1`
      : "";
  } catch {
    return "";
  }
};

/* ===== reveal on scroll (auto observe konten baru) ===== */
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

    // Konten SWR masuk -> observe otomatis
    const mo = new MutationObserver(observeAll);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, deps);
}

/* subtle hero parallax (non-intrusive) */
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

/* ====== HERO ====== */
const hero = {
  shell: {
    width: "100vw",
    marginLeft: "calc(50% - 50vw)",
    marginRight: "calc(50% - 50vw)",
    marginTop: "calc(-1 * clamp(48px, 8vw, 84px))",
    position: "relative",
    overflow: "hidden",
  },
  inner: (bg) => ({
    position: "relative",
    isolation: "isolate",
    background: bg
      ? `url(${bg}) center / cover no-repeat`
      : "linear-gradient(180deg, #f2f7ff 0%, #e9f2ff 100%)",
    height:
      "min(max(520px, calc(100dvh - var(--nav-h, 80px))), calc(100svh - var(--nav-h, 80px)))",
    display: "grid",
    placeItems: "center",
    padding: "24px 14px",
  }),
  overlay: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(180deg, rgba(0,0,0,.06) 0%, rgba(0,0,0,.10) 40%, rgba(0,0,0,.06) 100%)",
    zIndex: 0,
    pointerEvents: "none",
  },
  copy: {
    position: "relative",
    zIndex: 1,
    width: "min(980px, 92%)",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    gap: 14,
    willChange: "transform",
  },
  title: {
    marginTop: -56,
    color: "#0B3E91",
    textTransform: "uppercase",
    fontWeight: 900,
    fontSize: "clamp(28px, 8vw, 72px)",
    letterSpacing: "0.06em",
    textShadow:
      "0 1px 0 #fff, 0 6px 20px rgba(0,36,96,.18), 0 0 24px rgba(90,166,255,.24)",
    lineHeight: 1.06,
  },
  desc: {
    margin: 0,
    color: "#0B3E91",
    fontSize: "clamp(14px, 3.6vw, 20px)",
    fontWeight: 700,
    lineHeight: 1.6,
    textShadow: "0 1px 0 rgba(255,255,255,.7)",
  },
  ctaDock: {
    position: "absolute",
    left: "50%",
    transform: "translateX(-50%)",
    bottom:
      "calc(env(safe-area-inset-bottom, 0px) + clamp(16px, 5vh, 56px) + 64px)",
    zIndex: 2,
  },
  cta: {
    display: "inline-block",
    background: "#0b56c9",
    color: "#fff",
    padding: "14px 24px",
    borderRadius: 999,
    fontWeight: 900,
    letterSpacing: "0.02em",
    fontSize: "clamp(14px, 2.6vw, 20px)",
    boxShadow: "0 14px 28px rgba(11,86,201,.28)",
    textDecoration: "none",
    whiteSpace: "nowrap",
  },
};

/* ====== VIDEO EDUCATION ====== */
const vid = {
  section: {
    width: "100vw",
    marginLeft: "calc(50% - 50vw)",
    marginRight: "calc(50% - 50vw)",
    background: "#fff",
    padding: "24px 0 48px",
  },
  box: {
    background: "#EEF4FF",
    borderRadius: 14,
    padding: "clamp(14px, 2.5vw, 24px)",
    boxShadow: "0 12px 26px rgba(8,42,116,0.12)",
    border: "1px solid #DFE8F6",
  },
  title: {
    margin: 0,
    color: "#0B3E91",
    fontWeight: 900,
    letterSpacing: "0.02em",
    fontSize: "clamp(18px, 3.6vw, 28px)",
    lineHeight: 1.25,
  },
  desc: {
    margin: "10px 0 0",
    color: "#2a3e65",
    fontSize: "clamp(12px, 2.4vw, 14px)",
    lineHeight: 1.7,
  },
  videoWrap: {
    position: "relative",
    width: "100%",
    aspectRatio: "16 / 9",
    borderRadius: 14,
    overflow: "hidden",
    background: "#E7F0FF",
    boxShadow: "0 10px 20px rgba(8,42,116,0.15)",
  },
  centerBlock: { textAlign: "center", marginTop: 32 },
};

/* ====== POPULAR ====== */
const popular = {
  section: {
    width: "100vw",
    marginLeft: "calc(50% - 50vw)",
    marginRight: "calc(50% - 50vw)",
    background: "#fff",
    padding: "32px 0 48px",
  },
};

/* ====== TESTIMONIALS spacing ====== */
const testi = {
  section: {
    width: "100vw",
    marginLeft: "calc(50% - 50vw)",
    marginRight: "calc(50% - 50vw)",
    background: "#fff",
    padding: "48px 0px 64px",
  },
};

/* ====== FAQ ====== */
const faq = {
  section: {
    width: "100vw",
    marginLeft: "calc(50% - 50vw)",
    marginRight: "calc(50% - 50vw)",
    background: "#fff",
    padding: "24px 0px 64px",
  },
};

/* ====== CONSULTANTS ====== */
const consultants = {
  section: {
    width: "100vw",
    marginLeft: "calc(50% - 50vw)",
    marginRight: "calc(50% - 50vw)",
    background: "#fff",
    padding: "48px 0px 64px",
  },
};

export default function LandingContent({ locale = "id" }) {
  const heroRef = useRef(null);

  const {
    hero: H,
    popularProgram,
    testimonials: TST,
    testimonialsList,
    consultants: CONS,
    faq: FAQ,
    education: EDU,
    countryPartners: CP,
  } = useLandingViewModel({ locale });

  const popularItems = A(popularProgram?.items);
  const testiContent = A(testimonialsList);
  const consItems = A(CONS?.items);

  // NEW: country partners split rows
  const cpItems = A(CP?.items);
  const cpHalf = Math.ceil(cpItems.length / 2);
  const cpTop = cpItems.slice(0, cpHalf);
  const cpBottom = cpItems.slice(cpHalf);
  const cpTopLoop = cpTop.length > 1;
  const cpBottomLoop = cpBottom.length > 1;
  const cpTopKey =
    cpTop.map((c) => c?.id ?? c?.name ?? "").join("|") || "country-top-empty";
  const cpBottomKey =
    cpBottom.map((c) => c?.id ?? c?.name ?? "").join("|") ||
    "country-bottom-empty";
  const countrySpeed = useMemo(() => {
    const base = Math.max(1, cpItems.length);
    const computed = base * 900;
    return Math.max(5000, Math.min(14000, computed));
  }, [cpItems.length]);

  // observe reveal saat data async datang
  useRevealOnScroll([
    testiContent.length,
    consItems.length,
    popularItems.length,
    cpItems.length,
  ]);
  useHeroParallax(heroRef);

  const hasMultipleTesti = testiContent.length > 1;
  const testiAutoplay = useMemo(
    () =>
      hasMultipleTesti
        ? {
            delay: 0,
            disableOnInteraction: false,
            pauseOnMouseEnter: false,
            stopOnLastSlide: false,
            waitForTransition: false,
          }
        : false,
    [hasMultipleTesti]
  );
  const testiSwiperKey = useMemo(
    () => `${hasMultipleTesti ? "loop" : "single"}-${testiContent.length}`,
    [hasMultipleTesti, testiContent.length]
  );

  const countryAutoplayBase = useMemo(
    () => ({
      delay: 0,
      disableOnInteraction: false,
      pauseOnMouseEnter: true,
      waitForTransition: false,
    }),
    []
  );

  const cpTopAutoplay = useMemo(
    () => (cpTopLoop ? countryAutoplayBase : false),
    [cpTopLoop, countryAutoplayBase]
  );

  const cpBottomAutoplay = useMemo(
    () => (cpBottomLoop ? countryAutoplayBase : false),
    [cpBottomLoop, countryAutoplayBase]
  );

  const faqItems = useMemo(
    () =>
      A(FAQ?.items).map((item, i) => ({
        key: `q${i + 1}`,
        label: (
          <div className="faq-pill">
            <span className="faq-pill__text">{item.q}</span>
            <span className="faq-pill__chev" aria-hidden>
              ▾
            </span>
          </div>
        ),
        children: <Paragraph style={{ margin: 0 }}>{item.a}</Paragraph>,
      })),
    [FAQ]
  );

  const EDU0 = EDU?.blocks?.[0] || {};
  const EDU1 = EDU?.blocks?.[1] || {};

  return (
    <>
      {/* HERO */}
      <header style={hero.shell}>
        <div style={hero.inner(H?.background)} ref={heroRef}>
          <div style={hero.overlay} aria-hidden />
          <div style={hero.copy} className="js-hero-copy">
            <Title
              level={1}
              className="reveal"
              data-anim="down"
              style={{ ...hero.title, ["--rvd"]: "60ms" }}
            >
              {H?.title}
            </Title>
            {H?.description ? (
              <Paragraph
                className="reveal"
                data-anim="up"
                style={{ ...hero.desc, ["--rvd"]: "140ms" }}
              >
                {H.description}
              </Paragraph>
            ) : null}
          </div>
          {H?.ctaText ? (
            <div style={hero.ctaDock}>
              <Link
                href={LEADS_PATH}
                className="hero-cta hero-cta--bob reveal"
                data-anim="up"
                style={{ ...hero.cta, ["--rvd"]: "220ms" }}
              >
                {H.ctaText}
              </Link>
            </div>
          ) : null}
        </div>
      </header>

      {/* VIDEO EDUCATION */}
      <section style={vid.section}>
        <div style={CONTAINER}>
          <div
            className="reveal"
            data-anim="zoom"
            style={{ ["--rvd"]: "40ms" }}
          >
            <div style={vid.box}>
              <Row gutter={[20, 20]} align="middle" wrap>
                <Col
                  xs={24}
                  md={10}
                  className="reveal"
                  data-anim="left"
                  style={{ ["--rvd"]: "80ms" }}
                >
                  <div className="yt-embed" style={vid.videoWrap}>
                    <iframe
                      src={toYouTubeEmbed(EDU0.youtube || "")}
                      title={EDU0.title || "Video"}
                      loading="lazy"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        border: 0,
                      }}
                    />
                  </div>
                </Col>
                <Col
                  xs={24}
                  md={14}
                  className="reveal"
                  data-anim="right"
                  style={{ ["--rvd"]: "140ms" }}
                >
                  <Title level={3} style={vid.title}>
                    {EDU0.title}
                  </Title>
                  <Paragraph style={vid.desc}>{EDU0.desc}</Paragraph>
                </Col>
              </Row>
            </div>
          </div>

          <div style={{ height: 20 }} />

          <div
            className="reveal"
            data-anim="zoom"
            style={{ ["--rvd"]: "40ms" }}
          >
            <div style={vid.box}>
              <Row gutter={[20, 20]} align="middle" wrap>
                {/* gunakan prop order responsif supaya konsisten */}
                <Col
                  xs={{ span: 24, order: 2 }}
                  md={{ span: 14, order: 1 }}
                  className="reveal"
                  data-anim="left"
                  style={{ ["--rvd"]: "80ms" }}
                >
                  <Title level={3} style={vid.title}>
                    {EDU1.title}
                  </Title>
                  <Paragraph style={vid.desc}>{EDU1.desc}</Paragraph>
                </Col>
                <Col
                  xs={{ span: 24, order: 1 }}
                  md={{ span: 10, order: 2 }}
                  className="reveal"
                  data-anim="right"
                  style={{ ["--rvd"]: "140ms" }}
                >
                  <div className="yt-embed" style={vid.videoWrap}>
                    <iframe
                      src={toYouTubeEmbed(EDU1.youtube || "")}
                      title={EDU1.title || "Video"}
                      loading="lazy"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        border: 0,
                      }}
                    />
                  </div>
                </Col>
              </Row>
            </div>
          </div>

          <div style={{ height: 28 }} />

          <div style={vid.centerBlock}>
            <Title
              level={3}
              className="reveal"
              data-anim="down"
              style={{ ...vid.title, ["--rvd"]: "40ms" }}
            >
              {EDU?.centerTitle}
            </Title>
            <Paragraph
              className="reveal"
              data-anim="up"
              style={{ ...vid.desc, marginTop: 8, ["--rvd"]: "120ms" }}
            >
              {EDU?.centerSubtitle}
            </Paragraph>

            <div
              className="reveal"
              data-anim="zoom"
              style={{ ["--rvd"]: "200ms", marginTop: 16 }}
            >
              <div
                className="yt-embed yt-embed--lg"
                style={{
                  ...vid.videoWrap,
                  marginInline: "auto",
                  maxWidth: 860,
                }}
              >
                <iframe
                  src={toYouTubeEmbed(EDU?.centerYoutube || "")}
                  title={EDU?.centerTitle || "Video"}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    border: 0,
                  }}
                />
              </div>
            </div>

            {(H?.ctaText || H?.ctaHref) && (
              <div style={{ marginTop: 18 }}>
                <Link
                  href={LEADS_PATH}
                  className="hero-cta hero-cta--pulse reveal"
                  data-anim="up"
                  style={{ ...hero.cta, ["--rvd"]: "260ms" }}
                >
                  {H?.ctaText || "Konsultasi Gratis Sekarang"}
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* POPULAR PROGRAM */}
      <section style={popular.section}>
        <div style={CONTAINER}>
          <Row gutter={[24, 24]} align="middle" wrap>
            {/* Left copy */}
            <Col xs={24} md={11} className="popular-copy">
              <Title
                level={2}
                className="popular-headline reveal"
                data-anim="left"
                style={{ ["--rvd"]: "40ms" }}
              >
                {popularProgram?.headline}
              </Title>
              {popularProgram?.subheadline ? (
                <Paragraph
                  className="popular-subheadline reveal"
                  data-anim="up"
                  style={{ ["--rvd"]: "120ms" }}
                >
                  {popularProgram.subheadline}
                </Paragraph>
              ) : null}

              {popularProgram?.ctaText ? (
                <Link
                  href={LEADS_PATH}
                  className="popular-cta reveal"
                  data-anim="up"
                  style={{ ["--rvd"]: "200ms" }}
                >
                  {popularProgram.ctaText}
                </Link>
              ) : null}
            </Col>

            {/* Right slider */}
            <Col xs={24} md={13}>
              <div
                className="popular-slider reveal"
                data-anim="right"
                style={{ ["--rvd"]: "80ms" }}
              >
                <button
                  className="popular-nav popular-prev"
                  aria-label="Slide sebelumnya"
                  type="button"
                >
                  ‹
                </button>
                <button
                  className="popular-nav popular-next"
                  aria-label="Slide berikutnya"
                  type="button"
                >
                  ›
                </button>

                <Swiper
                  className="landing-popular-swiper--hero"
                  modules={[Navigation]}
                  loop
                  centeredSlides
                  slidesPerView={1}
                  spaceBetween={0}
                  initialSlide={0}
                  navigation={{
                    prevEl: ".popular-prev",
                    nextEl: ".popular-next",
                  }}
                >
                  {popularItems.map((p, idx) => {
                    const href = POPULAR_ROUTE_MAP[p.id] || LEADS_PATH;
                    return (
                      <SwiperSlide
                        key={p.id ?? `${p.label}-${idx}`}
                        className="popular-slide"
                      >
                        <Link
                          href={href}
                          className="popular-link"
                          aria-label={p.label || "Popular"}
                          prefetch={false}
                        >
                          <div
                            className="popular-card popular-card--fixed"
                            data-anim="zoom"
                            style={{ ["--rvd"]: `${(idx % 6) * 60}ms` }}
                          >
                            <div className="popular-imgWrap">
                              <Image
                                src={resolveImage16x9(
                                  p.image,
                                  "/images/fallback.jpg"
                                )}
                                alt={p.label || "Popular"}
                                preview={false}
                                fallback="/images/fallback.jpg"
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  background: "transparent",
                                }}
                                imgProps={{
                                  loading: "lazy",
                                  style: {
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                    display: "block",
                                  },
                                }}
                              />
                              <div className="popular-pill">{p.label}</div>
                            </div>
                          </div>
                        </Link>
                      </SwiperSlide>
                    );
                  })}
                </Swiper>
              </div>
            </Col>
          </Row>
        </div>
      </section>

      {/* TESTIMONIALS — autoplay marquee */}
      <section style={testi.section}>
        <div style={CONTAINER}>
          <Title
            level={2}
            className="testiV2-title reveal"
            data-anim="down"
            style={{ ["--rvd"]: "40ms" }}
          >
            {TST?.title}
          </Title>
          {TST?.subtitle ? (
            <Paragraph
              className="reveal"
              data-anim="up"
              style={{ textAlign: "center", marginTop: 6, ["--rvd"]: "120ms" }}
            >
              {TST.subtitle}
            </Paragraph>
          ) : null}
        </div>

        <div className="testiV2-wrap">
          <Swiper
            key={testiSwiperKey}
            className="testiV2-swiper"
            modules={[Autoplay]}
            slidesPerView="auto"
            spaceBetween={16}
            loop={hasMultipleTesti}
            loopAdditionalSlides={
              hasMultipleTesti ? Math.max(20, testiContent.length) : 0
            }
            speed={7000}
            allowTouchMove={hasMultipleTesti}
            autoplay={
              hasMultipleTesti
                ? {
                    delay: 0,
                    disableOnInteraction: false,
                    pauseOnMouseEnter: false,
                    stopOnLastSlide: false,
                    waitForTransition: false,
                  }
                : false
            }
            observer
            observeParents
            watchSlidesProgress
            preloadImages={false}
          >
            {testiContent.map((t, idx) => (
              <SwiperSlide key={t.id ?? `${t.name}-${idx}`}>
                <div
                  className="testiV2-card reveal"
                  data-anim="zoom"
                  style={{ ["--rvd"]: `${(idx % 5) * 80}ms` }}
                >
                  <div className="testiV2-photo">
                    <img
                      src={t.photoUrl || "/images/avatars/default.jpg"}
                      alt={t.name || "avatar"}
                      onError={(e) => {
                        e.currentTarget.src = "/images/avatars/default.jpg";
                      }}
                      loading="lazy"
                    />
                  </div>

                  <div className="testiV2-copy">
                    <h4 className="testiV2-name">{t.name}</h4>
                    <div
                      className="testiV2-quote"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeHtml(t.message || ""),
                      }}
                    />
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </section>

      {/* FAQ */}
      <section style={faq.section}>
        <div style={CONTAINER}>
          <Title
            level={2}
            className="faqV2-title reveal"
            data-anim="down"
            style={{ ["--rvd"]: "40ms" }}
          >
            {FAQ?.title}
          </Title>
          <Row gutter={[24, 24]} style={{ marginTop: 20 }} align="middle" wrap>
            <Col
              xs={24}
              lg={16}
              className="reveal"
              data-anim="left"
              style={{ paddingRight: "clamp(8px,2vw,24px)", ["--rvd"]: "80ms" }}
            >
              <Collapse
                className="faq-collapse"
                expandIcon={() => null}
                ghost
                showArrow={false}
                items={faqItems}
              />
            </Col>
            <Col
              xs={24}
              lg={8}
              className="reveal"
              data-anim="zoom"
              style={{
                display: "flex",
                justifyContent: "center",
                ["--rvd"]: "140ms",
              }}
            >
              <img
                src={FAQ?.illustration || "/images/loading.png"}
                alt="OSS Bali Mascot"
                style={{
                  width: "min(360px, 90%)",
                  height: "auto",
                  objectFit: "contain",
                }}
                onError={(e) => {
                  e.currentTarget.src = "/images/mascot-faq-fallback.png";
                }}
                loading="lazy"
              />
            </Col>
          </Row>
        </div>
      </section>

      {/* CONSULTANTS */}
      <section style={consultants.section}>
        <div style={CONTAINER}>
          {/* Ganti className ke faqV2-title supaya sama seperti bagian FAQ */}
          <Title
            level={2}
            className="faqV2-title reveal"
            data-anim="down"
            style={{ ["--rvd"]: "40ms" }}
          >
            {CONS?.title || "Temukan Solusimu Bersama Ahli Kami"}
          </Title>

          <Row
            gutter={[24, 24]}
            style={{ marginTop: 64 }}
            justify="center"
            wrap
          >
            {consItems.map((c, i) => {
              const slug = c?.slug || c?.id || slugify(c?.name || "");
              const href = `${CONSULTANT_DETAIL_BASE}/${encodeURIComponent(
                slug
              )}`;

              return (
                <Col
                  key={c.id || slug}
                  xs={24}
                  sm={12}
                  lg={8}
                  className="reveal"
                  data-anim="up"
                  style={{ ["--rvd"]: `${(i % 6) * 70}ms` }}
                >
                  <Link
                    href={href}
                    className="consult3-link"
                    aria-label={c?.name}
                  >
                    <article className="consult3-card">
                      {/* foto PNG transparan (full/half body) */}
                      <div className="consult3-photo">
                        <img
                          src={c.photo || "/images/avatars/default.jpg"}
                          alt={c.name || "Consultant"}
                          loading="lazy"
                          onError={(e) =>
                            (e.currentTarget.src =
                              "/images/avatars/default.jpg")
                          }
                        />
                      </div>

                      {/* copy di bawah */}
                      <div className="consult3-bottom">
                        <h4 className="consult3-name">
                          {(c.name || "").trim()}
                        </h4>
                        <div
                          className="consult3-role"
                          dangerouslySetInnerHTML={{
                            __html: sanitizeHtml(
                              c.role ||
                                c.title ||
                                (Array.isArray(c.bio)
                                  ? c.bio.join("<br/>")
                                  : c.bio || "")
                            ),
                          }}
                        />
                      </div>

                      {/* aksen halus */}
                      <span className="consult3-shine" aria-hidden />
                    </article>
                  </Link>
                </Col>
              );
            })}
          </Row>
        </div>
      </section>

      {/* ====== COUNTRY PARTNERS (NEW) ====== */}
      <section className="country-section">
        <div style={CONTAINER}>
          <Title
            level={2}
            className="country-title reveal"
            data-anim="down"
            style={{ ["--rvd"]: "40ms" }}
          >
            {CP?.title || "Negara Partner"}
          </Title>

          {/* Row Top - ke kanan */}
          {cpTop.length > 0 ? (
            <div
              className="country-row reveal"
              data-anim="up"
              style={{ ["--rvd"]: "100ms" }}
            >
              <Swiper
                key={cpTopKey}
                className="country-swiper country-swiper--reverse"
                modules={[Autoplay]}
                slidesPerView="auto"
                spaceBetween={14}
                loop={cpTopLoop}
                loopAdditionalSlides={
                  cpTopLoop ? Math.max(10, cpTop.length) : 0
                }
                speed={Math.max(
                  5000,
                  Math.min(14000, Math.max(1, cpItems.length) * 900)
                )}
                allowTouchMove={cpTopLoop}
                autoplay={
                  cpTopLoop
                    ? {
                        delay: 0,
                        disableOnInteraction: false,
                        pauseOnMouseEnter: true,
                        waitForTransition: false,
                      }
                    : false
                }
                observer
                observeParents
                watchSlidesProgress
                preloadImages={false}
              >
                {cpTop.map((c) => (
                  <SwiperSlide
                    key={`ctop-${c.id}`}
                    style={{ width: "var(--country-card-w)" }}
                  >
                    <article className="country-card" title={c.name}>
                      <div className="country-photo">
                        <img
                          src={c.cover || "/images/country-fallback.jpg"}
                          alt={c.name}
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.src =
                              "/images/country-fallback.jpg";
                          }}
                        />
                        <div className="country-flag">
                          <img
                            src={c.flag}
                            alt={`${c.name} flag`}
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.src = "/flags/gb.svg";
                            }}
                          />
                          <span className="country-flag-name">{c.name}</span>
                        </div>
                      </div>
                      <div className="country-name">{c.name}</div>
                    </article>
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
          ) : null}

          {/* Row Bottom - ke kiri */}
          {cpBottom.length > 0 ? (
            <div
              className="country-row reveal"
              data-anim="up"
              style={{ ["--rvd"]: "160ms", marginTop: 12 }}
            >
              <Swiper
                key={cpBottomKey}
                className="country-swiper"
                modules={[Autoplay]}
                slidesPerView="auto"
                spaceBetween={14}
                loop={cpBottomLoop}
                loopAdditionalSlides={
                  cpBottomLoop ? Math.max(10, cpBottom.length) : 0
                }
                speed={Math.max(
                  5000,
                  Math.min(14000, Math.max(1, cpItems.length) * 900)
                )}
                allowTouchMove={cpBottomLoop}
                autoplay={
                  cpBottomLoop
                    ? {
                        delay: 0,
                        disableOnInteraction: false,
                        pauseOnMouseEnter: true,
                        waitForTransition: false,
                      }
                    : false
                }
                observer
                observeParents
                watchSlidesProgress
                preloadImages={false}
              >
                {cpBottom.map((c) => (
                  <SwiperSlide
                    key={`cbot-${c.id}`}
                    style={{ width: "var(--country-card-w)" }}
                  >
                    <article className="country-card" title={c.name}>
                      <div className="country-photo">
                        <img
                          src={c.cover || "/images/country-fallback.jpg"}
                          alt={c.name}
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.src =
                              "/images/country-fallback.jpg";
                          }}
                        />
                        <div className="country-flag">
                          <img
                            src={c.flag}
                            alt={`${c.name} flag`}
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.src = "/flags/gb.svg";
                            }}
                          />
                          <span className="country-flag-name">{c.name}</span>
                        </div>
                      </div>
                      <div className="country-name">{c.name}</div>
                    </article>
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
          ) : null}
        </div>
      </section>

      {/* ==== GLOBAL STYLES ==== */}
      <style jsx global>{`
        :root {
          --popular-card-w: clamp(240px, 28vw, 360px);
          --nav-h: 80px;
          --country-card-w: clamp(220px, 26vw, 300px);
        }

        /* ===== Fix: Swiper height di mobile ===== */
        .testiV2-swiper,
        .landing-popular-swiper--hero {
          height: auto !important;
        }
        .testiV2-swiper .swiper-slide,
        .landing-popular-swiper--hero .swiper-slide {
          display: flex;
          justify-content: center; /* center horizontal */
          height: auto;
        }
        .testiV2-swiper .swiper-wrapper,
        .landing-popular-swiper--hero .swiper-wrapper {
          align-items: stretch;
        }
        @media (max-width: 767px) {
          .testiV2-swiper {
            min-height: 220px;
          }
        }

        /* ===== Reveal utilities ===== */
        .reveal {
          opacity: 0;
          transform: var(--reveal-from, translate3d(0, 16px, 0));
          transition: opacity 700ms ease,
            transform 700ms cubic-bezier(0.21, 1, 0.21, 1);
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
        @media (prefers-reduced-motion: reduce) {
          .reveal {
            transition: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
          .hero-cta--bob,
          .hero-cta--pulse {
            animation: none !important;
          }
        }

        /* ===== Hero CTA micro-motions ===== */
        @keyframes y-bob {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-4px);
          }
        }
        .hero-cta--bob {
          animation: y-bob 3s ease-in-out infinite;
        }
        @keyframes pulse-soft {
          0%,
          100% {
            box-shadow: 0 14px 28px rgba(11, 86, 201, 0.28);
          }
          50% {
            box-shadow: 0 18px 36px rgba(11, 86, 201, 0.34);
          }
        }
        .hero-cta--pulse {
          animation: pulse-soft 2.8s ease-in-out infinite;
        }
        .hero-cta:focus-visible {
          outline: 3px solid #5aa8ff;
          outline-offset: 3px;
          border-radius: 999px;
        }

        /* ===== Popular board ===== */
        .popular-board {
          position: relative;
          border-radius: 16px;
          padding: clamp(16px, 2.6vw, 28px);
          background: linear-gradient(180deg, #f0f6ff 0%, #e8f1ff 100%);
          border: 1px solid #dfe8f6;
          box-shadow: 0 16px 32px rgba(8, 42, 116, 0.12),
            inset 0 2px 0 rgba(255, 255, 255, 0.7);
        }
        .popular-headline {
          margin: 0 !important;
          color: #0b3e91 !important;
          font-weight: 900 !important;
          letter-spacing: 0.02em;
          font-size: clamp(20px, 4vw, 34px) !important;
          line-height: 1.15 !important;
        }
        .popular-subheadline {
          margin: 8px 0 0 !important;
          color: #2a3e65 !important;
          font-size: clamp(13px, 2.2vw, 18px) !important;
        }
        .popular-cta {
          display: inline-block;
          margin-top: clamp(12px, 2.2vw, 20px);
          padding: 12px 22px;
          border-radius: 999px;
          background: #0b56c9;
          color: #fff;
          font-weight: 800;
          text-decoration: none;
          box-shadow: 0 12px 24px rgba(11, 86, 201, 0.25);
          transition: transform 0.18s ease;
        }
        @media (hover: hover) {
          .popular-cta:hover {
            transform: translateY(-1px);
          }
        }

        .popular-slider {
          position: relative;
          padding: clamp(2px, 0.6vw, 6px) clamp(24px, 2.2vw, 28px);
        }
        .popular-nav {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          z-index: 5;
          width: 36px;
          height: 36px;
          border: none;
          border-radius: 50%;
          background: #fff;
          color: #0b3e91;
          font-size: 22px;
          line-height: 36px;
          text-align: center;
          box-shadow: 0 10px 22px rgba(8, 42, 116, 0.18);
          cursor: pointer;
          transition: transform 0.16s ease, box-shadow 0.16s ease;
        }
        @media (hover: hover) {
          .popular-nav:hover {
            transform: translateY(-50%) scale(1.06);
            box-shadow: 0 12px 26px rgba(8, 42, 116, 0.22);
          }
        }
        .popular-prev {
          left: 0;
        }
        .popular-next {
          right: 0;
        }
        .landing-popular-swiper--hero {
          overflow: hidden;
        }
        .landing-popular-swiper--hero .swiper-wrapper {
          align-items: center;
        }
        .landing-popular-swiper--hero .swiper-slide {
          display: flex;
          justify-content: center;
          height: auto;
          visibility: hidden;
        }
        .landing-popular-swiper--hero .swiper-slide.swiper-slide-active {
          visibility: visible;
        }
        .popular-card--fixed {
          width: var(--popular-card-w);
          margin-inline: auto;
        }
        .popular-card {
          background: transparent;
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 14px 28px rgba(8, 42, 116, 0.16);
          transition: transform 0.22s ease, box-shadow 0.22s ease;
          will-change: transform;
          position: relative;
          isolation: isolate;
          cursor: pointer; /* tanda bisa diklik */
        }
        .popular-link {
          display: block; /* biar anchor seluas kartu */
          text-decoration: none;
          color: inherit;
        }
        .popular-card::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(
            120deg,
            transparent 30%,
            rgba(255, 255, 255, 0.35) 45%,
            transparent 60%
          );
          transform: translateX(-150%);
          pointer-events: none;
        }
        @media (hover: hover) {
          .popular-slide:not(.swiper-slide-active) .popular-card {
            transform: scale(0.94);
            box-shadow: 0 10px 20px rgba(8, 42, 116, 0.1);
          }
          .popular-card:hover::after {
            animation: shine 850ms ease;
          }
        }
        @keyframes shine {
          to {
            transform: translateX(150%);
          }
        }

        .popular-imgWrap {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
        }
        .popular-imgWrap :global(.ant-image-img) {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .popular-pill {
          position: absolute;
          left: 50%;
          bottom: 10px;
          transform: translateX(-50%);
          background: #0b3e91;
          color: #fff;
          border-radius: 999px;
          padding: 10px 16px;
          font-weight: 800;
          font-size: 12px;
          letter-spacing: 0.04em;
          white-space: nowrap;
          box-shadow: 0 8px 16px rgba(8, 42, 116, 0.2);
        }

        /* === NEW: center-kan copy Popular di mobile === */
        .popular-copy {
        }
        @media (max-width: 767px) {
          .popular-copy {
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            margin-inline: auto;
            max-width: 560px;
          }
          .popular-headline,
          .popular-subheadline {
            text-align: inherit !important;
          }
          .popular-cta {
            margin-inline: auto;
            display: inline-flex;
            justify-content: center;
            align-items: center;
          }
        }

        /* ===== Testimonials v2 ===== */
        .testiV2-title {
          margin: 0 !important;
          text-align: center;
          color: #0b3e91 !important;
          font-weight: 900 !important;
          letter-spacing: 0.02em;
          font-size: clamp(22px, 5.6vw, 40px) !important;
        }
        .testiV2-wrap {
          position: relative;
          width: 100vw;
          margin-left: calc(50% - 50vw);
          margin-right: calc(50% - 50vw);
          padding: 0 clamp(20px, 5vw, 72px);
          margin-top: 24px;
          overflow: visible;
          -webkit-mask-image: linear-gradient(
            to right,
            transparent,
            black 7%,
            black 93%,
            transparent
          );
          mask-image: linear-gradient(
            to right,
            transparent,
            black 7%,
            black 93%,
            transparent
          );
        }
        .testiV2-card {
          width: min(1180px, 96%);
          margin: 0 auto;
          display: grid;
          grid-template-columns: clamp(220px, 28vw, 320px) 1fr;
          align-items: center;
          gap: clamp(16px, 3.2vw, 44px);
          background: #eaf3ff;
          border: 1px solid #dfe8f6;
          border-radius: 18px;
          padding: clamp(18px, 3.6vw, 34px);
          box-shadow: 0 16px 32px rgba(8, 42, 116, 0.12);
          justify-content: center;
        }
        .testiV2-photo {
          width: 100%;
          aspect-ratio: 1 / 1;
          border-radius: 16px;
          overflow: hidden;
          background: #cfdaf2;
        }
        .testiV2-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transform: translateZ(0);
        }
        .testiV2-name {
          margin: 0 0 8px 0;
          color: #0b3e91;
          font-size: clamp(16px, 2.4vw, 18px);
          font-weight: 800;
          letter-spacing: 0.02em;
          text-transform: uppercase;
        }
        .testiV2-quote {
          margin: 0;
          color: #2a3e65;
          font-size: clamp(14px, 2.2vw, 16px);
          line-height: 1.7;
          font-style: italic;
        }
        .testiV2-swiper {
          overflow: visible;
        }
        .testiV2-swiper .swiper-wrapper {
          transition-timing-function: linear !important;
        }
        @media (min-width: 992px) {
          .testiV2-card {
            margin-left: 60px;
          }
        }
        @media (max-width: 767px) {
          .testiV2-card {
            width: min(640px, 94%);
            grid-template-columns: 1fr;
            text-align: center;
            margin-left: 0;
          }
          .testiV2-photo {
            max-width: 260px;
            margin: 0 auto;
          }
        }

        /* ===== FAQ ===== */
        .faqV2-title {
          margin: 0 !important;
          font-size: clamp(22px, 5.4vw, 40px) !important;
          font-weight: 900 !important;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #0b3e91 !important;
          text-align: center;
        }
        .faq-collapse .ant-collapse-item {
          margin-bottom: 12px;
          border: 0 !important;
          background: transparent;
        }
        .faq-collapse .ant-collapse-header {
          padding: 0 !important;
          background: transparent !important;
        }
        .faq-pill {
          background: #0b3e91;
          color: #fff;
          border-radius: 9999px;
          padding: 14px 18px;
          font-weight: 800;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          box-shadow: 0 10px 22px rgba(8, 42, 116, 0.25);
          line-height: 1.2;
          min-height: 44px;
        }
        .faq-pill__chev {
          font-size: 16px;
          transform: rotate(0deg);
          transition: transform 0.25s ease;
          flex-shrink: 0;
        }
        .faq-collapse .ant-collapse-item-active .faq-pill__chev {
          transform: rotate(180deg);
        }
        .faq-collapse .ant-collapse-content {
          border: 0 !important;
          background: #f7f9ff;
          border-radius: 16px;
          overflow: hidden;
          animation: faqFade 0.28s ease;
        }
        @keyframes faqFade {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }
        .faq-collapse .ant-collapse-content-box {
          padding: 16px 18px 18px !important;
          font-size: 15px;
          color: #2a3e65;
          line-height: 1.7;
        }

        :root {
          /* mudah diatur: radius & tinggi minimum */
          --consult3-r: clamp(22px, 3vw, 36px);
          --consult3-minh: 420px;
          --consult3-bg-a: #0b56c9;
          --consult3-bg-b: #084a94;
          --consult3-bg-c: #063e7c;
        }

        .consult3-link {
          text-decoration: none;
          color: inherit;
          display: block;
        }

        .consult3-card {
          position: relative;
          min-height: var(--consult3-minh);
          border-radius: var(--consult3-r);
          overflow: hidden;
          /* gradient biru seperti desain */
          background: radial-gradient(
            140% 120% at 20% -10%,
            var(--consult3-bg-a) 0%,
            var(--consult3-bg-b) 48%,
            var(--consult3-bg-c) 100%
          );
          box-shadow: 0 18px 34px rgba(0, 0, 0, 0.18);
          isolation: isolate;
          /* grid buat bottom area selalu nempel bawah */
          display: grid;
          grid-template-rows: 1fr auto;
          align-items: end;
          transition: transform 0.18s ease, box-shadow 0.18s ease,
            filter 0.18s ease;
        }

        /* aksen shine tipis di sisi kiri */
        .consult3-shine {
          position: absolute;
          inset: 0 auto 0 0;
          width: 2px;
          opacity: 0.8;
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.45),
            rgba(255, 255, 255, 0)
          );
          mix-blend-mode: soft-light;
          pointer-events: none;
        }

        /* foto di tengah atas, agak “mengambang” */
        .consult3-photo {
          position: absolute;
          inset: clamp(18px, 3vw, 28px) 0 auto 0;
          display: grid;
          place-items: center;
          pointer-events: none;
        }
        .consult3-photo img {
          width: min(86%, 360px);
          height: auto;
          object-fit: contain;
          display: block;
          filter: drop-shadow(0 18px 26px rgba(0, 0, 0, 0.32));
          transform: translateY(6px);
        }

        /* bottom info band (nama + role) */
        .consult3-bottom {
          position: relative;
          z-index: 1;
          padding: clamp(14px, 2.6vw, 20px) clamp(16px, 2.8vw, 22px)
            clamp(18px, 3vw, 24px);
          /* gradien transparan supaya teks kebaca di atas foto */
          background: linear-gradient(
            180deg,
            rgba(0, 0, 0, 0) 0%,
            rgba(0, 0, 0, 0.08) 22%,
            rgba(0, 0, 0, 0.22) 100%
          );
        }
        .consult3-name {
          margin: 0 0 6px 0;
          color: #fff;
          font-weight: 900;
          letter-spacing: 0.02em;
          font-size: clamp(18px, 2.8vw, 24px);
          text-transform: none; /* kalau mau ALL CAPS: uppercase */
        }
        .consult3-role {
          color: #dce9ff;
          font-weight: 600;
          font-size: clamp(12px, 2.1vw, 14px);
          line-height: 1.5;
        }

        /* hover micro-interaction */
        @media (hover: hover) {
          .consult3-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 22px 40px rgba(0, 0, 0, 0.22);
            filter: saturate(1.06);
          }
        }

        /* responsif kecil: tinggi minimum & skala foto */
        @media (max-width: 575px) {
          :root {
            --consult3-minh: 380px;
          }
          .consult3-photo img {
            width: min(92%, 340px);
          }
        }

        /* ===== COUNTRY PARTNERS ===== */
        .country-section {
          width: 100vw;
          margin-left: calc(50% - 50vw);
          margin-right: calc(50% - 50vw);
          background: #fff;
          padding: 10px 0 60px;
        }
        .country-title {
          margin: 0 !important;
          text-align: center;
          color: #0b3e91 !important;
          font-weight: 900 !important;
          letter-spacing: 0.02rem;
          font-size: clamp(22px, 5.2vw, 36px) !important;
        }
        .country-row {
          margin-top: 16px;
        }
        .country-swiper {
          overflow: visible;
        }
        .country-swiper .swiper-wrapper {
          transition-timing-function: linear !important;
        }
        .country-swiper--reverse {
          transform: scaleX(-1);
        }
        .country-swiper--reverse :global(.swiper-slide) {
          transform: scaleX(-1);
        }

        .country-card {
          background: #fff;
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid #e6eeff;
          box-shadow: 0 10px 22px rgba(11, 86, 201, 0.08);
        }
        .country-photo {
          position: relative;
          width: 100%;
          aspect-ratio: 16/9;
          overflow: hidden;
        }
        .country-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transform: scale(1.02);
          transition: transform 0.28s ease, filter 0.28s ease;
        }
        .country-flag {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.25);
          display: grid;
          place-items: center;
          opacity: 0;
          transform: scale(1.04);
          transition: opacity 0.22s ease, transform 0.22s ease;
          backdrop-filter: blur(0px);
        }
        .country-flag img {
          width: 66%;
          height: auto;
          object-fit: contain;
          border-radius: 10px;
          box-shadow: 0 10px 18px rgba(0, 0, 0, 0.28);
        }
        .country-flag-name {
          position: absolute;
          bottom: 10px;
          left: 50%;
          transform: translateX(-50%);
          background: #0b3e91;
          color: #fff;
          font-weight: 800;
          padding: 6px 12px;
          border-radius: 999px;
          font-size: 12px;
          letter-spacing: 0.02em;
          white-space: nowrap;
          box-shadow: 0 8px 16px rgba(11, 86, 201, 0.2);
        }
        .country-name {
          text-align: center;
          font-weight: 700;
          color: #0b3e91;
          padding: 10px 12px;
          font-size: 14px;
        }
        @media (hover: hover) {
          .country-card:hover .country-photo img {
            transform: scale(1.08);
            filter: brightness(0.6) saturate(1.1);
          }
          .country-card:hover .country-flag {
            opacity: 1;
            transform: scale(1);
          }
        }

        /* Hindari overflow horizontal */
        html,
        body {
          overflow-x: clip;
        }
      `}</style>
    </>
  );
}
