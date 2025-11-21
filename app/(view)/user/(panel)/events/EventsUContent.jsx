// app/(view)/user/(panel)/events/EventsUContent.jsx
"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import "swiper/css";
import useEventsUViewModel from "./useEventsUViewModel";
import { Pagination, ConfigProvider, Modal, Radio } from "antd";
import Loading from "@/app/components/loading/LoadingImage";

/* ===== Dynamic tab views (peserta & rep) ===== */
const EventsPeserta = dynamic(() => import("./peserta/EventsPContent"), {
  ssr: false,
  loading: () => <Loading />,
});
const EventsRep = dynamic(() => import("./rep/EventsRContent"), {
  ssr: false,
  loading: () => <Loading />,
});

/* ===== Locale helper (client-side, konsisten dengan halaman lain) ===== */
const pickLocaleClient = (lang, ls, fallback = "id") => {
  const v = String(lang || ls || fallback)
    .slice(0, 2)
    .toLowerCase();
  return v === "en" ? "en" : "id";
};

/* ===== Tokens (full-bleed shell + readable center) ===== */
const BLUE = "#0b56c9";
const TEXT = "#0f172a";
const PAGE_SIZE = 3;
const PAGE_TOP_PADDING = "clamp(48px, 8vw, 84px)";
const Z = { heroBase: 0, heroCopy: 2, topSection: 10 };

/** Shell full-bleed + gutter sisi */
const CONTAINER = {
  width: "100%",
  maxWidth: "100%",
  margin: 0,
  padding: "0 clamp(20px, 4vw, 48px)",
};
/** Batas lebar konten nyaman dibaca */
const CONTENT_MAX = 1200;
const CENTER = { maxWidth: CONTENT_MAX, margin: "0 auto" };

/* ===== Utils ===== */
const safeText = (v) => (v == null ? "" : String(v));

/* Mounted helper: true hanya setelah client hydration selesai */
function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}

/* ===== Reveal on scroll ===== */
function useRevealOnScroll(deps = []) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const prefersReduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const markVisible = (els) =>
      els.forEach((el) => el.classList.add("is-visible"));
    if (prefersReduce) {
      markVisible(Array.from(document.querySelectorAll(".reveal")));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.16, rootMargin: "0px 0px -10% 0px" }
    );

    const observeAll = () => {
      document
        .querySelectorAll(".reveal:not(.is-visible)")
        .forEach((el) => io.observe(el));
    };

    observeAll();
    const mo = new MutationObserver(observeAll);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, deps);
}

/* ===== Subtle hero parallax ===== */
function useHeroParallax(ref) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = ref.current;
    if (!root) return;
    const prefersReduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const isDesktop = () => window.innerWidth >= 992;
    if (prefersReduce || !isDesktop()) return;

    const copy = root.querySelector(".js-hero-copy");
    if (!copy) return;

    const onMove = (e) => {
      const r = root.getBoundingClientRect();
      const cx = (e.clientX - r.left) / r.width - 0.5;
      const cy = (e.clientY - r.top) / r.height - 0.5;
      copy.style.transform = `translate3d(${cx * 6}px, ${cy * 6}px, 0)`;
    };
    const onLeave = () => {
      copy.style.transform = "";
    };
    root.addEventListener("mousemove", onMove);
    root.addEventListener("mouseleave", onLeave);
    return () => {
      root.removeEventListener("mousemove", onMove);
      root.removeEventListener("mouseleave", onLeave);
    };
  }, [ref]);
}

/* ===== HERO (clean + gradient) ===== */
const hero = {
  section: {
    width: "100vw",
    maxWidth: "100vw",
    marginLeft: "calc(50% - 50vw)",
    marginRight: "calc(50% - 50vw)",
    marginTop: `calc(${PAGE_TOP_PADDING} * -1)`,
    overflow: "hidden",
    position: "relative",
    zIndex: Z.heroBase,
    background:
      "linear-gradient(180deg, #f7faff 0%, #eef5ff 55%, #ffffff 100%)",
  },
  inner: {
    position: "relative",
    isolation: "isolate",
    width: "100%",
    minHeight: "clamp(520px, 92dvh, 940px)",
    padding:
      "clamp(84px, 12dvh, 160px) clamp(18px, 5vw, 32px) clamp(78px, 12dvh, 150px)",
    display: "grid",
    placeItems: "center",
    boxSizing: "border-box",
    scrollMarginTop: "var(--header-h, 72px)",
    background:
      "radial-gradient(1200px 600px at 10% 0%, rgba(11,86,201,0.10) 0%, rgba(11,86,201,0.00) 60%)," +
      "radial-gradient(900px 480px at 95% 30%, rgba(11,86,201,0.08) 0%, rgba(11,86,201,0.00) 65%)," +
      "linear-gradient(180deg, #f7faff 0%, #eef5ff 55%, #ffffff 100%)",
  },
  copy: {
    position: "relative",
    zIndex: Z.heroCopy,
    width: "min(980px, 92%)",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    gap: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  titleMain: {
    margin: 0,
    color: BLUE,
    textAlign: "center",
    fontWeight: 800,
    lineHeight: 1.08,
    letterSpacing: ".01em",
    fontSize: "clamp(26px, 5.2vw, 48px)",
  },
  sub: {
    margin: "2px auto 8px",
    color: "#334155",
    maxWidth: 720,
    textAlign: "center",
    fontWeight: 600,
    lineHeight: 1.6,
    fontSize: "clamp(13px, 1.6vw, 16px)",
  },
};

/* ===== COUNTDOWN ===== */
const panel = {
  shell: {
    ...CENTER,
    width: "100%",
    margin: "clamp(40px, 10vw, 150px) auto 0",
    padding: "22px 18px 26px",
    borderRadius: 24,
    background: "#f4f7ff",
    border: "1px solid rgba(11,79,183,.08)",
    boxShadow:
      "0 8px 18px rgba(15,23,42,.06), inset 0 1px 0 rgba(255,255,255,.6)",
    textAlign: "center",
    boxSizing: "border-box",
  },
  title: {
    margin: 0,
    fontSize: "clamp(18px, 2vw, 22px)",
    fontWeight: 900,
    color: "#0B3E91",
    letterSpacing: ".01em",
    marginBottom: 14,
  },
  row: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(120px, 1fr))",
    gap: 18,
    justifyItems: "center",
  },
  pill: {
    display: "grid",
    placeItems: "center",
    height: "clamp(56px, 6vw, 70px)",
    width: "clamp(120px, 14vw, 140px)",
    borderRadius: 14,
    background: BLUE,
    border: "1px solid #0a49a8",
    boxShadow: "0 10px 22px rgba(11,86,201,.18)",
    fontSize: "clamp(24px, 3.2vw, 34px)",
    fontWeight: 900,
    color: "#fff",
    lineHeight: 1,
  },
  label: {
    marginTop: 8,
    fontSize: "clamp(12px, 1.6vw, 14px)",
    fontWeight: 800,
    color: "#305899",
    letterSpacing: ".02em",
  },
};

