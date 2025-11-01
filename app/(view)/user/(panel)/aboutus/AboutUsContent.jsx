"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Typography, Row, Col } from "antd";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, FreeMode } from "swiper/modules";
import "swiper/css";

const { Title, Paragraph } = Typography;

/* ===== External links ===== */
const COMPANY_PROFILE_URL =
  "https://drive.google.com/file/d/1G4NIWeKa5BRzaTzw8I7QPx91LbZM6g8d/view?usp=sharing";

/* ==================================================
   Hooks — tiny, SSR-safe media queries
================================================== */
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

/* ==================================================
   Constants & shared inline styles
================================================== */
const ACT_SWIPER_CLASS = "about-activity-swiper";
const BASE_CARD = { W: 340, H: 300, IMG_H: 170, GAP: 20 };

const styles = {
  page: { width: "100%", overflow: "hidden" },
  container: { width: "min(1100px, 92%)", margin: "0 auto" },

  /* ================= HERO ================= */
  heroWrap: {
    paddingTop: "clamp(16px, 6vw, 40px)",
    paddingBottom: "clamp(40px, 10vw, 72px)",
  },
  heroGrid: { display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: "28px" },
  heroTitle: {
    color: "#0B3E91",
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
    textJustify: "inter-word",
    hyphens: "auto",
  },
  heroCta: {
    marginTop: 18,
    height: 48,
    borderRadius: 999,
    paddingInline: 28,
    fontWeight: 900,
    letterSpacing: "0.04em",
    background: "#1E56B7",
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

  /* ============ Section (shared) ============ */
  sectionTitle: {
    color: "#1E56B7",
    fontWeight: 900,
    letterSpacing: "0.05em",
    textAlign: "center",
    fontSize: "clamp(28px, 5vw, 54px)",
    margin: "20px 0 8px",
  },
  sectionSub: {
    textAlign: "center",
    color: "#6a7ca6",
    maxWidth: 680,
    margin: "0 auto 22px",
  },

  /* ============ Stand For cards ============ */
  standCard: {
    borderRadius: 12,
    background: "#114A9C",
    color: "#fff",
    border: "none",
    textAlign: "center",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    flex: 1,
  },
  standCol: { display: "flex" },
  standInner: {
    minHeight: 180,
    height: "100%",
    padding: 20,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  standIconWrap: { display: "grid", placeItems: "center", marginBottom: 4 },
  standIcon: { width: 42, height: 42, objectFit: "contain", opacity: 0.96 },
  standTitle: { color: "#fff", fontWeight: 900, marginBottom: 2 },
  standDesc: {
    color: "rgba(255,255,255,.9)",
    margin: 0,
    lineHeight: 1.4,
    wordBreak: "break-word",
    maxWidth: 420,
  },

  /* ============== Activities ============== */
  activityWrap: {
    background: "#0B3E91",
    borderRadius: "32px",
    color: "#fff",
    padding: "clamp(20px, 6vw, 40px)",
    marginTop: "clamp(28px, 8vw, 64px)",
    overflow: "hidden",
  },
  actTrackMask: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 18,
    WebkitMaskImage:
      "linear-gradient(90deg, transparent 0, #000 6%, #000 94%, transparent 100%)",
    maskImage:
      "linear-gradient(90deg, transparent 0, #000 6%, #000 94%, transparent 100%)",
  },
  activityTitle: {
    color: "#fff",
    fontWeight: 900,
    letterSpacing: "0.05em",
    textAlign: "center",
    fontSize: "clamp(26px, 4.5vw, 48px)",
    margin: "6px 0 8px",
  },
  activitySub: {
    textAlign: "center",
    color: "rgba(255,255,255,.9)",
    maxWidth: 720,
    margin: "0 auto 26px",
  },

  actCard: {
    background: "rgba(255,255,255,.07)",
    border: "1px solid rgba(255,255,255,.12)",
    borderRadius: 16,
    overflow: "hidden",
    height: "var(--act-card-h)",
    display: "flex",
    flexDirection: "column",
  },
  actImg: {
    width: "100%",
    height: "var(--act-img-h)",
    objectFit: "cover",
    flex: "0 0 auto",
  },
  actBody: {
    padding: 16,
    height: "calc(var(--act-card-h) - var(--act-img-h))",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: 6,
  },
  actTitle: {
    color: "#fff",
    fontWeight: 800,
    letterSpacing: "0.02em",
    margin: 0,
    fontSize: 18,
    display: "-webkit-box",
    WebkitLineClamp: 1,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  actDesc: {
    color: "rgba(255,255,255,.92)",
    margin: 0,
    fontSize: 13,
    lineHeight: 1.45,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },

  /* ============== Career v2 ============== */
  career2: {
    section: { padding: "clamp(28px, 9vw, 72px) 0" },
    title: {
      textAlign: "center",
      color: "#0B56C9",
      fontWeight: 900,
      letterSpacing: ".06em",
      textTransform: "uppercase",
      fontSize: "clamp(28px, 6vw, 56px)",
      margin: "0 0 clamp(18px, 3vw, 32px)",
    },
    grid: {
      width: "min(1100px, 92%)",
      margin: "0 auto",
      display: "grid",
      gridTemplateColumns: "1.15fr .85fr",
      gap: "clamp(16px, 3vw, 28px)",
      alignItems: "center",
    },
    card: {
      background: "#fff",
      borderRadius: 16,
      border: "1px solid rgba(14,30,62,.06)",
      boxShadow:
        "0 4px 10px rgba(15,23,42,.04), 0 18px 42px rgba(15,23,42,.14)",
      padding: "clamp(18px, 3.6vw, 28px)",
    },
    cardTitle: {
      margin: 0,
      color: "#0B56C9",
      fontWeight: 900,
      letterSpacing: ".04em",
      textTransform: "uppercase",
      fontSize: "clamp(20px, 4.2vw, 34px)",
      lineHeight: 1.15,
    },
    cardBody: {
      margin: "12px 0 18px",
      color: "#334155",
      fontSize: "clamp(13px, 2vw, 15.5px)",
      lineHeight: 1.7,
      maxWidth: 520,
      textTransform: "none",
    },
    ctaBtn: {
      height: 56,
      borderRadius: 999,
      paddingInline: "clamp(22px, 4vw, 36px)",
      fontWeight: 900,
      letterSpacing: ".04em",
      textTransform: "uppercase",
      background: "linear-gradient(180deg, #2C6BD9 0%, #114A9C 100%)",
      border: "none",
      boxShadow: "0 12px 26px rgba(11,86,201,.28)",
    },
    rightImgWrap: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    },
    rightImg: {
      width: "min(420px, 70%)",
      height: "auto",
      objectFit: "contain",
      filter: "drop-shadow(0 10px 18px rgba(0,0,0,.18))",
    },
  },
};

/* ==================================================
   Component
================================================== */
export default function AboutUsContent({
  hero = {},
  standFor = {},
  activities = {},
  career = {},
}) {
  const isNarrow = useIsNarrow(900);
  const reduced = usePrefersReducedMotion();
  const router = useRouter();

  const goCareer = () =>
    router.push(career?.ctaHref || "/user/career?menu=career");

  const cardDims = useMemo(
    () => (isNarrow ? { W: 260, H: 240, IMG_H: 136, GAP: 14 } : BASE_CARD),
    [isNarrow]
  );

  const cardTitle = career.cardTitle;
  const cardBody = career.cardBody;
  const ctaLabel = career.ctaLabel;
  const mascotSrc = career.mascot || hero?.image || "/mascot-graduation.svg";

  const standItems = Array.isArray(standFor.items) ? standFor.items : [];
  const activityItems = Array.isArray(activities.items) ? activities.items : [];

  return (
    <div style={styles.page}>
      {/* HERO */}
      <section style={styles.heroWrap}>
        <div style={styles.container}>
          <div
            style={{
              ...styles.heroGrid,
              ...(isNarrow ? { gridTemplateColumns: "1fr", gap: 12 } : null),
            }}
          >
            <div>
              <h1 style={styles.heroTitle}>{hero.title}</h1>
              {hero?.description ? (
                <Paragraph style={styles.heroDesc}>
                  {hero.description}
                </Paragraph>
              ) : null}
              {hero?.ctaLabel ? (
                <Button
                  type="primary"
                  href={COMPANY_PROFILE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    ...styles.heroCta,
                    ...(isNarrow ? { width: "100%", height: 52 } : null),
                  }}
                  size="large"
                >
                  {hero.ctaLabel}
                </Button>
              ) : null}
            </div>
            <div
              style={{
                ...styles.heroImgWrap,
                ...(isNarrow ? { transform: "translateY(-8px)" } : null),
              }}
            >
              {hero?.bgCircle ? (
                <div
                  aria-hidden
                  style={{
                    ...styles.heroBgCircle,
                    ...(isNarrow
                      ? {
                          width: "min(320px, 78%)",
                          transform: "translate(4%, 0)",
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
                />
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* WHO WE STAND FOR */}
      <section>
        <div style={styles.container}>
          {standFor?.title ? (
            <h2 style={styles.sectionTitle}>{standFor.title}</h2>
          ) : null}
          {standFor?.subtitle ? (
            <Paragraph style={styles.sectionSub}>{standFor.subtitle}</Paragraph>
          ) : null}

          <Row gutter={[16, 16]}>
            {standItems.map((it) => {
              const IconComp = it.icon;
              const isImageUrl = typeof IconComp === "string";
              return (
                <Col key={it.id} xs={24} sm={12} md={8} style={styles.standCol}>
                  <Card
                    style={styles.standCard}
                    bodyStyle={{
                      ...styles.standInner,
                      ...(isNarrow ? { minHeight: 160, padding: 16 } : null),
                    }}
                  >
                    {IconComp ? (
                      <div style={styles.standIconWrap}>
                        {isImageUrl ? (
                          <img src={IconComp} alt="" style={styles.standIcon} />
                        ) : (
                          (() => {
                            const Icon = IconComp;
                            return (
                              <Icon
                                size={44}
                                color="#ffffff"
                                strokeWidth={2.4}
                                aria-hidden
                              />
                            );
                          })()
                        )}
                      </div>
                    ) : null}
                    <Title level={4} style={styles.standTitle}>
                      {it.title}
                    </Title>
                    {it?.desc ? (
                      <Paragraph style={styles.standDesc}>{it.desc}</Paragraph>
                    ) : null}
                  </Card>
                </Col>
              );
            })}
          </Row>
        </div>
      </section>

      {/* OUR ACTIVITY */}
      <section style={{ marginTop: 24 }}>
        <div style={styles.container}>
          <div style={styles.activityWrap}>
            {activities?.title ? (
              <h2 style={styles.activityTitle}>{activities.title}</h2>
            ) : null}
            {activities?.subtitle ? (
              <Paragraph style={styles.activitySub}>
                {activities.subtitle}
              </Paragraph>
            ) : null}

            <div
              style={{
                width: "100%",
                paddingInline: "clamp(8px, 3vw, 16px)",
                "--act-card-w": `${cardDims.W}px`,
                "--act-card-h": `${cardDims.H}px`,
                "--act-img-h": `${cardDims.IMG_H}px`,
              }}
            >
              <div style={styles.actTrackMask}>
                <Swiper
                  className={ACT_SWIPER_CLASS}
                  modules={[Autoplay, FreeMode]}
                  slidesPerView="auto"
                  spaceBetween={cardDims.GAP}
                  loop
                  speed={reduced ? 2500 : 6500}
                  allowTouchMove
                  autoplay={
                    reduced
                      ? false
                      : {
                          delay: 0,
                          disableOnInteraction: false,
                          reverseDirection: true,
                        }
                  }
                  freeMode={{ enabled: true, momentum: false, sticky: false }}
                >
                  {activityItems.map((a) => (
                    <SwiperSlide
                      key={a.id}
                      style={{
                        width: "var(--act-card-w)",
                        display: "flex",
                        alignItems: "stretch",
                      }}
                    >
                      <Card style={styles.actCard} bodyStyle={{ padding: 0 }}>
                        {a?.image ? (
                          <img
                            src={a.image}
                            alt={a?.imgAlt || a.title}
                            style={styles.actImg}
                          />
                        ) : null}
                        <div style={styles.actBody}>
                          {a?.title ? (
                            <div style={styles.actTitle}>{a.title}</div>
                          ) : null}
                          {a?.desc ? (
                            <p style={styles.actDesc}>{a.desc}</p>
                          ) : null}
                        </div>
                      </Card>
                    </SwiperSlide>
                  ))}
                </Swiper>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CAREER WITH US */}
      <section style={styles.career2.section}>
        {career?.title ? (
          <h2 style={styles.career2.title}>{career.title}</h2>
        ) : null}
        <div
          style={{
            ...styles.career2.grid,
            ...(isNarrow
              ? { gridTemplateColumns: "1fr", textAlign: "left" }
              : null),
          }}
        >
          <div style={styles.career2.card}>
            {cardTitle ? (
              <h3 style={styles.career2.cardTitle}>{cardTitle}</h3>
            ) : null}
            {cardBody ? (
              <p style={styles.career2.cardBody}>{cardBody}</p>
            ) : null}
            {ctaLabel ? (
              <Button
                type="primary"
                size="large"
                style={{
                  ...styles.career2.ctaBtn,
                  ...(isNarrow ? { width: "100%", height: 58 } : null),
                }}
                onClick={goCareer}
              >
                {ctaLabel}
              </Button>
            ) : null}
          </div>
          <div style={styles.career2.rightImgWrap}>
            {mascotSrc ? (
              <img
                src={mascotSrc}
                alt={career?.imgAlt || "Career Mascot"}
                style={styles.career2.rightImg}
              />
            ) : null}
          </div>
        </div>
      </section>

      {/* Responsive tune-ups */}
      <style jsx global>{`
        .${ACT_SWIPER_CLASS} {
          overflow: hidden;
        }
        .${ACT_SWIPER_CLASS} .swiper-wrapper {
          align-items: stretch;
        }
        .${ACT_SWIPER_CLASS} .swiper-slide {
          height: auto;
        }
        .${ACT_SWIPER_CLASS} .swiper-slide > .ant-card {
          transition: transform 0.22s ease, box-shadow 0.22s ease;
          will-change: transform;
        }
        .${ACT_SWIPER_CLASS} .swiper-slide > .ant-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 22px rgba(0, 0, 0, 0.2);
        }

        /* Reduce hover lift on touch devices */
        @media (hover: none) {
          .${ACT_SWIPER_CLASS} .swiper-slide > .ant-card:hover {
            transform: none;
            box-shadow: none;
          }
        }

        /* Extra tweaks for very narrow phones */
        @media (max-width: 480px) {
          .${ACT_SWIPER_CLASS} .swiper-slide {
            width: calc(var(--act-card-w));
          }
        }
      `}</style>
    </div>
  );
}
