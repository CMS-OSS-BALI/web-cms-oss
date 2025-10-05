"use client";

import { useEffect, useMemo, useState } from "react";
import { Row, Col, Card, Typography, Skeleton } from "antd";
import useOverseasViewModel from "./useOverseasViewModel";
import { sanitizeHtml } from "@/app/utils/dompurify";

const { Title } = Typography;
const FONT_FAMILY = '"Poppins", sans-serif';

/* ----------------- Styles ----------------- */
const styles = {
  sectionInner: {
    width: "min(1360px, 96%)",
    margin: "0 auto",
    fontFamily: FONT_FAMILY,
  },
  section: { padding: "0 0 16px" },

  /* ---------- HERO ---------- */
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
      fontFamily: FONT_FAMILY,
      boxShadow: "0 24px 54px rgba(3, 30, 88, 0.28)",
      width: "calc(100% - 100px)",
    },
    left: {
      minWidth: 0,
      textAlign: "left",
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      fontFamily: FONT_FAMILY,
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
    chips: { display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 },
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

  /* ---------- DESCRIPTION ---------- */
  desc: {
    wrap: { marginTop: 75 },
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
      letterSpacing: "0.06em",
      color: "#0f172a",
      margin: 0,
    },
  },

  /* ---------- TRACK BUTTONS ---------- */
  tracks: {
    wrap: {
      marginTop: 22,
      display: "flex",
      justifyContent: "center",
      gap: 28,
      flexWrap: "wrap",
    },
    btn: {
      position: "relative",
      border: 0,
      height: 56,
      padding: "0 28px",
      borderRadius: 16,
      fontWeight: 800,
      letterSpacing: ".02em",
      color: "#fff",
      textDecoration: "none",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      background:
        "linear-gradient(135deg, rgba(86,169,255,1) 0%, rgba(58,228,206,1) 100%)",
      boxShadow:
        "0 6px 16px rgba(24,72,192,.25), 0 16px 40px rgba(82,208,255,.28), 0 0 0 1px rgba(255,255,255,.2) inset",
      transition: "transform .15s ease, box-shadow .2s ease, opacity .2s ease",
    },
    btnAlt: {
      background:
        "linear-gradient(135deg, rgba(123,168,255,1) 0%, rgba(114,236,205,1) 100%)",
    },
    btnHover: {
      transform: "translateY(-2px)",
      boxShadow:
        "0 10px 22px rgba(24,72,192,.28), 0 24px 54px rgba(82,208,255,.34), 0 0 0 1px rgba(255,255,255,.28) inset",
    },
  },

  /* ---------- STUDY SECTION ---------- */
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

  /* ---------- INTERN (MAGANG) SECTION ---------- */
  intern: {
    band: {
      background: "#0b56c9",
      height: 64,
      display: "grid",
      placeItems: "center",
      margin: "80px 0 24px",
      boxShadow: "0 8px 22px rgba(11,86,201,.28)",
      borderRadius: 0,
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
      gridTemplateColumns: "560px 1fr",
      gap: 28,
      alignItems: "center",
    },

    collageWrap: { position: "relative", marginTop: "70px" },
    mainBox: {
      width: "78%",
      marginLeft: "auto",
      height: "clamp(380px, 52vh, 560px)",
      borderRadius: 28,
      overflow: "hidden",
      background: "#0f172a",
      zIndex: 2,
    },
    subBox: {
      position: "absolute",
      left: "-6%",
      bottom: "-12%",
      width: "58%",
      height: "52%",
      borderRadius: 24,
      overflow: "hidden",
      border: 0,
      boxShadow: "0 16px 32px rgba(15,23,42,.18)",
      background: "#fff",
      zIndex: 1,
    },

    textWrap: { paddingRight: 8 },
    body: {
      color: "#0f172a",
      lineHeight: 1.9,
      fontSize: 18,
      letterSpacing: ".01em",
      textAlign: "justify",
    },

    gridNarrow: { gridTemplateColumns: "1fr", gap: 18, alignItems: "start" },
    mainNarrow: { height: 300, borderRadius: 20, borderWidth: 5 },
    subNarrow: {
      position: "static",
      width: "100%",
      height: 180,
      marginTop: 12,
      borderRadius: 18,
    },
    bandNarrow: {
      height: 56,
      margin: "48px 0 16px",
      width: "100vw",
      marginLeft: "calc(50% - 50vw)",
      marginRight: "calc(50% - 50vw)",
    },
    bandTitleNarrow: { fontSize: 22 },
  },

  /* ---------- CTA BANNER (NEW) ---------- */
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

