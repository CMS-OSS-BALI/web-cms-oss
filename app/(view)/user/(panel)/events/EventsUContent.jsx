"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import useEventsUViewModel from "./useEventsUViewModel";
import { Pagination, ConfigProvider } from "antd";

/* ===== Tokens ===== */
const CONTAINER = { width: "92%", maxWidth: 1220, margin: "0 auto" };
const BLUE = "#0b56c9";
const TEXT = "#0f172a";
const PAGE_SIZE = 3;
const Z = { heroBase: 0, heroDecor: 1, heroCopy: 2, topSection: 10 };

/* ===== Utils ===== */
const safeText = (v) => {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  try {
    return String(v);
  } catch {
    return "";
  }
};

/* ===== Hero ===== */
const hero = {
  section: {
    width: "100vw",
    marginLeft: "calc(50% - 50vw)",
    marginRight: "calc(50% - 50vw)",
    marginTop: -90, // flush ke header
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
    minHeight: 560,
    paddingTop: 24,
    paddingBottom: 48,
    display: "grid",
    placeItems: "start center",
    background:
      "linear-gradient(180deg, #f8fbff 0%, #edf4ff 42%, #e5efff 70%, #f9fbff 100%)",
  },
  glowLeft: {
    position: "absolute",
    top: -140,
    left: -220,
    width: 640,
    height: 640,
    borderRadius: "50%",
    background:
      "radial-gradient(closest-side, rgba(155,202,255,.55), rgba(155,202,255,0))",
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
      "radial-gradient(closest-side, rgba(120,182,255,.45), rgba(120,182,255,0))",
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
    background: "linear-gradient(180deg, rgba(255,255,255,0) 0%, #fff 70%)",
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
    marginTop: 75,
    fontWeight: 800,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: BLUE,
    textShadow: "0 10px 28px rgba(0,48,128,.14), 0 2px 0 rgba(255,255,255,.35)",
  },
};

/* ===== Countdown panel ===== */
const panel = {
  shell: {
    width: "100%",
    maxWidth: 920,
    margin: "28px auto 0",
    padding: "20px 24px",
    borderRadius: 28,
    background: "linear-gradient(180deg, #eef6ff 0%, #e6f0ff 100%)",
    border: "1px solid rgba(11,79,183,.06)",
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
  row: { display: "flex", justifyContent: "center", gap: 28, flexWrap: "wrap" },
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
      <div style={panel.label}>{safeText(label)}</div>
    </div>
  );
}

/* ===== Section title bar ===== */
const sectionBar = {
  bar: {
    width: "100vw",
    marginLeft: "calc(50% - 50vw)",
    marginRight: "calc(50% - 50vw)",
    marginTop: 90,
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
    position: "relative",
    zIndex: Z.topSection,
  },
};

