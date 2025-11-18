"use client";

import { useEffect, useMemo, useState } from "react";
import { Skeleton } from "antd";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import "swiper/css";

import useAccommodationViewModel from "./useAccommodationViewModel";
import { sanitizeHtml } from "@/app/utils/dompurify";

const FONT_FAMILY =
  '"Public Sans", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';

/* ===== reveal ringan ===== */
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

    const showAll = (nodes) =>
      nodes.forEach((el) => {
        applyDelayVar(el);
        el.classList.add("is-visible");
      });

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

/* ================== Styles ================== */
const styles = {
  sectionInnerBase: {
    width: "min(1360px, 96%)",
    margin: "0 auto",
    fontFamily: FONT_FAMILY,
  },

  /* ========== HERO ========== */
  hero: {
    section: { padding: "8px 0 28px" },
    wrapper: {
      position: "relative",
      background: "#0B56C9",
      borderTopLeftRadius: 24,
      borderTopRightRadius: 120,
      borderBottomLeftRadius: 120,
      borderBottomRightRadius: 24,
      padding: "56px 64px",
      minHeight: 360,
      display: "grid",
      gridTemplateColumns: "1.15fr .85fr",
      alignItems: "center",
      color: "#fff",
      boxShadow: "0 24px 54px rgba(11,86,201,.22)",
      overflow: "hidden",
      fontFamily: FONT_FAMILY,
    },
    left: { minWidth: 0, textAlign: "left" },
    right: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    },
    title: {
      margin: 0,
      fontSize: 56,
      lineHeight: 1.08,
      fontWeight: 900,
      letterSpacing: ".01em",
      textTransform: "none",
    },
    subtitle: {
      margin: "16px 0 0",
      fontSize: 16,
      lineHeight: 1.9,
      letterSpacing: ".01em",
      color: "rgba(255,255,255,.94)",
      maxWidth: 640,
      textAlign: "left",
    },
    illo: {
      justifySelf: "end",
      alignSelf: "end",
      width: 420,
      height: 420,
      objectFit: "contain",
      filter: "drop-shadow(0 10px 20px rgba(0,0,0,.18))",
      zIndex: 1,
      display: "block",
    },
  },

  /* ========== DESCRIPTION ========== */
  desc: {
    section: { padding: "46px 0 56px" },
    title: {
      margin: 0,
      fontWeight: 900,
      fontSize: 40,
      letterSpacing: ".005em",
      color: "#0b0d12",
      fontFamily: FONT_FAMILY,
    },
    text: {
      margin: 0,
      color: "#0b0d12",
      fontSize: 18,
      lineHeight: 2.0,
      letterSpacing: ".01em",
      wordSpacing: "0.04em",
      textAlign: "justify",
      textJustify: "inter-word",
      hyphens: "auto",
      fontFamily: FONT_FAMILY,
    },
  },

  /* ========== SERVICES (slider card biru) ========== */
  services: {
    section: { padding: "40px 0 80px", marginTop: 40 },
    header: {
      textAlign: "center",
      marginBottom: 14,
    },
    heading: {
      margin: 0,
      fontWeight: 800,
      fontSize: "clamp(22px, 3vw, 26px)",
      letterSpacing: ".02em",
      color: "#0B56C9",
    },
    underline: {
      margin: "10px auto 0",
      width: 220,
      height: 3,
      borderRadius: 999,
      background: "#0B56C9",
    },
    subheading: {
      margin: "14px auto 0",
      maxWidth: 640,
      fontSize: 15.5,
      lineHeight: 1.8,
      color: "#4B5563",
    },
    track: {
      marginTop: 26,
      width: "min(1280px, 94%)",
      marginLeft: "auto",
      marginRight: "auto",
      padding: "6px 0 8px",
      overflow: "visible",
    },
  },

  /* ========== WHY (desain baru, benar-benar center) ========== */
  why: {
    section: { margin: "72px 0 96px" },
    grid: {
      maxWidth: 1120,
      margin: "0 auto",
      display: "grid",
      gridTemplateColumns: "minmax(280px, 360px) minmax(0, 1fr)",
      alignItems: "center",
      columnGap: 56,
      rowGap: 0,
    },
    left: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    },
    leftImg: {
      width: "100%",
      maxWidth: 360,
      height: "auto",
      objectFit: "contain",
      display: "block",
    },
    rightPanel: {
      background: "#F5F8FF",
      borderRadius: 32,
      boxShadow: "0 18px 36px rgba(15,23,42,.04)",
    },
    header: {
      textAlign: "left",
    },
    title: {
      margin: 0,
      fontWeight: 800,
      fontSize: "clamp(22px, 3vw, 28px)",
      color: "#0B56C9",
    },
    underline: {
      marginTop: 10,
      width: 260,
      height: 3,
      borderRadius: 999,
      background: "#0B56C9",
    },
    list: {
      marginTop: 26,
      display: "flex",
      flexDirection: "column",
      gap: 18,
    },
    item: {
      display: "grid",
      gridTemplateColumns: "auto 1fr",
      columnGap: 16,
      alignItems: "flex-start",
    },
    iconImg: {
      width: 28,
      height: 28,
      objectFit: "contain",
      display: "block",
      marginTop: 2,
    },
    itemTitle: {
      margin: 0,
      fontWeight: 700,
      fontSize: 18,
      color: "#0B56C9",
    },
    itemText: {
      margin: "4px 0 0",
      fontSize: 14.5,
      color: "#111827",
      lineHeight: 1.7,
    },
  },

  /* ========== CTA ========== */
  cta: {
    section: { marginTop: 75, padding: "0 0 48px" },
    wrap: {
      position: "relative",
      background:
        "linear-gradient(180deg, rgba(206,233,255,1) 0%, rgba(223,244,255,1) 100%)",
      borderRadius: 18,
      padding: "26px 28px",
      boxShadow: "0 10px 28px rgba(15,23,42,.08)",
      overflow: "hidden",
    },
    shadowCard: {
      position: "absolute",
      left: -12,
      top: 10,
      bottom: 10,
      width: 28,
      background: "#0b56c9",
      borderRadius: 16,
      boxShadow: "0 10px 24px rgba(11,86,201,.25)",
    },
    inner: {
      display: "grid",
      gridTemplateColumns: "1fr auto",
      alignItems: "center",
      gap: 18,
    },
    title: {
      margin: 0,
      fontWeight: 900,
      fontSize: "clamp(22px, 3vw, 40px)",
      lineHeight: 1.25,
      textTransform: "uppercase",
      letterSpacing: ".01em",
      color: "#0b56c9",
    },
    sub: {
      margin: "10px 0 0",
      fontWeight: 600,
      fontSize: 16,
      color: "#0f172a",
    },
    btn: {
      background: "#0b56c9",
      color: "#fff",
      fontWeight: 900,
      padding: "14px 22px",
      borderRadius: 999,
      border: 0,
      textDecoration: "none",
      display: "inline-block",
      whiteSpace: "nowrap",
      boxShadow: "0 12px 26px rgba(11,86,201,.25)",
      letterSpacing: ".02em",
    },
  },
};

