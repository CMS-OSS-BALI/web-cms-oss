// app/(view)/user/(panel)/aboutus/AboutUsContent.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Typography } from "antd";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, FreeMode } from "swiper/modules";
import "swiper/css";

const { Paragraph } = Typography;

/* ===== External links ===== */
const COMPANY_PROFILE_URL =
  "https://drive.google.com/file/d/1G4NIWeKa5BRzaTzw8I7QPx91LbZM6g8d/view?usp=sharing";

/* ================= Hooks ================= */
function useIsNarrow(breakpoint = 900) {
  const [isNarrow, setIsNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.(`(max-width:${breakpoint}px)`);
    const apply = () => setIsNarrow(!!mq?.matches);
    apply();
    mq?.addEventListener?.("change", apply);
    return () => mq?.removeEventListener?.("change", apply);
  }, [breakpoint]);
  return isNarrow;
}
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(!!mq?.matches);
    apply();
    mq?.addEventListener?.("change", apply);
    return () => mq?.removeEventListener?.("change", apply);
  }, []);
  return reduced;
}

/* ===== Reveal on scroll (referensi) ===== */
function useRevealOnScroll(deps = []) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const prefersReduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const markVisible = (els) =>
      els.forEach((el) => el.classList.add("is-visible"));
    if (prefersReduce) {
      markVisible(Array.from(document.querySelectorAll(".reveal")));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.16, rootMargin: "0px 0px -10% 0px" }
    );

    const observeAll = () => {
      document
        .querySelectorAll(".reveal:not(.is-visible)")
        .forEach((el) => io.observe(el));
    };

    observeAll();
    const mo = new MutationObserver(observeAll);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, deps);
}

/* Subtle hero parallax (referensi) */
function useHeroParallax(ref) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = ref.current;
    if (!root) return;

    const prefersReduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const desktop = () => window.innerWidth >= 992;
    if (prefersReduce || !desktop()) return;

    const copy = root.querySelector(".js-hero-copy");
    const art = root.querySelector(".js-hero-art");

    const onMove = (e) => {
      const r = root.getBoundingClientRect();
      const cx = (e.clientX - r.left) / r.width - 0.5;
      const cy = (e.clientY - r.top) / r.height - 0.5;
      if (copy)
        copy.style.transform = `translate3d(${cx * 6}px, ${cy * 6}px, 0)`;
      if (art)
        art.style.transform = `translate3d(${cx * -8}px, ${cy * -8}px, 0)`;
    };
    const onLeave = () => {
      if (copy) copy.style.transform = "";
      if (art) art.style.transform = "";
    };

    root.addEventListener("mousemove", onMove);
    root.addEventListener("mouseleave", onLeave);
    return () => {
      root.removeEventListener("mousemove", onMove);
      root.removeEventListener("mouseleave", onLeave);
    };
  }, [ref]);
}

/* ====== YouTube helpers ====== */
function toYouTubeId(input = "") {
  try {
    const u = new URL(input);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    if (u.searchParams.get("v")) return u.searchParams.get("v");
    return "";
  } catch {
    return "";
  }
}
const toEmbed = (url) => {
  const id = toYouTubeId(url);
  return id
    ? `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&autoplay=1`
    : "";
};
const toThumb = (url) => {
  const id = toYouTubeId(url);
  return id
    ? `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`
    : "/images/loading.png";
};

/* ================= Styles ================= */
const ACT_SWIPER_CLASS = "about-activity-swiper";
const BRAND_BLUE = "#004A9E";

