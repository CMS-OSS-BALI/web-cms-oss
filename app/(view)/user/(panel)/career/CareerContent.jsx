// CareerContent.jsx
"use client";

import React, { useCallback } from "react";
import { Card, Row, Col, Typography, Button, Carousel, Avatar } from "antd";
import Image from "next/image";
import { useRouter } from "next/navigation";

const { Title, Paragraph, Text } = Typography;

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

/* ===== constants ===== */
const HEADER_H = "clamp(48px, 8vw, 84px)"; // tinggi header global

/* ===== styles ===== */
const styles = {
  // HERO
  hero: {
    marginTop: `calc(-1 * ${HEADER_H})`,
    background: "#fff",
  },
  heroBleed: { width: "100vw", marginLeft: "calc(50% - 50vw)" },
  heroImgFrame: {
    position: "relative",
    width: "100vw",
    height: "clamp(520px, 78vh, 920px)",
    background: "#e8f0ff",
    overflow: "hidden",
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

  // SECTIONS
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
    margin: "12px auto 36px",
  },

  // BENEFITS (desktop defaults; mobile diatur via CSS di bawah)
  benefitRow: { marginTop: 6 },
  benefitCard: {
    background: "#fff",
    border: 0,
    borderRadius: 20,
    boxShadow: "0 14px 34px rgba(13, 28, 62, 0.08)",
    height: "100%",
  },
  benefitBody: { padding: 24 },
  benefitIconBox: { width: 104, height: 104, display: "grid", placeItems: "center" },
  benefitIcon: { width: 88, height: 88, display: "block" },
  benefitTitle: {
    fontWeight: 900,
    color: "#0b2a53",
    marginBottom: 10,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    fontSize: "clamp(14px, 1.6vw, 18px)",
  },
  benefitList: {
    margin: "6px 0 0",
    paddingLeft: 18,
    listStyle: "disc",
    textTransform: "uppercase",
    color: "#0f172a",
    letterSpacing: 0.2,
    lineHeight: 1.9,
    fontSize: "clamp(12px, 1.4vw, 14px)",
  },

  // CULTURE
  cultureGrid: { marginTop: 8 },
  cultureLeftWrap: {
    position: "relative",
    borderRadius: 16,
    overflow: "hidden",
    boxShadow: "0 18px 42px rgba(15,23,42,0.18)",
  },
  cultureLeftImg: { width: "100%", height: "auto", display: "block" },
  cultureLeftFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "40%",
    background:
      "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.35) 50%, rgba(0,0,0,0.6) 100%)",
  },
  cultureLeftBadge: {
    position: "absolute",
    left: 14,
    bottom: 14,
    color: "#fff",
    fontWeight: 900,
    letterSpacing: 0.6,
    fontSize: "clamp(18px, 2.4vw, 28px)",
    textTransform: "uppercase",
    textShadow: "0 3px 14px rgba(0,0,0,0.45)",
  },
  cultureLeftHeading: {
    marginTop: 14,
    fontWeight: 900,
    color: "#0b2a53",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    fontSize: "clamp(16px, 2vw, 22px)",
  },
  cultureLeftDesc: { color: "#111827", marginTop: 6, lineHeight: 1.7 },

  cultureRow: { marginBottom: 18 },
  cultureThumbWrap: {
    position: "relative",
    borderRadius: 16,
    overflow: "hidden",
    height: 150,
    boxShadow: "0 10px 26px rgba(15,23,42,0.12)",
  },
  cultureThumbImg: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  cultureThumbFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "55%",
    background:
      "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.65) 100%)",
  },
  cultureThumbLabel: {
    position: "absolute",
    left: 14,
    bottom: 12,
    color: "#fff",
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    fontSize: "clamp(12px, 1.6vw, 18px)",
    textShadow: "0 3px 12px rgba(0,0,0,0.45)",
  },
  cultureRightTitle: {
    fontWeight: 900,
    color: "#0b2a53",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 6,
    fontSize: "clamp(14px, 1.6vw, 18px)",
  },
  cultureRightText: { color: "#334155", lineHeight: 1.7, margin: 0 },

  // TESTIMONIALS
  testimonialWrap: {
    borderRadius: 16,
    border: "1px solid #e6eefc",
    background: "#fff",
    boxShadow: "0 12px 28px rgba(14,116,233,0.08)",
    padding: 16,
  },

  // CTA
  ctaSectionTitle: {
    textAlign: "center",
    fontWeight: 900,
    color: "#0b2a53",
    letterSpacing: 0.6,
    marginBottom: 10,
    textTransform: "uppercase",
    fontSize: "clamp(22px, 3.2vw, 32px)",
  },
  ctaSubtitle: {
    textAlign: "center",
    maxWidth: 720,
    margin: "18px auto 26px",
    color: "#0b2a53",
    lineHeight: 1.5,
    fontWeight: 800,
    fontStyle: "italic",
    fontSize: "clamp(18px, 3.2vw, 28px)",
  },
  ctaButtonsRow: {
    display: "flex",
    gap: 16,
    justifyContent: "center",
    flexWrap: "wrap",
    marginTop: 12,
    marginBottom: 32,
  },
  ctaBtn: {
    background: "#0B56B8",
    border: "none",
    color: "#fff",
    height: "clamp(48px, 7vw, 64px)",
    minWidth: "clamp(140px, 42vw, 280px)",
    padding: "0 clamp(18px, 3.2vw, 34px)",
    borderRadius: 9999,
    fontWeight: 900,
    letterSpacing: 0.6,
    fontSize: "clamp(14px, 2.2vw, 18px)",
    textTransform: "uppercase",
    boxShadow: "0 12px 20px rgba(11,86,184,0.28)",
  },
  ctaBtnGhost: {
    background: "#0B56B8",
    border: "none",
    color: "#fff",
    height: "clamp(48px, 7vw, 64px)",
    minWidth: "clamp(140px, 42vw, 280px)",
    padding: "0 clamp(18px, 3.2vw, 34px)",
    borderRadius: 9999,
    fontWeight: 900,
    letterSpacing: 0.6,
    fontSize: "clamp(14px, 2.2vw, 18px)",
    textTransform: "uppercase",
    boxShadow: "0 12px 20px rgba(11,86,184,0.28)",
  },
  ctaVisual: {
    position: "relative",
    width: "clamp(220px, 68vw, 420px)",
    aspectRatio: "1/1",
    margin: "36px auto 0",
  },
  ctaBgCircle: {
    position: "absolute",
    inset: 0,
    borderRadius: "50%",
    background: "#F0B12D",
    zIndex: 1,
  },
  ctaImgCircle: {
    position: "absolute",
    inset: 0,
    borderRadius: "50%",
    overflow: "hidden",
    boxShadow: "0 18px 42px rgba(15,23,42,0.18)",
    zIndex: 2,
  },
};

