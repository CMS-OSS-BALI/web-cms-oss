"use client";

import { useMemo } from "react";
import { Card, Col, Image, Row, Typography, Collapse, Tag } from "antd";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, FreeMode } from "swiper/modules";
import "swiper/css";

import Link from "next/link";
import { useLandingViewModel } from "./useLandingViewModel";
import { sanitizeHtml } from "@/app/utils/dompurify";

const { Title, Paragraph, Text } = Typography;

/** Correct base path = route to your detail page folder */
const CONSULTANT_DETAIL_BASE = "/user/landing-page";

/* =================== HERO =================== */
const heroStyles = {
  section: {
    width: "100vw",
    marginLeft: "calc(50% - 50vw)",
    marginRight: "calc(50% - 50vw)",
    marginTop: "calc(-1 * clamp(48px, 8vw, 84px))",
    color: "#ffffff",
    overflow: "hidden",
  },
  inner: (background) => ({
    position: "relative",
    isolation: "isolate",
    width: "100vw",
    marginLeft: "calc(50% - 50vw)",
    marginRight: "calc(50% - 50vw)",
    backgroundImage: `url(${background})`,
    backgroundRepeat: "no-repeat",
    backgroundSize: "cover",
    backgroundPosition: "center top",
    minHeight: "clamp(520px, 84vw, 980px)",
    paddingTop: "clamp(16px, 5vh, 28px)",
    paddingBottom: "clamp(28px, 7vh, 48px)",
    display: "grid",
    placeItems: "start center",
  }),
  overlay: { position: "absolute", inset: 0, zIndex: 0 },
  copy: {
    position: "relative",
    zIndex: 1,
    width: "min(880px, 92%)",
    gridRow: "1 / 2",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    gap: "clamp(14px, 2.2vw, 18px)",
    paddingInline: "clamp(12px, 4vw, 32px)",
  },
  eyebrow: {
    margin: 0,
    fontSize: "14px",
    fontWeight: 700,
    letterSpacing: "0.28em",
    textTransform: "uppercase",
    color: "#0B3E91",
  },
  title: {
    margin: 0,
    fontSize: "clamp(42px, 8vw, 86px)",
    lineHeight: 1.02,
    fontWeight: 800,
    letterSpacing: "0.06em",
    alignSelf: "center",
    textTransform: "uppercase",
    color: "#004A9E",
    textShadow: "0 8px 24px rgba(0, 36, 96, 0.18)",
    whiteSpace: "nowrap",
    wordBreak: "keep-all",
  },
  text: {
    margin: 0,
    maxWidth: "min(840px, 95%)",
    alignSelf: "center",
    fontSize: "clamp(17px, 2.2vw, 23px)",
    lineHeight: 1.65,
    fontWeight: 700,
    color: "#0B3E91",
  },
};

/* =================== METRICS =================== */
const metricsStyles = {
  wrap: {
    position: "absolute",
    left: "50%",
    transform: "translateX(-50%)",
    bottom: 0,
    zIndex: 3,
    width: "100vw",
    boxShadow: "0 14px 28px rgba(5, 32, 112, 0.16)",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 0,
    alignItems: "stretch",
    minHeight: "clamp(120px, 16vw, 180px)",
  },
  item: (background) => ({
    background,
    color: "#fff",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    padding: "clamp(18px, 3vw, 24px)",
    borderRadius: 0,
    border: "none",
  }),
  value: {
    margin: 0,
    fontSize: "clamp(28px, 4.8vw, 56px)",
    fontWeight: 800,
    letterSpacing: "0.04em",
    lineHeight: 1.05,
    color: "#fff",
  },
  label: {
    margin: 0,
    fontSize: "clamp(13px, 2.2vw, 20px)",
    fontWeight: 600,
    letterSpacing: "0.02em",
    opacity: 1,
    color: "#fff",
  },
};

