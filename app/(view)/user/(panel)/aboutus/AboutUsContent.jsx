"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Typography, Row, Col } from "antd";

const { Title, Paragraph } = Typography;

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

const styles = {
  page: { width: "100%", overflow: "hidden" },
  container: { width: "min(1100px, 92%)", margin: "0 auto" },

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
    aspectRatio: "1 / 1",
    backgroundSize: "contain",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center",
    zIndex: 0,
    filter: "drop-shadow(0 6px 20px rgba(0,0,0,.08))",
    transform: "translate(10%, -0%)",
  },
  heroImg: {
    maxWidth: "560px",
    width: "100%",
    height: "auto",
    position: "relative",
    zIndex: 1,
  },

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

  activityWrap: {
    background: "#0B3E91",
    borderRadius: "32px",
    color: "#fff",
    padding: "clamp(20px, 6vw, 40px)",
    marginTop: "clamp(28px, 8vw, 64px)",
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
  },
  actImg: { width: "100%", height: 180, objectFit: "cover" },
  actBody: { padding: 16 },
  actTitle: {
    color: "#fff",
    fontWeight: 800,
    letterSpacing: "0.02em",
    marginBottom: 4,
    fontSize: 18,
  },
  actDesc: { color: "rgba(255,255,255,.92)", margin: 0, fontSize: 13 },

  careerWrap: { position: "relative", padding: "clamp(28px, 9vw, 64px) 0" },
  careerTitle: {
    color: "#1E56B7",
    fontWeight: 900,
    letterSpacing: "0.05em",
    textAlign: "center",
    fontSize: "clamp(28px, 5vw, 56px)",
    margin: "0 0 16px",
  },
  careerBtnWrap: { textAlign: "center" },
  careerBtn: {
    height: 54,
    borderRadius: 999,
    paddingInline: 36,
    fontWeight: 900,
    letterSpacing: "0.04em",
    background: "linear-gradient(180deg, #2C6BD3 0%, #114A9C 100%)",
    border: "none",
  },
  careerWatermark: {
    position: "absolute",
    inset: 0,
    backgroundSize: "contain",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center",
    opacity: 0.08,
    pointerEvents: "none",
  },
};

export default function AboutUsContent({ hero, standFor, activities, career }) {
  const isNarrow = useIsNarrow(900);
  const router = useRouter();

  const goCareer = () => {
    // force header aktif ke "career" via query menu
    router.push("/user/career?menu=career");
  };

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
              <Paragraph style={styles.heroDesc}>{hero.description}</Paragraph>

              {/* CTA: gunakan push agar ?menu=career ikut terkirim */}
              <Button
                type="primary"
                onClick={goCareer}
                style={styles.heroCta}
                size="large"
              >
                {hero.ctaLabel}
              </Button>
            </div>

            {/* Image + background circle */}
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
                    backgroundImage: `url(${hero.bgCircle})`,
                  }}
                />
              ) : null}

              <img
                src={hero.image}
                alt="About OSS Bali"
                style={styles.heroImg}
              />
            </div>
          </div>
        </div>
      </section>

      {/* WHO WE STAND FOR */}
      <section>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>{standFor.title}</h2>
          <Paragraph style={styles.sectionSub}>{standFor.subtitle}</Paragraph>

          <Row gutter={[16, 16]}>
            {standFor.items.map((it) => {
              const IconComp = it.icon;
              const isImageUrl = typeof IconComp === "string";

              return (
                <Col key={it.id} xs={24} sm={12} md={8} style={styles.standCol}>
                  <Card style={styles.standCard} bodyStyle={styles.standInner}>
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
                    <Paragraph style={styles.standDesc}>{it.desc}</Paragraph>
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
            <h2 style={styles.activityTitle}>{activities.title}</h2>
            <Paragraph style={styles.activitySub}>
              {activities.subtitle}
            </Paragraph>

            <Row gutter={[16, 16]}>
              {activities.items.map((a) => (
                <Col key={a.id} xs={24} md={12}>
                  <Card style={styles.actCard} bodyStyle={{ padding: 0 }}>
                    <img src={a.image} alt={a.title} style={styles.actImg} />
                    <div style={styles.actBody}>
                      <div style={styles.actTitle}>{a.title}</div>
                      <p style={styles.actDesc}>{a.desc}</p>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        </div>
      </section>

      {/* CAREER WITH US */}
      <section style={styles.careerWrap}>
        {career.watermark ? (
          <div
            style={{
              ...styles.careerWatermark,
              backgroundImage: `url(${career.watermark})`,
            }}
          />
        ) : null}
        <div style={styles.container}>
          <h2 style={styles.careerTitle}>{career.title}</h2>
          <div style={styles.careerBtnWrap}>
            <Button
              type="primary"
              size="large"
              style={styles.careerBtn}
              onClick={goCareer}
            >
              {career.ctaLabel}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
