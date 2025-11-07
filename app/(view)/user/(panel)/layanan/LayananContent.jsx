"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Typography, Skeleton, Empty } from "antd";
import { sanitizeHtml } from "@/app/utils/dompurify";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, FreeMode } from "swiper/modules";
import "swiper/css";

import useLayananViewModel from "./useLayananViewModel";

const { Title, Paragraph } = Typography;

/* ========= class names ========= */
const ROOT_CLASS = "layanan-page";
const SERVICE_SWIPER_CLASS = "layanan-services-swiper";
const TESTI_SWIPER_CLASS = "layanan-testimoni-swiper";

/* ========= marquee config ========= */
const MARQUEE_SPEED = 6000;
const marqueeAutoplay = {
  delay: 0,
  disableOnInteraction: false,
  pauseOnMouseEnter: false,
};
const marqueeFreeMode = { enabled: true, momentum: false, sticky: false };

/* ========= storage helpers (supabase/public) ========= */
const STORAGE_BASE_URL = (() => {
  const explicit = (process.env.NEXT_PUBLIC_STORAGE_BASE_URL || "")
    .trim()
    .replace(/\/$/, "");
  if (explicit) return explicit;
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "")
    .trim()
    .replace(/\/$/, "");
  const bucket = (process.env.NEXT_PUBLIC_SUPABASE_BUCKET || "")
    .trim()
    .replace(/^\/+|\/+$/g, "");
  if (supabaseUrl && bucket)
    return `${supabaseUrl}/storage/v1/object/public/${bucket}`;
  return "";
})();
const STORAGE_PREFIX_HINT =
  /^(testimonials|user|services|programs|consultant|consultants|events|blog|blogs|college|colleges)/i;

const DEFAULT_TESTI_PLACEHOLDER =
  "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=1200&auto=format&fit=crop";

const looksLikeStorageObject = (path = "") => {
  const cleaned = path.replace(/^\/+/, "");
  if (!cleaned) return false;
  if (STORAGE_PREFIX_HINT.test(cleaned)) return true;
  return cleaned.includes("/");
};
const A = (v) => (Array.isArray(v) ? v : []);

/* ========= image helpers ========= */
function normalizeImgSrc(input) {
  const raw = (input ?? "").toString().trim();
  if (!raw) return DEFAULT_TESTI_PLACEHOLDER;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/")) return raw;
  const cleaned = raw.replace(/^\/+/, "");
  if (!cleaned) return DEFAULT_TESTI_PLACEHOLDER;

  if (looksLikeStorageObject(cleaned)) {
    if (STORAGE_BASE_URL) return `${STORAGE_BASE_URL}/${cleaned}`;
    return DEFAULT_TESTI_PLACEHOLDER;
  }

  return `/${cleaned}`;
}
function isExternal(src) {
  return /^https?:\/\//i.test(src);
}

