"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Skeleton } from "antd";
import useOverseasViewModel from "./useOverseasViewModel";
import { sanitizeHtml } from "@/app/utils/dompurify";

/* ============================= */
/* Brand Palette (pusat kendali) */
const PALETTE = {
  primary: "#0B56C9",
  primaryDark: "#084A94",
  primaryDeep: "#063E7C",
  primarySoftA: "rgba(11,86,201,0.12)",
  primarySoftB: "rgba(11,86,201,0.08)",
  ink: "#0F172A",
  inkSoft: "#334155",
  white: "#FFFFFF",
  surface: "#F8FAFC",
  border: "#E5E7EB",
  shadowMain: "0 22px 44px rgba(11,86,201,.22)",
  shadowCard: "0 12px 28px rgba(15,23,42,.08)",
  shadowChip: "0 10px 24px rgba(11,86,201,.18)",
};

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
    if (!copy) return;
    const onMove = (e) => {
      const r = root.getBoundingClientRect();
      const cx = (e.clientX - r.left) / r.width - 0.5;
      const cy = (e.clientY - r.top) / r.height - 0.5;
      copy.style.transform = `translate3d(${cx * 6}px, ${cy * 6}px, 0)`;
    };
    const onLeave = () => {
      copy.style.transform = "";
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
const FONT_FAMILY =
  '"Public Sans", system-ui, -apple-system, Segoe UI, Roboto, sans-serif';

const styles = {
  sectionInner: {
    width: "min(1360px, 96%)",
    margin: "0 auto",
    fontFamily: FONT_FAMILY,
  },

  /* ---------- HERO ---------- */
  hero: {
    wrapper: {
      background: PALETTE.primary,
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
      color: PALETTE.white,
      boxShadow: "0 24px 54px rgba(3, 30, 88, 0.28)",
      fontFamily: FONT_FAMILY,
      position: "relative",
      overflow: "hidden",
    },
    left: {
      minWidth: 0,
      textAlign: "left",
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      gap: 8,
    },
    right: { display: "flex", justifyContent: "center" },
    heading: {
      margin: 0,
      fontSize: 54,
      lineHeight: 1.06,
      fontWeight: 800,
      letterSpacing: ".2px",
      color: "#fff",
      textTransform: "uppercase",
    },
    tagline: {
      margin: "14px 0 0",
      fontSize: 17,
      lineHeight: 1.7,
      color: "rgba(255,255,255,.92)",
      textAlign: "left",
      maxWidth: 680,
    },
    artWrap: { width: "min(500px, 92%)", height: 320 },
    globe: {
      width: "100%",
      height: "100%",
      objectFit: "contain",
      filter: "drop-shadow(0 12px 24px rgba(0,0,0,.18))",
    },
  },

  /* ---------- DESCRIPTION ---------- */
  desc: {
    section: { padding: "0 0 16px" },
    wrap: { marginTop: 64 },
    title: {
      margin: "0 0 12px",
      fontFamily: FONT_FAMILY,
      fontWeight: 800,
      fontSize: 44,
      lineHeight: 1.1,
      color: "#0f172a",
      letterSpacing: "0.01em",
      textTransform: "uppercase",
    },
    bodyWrap: { marginTop: 8, maxWidth: 1900 },
    body: {
      fontFamily: FONT_FAMILY,
      fontSize: 18,
      lineHeight: 1.9,
      letterSpacing: "0.01em",
      color: "#0f172a",
      margin: 0,
      textAlign: "justify",
      overflowWrap: "anywhere",
      wordBreak: "break-word",
      hyphens: "auto",
    },
    cardMobile: {
      background: "#fff",
      border: `1px solid ${PALETTE.border}`,
      borderRadius: 16,
      boxShadow: "0 10px 24px rgba(15,23,42,.04)",
      padding: "14px 16px",
    },
  },

  /* ---------- STUDY ---------- */
  study: {
    section: { padding: "12px 0 28px", marginTop: "clamp(50px, 8vw, 100px)" },
    grid: {
      display: "grid",
      gridTemplateColumns: "minmax(260px, 560px) 1fr",
      gap: 28,
      alignItems: "stretch",
    },
    imgWrap: {
      width: "100%",
      minHeight: "clamp(240px, 60vh, 620px)",
      height: "100%",
      borderRadius: 24,
      overflow: "hidden",
      border: `1px solid ${PALETTE.border}`,
      boxShadow: PALETTE.shadowCard,
      background: PALETTE.surface,
    },
    title: {
      margin: 0,
      fontFamily: FONT_FAMILY,
      fontWeight: 800,
      fontSize: "clamp(20px, 3.8vw, 40px)",
      color: PALETTE.primary,
      letterSpacing: ".01em",
    },
    text: {
      marginTop: 10,
      color: PALETTE.ink,
      lineHeight: 1.8,
      fontSize: "clamp(13px, 1.6vw, 18px)",
      letterSpacing: ".01em",
      maxWidth: 760,
    },
    pillWrap: {
      marginTop: 16,
      display: "grid",
      gap: 14,
      gridTemplateColumns: "repeat(2, minmax(220px, 1fr))",
    },
    pill: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "16px 20px",
      background: PALETTE.primary,
      color: PALETTE.white,
      borderRadius: 18,
      border: `2px solid ${PALETTE.primaryDark}`,
      boxShadow: `inset 0 12px 28px rgba(12,58,133,.18), 0 10px 24px rgba(6,38,92,.18)`,
      fontWeight: 800,
      fontSize: 18,
      letterSpacing: ".01em",
      minHeight: 92,
      transform: "translateZ(0)",
    },
    pillIcon: { fontSize: 24 },
  },

  /* ---------- INTERN ---------- */
  intern: {
    chipsWrap: {
      marginTop: 18,
      display: "grid",
      gap: 14,
      gridTemplateColumns: "repeat(2, 1fr)",
    },
    chip: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "14px 18px",
      background: PALETTE.primary,
      color: PALETTE.white,
      borderRadius: 16,
      border: `2px solid ${PALETTE.primaryDark}`,
      boxShadow: PALETTE.shadowChip,
      fontWeight: 800,
      fontSize: 16,
      minHeight: 74,
    },
    chipIcon: { fontSize: 22 },
  },

  /* ---------- LEVELS (replace CTA) ---------- */
  levels: {
    section: { padding: "20px 0 48px", marginTop: "clamp(70px, 10vw, 150px)" },
    wrap: {
      background: "#F3F7FF",
      borderRadius: 18,
      border: `1px solid ${PALETTE.border}`,
      boxShadow: "0 10px 24px rgba(15,23,42,.04)",
      overflow: "hidden",
    },
    inner: {
      display: "grid",
      gridTemplateColumns: "minmax(260px, 520px) 1fr",
      alignItems: "center",
      gap: 24,
      padding: "clamp(18px, 4vw, 30px)",
    },
    left: {
      display: "grid",
      gridTemplateRows: "auto 1fr",
      alignItems: "center",
      justifyItems: "center",
      textAlign: "center",
      padding: "clamp(8px, 2vw, 12px)",
    },
    heading: {
      fontWeight: 800,
      color: PALETTE.primary,
      fontSize: "clamp(22px, 3.4vw, 40px)",
      margin: "0 0 6px",
    },
    art: { width: "min(420px, 100%)", height: "auto", objectFit: "contain" },
    right: { display: "grid", gap: 18 },
    item: {
      display: "grid",
      gridTemplateColumns: "40px 1fr",
      gap: 14,
      alignItems: "start",
    },
    itemTitle: {
      margin: 0,
      fontWeight: 800,
      color: PALETTE.primary,
      fontSize: "clamp(14px, 2vw, 18px)",
    },
    itemText: {
      margin: "6px 0 0",
      color: PALETTE.ink,
      lineHeight: 1.75,
      fontSize: "clamp(12px, 1.6vw, 15px)",
    },
    badge: {
      width: 36,
      height: 36,
      borderRadius: "50%",
      background: PALETTE.primary,
      display: "grid",
      placeItems: "center",
      boxShadow: "0 8px 18px rgba(11,86,201,.25)",
      transform: "translateZ(0)",
      flexShrink: 0,
    },
  },
};

