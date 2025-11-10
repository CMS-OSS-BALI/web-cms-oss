"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import useEventsRViewModel from "./useEventsRViewModel";

/* ===== Tokens ===== */
const CONTAINER = { width: "92%", maxWidth: 1220, margin: "0 auto" };
const BLUE = "#0b56c9";

/* Meta sizing (desktop baseline) */
const META_ROW_H = 38;
const META_GAP = 12;
const META_ROWS = 4; // Date, Time, Location, Price
const META_BOX_H = META_ROWS * META_ROW_H + (META_ROWS - 1) * META_GAP;

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

/* ===== Styles: Hero ===== */
const hero = {
  wrap: { ...CONTAINER, paddingTop: 18, paddingBottom: 8 },
  title: {
    margin: 0,
    textAlign: "center",
    fontSize: "clamp(28px, 5vw, 56px)",
    lineHeight: 1.04,
    fontWeight: 900,
    color: BLUE,
    textTransform: "uppercase",
    letterSpacing: ".02em",
  },
  grid: {
    marginTop: 26,
    display: "grid",
    gridTemplateColumns: "minmax(320px, 560px) 1fr",
    gap: 28,
    alignItems: "start",
  },
  poster: {
    width: "100%",
    height: "var(--poster-h)",
    borderRadius: 16,
    overflow: "hidden",
    background: "#f1f5ff",
    border: "1px solid rgba(14,56,140,.08)",
    boxShadow: "0 10px 28px rgba(11,86,201,.08)",
  },
  img: { width: "100%", height: "100%", objectFit: "cover", display: "block" },

  right: {
    position: "relative",
    height: "var(--poster-h)",
    overflow: "hidden",
  },

  descWrap: {
    maxHeight: `calc(var(--poster-h) - ${META_BOX_H}px - 12px)`,
    overflow: "hidden",
    position: "relative",
    paddingRight: 2,
  },
  lead: {
    margin: 0,
    color: "#24406c",
    fontSize: 16,
    lineHeight: 1.8,
    letterSpacing: ".01em",
  },
  descFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 36,
    background: "linear-gradient(180deg, rgba(255,255,255,0) 0%, #ffffff 70%)",
    pointerEvents: "none",
  },
  skeleton: {
    position: "absolute",
    left: 0,
    right: "40%",
    bottom: 8,
    height: 10,
    borderRadius: 6,
    background: "linear-gradient(90deg, #eef3ff 0%, #f6f9ff 50%, #eef3ff 100%)",
    animation: "shimmer 1.4s infinite",
    backgroundSize: "200% 100%",
  },

  metaBox: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: `${META_BOX_H}px`,
    display: "grid",
    gap: `${META_GAP}px`,
    background: "transparent",
  },
  metaRow: { display: "flex", alignItems: "center", gap: 12, marginTop: -5 },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    display: "grid",
    placeItems: "center",
    background: "#eef4ff",
    color: BLUE,
    fontWeight: 900,
    border: "1px solid #d7e6ff",
    boxShadow: "inset 0 1px 0 #fff",
    flex: "0 0 auto",
  },
  metaTextWrap: { lineHeight: 1.2 },
  metaStrong: { margin: 0, color: "#0a3a86", fontWeight: 900 },
  metaSmall: { margin: 0, color: "#315a99", fontWeight: 800 },
};

/* ===== Styles: Benefit ===== */
const benefitsCss = {
  wrap: { ...CONTAINER, marginTop: 200, marginBottom: 28 },
  title: {
    margin: 0,
    textAlign: "center",
    fontSize: "clamp(26px, 5vw, 56px)",
    lineHeight: 1.04,
    fontWeight: 900,
    color: BLUE,
    textTransform: "uppercase",
    letterSpacing: ".02em",
  },
  subTitle: {
    marginTop: 12,
    textAlign: "center",
    color: "#0f172a",
    fontSize: "clamp(16px, 2.6vw, 28px)",
    lineHeight: 1.6,
    maxWidth: 1000,
    marginLeft: "auto",
    marginRight: "auto",
  },
  grid: {
    marginTop: 56,
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    columnGap: 56,
    rowGap: 56,
  },
  item: {
    display: "grid",
    gridTemplateColumns: "56px 1fr",
    alignItems: "start",
    columnGap: 22,
  },
  iconWrap: {
    width: 56,
    height: 56,
    display: "grid",
    placeItems: "center",
  },
  iconImg: {
    width: 40,
    height: 40,
    display: "block",
    objectFit: "contain",
    filter: "grayscale(100%)",
  },
  emoji: { fontSize: 40, lineHeight: 1, filter: "grayscale(100%)" },
  h: {
    margin: 0,
    fontSize: 22,
    lineHeight: 1.25,
    fontWeight: 800,
    color: "#0a3a86",
  },
  p: { marginTop: 10, fontSize: 16, lineHeight: 1.9, color: "#364b74" },
};

