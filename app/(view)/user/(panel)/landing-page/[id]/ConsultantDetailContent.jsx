"use client";

import React, { useMemo } from "react";
import { Typography, Skeleton } from "antd";
import { Autoplay, FreeMode, Navigation } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import Link from "next/link";
import { sanitizeHtml } from "@/app/utils/dompurify";

const { Title } = Typography;

const FONT_FAMILY = '"Poppins", sans-serif';
const FALLBACK_ABOUT_MESSAGE_ID =
  "Belum ada deskripsi konsultan yang tersedia saat ini.";
const FALLBACK_ABOUT_MESSAGE_EN =
  "Consultant description is not available just yet.";

const styles = {
  sectionInner: {
    width: "min(1360px, 96%)",
    margin: "0 auto",
    fontFamily: FONT_FAMILY,
  },
  hero: {
    section: {
      marginTop: "calc(-1 * clamp(48px, 8vw, 84px))",
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
      background:
        "linear-gradient(180deg, #0b56c9 0%, #1f6de2 55%, #1b66d6 100%)",
      minHeight: "clamp(520px, 64vw, 760px)",
      padding: "clamp(28px, 4vw, 48px) clamp(20px, 4vw, 44px)",
      display: "grid",
      gridTemplateColumns: "1.1fr 0.9fr",
      alignItems: "center",
      overflow: "hidden",
    },
    curveWrap: {
      position: "absolute",
      left: 0,
      bottom: 0,
      width: "100%",
      height: "clamp(140px, 20vw, 280px)",
      zIndex: 2,
      pointerEvents: "none",
    },
    curveSvg: { width: "100%", height: "100%", display: "block" },
    copy: {
      position: "relative",
      zIndex: 3,
      color: "#fff",
      marginTop: "-220px",
    },
    hello: {
      fontWeight: 800,
      fontSize: "clamp(28px, 5.4vw, 64px)",
      lineHeight: 1.04,
      color: "#fff",
      margin: 0,
      textShadow: "0 10px 28px rgba(0,0,0,.15)",
    },
    role: {
      marginTop: "clamp(10px, 1.2vw, 14px)",
      color: "#e9f1ff",
      fontSize: "clamp(14px, 1.8vw, 18px)",
      fontWeight: 600,
      letterSpacing: 0.2,
    },
    art: {
      position: "relative",
      height: "100%",
      display: "grid",
      placeItems: "center",
      marginTop: "-230px",
      zIndex: 1,
    },
    ring: {
      position: "relative",
      width: "min(380px, 38vw)",
      aspectRatio: "1 / 1",
      borderRadius: "50%",
      background: "#ffd21e",
      padding: "clamp(10px, 2vw, 20px)",
      boxShadow: "0 24px 48px rgba(0,0,0,.20)",
      transform: "translateY(4%)",
      display: "grid",
      placeItems: "center",
      zIndex: 3,
    },
    photoMask: {
      width: "100%",
      height: "100%",
      borderRadius: "50%",
      overflow: "hidden",
      background: "#ffffff",
      display: "grid",
      placeItems: "center",
    },
    photoImg: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      display: "block",
    },
  },

  about: {
    section: { padding: "clamp(48px, 8vw, 96px) 0 0", marginTop: "-75px" },
    grid: {
      display: "grid",
      gridTemplateColumns: "1.25fr 1fr",
      gridTemplateRows: "auto 1fr",
      columnGap: "clamp(18px, 2.4vw, 28px)",
      rowGap: "clamp(14px, 2vw, 20px)",
      alignItems: "stretch",
    },
    header: { gridColumn: "1 / 2", gridRow: "1 / 2", marginBottom: 4 },
    title: {
      margin: 0,
      fontWeight: 900,
      letterSpacing: "-0.02em",
      color: "#0b1d3a",
      fontSize: "clamp(28px, 4.6vw, 44px)",
      lineHeight: 1.2,
    },
    intro: {
      marginTop: 10,
      maxWidth: "min(760px, 92%)",
      fontSize: "clamp(14px, 1.6vw, 16px)",
      lineHeight: 1.9,
      color: "#2a3e65",
    },
    leftCard: {
      gridColumn: "1 / 2",
      gridRow: "2 / 3",
      position: "relative",
      background: "#fff",
      borderRadius: 18,
      overflow: "hidden",
      border: "1px solid #E6EEF9",
      boxShadow: "0 18px 34px rgba(8,42,116,0.10)",
      height: "clamp(260px, 32vw, 420px)",
    },
    rightCard: {
      gridColumn: "2 / 3",
      gridRow: "1 / span 2",
      position: "relative",
      background: "#fff",
      borderRadius: 18,
      overflow: "hidden",
      border: "1px solid #E6EEF9",
      boxShadow: "0 18px 34px rgba(8,42,116,0.10)",
      height: "100%",
      alignSelf: "stretch",
    },
    imgEl: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      display: "block",
    },
  },

  programs: {
    section: { padding: "36px 0 8px" },
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
    wrap: { position: "relative" },
    card: {
      position: "relative",
      borderRadius: 22,
      height: 420,
      overflow: "hidden",
      marginTop: "75px",
      transform: "scale(0.96)",
      transition: "transform .28s ease",
      background: "#0b56c9",
    },
    imgFull: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      display: "block",
      filter: "none",
      transition: "transform .3s ease",
    },
    navBtnBase: {
      position: "absolute",
      top: "50%",
      transform: "translateY(-50%)",
      zIndex: 5,
      width: 42,
      height: 42,
      borderRadius: "999px",
      border: "1px solid rgba(15,23,42,.12)",
      background: "#2d3748",
      color: "#fff",
      display: "grid",
      placeItems: "center",
      boxShadow: "0 10px 20px rgba(0,0,0,.22)",
      cursor: "pointer",
      transition: "transform .2s ease, opacity .2s ease",
      opacity: 0.95,
    },
    navPrev: { left: -56 },
    navNext: { right: -56 },
    navIcon: { display: "block" },
  },

  /* ==== CTA baru (sesuai screenshot) ==== */
  cta: {
    section: { padding: "24px 0 80px" },
    heading: {
      textAlign: "center",
      fontWeight: 900,
      letterSpacing: "0.02em",
      color: "#0b3a82",
      textTransform: "uppercase",
      fontSize: "clamp(28px, 5.4vw, 48px)",
      marginBottom: 18,
    },
    bar: { display: "grid", placeItems: "center" },
    button: {
      display: "inline-block",
      padding: "16px 36px",
      borderRadius: 999,
      background: "linear-gradient(180deg,#1950ff 0%, #0a2ecf 85%)",
      color: "#fff",
      fontWeight: 800,
      letterSpacing: "0.8px",
      textTransform: "uppercase",
      boxShadow: "0 12px 28px rgba(0,80,255,.35)",
      border: "none",
      userSelect: "none",
      marginTop: "25px",
      textDecoration: "none",
    },
  },
};

