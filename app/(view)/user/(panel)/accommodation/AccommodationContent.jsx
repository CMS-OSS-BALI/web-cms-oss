"use client";

import { useEffect, useMemo, useState } from "react";
import { Skeleton } from "antd";
import useAccommodationViewModel from "./useAccommodationViewModel";
import { sanitizeHtml } from "@/app/utils/dompurify";

const FONT_FAMILY = '"Public Sans", sans-serif';

/* ===== utilities ===== */
const isSvgSrc = (v) => typeof v === "string" && /\.svg(\?.*)?$/i.test(v);

/* ===== styles ===== */
const styles = {
  sectionInner: {
    width: "min(1360px, 96%)",
    margin: "0 auto",
    fontFamily: FONT_FAMILY,
  },

  /* ================= HERO (NO margin-top) ================= */
  hero: {
    section: { padding: "0 0 24px" },
    wrapper: {
      background: "#0b56c9",
      borderRadius: 28,
      borderTopRightRadius: 120,
      borderBottomLeftRadius: 120,
      minHeight: 380,
      padding: "38px 48px",
      marginTop: "-8px",
      display: "grid",
      gridTemplateColumns: "1.1fr .9fr",
      gap: 28,
      alignItems: "center",
      color: "#fff",
      boxShadow: "0 24px 54px rgba(3,30,88,.28)",
      width: "calc(100% - 100px)",
      overflow: "hidden",
      fontFamily: FONT_FAMILY,
    },
    left: { minWidth: 0, textAlign: "left" },
    right: { display: "flex", justifyContent: "center", alignItems: "center" },

    title: {
      margin: 0,
      fontSize: 54,
      lineHeight: 1.06,
      fontWeight: 900,
      letterSpacing: ".015em",
      color: "#fff",
      textTransform: "uppercase",
    },
    subtitle: {
      margin: "16px 0 18px",
      fontSize: 17,
      lineHeight: 1.7,
      color: "rgba(255,255,255,.92)",
      letterSpacing: ".02em",
      maxWidth: 640,
      textAlign: "left",
    },

    // Illustration frame is STRICT so nothing spills outside
    illFrame: {
      width: "min(500px, 92%)",
      height: 320,
      display: "grid",
      placeItems: "center",
      overflow: "hidden", // <- penting agar tidak meluber
      borderRadius: 12,
    },
    // For raster images
    illImg: {
      width: "100%",
      height: "100%",
      objectFit: "contain",
      display: "block",
      maxWidth: "100%",
      maxHeight: "100%",
    },

    /* responsive */
    wrapperNarrow: {
      gridTemplateColumns: "1fr",
      padding: "28px 24px",
      minHeight: 340,
      borderTopRightRadius: 80,
      borderBottomLeftRadius: 96,
      width: "100%",
      marginTop: "-6px",
    },
    titleNarrow: { fontSize: 38, lineHeight: 1.12 },
    illFrameNarrow: { width: "100%", height: 220, marginTop: 10 },
    illImgNarrow: { width: "100%", height: "100%" },
  },

  /* ================= DESCRIPTION (marginTop 75px) ================= */
  desc: {
    section: { marginTop: 75 },
    title: {
      margin: "0 0 12px",
      fontWeight: 800,
      fontSize: 44,
      lineHeight: 1.1,
      color: "#0f172a",
      letterSpacing: "0.01em",
      fontFamily: FONT_FAMILY,
    },
    text: {
      fontFamily: FONT_FAMILY,
      fontSize: 18,
      lineHeight: 1.9,
      letterSpacing: "0.04em",
      color: "#0f172a",
      margin: 0,
      textAlign: "justify",
    },
  },

  /* ================= SERVICES (marginTop 75px) ================= */
  services: {
    section: { marginTop: 75 },
    barBleed: {
      width: "100vw",
      height: 64,
      marginLeft: "calc(50% - 50vw)",
      marginRight: "calc(50% - 50vw)",
      background: "#0b56c9",
      color: "#fff",
      display: "grid",
      placeItems: "center",
      fontWeight: 900,
      letterSpacing: ".02em",
      textTransform: "uppercase",
      fontSize: "clamp(22px, 2.6vw, 38px)",
      boxShadow: "0 10px 22px rgba(11,86,201,.28)",
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "minmax(320px, 520px) 1fr",
      gap: 36,
      alignItems: "center",
      paddingTop: 28,
    },
    collage: { position: "relative", width: "100%", height: 420 },
    backImg: {
      position: "absolute",
      left: 0,
      bottom: 0,
      width: 280,
      height: 340,
      borderRadius: 26,
      overflow: "hidden",
      boxShadow: "0 18px 36px rgba(15,23,42,.18)",
    },
    frontFrame: {
      position: "absolute",
      left: 140,
      top: 0,
      width: 300,
      height: 400,
      borderRadius: 28,
      overflow: "hidden",
      background: "#fff",
      boxShadow: "0 22px 44px rgba(15,23,42,.22)",
      border: "10px solid #111827",
    },
    imgCover: { width: "100%", height: "100%", objectFit: "cover" },
    list: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 32 },
    item: {
      display: "grid",
      gridTemplateColumns: "44px 1fr",
      columnGap: 12,
      alignItems: "start",
    },
    icon: { fontSize: 28, lineHeight: 1, width: 44, textAlign: "center" },
    itemTitle: { margin: 0, fontWeight: 800, fontSize: 20, color: "#0f172a" },
    itemDesc: {
      margin: "6px 0 0",
      color: "#475569",
      lineHeight: 1.55,
      fontSize: 14,
    },
  },

  /* ================= WHY (marginTop 75px) ================= */
  why: {
    section: { marginTop: 75 },
    barBleed: {
      width: "100vw",
      height: 64,
      marginLeft: "calc(50% - 50vw)",
      marginRight: "calc(50% - 50vw)",
      background: "#0b56c9",
      color: "#fff",
      display: "grid",
      placeItems: "center",
      fontWeight: 900,
      letterSpacing: ".02em",
      textTransform: "uppercase",
      fontSize: "clamp(22px, 2.6vw, 38px)",
      boxShadow: "0 10px 22px rgba(11,86,201,.28)",
    },
    grid: {
      marginLeft: 150,
      marginTop: 75,
      display: "grid",
      gridTemplateColumns: "repeat(2,1fr)",
      gap: 40,
      padding: "36px 0",
    },
    item: {
      display: "grid",
      gridTemplateColumns: "60px 1fr",
      columnGap: 16,
      alignItems: "start",
    },
    iconWrap: {
      width: 60,
      height: 60,
      borderRadius: 16,
      display: "grid",
      placeItems: "center",
      background: "#fff",
      border: "2px solid #e5e7eb",
      boxShadow: "0 8px 18px rgba(15,23,42,.08)",
      fontSize: 30,
      color: "#0f172a",
    },
    title: {
      margin: "2px 0 6px",
      fontWeight: 800,
      fontSize: 20,
      color: "#0f172a",
    },
    sub: { margin: 0, color: "#334155", lineHeight: 1.55 },
    gridNarrow: { gridTemplateColumns: "1fr", gap: 24 },
    itemNarrow: { gridTemplateColumns: "56px 1fr" },
    iconNarrow: { width: 56, height: 56, fontSize: 28 },
  },

  /* ================= CTA (marginTop 75px) ================= */
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

