"use client";

import { useMemo } from "react";
import useEventsUViewModel from "./useEventsUViewModel";

/* ========= REF-STYLE (diadopsi dari kode referensi) ========= */
const heroStyles = {
  section: {
    width: "100vw",
    marginLeft: "calc(50% - 50vw)",
    marginRight: "calc(50% - 50vw)",
    // kalau header-mu sticky, tarik hero ke atas sedikit:
    marginTop: "calc(-1 * clamp(48px, 8vw, 84px))",
    overflow: "hidden",
    color: "#0B3E91",
  },
  inner: (background) => ({
    position: "relative",
    isolation: "isolate",
    width: "100vw",
    marginLeft: "calc(50% - 50vw)",
    marginRight: "calc(50% - 50vw)",
    backgroundImage: background ? `url(${background})` : undefined,
    backgroundRepeat: "no-repeat",
    backgroundSize: "cover",
    backgroundPosition: "center top",
    minHeight: "clamp(520px, 84vw, 980px)",
    paddingTop: "clamp(16px, 5vh, 28px)",
    paddingBottom: "clamp(28px, 7vh, 48px)",
    display: "grid",
    placeItems: "start center",
  }),
  copy: {
    position: "relative",
    zIndex: 1,
    width: "min(980px, 92%)",
    gridRow: "1 / 2",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    gap: "clamp(14px, 2.2vw, 18px)",
    paddingInline: "clamp(12px, 4vw, 32px)",
  },
  title2Lines: {
    margin: 0,
    fontSize: "clamp(42px, 8vw, 56px)",
    lineHeight: 1.02,
    fontWeight: 800,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#004A9E",
    textShadow: "0 8px 24px rgba(0, 36, 96, 0.18)",
  },
};

/* ========= PANEL (countdown) ========= */
const panelStyles = {
  shell: {
    width: "min(920px, 100%)",
    margin: "clamp(18px, 3vw, 28px) auto 0",
    padding: "20px 24px",
    borderRadius: 28,
    background: "#EAF5FF",
    border: "1px solid rgba(11,79,183,0.06)",
    boxShadow: "0 12px 26px rgba(15,23,42,.06)",
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
  chip: { minWidth: 120, textAlign: "center" },
  pill: {
    display: "inline-block",
    padding: "12px 20px",
    borderRadius: 16,
    background: "#DBEAFF",
    border: "1px solid #CFE1FF",
    fontSize: "clamp(22px, 4vw, 32px)",
    fontWeight: 900,
    color: "#0B56C9",
    lineHeight: 1,
  },
  label: { marginTop: 8, fontSize: 14, fontWeight: 700, color: "#305899" },
};

/* ========= BENEFITS (3 kartu) ========= */
const sectionContainer = { width: "min(1220px, 92%)", margin: "0 auto" };
const benefitsStyles = {
  wrap: { ...sectionContainer, marginTop: 36, marginBottom: 28 },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 18,
  },
  card: {
    background: "#fff",
    borderRadius: 22,
    border: "1px solid rgba(14,56,140,.08)",
    boxShadow: "0 16px 40px rgba(15,23,42,.08)",
    padding: "18px 20px",
    textAlign: "center",
  },
  icon: { fontSize: 30, lineHeight: 1, marginBottom: 8 },
  title: { fontWeight: 800, color: "#0a3a86", marginBottom: 6, fontSize: 16 },
  desc: { color: "#476aa4", fontSize: 13, lineHeight: 1.5 },
};

function H1TwoLines({ line1, line2 }) {
  return (
    <h1 style={heroStyles.title2Lines}>
      <span>{line1}</span>
      <br />
      <span>{line2}</span>
    </h1>
  );
}

function Chip({ value, label }) {
  const v = useMemo(
    () => String(Math.max(0, Number(value || 0))).padStart(2, "0"),
    [value]
  );
  return (
    <div style={panelStyles.chip} aria-live="polite">
      <div style={panelStyles.pill}>{v}</div>
      <div style={panelStyles.label}>{label}</div>
    </div>
  );
}

export default function EventsUContent({ locale = "id" }) {
  const { hero } = useEventsUViewModel({ locale });
  const {
    background,
    titleLine1,
    titleLine2,
    panelTitle,
    countdown,
    benefits,
  } = hero;

  return (
    <main>
      {/* ===== HERO full-width + bg dari viewModel (sesuai referensi) ===== */}
      <section style={heroStyles.section}>
        <div style={heroStyles.inner(background)}>
          <div style={heroStyles.copy}>
            <H1TwoLines line1={titleLine1} line2={titleLine2} />

            <div style={panelStyles.shell}>
              <div style={panelStyles.title}>{panelTitle}</div>
              <div style={panelStyles.row}>
                <Chip value={countdown.days} label="Hari" />
                <Chip value={countdown.hours} label="Jam" />
                <Chip value={countdown.minutes} label="Menit" />
                <Chip value={countdown.seconds} label="Detik" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== BENEFITS (3 kolom) ===== */}
      <section style={benefitsStyles.wrap}>
        <div style={benefitsStyles.grid}>
          {benefits.map((b, i) => (
            <div key={i} style={benefitsStyles.card}>
              <div style={benefitsStyles.icon}>{b.icon}</div>
              <div style={benefitsStyles.title}>{b.title}</div>
              <div style={benefitsStyles.desc}>{b.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* responsive sederhana untuk benefits */}
      <style jsx>{`
        @media (max-width: 900px) {
          section :global(div[style*="grid-template-columns: repeat(3"]) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </main>
  );
}
