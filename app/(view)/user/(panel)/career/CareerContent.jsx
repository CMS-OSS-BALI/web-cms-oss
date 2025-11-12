"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import { Typography, Button } from "antd";
import Image from "next/image";
import { useRouter } from "next/navigation";

const { Title, Paragraph } = Typography;

/* ===== media hooks ===== */
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

/* ===== base styles ===== */
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
    minWidth: "clamp(160px, 40vw, 360px)",
    padding: "0 clamp(18px, 4vw, 32px)",
    borderRadius: 9999,
    fontWeight: 900,
    letterSpacing: 0.4,
    fontSize: "clamp(14px, 2.3vw, 18px)",
    textTransform: "none",
  },

  /* CTA visual */
  ctaVisual: {
    position: "relative",
    width: "clamp(220px, 68vw, 440px)",
    margin: "10px auto 0",
  },

  /* LOWONGAN */
  vacOuter: {
    width: "min(1180px, 92%)",
    margin: "0 auto 84px",
    scrollMarginTop: `calc(${HEADER_H} + 16px)`,
  },
  vacTitle: {
    margin: 0,
    color: "#004A9E",
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
    height: "clamp(48px, 7vw, 60px)",
    minWidth: "clamp(180px, 36vw, 400px)",
    borderRadius: 999,
    fontWeight: 800,
    fontSize: "clamp(14px, 2.3vw, 18px)",
    letterSpacing: 0.2,
    boxShadow: "0 18px 36px rgba(11,86,184,.25)",
  },
  vacImgBox: { width: "100%", background: "#f4f7ff" },
  vacImgEl: { width: "100%", height: "auto", display: "block" },

  /* ===== REFERRAL SECTION ===== */
  refWrap: {
    width: "min(1180px, 92%)",
    margin: "0 auto 40px",
    scrollMarginTop: `calc(${HEADER_H} + 16px)`,
  },
  refTitle: {
    margin: 0,
    textAlign: "center",
    color: "#004A9E",
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

  /* ===== BENEFITS ===== */
  benWrap: { width: "min(1180px, 92%)", margin: "44px auto 48px" },
  benTitle: {
    textAlign: "center",
    fontWeight: 900,
    color: "#0b2a53",
    letterSpacing: 0.5,
    fontSize: "clamp(20px, 3vw, 34px)",
    margin: 0,
  },
  benGrid: { display: "grid", gap: 18, marginTop: 24 },
  benItem: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    background: "#004A9E",
    color: "#fff",
    borderRadius: 16,
    padding: "16px 22px",
    minHeight: "clamp(62px, 6vw, 80px)",
    boxShadow: "0 16px 32px rgba(11,86,201,.22)",
  },
  benIco: {
    width: 64,
    height: 64,
    minWidth: 64,
    borderRadius: 14,
    background: "#fff",
    display: "grid",
    placeItems: "center",
    boxShadow: "0 8px 18px rgba(0,0,0,.10)",
  },
  benIcoImg: { width: "70%", height: "70%", objectFit: "contain" },
  benText: {
    margin: 0,
    fontWeight: 800,
    letterSpacing: 0.2,
    lineHeight: 1.35,
    fontSize: "clamp(14px, 2.2vw, 18px)",
  },

  /* ===== LEVELS ===== */
  levWrap: { width: "min(1180px, 92%)", margin: "18px auto 88px" },
  levTitle: {
    margin: 0,
    textAlign: "center",
    color: "#0b2a53",
    fontWeight: 900,
    letterSpacing: 0.3,
    fontSize: "clamp(20px, 3vw, 30px)",
  },
  levGrid: { display: "grid", gridAutoRows: "1fr", gap: 20, marginTop: 22 },
  levCardBase: {
    position: "relative",
    borderRadius: 18,
    padding: "18px",
    boxShadow: "0 18px 32px rgba(0,0,0,.18)",
    display: "grid",
    gridTemplateColumns: "minmax(120px,180px) 1fr",
    alignItems: "center",
    overflow: "hidden",
  },
  levCardPro: {
    background:
      "linear-gradient(135deg, #5B0F2D 0%, #8F214A 45%, #B23A5F 100%)",
  },
  levCardBasic: {
    background:
      "linear-gradient(135deg, #5E91B6 0%, #6FA1C4 45%, #8CB7D4 100%)",
  },
  levShine: {
    position: "absolute",
    left: 18,
    top: 0,
    bottom: 0,
    width: 2,
    background:
      "linear-gradient(180deg, rgba(255,255,255,.4), rgba(255,255,255,0))",
    opacity: 0.8,
  },
  levLogoBox: { display: "grid", placeItems: "center", height: "100%" },
  levLogoMark: {
    width: "min(120px, 22vw)",
    maxWidth: 150,
    height: "auto",
    filter: "drop-shadow(0 8px 18px rgba(0,0,0,.25))",
  },
  levInfoBox: {
    justifySelf: "end",
    width: "min(460px, 92%)",
    background: "rgba(255,255,255,.22)",
    border: "1px solid rgba(255,255,255,.35)",
    color: "#fff",
    borderRadius: 14,
    padding: "16px 18px",
    backdropFilter: "blur(4px)",
  },
  levInfoTitle: {
    margin: 0,
    fontWeight: 900,
    letterSpacing: 0.6,
    fontSize: "clamp(14px, 2.2vw, 18px)",
  },
  levInfoDesc: {
    margin: "6px 0 0",
    lineHeight: 1.45,
    fontSize: "clamp(12px, 2vw, 14px)",
    opacity: 0.95,
  },
  levCenterWrap: {
    width: "min(1180px, 92%)",
    margin: "18px auto 0",
    display: "grid",
    justifyItems: "center",
  },
  levCircle: {
    width: "clamp(180px, 34vw, 360px)",
    height: "clamp(180px, 34vw, 360px)",
    background: "#CFE0F2",
    borderRadius: "50%",
    position: "relative",
    overflow: "visible",
    boxShadow: "0 12px 28px rgba(0,0,0,.12) inset",
  },
  levMan: {
    position: "absolute",
    inset: "auto 0 -10% 0",
    width: "100%",
    height: "auto",
    transform: "translateY(-12%)",
  },
  levCTA: {
    marginTop: 24,
    background: "linear-gradient(180deg,#0B56C9 0%,#084A94 100%)",
    border: "none",
    color: "#fff",
    height: "clamp(46px, 7vw, 58px)",
    minWidth: "clamp(200px, 36vw, 360px)",
    borderRadius: 9999,
    fontWeight: 800,
    fontSize: "clamp(14px, 2.2vw, 18px)",
    letterSpacing: 0.2,
    boxShadow: "0 18px 36px rgba(11,86,184,.25)",
  },
};