function Chip({ value, label }) {
  const v = useMemo(
    () => String(Math.max(0, Number(value || 0))).padStart(2, "0"),
    [value]
  );
  return (
    <div className="cd-chip" aria-live="polite" style={{ textAlign: "center" }}>
      <div style={panel.pill}>{v}</div>
      <div style={panel.label}>{safeText(label)}</div>
    </div>
  );
}

/* Countdown panel yang aman dari hydration mismatch */
function CountdownPanel({ vm, locale = "id" }) {
  const mounted = useMounted();

  const fallbackLabels =
    locale === "en"
      ? {
          days: "Days",
          hours: "Hours",
          minutes: "Minutes",
          seconds: "Seconds",
        }
      : {
          days: "Hari",
          hours: "Jam",
          minutes: "Menit",
          seconds: "Detik",
        };

  const labelFor = (key) =>
    safeText(vm?.labels?.[key] || fallbackLabels[key] || "");

  const title = safeText(
    vm?.panelTitle || (locale === "en" ? "Next Event" : "Event Terdekat")
  );

  // SSR + first client render → placeholder stabil (tidak pakai Date-based countdown)
  if (!mounted) {
    return (
      <div
        className="reveal"
        data-anim="zoom"
        style={{ ...panel.shell, ["--rvd"]: "200ms" }}
      >
        <div style={panel.title}>{title}</div>
        <div className="cd-row" style={panel.row}>
          {["days", "hours", "minutes", "seconds"].map((key) => (
            <div
              key={key}
              className="cd-chip"
              style={{ textAlign: "center" }}
              aria-hidden="true"
            >
              <div style={panel.pill}>--</div>
              <div style={panel.label}>{labelFor(key)}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Setelah mounted → pakai nilai countdown dari view model
  const cd = vm?.countdown || {};

  return (
    <div
      className="reveal"
      data-anim="zoom"
      style={{ ...panel.shell, ["--rvd"]: "200ms" }}
    >
      <div style={panel.title}>{title}</div>
      <div className="cd-row" style={panel.row}>
        <Chip value={cd.days} label={labelFor("days")} />
        <Chip value={cd.hours} label={labelFor("hours")} />
        <Chip value={cd.minutes} label={labelFor("minutes")} />
        <Chip value={cd.seconds} label={labelFor("seconds")} />
      </div>
    </div>
  );
}

/* ===== STUDENT BAR (full-bleed) ===== */
const sectionBar = {
  shell: {
    width: "100vw",
    marginLeft: "calc(50% - 50vw)",
    marginRight: "calc(50% - 50vw)",
    marginTop: 90,
    position: "relative",
    zIndex: Z.topSection,
  },
  bar: {
    height: "clamp(54px, 7vw, 68px)",
    background: BLUE,
    borderRadius: 12,
    display: "grid",
    placeItems: "center",
    boxShadow: "0 14px 26px rgba(11,86,201,.20)",
  },
  text: {
    color: "#fff",
    fontWeight: 900,
    letterSpacing: ".02em",
    fontSize: "clamp(18px, 2.2vw, 24px)",
  },
};

/* ===== CARD (Student list) ===== */
const cardCss = {
  wrap: {
    ...CONTAINER,
    marginTop: 26,
    marginBottom: 16,
    position: "relative",
    zIndex: Z.topSection,
  },
  card: {
    ...CENTER,
    display: "grid",
    gridTemplateColumns: "minmax(320px, 520px) 1fr",
    gridTemplateRows: "auto auto auto auto",
    gridTemplateAreas: `
      "poster title"
      "poster desc"
      "meta meta"
      "cta cta"
    `,
    columnGap: 22,
    rowGap: 8,
    alignItems: "stretch",
    background: "#fff",
    borderRadius: 20,
    padding: "clamp(18px, 2vw, 26px)",
    border: "1px solid rgba(14,56,140,.06)",
    boxShadow:
      "0 8px 20px rgba(15,23,42,.08), 0 18px 48px rgba(15,23,42,.10), inset 0 1px 0 rgba(255,255,255,.7)",
    transition: "box-shadow 220ms ease, transform 220ms ease",
  },
  poster: {
    gridArea: "poster",
    width: "100%",
    height: "clamp(220px, 24vw, 300px)",
    borderRadius: 16,
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
  title: {
    gridArea: "title",
    margin: 0,
    color: BLUE,
    fontWeight: 900,
    fontSize: "clamp(20px, 2.2vw, 30px)",
    lineHeight: 1.15,
    letterSpacing: ".02em",
    textTransform: "uppercase",
    alignSelf: "flex-end",
    paddingRight: "clamp(0px, 1.2vw, 12px)",
  },
  desc: {
    gridArea: "desc",
    margin: "10px 0 0",
    color: "#0f172a",
    opacity: 0.9,
    fontSize: "clamp(14px, 1.3vw, 15.5px)",
    lineHeight: 1.7,
    maxWidth: 820,
    paddingRight: "clamp(0px, 1.2vw, 12px)",
  },
  metaRow: {
    gridArea: "meta",
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    alignItems: "center",
    gap: 0,
    paddingTop: 16,
    borderTop: "1px solid #eef2ff",
  },
  metaItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 18px",
    position: "relative",
  },
  metaIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    display: "grid",
    placeItems: "center",
    background: "#eef4ff",
    color: BLUE,
    fontWeight: 800,
    flex: "0 0 28px",
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
    gridArea: "cta",
    justifySelf: "center",
    alignSelf: "center",
    background: BLUE,
    color: "#fff",
    padding: "12px 20px",
    borderRadius: 999,
    fontWeight: 900,
    textDecoration: "none",
    boxShadow: "0 12px 26px rgba(11,86,201,.18)",
    marginTop: 16,
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
  revealDelay = "0ms",
}) {
  return (
    <section style={cardCss.wrap}>
      <div
        className="ev-card reveal"
        data-anim="up"
        style={{ ...cardCss.card, ["--rvd"]: revealDelay }}
        tabIndex={0}
      >
        <h2 className="ev-title" style={cardCss.title}>
          {safeText(title)}
        </h2>
        <div className="ev-poster" style={cardCss.poster}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={poster}
            alt={safeText(title)}
            title={safeText(title)}
            style={cardCss.posterImg}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src =
                "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=1200&auto=format&fit=crop";
            }}
          />
        </div>

        <p className="ev-desc" style={cardCss.desc}>
          {safeText(desc)}
        </p>

        <div className="ev-meta" style={cardCss.metaRow}>
          <div className="meta-item" style={cardCss.metaItem}>
            <div style={cardCss.metaIcon}>📍</div>
            <div className="meta-text" style={cardCss.metaText}>
              <p style={cardCss.metaLabel}>Location</p>
              <p style={cardCss.metaValue}>{safeText(location)}</p>
            </div>
          </div>
          <div className="meta-item" style={cardCss.metaItem}>
            <div style={cardCss.metaIcon}>🎫</div>
            <div className="meta-text" style={cardCss.metaText}>
              <p style={cardCss.metaLabel}>{safeText(priceLabel)}</p>
              <p style={cardCss.metaValue}>{safeText(price)}</p>
            </div>
          </div>
          <div className="meta-item meta-last" style={cardCss.metaItem}>
            <div style={cardCss.metaIcon}>🗓️</div>
            <div className="meta-text" style={cardCss.metaText}>
              <p style={cardCss.metaLabel}>{safeText(dateLabel)}</p>
              <p style={cardCss.metaValue}>{safeText(dateLong)}</p>
            </div>
          </div>
        </div>
        <Link
          href={ctaHref}
          className="cta-btn hero-cta--pulse"
          style={cardCss.cta}
          prefetch={false}
        >
          {safeText(ctaText)}
        </Link>
      </div>

      <style jsx>{`
        /* divider antar-meta di desktop */
        .ev-meta .meta-item:not(.meta-last)::after {
          content: "";
          position: absolute;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          height: 28px;
          width: 1px;
          background: #e6edff;
        }

        @media (max-width: 1200px) {
          .ev-card {
            grid-template-columns: 1fr !important;
            gridtemplateareas: "title" "poster" "desc" "meta" "cta" !important;
            grid-template-areas: "title" "poster" "desc" "meta" "cta" !important;
            row-gap: 18px !important;
          }
          .ev-title,
          .ev-desc {
            text-align: center;
            padding-right: 0 !important;
          }
          .cta-btn {
            justify-self: center !important;
            align-self: center !important;
          }
          .ev-meta {
            padding-top: 0 !important;
          }
          .ev-meta .meta-item:not(.meta-last)::after {
            display: none;
          }
        }

        @media (max-width: 768px) {
          .ev-card {
            padding: 16px !important;
          }
          .ev-poster {
            height: clamp(220px, 60vw, 340px) !important;
          }
          .ev-meta {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 8px !important;
            border-top: none !important;
          }
          .meta-item {
            gap: 6px !important;
            padding: 10px !important;
            background: #f8fbff;
            border-radius: 12px;
          }
          .meta-item .meta-text {
            width: 100%;
          }
          .cta-btn {
            width: min(320px, 100%) !important;
            justify-self: center !important;
            text-align: center;
          }
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
        className="reveal"
        data-anim="up"
        style={{
          ...CONTAINER,
          ...CENTER,
          display: "flex",
          justifyContent: "center",
          margin: "24px auto 36px",
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
          height: 32px;
          min-width: 32px;
          padding: 0 8px;
          border-radius: 999px;
          border: 1px solid #d4e2ff;
          background: #fff;
          box-shadow: 0 3px 8px rgba(11, 86, 201, 0.06);
          transition: all 160ms ease;
        }
        .events-mini-pagination .ant-pagination-item {
          display: grid;
          place-items: center;
          margin-inline: 6px;
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

/* ===== WHY ===== */
const why = {
  wrap: {
    ...CONTAINER,
    ...CENTER,
    marginTop: 90,
    marginBottom: 44,
    position: "relative",
    zIndex: Z.topSection,
  },
  title: {
    margin: 0,
    fontWeight: 900,
    textTransform: "uppercase",
    color: "#0b3e91",
    fontSize: "clamp(24px, 3vw, 36px)",
    letterSpacing: ".02em",
    textAlign: "center",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 22,
    marginTop: 26,
  },
  card: {
    background: "#fff",
    borderRadius: 20,
    border: "1px solid #edf2ff",
    boxShadow: "0 18px 40px rgba(11,86,201,.08)",
    padding: "clamp(16px, 2vw, 24px) clamp(16px, 2vw, 24px)",
    textAlign: "center",
  },
  img: {
    width: "clamp(72px, 7vw, 100px)",
    height: "clamp(72px, 7vw, 100px)",
    objectFit: "contain",
    display: "block",
    margin: "0 auto 12px",
    filter: "saturate(1.05)",
  },
  iconFallback: { fontSize: 50, lineHeight: 1, marginBottom: 10, color: BLUE },
  titleSmall: {
    margin: 0,
    color: "#0a3a86",
    fontWeight: 800,
    fontSize: "clamp(15px, 1.5vw, 18px)",
    lineHeight: 1.35,
  },
  desc: {
    marginTop: 8,
    color: "#476aa4",
    fontSize: "clamp(13px, 1.3vw, 14px)",
    lineHeight: 1.7,
  },
};

function WhySection({ vm }) {
  return (
    <section style={why.wrap}>
      <h2
        className="reveal"
        data-anim="down"
        style={{ ...why.title, ["--rvd"]: "40ms" }}
      >
        {safeText(vm.why2Title)}
      </h2>
      <div className="why-grid" style={why.grid}>
        {vm.why2Cards.map((c, i) => (
          <div
            key={i}
            className="reveal"
            data-anim="up"
            style={{ ...why.card, ["--rvd"]: `${(i % 6) * 70}ms` }}
          >
            {c.img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={c.img}
                alt={safeText(c.title)}
                title={safeText(c.title)}
                style={why.img}
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            ) : (
              <div style={why.iconFallback}>{safeText(c.icon || "🎓")}</div>
            )}
            <h3 style={why.titleSmall}>{safeText(c.title)}</h3>
            <p style={why.desc}>{safeText(c.desc)}</p>
          </div>
        ))}
      </div>

      <style jsx>{`
        @media (max-width: 1024px) {
          .why-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 768px) {
          .why-grid {
            gap: 16px !important;
          }
        }
        @media (max-width: 560px) {
          .why-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}

/* ===== PREVIOUS EVENTS SECTION ===== */
const prevEv = {
  wrap: {
    ...CONTAINER,
    ...CENTER,
    marginTop: 40,
    marginBottom: 56,
    textAlign: "center",
    position: "relative",
    zIndex: Z.topSection,
  },
  title: {
    margin: 0,
    fontWeight: 900,
    color: "#0b3e91",
    fontSize: "clamp(24px, 3vw, 32px)",
    letterSpacing: ".02em",
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 0,
    color: "#64748b",
    fontSize: "clamp(13px, 1.4vw, 15px)",
  },
  scrollerOuter: {
    marginTop: 26,
    paddingBottom: 14,
  },
  swiper: {
    padding: "4px 4px 6px",
  },
  card: {
    background: "#ffffff",
    borderRadius: 20,
    padding: 8,
    boxShadow: "0 14px 30px rgba(15,23,42,.10)",
    border: "1px solid #e5ecff",
    scrollSnapAlign: "start",
    width: "100%",
    maxWidth: 320,
    margin: "0 auto",
  },
  frame: {
    position: "relative",
    width: "100%",
    aspectRatio: "16 / 9",
    borderRadius: 16,
    overflow: "hidden",
    background: "#f1f5ff",
  },
  img: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
};

function PreviousEventsSection({ title, subtitle, photos = [] }) {
  const items = Array.isArray(photos) ? photos : [];
  if (!items.length) return null;

  const loop = items.length > 1;
  const swiperKey =
    items.map((p) => p.id ?? p.src ?? "").join("|") || "prev-empty";

  const speed = Math.max(
    5000,
    Math.min(14000, Math.max(1, items.length) * 900)
  );

  const autoplay = loop
    ? {
        delay: 0,
        disableOnInteraction: false,
        pauseOnMouseEnter: true,
        waitForTransition: false,
      }
    : false;

  return (
    <section style={prevEv.wrap}>
      <h2
        className="reveal"
        data-anim="down"
        style={{ ...prevEv.title, ["--rvd"]: "40ms" }}
      >
        {safeText(title)}
      </h2>
      {subtitle ? (
        <p
          className="reveal"
          data-anim="up"
          style={{ ...prevEv.subtitle, ["--rvd"]: "120ms" }}
        >
          {safeText(subtitle)}
        </p>
      ) : null}

      <div
        className="reveal"
        data-anim="up"
        style={{ ...prevEv.scrollerOuter, ["--rvd"]: "180ms" }}
      >
        <Swiper
          key={swiperKey}
          className="prev-swiper"
          style={prevEv.swiper}
          modules={[Autoplay]}
          slidesPerView="auto"
          spaceBetween={14}
          loop={loop}
          loopAdditionalSlides={loop ? Math.max(10, items.length) : 0}
          speed={speed}
          allowTouchMove={loop}
          autoplay={autoplay}
          observer
          observeParents
          watchSlidesProgress
          preloadImages={false}
        >
          {items.map((p, idx) => (
            <SwiperSlide key={p.id || idx}>
              <article className="prev-card" style={prevEv.card}>
                <div style={prevEv.frame}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.src}
                    alt={safeText(p.alt)}
                    title={safeText(p.alt)}
                    style={prevEv.img}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src =
                        "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=1200&auto=format&fit=crop";
                    }}
                  />
                </div>
              </article>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      <style jsx>{`
        .prev-swiper {
          overflow: visible;
        }
        .prev-swiper .swiper-wrapper {
          transition-timing-function: linear !important;
          align-items: stretch;
        }
        .prev-swiper .swiper-slide {
          width: var(--country-card-w, clamp(230px, 24vw, 320px));
          height: auto;
          display: flex;
          justify-content: center;
        }
        .prev-swiper .swiper-slide > article {
          width: 100%;
          max-width: 320px;
        }

        @media (max-width: 768px) {
          .prev-swiper .swiper-slide {
            width: clamp(220px, 70vw, 300px) !important;
          }
        }
      `}</style>
    </section>
  );
}

/* ===== REP CTA ===== */
const repCta = {
  shell: {
    width: "100%",
    background: "#fff",
    borderTop: "1px solid #e3ecff",
    borderBottom: "1px solid #e3ecff",
    padding: "36px 0 44px",
  },
  inner: { ...CONTAINER, ...CENTER, textAlign: "center" },
  title: {
    margin: "6px 0 18px",
    color: "#0b3e91",
    fontWeight: 800,
    fontSize: "clamp(20px,3vw,28px)",
    lineHeight: 1.25,
  },
  collage: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 18,
    maxWidth: 1080,
    margin: "0 auto 18px",
    alignItems: "stretch",
  },
  stackCol: { display: "grid", gridTemplateRows: "1fr 1fr", gap: 18 },
  tile: {
    position: "relative",
    width: "100%",
    borderRadius: 18,
    overflow: "hidden",
    background: "#f2f6ff",
    boxShadow: "0 12px 24px rgba(11,86,201,.08)",
  },
  tileTall: { aspectRatio: "3 / 4" },
  tileMid: { aspectRatio: "16 / 10" },
  img: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  btn: {
    display: "inline-block",
    marginTop: 10,
    background: BLUE,
    color: "#fff",
    padding: "12px 22px",
    borderRadius: 999,
    fontWeight: 800,
    textDecoration: "none",
    boxShadow: "0 10px 22px rgba(11,86,201,.18)",
  },
};

function RepCTA({ title, images = [], options = [], locale = "id" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState(null);

  const onConfirm = () => {
    if (!picked) return;
    router.push(`/user/events/rep?id=${picked}&lang=${locale}`);
  };

  const imgs = [...images];
  while (imgs.length < 4)
    imgs.push({ src: "/placeholder.jpg", alt: "Representative" });

  return (
    <>
      <section style={repCta.shell}>
        <div style={repCta.inner}>
          <h3
            className="reveal"
            data-anim="down"
            style={{ ...repCta.title, ["--rvd"]: "40ms" }}
          >
            {safeText(title)}
          </h3>

          <div
            className="rep-collage reveal"
            data-anim="zoom"
            style={{ ...repCta.collage, ["--rvd"]: "100ms" }}
          >
            <div
              className="rep-tile rep-tall"
              style={{ ...repCta.tile, ...repCta.tileTall }}
            >
              <img
                src={imgs[0]?.src}
                alt={safeText(imgs[0]?.alt || "Representative 1")}
                title={safeText(imgs[0]?.alt || "Representative 1")}
                style={repCta.img}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src =
                    "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1200&auto=format&fit=crop";
                }}
              />
            </div>

            <div className="rep-stack" style={repCta.stackCol}>
              <div
                className="rep-tile rep-mid"
                style={{ ...repCta.tile, ...repCta.tileMid }}
              >
                <img
                  src={imgs[1]?.src}
                  alt={safeText(imgs[1]?.alt || "Representative 2")}
                  title={safeText(imgs[1]?.alt || "Representative 2")}
                  style={repCta.img}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src =
                      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1200&auto=format&fit=crop";
                  }}
                />
              </div>
              <div
                className="rep-tile rep-mid"
                style={{ ...repCta.tile, ...repCta.tileMid }}
              >
                <img
                  src={imgs[2]?.src}
                  alt={safeText(imgs[2]?.alt || "Representative 3")}
                  title={safeText(imgs[2]?.alt || "Representative 3")}
                  style={repCta.img}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src =
                      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1200&auto=format&fit=crop";
                  }}
                />
              </div>
            </div>

            <div
              className="rep-tile rep-tall"
              style={{ ...repCta.tile, ...repCta.tileTall }}
            >
              <img
                src={imgs[3]?.src}
                alt={safeText(imgs[3]?.alt || "Representative 4")}
                title={safeText(imgs[3]?.alt || "Representative 4")}
                style={repCta.img}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src =
                    "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1200&auto=format&fit=crop";
                }}
              />
            </div>
          </div>

          <button
            className="reveal hero-cta--bob"
            data-anim="up"
            style={{ ...repCta.btn, ["--rvd"]: "160ms" }}
            onClick={() => setOpen(true)}
          >
            {locale === "en"
              ? "Submit Event Collaboration"
              : "Ajukan Kolaborasi Event"}
          </button>
        </div>
      </section>

      <ConfigProvider
        theme={{
          token: { colorPrimary: BLUE, borderRadius: 12, colorText: TEXT },
          components: { Modal: { contentBg: "#fff" } },
        }}
      >
        <Modal
          open={open}
          onCancel={() => setOpen(false)}
          onOk={onConfirm}
          okText={locale === "en" ? "Continue" : "Lanjutkan"}
          cancelText={locale === "en" ? "Cancel" : "Batal"}
          okButtonProps={{ disabled: !picked, style: { fontWeight: 800 } }}
          title={
            locale === "en"
              ? "Choose Event to Book a Booth"
              : "Pilih Event untuk Booking Booth"
          }
        >
          {options.length === 0 ? (
            <p style={{ margin: 0, color: "#64748b" }}>
              {locale === "en"
                ? "No representative events are available yet."
                : "Belum ada event untuk perwakilan."}
            </p>
          ) : (
            <Radio.Group
              onChange={(e) => setPicked(e.target.value)}
              value={picked}
              style={{ width: "100%" }}
            >
              {options.map((o) => (
                <Radio
                  key={o.value}
                  value={o.value}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "12px 14px",
                    border: "1px solid #e6efff",
                    borderRadius: 10,
                    marginBottom: 10,
                    width: "100%",
                    fontWeight: 700,
                    color: "#0a3a86",
                  }}
                >
                  {o.label}
                </Radio>
              ))}
            </Radio.Group>
          )}
        </Modal>
      </ConfigProvider>

      <style jsx>{`
        /* Tablet: 2 kolom */
        @media (max-width: 900px) {
          .rep-collage {
            grid-template-columns: 1fr 1fr !important;
          }
          .rep-stack {
            order: 3;
            grid-column: span 2;
            grid-template-columns: 1fr 1fr;
            grid-template-rows: none;
          }
        }
        /* Mobile: 1 kolom & ratio lebih landai */
        @media (max-width: 560px) {
          .rep-collage {
            grid-template-columns: 1fr !important;
          }
          .rep-stack {
            grid-column: auto;
            grid-template-columns: 1fr;
            gap: 14px !important;
          }
          .rep-tall {
            aspect-ratio: 4 / 3 !important;
          }
          .rep-mid {
            aspect-ratio: 16 / 11 !important;
          }
        }
      `}</style>
    </>
  );
}

