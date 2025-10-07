"use client";

import { useEffect, useMemo, useState } from "react";
import { Skeleton } from "antd";
import useAccommodationViewModel from "./useAccommodationViewModel";
import { sanitizeHtml } from "@/app/utils/dompurify";

const FONT_FAMILY = '"Poppins", sans-serif';

const styles = {
  sectionInner: {
    width: "min(1360px, 96%)",
    margin: "0 auto",
    fontFamily: FONT_FAMILY,
  },

  /* ================= HERO ================= */
  hero: {
    section: { padding: "0 0 24px" },
    wrapper: {
      background: "#0b56c9",
      backgroundImage:
        "linear-gradient(180deg,#0b56c9 0%, #0a50bb 55%, #0a469f 100%)",
      borderRadius: 56,
      minHeight: 420,
      padding: "44px 56px",
      marginTop: "-36px",
      display: "grid",
      gridTemplateColumns: "1.1fr .9fr",
      gap: 28,
      alignItems: "center",
      color: "#fff",
      boxShadow: "0 24px 54px rgba(3, 30, 88, 0.28)",
      width: "calc(100% - 100px)",
    },
    left: { minWidth: 0 },
    right: {
      display: "flex",
      justifyContent: "flex-end",
      alignItems: "center",
      overflow: "visible",
      pointerEvents: "none",
    },

    title: {
      margin: 0,
      fontSize: 54,
      lineHeight: 1.06,
      fontWeight: 900,
      letterSpacing: 0.2,
      color: "#fff",
      textTransform: "uppercase",
    },
    subtitle: {
      margin: "16px 0 18px",
      fontSize: 17,
      lineHeight: 1.7,
      color: "rgba(255,255,255,.92)",
      maxWidth: 560,
    },

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
      color: "#0a4ea7",
      fontSize: 12,
      fontWeight: 900,
    },

    illFrame: {
      position: "relative",
      width: "min(520px, 92%)",
      height: 300,
      marginBottom: "100px",
      marginLeft: "-100px",
    },
    illImg: {
      position: "absolute",
      inset: 0,
      width: "112%",
      height: "112%",
      objectFit: "contain",
      objectPosition: "right center",
      transform: "translate(8%, 0)",
      marginBottom: "100px",
      marginLeft: "-100px",
    },
  },

  /* ================= DESCRIPTION ================= */
  desc: {
    wrap: { marginTop: 75 },
    title: {
      margin: "0 0 14px",
      fontWeight: 800,
      fontSize: 40,
      lineHeight: 1.1,
      color: "#0f172a",
      letterSpacing: "0.01em",
    },
    text: {
      background: "#fff",
      border: "2px solid #e5e7eb",
      borderRadius: 14,
      padding: "22px 24px",
      boxShadow: "0 6px 20px rgba(15,23,42,0.04)",
      fontSize: 18,
      lineHeight: "32px",
      letterSpacing: "0.06em",
      color: "#0f172a",
      margin: 0,
    },
  },

  /* ====== REUSABLE TITLE (ngikut product Doc Translate) ====== */
  headTitle: {
    wrap: { position: "relative", margin: "32px 0 18px", overflow: "visible" },
    decoBase: {
      position: "absolute",
      top: "50%",
      transform: "translateY(-50%)",
      height: 56,
      borderRadius: 18,
      background:
        "linear-gradient(90deg, rgba(65,154,239,0.35) 0%, rgba(83,235,213,0.42) 100%)",
      boxShadow: "0 10px 26px rgba(9,88,205,.22)",
      filter: "blur(1px)",
      zIndex: 0,
    },
    decoLeft: { left: "calc(50% - 50vw)", width: "20vw" },
    decoRight: { right: "calc(50% - 50vw)", width: "20vw" },
    title: {
      margin: 0,
      textAlign: "center",
      fontWeight: 900,
      fontSize: 28,
      letterSpacing: ".02em",
      color: "#0d3e8e",
      textTransform: "uppercase",
      position: "relative",
      zIndex: 1,
    },
    titleNarrow: { fontSize: 22 },
  },

  /* ================= SERVICES (UPDATED) ================= */
  services: {
    section: { padding: "75px 0 75px" },

    grid: {
      display: "grid",
      gridTemplateColumns: "520px 1fr",
      gap: 36,
      alignItems: "center",
      marginTop: "75px",
    },

    // collage: BOTH images same size
    collage: { position: "relative", width: "100%", height: 420 },
    backBox: {
      position: "absolute",
      left: 0,
      bottom: 0,
      width: 340,
      height: 340,
      borderRadius: 28,
      overflow: "hidden",
      background: "#f3f4f6",
      border: "0px solid transparent",
      boxShadow: "0 24px 44px rgba(15,23,42,.16)",
    },
    frontBox: {
      position: "absolute",
      left: 120,
      top: 40,
      width: 340,
      height: 340,
      borderRadius: 32,
      overflow: "hidden",
      background: "#fff",
      border: "10px solid #0f172a",
      boxShadow: "0 28px 52px rgba(15,23,42,.22)",
    },
    imgCover: { width: "100%", height: "100%", objectFit: "cover" },

    // list
    list: {
      display: "grid",
      gridTemplateColumns: "repeat(2, 1fr)",
      gap: 28,
    },
    item: { display: "grid", gridTemplateColumns: "44px 1fr", gap: 12 },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: 12,
      display: "grid",
      placeItems: "center",
      border: "2px solid #e5e7eb",
      background: "#fff",
      boxShadow: "0 8px 18px rgba(15,23,42,.08)",
      fontSize: 22,
    },
    itemTitle: {
      margin: "2px 0 4px",
      fontWeight: 800,
      fontSize: 18,
      color: "#0f172a",
    },
    itemDesc: { margin: 0, color: "#4b5563", lineHeight: 1.6 },
  },

  /* ================= WHY (updated to match design) ================= */
  why: {
    section: { padding: "0 0 28px" },

    // full-bleed bar + centered pill title
    headBar: {
      background: "linear-gradient(90deg, #0a4ea7, #0b56c9)",
      height: 74,
      display: "grid",
      placeItems: "center",
      borderRadius: 0,
      boxShadow: "0 10px 22px rgba(11,86,201,.28)",
      width: "100vw",
      marginLeft: "calc(50% - 50vw)",
      marginRight: "calc(50% - 50vw)",
      marginBottom: 22,
    },
    pillTitle: {
      padding: "12px 28px",
      borderRadius: 14,
      background:
        "linear-gradient(90deg, rgba(77,166,255,1) 0%, rgba(186,245,238,1) 100%)",
      color: "#ffffff",
      fontWeight: 900,
      fontSize: 28,
      letterSpacing: ".02em",
      textTransform: "uppercase",
      boxShadow:
        "0 14px 28px rgba(15,23,42,.20), inset 0 0 0 2px rgba(255,255,255,.35)",
    },

    // list of reasons (2 columns)
    list: {
      display: "grid",
      gridTemplateColumns: "repeat(2, 1fr)",
      gap: 36,
      marginTop: 75,
    },
    item: {
      display: "grid",
      gridTemplateColumns: "64px 1fr",
      columnGap: 16,
      alignItems: "start",
    },
    iconWrap: {
      width: 64,
      height: 64,
      borderRadius: 16,
      display: "grid",
      placeItems: "center",
      background: "#fff",
      border: "2px solid #e5e7eb",
      boxShadow: "0 8px 18px rgba(15,23,42,.08)",
      fontSize: 38, // jika pakai emoji/icon font
      color: "#0f172a",
    },
    title: {
      margin: "2px 0 6px",
      fontWeight: 800,
      fontSize: 20,
      color: "#0f172a",
    },
    sub: { margin: 0, color: "#334155", lineHeight: 1.55 },

    /* responsive tweaks */
    pillTitleNarrow: { fontSize: 20, padding: "10px 18px" },
    listNarrow: { gridTemplateColumns: "1fr", gap: 22 },
    itemNarrow: { gridTemplateColumns: "56px 1fr" },
    iconNarrow: { width: 56, height: 56, fontSize: 30, borderRadius: 14 },
  },

  /* ================= CTA ================= */
  cta: {
    section: { padding: "75px 0 90px" },
    big: {
      margin: "14px 0 24px",
      fontWeight: 900,
      fontSize: 64,
      letterSpacing: ".02em",
      color: "#0b56c9",
      textAlign: "center",
    },
    btnWrap: { display: "grid", placeItems: "center" },
    btn: {
      background:
        "linear-gradient(135deg, rgba(86,169,255,1) 0%, rgba(58,228,206,1) 100%)",
      color: "#fff",
      fontWeight: 800,
      padding: "14px 28px",
      borderRadius: 999,
      border: 0,
      boxShadow:
        "0 6px 16px rgba(24,72,192,.25), 0 16px 40px rgba(82,208,255,.28)",
      textDecoration: "none",
      display: "inline-block",
      minWidth: 180,
      textAlign: "center",
      letterSpacing: ".02em",
      marginTop: "35px",
    },
  },
};

