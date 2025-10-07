"use client";

import { useEffect, useMemo, useState } from "react";
import { Typography, Skeleton, Empty } from "antd";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, FreeMode } from "swiper/modules";
import "swiper/css";
import useVisaViewModel from "./useVisaViewModel";
import { sanitizeHtml } from "@/app/utils/dompurify";

const { Title } = Typography;
const FONT_FAMILY = '"Poppins", sans-serif';

const TESTI_SWIPER_CLASS = "visa-testimoni-swiper";
const MARQUEE_SPEED = 6000;
const marqueeAutoplay = {
  delay: 0,
  disableOnInteraction: false,
  pauseOnMouseEnter: false,
};
const STORAGE_BASE_URL = (() => {
  const explicit = (process.env.NEXT_PUBLIC_STORAGE_BASE_URL || "").trim().replace(/\/$/, "");
  if (explicit) return explicit;
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/\/$/, "");
  const bucket = (process.env.NEXT_PUBLIC_SUPABASE_BUCKET || "").trim().replace(/^\/+|\/+$/g, "");
  if (supabaseUrl && bucket) {
    return `${supabaseUrl}/storage/v1/object/public/${bucket}`;
  }
  return "";
})();

const DEFAULT_TESTI_PLACEHOLDER = "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=1200&auto=format&fit=crop";
const shouldUseStorage = (path = "") => /testimonials\//i.test(path);

const marqueeFreeMode = { enabled: true, momentum: false, sticky: false };

/* helpers */
const isSvg = (val) => typeof val === "string" && /\.svg(\?.*)?$/i.test(val);
const normalizeImgSrc = (input) => {
  const raw = (input ?? "").toString().trim();
  if (!raw) return DEFAULT_TESTI_PLACEHOLDER;
  if (/^https?:\/\//i.test(raw)) return raw;
  const cleaned = raw.replace(/^\/+/, "");
  if (shouldUseStorage(cleaned)) {
    if (STORAGE_BASE_URL) return `${STORAGE_BASE_URL}/${cleaned}`;
    return DEFAULT_TESTI_PLACEHOLDER;
  }
  if (raw.startsWith("/")) return raw;
  return `/${cleaned}`;
};
const isExternal = (src) => /^https?:\/\//i.test(src);

function Img({ src, alt, style }) {
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={
        src ||
        DEFAULT_TESTI_PLACEHOLDER
      }
      alt={alt || ""}
      style={style}
      onError={(e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src =
          DEFAULT_TESTI_PLACEHOLDER;
      }}
    />
  );
}