const styles = {
  page: { width: "100%", overflowX: "clip" },

  container: { width: "min(1100px, 92%)", margin: "0 auto" },

  /* ===== HERO / VISION / MISSION / VIDEO ===== */
  heroWrap: {
    paddingTop: "clamp(16px, 6vw, 150px)",
    paddingBottom: "clamp(40px, 10vw, 72px)",
    marginBottom: -75,
    marginTop: 20,
    position: "relative",
    isolation: "isolate",
  },
  heroGrid: { display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: "28px" },
  heroTitle: {
    color: BRAND_BLUE,
    fontWeight: 900,
    letterSpacing: "0.03em",
    fontSize: "clamp(36px, 6vw, 64px)",
    margin: 0,
    lineHeight: 1.05,
  },
  heroDesc: {
    marginTop: 10,
    color: "#2f4a7a",
    fontSize: "clamp(14px, 2.6vw, 16px)",
    maxWidth: 560,
    textAlign: "justify",
  },
  heroCta: {
    marginTop: 18,
    height: 48,
    borderRadius: 999,
    paddingInline: 28,
    fontWeight: 900,
    letterSpacing: "0.04em",
    background: BRAND_BLUE,
    border: "none",
  },
  heroImgWrap: {
    position: "relative",
    display: "grid",
    placeItems: "center",
    minHeight: 280,
    transform: "translateY(-90px)",
  },
  heroBgCircle: {
    position: "absolute",
    inset: "auto",
    width: "min(360px, 68%)",
    aspectRatio: "1/1",
    backgroundSize: "contain",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center",
    zIndex: 0,
    filter: "drop-shadow(0 6px 20px rgba(0,0,0,.08))",
    transform: "translate(10%, 0)",
  },
  heroImg: {
    maxWidth: "560px",
    width: "100%",
    height: "auto",
    position: "relative",
    zIndex: 1,
  },

  visionInner: {
    width: "min(1100px, 92%)",
    margin: "0 auto",
    padding: "clamp(18px, 4vw, 32px) 0",
    textAlign: "center",
  },
  visionTitle: {
    color: BRAND_BLUE,
    fontWeight: 900,
    fontSize: "clamp(26px, 4.8vw, 44px)",
    margin: 0,
    letterSpacing: ".04em",
  },
  visionText: {
    marginTop: 16,
    color: "#0b2a53",
    fontWeight: 600,
    fontSize: "clamp(14px, 2.6vw, 18px)",
    lineHeight: 1.6,
  },

  missionWrap: {
    width: "min(1100px, 92%)",
    margin: "clamp(28px, 8vw, 64px) auto",
  },
  missionTitle: {
    color: BRAND_BLUE,
    fontWeight: 900,
    textAlign: "center",
    fontSize: "clamp(26px, 4.8vw, 44px)",
    margin: "0 0 clamp(18px, 3vw, 26px)",
    letterSpacing: ".04em",
  },
  missionGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "clamp(14px, 2.6vw, 22px)",
  },
  missionCard: {
    background: "#fff",
    borderRadius: 16,
    border: "1px solid rgba(15,23,42,.06)",
    boxShadow: "0 4px 10px rgba(15,23,42,.04), 0 18px 42px rgba(15,23,42,.12)",
    padding: "clamp(16px, 3.2vw, 22px)",
    display: "grid",
    gridTemplateRows: "var(--mission-media-h) auto 1fr",
    rowGap: 12,
  },
  missionMediaBox: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  missionImg: {
    width: "min(220px, 70%)",
    height: "auto",
    objectFit: "contain",
  },
  missionHeading: {
    color: BRAND_BLUE,
    textAlign: "center",
    fontWeight: 900,
    letterSpacing: ".06em",
    textTransform: "uppercase",
    fontSize: "clamp(18px, 3.8vw, 28px)",
    margin: 0,
  },
  missionBody: {
    color: "#334155",
    textAlign: "justify",
    fontSize: "clamp(13px, 2.2vw, 15px)",
    lineHeight: 1.7,
    margin: 0,
  },

  videoWrap: { width: "min(1100px, 92%)", margin: "24px auto 8px" },
  videoTitle: {
    color: BRAND_BLUE,
    textAlign: "center",
    fontWeight: 900,
    letterSpacing: ".03em",
    fontSize: "clamp(26px, 4.6vw, 42px)",
    margin: "0 0 14px",
  },
  videoOuter: { display: "flex", justifyContent: "center" },
  videoBox: {
    position: "relative",
    width: "min(980px, 100%)",
    aspectRatio: "16 / 9",
    overflow: "hidden",
    borderRadius: 16,
    background: "#E7EEF9",
    boxShadow: "0 14px 32px rgba(0,0,0,.12)",
  },
  videoThumb: { width: "100%", height: "100%", objectFit: "cover" },
  videoOverlay: {
    position: "absolute",
    inset: 0,
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
    background: "linear-gradient(180deg, rgba(0,0,0,.06), rgba(0,0,0,.18))",
  },
  playCircle: {
    width: 86,
    height: 86,
    borderRadius: "50%",
    background: BRAND_BLUE,
    position: "relative",
    boxShadow: "0 12px 26px rgba(0,74,158,.35)",
  },
  playTri: {
    position: "absolute",
    left: "50%",
    top: "50%",
    transform: "translate(-34%,-50%)",
    width: 0,
    height: 0,
    borderLeft: "26px solid #fff",
    borderTop: "16px solid transparent",
    borderBottom: "16px solid transparent",
  },

  /* ===== SUPPORT ===== */
  support: {
    section: { padding: "clamp(22px, 7vw, 42px) 0" },
    inner: { width: "min(1100px, 92%)", margin: "0 auto" },
    title: {
      color: BRAND_BLUE,
      fontWeight: 900,
      letterSpacing: ".06em",
      textAlign: "center",
      fontSize: "clamp(26px, 5vw, 44px)",
      margin: 0,
    },
    sub: {
      textAlign: "center",
      color: "#334155",
      marginTop: 10,
      marginBottom: "clamp(18px, 3vw, 26px)",
      fontSize: "clamp(14px, 2.6vw, 16px)",
      lineHeight: 1.6,
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
      gap: "clamp(14px, 2.6vw, 22px)",
    },
    card: {
      background: "linear-gradient(180deg, #0B6BEE 0%, #004A9E 100%)",
      color: "#fff",
      borderRadius: 14,
      padding: "22px",
      minHeight: 200,
      display: "grid",
      gridTemplateRows: "auto auto 1fr",
      rowGap: 10,
      boxShadow: "0 16px 36px rgba(0,74,158,.28)",
    },
    iconBox: { height: 54, display: "flex", alignItems: "center" },
    icon: { width: 54, height: "auto", objectFit: "contain" },
    heading: {
      margin: 0,
      fontWeight: 900,
      letterSpacing: ".06em",
      textTransform: "uppercase",
      fontSize: 18,
    },
    desc: { margin: 0, fontSize: 13, lineHeight: 1.6, opacity: 0.96 },
  },

  /* ===== ACTIVITIES (FULL-BLEED) ===== */
  activity3: {
    title: {
      color: BRAND_BLUE,
      textAlign: "center",
      fontWeight: 900,
      letterSpacing: ".04em",
      fontSize: "clamp(26px, 4.6vw, 42px)",
      marginBottom: 50,
      paddingInline: "clamp(16px, 5vw, 64px)",
    },
    fullBleed: {
      width: "100vw",
      marginLeft: "calc(50% - 50vw)",
      marginRight: "calc(50% - 50vw)",
      marginBottom: 50,
    },
    slideWDesktop: 560,
    slideWTablet: 420,
    slideWMobile: 300,
    item: { width: "var(--slide-w)" },
    imgBox: {
      width: "100%",
      height: "var(--img-h)",
      borderRadius: 16,
      overflow: "hidden",
      boxShadow: "0 12px 28px rgba(0,0,0,.12)",
      background: "#fff",
    },
    img: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      display: "block",
    },
    caption: { padding: "12px 6px 0" },
    capTitle: {
      margin: 0,
      fontWeight: 800,
      letterSpacing: ".02em",
      fontSize: 16,
      color: "#0f172a",
    },
    capDesc: {
      margin: "6px 0 0",
      color: "#334155",
      fontSize: 13.5,
      lineHeight: 1.55,
      display: "-webkit-box",
      WebkitLineClamp: 2,
      WebkitBoxOrient: "vertical",
      overflow: "hidden",
    },
  },
};

