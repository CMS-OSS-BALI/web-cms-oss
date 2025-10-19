// app/(whatever)/events/EventsUContent.jsx
"use client";

import { useMemo } from "react";
import useEventsUViewModel from "./useEventsUViewModel";

/* ====== SHARED ====== */
const CONTAINER = { width: "92%", maxWidth: 1220, margin: "0 auto" };
const BLUE = "#0b56c9";
const TEXT = "#0f172a";
const HEADER_H = 84;

/* Z-Index layers */
const Z = {
  heroBase: 0,
  heroDecor: 1,
  heroCopy: 2,
  topSection: 10,
};

/* ====== HERO ====== */
const hero = {
  section: {
    width: "100vw",
    marginLeft: "calc(50% - 50vw)",
    marginRight: "calc(50% - 50vw)",
    marginTop: -HEADER_H,
    overflow: "hidden",
    color: "#0B3E91",
    position: "relative",
    zIndex: Z.heroBase,
  },
  inner: {
    position: "relative",
    isolation: "isolate",
    width: "100vw",
    marginLeft: "calc(50% - 50vw)",
    marginRight: "calc(50% - 50vw)",
    minHeight: 560 + HEADER_H,
    paddingTop: 24 + HEADER_H,
    paddingBottom: 48,
    display: "grid",
    placeItems: "start center",
    background:
      "linear-gradient(180deg, #f8fbff 0%, #edf4ff 42%, #e5efff 70%, #f9fbff 100%)",
    zIndex: Z.heroBase,
  },
  glowLeft: {
    position: "absolute",
    top: -140,
    left: -220,
    width: 640,
    height: 640,
    borderRadius: "50%",
    background:
      "radial-gradient(closest-side, rgba(155, 202, 255, .55), rgba(155,202,255,0))",
    filter: "blur(22px)",
    opacity: 0.9,
    zIndex: Z.heroDecor,
    pointerEvents: "none",
  },
  glowRight: {
    position: "absolute",
    top: -20,
    right: -200,
    width: 540,
    height: 540,
    borderRadius: "50%",
    background:
      "radial-gradient(closest-side, rgba(120, 182, 255, .45), rgba(120,182,255,0))",
    filter: "blur(18px)",
    opacity: 0.9,
    zIndex: Z.heroDecor,
    pointerEvents: "none",
  },
  centerHalo: {
    position: "absolute",
    top: 120,
    left: "50%",
    transform: "translateX(-50%)",
    width: 980,
    height: 520,
    borderRadius: "50%",
    background:
      "radial-gradient(closest-side, rgba(255,255,255,.9), rgba(255,255,255,0))",
    filter: "blur(8px)",
    opacity: 0.9,
    zIndex: Z.heroDecor,
    pointerEvents: "none",
  },
  sheenDiag: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(135deg, rgba(90,155,255,.12) 0%, rgba(90,155,255,0) 45%)",
    zIndex: Z.heroDecor,
    pointerEvents: "none",
  },
  vignetteSides: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(220% 100% at 50% 50%, rgba(0,0,0,0) 60%, rgba(0,52,128,.08) 100%)",
    mixBlendMode: "multiply",
    opacity: 0.35,
    zIndex: Z.heroDecor,
    pointerEvents: "none",
  },
  bottomFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 140,
    background: "linear-gradient(180deg, rgba(255,255,255,0) 0%, #ffffff 70%)",
    zIndex: Z.heroDecor,
    pointerEvents: "none",
  },
  copy: {
    position: "relative",
    zIndex: Z.heroCopy,
    width: "92%",
    maxWidth: 980,
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    gap: 16,
    paddingInline: 24,
  },
  title2: {
    margin: 0,
    fontSize: 56,
    lineHeight: 1.06,
    fontWeight: 800,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: BLUE,
    textShadow:
      "0 10px 28px rgba(0, 48, 128, .14), 0 2px 0 rgba(255,255,255,.35)",
  },
};