export default function CareerContent({
  hero,
  cta,
  vacancy,
  referral,
  benefits = [],
  onCTATeam,
  onCTAReferral,
  onSendCV,
  ctaImage,
  levels,
  levelsCTA,
  onLevelsCTA,
  levelsHeroImg,
}) {
  const router = useRouter();
  const isNarrow = useIsNarrow(900); // tablet breakpoint
  const isCompact = useIsNarrow(640); // phone breakpoint
  const [play, setPlay] = useState(false);

  /* Refs */
  const vacRef = useRef(null);
  const refRef = useRef(null);

  /* Scroll helpers */
  const scrollToRef = useCallback((r) => {
    if (typeof window === "undefined") return;
    const el = r?.current;
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  /* CTA handlers */
  const handleScrollVacancy = useCallback(() => {
    if (vacRef.current) scrollToRef(vacRef);
    else if (onCTATeam) onCTATeam();
  }, [scrollToRef, onCTATeam]);
  const handleScrollReferral = useCallback(() => {
    if (refRef.current) scrollToRef(refRef);
    else if (onCTAReferral) onCTAReferral();
  }, [scrollToRef, onCTAReferral]);
  const handleSendCV = useCallback(() => {
    if (onSendCV) return onSendCV();
    router.push("/career/apply");
  }, [onSendCV, router]);
  const handleLevelsCTA = useCallback(() => {
    if (onLevelsCTA) return onLevelsCTA();
    if (onCTAReferral) return onCTAReferral();
    router.push("/user/referral?menu=career");
  }, [onLevelsCTA, onCTAReferral, router]);

  const ctaImg = ctaImage || "/cta-girl.svg";
  const vacImg = vacancy?.image || "/images/loading.png";

  /* Responsive hero */
  const heroFrameStyle = {
    ...styles.heroImgFrame,
    height: isNarrow
      ? "clamp(380px, 66vh, 680px)"
      : `calc(100vh + ${HEADER_H} + 1px)`,
    background: isNarrow ? "transparent" : styles.heroImgFrame.background,
  };
  const heroObjectPosition = isCompact
    ? "50% 30%"
    : hero.objectPosition || "50% 45%";

  /* Grids */
  const vacGrid = {
    display: "grid",
    gridTemplateColumns: isNarrow ? "1fr" : "1.15fr 1fr",
    gap: isNarrow ? 16 : 32,
    alignItems: "center",
  };

  /* YouTube */
  const embedUrl = useMemo(
    () => toEmbed(referral?.youtube || ""),
    [referral?.youtube]
  );
  const thumbUrl = useMemo(
    () => toThumb(referral?.youtube || ""),
    [referral?.youtube]
  );

  /* Levels (defaults) */
  const levelItems =
    levels && levels.length
      ? levels
      : [
          {
            id: "pro",
            variant: "pro",
            logo: "/logo-oss-cube.svg",
            title: "PRO SOLITAIRE LEVEL",
            desc: "Keanggotaan Sahabat Referral OSS Bali tertinggi dengan akses eksklusif ke bonus komisi lebih besar dan trip luar negeri gratis tahunan.",
          },
          {
            id: "basic",
            variant: "basic",
            logo: "/logo-oss-cube.svg",
            title: "BASIC LEVEL",
            desc: "Keanggotaan Sahabat Referral OSS Bali tingkat awal. Langkah pertama untuk mulai meraih penghasilan sederhana.",
          },
        ];

  const manImg = levelsHeroImg || "/images/referral-man-pointing.png";
  const levelsCtaLabel = levelsCTA || "Wujudkan sekarang!";

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
                objectPosition: heroObjectPosition,
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
          <div style={styles.pillWrap}>
            <Button
              size="large"
              style={styles.pillBtn}
              onClick={handleScrollVacancy}
            >
              {cta?.btnJobs}
            </Button>
          </div>

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
            sizes="(max-width:640px) 70vw, (max-width:900px) 46vw, 440px"
          />
        </div>
      </section>

      {/* LOWONGAN */}
      <section id="lowongan" ref={vacRef} style={styles.vacOuter}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isNarrow ? "1fr" : "1.15fr 1fr",
            gap: isNarrow ? 16 : 32,
            alignItems: "center",
          }}
        >
          {/* Text block – di mobile tampil duluan */}
          <div style={{ order: isNarrow ? 1 : 0 }}>
            <h2 style={styles.vacTitle}>{vacancy?.title}</h2>
            <Paragraph style={styles.vacBody}>{vacancy?.body}</Paragraph>
            <Button style={styles.vacBtn} onClick={handleSendCV}>
              {vacancy?.btnLabel}
            </Button>
          </div>

          {/* Gambar – di mobile pindah ke bawah */}
          <div style={{ ...styles.vacImgBox, order: isNarrow ? 2 : 0 }}>
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

      {/* BENEFITS */}
      <section id="referral-benefits" style={styles.benWrap}>
        <h3 style={styles.benTitle}>
          {referral?.benefitsTitle ||
            "Manfaat Bergabung Dalam Program Sahabat Referral OSS Bali"}
        </h3>

        <div
          style={{
            ...styles.benGrid,
            gridTemplateColumns: isNarrow ? "1fr" : "1fr 1fr",
          }}
        >
          {benefits.map((b, i) => (
            <div
              key={`${b.title}-${i}`}
              style={styles.benItem}
              role="listitem"
              aria-label={b.title}
            >
              <div style={styles.benIco} aria-hidden>
                <img
                  src={b.icon || "/icons/benefit-placeholder.svg"}
                  alt=""
                  style={styles.benIcoImg}
                  onError={(e) => (e.currentTarget.src = "/images/loading.png")}
                />
              </div>
              <p style={styles.benText}>{b.title}</p>
            </div>
          ))}
        </div>
      </section>

      {/* LEVELS */}
      <section id="referral-levels" style={styles.levWrap}>
        <h3 style={styles.levTitle}>
          Peluang Level Program Sahabat Referral OSS Bali
        </h3>

        <div
          style={{
            ...styles.levGrid,
            gridTemplateColumns: isNarrow ? "1fr" : "1fr 1fr",
          }}
        >
          {levelItems.map((lv) => {
            const isPro = lv.variant === "pro";
            // selalu row: logo kiri, info kanan; hanya skala yg menyesuaikan
            const logoColMin = isCompact ? 86 : 120;
            const logoColMax = isCompact ? 110 : 180;

            return (
              <div
                key={lv.id}
                style={{
                  ...styles.levCardBase,
                  ...(isPro ? styles.levCardPro : styles.levCardBasic),
                  gridTemplateColumns: `minmax(${logoColMin}px, ${logoColMax}px) 1fr`,
                  gap: isCompact ? 12 : 18,
                  padding: isCompact ? "14px" : "18px",
                  alignItems: "center",
                }}
              >
                <span style={styles.levShine} aria-hidden />

                {/* Logo kiri */}
                <div style={{ ...styles.levLogoBox, justifyItems: "center" }}>
                  <img
                    src={lv.logo || "/logo-oss-cube.svg"}
                    alt="OSS cube"
                    style={{
                      ...styles.levLogoMark,
                      width: "clamp(72px, 18vw, 120px)",
                      maxWidth: isCompact ? 110 : 150,
                    }}
                    onError={(e) =>
                      (e.currentTarget.src = "/images/loading.png")
                    }
                  />
                </div>

                {/* Info kanan */}
                <div
                  style={{
                    ...styles.levInfoBox,
                    justifySelf: "stretch",
                    width: "auto",
                  }}
                >
                  <h4
                    style={{
                      ...styles.levInfoTitle,
                      fontSize: isCompact
                        ? "clamp(13px,3.6vw,16px)"
                        : undefined,
                    }}
                  >
                    {lv.title}
                  </h4>
                  <p
                    style={{
                      ...styles.levInfoDesc,
                      fontSize: isCompact
                        ? "clamp(12px,3.4vw,14px)"
                        : undefined,
                    }}
                  >
                    {lv.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* center image + CTA tetap */}
        <div
          style={{
            ...styles.levCenterWrap,
            marginTop: isNarrow ? 28 : 36,
          }}
        >
          <div style={styles.levCircle}>
            <Image
              src={manImg}
              alt="Referral pointing"
              width={800}
              height={800}
              style={{
                ...styles.levMan,
                transform: isCompact
                  ? "translateY(-6%)"
                  : styles.levMan.transform,
              }}
              priority={false}
              sizes="(max-width:640px) 60vw, (max-width:900px) 40vw, 360px"
            />
          </div>
          <Button style={styles.levCTA} onClick={handleLevelsCTA}>
            {levelsCtaLabel}
          </Button>
        </div>
      </section>
    </div>
  );
}