/* ===== Styles: CTA ===== */
const cta = {
  wrap: { ...CONTAINER, marginTop: 90, marginBottom: 120 },
  grid: {
    display: "grid",
    gridTemplateColumns: "minmax(320px, 640px) 1fr",
    alignItems: "center",
    gap: 24,
  },
  card: {
    background: "#fff",
    borderRadius: 16,
    border: "1px solid rgba(14,56,140,.08)",
    boxShadow: "0 10px 22px rgba(15,23,42,.08), 0 40px 80px rgba(15,23,42,.08)",
    padding: "28px 28px 32px",
  },
  title: {
    margin: 0,
    color: BLUE,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: ".02em",
    fontSize: "clamp(22px, 3.4vw, 44px)",
    lineHeight: 1.08,
  },
  sub: { marginTop: 16, color: "#12233f", opacity: 0.9, lineHeight: 1.7 },
  btn: {
    display: "inline-block",
    marginTop: 22,
    background: BLUE,
    color: "#fff",
    textDecoration: "none",
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: ".02em",
    padding: "18px 26px",
    borderRadius: 16,
    boxShadow: "0 12px 28px rgba(11,86,201,.35)",
  },
  right: { textAlign: "center" },
  mascot: {
    width: "100%",
    maxWidth: 520,
    height: "auto",
    objectFit: "contain",
  },
};

const emptyCss = {
  wrap: {
    ...CONTAINER,
    marginTop: 40,
    marginBottom: 60,
    textAlign: "center",
    background:
      "linear-gradient(180deg, #eef6ff 0%, rgba(238,246,255,0.6) 100%)",
    border: "1px dashed #cfe1ff",
    borderRadius: 20,
    padding: "36px 26px",
  },
  big: { margin: 0, fontSize: 28, fontWeight: 900, color: BLUE },
  sub: { marginTop: 8, color: "#476aa4" },
};