/* =================== WHY CHOOSE =================== */
const whyStyles = {
  section: {
    width: "100vw",
    marginLeft: "-170px",
    background: "#ffffff",
    padding:
      "clamp(72px, 11vw, 144px) clamp(24px, 6vw, 48px) clamp(80px, 12vw, 160px)",
    marginTop: "-140px",
  },
  container: {
    width: "min(1220px, 100%)",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "clamp(36px, 6vw, 54px)",
  },
  title: {
    margin: 0,
    fontSize: "clamp(32px, 5.6vw, 56px)",
    fontWeight: 800,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "#1252a8",
    textAlign: "center",
  },
  col: { display: "flex" },
  card: {
    borderRadius: 36,
    border: "none",
    background: "#004A9E",
    color: "#ffffff",
    boxShadow: "0 26px 36px rgba(8, 42, 116, 0.24)",
    borderInline: 0,
    width: "100%",
    display: "flex",
    flexDirection: "column",
    flex: 1,
  },
  cardBody: {
    flex: 1,
    minHeight: "clamp(320px, 34vw, 420px)",
    height: "100%",
    padding: "clamp(32px, 6vw, 40px) clamp(24px, 5vw, 32px)",
    display: "grid",
    gridTemplateRows: "auto auto 1fr",
    alignItems: "center",
    justifyItems: "center",
    gap: "clamp(16px, 4vw, 24px)",
    textAlign: "center",
  },
  icon: {
    width: "clamp(90px, 10vw, 140px)",
    height: "clamp(90px, 10vw, 140px)",
    objectFit: "contain",
  },
  value: {
    margin: 0,
    fontSize: "clamp(28px, 5vw, 38px)",
    fontWeight: 800,
    letterSpacing: "0.1em",
    color: "#ffd042",
  },
  label: {
    margin: 0,
    fontSize: "clamp(15px, 2.5vw, 18px)",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    lineHeight: 1.5,
    color: "#ffffff",
  },
};

/* =================== POPULAR =================== */
const popularStyles = {
  section: {
    width: "100vw",
    marginLeft: "-170px",
    background: "#ffffff",
    padding: "clamp(64px, 9vw, 120px) clamp(20px, 6vw, 48px)",
    marginTop: "-140px",
  },
  container: {
    width: "min(1220px, 100%)",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "clamp(18px, 3.5vw, 28px)",
  },
  title: {
    margin: 0,
    fontSize: "clamp(32px, 5.6vw, 56px)",
    fontWeight: 900,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#0B3E91",
    textAlign: "center",
  },
  subtitle: {
    margin: 0,
    maxWidth: "min(880px, 95%)",
    textAlign: "center",
    color: "#2a3e65",
    fontSize: "clamp(15px, 1.9vw, 18px)",
    lineHeight: 1.75,
    fontWeight: 500,
  },
  grid: {
    width: "100%",
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "clamp(16px, 2.6vw, 24px)",
    marginTop: "clamp(18px, 3.6vw, 28px)",
  },
  tile: {
    position: "relative",
    borderRadius: 22,
    overflow: "hidden",
    boxShadow: "0 16px 38px rgba(8,42,116,0.18)",
    background: "#eef3ff",
  },
  imgWrap: {
    position: "relative",
    width: "100%",
    aspectRatio: "4 / 3",
    overflow: "hidden",
  },
  img: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  pill: {
    position: "absolute",
    left: "50%",
    bottom: 12,
    transform: "translateX(-50%)",
    background: "#0B3E91",
    color: "#fff",
    borderRadius: 999,
    padding: "12px 18px",
    fontWeight: 800,
    fontSize: "clamp(12px, 1.6vw, 14px)",
    letterSpacing: "0.04em",
    boxShadow: "0 10px 20px rgba(8,42,116,0.22)",
    whiteSpace: "nowrap",
  },
};

/* =================== TESTIMONIALS (Marquee) =================== */
const TESTI_SWIPER_CLASS = "landing-testimonials-swiper";

