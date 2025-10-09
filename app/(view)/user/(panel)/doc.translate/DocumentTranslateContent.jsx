"use client";

import { useEffect, useMemo, useState } from "react";
import { Skeleton } from "antd";
import { sanitizeHtml } from "@/app/utils/dompurify";

const FONT_FAMILY = '"Poppins", sans-serif';

const styles = {
  sectionInner: {
    width: "min(1360px, 96%)",
    margin: "0 auto",
    fontFamily: FONT_FAMILY,
  },
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
      gridTemplateColumns: "1fr 1fr",
      gap: 28,
      alignItems: "center",
      color: "#fff",
      boxShadow: "0 24px 54px rgba(3, 30, 88, 0.28)",
      width: "calc(100% - 100px)",
      fontFamily: FONT_FAMILY,
    },
    left: {
      minWidth: 0,
      textAlign: "left",
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
    },
    right: { display: "flex", justifyContent: "center" },
    heading: {
      margin: 0,
      fontSize: 54,
      lineHeight: 1.06,
      fontWeight: 800,
      letterSpacing: 0.2,
      color: "#fff",
    },
    tagline: {
      margin: "16px 0 18px",
      fontSize: 17,
      lineHeight: 1.7,
      color: "rgba(255,255,255,.92)",
      textAlign: "left",
      maxWidth: 640,
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
    },
    illustration: { width: "min(500px, 92%)", height: 320 },
  },
  desc: {
    section: { padding: "50px 0 20px" },
    wrap: { marginTop: 48 },
    title: {
      margin: "0 0 14px",
      fontFamily: FONT_FAMILY,
      fontWeight: 800,
      fontSize: 40,
      lineHeight: 1.1,
      color: "#0f172a",
      letterSpacing: "0.01em",
    },
    box: {
      background: "#fff",
      border: "2px solid #e5e7eb",
      borderRadius: 14,
      padding: "22px 24px",
      boxShadow: "0 6px 20px rgba(15,23,42,0.04)",
    },
    text: {
      fontFamily: FONT_FAMILY,
      fontSize: 18,
      lineHeight: "32px",
      letterSpacing: "0.02em",
      color: "#0f172a",
      margin: 0,
    },
  },
  products: {
    section: { padding: "50px 0 40px" },
    headWrap: {
      position: "relative",
      margin: "32px 0 18px",
      overflow: "visible",
    },
    deco: {
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
      fontFamily: FONT_FAMILY,
      fontWeight: 900,
      fontSize: 28,
      letterSpacing: ".02em",
      color: "#0d3e8e",
      textTransform: "uppercase",
      position: "relative",
      zIndex: 1,
    },
    grid: {
      marginTop: 14,
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: 24,
      position: "relative",
      zIndex: 1,
    },
    card: {
      background: "linear-gradient(180deg,#0b56c9 0%, #0a4aa9 100%)",
      borderRadius: 16,
      padding: "22px 18px",
      boxShadow:
        "0 14px 30px rgba(8,40,98,.22), 0 0 0 1px rgba(255,255,255,.08) inset",
      display: "grid",
      justifyItems: "center",
      textDecoration: "none",
      transition: "transform .12s ease, box-shadow .2s ease",
      marginTop: "50px",
    },
    cardHover: {
      transform: "translateY(-2px)",
      boxShadow:
        "0 18px 36px rgba(8,40,98,.28), 0 0 0 1px rgba(255,255,255,.12) inset",
    },
    iconWrap: {
      width: 88,
      height: 88,
      borderRadius: 999,
      background: "#fff",
      display: "grid",
      placeItems: "center",
      boxShadow: "0 8px 20px rgba(15,23,42,.14)",
      marginBottom: 14,
    },
    label: {
      color: "#fff",
      fontWeight: 800,
      letterSpacing: ".02em",
      textAlign: "center",
      fontSize: 16,
    },
    gridNarrow: { gridTemplateColumns: "1fr", gap: 14 },
    titleNarrow: { fontSize: 22 },
  },
  why: {
    section: { padding: "50px 0 28px" },
    title: {
      textAlign: "center",
      color: "#0d3e8e",
      fontWeight: 900,
      fontSize: 30,
      letterSpacing: ".02em",
      margin: "16px 0 14px",
      textTransform: "uppercase",
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: 28,
      marginTop: "50px",
    },
    outerCard: {
      background: "#fff",
      borderRadius: 22,
      border: "2px solid #e5e7eb",
      boxShadow: "0 10px 26px rgba(15,23,42,.08)",
      padding: 10,
    },
    innerTile: {
      background:
        "radial-gradient(120% 120% at 0% 0%, #0a63c4 0%, #0a4aa9 50%, #0a3f96 100%)",
      borderRadius: 18,
      minHeight: 320,
      color: "#fff",
      display: "grid",
      gridTemplateRows: "1fr auto auto",
      alignItems: "center",
      justifyItems: "center",
      padding: "26px 18px 22px",
      position: "relative",
      overflow: "hidden",
    },
    lightningImg: { width: 200, height: 200, objectFit: "contain" },
    cardTitle: {
      fontWeight: 800,
      fontSize: 22,
      textAlign: "center",
      marginTop: 6,
    },
    cardDesc: {
      marginTop: 6,
      fontSize: 13.5,
      lineHeight: 1.55,
      opacity: 0.92,
      textAlign: "center",
      maxWidth: 300,
    },
    gridNarrow: { gridTemplateColumns: "1fr", gap: 16 },
    titleNarrow: { fontSize: 24 },
  },
  cta: {
    section: { padding: "50px 0 64px" },
    title: {
      textAlign: "center",
      color: "#0d3e8e",
      fontWeight: 900,
      fontSize: 30,
      letterSpacing: ".02em",
      textTransform: "uppercase",
      marginBottom: 18,
    },
    btn: {
      display: "inline-block",
      padding: "14px 36px",
      borderRadius: 16,
      background:
        "linear-gradient(90deg, rgba(90,173,255,1) 0%, rgba(135,239,220,1) 100%)",
      color: "#0b2e6b",
      fontWeight: 900,
      letterSpacing: ".02em",
      boxShadow:
        "0 14px 34px rgba(12,74,110,.25), inset 0 -2px 0 rgba(255,255,255,.35)",
      textDecoration: "none",
      marginTop: "50px",
    },
    btnWrap: { display: "grid", placeItems: "center" },
  },
};

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