/* simple <img> with fallback for raster use */
function Img({ src, alt, style }) {
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={
        src ||
        "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=1200&auto=format&fit=crop"
      }
      alt={alt || ""}
      style={style}
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

  /* responsive-derived styles */
  const sectionInner = useMemo(
    () => ({
      ...styles.sectionInner,
      width: isNarrow ? "min(100%,96%)" : "min(1360px,96%)",
    }),
    [isNarrow]
  );

  const heroWrap = useMemo(
    () => ({
      ...styles.hero.wrapper,
      ...(isNarrow ? styles.hero.wrapperNarrow : {}),
      gridTemplateColumns: isNarrow ? "1fr" : "1.1fr .9fr",
    }),
    [isNarrow]
  );

  const heroTitle = useMemo(
    () => ({
      ...styles.hero.title,
      ...(isNarrow ? styles.hero.titleNarrow : {}),
    }),
    [isNarrow]
  );

  const illFrameStyle = useMemo(
    () => ({
      ...styles.hero.illFrame,
      ...(isNarrow ? styles.hero.illFrameNarrow : {}),
    }),
    [isNarrow]
  );

  const illImgStyle = useMemo(
    () => ({
      ...styles.hero.illImg,
      ...(isNarrow ? styles.hero.illImgNarrow : {}),
    }),
    [isNarrow]
  );

  const servicesGrid = useMemo(
    () => ({
      ...styles.services.grid,
      gridTemplateColumns: isNarrow ? "1fr" : "minmax(320px, 520px) 1fr",
      gap: isNarrow ? 22 : 36,
    }),
    [isNarrow]
  );

  return (
    <div style={{ paddingBottom: 24, fontFamily: FONT_FAMILY }}>
      {/* HERO */}
      <section style={styles.hero.section}>
        <div style={sectionInner}>
          <div style={heroWrap}>
            <div style={styles.hero.left}>
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

            <div style={styles.hero.right}>
              {isLoading ? (
                <Skeleton.Image active style={{ width: 260, height: 200 }} />
              ) : content.hero?.illustration ? (
                isSvgSrc(content.hero.illustration) ? (
                  // SVG: render as background so it never spills or distorts
                  <div
                    aria-label="Accommodation Illustration"
                    style={{
                      ...illFrameStyle,
                      backgroundImage: `url(${content.hero.illustration})`,
                      backgroundRepeat: "no-repeat",
                      backgroundSize: "contain",
                      backgroundPosition: "right center",
                    }}
                  />
                ) : (
                  // Raster: keep using <img>
                  <div style={illFrameStyle}>
                    <Img
                      src={content.hero.illustration}
                      alt="Accommodation Illustration"
                      style={illImgStyle}
                    />
                  </div>
                )
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* DESCRIPTION */}
      <section style={styles.desc.section}>
        <div style={sectionInner}>
          <h2 style={{ ...styles.desc.title, fontSize: isNarrow ? 30 : 44 }}>
            {locale === "id" ? "Deskripsi Program" : "Program Description"}
          </h2>
          {isLoading ? (
            <Skeleton active paragraph={{ rows: 4 }} />
          ) : (
            <div
              style={{
                ...styles.desc.text,
                fontSize: isNarrow ? 16 : 18,
                lineHeight: isNarrow ? 1.8 : 1.9,
              }}
              dangerouslySetInnerHTML={{ __html: safeDesc }}
            />
          )}
        </div>
      </section>

      {/* SERVICES */}
      <section style={styles.services.section}>
        <div style={styles.services.barBleed}>
          {content?.services?.heading ||
            (locale === "id"
              ? "LAYANAN BOOKING AKOMODASI"
              : "ACCOMMODATION SERVICES")}
        </div>

        <div style={sectionInner}>
          <div style={servicesGrid}>
            {/* collage kiri */}
            <div
              style={{ position: "relative", minHeight: isNarrow ? 360 : 420 }}
            >
              <div
                style={{
                  ...styles.services.collage,
                  height: isNarrow ? 360 : 420,
                }}
              >
                <div style={styles.services.backImg}>
                  <Img
                    src={content.services?.imageBack}
                    alt="accommodation back"
                    style={styles.services.imgCover}
                  />
                </div>
                <div style={styles.services.frontFrame}>
                  <Img
                    src={content.services?.imageFront}
                    alt="accommodation front"
                    style={styles.services.imgCover}
                  />
                </div>
              </div>
            </div>

            {/* list kanan */}
            <div
              style={{
                ...styles.services.list,
                gridTemplateColumns: isNarrow ? "1fr" : "repeat(2,1fr)",
              }}
            >
              {(content.services?.items || []).map((it) => (
                <div key={it.id} style={styles.services.item}>
                  <div style={styles.services.icon}>{it.icon || "â€¢"}</div>
                  <div>
                    <h4 style={styles.services.itemTitle}>{it.title}</h4>
                    <p style={styles.services.itemDesc}>{it.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* WHY */}
      <section style={styles.why.section}>
        <div style={styles.why.barBleed}>
          {content?.why?.heading ||
            (locale === "id"
              ? "MENGAPA PILIH AKOMODASI DI OSS BALI?"
              : "WHY CHOOSE ACCOMMODATION WITH OSS BALI?")}
        </div>

        <div style={sectionInner}>
          <div
            style={{
              ...styles.why.grid,
              ...(isNarrow ? styles.why.gridNarrow : {}),
            }}
          >
            {(content.why?.reasons || []).map((w, idx) => (
              <div
                key={w.id || idx}
                style={{
                  ...styles.why.item,
                  ...(isNarrow ? styles.why.itemNarrow : {}),
                }}
              >
                <div
                  style={{
                    ...styles.why.iconWrap,
                    ...(isNarrow ? styles.why.iconNarrow : {}),
                  }}
                >
                  {w.icon || "â€¢"}
                </div>
                <div>
                  <h4 style={styles.why.title}>{w.title}</h4>
                  <p style={styles.why.sub}>{w.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={styles.cta.section}>
        <div style={sectionInner}>
          <div style={styles.cta.wrap}>
            <div style={styles.cta.shadowCard} />
            <div
              style={{
                ...styles.cta.inner,
                gridTemplateColumns: isNarrow ? "1fr" : "1fr auto",
              }}
            >
              <div>
                <h3 style={styles.cta.title}>{content.cta?.title}</h3>
                <p style={styles.cta.sub}>{content.cta?.subtitle}</p>
              </div>
              {content.cta?.button?.href && (
                <a
                  href={content.cta.button.href}
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
    </div>
  );
}