const testiStyles = {
  section: {
    width: "100vw",
    marginLeft: "-170px",
    background: "#ffffff",
    padding: "96px 24px 120px",
    marginTop: "-140px",
  },
  container: {
    width: "min(1220px, 100%)",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 18,
  },
  title: {
    margin: 0,
    fontSize: 56,
    fontWeight: 900,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#0B3E91",
    textAlign: "center",
  },
  subtitle: {
    margin: 0,
    color: "#2a3e65",
    fontSize: 18,
    lineHeight: 1.7,
    textAlign: "center",
    maxWidth: 820,
  },
  slideWrap: {
    width: "100vw",
    marginLeft: "calc(50% - 50vw)",
    marginRight: "calc(50% - 50vw)",
    paddingInline: "clamp(12px, 4vw, 24px)",
    marginTop: "70px",
    overflow: "visible",
  },
  cardShell: {
    position: "relative",
    background: "#004A9E",
    border: "none",
    borderRadius: 16,
    boxShadow: "0 18px 34px rgba(0,0,0,.22)",
    overflow: "visible",
    paddingTop: 90,
    height: "var(--testi-card-h, 420px)",
    display: "flex",
    flexDirection: "column",
  },
  cardBody: {
    padding: "22px 20px 28px",
    display: "grid",
    gridTemplateRows: "auto auto 1fr",
    gap: 14,
    flex: 1,
    overflow: "hidden",
  },
  avatarWrap: {
    position: "absolute",
    top: -60,
    left: "50%",
    transform: "translateX(-50%)",
    width: 120,
    height: 120,
    borderRadius: "50%",
    overflow: "hidden",
    border: "8px solid #004A9E",
    boxShadow: "0 10px 24px rgba(0,0,0,.35)",
    background: "#111",
    zIndex: 5,
  },
  avatar: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  name: {
    margin: "8px 0 0",
    textAlign: "center",
    fontSize: 16,
    fontWeight: 800,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#FFFFFF",
  },
  campus: {
    marginTop: 6,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },

  stars: {
    display: "flex",
    gap: 10,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 6,
  },
  star: { fontSize: 20, lineHeight: 1 },
  quoteWrap: {
    marginTop: 8,
    color: "#E9EEF7",
    fontSize: 14,
    lineHeight: 1.75,
    textAlign: "center",
    display: "-webkit-box",
    WebkitBoxOrient: "vertical",
    WebkitLineClamp: 5,
    overflow: "hidden",
  },
  quoteMark: { fontSize: 22, margin: "0 6px", opacity: 0.9, color: "#B9C4D6" },
};

/* =================== FAQ =================== */
const faqStyles = {
  section: {
    width: "100vw",
    marginLeft: "-170px",
    background: "#ffffff",
    padding: "24px 24px 120px",
    marginTop: "-40px",
  },
  container: { width: "min(1220px, 100%)", margin: "0 auto" },
  title: {
    margin: 0,
    fontSize: "clamp(32px, 5.4vw, 64px)",
    fontWeight: 900,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#0B3E91",
    textAlign: "center",
  },
  row: { marginTop: "32px", alignItems: "center" },
  faqCol: { paddingRight: "clamp(8px, 2vw, 24px)" },
  mascotCol: { display: "flex", justifyContent: "center" },
  mascot: { width: "min(360px, 90%)", height: "auto", objectFit: "contain" },
};

/* =================== CONSULTANTS =================== */
const consultantsStyles = {
  section: {
    width: "100vw",
    marginLeft: "-170px",
    background: "#ffffff",
    padding: "clamp(64px, 9vw, 120px) clamp(20px, 6vw, 48px)",
    marginTop: "-100px",
  },
  container: { width: "min(1220px, 100%)", margin: "0 auto" },
  title: {
    margin: 0,
    fontSize: "clamp(32px, 5.6vw, 56px)",
    fontWeight: 900,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#0B3E91",
    textAlign: "center",
  },
  grid: { marginTop: "clamp(18px, 3vw, 28px)" },

  cardShell: {
    position: "relative",
    background: "#0B3E91",
    border: "none",
    borderRadius: 16,
    boxShadow: "0 18px 34px rgba(0,0,0,.18)",
    overflow: "visible",
    paddingTop: 120,
    height: "var(--consult-card-h, 480px)",
    display: "flex",
    flexDirection: "column",
    marginTop: "150px",
  },
  cardBody: {
    padding: "26px 22px 30px",
    display: "grid",
    gridTemplateRows: "auto 1fr",
    gap: 14,
    flex: 1,
    overflow: "hidden",
  },
  avatarWrap: {
    position: "absolute",
    top: -110,
    left: "50%",
    transform: "translateX(-50%)",
    width: 300,
    height: 300,
    borderRadius: "50%",
    overflow: "hidden",
    border: "12px solid #0B3E91",
    boxShadow: "0 16px 32px rgba(0,0,0,.35)",
    background: "#111",
    zIndex: 5,
  },
  avatar: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  name: {
    margin: "6px 0 0",
    textAlign: "center",
    fontSize: 18,
    fontWeight: 900,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#FFD24A",
    marginTop: "90px",
  },
  bio: {
    marginTop: 10,
    color: "#E9EEF7",
    fontSize: 14,
    lineHeight: 1.7,
    textAlign: "center",
    display: "-webkit-box",
    WebkitBoxOrient: "vertical",
    WebkitLineClamp: 5,
    overflow: "hidden",
    whiteSpace: "pre-line",
  },
};