export default function EventsRContent({ locale = "id" }) {
  const sp = useSearchParams();
  const eventId = sp.get("id") || "";
  const vm = useEventsRViewModel({ locale, eventId });

  if (!vm.item) {
    return (
      <main>
        <section style={emptyCss.wrap}>
          <h2 style={emptyCss.big}>{safeText(vm.emptyTitle)}</h2>
          <p style={emptyCss.sub}>{safeText(vm.emptySub)}</p>
        </section>
      </main>
    );
  }

  const it = vm.item;
  const showTrimIndicators = (it.description || "").length > 260;

  const ctaTitle = locale === "en" ? "BOOK YOUR BOOTH" : "BOOKING BOOTH ANDA";
  const ctaSub =
    locale === "en"
      ? "Join as a representative, showcase your programs, and meet qualified students."
      : "Bergabung sebagai representative, tampilkan program Anda, dan temui calon mahasiswa berkualitas.";
  const ctaBtn = locale === "en" ? "BOOK A BOOTH" : "BOOKING BOOTH";

  const boothHref = eventId
    ? `/user/form-rep?id=${encodeURIComponent(
        eventId
      )}&lang=${encodeURIComponent(locale)}`
    : `/user/form-rep?lang=${encodeURIComponent(locale)}`;

  const mascotSrc = "/images/loading.png";

  return (
    <main>
      {/* ===== HERO ===== */}
      <section style={hero.wrap}>
        <h1 style={hero.title}>{safeText(it.title)}</h1>

        <div
          className="hero-grid"
          style={{ ...hero.grid, ["--poster-h"]: "340px" }}
        >
          {/* Poster */}
          <div style={hero.poster}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={it.poster}
              alt={safeText(it.title)}
              style={hero.img}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src =
                  "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=1200&auto=format&fit=crop";
              }}
            />
          </div>

          {/* Right column */}
          <div className="hero-right" style={hero.right}>
            {it.description && (
              <div className="desc-wrap" style={hero.descWrap}>
                <p style={hero.lead}>{safeText(it.description)}</p>
                {showTrimIndicators && (
                  <>
                    <div className="desc-fade" style={hero.descFade} />
                    <div className="skeleton" style={hero.skeleton} />
                  </>
                )}
              </div>
            )}

            <div className="meta-box" style={hero.metaBox}>
              <div style={hero.metaRow}>
                <div className="icon-box" style={hero.iconBox}>
                  🗓️
                </div>
                <div style={hero.metaTextWrap}>
                  <p style={hero.metaStrong}>{safeText(it.date)}</p>
                </div>
              </div>

              <div style={hero.metaRow}>
                <div className="icon-box" style={hero.iconBox}>
                  ⏱️
                </div>
                <div style={hero.metaTextWrap}>
                  <p style={hero.metaSmall}>{safeText(it.time)}</p>
                </div>
              </div>

              <div style={hero.metaRow}>
                <div className="icon-box" style={hero.iconBox}>
                  📍
                </div>
                <div style={hero.metaTextWrap}>
                  <p style={hero.metaStrong}>{safeText(it.location)}</p>
                </div>
              </div>

              <div style={hero.metaRow}>
                <div className="icon-box" style={hero.iconBox}>
                  💰
                </div>
                <div style={hero.metaTextWrap}>
                  <p style={hero.metaSmall}>{safeText(it.priceLabel)}</p>
                  <p style={hero.metaStrong}>{safeText(it.priceText)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* responsive + shimmer */}
        <style jsx>{`
          @media (max-width: 1200px) {
            .hero-grid {
              grid-template-columns: minmax(0, 520px) 1fr !important;
              --poster-h: 300px;
            }
          }
          @media (max-width: 1024px) {
            .hero-grid {
              grid-template-columns: 1fr !important;
              --poster-h: 260px;
              gap: 22px !important;
            }
            .hero-right {
              height: auto !important;
              overflow: visible !important;
              position: static !important;
              margin-top: 4px;
            }
            .desc-wrap {
              max-height: none !important;
              overflow: visible !important;
              padding-right: 0 !important;
            }
            .meta-box {
              position: static !important;
              height: auto !important;
              gap: 10px !important;
              margin-top: 14px;
            }
            .desc-fade,
            .skeleton {
              display: none !important;
            }
            .icon-box {
              width: 34px !important;
              height: 34px !important;
              font-size: 14px;
            }
          }
          @media (max-width: 640px) {
            .hero-grid {
              --poster-h: 220px;
              gap: 18px !important;
            }
          }
          @keyframes shimmer {
            0% {
              background-position: 200% 0;
            }
            100% {
              background-position: -200% 0;
            }
          }
          @media (prefers-reduced-motion: reduce) {
            .skeleton {
              animation: none !important;
            }
          }
        `}</style>
      </section>

      {/* ===== BENEFITS ===== */}
      {vm.benefits?.length ? (
        <section style={benefitsCss.wrap}>
          <h2 style={benefitsCss.title}>{safeText(vm.benefitTitle)}</h2>
          {vm.benefitSubtitle ? (
            <p style={benefitsCss.subTitle}>{safeText(vm.benefitSubtitle)}</p>
          ) : null}

          <div className="benefits-grid" style={benefitsCss.grid}>
            {vm.benefits.map((b, i) => {
              const isSvg =
                typeof b.icon === "string" && b.icon.trim().startsWith("/");
              return (
                <div key={i} style={benefitsCss.item}>
                  <div style={benefitsCss.iconWrap}>
                    {isSvg ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={b.icon}
                        alt=""
                        style={benefitsCss.iconImg}
                        loading="lazy"
                      />
                    ) : (
                      <span style={benefitsCss.emoji}>{safeText(b.icon)}</span>
                    )}
                  </div>
                  <div>
                    <h3 style={benefitsCss.h}>{safeText(b.title)}</h3>
                    <p style={benefitsCss.p}>{safeText(b.desc)}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <style jsx>{`
            @media (max-width: 1024px) {
              .benefits-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                column-gap: 28px !important;
                row-gap: 32px !important;
              }
            }
            @media (max-width: 640px) {
              .benefits-grid {
                grid-template-columns: 1fr !important;
                row-gap: 26px !important;
              }
            }
          `}</style>
        </section>
      ) : null}

      {/* ===== CTA ===== */}
      <section style={cta.wrap}>
        <div className="cta-grid" style={cta.grid}>
          {/* Left: Card */}
          <div style={cta.card}>
            <h3 style={cta.title}>{ctaTitle}</h3>
            <p style={cta.sub}>{ctaSub}</p>

            <Link href={boothHref} prefetch={false} style={cta.btn}>
              {ctaBtn}
            </Link>
          </div>

          {/* Right: Mascot */}
          <div style={cta.right}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mascotSrc}
              alt="OSS Mascot"
              style={cta.mascot}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src =
                  "https://images.unsplash.com/photo-1614851098273-3f9bbfd2b9cc?q=80&w=800&auto=format&fit=crop";
              }}
            />
          </div>
        </div>

        <style jsx>{`
          @media (max-width: 1024px) {
            .cta-grid {
              grid-template-columns: 1fr !important;
              row-gap: 24px !important;
            }
          }
        `}</style>
      </section>
    </main>
  );
}