const styles = {
  sectionInner: {
    width: "min(1360px, 96%)",
    margin: "0 auto",
    fontFamily: FONT_FAMILY,
  },

  hero: {
    wrapper: {
      background: "#0b56c9",
      backgroundImage:
        "linear-gradient(180deg,#0b56c9 0%, #0a50bb 55%, #0a469f 100%)",
      borderRadius: 56,
      minHeight: 420,
      padding: "44px 56px",
      marginTop: "-36px",
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 28,
      alignItems: "center",
      color: "#fff",
      boxShadow: "0 24px 54px rgba(3,30,88,.28)",
      width: "calc(100% - 100px)",
    },
    left: { minWidth: 0, textAlign: "left" },
    right: { display: "flex", justifyContent: "center" },
    heading: {
      margin: 0,
      fontSize: 54,
      lineHeight: 1.06,
      fontWeight: 800,
      letterSpacing: 0.2,
    },
    tagline: {
      margin: "16px 0 18px",
      fontSize: 17,
      lineHeight: 1.7,
      color: "rgba(255,255,255,.92)",
      textAlign: "left",
      maxWidth: 640,
    },
    illu: { width: "min(500px, 92%)", height: 320 },
    chips: { display: "flex", gap: 12, flexWrap: "wrap", marginTop: 6 },
    chip: {
      appearance: "none",
      border: "1px solid rgba(255,255,255,.55)",
      background: "#fff",
      color: "#0a4ea7",
      borderRadius: 999,
      padding: "10px 16px",
      fontWeight: 600,
      boxShadow: "0 6px 14px rgba(7,49,140,.18)",
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      cursor: "default",
    },
    chipIcon: {
      display: "inline-flex",
      width: 18,
      height: 18,
      alignItems: "center",
      justifyContent: "center",
      background: "#e8f1ff",
      borderRadius: 999,
      overflow: "hidden",
    },
    chipImg: { width: 16, height: 16, display: "block" },
  },

  desc: {
    section: { padding: "0 0 16px" },
    wrap: { marginTop: 75 },
    title: {
      margin: "0 0 14px",
      fontWeight: 800,
      fontSize: 40,
      lineHeight: 1.1,
      color: "#0f172a",
    },
    box: {
      background: "#fff",
      border: "2px solid #e5e7eb",
      borderRadius: 14,
      padding: "22px 24px",
      boxShadow: "0 6px 20px rgba(15,23,42,0.04)",
    },
  },

  bar: {
    section: { padding: "75px 0 12px" },
    bleed: {
      width: "100vw",
      height: 64,
      marginLeft: "calc(50% - 50vw)",
      marginRight: "calc(50% - 50vw)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background:
        "linear-gradient(90deg, #9ad3f8 0%, #77d3d1 40%, #a0b4ff 100%)",
      boxShadow: "0 8px 22px rgba(90,130,255,.22)",
      borderRadius: 0,
      color: "#143269",
      fontWeight: 800,
      letterSpacing: 1.2,
      fontSize: "clamp(18px, 2.2vw, 26px)",
      boxSizing: "border-box",
    },
  },

  poster: {
    container: { margin: "-30px 0" },
    img: { width: "100%", height: "auto", display: "block", borderRadius: 18 },
  },

  benefits: {
    section: { padding: "8px 0 40px" },
    head: {
      textAlign: "center",
      margin: "0 0 10px",
      fontWeight: 900,
      color: "#0f172a",
      fontSize: 28,
    },
    headBlue: { color: "#0b56c9" },
    sub: {
      textAlign: "center",
      margin: "0 auto 24px",
      maxWidth: 720,
      color: "#475569",
      fontWeight: 500,
    },
    trackWrap: { position: "relative", paddingTop: 18, paddingBottom: 8 },
    trackLine: {
      position: "absolute",
      left: 0,
      right: 0,
      top: 42,
      height: 4,
      background: "linear-gradient(90deg,#e2e8f0,#e5e7eb)",
      borderRadius: 999,
    },
    grid: {
      position: "relative",
      display: "grid",
      gridTemplateColumns: "repeat(3,1fr)",
      gap: 24,
      alignItems: "start",
      zIndex: 1,
    },
    item: { textAlign: "left" },
    iconWrap: {
      width: 72,
      height: 72,
      borderRadius: 16,
      background: "#fff",
      boxShadow: "0 10px 24px rgba(15,23,42,.08)",
      display: "grid",
      placeItems: "center",
      margin: "0 auto 10px",
      border: "1px solid #eef2ff",
      overflow: "hidden",
    },
    iconImg: { width: "100%", height: "100%", objectFit: "contain" },
    title: { fontWeight: 800, marginBottom: 2 },
    desc: { color: "#64748b", fontSize: 13, lineHeight: 1.6 },
    gridNarrow: { gridTemplateColumns: "1fr", textAlign: "center" },
    itemNarrow: { textAlign: "center" },
  },

  /* testimonials (marquee) */
  testi: {
    section: {
      width: "min(1180px, 92%)",
      margin: "0 auto 90px",
      "--testi-card-w": "clamp(260px, 30vw, 340px)",
      "--testi-card-h": "clamp(220px, 26vw, 260px)",
      "--testi-avatar-size": "clamp(80px, 16vw, 120px)",
      "--testi-avatar-overlap": "calc(var(--testi-avatar-size) * 0.45)",
      "--testi-avatar-offset": "calc(var(--testi-avatar-size) * 0.45 + 20px)",
    },
    title: {
      textAlign: "center",
      color: "#0B56B8",
      fontWeight: 900,
      textTransform: "uppercase",
      fontSize: "clamp(28px, 3.2vw, 44px)",
      marginBottom: 20,
    },
    skeletonGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: 20,
    },
    skeletonCard: {
      height: "var(--testi-card-h, 260px)",
      borderRadius: 16,
    },
    slide: { width: "var(--testi-card-w, 340px)" },
    cardShell: {
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
    cardBody: {
      padding: "12px 16px 14px",
      display: "grid",
      gridTemplateRows: "auto 1fr",
      gap: 6,
      flex: 1,
      overflow: "hidden",
    },
    avatarWrap: {
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
    avatarImg: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      display: "block",
    },
    name: {
      margin: "4px 0 0",
      textAlign: "center",
      fontSize: 15,
      fontWeight: 900,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      color: "#FFD24A",
    },
    quote: {
      marginTop: 6,
      color: "#E9EEF7",
      fontSize: 13.5,
      lineHeight: 1.55,
      textAlign: "center",
      whiteSpace: "pre-line",
    },
  },

  cta: {
    section: { padding: "20px 0 48px", marginTop: "150px" },
    wrap: {
      position: "relative",
      background:
        "linear-gradient(90deg, rgba(200,232,255,1) 0%, rgba(205,234,255,1) 45%, rgba(219,243,255,1) 100%)",
      borderRadius: 14,
      padding: "24px 28px",
      boxShadow: "0 10px 28px rgba(15,23,42,.08)",
      overflow: "hidden",
    },
    spine: {
      position: "absolute",
      left: 12,
      top: 12,
      bottom: 12,
      width: 10,
      background: "#0b56c9",
      borderRadius: 12,
      boxShadow: "inset 0 0 0 2px rgba(255,255,255,.35)",
    },
    inner: {
      display: "grid",
      gridTemplateColumns: "1fr auto",
      alignItems: "center",
      gap: 16,
      paddingLeft: 24,
    },
    title: {
      margin: 0,
      fontWeight: 900,
      fontSize: 28,
      letterSpacing: ".02em",
      color: "#0b56c9",
    },
    sub: { margin: "6px 0 0", fontWeight: 700, fontSize: 16, color: "#0b3a86" },
    btn: {
      background: "#0b56c9",
      color: "#fff",
      fontWeight: 800,
      padding: "14px 22px",
      borderRadius: 999,
      border: 0,
      boxShadow: "0 10px 24px rgba(11,86,201,.25)",
      textDecoration: "none",
      display: "inline-block",
      whiteSpace: "nowrap",
    },
  },
};

