"use client";

import { useEffect, useMemo, useState } from "react";
import { Skeleton } from "antd";
import { sanitizeHtml } from "@/app/utils/dompurify";

const FONT_FAMILY = '"Public Sans", sans-serif';

/* ===================== STYLES ===================== */
const styles = {
  sectionInner: {
    width: "min(1280px, 94%)",
    margin: "0 auto",
    fontFamily: FONT_FAMILY,
  },

  /* ================= HERO ================= */
  hero: {
    section: { padding: "8px 0 28px" },
    card: {
      position: "relative",
      background: "#0B56C9",
      borderTopLeftRadius: 24,
      borderTopRightRadius: 96,
      borderBottomLeftRadius: 96,
      borderBottomRightRadius: 24,
      padding: "56px 64px",
      minHeight: 360,
      display: "grid",
      gridTemplateColumns: "1.15fr .85fr",
      alignItems: "center",
      color: "#fff",
      boxShadow: "0 24px 54px rgba(11,86,201,.22)",
      overflow: "hidden",
    },
    title: {
      margin: 0,
      fontSize: 56,
      lineHeight: 1.08,
      fontWeight: 900,
      letterSpacing: ".01em",
      textTransform: "uppercase",
    },
    subtitle: {
      margin: "16px 0 0",
      fontSize: 16,
      lineHeight: 1.9,
      letterSpacing: ".02em",
      color: "rgba(255,255,255,.94)",
      maxWidth: 640,
    },
    illoWrap: {
      position: "relative",
      width: 360,
      height: 360,
      justifySelf: "end",
    },
    sun: {
      position: "absolute",
      right: 0,
      top: "8%",
      width: 300,
      height: 300,
      borderRadius: "50%",
      background:
        "radial-gradient(85% 85% at 50% 50%, #FFC44D 0%, #FFB229 60%, #FFA600 100%)",
      boxShadow: "0 18px 36px rgba(255,166,0,.30)",
      zIndex: 0,
    },
    illo: {
      position: "absolute",
      right: 22,
      top: 28,
      width: 260,
      height: 260,
      objectFit: "contain",
      zIndex: 1,
      filter: "drop-shadow(0 10px 20px rgba(0,0,0,.18))",
    },
  },

  /* ================= DESCRIPTION ================= */
  desc: {
    section: {
      padding: "0 0 40px",
      marginTop: 75,
      marginLeft: -35,
      marginRight: 40,
    },
    heading: {
      margin: 0,
      fontWeight: 900,
      fontSize: 44,
      letterSpacing: ".005em",
      color: "#0b0d12",
    },
    bodyBox: { marginTop: 18, width: "100%" },
    body: {
      margin: 0,
      color: "#0b0d12",
      fontSize: 18,
      lineHeight: 2.0,
      letterSpacing: ".02em",
      wordSpacing: "0.06em",
      textAlign: "justify",
      textJustify: "inter-word",
    },
  },

  /* ================= OUR SERVICES ================= */
  services: {
    section: { padding: "12px 0 56px" },
    band: {
      background: "#0b56c9",
      height: 64,
      display: "grid",
      placeItems: "center",
      boxShadow: "0 8px 22px rgba(11,86,201,.28)",
      width: "100vw",
      marginLeft: "calc(50% - 50vw)",
      marginRight: "calc(50% - 50vw)",
      marginBottom: 26,
    },
    bandTitle: {
      margin: 0,
      color: "#fff",
      fontFamily: FONT_FAMILY,
      fontWeight: 900,
      letterSpacing: ".02em",
      fontSize: 28,
      textTransform: "uppercase",
    },
    grid: {
      marginTop: 10,
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: 28,
      position: "relative",
    },
    gridTablet: { gridTemplateColumns: "repeat(2, 1fr)" },
    gridNarrow: { gridTemplateColumns: "1fr" },
    card: {
      background:
        "linear-gradient(180deg, rgba(14,76,170,1) 0%, rgba(11,86,201,1) 100%)",
      borderRadius: 20,
      padding: "34px 22px 28px",
      boxShadow:
        "0 18px 42px rgba(8,40,98,.22), 0 2px 0 0 rgba(255,255,255,.08) inset",
      display: "grid",
      justifyItems: "center",
      textDecoration: "none",
      transition: "transform .12s ease, box-shadow .2s ease",
      filter: "drop-shadow(0 18px 34px rgba(10,50,120,.20))",
      marginTop: "75px",
    },
    cardHover: {
      transform: "translateY(-4px)",
      boxShadow:
        "0 24px 56px rgba(8,40,98,.28), 0 2px 0 0 rgba(255,255,255,.12) inset",
    },
    diamond: {
      width: 140,
      height: 140,
      borderRadius: 24,
      transform: "rotate(45deg)",
      background:
        "linear-gradient(180deg, rgba(255,255,255,.14), rgba(255,255,255,.06))",
      border: "2px solid rgba(255,255,255,.35)",
      display: "grid",
      placeItems: "center",
      boxShadow: "0 10px 24px rgba(15,23,42,.18)",
      marginBottom: 18,
    },
    icon: {
      width: 72,
      height: 72,
      objectFit: "contain",
      transform: "rotate(-45deg)",
      display: "block",
    },
    label: {
      color: "#fff",
      fontWeight: 800,
      letterSpacing: ".02em",
      textAlign: "center",
      fontSize: 18,
      textTransform: "uppercase",
    },
  },

  /* ================= WHY CHOOSE OUR SERVICE ================= */
  why: {
    section: { padding: "0 0 80px", marginTop: 75 },
    band: {
      background: "#0b56c9",
      height: 64,
      display: "grid",
      placeItems: "center",
      boxShadow: "0 8px 22px rgba(11,86,201,.28)",
      width: "100vw",
      marginLeft: "calc(50% - 50vw)",
      marginRight: "calc(50% - 50vw)",
      marginBottom: 55,
    },
    bandTitle: {
      margin: 0,
      color: "#fff",
      fontFamily: FONT_FAMILY,
      fontWeight: 900,
      letterSpacing: ".02em",
      fontSize: 28,
      textTransform: "uppercase",
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "1.2fr .8fr",
      gap: 28,
      alignItems: "center",
    },
    gridNarrow: { gridTemplateColumns: "1fr" },
    panel: {
      background: "#fff",
      border: "1px solid #e6eefc",
      borderRadius: 20,
      boxShadow: "0 16px 36px rgba(11,86,201,.10)",
      padding: "26px 24px",
    },
    item: {
      display: "grid",
      gridTemplateColumns: "48px 1fr",
      gap: 16,
      alignItems: "start",
      padding: "18px 6px",
    },
    iconWrap: {
      width: 48,
      height: 48,
      display: "grid",
      placeItems: "center",
      background: "transparent",
      border: 0,
      boxShadow: "none",
      padding: 0,
    },
    icon: { width: 44, height: 44, objectFit: "contain" },
    itemTitle: {
      margin: "4px 0 6px",
      fontWeight: 900,
      color: "#0b56c9",
      fontSize: 22,
      letterSpacing: ".01em",
    },
    itemDesc: { margin: 0, color: "#123", lineHeight: 1.65, fontSize: 15.5 },

    // collage kanan
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
    collageNarrow: { height: 320 },
    backNarrow: { width: 280, height: 280 },
    frontNarrow: { left: 90, top: 20, width: 280, height: 280, borderWidth: 8 },
  },

  /* ================= CTA ================= */
  cta: {
    section: { padding: "100px 0 90px" },
    wrap: {
      position: "relative",
      background: "linear-gradient(90deg, #CFE9FF 0%, #E8F5FF 100%)",
      borderRadius: 18,
      padding: "26px 28px",
      boxShadow: "0 14px 30px rgba(11,86,201,.16)",
      overflow: "hidden",
    },
    accent: {
      position: "absolute",
      left: -12,
      top: 12,
      bottom: 12,
      width: 20,
      background: "#0b56c9",
      borderRadius: 12,
      boxShadow: "0 8px 20px rgba(11,86,201,.25)",
    },
    inner: {
      display: "grid",
      gridTemplateColumns: "1fr auto",
      alignItems: "center",
      gap: 18,
    },
    title: {
      margin: 0,
      color: "#0b56c9",
      fontWeight: 900,
      textTransform: "uppercase",
      letterSpacing: ".02em",
      fontSize: 38,
      lineHeight: 1.2,
    },
    sub: {
      margin: "14px 0 0",
      color: "#0b3a86",
      fontSize: 16,
      fontWeight: 600,
      maxWidth: 760,
    },
    btn: {
      display: "inline-block",
      background: "#0b56c9",
      color: "#fff",
      borderRadius: 20,
      padding: "14px 26px",
      fontWeight: 900,
      letterSpacing: ".02em",
      textDecoration: "none",
      boxShadow: "0 12px 28px rgba(11,86,201,.28)",
      textTransform: "uppercase",
    },

    // responsive
    innerNarrow: { gridTemplateColumns: "1fr", justifyItems: "start" },
    titleNarrow: { fontSize: 28 },
    btnNarrow: { width: "100%", textAlign: "center" },
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

export default function DocumentTranslateContent({
  locale = "id",
  content,
  isLoading,
}) {
  const hero = content?.hero || {};

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

  /* -------- responsive flags -------- */
  const [isNarrow, setIsNarrow] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  useEffect(() => {
    const mqNarrow = window.matchMedia("(max-width: 640px)");
    const mqTablet = window.matchMedia("(max-width: 1024px)");
    const update = () => {
      setIsNarrow(mqNarrow.matches);
      setIsTablet(mqTablet.matches && !mqNarrow.matches);
    };
    update();
    const onN = (e) => setIsNarrow(e.matches);
    const onT = (e) => setIsTablet(e.matches && !mqNarrow.matches);
    mqNarrow.addEventListener
      ? mqNarrow.addEventListener("change", onN)
      : mqNarrow.addListener(onN);
    mqTablet.addEventListener
      ? mqTablet.addEventListener("change", onT)
      : mqTablet.addListener(onT);
    return () => {
      mqNarrow.removeEventListener
        ? mqNarrow.removeEventListener("change", onN)
        : mqNarrow.removeListener(onN);
      mqTablet.removeEventListener
        ? mqTablet.removeEventListener("change", onT)
        : mqTablet.removeListener(onT);
    };
  }, []);

  /* -------- derived responsive -------- */
  const sectionInnerStyle = useMemo(
    () => ({
      ...styles.sectionInner,
      width: isNarrow ? "min(100%, 94%)" : "min(1280px, 94%)",
    }),
    [isNarrow]
  );

  const heroCardStyle = useMemo(
    () => ({
      ...styles.hero.card,
      gridTemplateColumns: isNarrow
        ? "1fr"
        : isTablet
        ? "1.05fr .95fr"
        : "1.15fr .85fr",
      padding: isNarrow ? "28px 22px" : isTablet ? "44px 48px" : "56px 64px",
      minHeight: isNarrow ? 240 : isTablet ? 320 : 360,
      borderTopRightRadius: isNarrow ? 56 : 96,
      borderBottomLeftRadius: isNarrow ? 56 : 96,
    }),
    [isNarrow, isTablet]
  );
  const heroTitleStyle = useMemo(
    () => ({
      ...styles.hero.title,
      fontSize: isNarrow ? 32 : isTablet ? 46 : 56,
      lineHeight: isNarrow ? 1.15 : 1.08,
    }),
    [isNarrow, isTablet]
  );
  const illoWrapStyle = useMemo(
    () => ({
      ...styles.hero.illoWrap,
      width: isNarrow ? 220 : isTablet ? 300 : 360,
      height: isNarrow ? 220 : isTablet ? 300 : 360,
      justifySelf: isNarrow ? "start" : "end",
      marginTop: isNarrow ? 12 : 0,
    }),
    [isNarrow, isTablet]
  );
  const sunStyle = useMemo(
    () => ({
      ...styles.hero.sun,
      width: isNarrow ? 180 : isTablet ? 260 : 300,
      height: isNarrow ? 180 : isTablet ? 260 : 300,
      top: isNarrow ? 0 : "8%",
    }),
    [isNarrow, isTablet]
  );
  const illoStyle = useMemo(
    () => ({
      ...styles.hero.illo,
      width: isNarrow ? 160 : isTablet ? 220 : 260,
      height: isNarrow ? 160 : isTablet ? 220 : 260,
      right: isNarrow ? 12 : 22,
      top: isNarrow ? 8 : 28,
    }),
    [isNarrow, isTablet]
  );

  const indent = useMemo(
    () => (isNarrow ? 12 : isTablet ? 28 : 40),
    [isNarrow, isTablet]
  );
  const descHeadingStyle = useMemo(
    () => ({
      ...styles.desc.heading,
      fontSize: isNarrow ? 30 : 44,
      marginLeft: indent,
    }),
    [isNarrow, indent]
  );
  const descBodyBoxStyle = useMemo(
    () => ({ ...styles.desc.bodyBox, marginLeft: indent }),
    [indent]
  );
  const descBodyStyle = useMemo(
    () => ({
      ...styles.desc.body,
      fontSize: isNarrow ? 16.5 : 18,
      lineHeight: isNarrow ? 1.9 : 2.0,
    }),
    [isNarrow]
  );

  const servicesGridStyle = useMemo(() => {
    if (isNarrow)
      return { ...styles.services.grid, ...styles.services.gridNarrow };
    if (isTablet)
      return { ...styles.services.grid, ...styles.services.gridTablet };
    return styles.services.grid;
  }, [isNarrow, isTablet]);

  const whyGridStyle = useMemo(
    () =>
      isNarrow
        ? { ...styles.why.grid, ...styles.why.gridNarrow }
        : styles.why.grid,
    [isNarrow]
  );
  const collageArea = useMemo(
    () => ({
      ...styles.why.collageArea,
      ...(isNarrow ? styles.why.collageNarrow : {}),
    }),
    [isNarrow]
  );
  const backBox = useMemo(
    () => ({
      ...styles.why.backBox,
      ...(isNarrow ? styles.why.backNarrow : {}),
    }),
    [isNarrow]
  );
  const frontBox = useMemo(
    () => ({
      ...styles.why.frontBox,
      ...(isNarrow ? styles.why.frontNarrow : {}),
    }),
    [isNarrow]
  );

  // CTA responsive
  const ctaInner = useMemo(
    () => ({
      ...styles.cta.inner,
      ...(isNarrow ? styles.cta.innerNarrow : {}),
    }),
    [isNarrow]
  );
  const ctaTitle = useMemo(
    () => ({
      ...styles.cta.title,
      ...(isNarrow ? styles.cta.titleNarrow : {}),
    }),
    [isNarrow]
  );
  const ctaBtn = useMemo(
    () => ({ ...styles.cta.btn, ...(isNarrow ? styles.cta.btnNarrow : {}) }),
    [isNarrow]
  );

  return (
    <div style={{ paddingBottom: 32, fontFamily: FONT_FAMILY }}>
      {/* ================= HERO ================= */}
      <section style={styles.hero.section}>
        <div style={sectionInnerStyle}>
          <div style={heroCardStyle}>
            <div>
              {isLoading ? (
                <Skeleton active paragraph={{ rows: 3 }} />
              ) : (
                <>
                  <h1 style={heroTitleStyle}>{hero.title}</h1>
                  {hero.subtitle ? (
                    <p style={styles.hero.subtitle}>{hero.subtitle}</p>
                  ) : null}
                </>
              )}
            </div>
            <div style={illoWrapStyle} aria-hidden>
              <div style={sunStyle} />
              {isLoading ? null : hero.illustration ? (
                <Img src={hero.illustration} alt="" style={illoStyle} />
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* ================= DESCRIPTION ================= */}
      <section style={styles.desc.section}>
        <div style={sectionInnerStyle}>
          <h2 style={descHeadingStyle}>
            {locale === "en" ? "Program Description" : "Deskripsi Program"}
          </h2>
        </div>
        <div style={sectionInnerStyle}>
          <div style={descBodyBoxStyle}>
            {isLoading ? (
              <Skeleton active paragraph={{ rows: 5 }} />
            ) : (
              <div
                style={descBodyStyle}
                dangerouslySetInnerHTML={{ __html: safeDescription }}
              />
            )}
          </div>
        </div>
      </section>

      {/* ================= OUR SERVICES ================= */}
      <section style={styles.services.section}>
        <div style={styles.services.band}>
          <h3 style={styles.services.bandTitle}>
            {content?.services?.title ||
              (locale === "en"
                ? "OUR PRODUCT DOCUMENT TRANSLATION"
                : "OUR PRODUCT DOCUMENT TRANSLATION")}
          </h3>
        </div>
        <div style={sectionInnerStyle}>
          <div style={servicesGridStyle}>
            {(content?.services?.items || []).map((it) => (
              <a
                key={it.id}
                href={it.href || "#"}
                style={styles.services.card}
                onMouseEnter={(e) =>
                  Object.assign(
                    e.currentTarget.style,
                    styles.services.cardHover
                  )
                }
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "";
                  e.currentTarget.style.boxShadow =
                    "0 18px 42px rgba(8,40,98,.22), 0 2px 0 0 rgba(255,255,255,.08) inset";
                }}
              >
                <div style={styles.services.diamond}>
                  <Img
                    src={it.icon}
                    alt={it.title}
                    style={styles.services.icon}
                  />
                </div>
                <div style={styles.services.label}>{it.title}</div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ================= WHY CHOOSE OUR SERVICE ================= */}
      <section style={styles.why.section}>
        <div style={styles.why.band}>
          <h3 style={styles.why.bandTitle}>
            {content?.why?.title ||
              (locale === "en"
                ? "WHY CHOOSE OUR SERVICE"
                : "WHY CHOOSE OUR SERVICE")}
          </h3>
        </div>

        <div style={sectionInnerStyle}>
          <div style={whyGridStyle}>
            {/* left list panel */}
            <div style={styles.why.panel}>
              {(content?.why?.items || []).map((w) => (
                <div key={w.id} style={styles.why.item}>
                  <div style={styles.why.iconWrap}>
                    <Img src={w.icon} alt="" style={styles.why.icon} />
                  </div>
                  <div>
                    <h4 style={styles.why.itemTitle}>{w.title}</h4>
                    <p style={styles.why.itemDesc}>{w.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* right collage */}
            <div
              style={{ position: "relative", minHeight: isNarrow ? 320 : 420 }}
            >
              <div style={collageArea}>
                <div style={backBox}>
                  <Img
                    src={content?.why?.images?.subImage}
                    alt=""
                    style={styles.why.imgCover}
                  />
                </div>
                <div style={frontBox}>
                  <Img
                    src={content?.why?.images?.mainImage}
                    alt=""
                    style={styles.why.imgCover}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section style={styles.cta.section}>
        <div style={sectionInnerStyle}>
          <div style={styles.cta.wrap}>
            <div style={styles.cta.accent} />
            <div style={ctaInner}>
              <div>
                {/* judul boleh mengandung <br/> dari view-model */}
                <h3
                  style={ctaTitle}
                  dangerouslySetInnerHTML={{
                    __html:
                      content?.cta?.title ||
                      (locale === "en"
                        ? "BUILD CREDIBILITY WITH<br/>QUALITY TRANSLATIONS"
                        : "BANGUN KREDIBILITAS MELALUI<br/>TERJEMAHAN BERKUALITAS"),
                  }}
                />
                <p style={styles.cta.sub}>
                  {content?.cta?.subtitle ||
                    (locale === "en"
                      ? "With our professional translation services, every detail is delivered accurately and ready to take you further on the global stage."
                      : "Dengan layanan terjemahan profesional kami, setiap detail diterjemahkan secara akurat dan siap membawa Anda melangkah lebih jauh di kancah global.")}
                </p>
              </div>

              {content?.cta?.button?.href && (
                <a
                  href={content.cta.button.href}
                  style={ctaBtn}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.transform = "translateY(-2px)")
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "")}
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

