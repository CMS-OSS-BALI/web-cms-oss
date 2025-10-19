"use client";

import { useEffect, useMemo, useState } from "react";
import { Skeleton } from "antd";
import useVisaViewModel from "./useVisaViewModel";
import { sanitizeHtml } from "@/app/utils/dompurify";

const FONT_FAMILY = '"Poppins", sans-serif';
const SECTION_MT = 75; // margin top global (tidak untuk hero)

/* simple <img> helper */
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

const styles = {
  sectionInner: {
    width: "min(1360px, 96%)",
    margin: "0 auto",
    fontFamily: FONT_FAMILY,
  },

  /* ---------- HERO ---------- */
  hero: {
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
      fontFamily: FONT_FAMILY,
    },
    left: { minWidth: 0, textAlign: "left" },
    right: { display: "flex", justifyContent: "center" },
    heading: {
      margin: 0,
      fontSize: 54,
      lineHeight: 1.06,
      fontWeight: 800,
      letterSpacing: 0.2,
      color: "#fff",
      textTransform: "uppercase",
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
      fontWeight: 700,
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

  /* ---------- DESCRIPTION ---------- */
  desc: {
    section: { padding: "0 0 16px" },
    wrap: { marginTop: 64 },
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

  /* ---------- BAR/POSTER/BENEFITS ---------- */
  bar: {
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
  },

  /* ---------- CTA ---------- */
  cta: {
    section: { padding: "8px 0 60px" },
    shell: { position: "relative", padding: "22px 22px 0" },
    backPlate: {
      position: "absolute",
      left: 0,
      top: 36,
      bottom: 24,
      width: 28,
      background: "#0a4cab",
      borderRadius: 16,
      boxShadow: "0 12px 28px rgba(10,76,171,.35)",
    },
    card: {
      position: "relative",
      background:
        "linear-gradient(180deg,#d6efff 0%, #c6e8ff 60%, #cdeeff 100%)",
      borderRadius: 18,
      boxShadow: "0 12px 26px rgba(15,23,42,.08)",
      padding: "28px 32px",
    },
    inner: {
      display: "grid",
      gridTemplateColumns: "1fr auto",
      gap: 24,
      alignItems: "center",
    },
    title: {
      margin: "0 0 16px",
      fontWeight: 900,
      fontSize: "clamp(26px, 3.1vw, 48px)",
      lineHeight: 1.16,
      color: "#0b3e91",
      letterSpacing: ".02em",
      textTransform: "uppercase",
      textAlign: "center",
    },
    desc: {
      margin: "0 auto",
      textAlign: "center",
      maxWidth: 920,
      color: "#0b1e3a",
      fontWeight: 600,
      fontSize: "clamp(14px, 1.15vw, 20px)",
      lineHeight: 1.6,
    },
    btnWrap: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    btn: {
      display: "inline-block",
      background: "#0b56c9",
      color: "#fff",
      fontWeight: 900,
      textTransform: "uppercase",
      letterSpacing: ".02em",
      padding: "18px 26px",
      borderRadius: 18,
      textDecoration: "none",
      boxShadow:
        "0 10px 24px rgba(11,86,201,.30), inset 0 0 0 2px rgba(255,255,255,.25)",
      whiteSpace: "nowrap",
    },
  },
};

export default function VisaContent({ locale = "id" }) {
  const { content, isLoading, locale: lk } = useVisaViewModel({ locale });

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
      gridTemplateColumns: isNarrow ? "1fr" : "1.1fr .9fr",
      padding: isNarrow ? "28px 24px" : "38px 48px",
      minHeight: isNarrow ? 340 : 380,
      marginTop: isNarrow ? "-6px" : "-8px",
      width: isNarrow ? "100%" : "calc(100% - 100px)",
    }),
    [isNarrow]
  );

  const topBenefits = (content.benefits || []).slice(0, 3);
  const safeDescription = sanitizeHtml(content.description || "", {
    allowedTags: ["b", "strong", "i", "em", "u", "a", "br", "ul", "ol", "li"],
  });

  return (
    <div style={{ paddingBottom: 48, fontFamily: FONT_FAMILY }}>
      {/* ===== HERO (tanpa marginTop tambahan) ===== */}
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
                            {b.icon?.endsWith(".svg") ? (
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

      {/* ===== DESCRIPTION ===== */}
      <section style={{ ...styles.desc.section, marginTop: SECTION_MT }}>
        <div style={sectionInnerStyle}>
          <div style={styles.desc.wrap}>
            <h2 style={{ ...styles.desc.title, fontSize: isNarrow ? 30 : 44 }}>
              {lk === "en" ? "Program Description" : "Deskripsi Program"}
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
                dangerouslySetInnerHTML={{ __html: safeDescription }}
              />
            )}
          </div>
        </div>
      </section>

      {/* ===== TITLE BAR ===== */}
      <section style={{ marginTop: SECTION_MT }}>
        <div style={{ ...styles.bar.bleed }}>VISA APPLY</div>
      </section>

      {/* ===== POSTER ===== */}
      <section style={{ marginTop: SECTION_MT }}>
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

      {/* ===== BENEFITS ===== */}
      <section style={{ marginTop: SECTION_MT, padding: "8px 0 40px" }}>
        <div style={sectionInnerStyle}>
          <h3 style={styles.benefits.head}>
            {lk === "en" ? "EXCLUSIVE" : "MANFAAT"}{" "}
            <span style={styles.benefits.headBlue}>
              {lk === "en" ? "BENEFITS" : "EKSKLUSIF"}
            </span>
          </h3>
          <p style={styles.benefits.sub}>
            {lk === "en"
              ? "Exclusive chance to make your dream study abroad come true!"
              : "Kesempatan eksklusif untuk wujudkan studi impianmu!"}
          </p>

          <div style={styles.benefits.trackWrap}>
            <div style={styles.benefits.trackLine} />
            <div
              style={{
                ...styles.benefits.grid,
                gridTemplateColumns: isNarrow ? "1fr" : "repeat(3,1fr)",
                textAlign: isNarrow ? "center" : "left",
              }}
            >
              {(content.benefits || []).slice(0, 3).map((b) => (
                <div key={b.id}>
                  <div style={styles.benefits.iconWrap}>
                    <Img
                      src={b.icon}
                      alt={b.title}
                      style={styles.benefits.iconImg}
                    />
                  </div>
                  <div style={styles.benefits.title}>{b.title}</div>
                  <div style={styles.benefits.desc}>{b.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section style={{ ...styles.cta.section, marginTop: SECTION_MT }}>
        <div style={sectionInnerStyle}>
          <div style={styles.cta.shell}>
            <div style={styles.cta.backPlate} aria-hidden />
            <div style={styles.cta.card}>
              <div
                style={{
                  ...styles.cta.inner,
                  gridTemplateColumns: isNarrow ? "1fr" : "1fr auto",
                }}
              >
                <div>
                  <h2 style={styles.cta.title}>{content.cta?.title}</h2>
                  <p style={styles.cta.desc}>{content.cta?.subtitle}</p>
                </div>

                {content.cta?.button?.href && (
                  <div style={styles.cta.btnWrap}>
                    <a href={content.cta.button.href} style={styles.cta.btn}>
                      {content.cta.button.label}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