/* ========= base styles (desktop-first, di-override via CSS media) ========= */
const styles = {
  /* ---------- HERO ---------- */
  hero: {
    marginTop: "calc(-1 * clamp(48px, 8vw, 84px))",
    background: "#fff",
  },
  heroBleed: {
    width: "100vw",
    marginLeft: "calc(50% - 50vw)",
    marginRight: "calc(50% - 50vw)",
  },
  heroImgFrame: {
    position: "relative",
    width: "100vw",
    height: "clamp(680px, 86vh, 1080px)",
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
  heroContentFloating: {
    position: "absolute",
    right: "max(24px, 6vw)",
    top: "50%",
    transform: "translateY(-50%)",
    maxWidth: 720,
    textAlign: "right",
    zIndex: 2,
  },
  heroTitle: {
    fontWeight: 800,
    fontSize: "clamp(32px, 4.2vw, 64px)",
    letterSpacing: 0.6,
    color: "#2456b7",
    margin: 0,
    textTransform: "uppercase",
    textAlign: "left",
  },
  heroQuote: {
    color: "#173777",
    opacity: 0.95,
    marginTop: 12,
    fontWeight: 800,
    textTransform: "uppercase",
    fontSize: "clamp(16px, 1.9vw, 22px)",
    lineHeight: 1.5,
    textAlign: "left",
  },

  /* ---------- Pills ---------- */
  pillsGrid: {
    marginTop: 24,
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
    width: "min(92vw, 720px)",
    marginLeft: "auto",
  },
  pill: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "14px 20px",
    borderRadius: 999,
    border: "1px solid var(--pill-border, rgba(17,43,76,.18))",
    background:
      "var(--pill-bg, linear-gradient(180deg, rgba(255,255,255,.65) 0%, rgba(231,241,255,.65) 100%))",
    boxShadow: "var(--pill-shadow, 0 10px 18px rgba(17,43,76,.12))",
    backdropFilter: "blur(4px)",
    textDecoration: "none",
    color: "var(--pill-fg, #163257)",
    boxSizing: "border-box", // penting agar lebar 100% rapi di mobile
  },
  pillIcon: {
    width: 38,
    height: 38,
    flex: "0 0 auto",
    objectFit: "contain",
    filter: "var(--pill-icon-filter, none)",
  },
  pillText: {
    fontWeight: 800,
    color: "var(--pill-fg, #163257)",
    letterSpacing: ".02em",
    fontSize: 16,
    whiteSpace: "nowrap",
  },
  widePill: {
    gridColumn: "1 / -1",
    justifySelf: "center",
    width: "min(360px, 100%)",
  },

  /* ---------- WHY ---------- */
  section: { width: "min(1180px, 92%)", margin: "70px auto 90px" },
  whyTitle: {
    fontWeight: 900,
    color: "#0B56B8",
    letterSpacing: ".6px",
    textTransform: "uppercase",
    fontSize: "clamp(28px, 3.5vw, 46px)",
    marginBottom: 18,
    textAlign: "center",
  },
  whyGrid: {
    display: "grid",
    gridTemplateColumns: "min(360px, 40%) 1fr",
    gap: 28,
    alignItems: "center",
  },
  whyLeftImgWrap: {
    position: "relative",
    width: "100%",
    aspectRatio: "3/4",
    marginLeft: 40,
  },
  whyList: { display: "grid", gap: 22, marginLeft: 40 },
  whyItem: {
    display: "grid",
    gridTemplateColumns: "64px 1fr",
    gap: 18,
    alignItems: "center",
  },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 16,
    background: "#0B56B8",
    display: "grid",
    placeItems: "center",
    boxShadow: "0 12px 22px rgba(11,86,184,0.28)",
  },
  badgeIcon: {
    width: 34,
    height: 34,
    objectFit: "contain",
    filter: "brightness(0) invert(1)",
  },
  itemHeading: {
    margin: 0,
    color: "#083B88",
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: ".8px",
    fontSize: "clamp(18px, 2.2vw, 28px)",
    lineHeight: 1.1,
  },
  itemSub: {
    margin: "6px 0 0",
    color: "#2B4B86",
    fontWeight: 600,
    fontSize: "clamp(13px, 1.4vw, 18px)",
  },

  /* ---------- SERVICES ---------- */
  serviceWrap: { width: "min(1180px, 92%)", margin: "0 auto 90px" },
  serviceTitle: {
    fontWeight: 900,
    color: "#0B56B8",
    letterSpacing: ".8px",
    textTransform: "uppercase",
    fontSize: "clamp(26px, 3.3vw, 44px)",
    margin: 0,
  },
  serviceIntro: {
    marginTop: 10,
    maxWidth: 980,
    color: "#143e86",
    lineHeight: 1.8,
    fontSize: "clamp(14px, 1.6vw, 18px)",
    fontWeight: 600,
  },
  serviceCarousel: { marginTop: 32, position: "relative" },
  serviceSlide: { width: "var(--svc-card-w, 340px)" },

  card: {
    position: "relative",
    borderRadius: 28,
    overflow: "visible",
    width: "100%",
    maxWidth: "var(--svc-card-w, 360px)",
    boxShadow: "0 16px 36px rgba(15,23,42,.12)",
    minWidth: 260,
    background: "#fff",
    paddingBottom: 24,
  },
  cardImgBox: {
    position: "relative",
    width: "100%",
    height: "var(--svc-card-h, 280px)",
    borderRadius: 28,
    overflow: "hidden",
  },
  cardImg: { objectFit: "cover" },
  cardFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "45%",
    background:
      "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(8,59,136,0.06) 40%, rgba(8,59,136,0.22) 100%)",
    zIndex: 1,
  },
  cardPill: {
    position: "absolute",
    left: "50%",
    bottom: -1,
    transform: "translateX(-50%)",
    zIndex: 2,
    background: "#0B56B8",
    color: "#fff",
    padding: "14px 26px",
    borderRadius: 999,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: ".6px",
    fontSize: 16,
    textDecoration: "none",
    border: "6px solid #fff",
    whiteSpace: "nowrap",
    lineHeight: 1,
  },

  /* ---------- TESTIMONIAL (SHORTER) ---------- */
  testiWrap: {
    width: "min(1180px, 92%)",
    margin: "0 auto 90px",
    "--testi-card-w": "clamp(260px, 30vw, 340px)",
    "--testi-card-h": "clamp(220px, 26vw, 260px)",
    "--testi-avatar-size": "clamp(80px, 16vw, 120px)",
    "--testi-avatar-overlap": "calc(var(--testi-avatar-size) * 0.45)",
    "--testi-avatar-offset": "calc(var(--testi-avatar-size) * 0.45 + 20px)",
  },
  testiTitle: {
    textAlign: "center",
    color: "#0B56B8",
    fontWeight: 900,
    textTransform: "uppercase",
    fontSize: "clamp(28px, 3.2vw, 44px)",
    marginBottom: 20,
  },
  testiSlide: { width: "var(--testi-card-w, 340px)" },
  testiCardShell: {
    position: "relative",
    background: "#0B3E91",
    border: "none",
    borderRadius: 16,
    boxShadow: "0 12px 24px rgba(0,0,0,.14)",
    overflow: "visible",
    width: "100%",
    maxWidth: "var(--testi-card-w, 340px)",
    paddingTop: "var(--testi-avatar-offset, 84px)",
    minHeight: "var(--testi-card-h, 260px)",
    display: "flex",
    flexDirection: "column",
    marginTop: "70px",
  },
  testiCardBody: {
    padding: "12px 16px 14px",
    display: "grid",
    gridTemplateRows: "auto 1fr",
    gap: 6,
    flex: 1,
    overflow: "hidden",
  },
  testiAvatarWrap: {
    position: "absolute",
    top: "calc(-1 * var(--testi-avatar-overlap, 54px))",
    left: "50%",
    transform: "translateX(-50%)",
    width: "var(--testi-avatar-size, 120px)",
    height: "var(--testi-avatar-size, 120px)",
    borderRadius: "50%",
    overflow: "hidden",
    border: "6px solid #0B3E91",
    boxShadow: "0 10px 20px rgba(0,0,0,.24)",
    background: "#111",
    zIndex: 5,
  },
  testiAvatarImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  testiName: {
    margin: "4px 0 0",
    textAlign: "center",
    fontSize: 15,
    fontWeight: 900,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#FFD24A",
  },
  testiQuote: {
    marginTop: 6,
    color: "#E9EEF7",
    fontSize: 13.5,
    lineHeight: 1.55,
    textAlign: "center",
    whiteSpace: "pre-line",
  },
};