/* ================= Component ================= */
export default function AboutUsContent({
  hero = {},
  vision = {},
  mission = {},
  video = {},
  support = {},
  activities = {},
  career = {},
}) {
  const isTablet = useIsNarrow(1024);
  const isMobile = useIsNarrow(640);
  const reduced = usePrefersReducedMotion();
  const router = useRouter();

  const heroRef = useRef(null);
  useHeroParallax(heroRef);

  const goCareer = () =>
    router.push(career?.ctaHref || "/user/career?menu=career");

  // ===== Responsive width + 16:9 height untuk slide Aktivitas
  const slideW = isMobile
    ? styles.activity3.slideWMobile
    : isTablet
    ? styles.activity3.slideWTablet
    : styles.activity3.slideWDesktop;
  const imgH = Math.round((slideW * 9) / 16);

  const activityItems = Array.isArray(activities.items) ? activities.items : [];
  const [play, setPlay] = useState(false);
  const embedUrl = useMemo(() => toEmbed(video?.url || ""), [video?.url]);
  const thumbUrl = useMemo(() => toThumb(video?.url || ""), [video?.url]);

  useRevealOnScroll([
    activityItems.length,
    mission?.items?.length || 0,
    support?.items?.length || 0,
  ]);

  return (
    <div className="aboutus-page" style={styles.page} data-shell="full">
      {/* ===== HERO ===== */}
      <section className="hero-grad" style={styles.heroWrap} ref={heroRef}>
        <div style={styles.container}>
          <div
            style={{
              ...styles.heroGrid,
              ...(isTablet ? { gridTemplateColumns: "1fr", gap: 16 } : null),
            }}
          >
            <div
              className="js-hero-copy reveal"
              data-anim="left"
              style={{ ["--rvd"]: "40ms" }}
            >
              <h1 style={styles.heroTitle}>{hero.title}</h1>
              {hero?.description ? (
                <Paragraph
                  className="reveal"
                  data-anim="up"
                  style={{ ...styles.heroDesc, ["--rvd"]: "120ms" }}
                >
                  {hero.description}
                </Paragraph>
              ) : null}
              {hero?.ctaLabel ? (
                <Button
                  type="primary"
                  href={COMPANY_PROFILE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hero-cta hero-cta--bob hero-cta--pulse reveal"
                  data-anim="up"
                  style={{
                    ...styles.heroCta,
                    ...(isTablet ? { width: "100%", height: 52 } : null),
                    ["--rvd"]: "200ms",
                  }}
                  size="large"
                >
                  {hero.ctaLabel}
                </Button>
              ) : null}
            </div>

            <div
              className="js-hero-art reveal"
              data-anim="zoom"
              style={{
                ...styles.heroImgWrap,
                ...(isTablet ? { transform: "translateY(-30px)" } : null),
                ...(isMobile ? { transform: "translateY(-8px)" } : null),
                ["--rvd"]: "80ms",
              }}
            >
              {hero?.bgCircle ? (
                <div
                  aria-hidden
                  style={{
                    ...styles.heroBgCircle,
                    ...(isTablet
                      ? {
                          width: "min(320px, 78%)",
                          transform: "translate(4%,0)",
                        }
                      : null),
                    backgroundImage: `url(${hero.bgCircle})`,
                  }}
                />
              ) : null}
              {hero?.image ? (
                <img
                  src={hero.image}
                  alt={hero?.imgAlt || "About OSS Bali"}
                  style={styles.heroImg}
                  loading="eager"
                  decoding="async"
                />
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* ===== VISION ===== */}
      <section>
        <div style={styles.visionInner}>
          <h2
            className="reveal"
            data-anim="down"
            style={{ ...styles.visionTitle, ["--rvd"]: "40ms" }}
          >
            {vision.title}
          </h2>
          <p
            className="reveal"
            data-anim="up"
            style={{ ...styles.visionText, ["--rvd"]: "120ms" }}
          >
            {vision.statement}
          </p>
        </div>
      </section>

      {/* ===== MISSION ===== */}
      <section style={styles.missionWrap}>
        <h2
          className="reveal"
          data-anim="down"
          style={{ ...styles.missionTitle, ["--rvd"]: "40ms" }}
        >
          {mission.title}
        </h2>
        <div
          style={{
            ...styles.missionGrid,
            ...(isTablet && !isMobile
              ? { gridTemplateColumns: "1fr 1fr" }
              : null),
            ...(isMobile ? { gridTemplateColumns: "1fr", gap: 16 } : null),
          }}
        >
          {mission.items?.map((m, idx) => (
            <div
              key={m.id || idx}
              className="reveal mission-card"
              data-anim="up"
              style={{
                ...styles.missionCard,
                ["--mission-media-h"]: `${
                  isMobile ? 160 : isTablet ? 200 : 220
                }px`,
                ["--rvd"]: `${(idx % 6) * 70}ms`,
              }}
            >
              <div style={styles.missionMediaBox}>
                {m.image ? (
                  <img
                    src={m.image}
                    alt=""
                    style={styles.missionImg}
                    loading="lazy"
                    decoding="async"
                  />
                ) : null}
              </div>
              <h3 style={styles.missionHeading}>{m.heading}</h3>
              <p style={styles.missionBody}>{m.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== VIDEO ===== */}
      <section style={styles.videoWrap}>
        <h2
          className="reveal"
          data-anim="down"
          style={{ ...styles.videoTitle, ["--rvd"]: "40ms" }}
        >
          {video?.title || "Mengenal Lebih Dekat Dengan OSS Bali"}
        </h2>
        <div style={styles.videoOuter}>
          <div
            className="reveal"
            data-anim="zoom"
            style={{ ...styles.videoBox, ["--rvd"]: "80ms" }}
          >
            {play && embedUrl ? (
              <iframe
                src={embedUrl}
                title={video?.title || "OSS Bali Video"}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  border: 0,
                }}
              />
            ) : (
              <>
                <img
                  src={thumbUrl}
                  alt={video?.title || "Video thumbnail"}
                  style={styles.videoThumb}
                  onError={(e) => (e.currentTarget.src = "/images/loading.png")}
                  loading="lazy"
                  decoding="async"
                />
                <div
                  className="video-overlay"
                  style={styles.videoOverlay}
                  role="button"
                  aria-label="Putar video"
                  onClick={() => setPlay(true)}
                >
                  <div className="play-circle" style={styles.playCircle}>
                    <span style={styles.playTri} />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ===== SUPPORT ===== */}
      <section style={styles.support.section}>
        <div style={styles.support.inner}>
          <h2
            className="reveal"
            data-anim="down"
            style={{ ...styles.support.title, ["--rvd"]: "40ms" }}
          >
            {support.title}
          </h2>
          {support?.subtitle ? (
            <p
              className="reveal"
              data-anim="up"
              style={{ ...styles.support.sub, ["--rvd"]: "120ms" }}
            >
              {support.subtitle}
            </p>
          ) : null}
          <div style={styles.support.grid}>
            {(support?.items || []).map((s, i) => (
              <div
                key={s.id}
                className="support-card reveal"
                data-anim="zoom"
                style={{
                  ...styles.support.card,
                  ["--rvd"]: `${(i % 6) * 70}ms`,
                }}
              >
                <div style={styles.support.iconBox}>
                  {s.icon ? (
                    <img
                      src={s.icon}
                      alt=""
                      aria-hidden="true"
                      style={styles.support.icon}
                      loading="lazy"
                    />
                  ) : null}
                </div>
                <h3 style={styles.support.heading}>{s.title}</h3>
                <p style={styles.support.desc}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== ACTIVITIES (FULL-BLEED) ===== */}
      <section className="activity-grad">
        <h2
          className="reveal"
          data-anim="down"
          style={{ ...styles.activity3.title, ["--rvd"]: "40ms" }}
        >
          {activities?.title || "OUR ACTIVITY"}
        </h2>

        <Swiper
          className={ACT_SWIPER_CLASS}
          style={styles.activity3.fullBleed}
          modules={[Autoplay, FreeMode]}
          slidesPerView="auto"
          spaceBetween={isMobile ? 12 : isTablet ? 16 : 18}
          loop
          speed={reduced ? 1800 : 5200}
          allowTouchMove
          slidesOffsetBefore={0}
          slidesOffsetAfter={0}
          autoplay={
            reduced
              ? false
              : {
                  delay: 0,
                  disableOnInteraction: false,
                  reverseDirection: false,
                  pauseOnMouseEnter: true,
                }
          }
          freeMode={{ enabled: true, momentum: false, sticky: false }}
        >
          {activityItems.map((a, idx) => (
            <SwiperSlide
              key={a.id}
              className="reveal"
              data-anim="up"
              style={{
                ...styles.activity3.item,
                ["--slide-w"]: `${slideW}px`,
                ["--rvd"]: `${(idx % 8) * 60}ms`,
              }}
            >
              <div
                style={{ ...styles.activity3.imgBox, ["--img-h"]: `${imgH}px` }}
              >
                <img
                  src={a.image}
                  alt={a?.title || "Aktivitas"}
                  style={styles.activity3.img}
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div style={styles.activity3.caption}>
                {a?.title ? (
                  <h4 style={styles.activity3.capTitle}>{a.title}</h4>
                ) : null}
                {a?.desc ? (
                  <p style={styles.activity3.capDesc}>{a.desc}</p>
                ) : null}
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </section>

      {/* Global tweaks & Animations */}
      <style jsx global>{`
        /* ===== Latar global gradasi ===== */
        .aboutus-page {
          background: radial-gradient(
              1200px 600px at 8% -6%,
              rgba(0, 74, 158, 0.12),
              transparent 60%
            ),
            radial-gradient(
              900px 480px at 92% 2%,
              rgba(0, 74, 158, 0.1),
              transparent 62%
            ),
            linear-gradient(180deg, #f5f9ff 0%, #ffffff 30%, #f8faff 100%);
        }

        /* Aura hero */
        .hero-grad::before {
          content: "";
          position: absolute;
          inset: 0;
          top: -6%;
          height: clamp(220px, 38vw, 420px);
          background: radial-gradient(
            closest-side,
            rgba(0, 106, 255, 0.18),
            rgba(0, 106, 255, 0) 70%
          );
          z-index: -1;
          filter: blur(2px);
        }
        .hero-grad::after {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          bottom: -1px;
          height: 120px;
          background: linear-gradient(
            180deg,
            rgba(0, 74, 158, 0.06) 0%,
            rgba(0, 74, 158, 0) 100%
          );
          z-index: -1;
        }

        /* Band gradasi Activity */
        .activity-grad {
          width: 100vw;
          margin-left: calc(50% - 50vw);
          margin-right: calc(50% - 50vw);
          padding-block: clamp(12px, 3vw, 28px);
          background: linear-gradient(180deg, #f0f6ff 0%, #ffffff 100%);
        }

        /* ===== Reveal utilities (referensi) ===== */
        .reveal {
          opacity: 0;
          transform: var(--reveal-from, translate3d(0, 16px, 0));
          transition: opacity 700ms ease,
            transform 700ms cubic-bezier(0.21, 1, 0.21, 1);
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

        @media (prefers-reduced-motion: reduce) {
          .reveal {
            transition: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
          .hero-cta--bob,
          .hero-cta--pulse {
            animation: none !important;
          }
        }

        /* Hero CTA micro-motions */
        @keyframes y-bob {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-4px);
          }
        }
        .hero-cta--bob {
          animation: y-bob 3s ease-in-out infinite;
        }
        @keyframes pulse-soft {
          0%,
          100% {
            box-shadow: 0 14px 28px rgba(11, 86, 201, 0.28);
          }
          50% {
            box-shadow: 0 18px 36px rgba(11, 86, 201, 0.34);
          }
        }
        .hero-cta--pulse {
          animation: pulse-soft 2.8s ease-in-out infinite;
        }

        /* Mission & Support hover */
        @media (hover: hover) {
          .mission-card {
            transition: transform 0.18s ease, box-shadow 0.18s ease;
          }
          .mission-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 22px rgba(15, 23, 42, 0.1),
              0 22px 44px rgba(15, 23, 42, 0.16);
          }
          .support-card {
            transition: transform 0.18s ease, box-shadow 0.18s ease,
              filter 0.18s ease;
          }
          .support-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 20px 44px rgba(0, 74, 158, 0.32);
            filter: saturate(1.06);
          }
          .video-overlay .play-circle {
            transition: transform 0.16s ease;
          }
          .video-overlay:hover .play-circle {
            transform: scale(1.06);
          }
        }

        /* Swiper base */
        .${ACT_SWIPER_CLASS} {
          overflow: hidden;
        }
        .${ACT_SWIPER_CLASS} .swiper-wrapper {
          align-items: stretch;
          transition-timing-function: linear !important;
        }
        .${ACT_SWIPER_CLASS} .swiper-slide {
          height: auto;
        }
        .about-activity-swiper {
          width: 100vw;
          margin-left: calc(50% - 50vw);
          margin-right: calc(50% - 50vw);
          padding: 0 !important;
          overflow: hidden;
        }
        .about-activity-swiper .swiper-slide {
          height: auto;
          width: var(--slide-w) !important;
        }

        /* Hindari overflow horizontal */
        html,
        body {
          overflow-x: clip;
        }
      `}</style>
    </div>
  );
}
