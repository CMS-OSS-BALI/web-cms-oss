"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Skeleton } from "antd";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import "swiper/css";

import useVisaViewModel from "./useVisaViewModel";
import { sanitizeHtml } from "@/app/utils/dompurify";

/* ============================= */
/* Locale helper (client-side, konsisten dengan halaman lain) */
const pickLocaleClient = (lang, ls, fallback = "id") => {
  const v = String(lang || ls || fallback)
    .slice(0, 2)
    .toLowerCase();
  return v === "en" ? "en" : "id";
};

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
      if (copy) {
        copy.style.transform = `translate3d(${cx * 6}px, ${cy * 6}px, 0)`;
      }
    };
    const onLeave = () => {
      if (copy) copy.style.transform = "";
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
    illo: {
      justifySelf: "end",
      alignSelf: "end",
      width: 420,
      height: 420,
      objectFit: "contain",
      filter: "drop-shadow(0 10px 20px rgba(0,0,0,.18))",
      zIndex: 1,
      display: "block",
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

  /* ---------- BENEFIT SLIDER (10 CARD) ---------- */
  benefitSlider: {
    section: { padding: "32px 0 80px", marginTop: 12 },
    header: {
      textAlign: "center",
      marginBottom: 18,
    },
    heading: {
      margin: 0,
      fontWeight: 800,
      fontSize: "clamp(22px, 3vw, 28px)",
      letterSpacing: ".02em",
      color: "#0B56C9",
      textTransform: "uppercase",
    },
    underline: {
      margin: "10px auto 0",
      width: 260,
      height: 3,
      borderRadius: 999,
      background: "#0B56C9",
    },
    track: {
      marginTop: 24,
      width: "100vw",
      marginLeft: "calc(50% - 50vw)",
      background: "transparent",
      borderRadius: 0,
      padding: 0,
      boxShadow: "none",
      overflow: "visible",
    },
  },

  /* ---------- PREMIUM ADVANTAGES SECTION ---------- */
  premium: {
    section: { padding: "16px 0 80px" },

    card: {
      position: "relative",
      display: "grid",
      gridTemplateColumns: "minmax(0, 1.3fr) minmax(0, 1.1fr)",
      alignItems: "center",
      columnGap: 48,
    },
    cardNarrow: {
      gridTemplateColumns: "1fr",
      rowGap: 28,
    },

    photoCol: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    photoFrame: {
      width: "100%",
      maxWidth: 520,
    },
    photo: {
      width: "100%",
      height: "auto",
      maxHeight: 520,
      objectFit: "contain",
      objectPosition: "center bottom",
      borderRadius: 24,
      display: "block",
    },

    copyCol: {
      padding: "0 0 0 32px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
    },
    header: {
      textAlign: "left",
      marginBottom: 10,
    },
    heading: {
      margin: 0,
      fontWeight: 800,
      fontSize: "clamp(22px, 3vw, 28px)",
      letterSpacing: ".02em",
      color: "#0B56C9",
    },
    underline: {
      marginTop: 10,
      width: 260,
      maxWidth: "60%",
      height: 3,
      borderRadius: 999,
      background: "#0B56C9",
    },
    list: {
      marginTop: 26,
      display: "grid",
      rowGap: 22,
    },
    item: {
      display: "grid",
      gridTemplateColumns: "60px 1fr",
      columnGap: 18,
      alignItems: "flex-start",
    },
    iconWrap: {
      width: 60,
      height: 60,
      borderRadius: "999px",
      background: "#FFFFFF",
      display: "grid",
      placeItems: "center",
      boxShadow: "0 10px 24px rgba(15,23,42,.12)",
      flexShrink: 0,
    },
    icon: {
      width: 32,
      height: 32,
      objectFit: "contain",
      display: "block",
    },
    itemTitle: {
      margin: "2px 0 4px",
      fontWeight: 700,
      fontSize: 16,
      color: "#0B56C9",
    },
    itemDesc: {
      margin: 0,
      fontSize: 14.5,
      color: "#374151",
      lineHeight: 1.7,
    },
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
      title={alt || ""}
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

export default function VisaContent({
  initialLocale = "id",
  locale: localeProp,
}) {
  const search = useSearchParams();
  const heroRef = useRef(null);

  /* -------- Locale ala EventsUContent (anti hydration mismatch) -------- */
  const baseLocale = initialLocale || localeProp || "id";

  const locale = useMemo(() => {
    const fromQuery = search?.get("lang") || "";
    const fromLs =
      typeof window !== "undefined"
        ? window.localStorage.getItem("oss.lang") || ""
        : "";
    return pickLocaleClient(fromQuery || baseLocale, fromLs);
  }, [search, baseLocale]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("oss.lang", locale);
      } catch {
        // ignore
      }
    }
  }, [locale]);

  const { content, isLoading, locale: lk } = useVisaViewModel({ locale });

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

  /* derived styles */
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
      minHeight: isNarrow ? 260 : isTablet ? 340 : 380,
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

  const illoStyle = useMemo(
    () => ({
      ...styles.hero.illo,
      width: isNarrow ? 260 : isTablet ? 340 : 420,
      height: isNarrow ? 260 : isTablet ? 340 : 420,
      justifySelf: isNarrow ? "center" : "end",
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

  const premiumCardStyle = useMemo(
    () => ({
      ...styles.premium.card,
      ...(isNarrow ? styles.premium.cardNarrow : {}),
    }),
    [isNarrow]
  );

  const premiumCopyColStyle = useMemo(
    () => ({
      ...styles.premium.copyCol,
      padding: isNarrow ? "0 0 0 0" : styles.premium.copyCol.padding,
      order: isNarrow ? 1 : 0,
    }),
    [isNarrow]
  );

  const premiumPhotoColStyle = useMemo(
    () => ({
      ...styles.premium.photoCol,
      marginTop: isNarrow ? 20 : 0,
      order: isNarrow ? 2 : 0,
    }),
    [isNarrow]
  );

  const isEn = lk === "en";

  /* config slider Benefit */
  const benefitCards = content.benefits || [];
  const benefitLoop = benefitCards.length > 5;
  const benefitAutoplay = benefitLoop
    ? {
        delay: 0,
        disableOnInteraction: false,
        pauseOnMouseEnter: true,
        waitForTransition: false,
      }
    : false;
  const benefitSpeed = 9000;

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

  /* data section premium dari ViewModel */
  const premium = content.premium || {};
  const premiumHeading =
    premium.heading ||
    (isEn
      ? "Premium Advantages of OSS Bali Visa Services"
      : "Keunggulan Premium Layanan Visa di OSS Bali");
  const premiumItems = premium.items || [];
  const premiumImage = premium.image || "/visa-premium/premium-photo.jpg";

  return (
    <div
      className="page-wrap"
      style={{ paddingBottom: 52, fontFamily: FONT_FAMILY }}
    >
      {/* ===== HERO ===== */}
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
                    {content.hero?.title}
                  </h1>
                  {content.hero?.subtitle ? (
                    <p
                      className="reveal"
                      data-anim="up"
                      data-rvd="80ms"
                      style={styles.hero.subtitle}
                    >
                      {content.hero.subtitle}
                    </p>
                  ) : null}
                </>
              )}
            </div>

            {!isLoading && content.hero?.illustration ? (
              <Img
                src={content.hero.illustration}
                alt="Visa illustration"
                style={illoStyle}
                className="anim-illo"
                aria-hidden
              />
            ) : null}
          </div>
        </div>
      </section>

      {/* ===== DESCRIPTION ===== */}
      <section style={styles.desc.section}>
        <div style={sectionInnerStyle}>
          <h2 className="reveal" data-anim="down" style={descHeadingStyle}>
            {isEn ? "Program Description" : "Deskripsi Program"}
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
                data-rvd="60ms"
                style={descBodyStyle}
                dangerouslySetInnerHTML={{ __html: safeDescription }}
              />
            )}
          </div>
        </div>
      </section>

      {/* ===== BENEFIT SLIDER (10 CARD) ===== */}
      <section style={styles.benefitSlider.section}>
        <div style={sectionInnerStyle}>
          <div
            className="reveal"
            data-anim="down"
            style={styles.benefitSlider.header}
          >
            <h3 style={styles.benefitSlider.heading}>
              {isEn
                ? "Benefits of OSS Bali Visa Apply Service"
                : "Benefit Menggunakan Layanan Visa Apply OSS Bali"}
            </h3>
            <div style={styles.benefitSlider.underline} />
          </div>
        </div>

        <div
          className="reveal"
          data-anim="zoom"
          data-rvd="60ms"
          style={styles.benefitSlider.track}
        >
          <Swiper
            className="doc-type-swiper"
            modules={[Autoplay]}
            slidesPerView="auto"
            spaceBetween={18}
            loop={benefitLoop}
            loopAdditionalSlides={
              benefitLoop ? Math.max(10, benefitCards.length) : 0
            }
            speed={benefitSpeed}
            allowTouchMove
            autoplay={benefitAutoplay}
            observer
            observeParents
            watchSlidesProgress
          >
            {benefitCards.map((card) => (
              <SwiperSlide key={card.key}>
                <article className="doc-type-card">
                  <img
                    className="doc-type-icon"
                    src={card.icon}
                    alt={isEn ? card.labelEn : card.labelId}
                    title={isEn ? card.labelEn : card.labelId}
                    loading="lazy"
                  />
                  <p className="doc-type-label">
                    {isEn ? card.labelEn : card.labelId}
                  </p>
                </article>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </section>

      {/* ===== PREMIUM ADVANTAGES SECTION ===== */}
      <section style={styles.premium.section}>
        <div style={sectionInnerStyle}>
          <div className="reveal" data-anim="zoom" style={premiumCardStyle}>
            {/* TEXT & ICON LIST (di mobile: di atas) */}
            <div style={premiumCopyColStyle}>
              <div style={styles.premium.header}>
                <h3 style={styles.premium.heading}>{premiumHeading}</h3>
                <div style={styles.premium.underline} />
              </div>

              <div style={styles.premium.list}>
                {premiumItems.map((item) => (
                  <div key={item.key} style={styles.premium.item}>
                    <div style={styles.premium.iconWrap}>
                      <img
                        src={item.icon}
                        alt={item.title}
                        style={styles.premium.icon}
                      />
                    </div>
                    <div>
                      <p style={styles.premium.itemTitle}>{item.title}</p>
                      <p style={styles.premium.itemDesc}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* PHOTO (di mobile: di bawah) */}
            <div style={premiumPhotoColStyle}>
              <div style={styles.premium.photoFrame}>
                <Img
                  src={premiumImage}
                  alt={premiumHeading}
                  style={styles.premium.photo}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section style={{ marginTop: 0, ...styles.cta.section }}>
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

      {/* ===== GLOBAL STYLE ===== */}
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

        /* Animasi hero illustration */
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
        :global(.anim-illo) {
          animation: floatY 7s ease-in-out infinite;
        }

        /* ===== Slider Benefit (Swiper) ===== */
        :global(:root) {
          --doc-card-w: clamp(220px, 24vw, 260px);
        }

        :global(.doc-type-swiper) {
          overflow: visible;
          padding-block: 4px;
        }

        :global(.doc-type-swiper .swiper-wrapper) {
          transition-timing-function: linear !important;
          align-items: stretch;
        }

        :global(.doc-type-swiper .swiper-slide) {
          width: var(--doc-card-w);
          height: auto;
          display: flex;
        }

        :global(.doc-type-card) {
          width: 100%;
          height: 100%;
          min-height: 200px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          text-align: center;
          padding: 18px 18px 20px;
          border-radius: 22px;
          background: radial-gradient(
              140% 120% at -10% -10%,
              rgba(255, 255, 255, 0.28) 0%,
              transparent 45%
            ),
            linear-gradient(180deg, #0b56c9 0%, #084a94 55%, #063e7c 100%);
          box-shadow: 0 18px 34px rgba(8, 42, 116, 0.38);
          color: #ffffff;
        }

        /* 🔎 Ukuran ikon mengikuti referensi (level-kampus-icon) */
        :global(.doc-type-icon) {
          width: 128px;
          height: 128px;
          object-fit: contain;
          display: block;
          margin-bottom: 14px;
          flex-shrink: 0;
        }

        :global(.doc-type-label) {
          margin: 0;
          font-weight: 600;
          font-size: 14px;
          letter-spacing: 0.01em;
        }

        /* ✨ Hover: card sedikit membesar (mengikuti level-kampus-card) */
        @media (hover: hover) {
          :global(.doc-type-card) {
            transition: transform 0.18s ease, box-shadow 0.18s ease,
              filter 0.18s ease;
          }
          :global(.doc-type-card:hover) {
            transform: translateY(-4px) scale(1.04);
            filter: saturate(1.08);
            box-shadow: 0 24px 44px rgba(8, 42, 116, 0.45);
          }
        }

        @media (max-width: 767px) {
          :global(.doc-type-card) {
            padding: 14px 14px 16px;
          }

          /* Ikon tetap lebih besar di mobile tapi tidak kebesaran,
             mengikuti pola 92x92 dari level-kampus-icon */
          :global(.doc-type-icon) {
            width: 92px;
            height: 92px;
          }
        }

        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          :global(.reveal) {
            transition: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
          :global(.anim-illo) {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