/* =================== COUNTRY PARTNERS =================== */
const countryStyles = {
  section: {
    width: "100vw",
    marginLeft: "-170px",
    background: "#ffffff",
    padding: "clamp(48px, 7vw, 96px) clamp(20px, 6vw, 48px)",
    marginTop: "-110px",
  },
  container: { width: "min(1220px, 100%)", margin: "0 auto" },
  title: {
    margin: 0,
    textAlign: "center",
    color: "#0B3E91",
    fontWeight: 900,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    fontSize: "clamp(28px, 5.4vw, 56px)",
  },
  board: {
    marginTop: "24px",
    borderRadius: 8,
    border: "2px solid #98B7E6",
    background: "linear-gradient(180deg, #EFF6FF 0%, #E7F0FF 100%)",
    boxShadow: "0 8px 18px rgba(8, 42, 116, 0.18)",
    padding: "22px 22px 28px",
  },
  grid: {
    display: "grid",
    gap: 18,
    gridTemplateColumns: "repeat(5, 1fr)",
  },
  flagTile: {
    background: "#fff",
    borderRadius: 6,
    border: "1px solid #DFE8F6",
    boxShadow: "0 4px 10px rgba(8,42,116,0.08)",
    overflow: "hidden",
    aspectRatio: "16 / 10",
    display: "flex",
  },
  flagImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
};

