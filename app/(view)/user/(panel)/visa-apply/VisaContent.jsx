"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Skeleton } from "antd";
import useVisaViewModel from "./useVisaViewModel";
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
    wrapper: {
      background: "#0B56C9",
      borderRadius: 28,
      borderTopRightRadius: 120,
      borderBottomLeftRadius: 120,
      minHeight: 360,
      padding: "42px 56px",
      margin: "-6px auto 0 auto",
      display: "grid",
      gridTemplateColumns: "1.15fr .85fr",
      gap: 28,
      alignItems: "center",
      color: "#fff",
      boxShadow: "0 24px 54px rgba(3,30,88,.26)",
      width: "calc(100% - 80px)",
      position: "relative",
      overflow: "hidden",
    },
    left: {
      minWidth: 0,
      textAlign: "left",
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      gap: 10,
    },
    right: { display: "flex", justifyContent: "center" },
    heading: {
      margin: 0,
      fontSize: 56,
      lineHeight: 1.08,
      fontWeight: 900,
      letterSpacing: ".01em",
      color: "#fff",
      textTransform: "none",
    },
    tagline: {
      margin: "16px 0 0",
      fontSize: 16,
      lineHeight: 1.9,
      color: "rgba(255,255,255,.94)",
      textAlign: "justify",
      maxWidth: 640,
      letterSpacing: ".01em",
    },
    illu: { width: "min(480px, 92%)", height: 320 },
  },

  /* ---------- DESCRIPTION ---------- */
  desc: {
    wrap: { marginTop: 56 },
    title: {
      margin: "0 0 12px",
      fontWeight: 900,
      fontSize: 40,
      letterSpacing: ".005em",
      color: "#0b0d12",
    },
    text: {
      fontSize: 18,
      lineHeight: 2.0,
      letterSpacing: ".01em",
      color: "#0b0d12",
      margin: 0,
      textAlign: "justify",
      textJustify: "inter-word",
      hyphens: "auto",
    },
  },

  /* ---------- TITLE BAR ---------- */
  bar: {
    bleed: {
      width: "100vw",
      minHeight: 56,
      paddingInline: "clamp(12px, 4vw, 28px)",
      marginLeft: "calc(50% - 50vw)",
      marginRight: "calc(50% - 50vw)",
      display: "grid",
      placeItems: "center",
      background: "#0B56C9",
      color: "#fff",
      fontWeight: 900,
      letterSpacing: ".01em",
      textTransform: "uppercase",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      fontSize: "clamp(12px, 3.6vw, 28px)",
      boxShadow: "0 8px 22px rgba(11,86,201,.28)",
    },
  },

  /* ---------- BENEFITS ---------- */
  benefits: {
    heading: {
      margin: 0,
      textAlign: "center",
      fontFamily: FONT_FAMILY,
      fontWeight: 900,
      textTransform: "uppercase",
      letterSpacing: ".02em",
      color: "#0B56C9",
      fontSize: "clamp(22px, 3.4vw, 34px)",
    },
    sub: {
      margin: "8px auto 28px",
      textAlign: "center",
      maxWidth: 760,
      color: "#475569",
      fontWeight: 500,
      fontSize: "clamp(12px, 1.6vw, 16px)",
    },
    railWrap: { position: "relative", paddingTop: 24 },
    railLine: {
      position: "absolute",
      left: "6%",
      right: "6%",
      top: 92,
      height: 6,
      borderRadius: 999,
      background: "#0B56C9",
      boxShadow: "0 4px 14px rgba(11,86,201,.25)",
      zIndex: 0,
    },
    grid: {
      position: "relative",
      display: "grid",
      gridTemplateColumns: "repeat(3,1fr)",
      gap: 28,
      alignItems: "start",
      zIndex: 1,
    },
    gridMobile: { gridTemplateColumns: "1fr" },
    item: { textAlign: "center", paddingTop: 24 },
    icon: {
      width: 116,
      height: 116,
      margin: "0 auto",
      transform: "translateY(-30px)",
      display: "block",
      objectFit: "contain",
      filter: "drop-shadow(0 10px 20px rgba(15,23,42,.16))",
      transition: "transform .18s ease, filter .18s ease",
    },
    iconMobile: { width: 90, height: 90, transform: "translateY(0)" },
    title: {
      margin: "0 0 6px",
      fontWeight: 800,
      fontSize: "clamp(16px, 2.2vw, 20px)",
      color: "#0F172A",
      letterSpacing: ".01em",
    },
    desc: {
      margin: 0,
      color: "#334155",
      fontSize: "clamp(12px,1.6vw,14px)",
      lineHeight: 1.65,
    },
    hideRail: { display: "none" },
  },

  /* ---------- CTA ---------- */
  cta: {
    section: { padding: "8px 0 70px" },
    shell: { position: "relative", padding: "22px 22px 0" },
    backPlate: {
      position: "absolute",
      left: 0,
      top: 36,
      bottom: 24,
      width: 28,
      background: "#0A4CAB",
      borderRadius: 16,
      boxShadow: "0 12px 28px rgba(10,76,171,.35)",
    },
    card: {
      position: "relative",
      background:
        "linear-gradient(180deg,#D6EFFF 0%, #C6E8FF 60%, #CDEEFF 100%)",
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
      margin: "0 0 12px",
      fontWeight: 900,
      fontSize: "clamp(26px, 3.1vw, 48px)",
      lineHeight: 1.16,
      color: "#0B3E91",
      letterSpacing: ".02em",
      textTransform: "uppercase",
      textAlign: "center",
    },
    desc: {
      margin: "0 auto",
      textAlign: "center",
      maxWidth: 920,
      color: "#0B1E3A",
      fontWeight: 600,
      fontSize: "clamp(14px, 1.15vw, 20px)",
      lineHeight: 1.6,
    },
    btnWrap: { display: "flex", justifyContent: "center" },
    btn: {
      display: "inline-block",
      background: "#0B56C9",
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
      transform: "translateZ(0)",
    },
  },
};

