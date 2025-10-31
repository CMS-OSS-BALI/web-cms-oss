"use client";

import { useMemo, useEffect, useState } from "react";
import { Card, Col, Image, Row, Typography, Collapse } from "antd";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, FreeMode } from "swiper/modules";
import "swiper/css";

import Link from "next/link";
import { useLandingViewModel } from "./useLandingViewModel";
import { sanitizeHtml } from "@/app/utils/dompurify";

const { Title, Paragraph, Text } = Typography;

const CONSULTANT_DETAIL_BASE = "/user/landing-page";
const TESTI_SWIPER_CLASS = "landing-testimonials-swiper";
const POP_SWIPER_CLASS = "landing-popular-swiper";

/* ============ helpers ============ */
const A = (v) => (Array.isArray(v) ? v : []);
const slugify = (s = "") =>
  String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const CONTAINER = { width: "min(1220px, 96%)", margin: "0 auto" };

/* ============ HERO ============ */
const hero = {
  shell: {
    width: "100vw",
    marginLeft: "calc(50% - 50vw)",
    marginRight: "calc(50% - 50vw)",
    marginTop: "calc(-1 * clamp(48px, 8vw, 84px))",
    position: "relative",
    overflow: "hidden",
  },
  inner: (bg) => ({
    position: "relative",
    isolation: "isolate",
    backgroundImage: `url(${bg || "/images/hero-fallback.jpg"})`,
    backgroundSize: "cover",
    backgroundPosition: "center top",
    minHeight: "540px",
    display: "grid",
    placeItems: "start center",
    padding: "18px 14px 92px",
  }),
  overlay: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(180deg, rgba(0,0,0,.05) 0%, rgba(0,0,0,.10) 40%, rgba(0,0,0,.05) 100%)",
    zIndex: 0,
  },
  copy: {
    position: "relative",
    zIndex: 1,
    width: "min(880px, 92%)",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  eyebrow: {
    margin: 0,
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.22em",
    textTransform: "uppercase",
    color: "#0B3E91",
  },
  title: {
    margin: 0,
    color: "#0B3E91",
    textTransform: "uppercase",
    fontWeight: 900,
    fontSize: "clamp(28px, 8vw, 64px)",
    letterSpacing: "0.06em",
    textShadow:
      "0 1px 0 #fff, 0 6px 20px rgba(0,36,96,.18), 0 0 24px rgba(90,166,255,.24)",
    lineHeight: 1.05,
  },
  desc: {
    margin: 0,
    color: "#0B3E91",
    fontSize: "clamp(13px, 3.6vw, 16px)",
    fontWeight: 600,
    lineHeight: 1.7,
    textShadow: "0 1px 0 rgba(255,255,255,.6)",
  },
};

/* ============ METRICS strip ============ */
const METRIC_DARK = "#0B3E91";
const METRIC_LIGHT = "#7DC8FF";

const metrics = {
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 3,
    width: "100vw",
    marginLeft: "calc(50% - 50vw)",
    marginRight: "calc(50% - 50vw)",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
  },
  itemBase: {
    minHeight: "clamp(64px, 14vw, 96px)",
    padding: "12px 16px",
    display: "grid",
    alignContent: "center",
    justifyItems: "center",
    textAlign: "center",
    color: "#fff",
  },
  value: {
    margin: 0,
    fontWeight: 900,
    fontSize: "clamp(20px, 5.6vw, 34px)",
    letterSpacing: "0.02em",
    lineHeight: 1.05,
    color: "#fff",
  },
  label: {
    margin: 0,
    fontWeight: 800,
    fontSize: "clamp(10px, 2.6vw, 13px)",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    lineHeight: 1.25,
    color: "#fff",
  },
};

