"use client";

import { useMemo, useEffect, useRef } from "react";
import { Card, Col, Image, Row, Typography, Collapse } from "antd";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay, FreeMode } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";

import Link from "next/link";
import { useLandingViewModel } from "./useLandingViewModel";
import { sanitizeHtml } from "@/app/utils/dompurify";

const { Title, Paragraph } = Typography;

const CONSULTANT_DETAIL_BASE = "/user/landing-page";

/* helpers */
const A = (v) => (Array.isArray(v) ? v : []);
const slugify = (s = "") =>
  String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

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

const MARQUEE_SPEED = 6000;
const marqueeAutoplay = {
  delay: 0,
  disableOnInteraction: false,
  pauseOnMouseEnter: false,
};
const marqueeFreeMode = { enabled: true, momentum: false, sticky: false };

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
  } = useLandingViewModel({ locale });

  const popularItems = A(popularProgram?.items);
  const testiContent = A(testimonialsList);
  const consItems = A(CONS?.items);

  // observe reveal saat data async datang
  useRevealOnScroll([
    testiContent.length,
    consItems.length,
    popularItems.length,
  ]);
  useHeroParallax(heroRef);

  const hasMultipleTesti = testiContent.length > 1;
  const testiAutoplay = hasMultipleTesti ? marqueeAutoplay : undefined;

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
                href={H.ctaHref || "#"}
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
                <Col
                  xs={24}
                  md={14}
                  order={1}
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
                  xs={24}
                  md={10}
                  order={2}
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
                  href={H?.ctaHref || "#"}
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
                  href={popularProgram?.ctaHref || "#"}
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
                  centeredSlidesBounds
                  slidesPerView="auto"
                  spaceBetween={12}
                  initialSlide={1}
                  navigation={{
                    prevEl: ".popular-prev",
                    nextEl: ".popular-next",
                  }}
                >
                  {popularItems.map((p, idx) => (
                    <SwiperSlide
                      key={p.id ?? `${p.label}-${idx}`}
                      style={{ width: "var(--popular-card-w)" }}
                      className="popular-slide"
                    >
                      <div
                        className="popular-card reveal"
                        data-anim="zoom"
                        style={{ ["--rvd"]: `${(idx % 6) * 60}ms` }}
                      >
                        <div className="popular-imgWrap">
                          <Image
                            src={p.image || "/images/fallback.jpg"}
                            alt={p.label || "Popular"}
                            preview={false}
                            fallback="/images/fallback.jpg"
                            style={{
                              width: "100%",
                              height: "100%",
                              background: "transparent",
                            }}
                            imgProps={{
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
                    </SwiperSlide>
                  ))}
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
            className="testiV2-swiper"
            modules={[Autoplay, FreeMode]}
            slidesPerView="auto"
            spaceBetween={16}
            loop={hasMultipleTesti}
            speed={MARQUEE_SPEED}
            allowTouchMove
            autoplay={testiAutoplay}
            freeMode={marqueeFreeMode}
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
              />
            </Col>
          </Row>
        </div>
      </section>

      {/* CONSULTANTS */}
      <section style={consultants.section}>
        <div style={CONTAINER}>
          <Title
            level={2}
            className="consultV2-title reveal"
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
                    className="consultV2-link"
                    aria-label={c?.name}
                  >
                    <Card
                      className="consultV2-card"
                      bordered={false}
                      hoverable
                      bodyStyle={{ padding: "22px 22px 26px" }}
                      style={{ marginTop: "calc(var(--consultV2-avatar)/2)" }}
                    >
                      <div className="consultV2-avatar">
                        <img
                          src={c.photo || "/images/avatars/default.jpg"}
                          alt={c.name || "Consultant"}
                          onError={(e) => {
                            e.currentTarget.src = "/images/avatars/default.jpg";
                          }}
                        />
                      </div>

                      <h4 className="consultV2-name">
                        {(c.name || "").toUpperCase()}
                      </h4>

                      <div
                        className="consultV2-bio"
                        dangerouslySetInnerHTML={{
                          __html: sanitizeHtml(
                            Array.isArray(c.bio)
                              ? c.bio.join("<br/>")
                              : c.bio || ""
                          ),
                        }}
                      />
                    </Card>
                  </Link>
                </Col>
              );
            })}
          </Row>
        </div>
      </section>

      {/* ==== GLOBAL STYLES (tambahan animasi + fix swiper height) ==== */}
      <style jsx global>{`
        :root {
          --popular-card-w: clamp(240px, 28vw, 360px);
          --nav-h: 80px;
        }

        /* ===== Fix: Swiper height di mobile ===== */
        .testiV2-swiper,
        .landing-popular-swiper--hero {
          height: auto !important;
        }
        .testiV2-swiper .swiper-slide,
        .landing-popular-swiper--hero .swiper-slide {
          height: auto !important;
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

        /* ===== Popular board (dibiarkan kosong jika ingin tanpa papan) ===== */
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

        .popular-card {
          background: transparent;
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 14px 28px rgba(8, 42, 116, 0.16);
          transition: transform 0.22s ease, box-shadow 0.22s ease;
          will-change: transform;
          position: relative;
          isolation: isolate;
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
          aspect-ratio: 16 / 10;
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
          /* desktop: normal */
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
          margin-left: 60px;
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

        /* ===== Consultants V2 ===== */
        :root {
          --consultV2-avatar: clamp(120px, 22vw, 180px);
          --consultV2-radius: 18px;
        }
        .consultV2-title {
          margin: 0 !important;
          text-align: center;
          color: #0b3e91 !important;
          font-weight: 900 !important;
          letter-spacing: 0.02em;
          text-transform: none;
          font-size: clamp(24px, 5.2vw, 44px) !important;
          line-height: 1.15 !important;
        }
        .consultV2-link {
          text-decoration: none;
        }
        .consultV2-card {
          position: relative;
          background: #0b3e91 !important;
          border-radius: var(--consultV2-radius) !important;
          box-shadow: 0 18px 34px rgba(0, 0, 0, 0.18);
          overflow: visible;
          padding-top: calc(var(--consultV2-avatar) / 2 + 28px) !important;
          transition: transform 0.18s ease, box-shadow 0.18s ease,
            filter 0.18s ease;
        }
        @media (hover: hover) {
          .consultV2-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 22px 40px rgba(0, 0, 0, 0.22);
            filter: saturate(1.06);
          }
        }
        .consultV2-avatar {
          position: absolute;
          top: calc(var(--consultV2-avatar) * -0.5);
          left: 50%;
          transform: translateX(-50%);
          width: var(--consultV2-avatar);
          height: var(--consultV2-avatar);
          border-radius: 50%;
          overflow: hidden;
          background: #eee;
          border: 8px solid #fff;
          box-shadow: 0 16px 32px rgba(0, 0, 0, 0.28);
          z-index: 2;
        }
        .consultV2-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transform: translateZ(0);
        }
        .consultV2-name {
          margin: 10px 0 8px 0;
          text-align: center;
          color: #fff;
          font-size: clamp(16px, 2.2vw, 20px);
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .consultV2-bio {
          color: #e9f0ff;
          text-align: center;
          font-size: clamp(13px, 1.9vw, 16px);
          line-height: 1.7;
          max-width: 640px;
          margin: 0 auto;
        }
        @media (max-width: 767px) {
          .consultV2-card {
            padding-left: clamp(14px, 3vw, 20px) !important;
            padding-right: clamp(14px, 3vw, 20px) !important;
          }
        }

        /* Hindari overflow horizontal */
        html,
        body {
          overflow-x: clip;
        }

        /* Existing responsive tweaks */
        @media (prefers-reduced-motion: reduce) {
          .testiV2-swiper .swiper-wrapper {
            transition-duration: 0ms !important;
          }
        }
        @media (max-width: 991px) {
          h1[style] {
            margin-top: -42px !important;
          }
        }
        @media (max-width: 767px) {
          h1[style] {
            margin-top: 0 !important;
          }
        }
      `}</style>
    </>
  );
}