/* ===== COUNTDOWN ===== */
const panel = {
  shell: {
    width: "100%",
    maxWidth: 920,
    margin: "28px auto 0",
    padding: "20px 24px",
    borderRadius: 28,
    background: "linear-gradient(180deg, #eef6ff 0%, #e6f0ff 100%)",
    border: "1px solid rgba(11,79,183,0.06)",
    boxShadow:
      "0 12px 26px rgba(15,23,42,.06), inset 0 1px 0 rgba(255,255,255,.6)",
    textAlign: "center",
  },
  title: {
    margin: 0,
    fontSize: 16,
    fontWeight: 800,
    color: "#0B4FB7",
    letterSpacing: ".8px",
    textTransform: "uppercase",
    marginBottom: 12,
  },
  row: {
    display: "flex",
    justifyContent: "center",
    gap: 28,
    flexWrap: "wrap",
  },
  pill: {
    display: "inline-block",
    padding: "12px 20px",
    borderRadius: 16,
    background: "linear-gradient(180deg, #e8f1ff 0%, #dcebff 100%)",
    border: "1px solid #cfe1ff",
    boxShadow: "0 6px 14px rgba(11,86,201,.12)",
    fontSize: 28,
    fontWeight: 900,
    color: BLUE,
    lineHeight: 1,
  },
  label: { marginTop: 8, fontSize: 14, fontWeight: 700, color: "#305899" },
};

function Chip({ value, label }) {
  const v = useMemo(
    () => String(Math.max(0, Number(value || 0))).padStart(2, "0"),
    [value]
  );
  return (
    <div style={{ minWidth: 120, textAlign: "center" }} aria-live="polite">
      <div style={panel.pill}>{v}</div>
      <div style={panel.label}>{label}</div>
    </div>
  );
}

/* ===== REUSABLE EVENT CARD ===== */
const cardCss = {
  bar: (text) => ({
    width: "100vw",
    marginLeft: "calc(50% - 50vw)",
    marginRight: "calc(50% - 50vw)",
    marginTop: 100,
    background: BLUE,
    color: "#fff",
    display: "grid",
    placeItems: "center",
    height: 68,
    fontWeight: 900,
    letterSpacing: ".03em",
    fontSize: 28,
    textTransform: "uppercase",
    boxShadow: "0 14px 26px rgba(11,86,201,.25)",
    content: text,
    position: "relative",
    zIndex: Z.topSection,
  }),
  wrap: {
    ...CONTAINER,
    marginTop: 26,
    marginBottom: 40,
    position: "relative",
    zIndex: Z.topSection,
  },
  shell: {
    position: "relative",
    borderRadius: 22,
    padding: 22,
    background: "transparent",
    boxShadow:
      "0 24px 60px rgba(15,23,42,.08), 0 2px 0 rgba(255,255,255,0.6) inset",
    zIndex: Z.topSection,
  },
  card: {
    display: "grid",
    gridTemplateColumns: "520px 1fr",
    gridTemplateRows: "1fr auto",
    alignItems: "stretch",
    gap: 26,
    background: "#fff",
    borderRadius: 18,
    padding: "22px 22px",
    border: "1px solid rgba(14,56,140,.06)",
    boxShadow: "0 16px 42px rgba(15,23,42,.08)",
  },
  poster: {
    gridRow: "1 / 2",
    width: "100%",
    height: 310,
    borderRadius: 14,
    overflow: "hidden",
    background: "#f1f5ff",
    border: "1px solid rgba(14,56,140,.08)",
  },
  posterImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  copy: {
    gridRow: "1 / 2",
    display: "flex",
    flexDirection: "column",
    minHeight: 310,
  },
  title: {
    margin: 0,
    color: BLUE,
    fontWeight: 900,
    fontSize: 36,
    lineHeight: 1.12,
    letterSpacing: ".02em",
    textTransform: "uppercase",
  },
  desc: {
    margin: "12px 0 0",
    color: TEXT,
    opacity: 0.9,
    fontSize: 15.5,
    lineHeight: 1.7,
    maxWidth: 700,
  },
  metaRow: {
    gridRow: "2 / 3",
    gridColumn: "1 / -1",
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr auto",
    alignItems: "center",
    gap: 18,
    paddingTop: 16,
    borderTop: "1px solid #eef2ff",
  },
  metaItem: { display: "flex", alignItems: "center", gap: 10 },
  metaIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    display: "grid",
    placeItems: "center",
    background: "#eef4ff",
    color: BLUE,
    fontWeight: 800,
  },
  metaText: { lineHeight: 1.1 },
  metaLabel: {
    margin: 0,
    fontSize: 12,
    color: "#7c8aad",
    fontWeight: 700,
    letterSpacing: ".02em",
  },
  metaValue: { margin: "2px 0 0", fontWeight: 800, color: "#0b2e76" },
  cta: {
    justifySelf: "end",
    background: BLUE,
    color: "#fff",
    padding: "12px 18px",
    borderRadius: 12,
    fontWeight: 900,
    textDecoration: "none",
    boxShadow: "0 12px 26px rgba(11,86,201,.25)",
  },
};