/* ============ WHY CHOOSE ============ */
const why = {
  section: {
    width: "100vw",
    marginLeft: "calc(50% - 50vw)",
    marginRight: "calc(50% - 50vw)",
    background: "#fff",
    padding: "24px 0 36px",
  },
  heading: {
    margin: "8px 0 16px",
    textAlign: "center",
    color: "#0B3E91",
    textTransform: "uppercase",
    fontWeight: 900,
    letterSpacing: "0.06em",
    fontSize: "clamp(22px, 4vw, 44px)",
  },
  card: {
    background: "#0B3E91",
    borderRadius: 24,
    border: "none",
    boxShadow: "0 14px 28px rgba(8,42,116,.22)",
  },
  body: {
    minHeight: 180,
    display: "grid",
    gridTemplateRows: "auto auto auto",
    justifyItems: "center",
    alignItems: "center",
    padding: "18px 14px",
    textAlign: "center",
    rowGap: 8,
  },
  icon: {
    width: 68,
    height: 68,
    objectFit: "contain",
    filter: "brightness(0) invert(1)",
  },
  value: {
    margin: "6px 0 0",
    color: "#FFD24A",
    fontWeight: 900,
    letterSpacing: "0.06em",
    fontSize: 22,
    lineHeight: 1.1,
  },
  label: {
    margin: 0,
    color: "#fff",
    fontWeight: 800,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    fontSize: 12,
    lineHeight: 1.3,
    whiteSpace: "normal",
  },
};