export default function VisaContent({ locale = "id" }) {
  const {
    content,
    isLoading,
    testimonials,
    isLoadingTesti,
    locale: lk,
  } = useVisaViewModel({ locale });

  const safeDescription = sanitizeHtml(content.description || "", {
    allowedTags: ["b", "strong", "i", "em", "u", "a", "br", "ul", "ol", "li"],
  });

  const [isNarrow, setIsNarrow] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
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

  const sectionInnerStyle = useMemo(
    () => ({
      ...styles.sectionInner,
      width: isNarrow ? "min(100%,96%)" : "min(1360px,96%)",
    }),
    [isNarrow]
  );

  const heroWrapperStyle = useMemo(
    () => ({
      ...styles.hero.wrapper,
      gridTemplateColumns: isNarrow ? "1fr" : "1fr 1fr",
      padding: isNarrow ? "28px 24px" : "44px 56px",
      minHeight: isNarrow ? 380 : 420,
      marginTop: isNarrow ? "-12px" : "-36px",
      width: isNarrow ? "100%" : "calc(100% - 100px)",
    }),
    [isNarrow]
  );

  const topBenefits = (content.benefits || []).slice(0, 3);

  /* localized static strings */
  const STR =
    lk === "en"
      ? {
          descTitle: "Program Description",
          barTitle: "VISA APPLY",
          benefitsHeadL: "EXCLUSIVE",
          benefitsHeadR: "BENEFITS",
          benefitsSub:
            "Exclusive chance to make your dream study abroad come true!",
          testiTitle: "OUR TESTIMONIALS",
          testiEmpty: "No testimonials yet for visa apply",
        }
      : {
          descTitle: "Deskripsi Program",
          barTitle: "VISA APPLY",
          benefitsHeadL: "MANFAAT",
          benefitsHeadR: "EKSKLUSIF",
          benefitsSub: "Kesempatan eksklusif untuk wujudkan studi impianmu!",
          testiTitle: "TESTIMONI KAMI",
          testiEmpty: "Belum ada testimoni untuk kategori visa apply",
        };

  return (
    <div style={{ paddingBottom: 48, fontFamily: FONT_FAMILY }}>
      {/* HERO */}
      <section style={{ padding: "0 0 24px" }}>
        <div style={sectionInnerStyle}>
          <div style={heroWrapperStyle}>
            <div style={styles.hero.left}>
              {isLoading ? (
                <Skeleton active paragraph={{ rows: 3 }} />
              ) : (
                <>
                  <h1
                    style={{
                      ...styles.hero.heading,
                      fontSize: isNarrow ? 38 : 54,
                    }}
                  >
                    {content.hero?.title}
                  </h1>
                  {content.hero?.subtitle && (
                    <p style={styles.hero.tagline}>{content.hero.subtitle}</p>
                  )}
                  {!!topBenefits.length && (
                    <div style={styles.hero.chips}>
                      {topBenefits.map((b) => (
                        <span key={b.id} style={styles.hero.chip}>
                          <span style={styles.hero.chipIcon} aria-hidden>
                            {isSvg(b.icon) ? (
                              <Img
                                src={b.icon}
                                alt=""
                                style={styles.hero.chipImg}
                              />
                            ) : (
                              b.icon
                            )}
                          </span>
                          {b.title}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            <div style={styles.hero.right}>
              {isLoading ? (
                <Skeleton.Image active style={{ width: "100%", height: 260 }} />
              ) : (
                <div
                  style={{
                    ...styles.hero.illu,
                    width: isNarrow ? "100%" : "min(500px,92%)",
                    height: isNarrow ? 220 : 320,
                  }}
                >
                  <Img
                    src={content.hero?.illustration}
                    alt="Visa Illustration"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* DESKRIPSI */}
      <section style={styles.desc.section}>
        <div style={sectionInnerStyle}>
          <div style={styles.desc.wrap}>
            <h2 style={{ ...styles.desc.title, fontSize: isNarrow ? 28 : 40 }}>
              {STR.descTitle}
            </h2>
            <div
              style={{
                ...styles.desc.box,
                padding: isNarrow ? "16px 18px" : "22px 24px",
              }}
            >
              {isLoading ? (
                <Skeleton active paragraph={{ rows: 4 }} />
              ) : (
                <div
                  style={{
                    fontSize: isNarrow ? 16 : 18,
                    lineHeight: isNarrow ? "28px" : "32px",
                    letterSpacing: isNarrow ? "0.04em" : "0.06em",
                    color: "#0f172a",
                  }}
                  dangerouslySetInnerHTML={{ __html: safeDescription }}
                />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* TITLE BAR */}
      <section style={styles.bar.section}>
        <div style={styles.bar.bleed}>{STR.barTitle}</div>
      </section>

      {/* POSTER */}
      <section>
        <div style={sectionInnerStyle}>
          <div style={styles.poster.container}>
            {isLoading ? (
              <Skeleton.Image
                active
                style={{ width: "100%", height: 420, borderRadius: 18 }}
              />
            ) : (
              <Img
                src={content.poster?.src}
                alt={content.poster?.alt}
                style={styles.poster.img}
              />
            )}
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section style={styles.benefits.section}>
        <div style={sectionInnerStyle}>
          <h3 style={styles.benefits.head}>
            {STR.benefitsHeadL}{" "}
            <span style={styles.benefits.headBlue}>{STR.benefitsHeadR}</span>
          </h3>
          <p style={styles.benefits.sub}>{STR.benefitsSub}</p>

          <div style={styles.benefits.trackWrap}>
            <div style={styles.benefits.trackLine} />
            <div
              style={{
                ...styles.benefits.grid,
                ...(isNarrow ? styles.benefits.gridNarrow : {}),
              }}
            >
              {topBenefits.map((b) => (
                <div
                  key={b.id}
                  style={{
                    ...styles.benefits.item,
                    ...(isNarrow ? styles.benefits.itemNarrow : {}),
                  }}
                >
                  <div style={styles.benefits.iconWrap}>
                    <Img
                      src={b.icon}
                      alt={b.title}
                      style={styles.benefits.iconImg}
                    />
                  </div>
                  <div>
                    <div style={styles.benefits.title}>{b.title}</div>
                    <div style={styles.benefits.desc}>{b.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section style={styles.testi.section}>
        <Title level={2} style={styles.testi.title}>
          {STR.testiTitle}
        </Title>

        {isLoadingTesti ? (
          <div style={styles.testi.skeletonGrid}>
            {[...Array(3)].map((_, i) => (
              <Skeleton.Input
                key={i}
                active
                block
                style={styles.testi.skeletonCard}
              />
            ))}
          </div>
        ) : testimonials.length === 0 ? (
          <Empty description={STR.testiEmpty} />
        ) : (
          <>
            <Swiper
              className={TESTI_SWIPER_CLASS}
              modules={[Autoplay, FreeMode]}
              loop
              speed={MARQUEE_SPEED}
              autoplay={marqueeAutoplay}
              slidesPerView="auto"
              spaceBetween={16}
              allowTouchMove={false}
              freeMode={marqueeFreeMode}
            >
              {testimonials.map((t, idx) => {
                const src = normalizeImgSrc(t.image);
                const external = isExternal(src);
                const description = sanitizeHtml(t.description || "");
                return (
                  <SwiperSlide
                    key={t.id || `${t.name}-${idx}`}
                    style={styles.testi.slide}
                  >
                    <article style={styles.testi.cardShell}>
                      <div style={styles.testi.avatarWrap}>
                        <Image
                          src={src}
                          alt={t.name || "Testimonial"}
                          fill
                          sizes="(max-width: 420px) 120px, 140px"
                          style={styles.testi.avatarImg}
                          unoptimized={external}
                        />
                      </div>
                      <div style={styles.testi.cardBody}>
                        <h3 style={styles.testi.name}>
                          {(t.name || "").toUpperCase()}
                        </h3>
                        <p
                          style={styles.testi.quote}
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

            <style
              dangerouslySetInnerHTML={{
                __html: `
                .${TESTI_SWIPER_CLASS} { overflow: visible; padding: 6px 4px; }
                .${TESTI_SWIPER_CLASS} .swiper-wrapper { align-items: stretch; }
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
                }
              `,
              }}
            />
          </>
        )}
      </section>

      {/* CTA */}
      <section style={styles.cta.section}>
        <div style={sectionInnerStyle}>
          <div style={styles.cta.wrap}>
            <div style={styles.cta.spine} />
            <div
              style={{
                ...styles.cta.inner,
                gridTemplateColumns: isNarrow ? "1fr" : "1fr auto",
              }}
            >
              <div>
                <h3
                  style={{ ...styles.cta.title, fontSize: isNarrow ? 22 : 28 }}
                >
                  {content.cta?.title}
                </h3>
                <p
                  style={{
                    ...styles.cta.sub,
                    fontSize: isNarrow ? 14 : 16,
                    fontWeight: isNarrow ? 600 : 700,
                  }}
                >
                  {content.cta?.subtitle}
                </p>
              </div>
              {content.cta?.button?.href && (
                <a
                  href={content.cta.button.href}
                  style={{
                    ...styles.cta.btn,
                    width: isNarrow ? "100%" : "auto",
                    textAlign: isNarrow ? "center" : "left",
                  }}
                >
                  {content.cta.button.label}
                </a>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