/* ===== Card ===== */
const cardCss = {
  wrap: {
    ...CONTAINER,
    marginTop: 26,
    marginBottom: 16,
    position: "relative",
    zIndex: Z.topSection,
  },
  card: {
    display: "grid",
    gridTemplateColumns: "520px 1fr",
    gridTemplateRows: "1fr auto",
    gap: 26,
    alignItems: "stretch",
    background: "#fff",
    borderRadius: 18,
    padding: "22px 22px",
    border: "1px solid rgba(14,56,140,.06)",
    boxShadow:
      "0 6px 16px rgba(15,23,42,.08), 0 16px 42px rgba(15,23,42,.10), inset 0 1px 0 rgba(255,255,255,.6)",
    transition: "box-shadow 220ms ease, transform 220ms ease",
    marginTop: 26,
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
    color: "#0f172a",
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
  poster,
  title,
  desc,
  location,
  price,
  dateLong,
  dateLabel = "Date",
  priceLabel = "Price",
  ctaText = "Ambil tiketmu",
  ctaHref = "#",
}) {
  return (
    <section style={cardCss.wrap}>
      <div className="events-card" style={cardCss.card} tabIndex={0}>
        <div style={cardCss.poster}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={poster}
            alt={safeText(title)}
            style={cardCss.posterImg}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src =
                "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=1200&auto=format&fit=crop";
            }}
          />
        </div>

        <div style={cardCss.copy}>
          <h2 style={cardCss.title}>{safeText(title)}</h2>
          <p style={cardCss.desc}>{safeText(desc)}</p>
        </div>

        <div className="events-meta" style={cardCss.metaRow}>
          <div style={cardCss.metaItem}>
            <div style={cardCss.metaIcon}>📍</div>
            <div style={cardCss.metaText}>
              <p style={cardCss.metaLabel}>Location</p>
              <p style={cardCss.metaValue}>{safeText(location)}</p>
            </div>
          </div>
          <div style={cardCss.metaItem}>
            <div style={cardCss.metaIcon}>💳</div>
            <div style={cardCss.metaText}>
              <p style={cardCss.metaLabel}>{safeText(priceLabel)}</p>
              <p style={cardCss.metaValue}>{safeText(price)}</p>
            </div>
          </div>
          <div style={cardCss.metaItem}>
            <div style={cardCss.metaIcon}>🗓️</div>
            <div style={cardCss.metaText}>
              <p style={cardCss.metaLabel}>{safeText(dateLabel)}</p>
              <p style={cardCss.metaValue}>{safeText(dateLong)}</p>
            </div>
          </div>
          <Link href={ctaHref} style={cardCss.cta} prefetch={false}>
            {safeText(ctaText)}
          </Link>
        </div>
      </div>

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
        .events-card:hover,
        .events-card:focus-within {
          transform: translateY(-2px);
          box-shadow: 0 10px 24px rgba(11, 86, 201, 0.1),
            0 26px 60px rgba(11, 86, 201, 0.14),
            inset 0 1px 0 rgba(255, 255, 255, 0.6) !important;
        }
        .events-card:active {
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(11, 86, 201, 0.1),
            0 20px 48px rgba(11, 86, 201, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.6) !important;
        }
      `}</style>
    </section>
  );
}

/* ===== Pager ===== */
function SectionPager({ current, total, onChange }) {
  return (
    <ConfigProvider
      theme={{
        token: { colorPrimary: BLUE, borderRadius: 8, colorText: TEXT },
        components: { Pagination: { itemActiveBg: BLUE } },
      }}
    >
      <section
        style={{
          ...CONTAINER,
          display: "flex",
          justifyContent: "center",
          margin: "32px auto 24px",
        }}
      >
        <Pagination
          className="events-mini-pagination"
          current={current}
          pageSize={PAGE_SIZE}
          total={total}
          onChange={onChange}
          showSizeChanger={false}
          showLessItems
          itemRender={(pg, type, original) => {
            if (type === "prev")
              return (
                <span className="ant-pagination-item-link pg-arrow">‹</span>
              );
            if (type === "next")
              return (
                <span className="ant-pagination-item-link pg-arrow">›</span>
              );
            return original;
          }}
        />
      </section>

      <style jsx global>{`
        .events-mini-pagination .ant-pagination-item,
        .events-mini-pagination .ant-pagination-prev .ant-pagination-item-link,
        .events-mini-pagination .ant-pagination-next .ant-pagination-item-link {
          height: 26px;
          min-width: 26px;
          padding: 0 6px;
          border-radius: 8px;
          border: 1px solid #d4e2ff;
          background: #fff;
          box-shadow: 0 3px 8px rgba(11, 86, 201, 0.06);
          transition: all 160ms ease;
        }
        .events-mini-pagination .ant-pagination-item {
          display: grid;
          place-items: center;
          margin-inline: 4px;
          font-weight: 800;
          line-height: 1;
        }
        .events-mini-pagination .ant-pagination-item a {
          color: #0b56c9;
          font-size: 12px;
        }
        .events-mini-pagination .ant-pagination-item-active {
          background: #0b56c9;
          border-color: #0b56c9;
        }
        .events-mini-pagination .ant-pagination-item-active a {
          color: #fff;
        }
        .events-mini-pagination .ant-pagination-prev .ant-pagination-item-link,
        .events-mini-pagination .ant-pagination-next .ant-pagination-item-link {
          display: grid;
          place-items: center;
          font-weight: 900;
          color: #0b56c9;
        }
        .events-mini-pagination .pg-arrow {
          font-size: 12px;
          line-height: 1;
        }
        .events-mini-pagination .ant-pagination-item:hover,
        .events-mini-pagination
          .ant-pagination-prev:hover
          .ant-pagination-item-link,
        .events-mini-pagination
          .ant-pagination-next:hover
          .ant-pagination-item-link {
          border-color: #0b56c9;
          box-shadow: 0 5px 12px rgba(11, 86, 201, 0.12);
          transform: translateY(-1px);
        }
        .events-mini-pagination
          .ant-pagination-disabled
          .ant-pagination-item-link {
          color: #9fb6e6;
          border-color: #e5edff;
          background: #f8fbff;
          box-shadow: none;
        }
        .events-mini-pagination .ant-pagination-item-ellipsis {
          color: #9fb6e6;
        }
      `}</style>
    </ConfigProvider>
  );
}

/* ===== Why v2 ===== */
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
  desc: { marginTop: 10, color: "#476aa4", fontSize: 14, lineHeight: 1.7 },
};

/* ===== Empty state ===== */
const emptyCss = {
  wrap: {
    ...CONTAINER,
    marginTop: 40,
    marginBottom: 80,
    padding: "32px 24px",
    borderRadius: 20,
    border: "1px dashed #cfe1ff",
    background: "linear-gradient(180deg, #f6faff 0%, #f9fbff 100%)",
    display: "grid",
    placeItems: "center",
    textAlign: "center",
  },
  big: { fontSize: 64, lineHeight: 1, marginBottom: 12 },
  title: {
    margin: "8px 0 6px",
    fontWeight: 900,
    color: "#0b3e91",
    fontSize: 28,
  },
  sub: { color: "#476aa4", maxWidth: 640, margin: "0 auto" },
};

function NoEvents({ locale = "id" }) {
  const t = (id, en) => (locale === "en" ? en : id);
  return (
    <section style={emptyCss.wrap}>
      <div style={emptyCss.big}>🗓️</div>
      <h3 style={emptyCss.title}>
        {t("Belum ada event yang tersedia", "No events available yet")}
      </h3>
      <p style={emptyCss.sub}>
        {t(
          "Pantau halaman ini secara berkala; event baru akan segera hadir.",
          "Check back soon—new events are on the way."
        )}
      </p>
    </section>
  );
}

/* ===== Page ===== */
export default function EventsUContent({ locale = "id" }) {
  const vm = useEventsUViewModel({ locale });

  const [pageStu, setPageStu] = useState(1);
  const [pageRep, setPageRep] = useState(1);

  const stuStart = (pageStu - 1) * PAGE_SIZE;
  const repStart = (pageRep - 1) * PAGE_SIZE;

  // inject CTA target
  const stuItems = vm.studentEvents
    .slice(stuStart, stuStart + PAGE_SIZE)
    .map((e) => ({
      ...e,
      ctaHref: `/user/events/peserta?id=${e.id}&lang=${locale}`,
    }));

  const repItems = vm.repEvents
    .slice(repStart, repStart + PAGE_SIZE)
    .map((e) => {
      const baseId = String(e.id).replace(/-rep$/, "");
      return { ...e, ctaHref: `/user/events/rep?id=${baseId}&lang=${locale}` };
    });

  const hasAny =
    (vm.studentEvents?.length || 0) > 0 || (vm.repEvents?.length || 0) > 0;

  return (
    <main style={{ position: "relative", zIndex: 0 }}>
      {/* HERO */}
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
              <span>{safeText(vm.titleLine1)}</span>
              <br />
              <span>{safeText(vm.titleLine2)}</span>
            </h1>

            <div style={panel.shell}>
              <div style={panel.title}>{safeText(vm.panelTitle)}</div>
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

      {/* BENEFITS */}
      <section
        style={{
          ...CONTAINER,
          marginTop: -100,
          marginBottom: 28,
          position: "relative",
          zIndex: Z.topSection,
        }}
      >
        <div
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
                {safeText(b.icon)}
              </div>
              <div
                style={{
                  fontWeight: 800,
                  color: "#0a3a86",
                  marginBottom: 6,
                  fontSize: 16,
                }}
              >
                {safeText(b.title)}
              </div>
              <div style={{ color: "#476aa4", fontSize: 13, lineHeight: 1.5 }}>
                {safeText(b.desc)}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* UPCOMING */}
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
            marginTop: 70,
            fontWeight: 900,
            textTransform: "uppercase",
            color: "#0b3e91",
            fontSize: 48,
            letterSpacing: ".02em",
          }}
        >
          {safeText(vm.upcomingTitle)}
        </h2>
        <p
          style={{
            marginTop: -20,
            color: "#164a8a",
            fontWeight: 600,
            lineHeight: 1.6,
            fontSize: 16,
          }}
        >
          {safeText(vm.upcomingSub)}
        </p>
      </section>

      {/* EMPTY */}
      {!hasAny && <NoEvents locale={locale} />}

      {/* STUDENT */}
      {vm.studentEvents.length > 0 && (
        <>
          <div style={sectionBar.bar}>{safeText(stuItems[0]?.barTitle)}</div>
          {stuItems.map((it) => (
            <EventCard key={it.id} {...it} />
          ))}
          <SectionPager
            current={pageStu}
            total={vm.studentEvents.length}
            onChange={setPageStu}
          />
        </>
      )}

      {/* REP */}
      {vm.repEvents.length > 0 && (
        <>
          <div style={sectionBar.bar}>{safeText(repItems[0]?.barTitle)}</div>
          {repItems.map((it) => (
            <EventCard key={it.id} {...it} />
          ))}
          <SectionPager
            current={pageRep}
            total={vm.repEvents.length}
            onChange={setPageRep}
          />
        </>
      )}

      {/* WHY */}
      <section style={why2.wrap}>
        <h2 style={why2.title}>{safeText(vm.why2Title)}</h2>
        <div style={why2.grid}>
          {vm.why2Cards.map((c, i) => (
            <div key={i} style={why2.card}>
              {c.img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.img}
                  alt={safeText(c.title)}
                  style={why2.img}
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              ) : (
                <div style={why2.iconFallback}>{safeText(c.icon || "🎓")}</div>
              )}
              <h3 style={why2.titleSmall}>{safeText(c.title)}</h3>
              <p style={why2.desc}>{safeText(c.desc)}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