/* ============ POPULAR (marquee) ============ */
const popular = {
  section: {
    width: "100vw",
    marginLeft: "calc(50% - 50vw)",
    marginRight: "calc(50% - 50vw)",
    background: "#fff",
    padding: "32px 0px 48px",
  },
  title: {
    margin: 0,
    color: "#0B3E91",
    textTransform: "uppercase",
    fontWeight: 900,
    letterSpacing: "0.06em",
    fontSize: "clamp(22px, 5.6vw, 40px)",
    textAlign: "center",
  },
  subtitle: {
    margin: "6px auto 0",
    textAlign: "center",
    color: "#2a3e65",
    fontSize: "clamp(14px, 1.9vw, 18px)",
    lineHeight: 1.7,
    maxWidth: 880,
  },
  slideWrap: {
    width: "100vw",
    marginLeft: "calc(50% - 50vw)",
    marginRight: "calc(50% - 50vw)",
    paddingInline: "clamp(12px, 4vw, 24px)",
    marginTop: 18,
    overflow: "visible",
  },
  tile: {
    position: "relative",
    borderRadius: 22,
    overflow: "hidden",
    boxShadow: "0 16px 38px rgba(8,42,116,0.18)",
    background: "#eef3ff",
  },
  imgWrap: { position: "relative", width: "100%", aspectRatio: "4 / 3" },
  img: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
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

/* ============ TESTIMONIALS (marquee) ============ */
const testi = {
  section: {
    width: "100vw",
    marginLeft: "calc(50% - 50vw)",
    marginRight: "calc(50% - 50vw)",
    background: "#fff",
    padding: "48px 16px 64px",
  },
  title: {
    margin: 0,
    fontSize: "clamp(22px, 5.6vw, 40px)",
    fontWeight: 900,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#0B3E91",
    textAlign: "center",
  },
  subtitle: {
    margin: "4px auto 0",
    color: "#2a3e65",
    fontSize: "clamp(14px, 1.8vw, 18px)",
    lineHeight: 1.7,
    textAlign: "center",
    maxWidth: 820,
  },
  slideWrap: {
    width: "100vw",
    marginLeft: "calc(50% - 50vw)",
    marginRight: "calc(50% - 50vw)",
    paddingInline: "clamp(12px, 4vw, 24px)",
    marginTop: 100,
    overflow: "visible",
  },

  cardShell: {
    position: "relative",
    background: "#0B3E91",
    border: "none",
    borderRadius: 22,
    boxShadow: "0 18px 34px rgba(0,0,0,.22)",
    overflow: "visible",
    paddingTop: 88,
    height: "var(--testi-card-h, 420px)",
    display: "flex",
    flexDirection: "column",
  },
  cardBody: {
    padding: "22px 20px 26px",
    display: "grid",
    gridTemplateRows: "auto auto auto 1fr",
    gap: 12,
    flex: 1,
    overflow: "hidden",
  },

  avatarWrap: {
    position: "absolute",
    top: -64,
    left: "50%",
    transform: "translateX(-50%)",
    width: 128,
    height: 128,
    borderRadius: "50%",
    overflow: "hidden",
    border: "8px solid #0B3E91",
    boxShadow: "0 14px 28px rgba(0,0,0,.28)",
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
    margin: "52px 0 0",
    textAlign: "center",
    fontSize: 16,
    fontWeight: 900,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#FFFFFF",
  },
  badgeBox: { display: "flex", justifyContent: "center" },
  badge: {
    display: "inline-block",
    padding: "6px 12px",
    borderRadius: 999,
    background: "#FFD24A",
    color: "#0B3E91",
    fontWeight: 800,
    fontSize: 12,
    letterSpacing: "0.04em",
    whiteSpace: "nowrap",
  },
  stars: {
    display: "flex",
    gap: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  star: { fontSize: 20, lineHeight: 1, color: "#FFD43B" },
  quoteWrap: {
    marginTop: 4,
    color: "#E9EEF7",
    fontSize: 14,
    lineHeight: 1.7,
    textAlign: "center",
    display: "-webkit-box",
    WebkitBoxOrient: "vertical",
    WebkitLineClamp: 5,
    overflow: "hidden",
  },
};

/* ============ FAQ ============ */
const faq = {
  section: {
    width: "100vw",
    marginLeft: "calc(50% - 50vw)",
    marginRight: "calc(50% - 50vw)",
    background: "#fff",
    padding: "24px 0px 64px",
  },
  title: {
    margin: 0,
    fontSize: "clamp(22px, 5.4vw, 40px)",
    fontWeight: 900,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#0B3E91",
    textAlign: "center",
  },
};

/* ============ CONSULTANTS (grid, no swiper) ============ */
/* fokus: posisi nama & bio konsisten di mobile dan desktop */
const consultants = {
  section: {
    width: "100vw",
    marginLeft: "calc(50% - 50vw)",
    marginRight: "calc(50% - 50vw)",
    background: "#fff",
    padding: "48px 0px 64px",
  },
  title: {
    margin: 0,
    fontSize: "clamp(22px, 5.6vw, 40px)",
    fontWeight: 900,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#0B3E91",
    textAlign: "center",
  },
  cardShell: {
    position: "relative",
    background: "#0B3E91",
    border: "none",
    borderRadius: 18,
    boxShadow: "0 18px 34px rgba(0,0,0,.18)",
    overflow: "visible",
    /* ruang atas disesuaikan dengan tinggi avatar (via CSS var) */
    paddingTop: "calc(var(--consult-avatar) / 2 + var(--consult-pad-extra))",
    height: "var(--consult-card-h, 520px)",
    display: "flex",
    flexDirection: "column",
    marginTop: 120,
  },
  cardBody: {
    padding: "22px 22px 26px",
    display: "grid",
    gridTemplateRows: "auto 1fr",
    alignContent: "start",
    gap: 10,
    flex: 1,
    overflow: "hidden",
  },
  avatarWrap: {
    position: "absolute",
    top: "calc(-1 * var(--consult-avatar) / 2)",
    left: "50%",
    transform: "translateX(-50%)",
    width: "var(--consult-avatar)",
    height: "var(--consult-avatar)",
    borderRadius: "50%",
    overflow: "hidden",
    border: "var(--consult-avatar-border) solid #0B3E91",
    boxShadow: "0 16px 32px rgba(0,0,0,.35)",
    background: "#111",
    zIndex: 5,
  },
  avatar: { width: "100%", height: "100%", objectFit: "cover" },
  name: {
    margin: "8px 0 0", // dekat dengan avatar
    textAlign: "center",
    fontSize: "clamp(16px, 2vw, 20px)",
    fontWeight: 900,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#FFD24A",
  },
  bio: {
    marginTop: 8,
    color: "#E9EEF7",
    fontSize: "clamp(13px, 1.6vw, 14px)",
    lineHeight: 1.7,
    textAlign: "center",
    paddingInline: "var(--consult-bio-pad)",
    display: "-webkit-box",
    WebkitBoxOrient: "vertical",
    WebkitLineClamp: 6,
    overflow: "hidden",
    whiteSpace: "pre-line",
  },
};

/* ============ COUNTRY PARTNERS (papan sesuai desain) ============ */
const country = {
  section: {
    width: "100vw",
    marginLeft: "calc(50% - 50vw)",
    marginRight: "calc(50% - 50vw)",
    background: "#fff",
    padding: "32px 0px 80px",
  },
  title: {
    margin: 0,
    textAlign: "center",
    color: "#0B3E91",
    fontWeight: 900,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    fontSize: "clamp(22px, 5.4vw, 40px)",
  },
  board: {
    position: "relative",
    marginTop: 18,
    borderRadius: 12,
    background: "linear-gradient(180deg, #F0F6FF 0%, #E7F0FF 100%)",
    /* border biru + inner glow + drop shadow seperti contoh */
    border: "2px solid #3E82E3",
    boxShadow:
      "0 16px 32px rgba(8,42,116,0.25), inset 0 2px 0 rgba(255,255,255,0.6)",
    padding: "clamp(14px, 2.2vw, 22px)",
  },
  grid: {
    display: "grid",
    gap: "clamp(12px, 2vw, 22px)",
    gridTemplateColumns: "repeat(5, 1fr)",
  },
  flagTile: {
    background: "#fff",
    borderRadius: 10,
    border: "1px solid #DFE8F6",
    boxShadow: "0 8px 14px rgba(8,42,116,0.12)",
    overflow: "hidden",
    aspectRatio: "16 / 10",
    display: "flex",
  },
  flagImg: { width: "100%", height: "100%", objectFit: "cover" },
};

/* ====================== Component ====================== */
export default function LandingContent({ locale = "id" }) {
  const {
    hero: H,
    metrics: M,
    whyChoose,
    popularProgram,
    testimonials: TST,
    testimonialsList,
    consultants: CONS,
    faq: FAQ,
    countryPartners,
  } = useLandingViewModel({ locale });

  const metricsList = A(M);
  const whyCards = A(whyChoose?.cards);
  const popularItems = A(popularProgram?.items);
  const testiContent = A(testimonialsList);

  // responsive hero min-height
  const [vw, setVw] = useState(1280);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => setVw(window.innerWidth || 1280);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const isDesktop = vw >= 992;
  const heroMinH = isDesktop ? 900 : 540;
  const heroPadBottom = isDesktop ? 110 : 92;

  const faqItems = useMemo(
    () =>
      A(FAQ?.items).map((item, i) => ({
        key: `q${i + 1}`,
        label: (
          <div className="faq-pill">
            <span className="faq-pill__text">{item.q}</span>
            <span className="faq-pill__chev">▾</span>
          </div>
        ),
        children: <Paragraph style={{ margin: 0 }}>{item.a}</Paragraph>,
      })),
    [FAQ]
  );

  return (
    <>
      {/* ===== HERO ===== */}
      <header style={hero.shell}>
        <div
          style={{
            ...hero.inner(H?.background),
            minHeight: heroMinH,
            padding: `18px 14px ${heroPadBottom}px`,
          }}
        >
          <div style={hero.overlay} aria-hidden />
          <div style={hero.copy}>
            {H?.eyebrow ? <Text style={hero.eyebrow}>{H.eyebrow}</Text> : null}
            <Title level={1} style={hero.title}>
              {H?.title}
            </Title>
            {H?.description ? (
              <Paragraph style={hero.desc}>{H.description}</Paragraph>
            ) : null}
          </div>

          {/* Metrics strip */}
          {metricsList.length ? (
            <div className="lp-metrics" style={metrics.wrap}>
              <div className="lp-metrics-row" style={metrics.row}>
                {metricsList.slice(0, 4).map((m, idx) => {
                  const dark = idx % 2 === 0;
                  const bg = dark ? METRIC_DARK : METRIC_LIGHT;
                  const divider =
                    idx === 0
                      ? "none"
                      : dark
                      ? "inset 2px 0 0 rgba(0,0,0,.28)"
                      : "inset 2px 0 0 rgba(0,0,0,.18)";
                  return (
                    <div
                      key={m.id ?? `${m.label}-${idx}`}
                      style={{
                        ...metrics.itemBase,
                        background: bg,
                        boxShadow: divider,
                      }}
                    >
                      <Title level={4} style={metrics.value}>
                        {m.value}
                      </Title>
                      <Paragraph style={metrics.label}>
                        {String(m.label || "").toUpperCase()}
                      </Paragraph>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </header>

      {/* ===== WHY CHOOSE ===== */}
      <section style={why.section}>
        <div style={CONTAINER}>
          <Title level={2} style={why.heading}>
            {whyChoose?.title}
          </Title>
        </div>

        <div style={CONTAINER}>
          <Row gutter={[20, 20]} justify="center" align="stretch">
            {whyCards.slice(0, 4).map((card) => (
              <Col key={card.id ?? card.label} xs={12} md={6}>
                <Card bordered={false} style={why.card} bodyStyle={why.body}>
                  {card.icon ? (
                    <Image
                      src={card.icon}
                      alt={card.label}
                      preview={false}
                      style={why.icon}
                      fallback="/icons/landing/fallback.svg"
                    />
                  ) : null}
                  <Title level={4} style={why.value}>
                    {card.value}
                  </Title>
                  <Paragraph style={why.label}>{card.label}</Paragraph>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      {/* ===== POPULAR PROGRAM (Swiper arah berlawanan) ===== */}
      <section style={popular.section}>
        <div style={CONTAINER}>
          <Title level={2} style={popular.title}>
            {popularProgram?.title}
          </Title>
          {popularProgram?.subtitle ? (
            <Paragraph style={popular.subtitle}>
              {popularProgram.subtitle}
            </Paragraph>
          ) : null}
        </div>

        <div style={popular.slideWrap}>
          <Swiper
            className={POP_SWIPER_CLASS}
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
              reverseDirection: true,
            }}
            freeMode={{ enabled: true, momentum: false, sticky: false }}
          >
            {popularItems.map((p, idx) => (
              <SwiperSlide
                key={p.id ?? `${p.label}-${idx}`}
                style={{ width: "var(--popular-card-w, 300px)" }}
              >
                <div style={popular.tile}>
                  <div style={popular.imgWrap}>
                    <Image
                      src={p.image}
                      alt={p.label}
                      preview={false}
                      style={popular.img}
                      fallback="/images/fallback.jpg"
                    />
                    <div style={popular.pill}>{p.label}</div>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section style={testi.section}>
        <div style={CONTAINER}>
          <Title level={2} style={testi.title}>
            {TST?.title}
          </Title>
          {TST?.subtitle ? (
            <Paragraph style={testi.subtitle}>{TST.subtitle}</Paragraph>
          ) : null}
        </div>

        <div style={testi.slideWrap}>
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
            {testiContent.map((t, idx) => (
              <SwiperSlide
                key={t.id ?? `${t.name}-${idx}`}
                style={{ width: "var(--testi-card-w, 360px)" }}
              >
                <Card style={testi.cardShell} bodyStyle={testi.cardBody}>
                  <div style={testi.avatarWrap}>
                    <img
                      src={t.photoUrl || "/images/avatars/default.jpg"}
                      alt={t.name || "avatar"}
                      style={testi.avatar}
                      onError={(e) =>
                        (e.currentTarget.src = "/images/avatars/default.jpg")
                      }
                    />
                  </div>

                  <Paragraph style={testi.name}>{t.name}</Paragraph>

                  {t.campusCountry ? (
                    <div style={testi.badgeBox}>
                      <span style={testi.badge}>{t.campusCountry}</span>
                    </div>
                  ) : null}

                  <div style={testi.stars}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span
                        key={i}
                        style={{
                          ...testi.star,
                          opacity: i < (Number(t.star) || 0) ? 1 : 0.35,
                        }}
                      >
                        ★
                      </span>
                    ))}
                  </div>

                  <div
                    style={testi.quoteWrap}
                    dangerouslySetInnerHTML={{
                      __html: sanitizeHtml(t.message || ""),
                    }}
                  />
                </Card>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section style={faq.section}>
        <div style={CONTAINER}>
          <Title level={2} style={faq.title}>
            {FAQ?.title}
          </Title>
          <Row gutter={[24, 24]} style={{ marginTop: 20 }} align="middle">
            <Col
              xs={24}
              lg={16}
              style={{ paddingRight: "clamp(8px,2vw,24px)" }}
            >
              <Collapse
                className="faq-collapse"
                expandIcon={() => null}
                ghost
                showArrow={false}
                items={faqItems}
              />
            </Col>
            <Col
              xs={24}
              lg={8}
              style={{ display: "flex", justifyContent: "center" }}
            >
              <img
                src={FAQ?.illustration || "/images/loading.png"}
                alt="OSS Bali Mascot"
                style={{
                  width: "min(360px, 90%)",
                  height: "auto",
                  objectFit: "contain",
                }}
                onError={(e) => {
                  e.currentTarget.src = "/images/mascot-faq-fallback.png";
                }}
              />
            </Col>
          </Row>
        </div>
      </section>

      {/* ===== CONSULTANTS (GRID) ===== */}
      <section style={consultants.section}>
        <div style={CONTAINER}>
          <Title level={2} style={consultants.title}>
            {CONS?.title}
          </Title>

          <Row gutter={[24, 24]} style={{ marginTop: 18 }} justify="center">
            {A(CONS?.items).map((c) => {
              const slug = c?.slug || c?.id || slugify(c?.name || "");
              const href = `${CONSULTANT_DETAIL_BASE}/${encodeURIComponent(
                slug
              )}`;

              return (
                <Col key={c.id || slug} xs={24} sm={12} lg={8}>
                  <Link href={href}>
                    <Card
                      style={consultants.cardShell}
                      bodyStyle={consultants.cardBody}
                      hoverable
                      className="consult-card"
                    >
                      <div style={consultants.avatarWrap}>
                        <img
                          src={c.photo}
                          alt={c.name}
                          style={consultants.avatar}
                          onError={(e) => {
                            e.currentTarget.src = "/images/logo.jpg";
                          }}
                        />
                      </div>

                      <Paragraph
                        style={consultants.name}
                        className="consult-name"
                      >
                        {c.name}
                      </Paragraph>

                      <div
                        style={consultants.bio}
                        className="consult-bio"
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
      <section style={country.section}>
        <div style={CONTAINER}>
          <Title level={2} style={country.title}>
            {countryPartners?.title}
          </Title>
        </div>
        <div style={CONTAINER}>
          <div style={country.board} className="country-board">
            <div className="country-grid" style={country.grid}>
              {Array.isArray(countryPartners?.items) &&
                countryPartners.items.map((c) => (
                  <div
                    key={c.id || c.code}
                    style={country.flagTile}
                    title={c.name}
                  >
                    <Image
                      src={c.flag}
                      alt={c.name}
                      preview={false}
                      style={country.flagImg}
                      fallback="/images/fallback.jpg"
                    />
                  </div>
                ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== global tweaks ===== */}
      <style jsx global>{`
        /* Size tokens */
        :root {
          --testi-card-w: 360px;
          --testi-card-h: 420px;
          --popular-card-w: 300px;

          /* Consultant avatar + spacing */
          --consult-avatar: 220px;
          --consult-avatar-border: 10px;
          --consult-pad-extra: 56px; /* jarak ekstra di bawah setengah avatar */
          --consult-card-h: 480px;
          --consult-bio-pad: 18px;
        }
        @media (max-width: 1199px) {
          :root {
            --testi-card-w: 320px;
            --testi-card-h: 400px;
            --popular-card-w: 280px;

            --consult-avatar: 200px;
            --consult-pad-extra: 52px;
            --consult-card-h: 500px;
          }
        }
        @media (max-width: 991px) {
          :root {
            --consult-avatar: 180px;
            --consult-pad-extra: 48px;
            --consult-card-h: 500px;
          }
        }
        @media (max-width: 767px) {
          :root {
            --testi-card-w: 280px;
            --testi-card-h: 380px;
            --popular-card-w: 240px;

            --consult-avatar: 150px;
            --consult-avatar-border: 8px;
            --consult-pad-extra: 40px;
            --consult-card-h: 420px; /* bio bisa sedikit lebih panjang di mobile */
            --consult-bio-pad: 16px;
          }
        }

        /* Metrics: fallback 2 kolom layar kecil */
        @media (max-width: 385px) {
          .lp-metrics-row {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }

        /* Swiper housekeeping */
        .${TESTI_SWIPER_CLASS}, .${POP_SWIPER_CLASS} {
          overflow: visible;
        }
        .${TESTI_SWIPER_CLASS} .swiper-wrapper,
        .${POP_SWIPER_CLASS} .swiper-wrapper {
          align-items: stretch;
        }
        .${TESTI_SWIPER_CLASS} .swiper-slide,
        .${POP_SWIPER_CLASS} .swiper-slide {
          height: auto;
          display: flex;
          align-items: stretch;
        }
        .${TESTI_SWIPER_CLASS} .swiper-slide > div,
        .${POP_SWIPER_CLASS} .swiper-slide > div {
          width: 100%;
          height: 100%;
        }
        .${TESTI_SWIPER_CLASS} .swiper-pagination,
        .${TESTI_SWIPER_CLASS} .swiper-button-next,
        .${TESTI_SWIPER_CLASS} .swiper-button-prev,
        .${POP_SWIPER_CLASS} .swiper-pagination,
        .${POP_SWIPER_CLASS} .swiper-button-next,
        .${POP_SWIPER_CLASS} .swiper-button-prev {
          display: none !important;
        }

        /* FAQ pills */
        .faq-collapse .ant-collapse-item {
          margin-bottom: 12px;
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
          padding: 14px 18px;
          font-weight: 800;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 10px 22px rgba(8, 42, 116, 0.25);
        }
        .faq-pill__text {
          line-height: 1.35;
        }
        .faq-pill__chev {
          margin-left: 12px;
          font-size: 16px;
          transform: rotate(0deg);
          transition: transform 0.25s ease;
        }
        .faq-collapse .ant-collapse-item-active .faq-pill__chev {
          transform: rotate(180deg);
        }
        .faq-collapse .ant-collapse-content {
          border: 0 !important;
          background: #f7f9ff;
          border-radius: 16px;
          overflow: hidden;
        }
        .faq-collapse .ant-collapse-content-box {
          padding: 16px 18px 18px !important;
          font-size: 15px;
          color: #2a3e65;
          line-height: 1.7;
        }

        /* Country grid breakpoints */
        @media (max-width: 991px) {
          .country-grid {
            grid-template-columns: repeat(4, 1fr) !important;
          }
        }
        @media (max-width: 767px) {
          .country-grid {
            grid-template-columns: repeat(3, 1fr) !important;
          }
        }
        @media (max-width: 479px) {
          .country-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }

        /* Consultant fine-tuning */
        .consult-card .ant-card-body {
          display: grid;
          grid-template-rows: auto 1fr;
          align-content: start;
        }
        .consult-name {
          margin-top: 10px !important;
          letter-spacing: 0.06em;
        }
        .consult-bio {
          max-width: 720px;
          margin-left: auto;
          margin-right: auto;
        }
      `}</style>
    </>
  );
}