function EventCard({
  barTitle,
  poster,
  title,
  desc,
  location,
  price,
  dateLong,
  priceLabel = "Price",
  ctaText = "Ambil tiketmu",
  ctaHref = "#",
}) {
  return (
    <>
      <div style={cardCss.bar(barTitle)}>{barTitle}</div>
      <section style={cardCss.wrap}>
        <div style={cardCss.shell}>
          <div className="events-card" style={cardCss.card}>
            <div style={cardCss.poster}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={poster}
                alt={title}
                style={cardCss.posterImg}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src =
                    "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=1200&auto=format&fit=crop";
                }}
              />
            </div>

            <div style={cardCss.copy}>
              <h2 style={cardCss.title}>{title}</h2>
              <p style={cardCss.desc}>{desc}</p>
            </div>

            <div className="events-meta" style={cardCss.metaRow}>
              <div style={cardCss.metaItem}>
                <div style={cardCss.metaIcon}>📍</div>
                <div style={cardCss.metaText}>
                  <p style={cardCss.metaLabel}>Location</p>
                  <p style={cardCss.metaValue}>{location}</p>
                </div>
              </div>

              <div style={cardCss.metaItem}>
                <div style={cardCss.metaIcon}>💳</div>
                <div style={cardCss.metaText}>
                  <p style={cardCss.metaLabel}>{priceLabel}</p>
                  <p style={cardCss.metaValue}>{price}</p>
                </div>
              </div>

              <div style={cardCss.metaItem}>
                <div style={cardCss.metaIcon}>🗓️</div>
                <div style={cardCss.metaText}>
                  <p style={cardCss.metaLabel}>Date</p>
                  <p style={cardCss.metaValue}>{dateLong}</p>
                </div>
              </div>

              <a href={ctaHref} style={cardCss.cta}>
                {ctaText}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* responsive */}
      <style jsx>{`
        @media (max-width: 1000px) {
          .events-card {
            grid-template-columns: 1fr !important;
            grid-template-rows: auto auto auto !important;
          }
        }
        @media (max-width: 900px) {
          .events-meta {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }
        }
      `}</style>
    </>
  );
}

/* ===== WHY SECTION (V2) ===== */
const why2 = {
  wrap: {
    ...CONTAINER,
    marginTop: 100,
    marginBottom: 44,
    position: "relative",
    zIndex: Z.topSection,
  },
  title: {
    margin: 0,
    fontWeight: 900,
    textTransform: "uppercase",
    color: "#0b3e91",
    fontSize: 56,
    letterSpacing: ".02em",
    textAlign: "center",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 22,
    marginTop: 26,
  },
  card: {
    background: "#fff",
    borderRadius: 20,
    border: "1px solid #edf2ff",
    boxShadow: "0 18px 40px rgba(11,86,201,.08)",
    padding: "26px 28px",
    textAlign: "center",
  },
  img: {
    width: 110,
    height: 110,
    objectFit: "contain",
    display: "block",
    margin: "0 auto 14px",
    filter: "saturate(1.05)",
  },
  iconFallback: {
    fontSize: 54,
    lineHeight: 1,
    marginBottom: 12,
    color: "#0b56c9",
  },
  titleSmall: {
    margin: 0,
    color: "#0a3a86",
    fontWeight: 800,
    fontSize: 18,
    lineHeight: 1.35,
  },
  desc: {
    marginTop: 10,
    color: "#476aa4",
    fontSize: 14,
    lineHeight: 1.7,
  },
};

