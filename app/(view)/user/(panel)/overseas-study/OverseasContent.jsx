"use client";

import { useEffect, useMemo, useState } from "react";
import { Skeleton } from "antd";
import useOverseasViewModel from "./useOverseasViewModel";
import { sanitizeHtml } from "@/app/utils/dompurify";

const FONT_FAMILY = '"Poppins", sans-serif';

const styles = {
  sectionInner: {
    width: "min(1360px, 96%)",
    margin: "0 auto",
    fontFamily: FONT_FAMILY,
  },

  /* ---------- HERO (NEW) ---------- */
  hero: {
    wrapper: {
      background: "#0b56c9",
      borderRadius: 28,
      borderTopRightRadius: 80,
      borderBottomLeftRadius: 120,
      minHeight: 380,
      padding: "38px 48px",
      marginTop: "-8px",
      display: "grid",
      gridTemplateColumns: "1.1fr .9fr",
      gap: 24,
      alignItems: "center",
      color: "#fff",
      fontFamily: FONT_FAMILY,
      boxShadow: "0 22px 44px rgba(11,86,201,.22)",
      width: "100%",
      overflow: "hidden",
    },
    left: {
      minWidth: 0,
      textAlign: "left",
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
    },
    right: { display: "flex", justifyContent: "flex-end" },

    heading: {
      margin: 0,
      fontSize: 52,
      lineHeight: 1.08,
      fontWeight: 900,
      letterSpacing: ".015em",
      textTransform: "uppercase",
      color: "#fff",
    },
    tagline: {
      margin: "16px 0 0",
      fontSize: 17,
      lineHeight: 1.85,
      color: "rgba(255,255,255,.95)",
      letterSpacing: ".02em",
      maxWidth: 560,
      textAlign: "left",
    },

    /** illustration cluster */
    artWrap: { position: "relative", width: "min(520px, 92%)", height: 300 },
    globe: {
      width: "100%",
      height: "100%",
      objectFit: "contain",
      filter: "drop-shadow(0 12px 24px rgba(0,0,0,.18))",
    },
    capTop: {
      position: "absolute",
      right: -6,
      top: -14,
      width: 140,
      height: 100,
      objectFit: "contain",
    },
    capBottom: {
      position: "absolute",
      right: 24,
      bottom: -8,
      width: 140,
      height: 100,
      objectFit: "contain",
      transform: "rotate(8deg)",
    },

    /** responsive */
    wrapperNarrow: {
      gridTemplateColumns: "1fr",
      padding: "26px 22px",
      minHeight: 320,
      borderTopRightRadius: 56,
      borderBottomLeftRadius: 80,
    },
    headingNarrow: { fontSize: 34, lineHeight: 1.12 },
    artWrapNarrow: {
      width: "100%",
      height: 220,
      marginTop: 14,
      justifySelf: "start",
    },
  },

  /* ---------- DESCRIPTION (sesuai desain) ---------- */
  desc: {
    section: { padding: "0 0 28px" },
    wrap: { marginTop: 75 }, // jarak dari hero
    title: {
      margin: 0,
      fontFamily: FONT_FAMILY,
      fontWeight: 900,
      fontSize: 44,
      lineHeight: 1.1,
      letterSpacing: ".005em",
      color: "#0b0d12",
    },
    bodyWrap: {
      marginTop: 14,
      maxWidth: 1900, // lebar baca yang nyaman
    },
    body: {
      margin: 0,
      color: "#0b0d12",
      fontSize: 18,
      lineHeight: 1.9,
      letterSpacing: ".01em",
      textAlign: "justify",
      textJustify: "inter-word",
    },

    // responsive
    titleNarrow: { fontSize: 30 },
    bodyNarrow: { fontSize: 16, lineHeight: 1.8 },
  },

  /* ---------- STUDY ---------- */
  study: {
    section: { padding: "12px 0 28px", marginTop: "100px" },
    grid: {
      display: "grid",
      gridTemplateColumns: "560px 1fr",
      gap: 28,
      alignItems: "start",
    },
    imgWrap: {
      width: "100%",
      height: "clamp(550px, 60vh, 620px)",
      borderRadius: 24,
      overflow: "hidden",
      border: "1px solid #e5e7eb",
      boxShadow: "0 12px 28px rgba(15,23,42,.08)",
      background: "#f8fafc",
    },
    title: {
      margin: 0,
      fontFamily: FONT_FAMILY,
      fontWeight: 800,
      fontSize: 40,
      color: "#1455b3",
      letterSpacing: ".01em",
    },
    text: {
      marginTop: 12,
      color: "#0f172a",
      lineHeight: 1.8,
      fontSize: 18,
      letterSpacing: ".01em",
      maxWidth: 680,
    },
    pillWrap: { marginTop: 16, display: "grid", gap: 18 },
    pill: {
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: "16px 22px",
      background: "#0f54a5",
      color: "#fff",
      borderRadius: 22,
      border: "2px solid #084a94",
      boxShadow:
        "0 12px 28px rgba(12,58,133,.18) inset, 0 10px 24px rgba(6,38,92,.18)",
      fontWeight: 800,
      fontSize: 20,
      letterSpacing: ".01em",
    },
    pillIcon: { fontSize: 30 },
    gridNarrow: { gridTemplateColumns: "1fr", gap: 18 },
    imgNarrow: { height: 300, borderRadius: 18 },
    titleNarrow: { fontSize: 30 },
    textNarrow: { fontSize: 16, lineHeight: 1.7 },
  },

  /* ---------- INTERN ---------- */
  intern: {
    band: {
      background: "#0b56c9",
      height: 64,
      display: "grid",
      placeItems: "center",
      margin: "80px 0 24px",
      boxShadow: "0 8px 22px rgba(11,86,201,.28)",
      width: "100vw",
      marginLeft: "calc(50% - 50vw)",
      marginRight: "calc(50% - 50vw)",
    },
    bandTitle: {
      margin: 0,
      color: "#fff",
      fontFamily: FONT_FAMILY,
      fontWeight: 800,
      letterSpacing: ".02em",
      fontSize: 28,
    },
    section: { padding: "6px 0 28px" },
    grid: {
      display: "grid",
      gridTemplateColumns: "1fr 560px",
      gap: 28,
      alignItems: "center",
    },
    collageArea: { position: "relative", width: "100%", height: 420 },
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
    textWrap: { paddingRight: 8 },
    body: {
      color: "#0f172a",
      lineHeight: 1.9,
      fontSize: 18,
      letterSpacing: ".01em",
      textAlign: "justify",
    },
    gridNarrow: { gridTemplateColumns: "1fr", gap: 18, alignItems: "start" },
    collageNarrow: { height: 320 },
    backNarrow: { width: 280, height: 280 },
    frontNarrow: { left: 90, top: 20, width: 280, height: 280, borderWidth: 8 },
    bandNarrow: { height: 56, margin: "48px 0 16px" },
    bandTitleNarrow: { fontSize: 22 },
  },

  /* ---------- CTA ---------- */
  cta: {
    section: { padding: "20px 0 48px", marginTop: "150px" },
    wrap: {
      position: "relative",
      background:
        "linear-gradient(90deg, rgba(200,232,255,1) 0%, rgba(205,234,255,1) 45%, rgba(219,243,255,1) 100%)",
      borderRadius: 14,
      padding: "24px 28px",
      boxShadow: "0 10px 28px rgba(15,23,42,0.08)",
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
      fontFamily: FONT_FAMILY,
      fontWeight: 900,
      fontSize: 28,
      letterSpacing: ".02em",
      color: "#0b56c9",
    },
    sub: {
      margin: "6px 0 0",
      fontFamily: FONT_FAMILY,
      fontWeight: 700,
      fontSize: 16,
      color: "#0b3a86",
    },
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
    innerNarrow: { gridTemplateColumns: "1fr", justifyItems: "start" },
    btnNarrow: { width: "100%", textAlign: "center" },
    titleNarrow: { fontSize: 22 },
    subNarrow: { fontSize: 14, fontWeight: 600 },
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

export default function OverseasContent({ locale = "id" }) {
  const { content, isLoading } = useOverseasViewModel({ locale });
  const hero = content.hero || {};

  // sanitize sekali saja (tadinya double)
  const safeDescription = useMemo(
    () =>
      sanitizeHtml(content.description || "", {
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
      }),
    [content.description]
  );

  /* --------- Responsive --------- */
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
      ...(isNarrow ? styles.hero.wrapperNarrow : {}),
    }),
    [isNarrow]
  );
  const heroHeadingStyle = useMemo(
    () => ({
      ...styles.hero.heading,
      ...(isNarrow ? styles.hero.headingNarrow : {}),
    }),
    [isNarrow]
  );
  const heroArtWrapStyle = useMemo(
    () => ({
      ...styles.hero.artWrap,
      ...(isNarrow ? styles.hero.artWrapNarrow : {}),
    }),
    [isNarrow]
  );

  /* --------- Study derived --------- */
  const studyGridStyle = useMemo(
    () => ({
      ...styles.study.grid,
      ...(isNarrow ? styles.study.gridNarrow : {}),
    }),
    [isNarrow]
  );
  const studyImgStyle = useMemo(
    () => ({
      ...styles.study.imgWrap,
      ...(isNarrow ? styles.study.imgNarrow : {}),
    }),
    [isNarrow]
  );
  const studyTitleStyle = useMemo(
    () => ({
      ...styles.study.title,
      ...(isNarrow ? styles.study.titleNarrow : {}),
    }),
    [isNarrow]
  );
  const studyTextStyle = useMemo(
    () => ({
      ...styles.study.text,
      ...(isNarrow ? styles.study.textNarrow : {}),
    }),
    [isNarrow]
  );

  /* --------- Intern derived --------- */
  const internGridStyle = useMemo(
    () => ({
      ...styles.intern.grid,
      ...(isNarrow ? styles.intern.gridNarrow : {}),
      gridTemplateColumns: isNarrow ? "1fr" : "1fr 560px",
    }),
    [isNarrow]
  );
  const collageArea = useMemo(
    () => ({
      ...styles.intern.collageArea,
      ...(isNarrow ? styles.intern.collageNarrow : {}),
    }),
    [isNarrow]
  );
  const backBox = useMemo(
    () => ({
      ...styles.intern.backBox,
      ...(isNarrow ? styles.intern.backNarrow : {}),
    }),
    [isNarrow]
  );
  const frontBox = useMemo(
    () => ({
      ...styles.intern.frontBox,
      ...(isNarrow ? styles.intern.frontNarrow : {}),
    }),
    [isNarrow]
  );
  const internBandStyle = useMemo(
    () => ({
      ...styles.intern.band,
      ...(isNarrow ? styles.intern.bandNarrow : {}),
    }),
    [isNarrow]
  );
  const internBandTitleStyle = useMemo(
    () => ({
      ...styles.intern.bandTitle,
      ...(isNarrow ? styles.intern.bandTitleNarrow : {}),
    }),
    [isNarrow]
  );

  return (
    <div style={{ paddingBottom: 48, fontFamily: FONT_FAMILY }}>
      {/* ===== HERO ===== */}
      <section style={{ padding: "0 0 24px", marginRight: 75 }}>
        <div style={sectionInnerStyle}>
          <div style={heroWrapperStyle}>
            <div style={styles.hero.left}>
              {isLoading ? (
                <Skeleton active paragraph={{ rows: 2 }} />
              ) : (
                <>
                  <h1 style={heroHeadingStyle}>{hero.title}</h1>
                  {hero.subtitle ? (
                    <p style={styles.hero.tagline}>{hero.subtitle}</p>
                  ) : null}
                </>
              )}
            </div>

            <div style={styles.hero.right} aria-hidden>
              {isLoading ? (
                <Skeleton.Image active style={{ width: "100%", height: 240 }} />
              ) : (
                <div style={heroArtWrapStyle}>
                  {hero.illustration ? (
                    <Img
                      src={hero.illustration}
                      alt=""
                      style={styles.hero.globe}
                    />
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ===== DESCRIPTION ===== */}
      <section style={styles.desc.section}>
        <div style={sectionInnerStyle}>
          <div style={styles.desc.wrap}>
            <h2
              style={{
                ...styles.desc.title,
                ...(isNarrow ? styles.desc.titleNarrow : {}),
              }}
            >
              {String(locale).slice(0, 2).toLowerCase() === "en"
                ? "Program Description"
                : "Deskripsi Program"}
            </h2>

            <div style={styles.desc.bodyWrap}>
              {isLoading ? (
                <Skeleton active paragraph={{ rows: 4 }} />
              ) : (
                <div
                  style={{
                    ...styles.desc.body,
                    ...(isNarrow ? styles.desc.bodyNarrow : {}),
                  }}
                  dangerouslySetInnerHTML={{ __html: safeDescription }}
                />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ===== STUDY ===== */}
      <section style={styles.study.section}>
        <div style={sectionInnerStyle}>
          <div style={studyGridStyle}>
            <div style={studyImgStyle}>
              <Img
                src={content.studySection?.image}
                alt="Study Abroad"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "center",
                }}
              />
            </div>

            <div>
              <h2 style={studyTitleStyle}>{content.studySection?.title}</h2>
              <p style={studyTextStyle}>{content.studySection?.text}</p>

              <div style={styles.study.pillWrap}>
                {(content.studySection?.pills || []).map((p) => (
                  <div key={p.id} style={styles.study.pill}>
                    <span style={styles.study.pillIcon}>{p.icon}</span>
                    <span>{p.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== INTERN ===== */}
      <section style={{ padding: "0 0 12px" }}>
        <div style={internBandStyle}>
          <h2 style={internBandTitleStyle}>{content.internSection?.title}</h2>
        </div>

        <div style={sectionInnerStyle}>
          <div style={internGridStyle}>
            <div style={{ ...styles.intern.textWrap, paddingRight: 18 }}>
              <p style={styles.intern.body}>{content.internSection?.text}</p>
            </div>

            <div
              style={{ position: "relative", minHeight: isNarrow ? 320 : 420 }}
            >
              <div style={collageArea}>
                <div style={backBox}>
                  <Img
                    src={content.internSection?.subImage}
                    alt="Internship secondary"
                    style={styles.intern.imgCover}
                  />
                </div>
                <div style={frontBox}>
                  <Img
                    src={content.internSection?.mainImage}
                    alt="Internship main"
                    style={styles.intern.imgCover}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section style={styles.cta.section}>
        <div style={sectionInnerStyle}>
          <div style={styles.cta.wrap}>
            <div style={styles.cta.spine} />
            <div
              style={{
                ...styles.cta.inner,
                ...(isNarrow ? styles.cta.innerNarrow : {}),
              }}
            >
              <div>
                <h3
                  style={{
                    ...styles.cta.title,
                    ...(isNarrow ? styles.cta.titleNarrow : {}),
                  }}
                >
                  {content.cta?.title}
                </h3>
                <p
                  style={{
                    ...styles.cta.sub,
                    ...(isNarrow ? styles.cta.subNarrow : {}),
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
                    ...(isNarrow ? styles.cta.btnNarrow : {}),
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
