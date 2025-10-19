"use client";

import { useEffect, useMemo, useState } from "react";
import { Row, Col, Card, Typography, Button, Skeleton, Alert } from "antd";
import { Check, MessageCircle, Calendar } from "lucide-react";

const { Title } = Typography;

const FONT_FAMILY = '"Poppins", sans-serif';

/* ----------------- Base Styles ----------------- */
const styles = {
  sectionInner: {
    width: "min(1360px, 96%)",
    margin: "0 auto",
    fontFamily: FONT_FAMILY,
  },
  section: { padding: "0 0 16px" },

  /* ---------- HERO ---------- */
  hero: {
    wrapper: {
      background: "#0b56c9",
      borderRadius: 28,
      borderTopRightRadius: 120,
      borderBottomLeftRadius: 120,
      minHeight: 380,
      padding: "38px 48px",
      marginTop: "-8px",
      display: "grid",
      gridTemplateColumns: "1.1fr .9fr",
      gap: 28,
      alignItems: "center",
      color: "#fff",
      boxShadow: "0 24px 54px rgba(3, 30, 88, 0.28)",
      fontFamily: FONT_FAMILY,
    },
    left: {
      minWidth: 0,
      textAlign: "left",
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
    },
    right: { display: "flex", justifyContent: "center" },
    heading: {
      margin: 0,
      fontSize: 54,
      lineHeight: 1.06,
      fontWeight: 800,
      letterSpacing: 0.2,
      color: "#fff",
    },
    tagline: {
      margin: "16px 0 18px",
      fontSize: 17,
      lineHeight: 1.7,
      color: "rgba(255,255,255,.92)",
      textAlign: "left",
      maxWidth: 640,
    },
    chips: { display: "flex", gap: 12, flexWrap: "wrap", marginTop: 6 },
    chip: {
      appearance: "none",
      border: "1px solid rgba(255,255,255,.55)",
      background: "#fff",
      color: "#0a4ea7",
      borderRadius: 999,
      padding: "10px 16px",
      fontWeight: 700,
      boxShadow: "0 6px 14px rgba(7,49,140,.18)",
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      cursor: "default",
    },
    chipIconWrap: {
      display: "inline-flex",
      width: 18,
      height: 18,
      alignItems: "center",
      justifyContent: "center",
      background: "#e8f1ff",
      borderRadius: 999,
      color: "#0a4ea7",
      flex: "0 0 18px",
    },
    illustration: { width: "min(500px, 92%)", height: 320 },
  },

  /* ---------- DESCRIPTION ---------- */
  desc: {
    wrap: { marginTop: 64 },
    title: {
      margin: "0 0 12px",
      fontFamily: FONT_FAMILY,
      fontWeight: 800,
      fontSize: 44,
      lineHeight: 1.1,
      color: "#0f172a",
      letterSpacing: "0.01em",
    },
    text: {
      fontFamily: FONT_FAMILY,
      fontSize: 18,
      lineHeight: 1.9,
      letterSpacing: "0.04em",
      color: "#0f172a",
      margin: 0,
      textAlign: "justify", // ← rata kanan-kiri
    },
  },

  /* ---------- PACKAGE CARD ---------- */
  pack: {
    wrap: {
      position: "relative",
      overflow: "visible",
      marginTop: 24,
      width: "100%",
    },
    card: {
      position: "relative",
      background: "#fff",
      borderRadius: 20,
      border: "1px solid #e5e7eb",
      boxShadow: "0 10px 28px rgba(8,12,24,.06)",
      overflow: "hidden",
      zIndex: 1,
    },
    body: { padding: 20 },
    pricePill: {
      position: "absolute",
      top: -20,
      left: "50%",
      transform: "translateX(-50%)",
      background: "#f24e6a",
      color: "#fff",
      fontWeight: 800,
      fontSize: 18,
      padding: "10px 26px",
      borderRadius: 999,
      boxShadow: "0 10px 20px rgba(242,78,106,.25)",
      letterSpacing: ".01em",
      zIndex: 5,
      pointerEvents: "none",
    },
    imageWrap: {
      width: "100%",
      height: 190,
      borderRadius: 18,
      overflow: "hidden",
      border: "1px solid #e5e7eb",
      marginTop: 16,
    },
    iconWrap: {
      display: "grid",
      placeItems: "center",
      marginTop: 16,
      marginBottom: 8,
    },
    heading: {
      margin: "0 0 8px",
      textAlign: "center",
      fontWeight: 800,
      fontSize: 24,
      letterSpacing: ".02em",
      color: "#0f172a",
    },
    sub: {
      textAlign: "justify",
      color: "#64748b",
      marginRight: 10,
      marginLeft: 10,
      lineHeight: 1.6,
      letterSpacing: ".01em",
    },
    benefitTitle: {
      marginTop: 14,
      marginBottom: 8,
      textAlign: "center",
      fontSize: 24,
      fontWeight: 800,
      letterSpacing: ".02em",
      color: "#0f172a",
    },
    benefitList: {
      margin: 0,
      padding: 0,
      listStyle: "none",
      display: "grid",
      gap: 8,
      color: "#334155",
    },
    benefitItem: { display: "flex", alignItems: "center", gap: 8 },
    ctaWrap: { marginTop: 16, display: "flex", justifyContent: "center" },
    ctaBtn: {
      background: "linear-gradient(180deg,#2f7aff 0%, #1e4fd9 100%)",
      border: 0,
      padding: "14px 22px",
      height: "auto",
      borderRadius: 999,
      fontWeight: 800,
      boxShadow: "0 12px 24px rgba(47,122,255,.28)",
    },
  },
};

