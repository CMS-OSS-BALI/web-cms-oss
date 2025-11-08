"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Skeleton } from "antd";
import { sanitizeHtml } from "@/app/utils/dompurify";

/* ============================= */
/* Utilities: Reveal on scroll + Parallax */
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

    const showAll = (nodes) => {
      nodes.forEach((el) => {
        applyDelayVar(el);
        el.classList.add("is-visible");
      });
    };

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

function useHeroParallax(ref) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = ref.current;
    if (!root) return;

    const prefersReduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const isDesktop = () => window.innerWidth >= 992;
    if (prefersReduce || !isDesktop()) return;

    const copy = root.querySelector(".js-hero-copy");
    const onMove = (e) => {
      const r = root.getBoundingClientRect();
      const cx = (e.clientX - r.left) / r.width - 0.5;
      const cy = (e.clientY - r.top) / r.height - 0.5;
      copy &&
        (copy.style.transform = `translate3d(${cx * 6}px, ${cy * 6}px, 0)`);
    };
    const onLeave = () => {
      copy && (copy.style.transform = "");
    };
    root.addEventListener("mousemove", onMove);
    root.addEventListener("mouseleave", onLeave);
    return () => {
      root.removeEventListener("mousemove", onMove);
      root.removeEventListener("mouseleave", onLeave);
    };
  }, [ref]);
}

/* ============================= */
/* Brand tokens */
const FONT_FAMILY =
  '"Public Sans", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';

