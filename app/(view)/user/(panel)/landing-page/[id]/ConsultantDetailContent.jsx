"use client";

import React, { useMemo, useEffect, useRef } from "react";
import { Typography, Skeleton } from "antd";
import { Autoplay, FreeMode, Navigation } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import Link from "next/link";
import { sanitizeHtml } from "@/app/utils/dompurify";

const { Title } = Typography;

const FONT_FAMILY = '"Public Sans", sans-serif';
const FALLBACK_ABOUT_MESSAGE_ID =
  "Belum ada deskripsi konsultan yang tersedia saat ini.";
const FALLBACK_ABOUT_MESSAGE_EN =
  "Consultant description is not available just yet.";

const SECTION_MAX_WIDTH = "1240px";
const SECTION_GUTTER = "clamp(16px, 5vw, 56px)";

/* ====== HOOK: reveal on scroll (pakai referensi landing) ====== */
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

/* ====== HOOK: hero parallax (copy dari landing, disimplify) ====== */
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

const styles = {
  sectionInner: {
    width: "100%",
    maxWidth: SECTION_MAX_WIDTH,
    margin: "0 auto",
    fontFamily: FONT_FAMILY,
    paddingLeft: SECTION_GUTTER,
    paddingRight: SECTION_GUTTER,
  },
  sectionLabel: {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#7581a1",
    marginBottom: 12,
  },
  sectionDot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #0b56c9, #2fb0ff)",
    display: "inline-flex",
  },

  /* ============== HERO (baru, sesuai desain) ============== */
  hero: {
    section: {
      marginTop: 0,
      paddingTop: 0,
      background: "#fff",
    },
    bleed: {
      width: "100vw",
      marginLeft: "calc(50% - 50vw)",
      marginRight: "calc(50% - 50vw)",
    },
    wrapper: {
      position: "relative",
      isolation: "isolate",
      background: "#004A9E", // solid biru seperti desain
      minHeight: "calc(100vh - 96px)",
      padding: "clamp(40px, 6vw, 72px) clamp(24px, 7vw, 110px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      overflow: "hidden",
      gap: "clamp(24px, 5vw, 80px)",
    },
    copy: {
      position: "relative",
      zIndex: 2,
      color: "#fff",
      maxWidth: "min(540px, 100%)",
    },
    greet: {
      margin: "0 0 8px",
      fontSize: "clamp(16px, 1.6vw, 18px)",
      fontWeight: 500,
    },
    heading: {
      fontWeight: 700,
      fontSize: "clamp(32px, 3.4vw, 40px)",
      lineHeight: 1.2,
      margin: 0,
    },
    headingName: {
      display: "block",
      fontWeight: 700,
    },
    subtitle: {
      marginTop: "clamp(16px, 1.8vw, 20px)",
      fontSize: "clamp(15px, 1.6vw, 18px)",
      lineHeight: 1.7,
      maxWidth: "36rem",
    },
    art: {
      position: "relative",
      height: "100%",
      zIndex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      gap: 12,
    },
    photoFrame: {
      position: "relative",
      width: "min(260px, 28vw)",
      aspectRatio: "9 / 16", // 9:16 portrait
      borderRadius: 0,
      overflow: "hidden",
      background: "transparent",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    photoImg: {
      width: "100%",
      height: "100%",
      objectFit: "contain", // biar foto 9:16 tidak ke-crop & transparan kelihatan
      display: "block",
      backgroundColor: "transparent",
    },
    metaBlock: {
      marginTop: "clamp(12px, 2vw, 18px)",
      textAlign: "center",
      color: "#fff",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 6,
    },
    metaName: {
      fontWeight: 700,
      fontSize: "clamp(18px, 1.8vw, 22px)",
      letterSpacing: "-0.01em",
    },
    metaRole: {
      fontSize: "clamp(13px, 1.3vw, 15px)",
      opacity: 0.9,
    },
  },

  /* ============== ABOUT ============== */
  about: {
    section: {
      padding: "clamp(64px, 9vw, 130px) 0",
      marginTop: 0,
      background: "linear-gradient(180deg, #f6f8ff 0%, #ffffff 100%)",
    },
    surface: {
      background: "#fff",
      borderRadius: 32,
      border: "1px solid #e6ecfa",
      boxShadow: "0 30px 80px rgba(8, 24, 68, 0.08)",
      padding: "clamp(28px, 5vw, 64px)",
    },
    grid: {
      display: "grid",
      gridTemplateRows: "auto 1fr",
      columnGap: "clamp(22px, 3vw, 34px)",
      rowGap: "clamp(18px, 2vw, 26px)",
      alignItems: "stretch",
    },
    header: { marginBottom: 8 },
    title: {
      margin: 0,
      fontWeight: 900,
      letterSpacing: "-0.02em",
      color: "#0b1d3a",
      fontSize: "clamp(28px, 4.6vw, 44px)",
      lineHeight: 1.2,
    },
    intro: {
      marginTop: 14,
      maxWidth: "65ch",
      fontSize: "clamp(14px, 1.5vw, 17px)",
      lineHeight: 1.9,
      color: "#253757",
      textAlign: "justify",
    },
    leftCard: {
      position: "relative",
      background: "#fff",
      borderRadius: 26,
      overflow: "hidden",
      border: "1px solid #e1e9f9",
      boxShadow: "0 18px 34px rgba(8, 42, 116, 0.12)",
      minHeight: "clamp(260px, 32vw, 420px)",
    },
    rightCard: {
      position: "relative",
      background: "#fff",
      borderRadius: 26,
      overflow: "hidden",
      border: "1px solid #e1e9f9",
      boxShadow: "0 18px 34px rgba(8, 42, 116, 0.12)",
      minHeight: "clamp(220px, 30vw, 360px)",
      alignSelf: "stretch",
    },
    imgEl: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      display: "block",
    },
  },

  /* ============== PROGRAMS ============== */
  programs: {
    section: {
      padding: "clamp(72px, 11vw, 160px) 0",
      background:
        "linear-gradient(180deg, #ffffff 0%, #eef3ff 80%, #ffffff 100%)",
    },
    title: {
      textAlign: "center",
      marginBottom: 22,
      fontWeight: 900,
      letterSpacing: "0.02em",
      color: "#0b3a82",
      fontSize: "clamp(36px, 6.6vw, 64px)",
      lineHeight: 1.05,
      textTransform: "uppercase",
    },
    subtitle: {
      textAlign: "center",
      marginTop: -8,
      color: "#5e6b89",
      fontSize: "clamp(14px, 1.6vw, 16px)",
    },
    shell: {
      position: "relative",
      marginTop: "clamp(28px, 4vw, 56px)",
      background:
        "radial-gradient(circle at top, rgba(255,255,255,0.18), transparent), #06183f",
      borderRadius: 34,
      padding: "clamp(22px, 4vw, 60px)",
      boxShadow: "0 40px 80px rgba(7, 24, 69, 0.35)",
      border: "1px solid rgba(255,255,255,0.08)",
    },
    wrap: { position: "relative" },
    card: {
      position: "relative",
      borderRadius: 22,
      height: "clamp(320px, 40vw, 420px)",
      overflow: "hidden",
      marginTop: "72px",
      transition: "transform .32s ease, box-shadow .32s ease",
      background: "#0b56c9",
      boxShadow: "0 20px 40px rgba(11, 63, 160, 0.45)",
      willChange: "transform",
    },
    imgFull: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      display: "block",
    },
    navBtnBase: {
      position: "absolute",
      top: "50%",
      transform: "translateY(-50%)",
      zIndex: 5,
      width: 42,
      height: 42,
      borderRadius: "999px",
      border: "1px solid rgba(255,255,255,0.3)",
      background: "rgba(255,255,255,0.16)",
      color: "#fff",
      display: "grid",
      placeItems: "center",
      boxShadow: "0 10px 20px rgba(0, 0, 0, 0.25)",
      cursor: "pointer",
      opacity: 0.95,
    },
    navIcon: { display: "block" },
  },

  /* ============== CTA ============== */
  cta: {
    section: { padding: "clamp(72px, 11vw, 160px) 0 clamp(96px, 12vw, 180px)" },
    container: {
      background:
        "linear-gradient(130deg, #0b3a82 0%, #1c6bea 60%, #32afff 110%)",
      borderRadius: 34,
      boxShadow: "0 40px 80px rgba(7, 19, 46, 0.4)",
      border: "1px solid rgba(255,255,255,0.35)",
      display: "grid",
      gridTemplateColumns: "minmax(0, 1.15fr) minmax(0, 0.85fr)",
      alignItems: "center",
      gap: "clamp(16px, 3vw, 28px)",
      padding: "clamp(26px, 4vw, 48px)",
      overflow: "hidden",
    },
    copy: {
      padding: "clamp(8px, 1.6vw, 10px) clamp(4px, 1.2vw, 12px)",
      color: "#fff",
    },
    title: {
      margin: 0,
      fontWeight: 900,
      color: "#fff",
      fontSize: "clamp(22px, 3.8vw, 32px)",
      lineHeight: 1.2,
    },
    desc: {
      marginTop: 10,
      color: "rgba(255,255,255,0.9)",
      fontSize: "clamp(12px, 1.4vw, 14px)",
      lineHeight: 1.8,
      maxWidth: 640,
    },
    btnWrap: { marginTop: 16 },
    button: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "16px 36px",
      borderRadius: 14,
      background: "#fff",
      boxShadow: "0 16px 30px rgba(11, 28, 58, 0.25)",
      color: "#0b3a82",
      fontWeight: 800,
      letterSpacing: ".6px",
      textTransform: "uppercase",
      border: "1px solid transparent",
      userSelect: "none",
      textDecoration: "none",
      transition: "transform .2s ease, box-shadow .2s ease",
    },
    artWrap: { display: "grid", placeItems: "center" },
    artImg: {
      maxWidth: "min(420px, 88%)",
      width: "100%",
      height: "auto",
      display: "block",
      transform: "translateY(8px)",
    },
  },
};