export default function CareerContent({
  hero,
  benefits,
  culture,
  testimonials,
  onCTATeam,
  onCTAReferral,
  ctaImage,
}) {
  const router = useRouter();
  const isNarrow = useIsNarrow(900);

  const handleTeam = useCallback(() => {
    if (onCTATeam) return onCTATeam();
  }, [onCTATeam]);

  const handleReferral = useCallback(() => {
    if (onCTAReferral) return onCTAReferral();
    router.push("/user/referral?menu=about");
  }, [onCTAReferral, router]);

  const ctaImg = ctaImage || "/cta-girl.svg";

  const heroFrameStyle = {
    ...styles.heroImgFrame,
    height: isNarrow
      ? "clamp(380px, 66vh, 680px)"
      : `calc(100vh + ${HEADER_H} + 1px)`,
    background: isNarrow ? "transparent" : styles.heroImgFrame.background,
  };

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
              style={{ objectFit: "cover", objectPosition: hero.objectPosition || "50% 45%" }}
            />
            <div style={styles.heroTextTopCenter}>
              <h1 style={styles.heroH1}>{hero.title}</h1>
              {hero.quote ? <div style={styles.heroSub}>&quot;{hero.quote}&quot;</div> : null}
            </div>
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section
        style={{
          ...styles.section,
          margin: isNarrow ? "48px auto 72px" : styles.section.margin,
        }}
      >
        <Title level={2} style={styles.sectionTitle}>
          BENEFIT JOIN WITH US
        </Title>
        <div style={styles.sectionUnderline} />

        <Row gutter={[24, 24]} style={styles.benefitRow}>
          {benefits.map((b) => (
            <Col key={b.key} xs={24} md={12} style={{ display: "flex" }}>
              <Card
                className="benefit-card"
                style={styles.benefitCard}
                bodyStyle={{ ...styles.benefitBody, width: "100%" }}
              >
                {/* grid khusus responsive agar mirip desain */}
                <div className="benefit-grid">
                  <div className="benefit-icon-box">
                    <Image
                      src={b.icon}
                      alt={b.title}
                      width={88}
                      height={88}
                      className="benefit-icon"
                      style={styles.benefitIcon}
                    />
                  </div>
                  <div className="benefit-content">
                    <Text className="benefit-title" style={styles.benefitTitle}>
                      {b.title}
                    </Text>
                    <ul className="benefit-list" style={styles.benefitList}>
                      {b.points.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        {/* ==== CSS responsive untuk section Benefit ==== */}
        <style jsx global>{`
          /* Grid layout agar ikon di kiri & konten di kanan saat mobile */
          .benefit-grid {
            display: grid;
            grid-template-columns: 104px 1fr;
            align-items: start;
            gap: 14px;
          }
          .benefit-icon-box {
            width: 104px;
            height: 104px;
            display: grid;
            place-items: center;
          }
          .benefit-title {
            display: block;
            margin-bottom: 10px;
            text-transform: uppercase;
            font-weight: 900;
            letter-spacing: 0.6px;
          }
          .benefit-list {
            margin: 6px 0 0;
            padding-left: 18px;
            list-style: disc;
            text-transform: uppercase;
            letter-spacing: 0.2px;
            line-height: 1.9;
          }
          /* warna peluru sesuai brand */
          .benefit-list li::marker {
            color: #0b56b8;
          }

          /* ====== Responsive (<= 900px) agar mirip desain mobile ====== */
          @media (max-width: 900px) {
            .benefit-card {
              border-radius: 16px !important;
              box-shadow: 0 10px 26px rgba(13, 28, 62, 0.08) !important;
              min-height: 210px; /* tinggi konsisten per kartu */
            }
            .benefit-grid {
              grid-template-columns: 72px 1fr; /* ikon lebih kecil */
              gap: 12px;
            }
            .benefit-icon-box {
              width: 72px;
              height: 72px;
            }
            .benefit-icon {
              width: 60px !important;
              height: 60px !important;
            }
            .benefit-title {
              font-size: 15px !important;
              margin-bottom: 8px;
            }
            .benefit-list {
              font-size: 13.5px !important;
              line-height: 1.85;
              padding-left: 16px;
            }
          }

          /* ====== Tablet Landscape up to small desktop (901–1200px) ====== */
          @media (min-width: 901px) and (max-width: 1200px) {
            .benefit-grid {
              grid-template-columns: 88px 1fr;
            }
            .benefit-icon-box {
              width: 88px;
              height: 88px;
            }
            .benefit-icon {
              width: 72px !important;
              height: 72px !important;
            }
          }
        `}</style>
      </section>

      {/* CORPORATE CULTURE */}
      <section
        style={{
          ...styles.section,
          margin: isNarrow ? "48px auto 72px" : styles.section.margin,
        }}
      >
        <Title level={2} style={styles.sectionTitle}>
          CORPORATE CULTURE
        </Title>
        <div style={styles.sectionUnderline} />

        <Row gutter={[20, 20]} style={styles.cultureGrid}>
          {/* Left big image */}
          <Col xs={24} lg={13}>
            <div style={styles.cultureLeftWrap}>
              <Image
                src={culture.leftImage}
                alt="Weekly meeting"
                width={1280}
                height={860}
                style={styles.cultureLeftImg}
              />
              <div style={styles.cultureLeftFade} />
              <div style={styles.cultureLeftBadge}>WEEKLY MEETING</div>
            </div>

            <div style={styles.cultureLeftHeading}>KOMUNIKASI TERBUKA DAN TRANSARAN</div>
            <Paragraph style={styles.cultureLeftDesc}>
              Transparansi bukan hanya nilai, tapi cara kami bekerja. Bersama,
              kita ciptakan ruang kerja yang inspiratif dan inklusif.
            </Paragraph>
          </Col>

          {/* Right rows */}
          <Col xs={24} lg={11}>
            {culture.items.map((c) => (
              <Row gutter={16} key={c.key} style={styles.cultureRow} wrap={isNarrow}>
                <Col flex={isNarrow ? "100%" : "220px"}>
                  <div
                    style={{
                      ...styles.cultureThumbWrap,
                      ...(isNarrow ? { height: 180, marginBottom: 8 } : null),
                    }}
                  >
                    <Image src={c.image} alt={c.title} width={400} height={260} style={styles.cultureThumbImg} />
                    <div style={styles.cultureThumbFade} />
                    <span style={styles.cultureThumbLabel}>{c.label || c.title}</span>
                  </div>
                </Col>
                <Col flex="auto">
                  <div>
                    <div style={styles.cultureRightTitle}>{c.title}</div>
                    <Paragraph style={styles.cultureRightText}>{c.body}</Paragraph>
                  </div>
                </Col>
              </Row>
            ))}
          </Col>
        </Row>
      </section>

      {/* TESTIMONIALS */}
      <section
        style={{
          ...styles.section,
          margin: isNarrow ? "48px auto 72px" : styles.section.margin,
        }}
      >
        <Title level={3} style={styles.sectionTitle}>
          YOUR SUCCESS STORY BEGINS WITH US
        </Title>
        <div style={styles.sectionUnderline} />
        <div style={styles.testimonialWrap}>
          <Carousel autoplay dots>
            {testimonials.map((t) => (
              <div key={t.id}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isNarrow ? "48px 1fr" : "56px 1fr",
                    gap: 12,
                    alignItems: "center",
                    maxWidth: 820,
                    margin: "0 auto",
                  }}
                >
                  <Avatar size={isNarrow ? 48 : 56} src={t.avatar} />
                  <div>
                    <Text strong>
                      {t.name} <Text type="secondary">— {t.role}</Text>
                    </Text>
                    <Paragraph style={{ marginTop: 6, color: "#334155" }}>{t.quote}</Paragraph>
                  </div>
                </div>
              </div>
            ))}
          </Carousel>
        </div>
      </section>

      {/* CTA */}
      <section
        style={{
          ...styles.section,
          paddingBottom: 40,
          margin: isNarrow ? "48px auto 72px" : styles.section.margin,
        }}
      >
        <Title level={3} style={styles.ctaSectionTitle}>
          CAREER WITH US
        </Title>
        <div style={styles.sectionUnderline} />

        <Paragraph style={styles.ctaSubtitle}>
          <strong>
            <em>
              “Grow Your Career, Unlock New Opportunities,
              <br />
              And Create Impact Together.”
            </em>
          </strong>
        </Paragraph>

        <div style={styles.ctaButtonsRow}>
          <Button size="large" style={styles.ctaBtn} onClick={handleTeam}>
            TEAM MEMBER
          </Button>
          <Button size="large" style={styles.ctaBtnGhost} onClick={handleReferral}>
            REFERRAL
          </Button>
        </div>

        <div style={styles.ctaVisual}>
          <div style={styles.ctaBgCircle} />
          <div style={styles.ctaImgCircle}>
            <Image
              src={ctaImg}
              alt="Career CTA"
              width={1200}
              height={1200}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              priority
            />
          </div>
        </div>
      </section>
    </div>
  );
}