export default function EventsUContent({ locale = "id" }) {
  const vm = useEventsUViewModel({ locale });
  const se = vm.studentEvent;
  const re = vm.repEvent;

  return (
    <main style={{ position: "relative", zIndex: 0 }}>
      {/* ===== HERO ===== */}
      <section style={hero.section}>
        <div style={hero.inner}>
          <div style={hero.glowLeft} />
          <div style={hero.glowRight} />
          <div style={hero.centerHalo} />
          <div style={hero.sheenDiag} />
          <div style={hero.vignetteSides} />
          <div style={hero.bottomFade} />

          <div style={hero.copy}>
            <h1 style={hero.title2}>
              <span>{vm.titleLine1}</span>
              <br />
              <span>{vm.titleLine2}</span>
            </h1>

            <div style={panel.shell}>
              <div style={panel.title}>{vm.panelTitle}</div>
              <div style={panel.row}>
                <Chip value={vm.countdown.days} label={vm.labels.days} />
                <Chip value={vm.countdown.hours} label={vm.labels.hours} />
                <Chip value={vm.countdown.minutes} label={vm.labels.minutes} />
                <Chip value={vm.countdown.seconds} label={vm.labels.seconds} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== BENEFITS ===== */}
      <section
        style={{
          ...CONTAINER,
          marginTop: -170,
          marginBottom: 28,
          position: "relative",
          zIndex: Z.topSection,
        }}
      >
        <div
          className="benefits-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 18,
          }}
        >
          {vm.benefits.map((b, i) => (
            <div
              key={i}
              style={{
                background: "#fff",
                borderRadius: 22,
                border: "1px solid rgba(14,56,140,.08)",
                boxShadow: "0 16px 40px rgba(15,23,42,.08)",
                padding: "18px 20px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 30, lineHeight: 1, marginBottom: 8 }}>
                {b.icon}
              </div>
              <div
                style={{
                  fontWeight: 800,
                  color: "#0a3a86",
                  marginBottom: 6,
                  fontSize: 16,
                }}
              >
                {b.title}
              </div>
              <div style={{ color: "#476aa4", fontSize: 13, lineHeight: 1.5 }}>
                {b.desc}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== UPCOMING ===== */}
      <section
        style={{
          ...CONTAINER,
          marginTop: 36,
          marginBottom: 24,
          textAlign: "center",
          position: "relative",
          zIndex: Z.topSection,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontWeight: 900,
            textTransform: "uppercase",
            color: "#0b3e91",
            fontSize: 48,
            letterSpacing: ".02em",
          }}
        >
          {vm.upcomingTitle}
        </h2>
        <p
          style={{
            marginTop: 10,
            color: "#164a8a",
            fontWeight: 600,
            lineHeight: 1.6,
            fontSize: 16,
          }}
        >
          {vm.upcomingSub}
        </p>
      </section>

      {/* ===== STUDENT CARD ===== */}
      <EventCard
        barTitle={vm.studentBarTitle}
        poster={se.poster}
        title={se.title}
        desc={se.desc}
        location={se.location}
        price={se.price}
        dateLong={se.dateLong}
        priceLabel={se.priceLabel}
        ctaText={se.ctaText}
        ctaHref={se.ctaHref}
      />

      {/* ===== REPRESENTATIVE CARD ===== */}
      <EventCard
        barTitle={vm.repBarTitle}
        poster={re.poster}
        title={re.title}
        desc={re.desc}
        location={re.location}
        price={re.price}
        dateLong={re.dateLong}
        priceLabel={re.priceLabel}
        ctaText={re.ctaText}
        ctaHref={re.ctaHref}
      />

      {/* ===== WHY ===== */}
      <section style={why2.wrap}>
        <h2 style={why2.title}>{vm.why2Title}</h2>
        <div className="why-v2-grid" style={why2.grid}>
          {vm.why2Cards.map((c, i) => (
            <div key={i} style={why2.card}>
              {c.img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.img}
                  alt={c.title}
                  style={why2.img}
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              ) : (
                <div style={why2.iconFallback}>{c.icon || "🎓"}</div>
              )}
              <h3 style={why2.titleSmall}>{c.title}</h3>
              <p style={why2.desc}>{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Responsive overrides */}
      <style jsx>{`
        @media (max-width: 900px) {
          .benefits-grid {
            grid-template-columns: 1fr !important;
          }
          .why-v2-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 1200px) and (min-width: 901px) {
          .why-v2-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </main>
  );
}
