"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Skeleton } from "antd";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import "swiper/css";
import { useSearchParams } from "next/navigation";

import useDocumentTranslateViewModel from "./useDocumentTranslateViewModel";
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

/* ===== Locale helper (client) ===== */
const pickLocaleClient = (lang, ls, fallback = "id") => {
  const v = String(lang || ls || fallback)
    .slice(0, 2)
    .toLowerCase();
  return v === "en" ? "en" : "id";
};

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
    // ilustrasi langsung jadi grid item (tanpa sun wrapper)
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

  /* ---------- SERVICES (JENIS PENERJEMAH) ---------- */
  services: {
    section: { padding: "36px 0 70px" },

    card: {
      display: "grid",
      gridTemplateColumns: "1.1fr .9fr",
      gap: 36,
      alignItems: "center",
    },
    cardNarrow: {
      gridTemplateColumns: "1fr",
    },

    left: {},
    title: {
      margin: 0,
      fontSize: 28,
      lineHeight: 1.3,
      fontWeight: 800,
      color: "#0B56C9",
    },
    underline: {
      marginTop: 12,
      width: 170,
      height: 4,
      borderRadius: 999,
      background: "#0B56C9",
    },
    items: {
      marginTop: 28,
      display: "grid",
      rowGap: 22,
    },
    item: {
      display: "grid",
      gridTemplateColumns: "56px 1fr",
      columnGap: 16,
      alignItems: "flex-start",
    },
    iconWrap: {
      width: 56,
      height: 56,
      borderRadius: "50%",
      background: "#FFFFFF",
      display: "grid",
      placeItems: "center",
      boxShadow: "0 10px 24px rgba(15,23,42,.14)",
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
      fontSize: 18,
      color: "#111827",
    },
    itemDesc: {
      margin: 0,
      fontSize: 14.5,
      color: "#4B5563",
      lineHeight: 1.7,
    },

    // styling langsung ke <img>, tidak ada wrapper card / kotak biru
    heroImg: {
      display: "block",
      maxWidth: "100%",
      height: "auto",
      objectFit: "contain",
      justifySelf: "center",
      alignSelf: "center",
    },
  },

  /* ---------- DOKUMEN APA SAJA (REPLACE WHY) ---------- */
  why: {
    section: { padding: "32px 0 80px", marginTop: 40 },
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
    },
    underline: {
      margin: "10px auto 0",
      width: 230,
      height: 3,
      borderRadius: 999,
      background: "#0B56C9",
    },
    track: {
      marginTop: 24,
      width: "100vw", // full-bleed ke kiri–kanan
      marginLeft: "calc(50% - 50vw)", // keluar dari container tengah
      background: "transparent", // tidak ada panel gelap
      borderRadius: 0,
      padding: 0,
      boxShadow: "none",
      overflow: "visible",
    },
  },

  /* ---------- KENAPA HARUS TRANSLET DI OSS BALI ---------- */
  reasons: {
    section: { padding: "0 0 90px" },
    header: {
      textAlign: "center",
      marginBottom: 24,
    },
    heading: {
      margin: 0,
      fontWeight: 800,
      fontSize: "clamp(22px, 3vw, 28px)",
      letterSpacing: ".02em",
      color: "#0B56C9",
    },
    underline: {
      margin: "10px auto 0",
      width: 280,
      height: 3,
      borderRadius: 999,
      background: "#0B56C9",
    },

    // wrapper utama: cuma layout grid, TANPA card putih / shadow
    card: {
      marginTop: 32,
      display: "grid",
      gridTemplateColumns: "1.4fr .9fr",
      alignItems: "center",
      gap: 32,
      background: "transparent",
      borderRadius: 0,
      boxShadow: "none",
      padding: 0,
    },
    cardNarrow: {
      gridTemplateColumns: "1fr",
      rowGap: 28,
    },

    /* kiri */
    left: {},
    items: {
      display: "grid",
      rowGap: 22,
    },
    item: {
      display: "grid",
      gridTemplateColumns: "64px 1fr",
      alignItems: "flex-start",
      columnGap: 18,
    },
    iconWrap: {
      width: 64,
      height: 64,
      borderRadius: "999px",
      background: "#F3F7FF",
      display: "grid",
      placeItems: "center",
      boxShadow: "0 10px 24px rgba(15,23,42,0.08)",
    },
    icon: {
      width: 36,
      height: 36,
      objectFit: "contain",
      display: "block",
    },
    itemTitle: {
      margin: "2px 0 4px",
      fontWeight: 700,
      fontSize: 18,
      color: "#0B56C9",
    },
    itemDesc: {
      margin: 0,
      fontSize: 14.5,
      color: "#4B5563",
      lineHeight: 1.7,
    },

    /* kanan: foto langsung, tanpa kotak biru */
    right: {
      justifySelf: "end",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    heroImgWrap: {
      width: 360,
      maxWidth: "100%",
      background: "transparent", // HAPUS kotak biru
      borderRadius: 0,
      overflow: "visible",
    },
    heroImg: {
      display: "block",
      width: "100%",
      height: "auto",
      objectFit: "contain",
    },
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

export default function DocumentTranslateContent(props) {
  const { initialLocale, locale: localeProp } = props || {};
  const search = useSearchParams();

  // ===== Locale client-side (sinkron dengan page lain) =====
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
      window.localStorage.setItem("oss.lang", locale);
    }
  }, [locale]);

  const { content, isLoading } = useDocumentTranslateViewModel({ locale });

  const heroRef = useRef(null);
  const isEn = String(locale).slice(0, 2).toLowerCase() === "en";

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

  useRevealOnScroll([
    isLoading,
    content?.documentTypes?.length || 0,
    content?.reasons?.items?.length || 0,
  ]);
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

  const services = content?.services || {};
  const serviceItems = services.items || [];

  const reasons = content?.reasons || {};
  const reasonsItems = reasons.items || [];

  // === config Swiper dokumen, ambil dari view model ===
  const docCards = content?.documentTypes || [];
  const docsLoop = docCards.length > 5;
  const docsAutoplay = docsLoop
    ? {
        delay: 0,
        disableOnInteraction: false,
        pauseOnMouseEnter: true,
        waitForTransition: false,
      }
    : false;
  const docsSpeed = 9000;

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

            {/* ilustrasi langsung tanpa pembungkus sun */}
            {!isLoading && content?.hero?.illustration ? (
              <Img
                src={content.hero.illustration}
                alt=""
                style={illoStyle}
                className="anim-illo"
                aria-hidden
              />
            ) : null}
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

      {/* ---------- SERVICES: JENIS PENERJEMAH ---------- */}
      <section style={styles.services.section}>
        <div style={sectionInnerStyle}>
          <div
            className="reveal"
            data-anim="zoom"
            style={{
              ...styles.services.card,
              ...(isNarrow ? styles.services.cardNarrow : {}),
            }}
          >
            {/* Kolom kiri: judul + list */}
            <div style={styles.services.left}>
              <h3 style={styles.services.title}>
                {services.title ||
                  (locale === "en"
                    ? "Types of Translators at OSS Bali"
                    : "Jenis Penerjemah di OSS Bali")}
              </h3>
              <div style={styles.services.underline} />

              <div style={styles.services.items}>
                {serviceItems.map((item) => (
                  <div key={item.id || item.title} style={styles.services.item}>
                    <div style={styles.services.iconWrap}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.icon || "/icons/translator-regular.svg"}
                        alt={item.title}
                        style={styles.services.icon}
                      />
                    </div>
                    <div>
                      <p style={styles.services.itemTitle}>{item.title}</p>
                      {item.desc && (
                        <p style={styles.services.itemDesc}>{item.desc}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Kolom kanan: HANYA satu <img>, tanpa wrapper / card biru */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                services.heroImage || "/images/translator-right-placeholder.png"
              }
              alt=""
              className="reveal"
              data-anim={isNarrow ? "up" : "left"}
              style={styles.services.heroImg}
            />
          </div>
        </div>
      </section>

      {/* ---------- DOKUMEN APA SAJA YANG BISA KAMI TRANSLATE ---------- */}
      <section style={styles.why.section}>
        <div style={sectionInnerStyle}>
          <div className="reveal" data-anim="down" style={styles.why.header}>
            <h3 style={styles.why.heading}>
              {isEn
                ? "What Documents Can We Translate?"
                : "Dokumen Apa Saja Yang Bisa Kami Translate?"}
            </h3>
            <div style={styles.why.underline} />
          </div>

          <div
            className="reveal"
            data-anim="zoom"
            data-rvd="60ms"
            style={styles.why.track}
          >
            <Swiper
              className="doc-type-swiper"
              modules={[Autoplay]}
              slidesPerView="auto"
              spaceBetween={18}
              loop={docsLoop}
              loopAdditionalSlides={
                docsLoop ? Math.max(10, docCards.length) : 0
              }
              speed={docsSpeed}
              allowTouchMove
              autoplay={docsAutoplay}
              observer
              observeParents
              watchSlidesProgress
            >
              {docCards.map((card) => (
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
        </div>
      </section>

      {/* ---------- KENAPA HARUS TRANSLET DI OSS BALI ---------- */}
      <section style={styles.reasons.section}>
        <div style={sectionInnerStyle}>
          <div
            className="reveal"
            data-anim="down"
            style={styles.reasons.header}
          >
            <h3 style={styles.reasons.heading}>
              {reasons.title ||
                (isEn
                  ? "Why Should You Translate with OSS Bali?"
                  : "Kenapa Harus Translet Di OSS Bali?")}
            </h3>
            <div style={styles.reasons.underline} />
          </div>

          <div
            className="reveal"
            data-anim="zoom"
            style={{
              ...styles.reasons.card,
              ...(isNarrow ? styles.reasons.cardNarrow : {}),
            }}
          >
            {/* kiri: teks */}
            <div style={styles.reasons.left}>
              <div style={styles.reasons.items}>
                {reasonsItems.map((item) => (
                  <div key={item.id || item.title} style={styles.reasons.item}>
                    <div style={styles.reasons.iconWrap}>
                      <img
                        src={item.icon || "/icons/reason-placeholder.svg"}
                        alt={item.title}
                        style={styles.reasons.icon}
                      />
                    </div>
                    <div>
                      <p style={styles.reasons.itemTitle}>{item.title}</p>
                      {item.desc && (
                        <p style={styles.reasons.itemDesc}>{item.desc}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* kanan: foto langsung, tanpa frame/card */}
            <div style={styles.reasons.right}>
              {reasons.heroImage && (
                <div style={styles.reasons.heroImgWrap}>
                  <Img
                    src={reasons.heroImage}
                    alt={reasons.title}
                    style={styles.reasons.heroImg}
                  />
                </div>
              )}
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

      {/* ---------- GLOBAL STYLES ---------- */}
      <style jsx global>{`
        ::selection {
          background: #0b56c9;
          color: #fff;
        }
        html,
        body {
          overflow-x: clip;
        }

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
        .anim-illo {
          animation: floatY 7s ease-in-out infinite;
        }

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

        /* ===== Slider Dokumen (Swiper) ===== */
        :root {
          --doc-card-w: clamp(220px, 24vw, 260px);
        }

        .doc-type-swiper {
          overflow: visible;
          padding-block: 4px;
        }

        .doc-type-swiper .swiper-wrapper {
          transition-timing-function: linear !important;
          align-items: stretch;
        }

        .doc-type-swiper .swiper-slide {
          width: var(--doc-card-w);
          height: auto;
          display: flex;
        }

        .doc-type-card {
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

        /* 🔎 Ikon pakai ukuran referensi (level-kampus-icon) */
        .doc-type-icon {
          width: 128px;
          height: 128px;
          object-fit: contain;
          display: block;
          margin-bottom: 14px;
          flex-shrink: 0;
        }

        .doc-type-label {
          margin: 0;
          font-weight: 600;
          font-size: 14px;
          letter-spacing: 0.01em;
        }

        /* ✨ Hover: card sedikit membesar (pakai kode referensi) */
        @media (hover: hover) {
          .doc-type-card {
            transition: transform 0.18s ease, box-shadow 0.18s ease,
              filter 0.18s ease;
          }
          .doc-type-card:hover {
            transform: translateY(-4px) scale(1.04);
            filter: saturate(1.08);
            box-shadow: 0 24px 44px rgba(8, 42, 116, 0.45);
          }
        }

        @media (max-width: 767px) {
          .doc-type-card {
            padding: 14px 14px 16px;
          }

          /* Ikon tetap besar tapi tidak kebesaran di mobile (pakai 92px) */
          .doc-type-icon {
            width: 92px;
            height: 92px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .reveal {
            transition: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
          .anim-illo {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