export default function DocumentTranslateContent({
  locale = "id",
  content,
  isLoading,
}) {
  const hero = content?.hero || {};
  const bullets = Array.isArray(hero?.bullets) ? hero.bullets : [];

  const safeDescription = sanitizeHtml(content?.description || "", {
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

  const sectionInnerStyle = useMemo(
    () => ({
      ...styles.sectionInner,
      width: isNarrow ? "min(100%, 96%)" : "min(1360px, 96%)",
    }),
    [isNarrow]
  );
  const heroWrapperStyle = useMemo(
    () => ({
      ...styles.hero.wrapper,
      gridTemplateColumns: isNarrow ? "1fr" : "1fr 1fr",
      padding: isNarrow ? "28px 24px" : "44px 56px",
      minHeight: isNarrow ? 360 : 420,
      marginTop: isNarrow ? "-12px" : "-36px",
      width: isNarrow ? "100%" : "calc(100% - 100px)",
    }),
    [isNarrow]
  );
  const heroHeadingStyle = useMemo(
    () => ({ ...styles.hero.heading, fontSize: isNarrow ? 36 : 54 }),
    [isNarrow]
  );
  const heroIllustrationStyle = useMemo(
    () => ({
      ...styles.hero.illustration,
      width: isNarrow ? "100%" : "min(500px, 92%)",
      height: isNarrow ? 220 : 320,
    }),
    [isNarrow]
  );
  const descTitleStyle = useMemo(
    () => ({ ...styles.desc.title, fontSize: isNarrow ? 28 : 40 }),
    [isNarrow]
  );
  const descTextStyle = useMemo(
    () => ({
      ...styles.desc.text,
      fontSize: isNarrow ? 16 : 18,
      lineHeight: isNarrow ? "28px" : "32px",
    }),
    [isNarrow]
  );

  return (
    <div style={{ paddingBottom: 48, fontFamily: FONT_FAMILY }}>
      {/* ===== HERO ===== */}
      <section style={styles.hero.section}>
        <div style={sectionInnerStyle}>
          <div style={heroWrapperStyle}>
            <div style={styles.hero.left}>
              {isLoading ? (
                <Skeleton active paragraph={{ rows: 3 }} />
              ) : (
                <>
                  <h1 style={heroHeadingStyle}>{hero.title}</h1>
                  {hero.subtitle ? (
                    <p style={styles.hero.tagline}>{hero.subtitle}</p>
                  ) : null}
                  {bullets.length ? (
                    <div style={styles.hero.chips}>
                      {bullets.map((b) => (
                        <span key={b.id || b.label} style={styles.hero.chip}>
                          <span style={styles.hero.chipIcon} aria-hidden>
                            ✓
                          </span>
                          {b.label}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </>
              )}
            </div>

            <div style={styles.hero.right}>
              {isLoading ? (
                <Skeleton.Image active style={{ width: "100%", height: 260 }} />
              ) : hero.illustration ? (
                <div style={heroIllustrationStyle}>
                  <Img
                    src={hero.illustration}
                    alt={
                      locale === "en"
                        ? "Document Translation Illustration"
                        : "Ilustrasi Terjemahan Dokumen"
                    }
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                    }}
                  />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* ===== DESCRIPTION ===== */}
      <section style={styles.desc.section}>
        <div style={sectionInnerStyle}>
          <div style={styles.desc.wrap}>
            <h2 style={descTitleStyle}>
              {locale === "en" ? "Program Description" : "Deskripsi Program"}
            </h2>
            <div style={styles.desc.box}>
              {isLoading ? (
                <Skeleton active paragraph={{ rows: 5 }} />
              ) : (
                <div
                  style={styles.desc.text}
                  dangerouslySetInnerHTML={{ __html: safeDescription }}
                />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ===== PRODUCTS ===== */}
      <section style={styles.products.section}>
        <div style={sectionInnerStyle}>
          <div style={styles.products.headWrap}>
            <div
              style={{ ...styles.products.deco, ...styles.products.decoLeft }}
            />
            <div
              style={{ ...styles.products.deco, ...styles.products.decoRight }}
            />
            <h3
              style={{
                ...styles.products.title,
                ...(isNarrow ? styles.products.titleNarrow : {}),
              }}
            >
              {content?.productSection?.title}
            </h3>
          </div>

          <div
            style={{
              ...styles.products.grid,
              ...(isNarrow ? styles.products.gridNarrow : {}),
            }}
          >
            {(content?.productSection?.items || []).map((it) => (
              <a
                key={it.id}
                href={it.href || "#"}
                style={styles.products.card}
                onMouseEnter={(e) =>
                  Object.assign(
                    e.currentTarget.style,
                    styles.products.cardHover
                  )
                }
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "";
                  e.currentTarget.style.boxShadow =
                    "0 14px 30px rgba(8,40,98,.22), 0 0 0 1px rgba(255,255,255,.08) inset";
                }}
              >
                <div style={styles.products.iconWrap}>
                  <Img
                    src={it.icon}
                    alt={it.title}
                    style={{ width: 56, height: 56, objectFit: "contain" }}
                  />
                </div>
                <div style={styles.products.label}>{it.title}</div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ===== WHY CHOOSE OUR SERVICE ===== */}
      <section style={styles.why.section}>
        <div style={sectionInnerStyle}>
          <h3
            style={{
              ...styles.why.title,
              ...(isNarrow ? styles.why.titleNarrow : {}),
            }}
          >
            {content?.why?.title}
          </h3>

          <div
            style={{
              ...styles.why.grid,
              ...(isNarrow ? styles.why.gridNarrow : {}),
            }}
          >
            {(content?.why?.items || []).map((f) => (
              <div key={f.id} style={styles.why.outerCard}>
                <div style={styles.why.innerTile}>
                  <Img src={f.icon} alt="" style={styles.why.lightningImg} />
                  <div style={styles.why.cardTitle}>{f.title}</div>
                  <div style={styles.why.cardDesc}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section style={styles.cta.section}>
        <div style={sectionInnerStyle}>
          <h3 style={styles.cta.title}>{content?.cta?.title}</h3>
          <div style={styles.cta.btnWrap}>
            {content?.cta?.button?.href && (
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