/* ===== Empty state ===== */
function NoEvents({ locale = "id" }) {
  const t = (id, en) => (locale === "en" ? en : id);
  return (
    <section
      className="reveal"
      data-anim="zoom"
      style={{
        ...CONTAINER,
        ...CENTER,
        marginTop: 40,
        marginBottom: 80,
        padding: "32px clamp(20px, 4vw, 48px)",
        borderRadius: 20,
        border: "1px dashed #cfe1ff",
        background: "#fff",
        display: "grid",
        placeItems: "center",
        textAlign: "center",
        ["--rvd"]: "40ms",
      }}
    >
      <div style={{ fontSize: 64, lineHeight: 1, marginBottom: 12 }}>🗓️</div>
      <h3
        style={{
          margin: "8px 0 6px",
          fontWeight: 900,
          color: "#0b3e91",
          fontSize: 28,
        }}
      >
        {t("Belum ada event yang tersedia", "No events available yet")}
      </h3>
      <p style={{ color: "#476aa4", maxWidth: 640, margin: "0 auto" }}>
        {t(
          "Pantau halaman ini secara berkala; event baru akan segera hadir.",
          "Check back soon—new events are on the way."
        )}
      </p>
    </section>
  );
}

/* ===== PAGE (Client) ===== */
export default function EventsUContent(props) {
  const { initialLocale, initialTab, locale: localeProp } = props || {};
  const search = useSearchParams();

  // ===== Locale client-side (sinkron dengan halaman lain) =====
  const baseLocale = initialLocale || localeProp || "id";

  const locale = useMemo(() => {
    const fromQuery = search?.get("lang") || "";
    const fromLs =
      typeof window !== "undefined"
        ? window.localStorage.getItem("oss.lang") || ""
        : "";
    return pickLocaleClient(fromQuery || baseLocale, fromLs);
  }, [search, baseLocale]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("oss.lang", locale);
      } catch {
        // ignore
      }
    }
  }, [locale]);

  // ===== Tab (all / peserta / rep) =====
  const baseTab =
    typeof initialTab === "string" ? initialTab.toLowerCase() : "all";

  const tab = useMemo(() => {
    const fromQuery = (search?.get("tab") || "").toLowerCase();
    const raw = fromQuery || baseTab;
    if (raw === "peserta" || raw === "rep") return raw;
    return "all";
  }, [search, baseTab]);

  // ===== View model untuk halaman All Events =====
  const vm = useEventsUViewModel({ locale });

  const heroRef = useRef(null);
  useRevealOnScroll([
    vm.studentEvents.length,
    vm.repEvents.length,
    vm.previousEventPhotos?.length || 0,
  ]);
  useHeroParallax(heroRef);

  const [pageStu, setPageStu] = useState(1);
  const stuStart = (pageStu - 1) * PAGE_SIZE;

  const stuItems = vm.studentEvents
    .slice(stuStart, stuStart + PAGE_SIZE)
    .map((e) => ({
      ...e,
      ctaHref: `/user/events/peserta?id=${e.id}&lang=${locale}`,
    }));

  const hasStudent = vm.studentEvents.length > 0;
  const hasRep = vm.repEvents.length > 0;
  const hasAny = hasStudent || hasRep;

  const heroTitle = useMemo(() => {
    const t1 = safeText(vm.titleLine1);
    const t2 = safeText(vm.titleLine2);
    const both = [t1, t2].filter(Boolean).join(" ").trim();
    return both || "Temukan Event Terdekatmu";
  }, [vm.titleLine1, vm.titleLine2]);

  const heroSub =
    safeText(vm.heroSub) ||
    "Bergabunglah dalam acara kami dan rasakan pengalaman inspiratif menuju dunia global.";

  /* ==== Routing tab: peserta / rep pakai dynamic component ==== */
  if (tab === "peserta") {
    return <EventsPeserta key={`peserta-${locale}`} locale={locale} />;
  }
  if (tab === "rep") {
    return <EventsRep key={`rep-${locale}`} locale={locale} />;
  }

  /* ==== MAIN: ALL EVENTS VIEW ==== */
  return (
    <main
      className="events-page"
      data-shell="full"
      style={{ position: "relative", zIndex: 0, background: "#fff" }}
    >
      {/* HERO */}
      <section className="hero-section" style={hero.section}>
        <div className="hero-inner" style={hero.inner} ref={heroRef}>
          {/* Decorative gradient layer */}
          <div className="hero-bg" aria-hidden>
            <span className="h-blob h-blob--tl" />
            <span className="h-blob h-blob--br" />
            <span className="h-dots" />
          </div>

          <div className="hero-copy js-hero-copy">
            <h1
              className="reveal"
              data-anim="down"
              style={{ ...hero.titleMain, ["--rvd"]: "60ms" }}
            >
              {heroTitle}
            </h1>
            <p
              className="reveal"
              data-anim="up"
              style={{ ...hero.sub, ["--rvd"]: "140ms" }}
            >
              {heroSub}
            </p>

            {/* Countdown sekarang pakai panel client-only setelah mount */}
            <CountdownPanel vm={vm} locale={locale} />
          </div>
        </div>
      </section>

      {/* EMPTY */}
      {!hasAny && <NoEvents locale={locale} />}

      {/* STUDENT LIST */}
      {hasStudent && (
        <>
          <section style={sectionBar.shell}>
            <div
              className="reveal"
              data-anim="down"
              style={{ ...sectionBar.bar, ["--rvd"]: "40ms" }}
            >
              <div style={sectionBar.text}>
                {safeText(
                  stuItems[0]?.barTitle || "Gabung Event Kita Sebagai Student"
                )}
              </div>
            </div>
          </section>

          {stuItems.map((it, i) => (
            <EventCard key={it.id} {...it} revealDelay={`${(i % 3) * 80}ms`} />
          ))}
          <SectionPager
            current={pageStu}
            total={vm.studentEvents.length}
            onChange={setPageStu}
          />
        </>
      )}

      {/* WHY */}
      <WhySection vm={vm} />

      {/* PREVIOUS EVENTS (Keseruan Event Sebelumnya) */}
      <PreviousEventsSection
        title={vm.previousEventsTitle}
        subtitle={vm.previousEventsSubtitle}
        photos={vm.previousEventPhotos}
      />

      {/* REP CTA */}
      {hasRep && (
        <RepCTA
          title={vm.repCtaTitle}
          images={vm.repCtaImages}
          options={vm.repEventOptions}
          locale={locale}
        />
      )}

      <style jsx>{`
        /* Countdown grid clamp (tablet) */
        @media (max-width: 900px) {
          .cd-row {
            grid-template-columns: repeat(2, minmax(120px, 1fr)) !important;
            gap: 14px !important;
          }
        }

        /* Mobile: menit & detik DI BAWAH hari & jam (2x2) */
        @media (max-width: 768px) {
          .cd-row {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            grid-template-areas:
              "days hours"
              "minutes seconds";
          }

          .cd-row .cd-chip:nth-child(1) {
            grid-area: days;
          }
          .cd-row .cd-chip:nth-child(2) {
            grid-area: hours;
          }
          .cd-row .cd-chip:nth-child(3) {
            grid-area: minutes;
          }
          .cd-row .cd-chip:nth-child(4) {
            grid-area: seconds;
          }
        }

        @media (max-width: 520px) {
          .cd-row {
            grid-template-columns: repeat(2, minmax(100px, 1fr)) !important;
            gap: 10px !important;
          }
          .cd-chip div:first-child {
            width: 120px !important;
            height: 62px !important;
            font-size: 28px !important;
          }
        }

        /* Anti horizontal scroll */
        .events-page {
          overflow-x: hidden;
        }
        @supports (overflow: clip) {
          .events-page {
            overflow-x: clip;
          }
        }
      `}</style>

      {/* ===== GLOBAL ANIM & HERO DECOR STYLES ===== */}
      <style jsx global>{`
        /* Reveal utilities */
        .reveal {
          opacity: 0;
          transform: var(--reveal-from, translate3d(0, 16px, 0));
          transition: opacity 700ms ease,
            transform 700ms cubic-bezier(0.21, 1, 0.21, 1);
          transition-delay: var(--rvd, 0ms);
          will-change: opacity, transform;
        }
        .reveal[data-anim="up"] {
          --reveal-from: translate3d(0, 18px, 0);
        }
        .reveal[data-anim="down"] {
          --reveal-from: translate3d(0, -18px, 0);
        }
        .reveal[data-anim="left"] {
          --reveal-from: translate3d(-18px, 0, 0);
        }
        .reveal[data-anim="right"] {
          --reveal-from: translate3d(18px, 0, 0);
        }
        .reveal[data-anim="zoom"] {
          --reveal-from: scale(0.96);
        }
        .reveal.is-visible {
          opacity: 1;
          transform: none;
        }
        @media (prefers-reduced-motion: reduce) {
          .reveal {
            transition: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
          .hero-cta--bob,
          .hero-cta--pulse {
            animation: none !important;
          }
        }

        /* Micro-motions for CTAs */
        @keyframes y-bob {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-4px);
          }
        }
        .hero-cta--bob {
          animation: y-bob 3s ease-in-out infinite;
        }
        @keyframes pulse-soft {
          0%,
          100% {
            box-shadow: 0 14px 28px rgba(11, 86, 201, 0.28);
          }
          50% {
            box-shadow: 0 18px 36px rgba(11, 86, 201, 0.34);
          }
        }
        .hero-cta--pulse {
          animation: pulse-soft 2.8s ease-in-out infinite;
        }
        .cta-btn:focus-visible {
          outline: 3px solid #5aa8ff;
          outline-offset: 3px;
          border-radius: 999px;
        }

        /* Hover lift for cards */
        @media (hover: hover) {
          .ev-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 14px 28px rgba(15, 23, 42, 0.12),
              0 28px 60px rgba(15, 23, 42, 0.12),
              inset 0 1px 0 rgba(255, 255, 255, 0.7);
          }
        }

        /* ===== Hero decorative gradients ===== */
        .hero-inner {
          position: relative;
        }
        .hero-bg {
          position: absolute;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          overflow: hidden;
        }

        .h-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(18px);
          opacity: 0.75;
          will-change: transform, opacity;
          animation: blobFloat 14s ease-in-out infinite;
        }
        .h-blob--tl {
          width: clamp(220px, 28vw, 420px);
          height: clamp(220px, 28vw, 420px);
          left: max(-60px, -6vw);
          top: max(-40px, -4vw);
          background: radial-gradient(
            circle at 50% 50%,
            rgba(11, 86, 201, 0.3) 0%,
            rgba(11, 86, 201, 0.18) 35%,
            rgba(11, 86, 201, 0) 70%
          );
          animation-delay: 0s;
        }
        .h-blob--br {
          width: clamp(260px, 32vw, 520px);
          height: clamp(260px, 32vw, 520px);
          right: max(-80px, -8vw);
          bottom: max(-70px, -6vw);
          background: radial-gradient(
            circle at 50% 50%,
            rgba(11, 86, 201, 0.24) 0%,
            rgba(11, 86, 201, 0.14) 40%,
            rgba(11, 86, 201, 0) 72%
          );
          animation-delay: 1.2s;
        }

        /* subtle dots grid */
        .h-dots {
          position: absolute;
          inset: 0;
          background-image: radial-gradient(
            rgba(11, 86, 201, 0.12) 1px,
            transparent 1px
          );
          background-size: 18px 18px;
          opacity: 0.12;
          mask-image: radial-gradient(
            1200px 600px at 50% 30%,
            #000 0%,
            transparent 70%
          );
        }

        @keyframes blobFloat {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(1);
            opacity: 0.75;
          }
          50% {
            transform: translate3d(0, -10px, 0) scale(1.03);
            opacity: 0.9;
          }
        }

        @media (max-width: 640px) {
          .h-blob--tl,
          .h-blob--br {
            opacity: 0.6;
            filter: blur(20px);
          }
          .h-dots {
            opacity: 0.1;
            background-size: 16px 16px;
          }
        }

        /* === FIX: Hero full-bleed di desktop, normal di mobile === */
        @media (max-width: 768px) {
          .hero-section {
            width: 100% !important;
            max-width: 100% !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .h-blob {
            animation: none !important;
          }
        }
      `}</style>
    </main>
  );
}