function Img({ src, alt, style, className }) {
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

function CheckBadge() {
  return (
    <span style={styles.levels.badge} aria-hidden="true">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="#fff">
        <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
      </svg>
    </span>
  );
}

export default function OverseasContent({ locale = "id" }) {
  const heroRef = useRef(null);
  const { content, isLoading } = useOverseasViewModel({ locale });
  const hero = content.hero || {};

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

  useRevealOnScroll([isLoading]);
  useHeroParallax(heroRef);

  const sectionInnerStyle = useMemo(
    () => ({
      ...styles.sectionInner,
      width: isNarrow ? "100%" : "min(1360px, 96%)",
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
    }),
    [isNarrow]
  );
  const heroHeadingStyle = useMemo(
    () => ({ ...styles.hero.heading, fontSize: isNarrow ? 38 : 54 }),
    [isNarrow]
  );
  const heroArtStyle = useMemo(
    () => ({
      ...styles.hero.artWrap,
      width: isNarrow ? "100%" : "min(500px, 92%)",
      height: isNarrow ? 220 : 320,
    }),
    [isNarrow]
  );

  /* Study responsive */
  const studyGridStyle = useMemo(
    () => ({
      ...styles.study.grid,
      ...(isNarrow ? { gridTemplateColumns: "1fr", gap: 20 } : {}),
    }),
    [isNarrow]
  );
  const studyImageStyle = useMemo(
    () => ({
      ...styles.study.imgWrap,
      ...(isNarrow
        ? { height: "clamp(220px, 55vw, 380px)", minHeight: 0 }
        : {}),
    }),
    [isNarrow]
  );
  const studyPillWrapStyle = useMemo(
    () => ({
      ...styles.study.pillWrap,
      ...(isNarrow
        ? { gridTemplateColumns: "1fr", gridAutoRows: "minmax(60px, auto)" }
        : {}),
    }),
    [isNarrow]
  );
  const studyPillStyle = useMemo(
    () => ({
      ...styles.study.pill,
      ...(isNarrow
        ? { minHeight: 60, padding: "14px 16px", fontSize: 16 }
        : {}),
    }),
    [isNarrow]
  );

  /* Title & Text mobile tweaks */
  const studMagTitleStyle = useMemo(
    () => ({
      ...styles.study.title,
      ...(isNarrow ? { textAlign: "center" } : {}),
    }),
    [isNarrow]
  );
  const studMagTextStyle = useMemo(
    () => ({
      ...styles.study.text,
      ...(isNarrow
        ? { textAlign: "justify", textJustify: "inter-word", hyphens: "auto" }
        : {}),
    }),
    [isNarrow]
  );

  /* Intern layout */
  const internGrid = useMemo(
    () => ({
      display: "grid",
      gridTemplateColumns: isNarrow ? "1fr" : "1fr minmax(260px, 560px)",
      gap: isNarrow ? 20 : 28,
      alignItems: "stretch",
    }),
    [isNarrow]
  );
  const internArtContainer = useMemo(
    () => ({
      position: "relative",
      width: "100%",
      height: isNarrow ? "clamp(220px, 55vw, 380px)" : "100%",
      minHeight: isNarrow ? undefined : "clamp(240px, 45vh, 560px)",
      borderRadius: 0,
      overflow: "visible",
    }),
    [isNarrow]
  );
  const internBackAbs = {
    position: "absolute",
    left: "0%",
    bottom: "0%",
    width: "50%",
    height: "48%",
    borderRadius: 18,
    overflow: "hidden",
    background: PALETTE.surface,
    boxShadow: "0 24px 44px rgba(15,23,42,.16)",
    transform: "rotate(-2deg)",
  };
  const internFrontAbs = {
    position: "absolute",
    right: "2%",
    top: "4%",
    width: "72%",
    height: "72%",
    borderRadius: 26,
    overflow: "hidden",
    background: PALETTE.white,
    border: `10px solid ${PALETTE.ink}`,
    boxShadow: "0 28px 52px rgba(15,23,42,.22)",
    transform: "rotate(3deg)",
  };

  const internBenefits = useMemo(
    () =>
      content.internSection?.benefits?.length
        ? content.internSection.benefits
        : [
            { icon: "🌍", label: "Pengalaman internasional" },
            { icon: "💸", label: "Gaji per jam" },
            { icon: "📈", label: "Peluang kerja" },
            { icon: "🤝", label: "Relasi" },
          ],
    [content.internSection?.benefits]
  );

  /* ===== Description styles ===== */
  const descTitleStyle = useMemo(
    () => ({ ...styles.desc.title, fontSize: isNarrow ? 30 : 44 }),
    [isNarrow]
  );

  // paragraf deskripsi selebar container di desktop
  const descBodyStyle = useMemo(
    () => ({
      ...styles.desc.body,
      maxWidth: "unset",
      ...(isNarrow
        ? { textAlign: "left", fontSize: 16, lineHeight: 1.85 }
        : {}),
    }),
    [isNarrow]
  );

  const descBodyWrapStyle = useMemo(
    () => ({
      ...styles.desc.bodyWrap,
      ...(isNarrow ? styles.desc.cardMobile : {}),
    }),
    [isNarrow]
  );

  /* ===== Levels responsive ===== */
  const levelsInnerStyle = useMemo(
    () => ({
      ...styles.levels.inner,
      ...(isNarrow
        ? { gridTemplateColumns: "1fr", textAlign: "center", gap: 24 }
        : {}),
    }),
    [isNarrow]
  );

  return (
    <div
      className="page-wrap"
      style={{ paddingBottom: 48, fontFamily: FONT_FAMILY }}
    >
      {/* ===== HERO ===== */}
      <section style={{ padding: "0 0 24px" }}>
        <div style={sectionInnerStyle}>
          <div
            style={heroWrapperStyle}
            ref={heroRef}
            className="reveal"
            data-anim="zoom"
          >
            <div
              style={styles.hero.left}
              className="reveal js-hero-copy"
              data-anim="left"
            >
              {isLoading ? (
                <Skeleton active paragraph={{ rows: 2 }} />
              ) : (
                <>
                  <h1
                    className="reveal"
                    data-anim="down"
                    style={heroHeadingStyle}
                  >
                    {hero.title}
                  </h1>
                  {hero.subtitle ? (
                    <p
                      className="reveal"
                      data-anim="up"
                      style={styles.hero.tagline}
                    >
                      {hero.subtitle}
                    </p>
                  ) : null}
                </>
              )}
            </div>

            <div
              style={styles.hero.right}
              className="reveal"
              data-anim="right"
              aria-hidden
            >
              {isLoading ? (
                <Skeleton.Image
                  active
                  style={{ width: "100%", height: 240, borderRadius: 18 }}
                />
              ) : hero.illustration ? (
                <div style={heroArtStyle}>
                  <Img
                    src={hero.illustration}
                    alt=""
                    style={styles.hero.globe}
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
            <h2 className="reveal" data-anim="down" style={descTitleStyle}>
              {String(locale).slice(0, 2).toLowerCase() === "en"
                ? "Program Description"
                : "Deskripsi Program"}
            </h2>
            <div style={descBodyWrapStyle}>
              {isLoading ? (
                <Skeleton active paragraph={{ rows: 4 }} />
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
        </div>
      </section>

      {/* ===== STUDY ===== */}
      <section style={styles.study.section}>
        <div style={sectionInnerStyle}>
          <div style={studyGridStyle}>
            <div
              className="reveal"
              data-anim="left"
              data-rvd="40ms"
              style={studyImageStyle}
            >
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

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
              }}
            >
              <h2
                className="reveal"
                data-anim="right"
                data-rvd="80ms"
                style={studMagTitleStyle}
              >
                {content.studySection?.title}
              </h2>
              <p
                className="reveal"
                data-anim="up"
                data-rvd="120ms"
                style={studMagTextStyle}
              >
                {content.studySection?.text}
              </p>
              <div style={{ height: 8 }} />
              <div
                className="reveal"
                data-anim="zoom"
                data-rvd="180ms"
                style={studyPillWrapStyle}
              >
                {(content.studySection?.pills || []).map((p, i) => (
                  <div
                    key={p.id || i}
                    className="pill-item"
                    style={studyPillStyle}
                  >
                    <span style={styles.study.pillIcon}>{p.icon}</span>
                    <span>{p.label}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: "auto" }} />
            </div>
          </div>
        </div>
      </section>

      {/* ===== INTERN ===== */}
      <section style={styles.study.section}>
        <div style={sectionInnerStyle}>
          <div style={internGrid}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
              }}
            >
              <h2
                className="reveal"
                data-anim="left"
                data-rvd="80ms"
                style={studMagTitleStyle}
              >
                {content.internSection?.title}
              </h2>
              <p
                className="reveal"
                data-anim="up"
                data-rvd="120ms"
                style={studMagTextStyle}
              >
                {content.internSection?.text}
              </p>

              <div
                className="reveal intern-chips"
                data-anim="up"
                data-rvd="160ms"
                style={{
                  ...styles.intern.chipsWrap,
                  ...(isNarrow ? { gridTemplateColumns: "1fr" } : {}),
                }}
              >
                {(content.internSection?.benefits || []).map((b, i) => (
                  <div
                    key={i}
                    style={{
                      ...styles.intern.chip,
                      ...(isNarrow
                        ? { minHeight: 60, fontSize: 15, padding: "12px 14px" }
                        : {}),
                    }}
                  >
                    <span style={styles.intern.chipIcon}>{b.icon}</span>
                    <span>{b.label}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: "auto" }} />
            </div>

            <div
              className="reveal"
              data-anim="right"
              data-rvd="40ms"
              style={internArtContainer}
            >
              <div
                className="reveal"
                data-anim="zoom"
                data-rvd="120ms"
                style={internBackAbs}
              >
                <Img
                  src={content.internSection?.subImage}
                  alt="Internship secondary"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
              <div
                className="reveal"
                data-anim="zoom"
                data-rvd="200ms"
                style={internFrontAbs}
              >
                <Img
                  src={content.internSection?.mainImage}
                  alt="Internship main"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== LEVEL KAMPUS (Replacement of CTA) ===== */}
      <section style={styles.levels.section}>
        <div style={sectionInnerStyle}>
          <div className="reveal" data-anim="zoom" style={styles.levels.wrap}>
            <div style={levelsInnerStyle}>
              {/* LEFT (Title + Illustration) */}
              <div style={styles.levels.left}>
                <h3
                  className="reveal"
                  data-anim="down"
                  data-rvd="60ms"
                  style={styles.levels.heading}
                >
                  {content.levelsSection?.title}
                </h3>
                <Img
                  src={content.levelsSection?.image}
                  alt=""
                  style={styles.levels.art}
                />
              </div>

              {/* RIGHT (Items) */}
              <div style={styles.levels.right}>
                {(content.levelsSection?.items || []).map((it, idx) => (
                  <div
                    key={idx}
                    className="reveal"
                    data-anim="up"
                    data-rvd={`${80 + idx * 60}ms`}
                    style={styles.levels.item}
                  >
                    <CheckBadge />
                    <div>
                      <h4 style={styles.levels.itemTitle}>{it.title}</h4>
                      <p style={styles.levels.itemText}>{it.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== GLOBAL STYLES ===== */}
      <style jsx global>{`
        ::selection {
          background: ${PALETTE.primary};
          color: ${PALETTE.white};
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

        /* Rich content */
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
          color: ${PALETTE.primary};
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

        @media (prefers-reduced-motion: reduce) {
          .reveal {
            transition: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
          .pill-item {
            transform: none !important;
          }
        }

        @media (hover: hover) {
          .pill-item {
            transition: transform 0.18s ease, filter 0.18s ease;
          }
          .pill-item:hover {
            transform: translateY(-2px);
            filter: saturate(1.06);
          }
        }

        /* Levels hover microinteraction */
        @media (hover: hover) {
          .reveal[style*="grid-template-columns: 40px 1fr"] {
            transition: background 0.18s ease, box-shadow 0.18s ease;
          }
          .reveal[style*="grid-template-columns: 40px 1fr"]:hover {
            background: rgba(255, 255, 255, 0.5);
            box-shadow: 0 6px 16px rgba(11, 86, 201, 0.06);
            border-radius: 12px;
            padding: 6px 8px;
          }
        }
      `}</style>
    </div>
  );
}