/* ----------------- Helpers ----------------- */
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
  const bullets = Array.isArray(hero.bullets) ? hero.bullets : [];

  const safeDescription = sanitizeHtml(content.description || "", {
    allowedTags: ["b", "strong", "i", "em", "u", "a", "br", "ul", "ol", "li"],
  });

  /* --------- Responsive flag --------- */
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

  /* --------- Derived styles --------- */
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
      minHeight: isNarrow ? 380 : 420,
      marginTop: isNarrow ? "-12px" : "-36px",
      width: isNarrow ? "100%" : "calc(100% - 100px)",
    }),
    [isNarrow]
  );
  const heroHeadingStyle = useMemo(
    () => ({ ...styles.hero.heading, fontSize: isNarrow ? 38 : 54 }),
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
  const descBoxStyle = useMemo(
    () => ({
      ...styles.desc.box,
      padding: isNarrow ? "16px 18px" : "22px 24px",
    }),
    [isNarrow]
  );
  const descTextStyle = useMemo(
    () => ({
      ...styles.desc.text,
      fontSize: isNarrow ? 16 : 18,
      lineHeight: isNarrow ? "28px" : "32px",
      letterSpacing: isNarrow ? "0.04em" : "0.06em",
    }),
    [isNarrow]
  );

  // Study derived
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

  // Intern derived
  const internGridStyle = useMemo(
    () => ({
      ...styles.intern.grid,
      ...(isNarrow ? styles.intern.gridNarrow : {}),
    }),
    [isNarrow]
  );
  const internMainBoxStyle = useMemo(
    () => ({
      ...styles.intern.mainBox,
      ...(isNarrow ? styles.intern.mainNarrow : {}),
    }),
    [isNarrow]
  );
  const internSubBoxStyle = useMemo(
    () => ({
      ...styles.intern.subBox,
      ...(isNarrow ? styles.intern.subNarrow : {}),
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

  // CTA derived
  const ctaInnerStyle = useMemo(
    () => ({
      ...styles.cta.inner,
      ...(isNarrow ? styles.cta.innerNarrow : {}),
    }),
    [isNarrow]
  );
  const ctaTitleStyle = useMemo(
    () => ({
      ...styles.cta.title,
      ...(isNarrow ? styles.cta.titleNarrow : {}),
    }),
    [isNarrow]
  );
  const ctaSubStyle = useMemo(
    () => ({ ...styles.cta.sub, ...(isNarrow ? styles.cta.subNarrow : {}) }),
    [isNarrow]
  );
  const ctaBtnStyle = useMemo(
    () => ({ ...styles.cta.btn, ...(isNarrow ? styles.cta.btnNarrow : {}) }),
    [isNarrow]
  );

  // hover state for track buttons (kept if you still render tracks somewhere)
  const [hoverIdx, setHoverIdx] = useState(null);

  return (
    <div style={{ paddingBottom: 48, fontFamily: FONT_FAMILY }}>
      {/* ===== HERO ===== */}
      <section style={{ padding: "0 0 24px" }}>
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
                        <button
                          key={b.id || b.label}
                          type="button"
                          style={styles.hero.chip}
                        >
                          <span style={styles.hero.chipIcon} aria-hidden>
                            ✓
                          </span>
                          {b.label}
                        </button>
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
                    alt="Overseas Study Illustration"
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
      <section style={{ padding: "0 0 16px" }}>
        <div style={sectionInnerStyle}>
          <div style={styles.desc.wrap}>
            <h2 style={descTitleStyle}>
              {locale === "id" ? "Deskripsi Program" : "Program Description"}
            </h2>
            <div style={descBoxStyle}>
              {isLoading ? (
                <Skeleton active paragraph={{ rows: 4 }} />
              ) : (
                <div
                  style={descTextStyle}
                  dangerouslySetInnerHTML={{ __html: safeDescription }}
                />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ===== STUDY LUAR NEGERI ===== */}
      <section style={styles.study.section}>
        <div style={sectionInnerStyle}>
          <div style={studyGridStyle}>
            {/* image left */}
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

            {/* text & blue pills */}
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

      {/* ===== MAGANG LUAR NEGERI ===== */}
      <section style={{ padding: "0 0 12px" }}>
        {/* full-bleed band */}
        <div style={internBandStyle}>
          <h2 style={internBandTitleStyle}>{content.internSection?.title}</h2>
        </div>

        <div style={sectionInnerStyle}>
          <div style={internGridStyle}>
            {/* collage images left */}
            <div style={styles.intern.collageWrap}>
              <div style={internMainBoxStyle}>
                <Img
                  src={content.internSection?.mainImage}
                  alt="Internship abroad - main"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "center",
                  }}
                />
              </div>

              <div style={internSubBoxStyle}>
                <Img
                  src={content.internSection?.subImage}
                  alt="Internship abroad - secondary"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            </div>

            {/* text right */}
            <div style={styles.intern.textWrap}>
              <p style={styles.intern.body}>{content.internSection?.text}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== CTA BANNER (NEW) ===== */}
      <section style={styles.cta.section}>
        <div style={{ ...sectionInnerStyle }}>
          <div style={styles.cta.wrap}>
            <div style={styles.cta.spine} />
            <div style={ctaInnerStyle}>
              <div>
                <h3 style={ctaTitleStyle}>{content.cta?.title}</h3>
                <p style={ctaSubStyle}>{content.cta?.subtitle}</p>
              </div>

              {content.cta?.button?.href && (
                <a href="/user/leads" style={ctaBtnStyle}>
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
