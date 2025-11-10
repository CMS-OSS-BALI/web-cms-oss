// CareerContent.jsx
"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import { Typography, Button } from "antd";
import Image from "next/image";
import { useRouter } from "next/navigation";

const { Title, Paragraph } = Typography;

/* ===== media hook ===== */
function useIsNarrow(breakpoint = 900) {
  const [n, setN] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(`(max-width:${breakpoint}px)`);
    const apply = () => setN(mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, [breakpoint]);
  return n;
}

/* ===== helpers: youtube ===== */
function toYouTubeId(input = "") {
  try {
    const u = new URL(input);
    if (u.hostname.includes("youtu.be")) return u.pathname.replace("/", "");
    return u.searchParams.get("v") || "";
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

/* ===== constants ===== */
const HEADER_H = "clamp(48px, 8vw, 84px)";

/* ===== styles ===== */
const styles = {
  /* HERO */
  hero: { marginTop: `calc(-1 * ${HEADER_H})`, background: "#fff" },
  heroBleed: { width: "100vw", marginLeft: "calc(50% - 50vw)" },
  heroImgFrame: {
    position: "relative",
    width: "100vw",
    height: "clamp(520px, 78vh, 920px)",
    background: "#e8f0ff",
    overflow: "hidden",
  },
  heroGradOverlay: {
    position: "absolute",
    inset: 0,
    zIndex: 1,
    pointerEvents: "none",
    background:
      "radial-gradient(1200px 420px at 50% 12%, rgba(255,255,255,0.78) 0%, rgba(255,255,255,0.42) 38%, rgba(255,255,255,0.12) 58%, rgba(255,255,255,0) 74%), linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.04) 42%, rgba(255,255,255,0) 70%)",
  },
  heroTextTopCenter: {
    position: "absolute",
    left: "50%",
    transform: "translateX(-50%)",
    top: "clamp(28px, 8vw, 80px)",
    width: "min(1100px, 92%)",
    textAlign: "center",
    zIndex: 2,
    pointerEvents: "none",
  },
  heroH1: {
    margin: 0,
    textTransform: "uppercase",
    fontWeight: 900,
    letterSpacing: ".06em",
    color: "#0B56B8",
    fontSize: "clamp(26px, 4.6vw, 56px)",
    lineHeight: 1.1,
    textShadow: "0 1px 8px rgba(0,0,0,.10)",
  },
  heroSub: {
    marginTop: 6,
    color: "#1E56B7",
    fontWeight: 700,
    fontSize: "clamp(12px, 2.6vw, 18px)",
    lineHeight: 1.35,
    textShadow: "0 1px 6px rgba(0,0,0,.10)",
  },

  /* SECTION WRAPPER */
  section: { width: "min(1180px, 92%)", margin: "84px auto 108px" },
  sectionTitle: {
    textAlign: "center",
    fontWeight: 900,
    color: "#0b2a53",
    letterSpacing: 0.6,
    marginBottom: 10,
    fontSize: "clamp(22px, 3.2vw, 40px)",
  },
  sectionUnderline: {
    width: "clamp(220px, 28vw, 420px)",
    height: 6,
    borderRadius: 6,
    background: "#2265B3",
    margin: "12px auto 24px",
  },
  sectionSub: {
    textAlign: "center",
    maxWidth: 720,
    margin: "0 auto 26px",
    color: "#0b2a53",
    lineHeight: 1.45,
    fontWeight: 700,
    fontSize: "clamp(15px, 2.2vw, 18px)",
  },

  /* CTA buttons */
  ctaButtonsRow: {
    display: "flex",
    gap: 22,
    justifyContent: "center",
    flexWrap: "wrap",
    marginTop: 22,
    marginBottom: 36,
  },
  pillWrap: {
    position: "relative",
    filter: "drop-shadow(0 18px 32px rgba(11,86,184,0.25))",
  },
  pillBtn: {
    background: "linear-gradient(180deg,#0B56C9 0%,#084A94 100%)",
    border: "none",
    color: "#fff",
    height: "clamp(52px, 7vw, 64px)",
    minWidth: "clamp(180px, 40vw, 380px)",
    padding: "0 clamp(22px, 4vw, 36px)",
    borderRadius: 9999,
    fontWeight: 900,
    letterSpacing: 0.4,
    fontSize: "clamp(15px, 2.3vw, 18px)",
    textTransform: "none",
  },

  /* CTA visual */
  ctaVisual: {
    position: "relative",
    width: "clamp(240px, 68vw, 440px)",
    margin: "10px auto 0",
  },

  /* LOWONGAN (tanpa wrapper pemotong) */
  vacOuter: {
    width: "min(1180px, 92%)",
    margin: "0 auto 84px",
    /* supaya scrollIntoView memberi jarak dengan header */
    scrollMarginTop: `calc(${HEADER_H} + 16px)`,
  },
  vacTitle: {
    margin: 0,
    color: "#0B56B8",
    fontWeight: 900,
    fontSize: "clamp(22px, 3vw, 40px)",
    letterSpacing: ".02em",
  },
  vacBody: {
    marginTop: 14,
    color: "#0f172a",
    lineHeight: 1.9,
    fontSize: "clamp(14px, 2.2vw, 16px)",
    opacity: 0.92,
  },
  vacBtn: {
    marginTop: 18,
    background: "linear-gradient(180deg,#0B56C9 0%,#084A94 100%)",
    border: "none",
    color: "#fff",
    height: "clamp(50px, 7vw, 60px)",
    minWidth: "clamp(200px, 36vw, 420px)",
    borderRadius: 999,
    fontWeight: 800,
    fontSize: "clamp(15px, 2.3vw, 18px)",
    letterSpacing: 0.2,
    boxShadow: "0 18px 36px rgba(11,86,184,.25)",
  },
  vacImgBox: { width: "100%", background: "#f4f7ff" },
  vacImgEl: { width: "100%", height: "auto", display: "block" },

  /* ===== REFERRAL SECTION ===== */
  refWrap: {
    width: "min(1180px, 92%)",
    margin: "0 auto 100px",
    scrollMarginTop: `calc(${HEADER_H} + 16px)`,
  },
  refTitle: {
    margin: 0,
    textAlign: "center",
    color: "#0B56C9",
    fontWeight: 900,
    letterSpacing: 0.4,
    fontSize: "clamp(22px, 3.4vw, 38px)",
  },
  refDesc: {
    margin: "10px auto 20px",
    textAlign: "center",
    maxWidth: 940,
    color: "#0f172a",
    lineHeight: 1.9,
    fontSize: "clamp(14px, 2.2vw, 16px)",
  },
  refVideoOuter: { display: "flex", justifyContent: "center" },
  refVideoBox: {
    position: "relative",
    width: "min(860px, 92%)",
    aspectRatio: "16 / 9",
    borderRadius: 16,
    overflow: "hidden",
    boxShadow: "0 18px 40px rgba(8,42,116,.16)",
    background: "#E7F0FF",
  },
  refThumb: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  refPlayBtn: {
    position: "absolute",
    inset: 0,
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
    background: "linear-gradient(180deg, rgba(0,0,0,.08), rgba(0,0,0,.22))",
  },
  refPlayIcon: {
    width: 78,
    height: 78,
    borderRadius: "50%",
    background: "#0B56C9",
    boxShadow: "0 12px 26px rgba(11,86,201,.35)",
    position: "relative",
  },
  refPlayTri: {
    position: "absolute",
    left: "50%",
    top: "50%",
    transform: "translate(-38%,-50%)",
    width: 0,
    height: 0,
    borderLeft: "20px solid #fff",
    borderTop: "12px solid transparent",
    borderBottom: "12px solid transparent",
  },
};

export default function CareerContent({
  hero,
  cta, // { title, subtitle, btnJobs, btnReferral }
  vacancy, // { title, image, body, btnLabel }
  referral, // { title, leadBold, desc, youtube }
  onCTATeam,
  onCTAReferral,
  onSendCV,
  ctaImage,
}) {
  const router = useRouter();
  const isNarrow = useIsNarrow(900);
  const [play, setPlay] = useState(false);

  /* === Refs untuk target scroll === */
  const vacRef = useRef(null);
  const refRef = useRef(null);

  /* === Scroll helpers === */
  const scrollToRef = useCallback((r) => {
    if (typeof window === "undefined") return;
    const el = r?.current;
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  /* === CTA handlers === */
  const handleScrollVacancy = useCallback(() => {
    // scroll ke Lowongan; fallback ke onCTATeam jika ref tak ada
    if (vacRef.current) scrollToRef(vacRef);
    else if (onCTATeam) onCTATeam();
  }, [scrollToRef, onCTATeam]);

  const handleScrollReferral = useCallback(() => {
    // scroll ke Sahabat Referral; fallback ke onCTAReferral jika ref tak ada
    if (refRef.current) scrollToRef(refRef);
    else if (onCTAReferral) onCTAReferral();
  }, [scrollToRef, onCTAReferral]);

  const handleSendCV = useCallback(() => {
    if (onSendCV) return onSendCV();
    router.push("/career/apply");
  }, [onSendCV, router]);

  const ctaImg = ctaImage || "/cta-girl.svg";
  const vacImg = vacancy?.image || "/images/loading.png";

  const heroFrameStyle = {
    ...styles.heroImgFrame,
    height: isNarrow
      ? "clamp(380px, 66vh, 680px)"
      : `calc(100vh + ${HEADER_H} + 1px)`,
    background: isNarrow ? "transparent" : styles.heroImgFrame.background,
  };

  const vacGrid = {
    display: "grid",
    gridTemplateColumns: isNarrow ? "1fr" : "1.15fr 1fr",
    gap: isNarrow ? 16 : 32,
    alignItems: "center",
  };

  const embedUrl = useMemo(
    () => toEmbed(referral?.youtube || ""),
    [referral?.youtube]
  );
  const thumbUrl = useMemo(
    () => toThumb(referral?.youtube || ""),
    [referral?.youtube]
  );

  return (
    <div>
      {/* HERO */}
      <section style={styles.hero}>
        <div style={styles.heroBleed}>
          <div style={heroFrameStyle}>
            <Image
              src={hero.image}
              alt="Career hero"
              fill
              priority
              sizes="100vw"
              style={{
                objectFit: "cover",
                objectPosition: hero.objectPosition || "50% 45%",
              }}
            />
            <div style={styles.heroGradOverlay} aria-hidden />
            <div style={styles.heroTextTopCenter}>
              <h1 style={styles.heroH1}>{hero.title}</h1>
              {hero.quote ? (
                <div style={styles.heroSub}>{hero.quote}</div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section
        style={{
          ...styles.section,
          paddingBottom: 40,
          margin: isNarrow ? "48px auto 72px" : styles.section.margin,
        }}
      >
        <Title level={3} style={styles.sectionTitle}>
          {cta?.title}
        </Title>
        <div style={styles.sectionUnderline} />
        <Paragraph style={styles.sectionSub}>{cta?.subtitle}</Paragraph>

        <div style={styles.ctaButtonsRow}>
          {/* Lowongan → scroll ke Lowongan */}
          <div style={styles.pillWrap}>
            <Button
              size="large"
              style={styles.pillBtn}
              onClick={handleScrollVacancy}
            >
              {cta?.btnJobs}
            </Button>
          </div>

          {/* Sahabat Referral → scroll ke Referral */}
          <div style={styles.pillWrap}>
            <Button
              size="large"
              style={styles.pillBtn}
              onClick={handleScrollReferral}
            >
              {cta?.btnReferral}
            </Button>
          </div>
        </div>

        <div style={styles.ctaVisual}>
          <Image
            src={ctaImg}
            alt="Career visual"
            width={1200}
            height={1200}
            style={{
              width: "100%",
              height: "auto",
              objectFit: "contain",
              display: "block",
            }}
            priority
          />
        </div>
      </section>

      {/* LOWONGAN */}
      <section id="lowongan" ref={vacRef} style={styles.vacOuter}>
        <div style={vacGrid}>
          <div style={styles.vacImgBox}>
            <Image
              src={vacImg}
              alt="Team atmosphere"
              width={1600}
              height={900}
              sizes="(max-width: 900px) 92vw, 560px"
              style={styles.vacImgEl}
              unoptimized={false}
            />
          </div>

          <div>
            <h2 style={styles.vacTitle}>{vacancy?.title}</h2>
            <Paragraph style={styles.vacBody}>{vacancy?.body}</Paragraph>
            <Button style={styles.vacBtn} onClick={handleSendCV}>
              {vacancy?.btnLabel}
            </Button>
          </div>
        </div>
      </section>

      {/* SAHABAT REFERRAL */}
      <section id="referral" ref={refRef} style={styles.refWrap}>
        <h3 style={styles.refTitle}>{referral?.title}</h3>
        <Paragraph style={styles.refDesc}>
          <strong>{referral?.leadBold}</strong> {referral?.desc}
        </Paragraph>

        <div style={styles.refVideoOuter}>
          <div style={styles.refVideoBox}>
            {play && embedUrl ? (
              <iframe
                src={embedUrl}
                title="Sahabat Referral Video"
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
                  alt="Sahabat Referral"
                  style={styles.refThumb}
                  onError={(e) => (e.currentTarget.src = "/images/loading.png")}
                  loading="lazy"
                />
                <div
                  style={styles.refPlayBtn}
                  role="button"
                  aria-label="Putar video"
                  onClick={() => setPlay(true)}
                >
                  <div style={styles.refPlayIcon}>
                    <span style={styles.refPlayTri} />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