/* =================== Helpers =================== */
function ensureArray(val) {
  return Array.isArray(val) ? val : [];
}
function slugify(str = "") {
  return String(str)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

/* =================== Component =================== */
export default function LandingContent({ locale = "id" }) {
  // Pass locale down so texts come localized from the hook
  const {
    hero,
    metrics,
    whyChoose,
    popularProgram,
    testimonials,
    testimonialsList,
    consultants,
    isConsultantsLoading,
    faq,
    countryPartners,
  } = useLandingViewModel({ locale });

  const metricsList = ensureArray(metrics);
  const whyCards = ensureArray(whyChoose?.cards);
  const popularItems = ensureArray(popularProgram?.items);
  const testimonialContent = ensureArray(testimonialsList);

  // Build FAQ items from the i18n data coming from the hook
  const faqItems = useMemo(
    () =>
      ensureArray(faq?.items).map((item, i) => ({
        key: `q${i + 1}`,
        label: (
          <div className="faq-pill">
            <span className="faq-pill__text">{item.q}</span>
            <span className="faq-pill__chev">▾</span>
          </div>
        ),
        children: <Paragraph style={{ margin: 0 }}>{item.a}</Paragraph>,
      })),
    [faq]
  );

  return (
    <>
      {/* ===== HERO ===== */}
      <section style={heroStyles.section}>
        <div style={heroStyles.inner(hero?.background || "")}>
          <div style={heroStyles.overlay} aria-hidden />
          <div style={heroStyles.copy}>
            {hero?.eyebrow ? (
              <Text style={heroStyles.eyebrow}>{hero.eyebrow}</Text>
            ) : null}
            <Title level={1} style={heroStyles.title}>
              {hero?.title}
            </Title>
            <Paragraph style={heroStyles.text}>{hero?.description}</Paragraph>
          </div>

          {/* METRICS strip */}
          <div style={metricsStyles.wrap}>
            <div style={metricsStyles.row}>
              {metricsList.map((m) => (
                <div
                  key={m.id ?? m.label}
                  style={metricsStyles.item(m.gradient)}
                >
                  <Title level={2} style={metricsStyles.value}>
                    {m.value}
                  </Title>
                  <Paragraph style={metricsStyles.label}>{m.label}</Paragraph>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== WHY CHOOSE US ===== */}
      <section style={whyStyles.section}>
        <div style={whyStyles.container}>
          <Title level={2} style={whyStyles.title}>
            {whyChoose?.title}
          </Title>
          <Row gutter={[24, 24]} justify="center">
            {whyCards.map((card) => (
              <Col
                key={card.id ?? card.label}
                xs={24}
                sm={12}
                lg={6}
                style={whyStyles.col}
              >
                <Card
                  bordered={false}
                  style={whyStyles.card}
                  bodyStyle={whyStyles.cardBody}
                >
                  {card.icon ? (
                    <Image
                      src={card.icon}
                      alt={card.label}
                      preview={false}
                      style={whyStyles.icon}
                      fallback="/icons/landing/fallback.svg"
                    />
                  ) : null}
                  <Title level={3} style={whyStyles.value}>
                    {card.value}
                  </Title>
                  <Paragraph style={whyStyles.label}>{card.label}</Paragraph>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      {/* ===== POPULAR PROGRAM ===== */}
      <section style={popularStyles.section}>
        <div style={popularStyles.container}>
          <Title level={2} style={popularStyles.title}>
            {popularProgram?.title}
          </Title>
          <Paragraph style={popularStyles.subtitle}>
            {popularProgram?.subtitle}
          </Paragraph>

          <div style={popularStyles.grid}>
            {popularItems.map((p) => (
              <div key={p.id ?? p.label} style={popularStyles.tile}>
                <div style={popularStyles.imgWrap}>
                  <Image
                    src={p.image}
                    alt={p.label}
                    preview={false}
                    style={popularStyles.img}
                    fallback="/images/fallback.jpg"
                  />
                  <div style={popularStyles.pill}>{p.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIALS (Marquee) ===== */}
      <section style={testiStyles.section}>
        <div style={testiStyles.container}>
          <Title level={2} style={testiStyles.title}>
            {testimonials?.title}
          </Title>
          {testimonials?.subtitle ? (
            <Paragraph style={testiStyles.subtitle}>
              {testimonials.subtitle}
            </Paragraph>
          ) : null}

          <div style={testiStyles.slideWrap}>
            <Swiper
              className={TESTI_SWIPER_CLASS}
              modules={[Autoplay, FreeMode]}
              slidesPerView="auto"
              spaceBetween={16}
              loop
              speed={6000}
              allowTouchMove={false}
              autoplay={{
                delay: 0,
                disableOnInteraction: false,
                pauseOnMouseEnter: false,
              }}
              freeMode={{ enabled: true, momentum: false, sticky: false }}
            >
              {testimonialContent.map((t, idx) => (
                <SwiperSlide
                  key={t.id ?? `${t.name}-${idx}`}
                  style={{ width: "var(--testi-card-w, 360px)" }}
                >
                  <Card
                    style={testiStyles.cardShell}
                    bodyStyle={testiStyles.cardBody}
                  >
                    <div style={testiStyles.avatarWrap}>
                      <img
                        src={t.photoUrl || "/images/avatars/default.jpg"}
                        alt={t.name || "avatar"}
                        style={testiStyles.avatar}
                        onError={(e) => {
                          e.currentTarget.src = "/images/avatars/default.jpg";
                        }}
                      />
                    </div>

                    <Paragraph style={testiStyles.name}>{t.name}</Paragraph>

                    {t.campusCountry ? (
                      <div style={testiStyles.campus}>
                        <Tag
                          color="gold"
                          style={{ borderRadius: 999, fontWeight: 700 }}
                        >
                          {t.campusCountry}
                        </Tag>
                      </div>
                    ) : null}

                    <div style={testiStyles.stars}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span
                          key={i}
                          style={{
                            ...testiStyles.star,
                            color:
                              i < (Number(t.star) || 0) ? "#FFD43B" : "#5E6673",
                          }}
                        >
                          ★
                        </span>
                      ))}
                    </div>

                    {/* Put innerHTML on the container to avoid children + innerHTML conflicts */}
                    <div
                      style={testiStyles.quoteWrap}
                      dangerouslySetInnerHTML={{
                        __html: sanitizeHtml(t.message || ""),
                      }}
                    />
                  </Card>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section style={faqStyles.section}>
        <div style={faqStyles.container}>
          <Title level={2} style={faqStyles.title}>
            {faq?.title}
          </Title>
          <Row gutter={[24, 24]} style={faqStyles.row}>
            <Col xs={24} lg={16} style={faqStyles.faqCol}>
              <Collapse
                className="faq-collapse"
                expandIcon={() => null}
                ghost
                showArrow={false}
                items={faqItems}
              />
            </Col>
            <Col xs={24} lg={8} style={faqStyles.mascotCol}>
              <img
                src={faq?.illustration || "/images/loading.png"}
                alt="OSS Bali Mascot"
                style={faqStyles.mascot}
                onError={(e) => {
                  e.currentTarget.src = "/images/mascot-faq-fallback.png";
                }}
              />
            </Col>
          </Row>
        </div>
      </section>

      {/* ===== CONSULTANTS ===== */}
      <section style={consultantsStyles.section}>
        <div style={consultantsStyles.container}>
          <Title level={2} style={consultantsStyles.title}>
            {consultants?.title}
          </Title>

          <Row
            gutter={[24, 24]}
            style={consultantsStyles.grid}
            justify="center"
          >
            {ensureArray(consultants?.items).map((c) => {
              const slug = c?.slug || c?.id || slugify(c?.name || "");
              const href = `${CONSULTANT_DETAIL_BASE}/${encodeURIComponent(
                slug
              )}`;

              return (
                <Col key={c.id || slug} xs={24} md={12} lg={8}>
                  <Link href={href}>
                    <Card
                      style={consultantsStyles.cardShell}
                      bodyStyle={consultantsStyles.cardBody}
                      hoverable
                    >
                      <div style={consultantsStyles.avatarWrap}>
                        <img
                          src={c.photo}
                          alt={c.name}
                          style={consultantsStyles.avatar}
                          onError={(e) => {
                            e.currentTarget.src = "/images/logo.jpg";
                          }}
                        />
                      </div>

                      <Paragraph style={consultantsStyles.name}>
                        {c.name}
                      </Paragraph>

                      <div
                        style={consultantsStyles.bio}
                        dangerouslySetInnerHTML={{
                          __html: sanitizeHtml(
                            Array.isArray(c.bio)
                              ? c.bio.join("\n")
                              : c.bio || ""
                          ),
                        }}
                      />
                    </Card>
                  </Link>
                </Col>
              );
            })}
          </Row>
        </div>
      </section>

      {/* ===== COUNTRY PARTNERS ===== */}
      <section style={countryStyles.section}>
        <div style={countryStyles.container}>
          <Title level={2} style={countryStyles.title}>
            {countryPartners?.title}
          </Title>

          <div style={countryStyles.board}>
            <div style={countryStyles.grid}>
              {Array.isArray(countryPartners?.items) &&
                countryPartners.items.map((c) => (
                  <div
                    key={c.id || c.code}
                    style={countryStyles.flagTile}
                    title={c.name}
                  >
                    <Image
                      src={c.flag}
                      alt={c.name}
                      preview={false}
                      style={countryStyles.flagImg}
                      fallback="/images/fallback.jpg"
                    />
                  </div>
                ))}
            </div>
          </div>
        </div>
      </section>

      <style jsx global>{`
        .${TESTI_SWIPER_CLASS} {
          overflow: visible;
        }
        .${TESTI_SWIPER_CLASS} .swiper-wrapper {
          align-items: stretch;
        }
        .${TESTI_SWIPER_CLASS} .swiper-slide {
          height: auto;
          display: flex;
          align-items: stretch;
        }
        .${TESTI_SWIPER_CLASS} .swiper-slide > div {
          width: 100%;
          height: 100%;
        }
        .${TESTI_SWIPER_CLASS} .swiper-pagination,
        .${TESTI_SWIPER_CLASS} .swiper-button-next,
        .${TESTI_SWIPER_CLASS} .swiper-button-prev {
          display: none !important;
        }

        :root {
          --testi-card-w: 360px;
          --testi-card-h: 420px;
          --consult-card-h: 480px;
        }
        @media (max-width: 1199px) {
          :root {
            --testi-card-w: 320px;
            --testi-card-h: 400px;
            --consult-card-h: 450px;
          }
        }
        @media (max-width: 767px) {
          :root {
            --testi-card-w: 280px;
            --testi-card-h: 380px;
            --consult-card-h: 430px;
          }
        }

        /* FAQ pills */
        .faq-collapse .ant-collapse-item {
          margin-bottom: 16px;
          border: 0 !important;
          background: transparent;
        }
        .faq-collapse .ant-collapse-header {
          padding: 0 !important;
          background: transparent !important;
        }
        .faq-pill {
          background: #0b3e91;
          color: #fff;
          border-radius: 9999px;
          padding: 18px 22px;
          font-weight: 700;
          font-size: clamp(14px, 1.6vw, 18px);
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 12px 28px rgba(8, 42, 116, 0.25);
        }
        .faq-pill__text {
          line-height: 1.35;
        }
        .faq-pill__chev {
          margin-left: 16px;
          font-size: 18px;
          transform: rotate(0deg);
          transition: transform 0.25s ease;
        }
        .faq-collapse .ant-collapse-item-active .faq-pill__chev {
          transform: rotate(180deg);
        }
        .faq-collapse .ant-collapse-content {
          border: 0 !important;
          background: #f7f9ff;
          border-radius: 20px;
          overflow: hidden;
        }
        .faq-collapse .ant-collapse-content-box {
          padding: 18px 22px 22px !important;
          font-size: 16px;
          color: #2a3e65;
          line-height: 1.75;
        }
      `}</style>
    </>
  );
}