const styles = {
  sectionInner: {
    width: "min(1280px, 94%)",
    margin: "0 auto",
    fontFamily: FONT_FAMILY,
  },

  /* ---------- HERO ---------- */
  hero: {
    section: { padding: "8px 0 28px" },
    card: {
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

  /* ---------- DESCRIPTION ---------- */
  desc: {
    section: { padding: "46px 0 56px" },
    heading: {
      margin: 0,
      fontWeight: 900,
      fontSize: 40,
      letterSpacing: ".005em",
      color: "#0b0d12",
    },
    bodyBox: { marginTop: 18, width: "100%" },
    body: {
      margin: 0,
      color: "#0b0d12",
      fontSize: 18,
      lineHeight: 2.0,
      letterSpacing: ".01em",
      wordSpacing: "0.04em",
      textAlign: "justify",
      textJustify: "inter-word",
      hyphens: "auto",
    },
  },

  /* ---------- SERVICES ---------- */
  services: {
    section: { padding: "12px 0 56px" },
    band: {
      background: "#0b56c9",
      // biar ada ruang kiri/kanan di mobile
      paddingInline: "clamp(12px, 4vw, 28px)",
      minHeight: 56,
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
      letterSpacing: ".01em",
      /* KUNCI: font fluid + tidak melipat baris */
      fontSize: "clamp(12px, 3.6vw, 28px)",
      whiteSpace: "nowrap",
      lineHeight: 1.1,
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
      transition: "transform .18s ease, box-shadow .22s ease, filter .22s ease",
      filter: "drop-shadow(0 18px 34px rgba(10,50,120,.20))",
      marginTop: "75px",
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

  /* ---------- WHY ---------- */
  why: {
    section: { padding: "0 0 80px", marginTop: 75 },
    band: {
      background: "#0b56c9",
      paddingInline: "clamp(12px, 4vw, 28px)",
      minHeight: 56,
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
      letterSpacing: ".01em",
      fontSize: "clamp(16px,4vw, 38px)",
      whiteSpace: "nowrap",
      lineHeight: 1.1,
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

  /* ---------- CTA ---------- */
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
    innerNarrow: { gridTemplateColumns: "1fr", justifyItems: "start" },
    titleNarrow: { fontSize: 28 },
    btnNarrow: { width: "100%", textAlign: "center" },
  },
};

/* -------- helper image -------- */
function Img({ src, alt, style, className }) {
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt={alt || ""}
      className={className}
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

export default function DocumentTranslateContent({
  locale = "id",
  content,
  isLoading,
}) {
  const heroRef = useRef(null);

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

  useRevealOnScroll([isLoading]);
  useHeroParallax(heroRef);

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
      borderTopRightRadius: isNarrow ? 72 : 120,
      borderBottomLeftRadius: isNarrow ? 72 : 120,
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

  const descHeadingStyle = useMemo(
    () => ({ ...styles.desc.heading, fontSize: isNarrow ? 30 : 40 }),
    [isNarrow]
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

  return (
    <div style={{ paddingBottom: 32, fontFamily: FONT_FAMILY }}>
      {/* ---------- HERO ---------- */}
      <section style={styles.hero.section}>
        <div style={sectionInnerStyle}>
          <div
            ref={heroRef}
            style={heroCardStyle}
            className="reveal"
            data-anim="zoom"
          >
            <div className="js-hero-copy">
              {isLoading ? (
                <Skeleton active paragraph={{ rows: 3 }} />
              ) : (
                <>
                  <h1
                    className="reveal"
                    data-anim="down"
                    style={heroTitleStyle}
                  >
                    {content?.hero?.title}
                  </h1>
                  {content?.hero?.subtitle ? (
                    <p
                      className="reveal"
                      data-anim="up"
                      style={styles.hero.subtitle}
                    >
                      {content.hero.subtitle}
                    </p>
                  ) : null}
                </>
              )}
            </div>

            <div
              style={illoWrapStyle}
              className="reveal"
              data-anim="right"
              aria-hidden
            >
              <div style={sunStyle} className="anim-sun" />
              {isLoading ? null : content?.hero?.illustration ? (
                <Img
                  src={content.hero.illustration}
                  alt=""
                  style={illoStyle}
                  className="anim-illo"
                />
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- DESCRIPTION ---------- */}
      <section style={styles.desc.section}>
        <div style={sectionInnerStyle}>
          <h2 className="reveal" data-anim="down" style={descHeadingStyle}>
            {locale === "en" ? "Program Description" : "Deskripsi Program"}
          </h2>
        </div>
        <div style={sectionInnerStyle}>
          <div>
            {isLoading ? (
              <Skeleton active paragraph={{ rows: 5 }} />
            ) : (
              <div
                className="reveal desc-content"
                data-anim="up"
                style={descBodyStyle}
                dangerouslySetInnerHTML={{ __html: safeDescription }}
              />
            )}
          </div>
        </div>
      </section>

      {/* ---------- SERVICES ---------- */}
      <section style={styles.services.section}>
        <div className="reveal" data-anim="zoom" style={styles.services.band}>
          <h3 style={styles.services.bandTitle}>
            {content?.services?.title ||
              (locale === "en"
                ? "DOCUMENT TRANSLATION PRODUCTS"
                : "PRODUK TERJEMAHAN DOKUMEN")}
          </h3>
        </div>
        <div style={sectionInnerStyle}>
          <div style={servicesGridStyle}>
            {(content?.services?.items || []).map((it, i) => (
              <a
                key={it.id}
                href={it.href || "#"}
                style={styles.services.card}
                className="service-card reveal"
                data-anim="up"
                data-rvd={`${i * 80}ms`}
              >
                <div style={styles.services.diamond} className="anim-diamond">
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

      {/* ---------- WHY ---------- */}
      <section style={styles.why.section}>
        <div className="reveal" data-anim="zoom" style={styles.why.band}>
          <h3 style={styles.why.bandTitle}>
            {content?.why?.title ||
              (locale === "en"
                ? "WHY CHOOSE OUR SERVICE"
                : "MENGAPA MEMILIH LAYANAN KAMI")}
          </h3>
        </div>

        <div style={sectionInnerStyle}>
          <div style={whyGridStyle}>
            {/* left list panel */}
            <div className="reveal" data-anim="left" style={styles.why.panel}>
              {(content?.why?.items || []).map((w, idx) => (
                <div
                  key={w.id}
                  style={styles.why.item}
                  className="reveal"
                  data-anim="up"
                  data-rvd={`${40 + idx * 80}ms`}
                >
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
                <div
                  style={backBox}
                  className="reveal"
                  data-anim="zoom"
                  data-rvd="100ms"
                >
                  <Img
                    src={content?.why?.images?.subImage}
                    alt=""
                    style={styles.why.imgCover}
                  />
                </div>
                <div
                  style={frontBox}
                  className="reveal"
                  data-anim="zoom"
                  data-rvd="200ms"
                >
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

      {/* ---------- CTA ---------- */}
      <section style={styles.cta.section}>
        <div style={sectionInnerStyle}>
          <div className="reveal" data-anim="zoom" style={styles.cta.wrap}>
            <div style={styles.cta.accent} />
            <div
              style={{
                ...styles.cta.inner,
                ...(isNarrow ? styles.cta.innerNarrow : {}),
              }}
            >
              <div>
                <h3
                  className="reveal"
                  data-anim="down"
                  style={{
                    ...styles.cta.title,
                    ...(isNarrow ? styles.cta.titleNarrow : {}),
                  }}
                  dangerouslySetInnerHTML={{
                    __html:
                      content?.cta?.title ||
                      (locale === "en"
                        ? "BUILD CREDIBILITY WITH<br/>QUALITY TRANSLATIONS"
                        : "BANGUN KREDIBILITAS MELALUI<br/>TERJEMAHAN BERKUALITAS"),
                  }}
                />
                <p className="reveal" data-anim="up" style={styles.cta.sub}>
                  {content?.cta?.subtitle ||
                    (locale === "en"
                      ? "With our professional translation services, every detail is delivered accurately and ready to take you further on the global stage."
                      : "Dengan layanan terjemahan profesional kami, setiap detail diterjemahkan secara akurat dan siap digunakan untuk keperluan resmi maupun internasional.")}
                </p>
              </div>

              {content?.cta?.button?.href && (
                <a
                  href={content.cta.button.href}
                  className="reveal"
                  data-anim="left"
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

      {/* ---------- GLOBAL STYLES (Animations/Interactions) ---------- */}
      <style jsx global>{`
        /* selection */
        ::selection {
          background: #0b56c9;
          color: #fff;
        }
        html,
        body {
          overflow-x: clip;
        }

        /* Reveal */
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

        /* Micro-interactions */
        .service-card:focus-visible {
          outline: 3px solid #b9d6ff;
          outline-offset: 2px;
        }
        @media (hover: hover) {
          .service-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 24px 56px rgba(8, 40, 98, 0.28),
              0 2px 0 0 rgba(255, 255, 255, 0.12) inset;
            filter: saturate(1.06);
          }
          .anim-diamond {
            transition: transform 220ms ease;
          }
          .service-card:hover .anim-diamond {
            transform: rotate(45deg) translateY(-2px) scale(1.03);
          }
        }

        /* Gentle float for hero visuals */
        @keyframes floatY {
          0% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-6px);
          }
          100% {
            transform: translateY(0);
          }
        }
        .anim-sun {
          animation: floatY 6.5s ease-in-out infinite;
        }
        .anim-illo {
          animation: floatY 7s ease-in-out infinite;
        }

        /* Rich content defaults */
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
        .desc-content img {
          max-width: 100%;
          height: auto;
          border-radius: 12px;
          margin: 10px 0;
        }

        /* Respect reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .reveal {
            transition: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
          .anim-sun,
          .anim-illo {
            animation: none !important;
          }
        }

        /* Responsive tweaks */
        @media (max-width: 1024px) {
          /* keep grid changes handled in JS memo; extra spacing if needed */
        }
        @media (max-width: 640px) {
          /* enlarge tap targets for accessibility */
          .service-card {
            padding: 26px 18px 22px;
          }
        }
      `}</style>
    </div>
  );
}