export default function LayananContent({ locale = "id" }) {
  const {
    hero,
    reasons,
    whyImage,
    services,
    serviceIntro,
    testimonials,
    testiLoading,
  } = useLayananViewModel({ locale });

  const pills = A(hero?.pills).slice(0, 5);
  const hasMultipleServices = A(services).length > 1;
  const hasMultipleTesti = A(testimonials).length > 1;

  const serviceAutoplay = hasMultipleServices
    ? { ...marqueeAutoplay, reverseDirection: true }
    : undefined;

  const testiAutoplay = hasMultipleTesti
    ? { ...marqueeAutoplay, reverseDirection: false }
    : undefined;

  return (
    <div className={ROOT_CLASS}>
      {/* ===== HERO ===== */}
      <section style={styles.hero}>
        <div style={styles.heroBleed}>
          <div className="hero-frame" style={styles.heroImgFrame}>
            <Image
              className="hero-bg"
              src={hero.image}
              alt="OSS Services"
              fill
              priority
              sizes="100vw"
              style={{
                objectFit: "cover",
                objectPosition: hero.objectPosition || "40% 50%",
                filter: "saturate(0.98) contrast(1)",
              }}
            />
            <div className="hero-overlay" style={styles.heroOverlay} />
            <div className="hero-copy" style={styles.heroContentFloating}>
              <Title level={1} className="hero-title" style={styles.heroTitle}>
                {hero.title}
              </Title>
              <Paragraph className="hero-quote" style={styles.heroQuote}>
                {hero.quoteTop}
              </Paragraph>
              <Paragraph
                className="hero-quote"
                style={{ ...styles.heroQuote, marginTop: 0 }}
              >
                {hero.quoteBottom}
              </Paragraph>

              {!!pills.length && (
                <div className="pills-grid" style={styles.pillsGrid}>
                  {pills.slice(0, 4).map((p, i) => (
                    <Link
                      key={i}
                      href={
                        p.href
                          ? p.href.includes("?")
                            ? `${p.href}&menu=layanan`
                            : `${p.href}?menu=layanan`
                          : "#"
                      }
                      className="pill"
                      style={styles.pill}
                    >
                      <img src={p.icon} alt="" style={styles.pillIcon} />
                      <span style={styles.pillText}>{p.label}</span>
                    </Link>
                  ))}
                  {!!pills[4] && (
                    <Link
                      href={
                        pills[4].href
                          ? pills[4].href.includes("?")
                            ? `${pills[4].href}&menu=layanan`
                            : `${pills[4].href}?menu=layanan`
                          : "#"
                      }
                      className="pill pill--wide"
                      style={{ ...styles.pill, ...styles.widePill }}
                    >
                      <img src={pills[4].icon} alt="" style={styles.pillIcon} />
                      <span style={styles.pillText}>{pills[4].label}</span>
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ===== WHY CHOOSE OSS SERVICE ===== */}
      <section style={styles.section}>
        <Title level={2} style={styles.whyTitle}>
          WHY CHOOSE OSS SERVICE?
        </Title>
        <div className="why-grid" style={styles.whyGrid}>
          <div className="why-img" style={styles.whyLeftImgWrap}>
            <Image
              src={whyImage}
              alt="Why choose illustration"
              fill
              sizes="(max-width: 960px) 90vw, 40vw"
              style={{ objectFit: "contain" }}
            />
          </div>
          <div className="why-list" style={styles.whyList}>
            {A(reasons).map((r) => (
              <div key={r.key} style={styles.whyItem}>
                <div style={styles.badge}>
                  <img
                    src={r.icon || "/icons/check-bold.svg"}
                    alt=""
                    style={styles.badgeIcon}
                  />
                </div>
                <div>
                  <h3 style={styles.itemHeading}>
                    <strong>{r.title}</strong>
                  </h3>
                  <p style={styles.itemSub}>{r.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== OUR SERVICE ===== */}
      <section style={styles.serviceWrap}>
        <h2 style={styles.serviceTitle}>OUR SERVICE</h2>
        <p style={styles.serviceIntro}>{serviceIntro}</p>

        <div style={styles.serviceCarousel}>
          <Swiper
            className={SERVICE_SWIPER_CLASS}
            modules={[Autoplay, FreeMode]}
            slidesPerView="auto"
            spaceBetween={20}
            loop={hasMultipleServices}
            speed={MARQUEE_SPEED}
            allowTouchMove={false}
            autoplay={serviceAutoplay}
            freeMode={marqueeFreeMode}
          >
            {A(services).map((s) => (
              <SwiperSlide key={s.id} style={styles.serviceSlide}>
                <div style={styles.card}>
                  <div style={styles.cardImgBox}>
                    <Image
                      src={s.image}
                      alt={s.title}
                      fill
                      sizes="(max-width: 1200px) 50vw, 380px"
                      style={styles.cardImg}
                    />
                    <div style={styles.cardFade} />
                  </div>
                  <Link
                    href={
                      s.href
                        ? s.href.includes("?")
                          ? `${s.href}&menu=layanan`
                          : `${s.href}?menu=layanan`
                        : "#"
                    }
                    style={styles.cardPill}
                  >
                    {s.title}
                  </Link>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </section>

      {/* ===== OUR TESTIMONIALS ===== */}
      <section style={styles.testiWrap}>
        <Title level={2} style={styles.testiTitle}>
          OUR TESTIMONIALS
        </Title>

        {testiLoading ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 20,
            }}
            className="testi-skeleton"
          >
            {[...Array(3)].map((_, i) => (
              <Skeleton.Input
                key={i}
                active
                block
                style={{
                  height: "var(--testi-card-h, 260px)",
                  borderRadius: 16,
                }}
              />
            ))}
          </div>
        ) : A(testimonials).length === 0 ? (
          <Empty description="Belum ada testimoni untuk kategori layanan" />
        ) : (
          <>
            <Swiper
              className={TESTI_SWIPER_CLASS}
              modules={[Autoplay, FreeMode]}
              loop={hasMultipleTesti}
              speed={MARQUEE_SPEED}
              autoplay={testiAutoplay}
              slidesPerView="auto"
              spaceBetween={16}
              allowTouchMove={false}
              freeMode={marqueeFreeMode}
            >
              {A(testimonials).map((t) => {
                const src = normalizeImgSrc(t.image);
                const external = isExternal(src);
                const description = sanitizeHtml(t.description || "");
                return (
                  <SwiperSlide key={t.id} style={styles.testiSlide}>
                    <article style={styles.testiCardShell}>
                      <div style={styles.testiAvatarWrap}>
                        <Image
                          src={src}
                          alt={t.name || "Testimonial"}
                          fill
                          sizes="(max-width: 420px) 120px, 140px"
                          style={styles.testiAvatarImg}
                          unoptimized={external}
                        />
                      </div>
                      <div style={styles.testiCardBody}>
                        <h3 style={styles.testiName}>
                          {(t.name || "").toUpperCase()}
                        </h3>
                        <p
                          style={styles.testiQuote}
                          dangerouslySetInnerHTML={{
                            __html: description || "-",
                          }}
                        />
                      </div>
                    </article>
                  </SwiperSlide>
                );
              })}
            </Swiper>

            {/* testimonial sizing tweaks */}
            <style
              dangerouslySetInnerHTML={{
                __html: `
                .${TESTI_SWIPER_CLASS} { overflow: visible; padding: 6px 4px; }
                .${TESTI_SWIPER_CLASS} .swiper-wrapper { align_items: stretch; }
                .${TESTI_SWIPER_CLASS} .swiper-slide { height: auto; display: flex; align-items: stretch; }
                .${TESTI_SWIPER_CLASS} .swiper-pagination,
                .${TESTI_SWIPER_CLASS} .swiper-button-next,
                .${TESTI_SWIPER_CLASS} .swiper-button-prev { display: none !important; }

                .${TESTI_SWIPER_CLASS} {
                  --testi-card-w: clamp(260px, 30vw, 340px);
                  --testi-card-h: clamp(220px, 26vw, 260px);
                  --testi-avatar-size: clamp(80px, 16vw, 120px);
                  --testi-avatar-overlap: calc(var(--testi-avatar-size) * 0.45);
                  --testi-avatar-offset: calc(var(--testi-avatar-size) * 0.45 + 20px);
                }
                @media (max-width: 1023px) {
                  .${TESTI_SWIPER_CLASS} {
                    --testi-card-w: clamp(240px, 44vw, 320px);
                    --testi-card-h: clamp(210px, 40vw, 240px);
                  }
                }
                @media (max-width: 639px) {
                  .${TESTI_SWIPER_CLASS} {
                    --testi-card-w: clamp(220px, 86vw, 300px);
                    --testi-card-h: clamp(200px, 82vw, 230px);
                    --testi-avatar-size: clamp(72px, 38vw, 110px);
                  }
                  .${ROOT_CLASS} .testi-skeleton {
                    grid-template-columns: 1fr !important;
                  }
                }
              `,
              }}
            />
          </>
        )}
      </section>

      {/* ===== Global responsive tweaks (hero, why, services, swiper, pills) ===== */}
      <style jsx global>{`
        /* Scope variables ke halaman ini */
        .${ROOT_CLASS} {
          --pill-bg: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.65) 0%,
            rgba(231, 241, 255, 0.65) 100%
          );
          --pill-fg: #163257;
          --pill-border: rgba(17, 43, 76, 0.18);
          --pill-shadow: 0 10px 18px rgba(17, 43, 76, 0.12);
          --pill-icon-filter: none; /* ikon tetap warna asli */
        }

        /* Service card tokens */
        .${ROOT_CLASS} {
          --svc-card-w: 340px;
          --svc-card-h: 280px;
        }
        @media (max-width: 1199px) {
          .${ROOT_CLASS} {
            --svc-card-w: 320px;
            --svc-card-h: 270px;
          }
        }
        @media (max-width: 991px) {
          .${ROOT_CLASS} {
            --svc-card-w: 300px;
            --svc-card-h: 260px;
          }
        }
        @media (max-width: 767px) {
          .${ROOT_CLASS} {
            --svc-card-w: clamp(260px, 86vw, 320px);
            --svc-card-h: clamp(220px, 54vw, 260px);
          }
        }

        /* HERO baseline height */
        .${ROOT_CLASS} .hero-frame {
          height: clamp(540px, 72vh, 960px);
        }
        @media (max-width: 991px) {
          .${ROOT_CLASS} .hero-frame {
            height: clamp(520px, 70vh, 840px);
          }
          .${ROOT_CLASS} .hero-copy {
            right: auto !important;
            left: 50% !important;
            top: auto !important;
            bottom: clamp(16px, 6vw, 28px) !important;
            transform: translate(-50%, 0) !important;
            text-align: center !important;
            max-width: min(92vw, 640px) !important;
          }
          .${ROOT_CLASS} .hero-title,
          .${ROOT_CLASS} .hero-quote {
            text-align: center !important;
          }
          .${ROOT_CLASS} .pills-grid {
            margin-left: 0 !important;
            width: min(96vw, 680px) !important;
            grid-template-columns: 1fr 1fr !important;
            justify-self: center;
          }
          /* Tablet: pastikan pill ke-5 tidak wide */
          .${ROOT_CLASS} .pill--wide {
            grid-column: auto !important;
            justify-self: stretch !important;
            width: 100% !important;
          }
        }

        /* HIDE hero background & overlay di mobile */
        @media (max-width: 767px) {
          .${ROOT_CLASS} .hero-bg {
            display: none !important;
          }
          .${ROOT_CLASS} .hero-overlay {
            display: none !important;
          }
          .${ROOT_CLASS} .hero-frame {
            background: #fff !important;
            box-shadow: none !important;
          }
          .${ROOT_CLASS} .pills-grid {
            grid-template-columns: 1fr !important;
            justify-items: stretch; /* isi selebar kolom */
          }
        }

        /* === PILL: biru di mobile; ikon tetap warna asli === */
        @media (max-width: 767px) {
          .${ROOT_CLASS} {
            --pill-bg: #0b56b8;
            --pill-fg: #ffffff;
            --pill-border: rgba(255, 255, 255, 0.28);
            --pill-shadow: 0 10px 18px rgba(11, 86, 184, 0.28);
            --pill-icon-filter: none; /* jangan invert */
          }
          /* Mobile: semua pill 100% width (termasuk ke-5) */
          .${ROOT_CLASS} .pill,
          .${ROOT_CLASS} .pill--wide {
            width: 100% !important;
            box-sizing: border-box;
          }
        }

        /* WHY grid -> stack di mobile */
        @media (max-width: 1023px) {
          .${ROOT_CLASS} .why-grid {
            grid-template-columns: 1fr !important;
            gap: 22px !important;
          }
          .${ROOT_CLASS} .why-img,
          .${ROOT_CLASS} .why-list {
            margin-left: 0 !important;
          }
        }

        /* Swiper housekeeping */
        .${SERVICE_SWIPER_CLASS} {
          overflow: visible;
          padding-block: 12px;
        }
        .${SERVICE_SWIPER_CLASS} .swiper-wrapper,
        .${TESTI_SWIPER_CLASS} .swiper-wrapper {
          align-items: stretch;
        }
        .${SERVICE_SWIPER_CLASS} .swiper-slide,
        .${TESTI_SWIPER_CLASS} .swiper-slide {
          height: auto;
          display: flex;
          align-items: stretch;
        }
        .${SERVICE_SWIPER_CLASS} .swiper-slide > div,
        .${TESTI_SWIPER_CLASS} .swiper-slide > div {
          width: 100%;
        }
        .${SERVICE_SWIPER_CLASS} .swiper-pagination,
        .${SERVICE_SWIPER_CLASS} .swiper-button-next,
        .${SERVICE_SWIPER_CLASS} .swiper-button-prev,
        .${TESTI_SWIPER_CLASS} .swiper-pagination,
        .${TESTI_SWIPER_CLASS} .swiper-button-next,
        .${TESTI_SWIPER_CLASS} .swiper-button-prev {
          display: none !important;
        }
      `}</style>
    </div>
  );
}