/* <img> fallback aman */
function Img({ src, alt, style }) {
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={
        src ||
        "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=1200&auto=format&fit=crop"
      }
      alt={alt || ""}
      title={alt || ""}
      style={style}
      loading="lazy"
      onError={(e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src =
          "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=1200&auto=format&fit=crop";
      }}
    />
  );
}

export default function AccommodationContent({ locale = "id" }) {
  const { content, isLoading } = useAccommodationViewModel({ locale });
  useRevealOnScroll([isLoading]);

  const safeDesc = sanitizeHtml(content.description || "", {
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
  });

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

  /* container dengan gutter simetris */
  const sectionInner = useMemo(
    () => ({
      ...styles.sectionInnerBase,
      width: isNarrow ? "100%" : "min(1360px, 96%)",
      paddingInline: isNarrow ? 16 : 0,
      boxSizing: "border-box",
    }),
    [isNarrow]
  );

  // hero card
  const heroWrap = useMemo(
    () => ({
      ...styles.hero.wrapper,
      gridTemplateColumns: isNarrow ? "1fr" : "1.15fr .85fr",
      padding: isNarrow ? "28px 22px" : "56px 64px",
      minHeight: isNarrow ? 260 : 380,
      borderTopRightRadius: isNarrow ? 72 : 120,
      borderBottomLeftRadius: isNarrow ? 72 : 120,
    }),
    [isNarrow]
  );

  const heroTitle = useMemo(
    () => ({
      ...styles.hero.title,
      fontSize: isNarrow ? 32 : 56,
      lineHeight: isNarrow ? 1.15 : 1.08,
    }),
    [isNarrow]
  );

  const illoStyle = useMemo(
    () => ({
      ...styles.hero.illo,
      width: isNarrow ? 260 : 420,
      height: isNarrow ? 260 : 420,
      justifySelf: isNarrow ? "center" : "end",
    }),
    [isNarrow]
  );

  // ====== data services (slider) ======
  const services = content.services || {};
  const serviceCards = services.cards || [];
  const hasCards = serviceCards.length > 0;

  const sliderLoop = serviceCards.length > 6;
  const sliderAutoplay = sliderLoop
    ? {
        delay: 0,
        disableOnInteraction: false,
        pauseOnMouseEnter: true,
        waitForTransition: false,
      }
    : false;
  const sliderSpeed = 9000;

  // ====== WHY responsive styles (center + order mobile) ======
  const whyGrid = useMemo(
    () => ({
      ...styles.why.grid,
      gridTemplateColumns: isNarrow
        ? "1fr"
        : "minmax(280px, 360px) minmax(0, 1fr)",
      columnGap: isNarrow ? 24 : 56,
      rowGap: isNarrow ? 24 : 0,
    }),
    [isNarrow]
  );

  const whyLeft = useMemo(
    () => ({
      ...styles.why.left,
      order: isNarrow ? 2 : 1, // mobile: foto di bawah
    }),
    [isNarrow]
  );

  const whyRight = useMemo(
    () => ({
      ...styles.why.rightPanel,
      order: isNarrow ? 1 : 2, // mobile: teks di atas
      padding: isNarrow ? "24px 18px 26px" : "32px 40px 34px",
    }),
    [isNarrow]
  );

  const why = content.why || {};
  const reasons = why.reasons || [];

  return (
    <div style={{ paddingBottom: 24, fontFamily: FONT_FAMILY }}>
      {/* ===== HERO ===== */}
      <section style={styles.hero.section}>
        <div style={sectionInner}>
          <div className="reveal" data-anim="zoom" style={heroWrap}>
            <div className="reveal" data-anim="left" style={styles.hero.left}>
              {isLoading ? (
                <Skeleton active paragraph={{ rows: 3 }} />
              ) : (
                <>
                  <h1 style={heroTitle}>{content.hero?.title}</h1>
                  {content.hero?.subtitle ? (
                    <p style={styles.hero.subtitle}>{content.hero.subtitle}</p>
                  ) : null}
                </>
              )}
            </div>

            <div
              className="reveal"
              data-anim="right"
              style={styles.hero.right}
              aria-hidden
            >
              {isLoading ? (
                <Skeleton.Image
                  active
                  style={{ width: 260, height: 200, borderRadius: 12 }}
                />
              ) : content.hero?.illustration ? (
                <Img
                  src={content.hero.illustration}
                  alt="Accommodation Illustration"
                  style={illoStyle}
                />
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* ===== DESCRIPTION ===== */}
      <section style={styles.desc.section}>
        <div style={sectionInner}>
          <h2
            className="reveal"
            data-anim="down"
            style={{
              ...styles.desc.title,
              fontSize: isNarrow ? 30 : 40,
            }}
          >
            {locale === "id" ? "Deskripsi Program" : "Program Description"}
          </h2>
          {isLoading ? (
            <Skeleton active paragraph={{ rows: 4 }} />
          ) : (
            <div
              className="reveal desc-content"
              data-anim="up"
              style={{
                ...styles.desc.text,
                fontSize: isNarrow ? 16.5 : 18,
                lineHeight: isNarrow ? 1.9 : 2.0,
              }}
              dangerouslySetInnerHTML={{ __html: safeDesc }}
            />
          )}
        </div>
      </section>

      {/* ===== SERVICES – slider card biru ===== */}
      <section style={styles.services.section}>
        <div style={sectionInner}>
          <div
            className="reveal"
            data-anim="down"
            style={styles.services.header}
          >
            <h3 style={styles.services.heading}>
              {services.heading ||
                (locale === "id"
                  ? "Akomodasi Apa Saja Yang Ada Di OSS Bali?"
                  : "What Accommodation Services Are Available at OSS Bali?")}
            </h3>
            <div style={styles.services.underline} />
            <p style={styles.services.subheading}>
              {services.subheading ||
                (locale === "id"
                  ? "Mulai dari tiket, hunian, hingga kebutuhan penunjang lain — semua bisa kami bantu siapkan sejak sebelum keberangkatan."
                  : "From tickets and housing to other essential needs — we help you prepare everything even before departure.")}
            </p>
          </div>

          {isLoading ? (
            <Skeleton
              active
              className="reveal"
              data-anim="up"
              paragraph={{ rows: 3 }}
            />
          ) : hasCards ? (
            <div
              className="reveal"
              data-anim="zoom"
              data-rvd="60ms"
              style={styles.services.track}
            >
              <Swiper
                className="acco-type-swiper"
                modules={[Autoplay]}
                slidesPerView="auto"
                spaceBetween={18}
                loop={sliderLoop}
                loopAdditionalSlides={
                  sliderLoop ? Math.max(10, serviceCards.length) : 0
                }
                speed={sliderSpeed}
                allowTouchMove
                autoplay={sliderAutoplay}
                observer
                observeParents
                watchSlidesProgress
              >
                {serviceCards.map((card) => (
                  <SwiperSlide key={card.id || card.label}>
                    <article className="acco-type-card">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        className="acco-type-icon"
                        src={card.icon || "/icons/acco-placeholder.svg"}
                        alt={card.label}
                        title={card.label}
                        loading="lazy"
                      />
                      <p className="acco-type-label">{card.label}</p>
                    </article>
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
          ) : null}
        </div>
      </section>

      {/* ===== WHY – benar-benar center ===== */}
      <section style={styles.why.section}>
        <div style={sectionInner}>
          <div className="reveal" data-anim="zoom" style={whyGrid}>
            {/* kiri: foto student (tanpa frame tambahan) */}
            <div style={whyLeft}>
              <Img
                src={why.image}
                alt="Mahasiswa OSS Bali"
                style={styles.why.leftImg}
              />
            </div>

            {/* kanan: panel biru muda + list alasan */}
            <div style={whyRight}>
              <div style={styles.why.header}>
                <h3 style={styles.why.title}>
                  {why.heading ||
                    (locale === "id"
                      ? "Mengapa Pilih Akomodasi Di OSS Bali?"
                      : "Why Choose Accommodation With OSS Bali?")}
                </h3>
                <div style={styles.why.underline} />
              </div>

              <div style={styles.why.list}>
                {reasons.map((w) => (
                  <div key={w.id} style={styles.why.item}>
                    {/* hanya icon, tanpa background box */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={w.icon || "/icons/why-placeholder.svg"}
                      alt={w.title}
                      title={w.title}
                      style={styles.why.iconImg}
                      loading="lazy"
                    />
                    <div>
                      <p style={styles.why.itemTitle}>{w.title}</p>
                      <p style={styles.why.itemText}>{w.text || w.sub || ""}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section style={styles.cta.section}>
        <div style={sectionInner}>
          <div className="reveal" data-anim="zoom" style={styles.cta.wrap}>
            <div style={styles.cta.shadowCard} />
            <div
              style={{
                ...styles.cta.inner,
                gridTemplateColumns: isNarrow ? "1fr" : "1fr auto",
              }}
            >
              <div>
                <h3
                  className="reveal"
                  data-anim="down"
                  style={styles.cta.title}
                >
                  {content.cta?.title}
                </h3>
                <p className="reveal" data-anim="up" style={styles.cta.sub}>
                  {content.cta?.subtitle}
                </p>
              </div>
              {content.cta?.button?.href && (
                <a
                  href={content.cta.button.href}
                  className="reveal"
                  data-anim="left"
                  style={{
                    ...styles.cta.btn,
                    width: isNarrow ? "100%" : "auto",
                    textAlign: "center",
                  }}
                >
                  {content.cta.button.label}
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ===== global anim styles + slider styles ===== */}
      <style jsx global>{`
        ::selection {
          background: #0b56c9;
          color: #fff;
        }
        html,
        body {
          overflow-x: clip;
        }
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
          color: #0b56c9;
          text-decoration: underline;
          text-underline-offset: 2px;
          text-decoration-thickness: 1.5px;
        }

        /* ===== Slider Layanan Akomodasi (Swiper) ===== */
        :root {
          --acco-card-w: clamp(190px, 18vw, 220px);
        }

        .acco-type-swiper {
          overflow: visible;
          padding-block: 6px;
        }

        .acco-type-swiper .swiper-wrapper {
          transition-timing-function: linear !important;
          align-items: stretch;
        }

        .acco-type-swiper .swiper-slide {
          width: var(--acco-card-w);
          height: auto;
          display: flex;
        }

        .acco-type-card {
          width: 100%;
          height: 100%;
          min-height: 190px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          text-align: center;
          padding: 20px 16px 18px;
          border-radius: 18px;
          background: #0b56c9;
          box-shadow: 0 14px 28px rgba(11, 86, 201, 0.35);
          color: #ffffff;
        }

        .acco-type-icon {
          width: 74px;
          height: 74px;
          object-fit: contain;
          display: block;
          margin-bottom: 14px;
          flex-shrink: 0;
        }

        .acco-type-label {
          margin: 0;
          font-weight: 700;
          font-size: 14px;
          letter-spacing: 0.01em;
        }

        @media (hover: hover) {
          .acco-type-card {
            transition: transform 0.18s ease, box-shadow 0.18s ease,
              filter 0.18s ease;
          }
          .acco-type-card:hover {
            transform: translateY(-4px);
            filter: saturate(1.05);
            box-shadow: 0 18px 34px rgba(11, 86, 201, 0.45);
          }
        }

        @media (max-width: 640px) {
          :root {
            --acco-card-w: 210px;
          }
          .acco-type-card {
            min-height: 175px;
            padding: 18px 12px 16px;
          }
          .acco-type-icon {
            width: 64px;
            height: 64px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .reveal {
            transition: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
}