/* -------- helper image -------- */
function Img({ src, alt, style, className }) {
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={
        src ||
        "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=1200&auto=format&fit=crop"
      }
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

export default function VisaContent({ locale = "id" }) {
  const heroRef = useRef(null);
  const { content, isLoading, locale: lk } = useVisaViewModel({ locale });

  /* responsive flag */
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

  /* derived styles */
  const sectionInnerStyle = useMemo(
    () => ({
      ...styles.sectionInner,
      width: isNarrow ? "min(100%, 94%)" : "min(1280px, 94%)",
    }),
    [isNarrow]
  );

  const heroWrapperStyle = useMemo(
    () => ({
      ...styles.hero.wrapper,
      gridTemplateColumns: isNarrow ? "1fr" : "1.15fr .85fr",
      padding: isNarrow ? "28px 24px" : "42px 56px",
      minHeight: isNarrow ? 300 : 360,
      width: isNarrow ? "100%" : "calc(100% - 80px)",
      borderTopRightRadius: isNarrow ? 72 : 120,
      borderBottomLeftRadius: isNarrow ? 72 : 120,
    }),
    [isNarrow]
  );

  const safeDescription = sanitizeHtml(content.description || "", {
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

  return (
    <div
      className="page-wrap"
      style={{ paddingBottom: 52, fontFamily: FONT_FAMILY }}
    >
      {/* ===== HERO ===== */}
      <section style={{ padding: "6px 0 24px" }}>
        <div style={sectionInnerStyle}>
          <div
            ref={heroRef}
            style={heroWrapperStyle}
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
                    style={{
                      ...styles.hero.heading,
                      fontSize: isNarrow ? 34 : 56,
                    }}
                  >
                    {content.hero?.title}
                  </h1>
                  {content.hero?.subtitle ? (
                    <p
                      className="reveal"
                      data-anim="up"
                      data-rvd="80ms"
                      style={styles.hero.tagline}
                    >
                      {content.hero.subtitle}
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
              ) : (
                <div
                  style={{
                    ...styles.hero.illu,
                    width: isNarrow ? "100%" : "min(480px,92%)",
                    height: isNarrow ? 220 : 320,
                  }}
                >
                  <Img
                    src={content.hero?.illustration}
                    alt="Visa illustration"
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
      <section style={{ padding: "0 0 16px", marginTop: 56 }}>
        <div style={sectionInnerStyle}>
          <div style={styles.desc.wrap}>
            <h2
              className="reveal"
              data-anim="down"
              style={{ ...styles.desc.title, fontSize: isNarrow ? 30 : 40 }}
            >
              {lk === "en" ? "Program Description" : "Deskripsi Program"}
            </h2>
            {isLoading ? (
              <Skeleton active paragraph={{ rows: 5 }} />
            ) : (
              <div
                className="reveal desc-content"
                data-anim="up"
                data-rvd="60ms"
                style={{
                  ...styles.desc.text,
                  fontSize: isNarrow ? 16.5 : 18,
                  lineHeight: isNarrow ? 1.9 : 2.0,
                }}
                dangerouslySetInnerHTML={{ __html: safeDescription }}
              />
            )}
          </div>
        </div>
      </section>

      {/* ===== TITLE BAR ===== */}
      <section style={{ marginTop: 64 }}>
        <div
          className="reveal"
          data-anim="zoom"
          style={{ ...styles.bar.bleed }}
        >
          {content.hero?.title}
        </div>
      </section>

      {/* ===== POSTER ===== */}
      <section style={{ marginTop: 64 }}>
        <div style={sectionInnerStyle}>
          {isLoading ? (
            <Skeleton.Image
              active
              style={{ width: "100%", height: 420, borderRadius: 18 }}
            />
          ) : (
            <Img
              src={content.poster?.src}
              alt={content.poster?.alt}
              style={{
                width: "100%",
                height: "auto",
                display: "block",
                borderRadius: 18,
                boxShadow: "0 10px 24px rgba(15,23,42,.06)",
              }}
            />
          )}
        </div>
      </section>

      {/* ===== BENEFITS ===== */}
      <section style={{ marginTop: 64 }}>
        <div style={sectionInnerStyle}>
          <h3
            className="reveal"
            data-anim="down"
            style={styles.benefits.heading}
          >
            {lk === "en" ? "EXCLUSIVE BENEFITS" : "MANFAAT EKSKLUSIF"}
          </h3>
          <p className="reveal" data-anim="up" style={styles.benefits.sub}>
            {lk === "en"
              ? "Exclusive opportunity to make your study and career dreams come true!"
              : "Kesempatan eksklusif untuk wujudkan studi dan karir impianmu!"}
          </p>

          <div
            className="reveal"
            data-anim="zoom"
            style={styles.benefits.railWrap}
          >
            <div
              style={{
                ...styles.benefits.railLine,
                ...(isNarrow ? styles.benefits.hideRail : {}),
              }}
              aria-hidden
            />
            <div
              style={{
                ...styles.benefits.grid,
                ...(isNarrow ? styles.benefits.gridMobile : {}),
              }}
            >
              {(content.benefits || []).slice(0, 3).map((b, i) => (
                <div
                  key={b.id}
                  data-rvd={`${80 + i * 80}ms`}
                  className="reveal"
                  data-anim="up"
                  style={styles.benefits.item}
                >
                  <Img
                    src={b.icon}
                    alt={b.title}
                    style={{
                      ...styles.benefits.icon,
                      ...(isNarrow ? styles.benefits.iconMobile : {}),
                    }}
                    className="benefit-icon"
                  />
                  <div style={styles.benefits.title}>{b.title}</div>
                  <p style={styles.benefits.desc}>{b.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section style={{ marginTop: 72, ...styles.cta.section }}>
        <div style={sectionInnerStyle}>
          <div className="reveal" data-anim="zoom" style={styles.cta.shell}>
            <div style={styles.cta.backPlate} aria-hidden />
            <div style={styles.cta.card}>
              <div
                style={{
                  ...styles.cta.inner,
                  gridTemplateColumns: isNarrow ? "1fr" : "1fr auto",
                }}
              >
                <div>
                  <h2
                    className="reveal"
                    data-anim="down"
                    style={styles.cta.title}
                  >
                    {content.cta?.title}
                  </h2>
                  <p
                    className="reveal"
                    data-anim="up"
                    data-rvd="80ms"
                    style={styles.cta.desc}
                  >
                    {content.cta?.subtitle}
                  </p>
                </div>

                {content.cta?.button?.href && (
                  <div
                    className="reveal"
                    data-anim="zoom"
                    data-rvd="160ms"
                    style={styles.cta.btnWrap}
                  >
                    <a
                      href={content.cta.button.href}
                      style={styles.cta.btn}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.transform = "translateY(-2px)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.transform = "translateY(0)")
                      }
                    >
                      {content.cta.button.label}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== SINGLE GLOBAL STYLE (avoid styled-jsx panic) ===== */}
      <style jsx>{`
        :global(::selection) {
          background: #0b56c9;
          color: #fff;
        }
        :global(html),
        :global(body) {
          overflow-x: clip;
        }

        /* Reveal */
        :global(.reveal) {
          opacity: 0;
          transform: var(--reveal-from, translate3d(0, 18px, 0));
          transition: opacity 680ms ease,
            transform 680ms cubic-bezier(0.21, 1, 0.21, 1);
          transition-delay: var(--rvd, 0ms);
          will-change: opacity, transform;
        }
        :global(.reveal[data-anim="up"]) {
          --reveal-from: translate3d(0, 18px, 0);
        }
        :global(.reveal[data-anim="down"]) {
          --reveal-from: translate3d(0, -18px, 0);
        }
        :global(.reveal[data-anim="left"]) {
          --reveal-from: translate3d(-18px, 0, 0);
        }
        :global(.reveal[data-anim="right"]) {
          --reveal-from: translate3d(18px, 0, 0);
        }
        :global(.reveal[data-anim="zoom"]) {
          --reveal-from: scale(0.96);
        }
        :global(.reveal.is-visible) {
          opacity: 1;
          transform: none;
        }

        /* Rich content */
        :global(.desc-content p) {
          margin: 10px 0 0;
        }
        :global(.desc-content p + p) {
          margin-top: 10px;
        }
        :global(.desc-content ul),
        :global(.desc-content ol) {
          margin: 10px 0 0;
          padding-left: 1.25rem;
        }
        :global(.desc-content li) {
          margin: 6px 0;
        }
        :global(.desc-content a) {
          color: #0b56c9;
          text-decoration: underline;
          text-underline-offset: 2px;
          text-decoration-thickness: 1.5px;
        }
        :global(.desc-content img) {
          max-width: 100%;
          height: auto;
          border-radius: 12px;
          margin: 10px 0;
        }

        /* Micro-interactions */
        @media (hover: hover) {
          :global(.chip) {
            transition: transform 0.18s ease, filter 0.18s ease;
          }
          :global(.chip:hover) {
            transform: translateY(-2px);
            filter: saturate(1.06);
          }
          :global(.benefit-icon:hover) {
            transform: translateY(-34px) scale(1.03) !important;
            filter: drop-shadow(0 14px 26px rgba(11, 86, 201, 0.25)) !important;
          }
        }

        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          :global(.reveal) {
            transition: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
          :global(.chip) {
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
}