export default function ConsultantDetailContent({
  isLoading,
  hero,
  about,
  programs,
  wa,
  cta,
  ui = {},
  locale,
}) {
  const heroRef = useRef(null);

  const aboutHtml = useMemo(() => {
    const raw = about?.html || "";
    const sanitized = sanitizeHtml(raw);
    return typeof sanitized === "string" && sanitized.trim().length > 0
      ? sanitized
      : null;
  }, [about?.html]);

  // ===== hero fallback by locale =====
  const defaultHeroGreet =
    locale === "en" ? "Hey there," : "Hai, aku konsultan";
  const defaultHeroTitle = locale === "en" ? "" : ""; // kita pakai name saja, title tidak wajib
  const defaultHeroRole =
    locale === "en"
      ? "Consultant & Student Recruitment"
      : "Konsultan & Student Recruitment";

  const heroSubtitle =
    hero?.subtitle ||
    (locale === "en"
      ? "Schedule a free consultation, online or offline."
      : "Agendakan jadwal konsultasi gratis, bisa offline dan online.");

  // ===== CTA text =====
  const ctaTitle =
    cta?.title ||
    (locale === "en"
      ? "Consult now, feel free to ask first"
      : "Konsultasikan Sekarang, Tanya Aja Dulu Boleh");
  const ctaDesc =
    cta?.description ||
    (locale === "en"
      ? "Together with our consultants, turn your study plan into a confident step toward a global future."
      : "Bersama Konsultan Kami, Wujudkan Rencana Studimu Ke Tingkat Global Dengan Percaya Diri.");
  const ctaBtnLabel =
    cta?.buttonLabel ||
    (locale === "en" ? "Try Free Consultation" : "Coba Konsultasi Gratis");
  const ctaHref = cta?.href || "/user/leads";

  // ===== Programs text =====
  const programsTitle =
    ui.programsTitle ||
    (locale === "en" ? "CONSULTANT PROGRAMS" : "PROGRAM KONSULTAN");
  const noProgramsCopy =
    ui.noProgramsCopy ||
    (locale === "en"
      ? "No consultant program images yet."
      : "Belum ada gambar program konsultan.");
  const programsSubtitle =
    locale === "en"
      ? "Snapshots from recent mentoring, workshop, and sharing sessions."
      : "Cuplikan kegiatan mentoring, workshop, dan sesi sharing terbaru.";

  // ==== jalankan animasi (reveal + parallax) ====
  useRevealOnScroll([
    Array.isArray(programs) ? programs.length : 0,
    aboutHtml ? 1 : 0,
  ]);
  useHeroParallax(heroRef);

  if (isLoading) {
    return (
      <div
        style={{
          ...styles.sectionInner,
          paddingTop: "64px",
          paddingBottom: "64px",
        }}
      >
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    );
  }

  const displayName = (hero?.name || "Your Name").trim();

  return (
    <div className="consultant-detail-page" data-shell="full">
      {/* ===== HERO (baru) ===== */}
      <section className="hero-section" style={styles.hero.section}>
        <div style={styles.hero.bleed}>
          <div className="heroGrid" style={styles.hero.wrapper} ref={heroRef}>
            <div className="hero-copy js-hero-copy" style={styles.hero.copy}>
              <p
                className="reveal"
                data-anim="down"
                style={{ ...styles.hero.greet, ["--rvd"]: "20ms" }}
              >
                {hero?.greet || defaultHeroGreet}
              </p>
              <h1
                className="reveal"
                data-anim="down"
                style={{ ...styles.hero.heading, ["--rvd"]: "80ms" }}
              >
                {hero?.title || defaultHeroTitle}
                <span style={styles.hero.headingName}>{displayName}</span>
              </h1>
              <p
                className="reveal"
                data-anim="up"
                style={{ ...styles.hero.subtitle, ["--rvd"]: "140ms" }}
              >
                {heroSubtitle}
              </p>
            </div>

            <div
              className="hero-art reveal"
              data-anim="up"
              style={{ ...styles.hero.art, ["--rvd"]: "200ms" }}
            >
              <div style={styles.hero.photoFrame}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={hero?.image}
                  alt={displayName || "Consultant photo"}
                  title={displayName || "Consultant photo"}
                  style={styles.hero.photoImg}
                  loading="eager"
                  onError={(e) =>
                    (e.currentTarget.src = "/images/avatars/default.jpg")
                  }
                />
              </div>
              <div className="hero-meta" style={styles.hero.metaBlock}>
                <div style={styles.hero.metaName}>{displayName}</div>
                <div style={styles.hero.metaRole}>
                  {hero?.role || defaultHeroRole}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== ABOUT ===== */}
      <section style={styles.about.section}>
        <div className="section-inner" style={styles.sectionInner}>
          <div
            className="reveal"
            data-anim="zoom"
            style={{ ...styles.about.surface, ["--rvd"]: "40ms" }}
          >
            <div className="aboutGrid" style={styles.about.grid}>
              <div
                className="about-header reveal"
                data-anim="down"
                style={{ ...styles.about.header, ["--rvd"]: "80ms" }}
              >
                <h2 style={styles.about.title}>
                  {about?.title || `About Kak ${displayName}!`}
                </h2>

                {aboutHtml ? (
                  <div
                    className="about-intro"
                    style={styles.about.intro}
                    dangerouslySetInnerHTML={{ __html: aboutHtml }}
                  />
                ) : (
                  <p className="about-intro" style={styles.about.intro}>
                    {locale === "en"
                      ? FALLBACK_ABOUT_MESSAGE_EN
                      : FALLBACK_ABOUT_MESSAGE_ID}
                  </p>
                )}
              </div>

              <div
                className="about-left reveal"
                data-anim="up"
                style={{ ...styles.about.leftCard, ["--rvd"]: "140ms" }}
              >
                <img
                  src={about?.leftImg || "/images/fallback.jpg"}
                  alt="About left"
                  title="About left"
                  style={styles.about.imgEl}
                  loading="lazy"
                  onError={(e) =>
                    (e.currentTarget.src = "/images/fallback.jpg")
                  }
                />
              </div>

              <div
                className="about-right reveal"
                data-anim="up"
                style={{ ...styles.about.rightCard, ["--rvd"]: "200ms" }}
              >
                <img
                  src={about?.rightImg || "/images/fallback.jpg"}
                  alt="About right"
                  title="About right"
                  style={styles.about.imgEl}
                  loading="lazy"
                  onError={(e) =>
                    (e.currentTarget.src = "/images/fallback.jpg")
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== PROGRAMS ===== */}
      <section style={styles.programs.section}>
        <div className="section-inner" style={styles.sectionInner}>
          <Title
            level={1}
            className="reveal"
            data-anim="down"
            style={{ ...styles.programs.title, ["--rvd"]: "40ms" }}
          >
            {programsTitle}
          </Title>
          <p
            className="reveal"
            data-anim="up"
            style={{ ...styles.programs.subtitle, ["--rvd"]: "100ms" }}
          >
            {programsSubtitle}
          </p>

          {Array.isArray(programs) && programs.length > 0 ? (
            <div
              className="reveal"
              data-anim="zoom"
              style={{ ...styles.programs.shell, ["--rvd"]: "160ms" }}
            >
              <div style={styles.programs.wrap}>
                <button
                  className="prog-prev"
                  style={styles.programs.navBtnBase}
                  aria-label="Previous program"
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    style={styles.programs.navIcon}
                  >
                    <path
                      d="M15 18l-6-6 6-6"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <button
                  className="prog-next"
                  style={styles.programs.navBtnBase}
                  aria-label="Next program"
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    style={styles.programs.navIcon}
                  >
                    <path
                      d="M9 6l6 6-6 6"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                <Swiper
                  modules={[Autoplay, FreeMode, Navigation]}
                  freeMode
                  loop
                  centeredSlides
                  autoplay={{ delay: 2800, disableOnInteraction: false }}
                  navigation={{ prevEl: ".prog-prev", nextEl: ".prog-next" }}
                  slidesPerView={1.16}
                  spaceBetween={20}
                  breakpoints={{
                    600: { slidesPerView: 2.1, spaceBetween: 22 },
                    980: { slidesPerView: 3.1, spaceBetween: 24 },
                  }}
                  className="progSwiper"
                >
                  {programs.map((p) => (
                    <SwiperSlide key={p.id}>
                      <div className="progCard" style={styles.programs.card}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.thumb || "/images/fallback.jpg"}
                          alt={p.title || "Program image"}
                          title={p.title || "Program image"}
                          style={styles.programs.imgFull}
                          loading="lazy"
                          onError={(e) =>
                            (e.currentTarget.src = "/images/fallback.jpg")
                          }
                        />
                      </div>
                    </SwiperSlide>
                  ))}
                </Swiper>
              </div>
            </div>
          ) : (
            <div
              className="reveal"
              data-anim="up"
              style={{
                textAlign: "center",
                opacity: 0.85,
                padding: "40px clamp(24px, 5vw, 64px)",
                marginTop: "clamp(24px, 4vw, 48px)",
                borderRadius: 26,
                border: "1px dashed #c3d7ff",
                background: "#fff",
                ["--rvd"]: "160ms",
              }}
            >
              {noProgramsCopy}
            </div>
          )}
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section style={styles.cta.section}>
        <div className="section-inner" style={styles.sectionInner}>
          <div
            className="ctaContainer reveal"
            data-anim="zoom"
            style={{ ...styles.cta.container, ["--rvd"]: "40ms" }}
          >
            <div style={styles.cta.copy}>
              <h3
                className="reveal"
                data-anim="down"
                style={{ ...styles.cta.title, ["--rvd"]: "80ms" }}
              >
                {ctaTitle}
              </h3>
              <p
                className="reveal"
                data-anim="up"
                style={{ ...styles.cta.desc, ["--rvd"]: "140ms" }}
              >
                {ctaDesc}
              </p>
              <div style={styles.cta.btnWrap}>
                <Link
                  href={ctaHref}
                  className="ctaBtn hero-cta hero-cta--pulse reveal"
                  data-anim="up"
                  style={{ ...styles.cta.button, ["--rvd"]: "200ms" }}
                >
                  {ctaBtnLabel}
                </Link>
              </div>
            </div>
            <div style={styles.cta.artWrap} className="reveal" data-anim="up">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/cta-detail.svg"
                alt="Maskot bertanya"
                title="Maskot bertanya"
                style={styles.cta.artImg}
                loading="lazy"
                onError={(e) => (e.currentTarget.src = "/tanya.svg")}
              />
            </div>
          </div>
        </div>
      </section>

      <style jsx>{`
        .consultant-detail-page {
          width: 100%;
          overflow-x: hidden;
        }
        .hero-section {
          margin: 0;
          padding-top: 0;
        }
        .section-inner {
          width: 100%;
        }
        .heroGrid {
          padding-left: 0;
          padding-right: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: clamp(24px, 5vw, 80px);
        }
        .prog-prev {
          left: clamp(12px, 2vw, 32px);
        }
        .prog-next {
          right: clamp(12px, 2vw, 32px);
        }
        .progCard {
          transition: transform 0.35s ease, box-shadow 0.35s ease;
        }
        .progCard:hover {
          transform: translateY(-14px) scale(1.02);
          box-shadow: 0 32px 60px rgba(3, 12, 32, 0.55);
        }
        .ctaBtn:hover {
          transform: translateY(-3px);
          box-shadow: 0 22px 40px rgba(8, 19, 46, 0.4);
        }

        /* ===== HERO responsive ===== */
        @media (max-width: 768px) {
          .heroGrid {
            flex-direction: column;
            text-align: center;
            padding-left: clamp(16px, 6vw, 32px);
            padding-right: clamp(16px, 6vw, 32px);
          }
          .section-inner {
            padding-left: clamp(16px, 6vw, 32px);
            padding-right: clamp(16px, 6vw, 32px);
          }
          .hero-section {
            padding-top: 0;
          }
          .hero-art {
            width: 100%;
          }
          .hero-meta {
            text-align: center !important;
          }
        }

        @media (max-width: 900px) {
          .ctaContainer {
            grid-template-columns: 1fr !important;
            text-align: center;
          }
          .ctaBtn {
            width: 100%;
          }
        }

        /* ===== ABOUT grid columns ===== */
        .aboutGrid {
          grid-template-columns: 1.25fr 1fr;
        }
        .about-header {
          grid-column: 1 / 2;
          grid-row: 1 / 2;
        }
        .about-left {
          grid-column: 1 / 2;
          grid-row: 2 / 3;
        }
        .about-right {
          grid-column: 2 / 3;
          grid-row: 1 / span 2;
        }

        @media (max-width: 1024px) {
          .aboutGrid {
            grid-template-columns: 1fr !important;
          }
          .about-header,
          .about-left,
          .about-right {
            grid-column: 1 / -1 !important;
            grid-row: auto;
          }
        }

        @media (max-width: 640px) {
          .about-right,
          .about-left {
            display: none !important;
          }
          .about-header {
            margin-bottom: 0 !important;
          }
        }

        .about-intro {
          text-align: justify;
          text-justify: inter-word;
          hyphens: auto;
          -webkit-hyphens: auto;
          overflow-wrap: anywhere;
        }
        .about-intro p {
          margin: 0.4em 0;
        }
      `}</style>

      {/* ===== GLOBAL ANIMATION STYLES (reveal + CTA micro motion) ===== */}
      <style jsx global>{`
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
            box-shadow: 0 16px 30px rgba(11, 28, 58, 0.25);
          }
          50% {
            box-shadow: 0 22px 42px rgba(11, 28, 58, 0.35);
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
      `}</style>
    </div>
  );
}