/* -------- helper image -------- */
function Img({ src, alt, style }) {
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
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
    allowedTags: ["b", "strong", "i", "em", "u", "a", "br", "ul", "ol", "li"],
  });

  /* -------- responsive flag -------- */
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

  /* -------- derived responsive -------- */
  const sectionInner = useMemo(
    () => ({
      ...styles.sectionInner,
      width: isNarrow ? "min(100%, 96%)" : "min(1360px, 96%)",
    }),
    [isNarrow]
  );

  const heroWrap = useMemo(
    () => ({
      ...styles.hero.wrapper,
      gridTemplateColumns: isNarrow ? "1fr" : "1.1fr .9fr",
      padding: isNarrow ? "28px 24px" : "44px 56px",
      minHeight: isNarrow ? 360 : 420,
      marginTop: isNarrow ? "-12px" : "-36px",
      width: isNarrow ? "100%" : "calc(100% - 100px)",
    }),
    [isNarrow]
  );

  const heroTitle = useMemo(
    () => ({ ...styles.hero.title, fontSize: isNarrow ? 36 : 54 }),
    [isNarrow]
  );

  const resolveMarker = useMemo(() => {
    return (value, fallback) => {
      if (value === null || value === undefined) return fallback;
      if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed.length ? trimmed : fallback;
      }
      return value;
    };
  }, []);

  const illFrameStyle = useMemo(
    () => ({
      ...styles.hero.illFrame,
      width: isNarrow ? "88%" : "min(520px, 92%)",
      height: isNarrow ? 240 : 300,
    }),
    [isNarrow]
  );

  const illImgStyle = useMemo(
    () => ({
      ...styles.hero.illImg,
      width: isNarrow ? "106%" : "112%",
      height: isNarrow ? "106%" : "112%",
      transform: isNarrow ? "translate(4%, 0)" : "translate(8%, 0)",
      objectPosition: "right center",
    }),
    [isNarrow]
  );

  const servicesGrid = useMemo(
    () => ({
      ...styles.services.grid,
      gridTemplateColumns: isNarrow ? "1fr" : "520px 1fr",
      gap: isNarrow ? 22 : 36,
    }),
    [isNarrow]
  );

  // Responsive overrides for equal-size collage
  const collageStyle = useMemo(
    () => ({ ...styles.services.collage, height: isNarrow ? 320 : 420 }),
    [isNarrow]
  );
  const backBoxStyle = useMemo(
    () => ({
      ...styles.services.backBox,
      width: isNarrow ? 280 : 340,
      height: isNarrow ? 280 : 340,
    }),
    [isNarrow]
  );
  const frontBoxStyle = useMemo(
    () => ({
      ...styles.services.frontBox,
      left: isNarrow ? 90 : 120,
      top: isNarrow ? 20 : 40,
      width: isNarrow ? 280 : 340,
      height: isNarrow ? 280 : 340,
      borderWidth: isNarrow ? 8 : 10,
    }),
    [isNarrow]
  );

  return (
    <div style={{ paddingBottom: 24, fontFamily: FONT_FAMILY }}>
      {/* ============ HERO ============ */}
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
                  {!!(content.hero?.bullets || []).length && (
                    <div style={styles.hero.chips}>
                      {content.hero.bullets.map((b, idx) => {
                        const marker = resolveMarker(
                          b?.icon,
                          String(idx + 1).padStart(2, "0")
                        );
                        return (
                          <span key={b.id || b.label} style={styles.hero.chip}>
                            <span aria-hidden style={styles.hero.chipIcon}>
                              {marker}
                            </span>
                            {b.label}
                          </span>
                        );
                      })
                    </div>
                  )}
                </>
              )}
            </div>

            <div style={styles.hero.right}>
              {isLoading ? (
                <Skeleton.Image active style={{ width: 260, height: 200 }} />
              ) : content.hero?.illustration ? (
                <div style={illFrameStyle}>
                  <Img
                    src={content.hero.illustration}
                    alt="Accommodation Illustration"
                    style={illImgStyle}
                  />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* ============ DESCRIPTION ============ */}
      <section>
        <div style={sectionInner}>
          <div style={styles.desc.wrap}>
            <h2 style={{ ...styles.desc.title, fontSize: isNarrow ? 28 : 40 }}>
              {locale === "id" ? "Deskripsi Program" : "Program Description"}
            </h2>
            <div
              style={{
                ...styles.desc.text,
                fontSize: isNarrow ? 16 : 18,
                lineHeight: isNarrow ? "28px" : "32px",
              }}
              dangerouslySetInnerHTML={{ __html: safeDesc }}
            />
          </div>
        </div>
      </section>

      {/* ============ SERVICES (title mengikuti product Doc Translate) ============ */}
      <section style={styles.services.section}>
        <div style={sectionInner}>
          {/* Title with gradient side bars */}
          <div style={styles.headTitle.wrap}>
            <div
              style={{
                ...styles.headTitle.decoBase,
                ...styles.headTitle.decoLeft,
              }}
            />
            <div
              style={{
                ...styles.headTitle.decoBase,
                ...styles.headTitle.decoRight,
              }}
            />
            <h3
              style={{
                ...styles.headTitle.title,
                ...(isNarrow ? styles.headTitle.titleNarrow : {}),
              }}
            >
              {content.services?.heading}
            </h3>
          </div>

          <div style={servicesGrid}>
            {/* equal-size collage left */}
            <div
              style={{ position: "relative", minHeight: isNarrow ? 320 : 420 }}
            >
              <div style={collageStyle}>
                <div style={backBoxStyle}>
                  <Img
                    src={content.services?.imageBack}
                    alt="Back collage"
                    style={styles.services.imgCover}
                  />
                </div>
                <div style={frontBoxStyle}>
                  <Img
                    src={content.services?.imageFront}
                    alt="Front collage"
                    style={styles.services.imgCover}
                  />
                </div>
              </div>
            </div>

            {/* list right */}
            <div style={styles.services.list}>
              {(content.services?.items || []).map((it, idx) => {
                const iconMarker = resolveMarker(it?.icon, `S${idx + 1}`);
                return (
                  <div key={it.id} style={styles.services.item}>
                    <div style={styles.services.iconWrap}>{iconMarker}</div>
                    <div>
                      <h4 style={styles.services.itemTitle}>{it.title}</h4>
                      <p style={styles.services.itemDesc}>{it.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ============ WHY (updated) ============ */}
      <section>
        <div style={sectionInner}>
          <div style={styles.why.headBar}>
            <div
              style={{
                ...styles.why.pillTitle,
                ...(isNarrow ? styles.why.pillTitleNarrow : {}),
              }}
            >
              {content.why?.heading}
            </div>
          </div>

          <div
            style={{
              ...styles.why.list,
              ...(isNarrow ? styles.why.listNarrow : {}),
            }}
          >
            {(content.why?.reasons || []).map((w, idx) => {
              const iconMarker = resolveMarker(w?.icon, `W${idx + 1}`);
              return (
                <div
                  key={w.id}
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
                    {iconMarker}
                  </div>
                  <div>
                    <h5 style={styles.why.title}>{w.title}</h5>
                    <p style={styles.why.sub}>{w.sub}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section style={styles.cta.section}>
        <div style={sectionInner}>
          <h2 style={{ ...styles.cta.big, fontSize: isNarrow ? 40 : 64 }}>
            {content.cta?.big}
          </h2>
          <div style={styles.cta.btnWrap}>
            {content.cta?.button?.href && (
              <a href={content.cta.button.href} style={styles.cta.btn}>
                {content.cta.button.label}
              </a>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