/* ----------------- Helpers ----------------- */
function Img({ src, alt, style }) {
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt={alt || ""}
      style={style}
      onError={(e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src =
          "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=1200&auto=format&fit=crop";
      }}
    />
  );
}

function stripHtml(html) {
  if (!html) return "";
  return String(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function ChipIcon({ type }) {
  if (type === "free-consult") return <MessageCircle size={14} />;
  if (type === "flex" || type === "schedule") return <Calendar size={14} />;
  return <Check size={14} />;
}

/* ----------------- Component ----------------- */
export default function EnglishCContent({
  hero,
  description,
  packages,
  loading,
  error,
}) {
  const {
    title = "KURSUS BAHASA INGGRIS",
    subtitle = "",
    bullets = [],
    illustration,
  } = hero || {};
  const heroBullets = Array.isArray(bullets) ? bullets : [];

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

  const sectionInnerStyle = useMemo(
    () => ({
      ...styles.sectionInner,
      width: isNarrow ? "min(100%, 96%)" : "min(1360px, 96%)",
    }),
    [isNarrow]
  );
  const sectionStyle = useMemo(
    () => ({ ...styles.section, padding: isNarrow ? "0 0 12px" : "0 0 16px" }),
    [isNarrow]
  );

  const heroWrapperStyle = useMemo(
    () => ({
      ...styles.hero.wrapper,
      gridTemplateColumns: isNarrow ? "1fr" : "1.1fr .9fr",
      padding: isNarrow ? "28px 24px" : "38px 48px",
      minHeight: isNarrow ? 340 : 380,
      marginTop: isNarrow ? "-6px" : "-8px",
    }),
    [isNarrow]
  );
  const heroHeadingStyle = useMemo(
    () => ({ ...styles.hero.heading, fontSize: isNarrow ? 38 : 54 }),
    [isNarrow]
  );
  const heroIllustrationStyle = useMemo(
    () => ({
      ...styles.hero.illustration,
      width: isNarrow ? "100%" : "min(500px, 92%)",
      height: isNarrow ? 220 : 320,
    }),
    [isNarrow]
  );

  const descTitleStyle = useMemo(
    () => ({ ...styles.desc.title, fontSize: isNarrow ? 30 : 44 }),
    [isNarrow]
  );
  const descTextStyle = useMemo(
    () => ({
      ...styles.desc.text,
      fontSize: isNarrow ? 16 : 18,
      lineHeight: isNarrow ? 1.8 : 1.9,
    }),
    [isNarrow]
  );

  return (
    <div
      className="page-wrap"
      style={{ paddingBottom: 48, fontFamily: FONT_FAMILY }}
    >
      {/* ===== HERO ===== */}
      <section style={{ padding: "0 0 24px" }}>
        <div style={sectionInnerStyle}>
          <div style={heroWrapperStyle}>
            <div style={styles.hero.left}>
              <h1 style={heroHeadingStyle}>{title}</h1>
              {subtitle ? <p style={styles.hero.tagline}>{subtitle}</p> : null}
              {heroBullets.length ? (
                <div style={styles.hero.chips}>
                  {heroBullets.map((b) => (
                    <span
                      key={b.id || b.label}
                      style={styles.hero.chip}
                      role="text"
                    >
                      <span aria-hidden style={styles.hero.chipIconWrap}>
                        <ChipIcon type={b.id} />
                      </span>
                      {b.label}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div style={styles.hero.right}>
              {illustration ? (
                <div style={heroIllustrationStyle}>
                  <Img
                    src={illustration}
                    alt="English Course Illustration"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                    }}
                  />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* ===== DESCRIPTION (justify) ===== */}
      <section style={sectionStyle}>
        <div style={sectionInnerStyle}>
          <div style={styles.desc.wrap}>
            <h2 style={descTitleStyle}>Deskripsi Program</h2>
            <p style={descTextStyle}>{description}</p>
          </div>
        </div>
      </section>

      {/* ===== PACKAGES ===== */}
      <section style={sectionStyle}>
        <div style={sectionInnerStyle}>
          <Title
            level={3}
            style={{
              marginTop: "75px",
              marginBottom: "100px",
              fontFamily: FONT_FAMILY,
              textAlign: "center",
              fontWeight: 800,
              fontSize: 40,
              lineHeight: 1.1,
              color: "#0f172a",
              letterSpacing: "0.01em",
            }}
          >
            Course Packages
          </Title>

          {error ? (
            <Alert
              type="error"
              message="Gagal memuat paket"
              description={error}
              showIcon
              style={{ marginBottom: 16 }}
            />
          ) : null}

          <Row gutter={[28, 28]}>
            {(loading ? Array.from({ length: 4 }) : packages).map((p, idx) => (
              <Col key={p?.id || idx} xs={24} md={12}>
                <div style={styles.pack.wrap}>
                  {!loading && (
                    <div style={styles.pack.pricePill}>
                      Rp. {new Intl.NumberFormat("id-ID").format(p.price || 0)}
                    </div>
                  )}

                  <Card
                    bordered={false}
                    style={styles.pack.card}
                    bodyStyle={styles.pack.body}
                  >
                    {loading ? (
                      <Skeleton.Image
                        active
                        style={{
                          width: "100%",
                          height: 190,
                          borderRadius: 18,
                          marginTop: 16,
                        }}
                      />
                    ) : (
                      <div style={styles.pack.imageWrap}>
                        <Img
                          src={p.image}
                          alt={p.title}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      </div>
                    )}

                    {loading ? null : p.icon ? (
                      <div style={styles.pack.iconWrap}>
                        <Img
                          src={p.icon}
                          alt="icon"
                          style={{
                            width: 56,
                            height: 56,
                            objectFit: "contain",
                          }}
                        />
                      </div>
                    ) : (
                      <div style={{ height: 8 }} />
                    )}

                    {loading ? (
                      <Skeleton active paragraph={{ rows: 2 }} title />
                    ) : (
                      <>
                        <h3 style={styles.pack.heading}>{p.title}</h3>
                        <p style={styles.pack.sub}>{stripHtml(p.desc)}</p>
                      </>
                    )}

                    {loading ? (
                      <div style={{ marginTop: 12 }}>
                        <Skeleton
                          active
                          paragraph={{ rows: 3 }}
                          title={false}
                        />
                      </div>
                    ) : (
                      <>
                        <h4 style={styles.pack.benefitTitle}>BENEFIT</h4>
                        <ul style={styles.pack.benefitList}>
                          {p.benefits.map((b, i) => (
                            <li key={i} style={styles.pack.benefitItem}>
                              <Check size={18} color="#16a34a" />
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}

                    <div style={styles.pack.ctaWrap}>
                      {loading ? (
                        <Skeleton.Button active />
                      ) : (
                        <a href={p.cta.href} target="_blank" rel="noreferrer">
                          <Button
                            type="primary"
                            size="large"
                            style={styles.pack.ctaBtn}
                          >
                            {p.cta.label}
                          </Button>
                        </a>
                      )}
                    </div>
                  </Card>
                </div>
              </Col>
            ))}
          </Row>
        </div>
      </section>
    </div>
  );
}
