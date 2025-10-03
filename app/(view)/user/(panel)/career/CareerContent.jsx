"use client";

import React, { useCallback } from "react";
import { Card, Row, Col, Typography, Button, Carousel, Avatar } from "antd";
import Image from "next/image";
import { useRouter } from "next/navigation";

const { Title, Paragraph, Text } = Typography;

const styles = {
  wrap: { width: "100vw", marginLeft: "calc(50% - 50vw)" },

  // HERO
  hero: {
    marginTop: "calc(-1 * clamp(48px, 8vw, 84px))",
    background: "#fff",
  },
  heroBleed: {
    width: "100vw",
    marginLeft: "calc(50% - 50vw)",
  },
  heroImgFrame: {
    position: "relative",
    width: "100vw",
    height: "clamp(630px, 90vh, 1050px)",
    background: "#e8f0ff",
    overflow: "hidden",
  },
  heroContentFloating: {
    position: "absolute",
    right: "max(24px, 6vw)",
    top: "52%",
    transform: "translateY(-50%)",
    maxWidth: 560,
    textAlign: "right",
  },
  heroTitle: {
    fontWeight: 800,
    fontSize: "clamp(28px, 3.8vw, 52px)",
    letterSpacing: 0.6,
    color: "#0b3a77",
    margin: 0,
    textShadow: "0 2px 10px rgba(0,0,0,0.15)",
  },
  heroQuote: {
    color: "#0b2a53",
    opacity: 0.95,
    marginTop: 10,
    fontStyle: "italic",
    fontSize: "clamp(14px, 1.6vw, 18px)",
    lineHeight: 1.45,
    textShadow: "0 1px 6px rgba(0,0,0,0.12)",
  },

  // SECTIONS
  section: {
    width: "min(1180px, 92%)",
    margin: "84px auto 108px",
  },
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

  // BENEFITS
  benefitRow: { marginTop: 6 },
  benefitCard: {
    background: "#fff",
    border: 0,
    borderRadius: 20,
    boxShadow: "0 14px 34px rgba(13, 28, 62, 0.08)",
    height: "100%",
  },
  benefitBody: { padding: 24 },
  benefitIconCol: { width: 120 },
  benefitIconBox: {
    width: 104,
    height: 104,
    display: "grid",
    placeItems: "center",
  },
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

  // CORPORATE CULTURE
  cultureGrid: { marginTop: 8 },

  // Left (big image)
  cultureLeftWrap: {
    position: "relative",
    borderRadius: 16,
    overflow: "hidden",
    boxShadow: "0 18px 42px rgba(15,23,42,0.18)",
  },
  cultureLeftImg: {
    width: "100%",
    height: "auto",
    display: "block",
  },
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
  cultureLeftDesc: {
    color: "#111827",
    marginTop: 6,
    lineHeight: 1.7,
  },

  // Right (three rows)
  cultureRow: { marginBottom: 18 },
  cultureThumbWrap: {
    position: "relative",
    borderRadius: 16,
    overflow: "hidden",
    height: 150,
    boxShadow: "0 10px 26px rgba(15,23,42,0.12)",
  },
  cultureThumbImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
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
    fontSize: "clamp(22px, 3.2vw, 32px)", // title size
  },
  ctaSubtitle: {
    textAlign: "center",
    maxWidth: 720,
    margin: "18px auto 26px",
    color: "#0b2a53",
    lineHeight: 1.5,
    fontWeight: 800,
    fontStyle: "italic",
    fontSize: "clamp(22px, 3.2vw, 32px)", // same size as title
  },
  ctaButtonsRow: {
    display: "flex",
    gap: 28,
    justifyContent: "center",
    flexWrap: "wrap",
    marginTop: 12,
    marginBottom: 32,
  },
  ctaBtn: {
    background: "#0B56B8",
    border: "none",
    color: "#fff",
    height: 64,
    minWidth: 280,
    padding: "0 34px",
    borderRadius: 9999,
    fontWeight: 900,
    letterSpacing: 0.6,
    fontSize: 18,
    textTransform: "uppercase",
    boxShadow: "0 12px 20px rgba(11,86,184,0.28)",
  },
  ctaBtnGhost: {
    background: "#0B56B8",
    border: "none",
    color: "#fff",
    height: 64,
    minWidth: 280,
    padding: "0 34px",
    borderRadius: 9999,
    fontWeight: 900,
    letterSpacing: 0.6,
    fontSize: 18,
    textTransform: "uppercase",
    boxShadow: "0 12px 20px rgba(11,86,184,0.28)",
  },
  ctaVisual: {
    position: "relative",
    width: 420,
    maxWidth: "78vw",
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

export default function CareerContent(props) {
  const {
    hero,
    benefits,
    culture,
    testimonials,
    onCTATeam,
    onCTAReferral,
    ctaImage,
  } = props;

  const router = useRouter();

  // Default handlers (use provided props if any)
  const handleTeam = useCallback(() => {
    if (onCTATeam) return onCTATeam();
    // no-op fallback (or route somewhere if you want):
    // router.push("/user/career?menu=about#open-positions");
  }, [onCTATeam]);

  const handleReferral = useCallback(() => {
    if (onCTAReferral) return onCTAReferral();
    // Keep About Us active in header
    router.push("/user/referral?menu=about");
  }, [onCTAReferral, router]);

  const ctaImg = ctaImage || "/cta-girl.svg";

  return (
    <div>
      {/* HERO */}
      <section style={styles.hero}>
        <div style={styles.heroBleed}>
          <div style={styles.heroImgFrame}>
            <Image
              src={hero.image}
              alt="Career hero"
              fill
              priority
              sizes="100vw"
              style={{
                objectFit: "cover",
                objectPosition: hero.objectPosition || "45% 42%",
              }}
            />
            <div style={styles.heroContentFloating}>
              <Title level={1} style={styles.heroTitle}>
                {hero.title}
              </Title>
              <Paragraph style={styles.heroQuote}>{hero.quote}</Paragraph>
            </div>
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section style={styles.section}>
        <Title level={2} style={styles.sectionTitle}>
          BENEFIT JOIN WITH US
        </Title>
        <div style={styles.sectionUnderline} />

        <Row gutter={[24, 24]} style={styles.benefitRow}>
          {benefits.map((b) => (
            <Col key={b.key} xs={24} md={12}>
              <Card style={styles.benefitCard} bodyStyle={styles.benefitBody}>
                <Row gutter={14} align="middle" wrap={false}>
                  <Col flex="120px" style={styles.benefitIconCol}>
                    <div style={styles.benefitIconBox}>
                      <Image
                        src={b.icon}
                        alt={b.title}
                        width={88}
                        height={88}
                        style={styles.benefitIcon}
                      />
                    </div>
                  </Col>
                  <Col flex="auto">
                    <Text style={styles.benefitTitle}>{b.title}</Text>
                    <ul style={styles.benefitList}>
                      {b.points.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </Col>
                </Row>
              </Card>
            </Col>
          ))}
        </Row>
      </section>

      {/* CORPORATE CULTURE */}
      <section style={styles.section}>
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

            <div style={styles.cultureLeftHeading}>
              KOMUNIKASI TERBUKA DAN TRANSARAN
            </div>
            <Paragraph style={styles.cultureLeftDesc}>
              Transparansi bukan hanya nilai, tapi cara kami bekerja. Bersama,
              kita ciptakan ruang kerja yang inspiratif dan inklusif.
            </Paragraph>
          </Col>

          {/* Right rows */}
          <Col xs={24} lg={11}>
            {culture.items.map((c) => (
              <Row
                gutter={16}
                key={c.key}
                style={styles.cultureRow}
                wrap={false}
              >
                <Col flex="220px">
                  <div style={styles.cultureThumbWrap}>
                    <Image
                      src={c.image}
                      alt={c.title}
                      width={400}
                      height={260}
                      style={styles.cultureThumbImg}
                    />
                    <div style={styles.cultureThumbFade} />
                    <span style={styles.cultureThumbLabel}>
                      {c.label || c.title}
                    </span>
                  </div>
                </Col>
                <Col flex="auto">
                  <div>
                    <div style={styles.cultureRightTitle}>{c.title}</div>
                    <Paragraph style={styles.cultureRightText}>
                      {c.body}
                    </Paragraph>
                  </div>
                </Col>
              </Row>
            ))}
          </Col>
        </Row>
      </section>

      {/* TESTIMONIALS */}
      <section style={styles.section}>
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
                    gridTemplateColumns: "56px 1fr",
                    gap: 12,
                    alignItems: "center",
                    maxWidth: 820,
                    margin: "0 auto",
                  }}
                >
                  <Avatar size={56} src={t.avatar} />
                  <div>
                    <Text strong>
                      {t.name} <Text type="secondary">— {t.role}</Text>
                    </Text>
                    <Paragraph style={{ marginTop: 6, color: "#334155" }}>
                      {t.quote}
                    </Paragraph>
                  </div>
                </div>
              </div>
            ))}
          </Carousel>
        </div>
      </section>

      {/* CTA */}
      <section style={{ ...styles.section, paddingBottom: 40 }}>
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
          <Button
            size="large"
            style={styles.ctaBtnGhost}
            onClick={handleReferral}
          >
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