export default function ConsultantDetailContent({
  isLoading,
  hero,
  about,
  programs,
  wa, // not used in CTA anymore (tetap diterima biar kompatibel)
  locale,
}) {
  const aboutHtml = useMemo(() => {
    const raw = about?.html || "";
    const sanitized = sanitizeHtml(raw);
    return typeof sanitized === "string" && sanitized.trim().length > 0
      ? sanitized
      : null;
  }, [about?.html]);

  if (isLoading) {
    return (
      <div style={{ ...styles.sectionInner, padding: "64px 0" }}>
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    );
  }

  return (
    <>
      {/* HERO */}
      <section style={styles.hero.section}>
        <div style={styles.hero.bleed}>
          <div className="heroGrid" style={styles.hero.wrapper}>
            <div style={styles.hero.curveWrap}>
              <svg
                viewBox="0 0 1440 280"
                preserveAspectRatio="none"
                style={styles.hero.curveSvg}
                aria-hidden="true"
              >
                <path
                  d="M0,150 C 360,240 1080,40 1440,160 L1440,280 L0,280 Z"
                  fill="#ffffff"
                />
              </svg>
            </div>

            <div style={styles.hero.copy}>
              <h1 style={styles.hero.hello}>
                {(hero?.greet || "Hey there,").trim()}
                <br />
                {(hero?.title || "It's Consultant").trim()}
                <br />
                {(hero?.name || "Your Name").trim()}
              </h1>
              <div style={styles.hero.role}>
                {hero?.role || "Consultant Education"}
              </div>
            </div>

            <div style={styles.hero.art}>
              <div style={styles.hero.ring}>
                <div style={styles.hero.photoMask}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={hero?.image}
                    alt={hero?.name || "Consultant photo"}
                    style={styles.hero.photoImg}
                    loading="eager"
                    onError={(e) =>
                      (e.currentTarget.src = "/images/avatars/default.jpg")
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section style={styles.about.section}>
        <div style={styles.sectionInner}>
          <div className="aboutGrid" style={styles.about.grid}>
            <div style={styles.about.header}>
              <h2 style={styles.about.title}>
                {about?.title || `About Kak ${hero?.name || ""}!`}
              </h2>
              {aboutHtml ? (
                <div
                  style={styles.about.intro}
                  dangerouslySetInnerHTML={{ __html: aboutHtml }}
                />
              ) : (
                <p style={styles.about.intro}>
                  {locale === "en"
                    ? FALLBACK_ABOUT_MESSAGE_EN
                    : FALLBACK_ABOUT_MESSAGE_ID}
                </p>
              )}
            </div>

            <div style={styles.about.leftCard}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={about?.leftImg || "/images/fallback.jpg"}
                alt="About left"
                style={styles.about.imgEl}
                loading="lazy"
                onError={(e) => (e.currentTarget.src = "/images/fallback.jpg")}
              />
            </div>

            <div style={styles.about.rightCard}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={about?.rightImg || "/images/fallback.jpg"}
                alt="About right"
                style={styles.about.imgEl}
                loading="lazy"
                onError={(e) => (e.currentTarget.src = "/images/fallback.jpg")}
              />
            </div>
          </div>
        </div>
      </section>

      {/* PROGRAMS */}
      <section style={styles.programs.section}>
        <div style={styles.sectionInner}>
          <Title level={1} style={styles.programs.title}>
            PROGRAM KONSULTAN
          </Title>

          {Array.isArray(programs) && programs.length > 0 ? (
            <div style={styles.programs.wrap}>
              {/* nav buttons */}
              <button
                className="prog-prev"
                aria-label="Previous"
                style={{
                  ...styles.programs.navBtnBase,
                  ...styles.programs.navPrev,
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={styles.programs.navIcon}
                >
                  <path
                    d="M15 6l-6 6 6 6"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button
                className="prog-next"
                aria-label="Next"
                style={{
                  ...styles.programs.navBtnBase,
                  ...styles.programs.navNext,
                }}
              >
                <svg
                  width="18"
                  height="18"
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
          ) : (
            <div
              style={{ textAlign: "center", opacity: 0.75, padding: "24px 0" }}
            >
              {locale === "en"
                ? "No consultant program images yet."
                : "Belum ada gambar program konsultan."}
            </div>
          )}
        </div>
      </section>

      {/* CTA (baru) */}
      <section style={styles.cta.section}>
        <div style={styles.sectionInner}>
          <h2 style={styles.cta.heading}>JADWALKAN KONSULTASI</h2>
          <div style={styles.cta.bar}>
            <Link
              href="/user/leads"
              className="ctaBtn"
              style={styles.cta.button}
            >
              CLICK HERE
            </Link>
          </div>
        </div>
      </section>

      <style jsx>{`
        :global(.progSwiper .swiper-slide .progCard) {
          transform: scale(0.96);
        }
        :global(.progSwiper .swiper-slide-active .progCard) {
          transform: scale(1.05);
        }
        :global(.progSwiper .swiper-slide .progCard img:hover) {
          transform: scale(1.02);
        }
        :global(.progSwiper img) {
          filter: none !important;
        }
        :global(.prog-prev:hover),
        :global(.prog-next:hover) {
          transform: translateY(-50%) scale(1.05);
          opacity: 1;
        }

        /* CTA hover/active */
        :global(.ctaBtn:hover) {
          filter: brightness(1.06);
          transform: translateY(-1px);
        }
        :global(.ctaBtn:active) {
          filter: brightness(0.98);
          transform: translateY(0);
        }

        @media (max-width: 900px) {
          .heroGrid {
            grid-template-columns: 1fr;
            row-gap: 24px;
            padding-bottom: 72px;
          }
          .aboutGrid {
            grid-template-columns: 1fr !important;
            grid-template-rows: auto auto !important;
          }
        }
        @media (max-width: 640px) {
          :global(.prog-prev) {
            left: -8px !important;
          }
          :global(.prog-next) {
            right: -8px !important;
          }
        }
      `}</style>
    </>
  );
}
