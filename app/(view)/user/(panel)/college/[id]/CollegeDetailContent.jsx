"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import useCollegeDetailViewModel from "./useCollegeDetailViewModel";
import { sanitizeHtml } from "@/app/utils/dompurify";
import {
  isExternalAsset,
  toPublicStorageUrl,
} from "@/app/utils/publicCdnClient";

/* ================== Storage helpers (gateway/CDN) ================== */
function toPublicUrlMaybe(input) {
  const raw = String(input || "").trim();
  if (!raw) return "";
  if (isExternalAsset(raw)) return raw;
  if (raw.startsWith("/")) return raw;
  return toPublicStorageUrl(raw);
}
const normalizeSrc = (s = "") =>
  toPublicUrlMaybe(s) ||
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg'/>";

const shouldUnoptimize = (s = "") => isExternalAsset(s);

/* ============================ Hooks ============================ */
function useIsNarrow(breakpoint = 980) {
  const [isNarrow, setIsNarrow] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia?.(`(max-width:${breakpoint}px)`);
    const apply = () => setIsNarrow(!!mq?.matches);
    apply();
    mq?.addEventListener?.("change", apply);
    return () => mq?.removeEventListener?.("change", apply);
  }, [breakpoint]);
  return isNarrow;
}

/* ============================ Tokens ============================ */
const FONT_FAMILY = '"Public Sans", sans-serif';
const HEADER_OFFSET = "clamp(48px, 8vw, 84px)";
const STICKY_TOP = "clamp(72px, 9vw, 108px)";
const CLICK_OFFSET_PX = 96;

const shell = {
  page: {
    background: "#fff",
    fontFamily: FONT_FAMILY,
    overflowX: "hidden",
    paddingTop: "clamp(48px, 8vw, 84px)",
    paddingBottom: "clamp(32px, 6vw, 64px)",
  },
  inner: { width: "min(1180px, 96%)", margin: "0 auto" },
};

/* ============================ HERO ============================ */
const heroStyles = {
  wrapBleed: {
    width: "100%",
    marginTop: `calc(-1 * ${HEADER_OFFSET})`,
  },
  frame: {
    position: "relative",
    width: "100%",
    height: "clamp(520px, 58vw, 700px)",
    overflow: "hidden",
    background: "#eaf2ff",
    borderRadius: 0,
    boxShadow: "0 24px 60px rgba(15,23,42,.25)",
  },
  overlay: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(0deg, rgba(11,47,116,.40) 0%, rgba(11,47,116,.40) 100%), rgba(11,47,116,.25)",
    zIndex: 1,
  },
  content: {
    position: "absolute",
    zIndex: 2,
    left: "max(16px, 5vw)",
    right: "max(16px, 5vw)",
    top: "50%",
    transform: "translateY(-50%)",
    display: "grid",
    justifyItems: "center",
    gap: 16,
    textAlign: "center",
  },
  logoBox: {
    position: "relative",
    width: "min(460px, 40vw)",
    height: "min(180px, 16vw)",
  },
  title: {
    margin: 0,
    color: "#fff",
    fontWeight: 900,
    letterSpacing: ".12em",
    textTransform: "uppercase",
    fontSize: "clamp(32px, 8vw, 84px)",
    lineHeight: 1.02,
    textShadow: "0 8px 22px rgba(0,0,0,.35)",
  },
  metaRow: {
    marginTop: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
    flexWrap: "wrap",
  },
  flag: {
    borderRadius: 10,
    objectFit: "cover",
    boxShadow: "0 12px 28px rgba(0,0,0,.25)",
  },
  pill: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    padding: "0 clamp(14px, 3.4vw, 30px)",
    background: "#ffffff",
    color: "#0B4DA6",
    borderRadius: 26,
    fontWeight: 900,
    fontSize: "clamp(14px, 2.6vw, 22px)",
    textDecoration: "none",
    boxShadow: "0 16px 34px rgba(0,0,0,.22)",
  },
  media: `
    @media (max-width: 980px){
      .cd-hero-logo {
        width: min(82vw, 520px) !important;
        height: min(32vw, 160px) !important;
      }
      .cd-hero-title {
        letter-spacing: .08em !important;
        font-size: clamp(24px, 7.4vw, 44px) !important;
      }
      .cd-hero-pill  {
        height: 44px !important;
        padding: 0 clamp(12px, 4vw, 20px) !important;
        font-size: clamp(13px, 4vw, 16px) !important;
      }
    }
  `,
};

/* ============================ Layout/Blocks ============================ */
const layout = {
  section: { padding: "32px 0 44px" },
  aside: { alignSelf: "stretch", position: "relative" },
  sidenavStick: { position: "sticky", top: STICKY_TOP },
  content: {
    background: "#fff",
    borderRadius: 16,
    padding: "22px 22px 24px",
    scrollMarginTop: CLICK_OFFSET_PX,
  },
  h2: {
    margin: "0 0 10px",
    color: "#0B2F74",
    fontSize: "clamp(22px, 3vw, 34px)",
    fontWeight: 900,
    letterSpacing: ".04em",
  },
  hr: {
    height: 2,
    background: "linear-gradient(90deg,#0B4DA6,rgba(11,77,166,0))",
    border: "none",
    margin: "8px 0 18px",
  },
  body: { color: "#2b3a5e", lineHeight: 1.8, opacity: 0.98 },
  media: `
    .cd-grid {
      display: grid;
      grid-template-columns: minmax(0, 260px) 1fr;
      gap: 32px;
      align-items: start;
    }
    @media (max-width: 980px){
      .cd-grid { grid-template-columns: 1fr; gap: 18px; }
      .cd-sidenav-stick { position: static; }
    }
  `,
};

const leftNavCSS = `
  .cd-leftnav { display: grid; gap: 14px; }
  .cd-leftnav__item {
    position: relative; border: 0; background: transparent; color: #0B2F74;
    font-weight: 800; font-size: 18px; line-height: 1.4; text-align: left;
    padding: 6px 0 6px 18px; cursor: pointer; white-space: pre-wrap;
  }
  .cd-leftnav__item::before {
    content: ""; position: absolute; left: 0; top: 50%; transform: translateY(-50%);
    width: 4px; height: 26px; background: #E3EEFF; border-radius: 3px;
  }
  .cd-leftnav__item[data-active="true"] { color: #0B4DA6; }
  .cd-leftnav__item[data-active="true"]::before { background: #0B4DA6; height: 32px; }
`;

const clickable = {
  color: "#0B4DA6",
  textDecoration: "underline",
  textUnderlineOffset: "3px",
  textDecorationThickness: "2px",
  cursor: "pointer",
  display: "inline-block",
};

/* ====== FACULTY GRID ====== */
const facultyStyles = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0,1fr))",
    gap: 18,
  },
  card: {
    background: "#fff",
    border: "1px solid rgba(13,38,78,.08)",
    borderRadius: 14,
    padding: "14px 16px",
    boxShadow: "0 10px 24px rgba(15,23,42,.06)",
  },
  title: {
    margin: "0 0 6px",
    color: "#0B2F74",
    fontWeight: 800,
    letterSpacing: ".02em",
    fontSize: 14,
    textTransform: "uppercase",
  },
  ul: { margin: 0, padding: "0 0 0 18px", lineHeight: 1.7, fontSize: 14 },
  media: `
    @media (max-width: 980px){
      .cd-fac-grid { grid-template-columns: repeat(2, minmax(0,1fr)); gap: 14px; }
    }
  `,
};

const progListStyles = {
  ul: { margin: 0, padding: 0, display: "grid", gap: 8 },
  li: {
    listStyle: "none",
    display: "grid",
    gridTemplateColumns: "12px 1fr",
    columnGap: 10,
    alignItems: "start",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#0B2F74",
    marginTop: "0.55em",
  },
  text: { wordBreak: "break-word" },
};

const reqStyles = {
  list: { display: "grid", gap: 12, margin: 0, padding: 0 },
  item: {
    listStyle: "none",
    background: "#fff",
    borderRadius: 12,
    boxShadow: "0 12px 26px rgba(15,23,42,.08)",
    border: "1px solid rgba(13,38,78,.08)",
    padding: "12px 14px",
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  check: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    background: "#1a60ff",
    display: "grid",
    placeItems: "center",
    boxShadow: "0 8px 18px rgba(26,96,255,.35)",
    flex: "0 0 28px",
  },
};

const tuitionStyles = {
  grid: { display: "grid", gridTemplateColumns: "220px 1fr", gap: 10 },
  label: { color: "#5b6a92", fontWeight: 700, fontSize: 14 },
  value: { color: "#0B2F74", fontWeight: 800, fontSize: 16 },
};

/* ============================ CTA ============================ */
const ctaStyles = {
  wrapBleed: {
    width: "100%",
    padding: "clamp(28px,4vw,48px) 0",
    background:
      "linear-gradient(180deg, #FFFFFF 0%, #FFFFFF 12%, #F3F9FF 28%, #EAF6FF 55%, #FFFFFF 100%)",
    position: "relative",
  },
  topFeather: {
    content: '""',
    position: "absolute",
    top: -24,
    left: 0,
    right: 0,
    height: 24,
    background:
      "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%)",
    pointerEvents: "none",
  },
  inner: {
    ...shell.inner,
    display: "grid",
    gridTemplateColumns: "1fr minmax(260px, 420px)",
    alignItems: "center",
    gap: 24,
  },
  headline: {
    margin: 0,
    color: "#0B2F74",
    fontWeight: 900,
    letterSpacing: ".08em",
    textTransform: "uppercase",
    fontSize: "clamp(18px, 3.2vw, 34px)",
    lineHeight: 1.25,
  },
  btn: {
    display: "inline-flex",
    marginTop: 22,
    alignItems: "center",
    justifyContent: "center",
    height: 64,
    padding: "0 clamp(24px, 4vw, 44px)",
    background: "#0B4DA6",
    color: "#fff",
    borderRadius: 18,
    fontWeight: 900,
    fontSize: "clamp(16px, 2.3vw, 22px)",
    textDecoration: "none",
    boxShadow: "0 20px 36px rgba(11,77,166,.35)",
  },
  illobox: {
    position: "relative",
    width: "min(420px, 42vw)",
    height: "min(320px, 36vw)",
    justifySelf: "end",
    marginRight: "50px",
  },
  media: `
    @media (max-width: 980px){
      .cd-cta { grid-template-columns: 1fr; }
      .cd-cta-illo {
        justify-self: center;
        width: min(72vw, 480px);
        height: min(54vw, 360px);
      }
    }
  `,
};

/* ============================ Global Small CSS ============================ */
const globalCSS = `
  a.cd-cta-btn,
  a.cd-cta-btn:visited,
  a.cd-cta-btn:hover,
  a.cd-cta-btn:active,
  a.cd-cta-btn:focus { text-decoration: none !important; }
`;

const modalCSS = `
  .cd-modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(3,16,46,.55);
    display: grid;
    place-items: center;
    z-index: 9999;
    padding: 12px;
  }
  .cd-modal {
    width: min(720px, 94vw);
    max-height: min(640px, 90vh);
    background: #fff;
    border-radius: 18px;
    box-shadow: 0 30px 80px rgba(15,23,42,.35);
    padding: 18px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .cd-modal__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 10px;
  }
  .cd-modal__title {
    margin: 0;
    color: #0B2F74;
    font-weight: 900;
    letter-spacing: .02em;
    font-size: clamp(18px, 2.6vw, 22px);
  }
  .cd-modal__close {
    border: 0;
    background: #0B4DA6;
    color: #fff;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    cursor: pointer;
    font-size: 18px;
    font-weight: 800;
    box-shadow: 0 10px 22px rgba(11,77,166,.35);
  }
  .cd-modal__body {
    color: #2b3a5e;
    line-height: 1.7;
    overflow-y: auto;
    padding-right: 6px;
    margin-right: -6px;
    flex: 1;
    min-height: 0;
  }
  .cd-modal__body::-webkit-scrollbar { width: 6px; }
  .cd-modal__body::-webkit-scrollbar-thumb {
    background: rgba(11,77,166,.35);
    border-radius: 3px;
  }
  .cd-modal__row {
    display: grid;
    grid-template-columns: 140px 1fr;
    gap: 10px;
    margin: 6px 0;
  }
  .cd-modal__label {
    color: #5b6a92;
    font-weight: 700;
    font-size: 14px;
  }
  .cd-modal__value {
    color: #0B2F74;
    font-weight: 700;
  }
  @media (max-width: 640px){
    .cd-modal {
      width: min(96vw, 420px);
      max-height: 90vh;
      border-radius: 14px;
      padding: 16px;
    }
    .cd-modal__row {
      grid-template-columns: 1fr;
    }
  }
`;

const hideAsideCSS = `
  @media (max-width: 980px){
    .cd-aside { display: none !important; }
  }
`;

/* ============================ Component ============================ */
export default function CollegeDetailContent({
  id,
  locale: initialLocale = "id",
}) {
  const search = useSearchParams();

  // Locale runtime: query ?lang / ?locale -> initialLocale (dari server) -> "id"
  const locale = useMemo(() => {
    const fromQuery = search?.get("lang") || search?.get("locale") || "";
    // NOTE: initialLocale didapat dari server (pickLocale), jadi diprioritaskan
    const raw = String(fromQuery || initialLocale || "id")
      .slice(0, 2)
      .toLowerCase();
    return raw === "en" ? "en" : "id";
  }, [search, initialLocale]);

  const { hero, sections, tuition, websiteHref } = useCollegeDetailViewModel({
    id,
    locale,
  });
  const isNarrow = useIsNarrow(980);

  // sync locale runtime ke localStorage (biar konsisten dengan halaman lain)
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("oss.lang", locale);
      } catch {
        // ignore
      }
    }
  }, [locale]);

  const sectionIds = useMemo(() => ["umum", "biaya", "fakultas", "syarat"], []);
  const [active, setActive] = useState(sectionIds[0]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState({
    title: "",
    description: "",
    priceLabel: "",
    intakeLabel: "",
  });

  const openModal = useCallback((payload) => {
    setModalData({
      title: payload?.title || "",
      description: payload?.description || "",
      priceLabel: payload?.priceLabel || "",
      intakeLabel: payload?.intake || "",
    });
    setModalOpen(true);
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e) => e.key === "Escape" && setModalOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [modalOpen]);

  useEffect(() => {
    const observers = sectionIds
      .map((sid) => document.getElementById(sid))
      .filter(Boolean)
      .map((el) => {
        const ob = new IntersectionObserver(
          (entries) =>
            entries.forEach((e) => e.isIntersecting && setActive(el.id)),
          { rootMargin: "-40% 0px -55% 0px" }
        );
        ob.observe(el);
        return ob;
      });
    return () => observers.forEach((o) => o.disconnect());
  }, [sectionIds]);

  const goTo = useCallback((sid) => {
    const el = document.getElementById(sid);
    if (!el) return;
    const top =
      el.getBoundingClientRect().top + window.scrollY - CLICK_OFFSET_PX;
    window.scrollTo({ top, behavior: "smooth" });
  }, []);

  const coverSrc = normalizeSrc(hero.cover);
  const logoSrc = normalizeSrc(hero.logo);
  const coverObjectPos =
    hero.objectPosition || (isNarrow ? "center 30%" : "center 40%");

  const navItems = useMemo(
    () => [
      ["umum", locale === "en" ? "General Information" : "Informasi Umum"],
      [
        "biaya",
        locale === "en"
          ? "Tuition & Living Cost"
          : "Biaya Kuliah &\nBiaya Hidup",
      ],
      [
        "fakultas",
        locale === "en" ? "Departments & Programs" : "Jurusan & Prodi",
      ],
      ["syarat", locale === "en" ? "Requirements" : "Persyaratan"],
    ],
    [locale]
  );

  const ctaHeadline =
    locale === "en"
      ? "CURIOUS HOW MUCH YOU MIGHT SPEND?"
      : "PENASARAN BERAPA BANYAK YANG MUNGKIN PERLU ANDA HABISKAN?";
  const ctaHref = "/user/calculator";
  const ctaImgSrc = normalizeSrc("/images/cta-detail.svg");

  const faculties = Array.isArray(sections?.faculties)
    ? sections.faculties
    : [];
  const requirements = Array.isArray(sections?.requirements)
    ? sections.requirements
    : [];

  return (
    <main style={shell.page} data-shell="full">
      {/* ===== HERO ===== */}
      <div style={heroStyles.wrapBleed}>
        <div style={heroStyles.frame}>
          <Image
            src={coverSrc}
            alt={hero.name || "Campus"}
            fill
            sizes="100vw"
            priority
            style={{ objectFit: "cover", objectPosition: coverObjectPos }}
            unoptimized={shouldUnoptimize(coverSrc)}
          />
          <div style={heroStyles.overlay} />

          <div style={heroStyles.content}>
            {!!hero.logo && (
              <div className="cd-hero-logo" style={heroStyles.logoBox}>
                <Image
                  src={logoSrc}
                  alt={`${hero.name || "College"} logo`}
                  fill
                  sizes="520px"
                  style={{ objectFit: "contain" }}
                  unoptimized={shouldUnoptimize(logoSrc)}
                />
              </div>
            )}

            <h1 className="cd-hero-title" style={heroStyles.title}>
              {(hero.name || "").toUpperCase()}
            </h1>

            <div style={heroStyles.metaRow}>
              {!!hero.flagSrc && (
                <Image
                  src={normalizeSrc(hero.flagSrc)}
                  alt={`${hero.countryName || "Country"} flag`}
                  width={64}
                  height={44}
                  style={heroStyles.flag}
                  priority
                  unoptimized={shouldUnoptimize(hero.flagSrc)}
                />
              )}
              {!!websiteHref && (
                <a
                  href={websiteHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cd-hero-pill"
                  style={heroStyles.pill}
                >
                  {hero.websiteText || websiteHref.replace(/^https?:\/\//, "")}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===== CONTENT ===== */}
      <section style={layout.section}>
        <div className="cd-grid" style={{ ...shell.inner }}>
          {/* Sidebar hanya di desktop */}
          {!isNarrow && (
            <aside className="cd-aside" style={layout.aside}>
              <div className="cd-sidenav-stick" style={layout.sidenavStick}>
                <nav className="cd-leftnav" aria-label="College sections">
                  {navItems.map(([id, label]) => (
                    <button
                      key={id}
                      className="cd-leftnav__item"
                      data-active={active === id}
                      aria-current={active === id ? "true" : undefined}
                      onClick={() => goTo(id)}
                    >
                      {label}
                    </button>
                  ))}
                </nav>
              </div>
            </aside>
          )}

          {/* Body */}
          <div>
            <section id="umum" style={{ ...layout.content, marginLeft: -22 }}>
              <h2 style={layout.h2}>
                {locale === "en" ? "General Information" : "Informasi Umum"}
              </h2>
              <hr style={layout.hr} />
              <div
                style={layout.body}
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(sections?.aboutHTML || ""),
                }}
              />
            </section>

            <section
              id="biaya"
              style={{ ...layout.content, marginTop: 22, marginLeft: -22 }}
            >
              <h2 style={layout.h2}>
                {locale === "en"
                  ? "Tuition & Living Cost"
                  : "Biaya Kuliah & Biaya Hidup"}
              </h2>
              <hr style={layout.hr} />
              <div style={tuitionStyles.grid}>
                <div style={tuitionStyles.label}>
                  {locale === "en" ? "Tuition Fee" : "Biaya Kuliah"}
                </div>
                <div style={tuitionStyles.value}>{tuition.feeLabel}</div>
                <div style={tuitionStyles.label}>
                  {locale === "en" ? "Estimated Living Cost" : "Biaya Hidup"}
                </div>
                <div style={tuitionStyles.value}>
                  {tuition.livingCost || "-"}
                </div>
              </div>
            </section>

            <section
              id="fakultas"
              style={{ ...layout.content, marginTop: 22, marginLeft: -22 }}
            >
              <h2 style={layout.h2}>
                {locale === "en" ? "Departments & Programs" : "Jurusan & Prodi"}
              </h2>
              <hr style={layout.hr} />

              <div className="cd-fac-grid" style={facultyStyles.grid}>
                {faculties.length ? (
                  faculties.map((grp, idx) => (
                    <article key={idx} style={facultyStyles.card}>
                      <h4
                        style={{ ...facultyStyles.title, ...clickable }}
                        onClick={() =>
                          openModal({
                            title: grp.title,
                            description: grp.description,
                            priceLabel: grp.priceLabel,
                            intake: grp.intake,
                          })
                        }
                        title={
                          locale === "en"
                            ? "Click to see department details"
                            : "Klik untuk lihat detail jurusan"
                        }
                      >
                        {grp.title}
                      </h4>

                      {(grp.programs || []).length ? (
                        <ul style={progListStyles.ul}>
                          {(grp.programs || []).map((it, i) => {
                            const title =
                              typeof it === "string" ? it : it.title;
                            const description =
                              typeof it === "string" ? "" : it.description;
                            const priceLabel =
                              typeof it === "string" ? "" : it.priceLabel;
                            const intake =
                              typeof it === "string" ? "" : it.intake || "";
                            return (
                              <li key={i} style={progListStyles.li}>
                                <span
                                  aria-hidden="true"
                                  style={progListStyles.dot}
                                />
                                <span
                                  style={{
                                    ...clickable,
                                    ...progListStyles.text,
                                  }}
                                  onClick={() =>
                                    openModal({
                                      title,
                                      description,
                                      priceLabel,
                                      intake,
                                    })
                                  }
                                  title={
                                    locale === "en"
                                      ? "Click to see program details"
                                      : "Klik untuk lihat detail program"
                                  }
                                >
                                  {title}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <ul style={facultyStyles.ul}>
                          <li style={{ opacity: 0.6, listStyle: "none" }}>
                            {locale === "en"
                              ? "No programs listed."
                              : "Belum ada program."}
                          </li>
                        </ul>
                      )}
                    </article>
                  ))
                ) : (
                  <article style={facultyStyles.card}>
                    <h4 style={facultyStyles.title}>
                      {locale === "en" ? "Departments" : "Jurusan"}
                    </h4>
                    <ul style={facultyStyles.ul}>
                      <li style={{ opacity: 0.6, listStyle: "none" }}>
                        {locale === "en"
                          ? "No departments found."
                          : "Belum ada jurusan."}
                      </li>
                    </ul>
                  </article>
                )}
              </div>
            </section>

            <section
              id="syarat"
              style={{ ...layout.content, marginTop: 22, marginLeft: -22 }}
            >
              <h2 style={layout.h2}>
                {locale === "en" ? "Requirements" : "Persyaratan"}
              </h2>
              <hr style={layout.hr} />
              <ul style={reqStyles.list}>
                {requirements.length ? (
                  requirements.map((r, i) => (
                    <li key={i} style={reqStyles.item}>
                      <span style={reqStyles.check}>
                        <svg
                          viewBox="0 0 24 24"
                          width="18"
                          height="18"
                          fill="none"
                          stroke="#fff"
                          strokeWidth="3"
                        >
                          <path d="m4 12 4 4 12-12" />
                        </svg>
                      </span>
                      <span style={{ fontWeight: 700, color: "#0B2F74" }}>
                        {r}
                      </span>
                    </li>
                  ))
                ) : (
                  <li style={{ ...reqStyles.item, opacity: 0.6 }}>
                    <span style={{ fontWeight: 700, color: "#0B2F74" }}>
                      {locale === "en"
                        ? "No requirements listed."
                        : "Belum ada persyaratan."}
                    </span>
                  </li>
                )}
              </ul>
            </section>
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section style={ctaStyles.wrapBleed}>
        <div style={ctaStyles.topFeather} aria-hidden="true" />
        <div className="cd-cta" style={ctaStyles.inner}>
          <div>
            <h3 style={ctaStyles.headline}>{ctaHeadline}</h3>
            <Link
              href={ctaHref}
              className="cd-cta-btn"
              style={ctaStyles.btn}
              aria-label={
                locale === "en" ? "Open calculator" : "Buka kalkulator"
              }
            >
              CLICK HERE
            </Link>
          </div>
          <div className="cd-cta-illo" style={ctaStyles.illobox}>
            <Image
              src={ctaImgSrc}
              alt={locale === "en" ? "Mascot illustration" : "Ilustrasi maskot"}
              fill
              sizes="480px"
              style={{ objectFit: "contain" }}
              priority
              unoptimized={shouldUnoptimize(ctaImgSrc)}
            />
          </div>
        </div>
      </section>

      {/* ===== MODAL ===== */}
      {modalOpen && (
        <div
          className="cd-modal-backdrop"
          onClick={(e) => {
            if (e.target.classList?.contains("cd-modal-backdrop"))
              setModalOpen(false);
          }}
        >
          <div className="cd-modal" role="dialog" aria-modal="true">
            <div className="cd-modal__head">
              <h3 className="cd-modal__title">
                {modalData.title || (locale === "en" ? "Detail" : "Detail")}
              </h3>
              <button
                className="cd-modal__close"
                onClick={() => setModalOpen(false)}
                aria-label={locale === "en" ? "Close" : "Tutup"}
              >
                ×
              </button>
            </div>

            <div className="cd-modal__body">
              <div className="cd-modal__row">
                <div className="cd-modal__label">
                  {locale === "en" ? "Name" : "Nama"}
                </div>
                <div className="cd-modal__value">{modalData.title || "—"}</div>
              </div>

              <div className="cd-modal__row" style={{ alignItems: "start" }}>
                <div className="cd-modal__label">
                  {locale === "en" ? "Description" : "Deskripsi"}
                </div>
                <div
                  className="cd-modal__value"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(
                      modalData.description ||
                        (locale === "en"
                          ? "<em>No description.</em>"
                          : "<em>Tidak ada deskripsi.</em>")
                    ),
                  }}
                />
              </div>

              <div className="cd-modal__row">
                <div className="cd-modal__label">
                  {locale === "en" ? "Price" : "Harga"}
                </div>
                <div className="cd-modal__value">
                  {modalData.priceLabel || "—"}
                </div>
              </div>

              <div className="cd-modal__row">
                <div className="cd-modal__label">Intake</div>
                <div className="cd-modal__value">
                  {modalData.intakeLabel || "—"}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==== GLOBAL CSS (single style jsx global) ==== */}
      <style jsx global>{`
        ${heroStyles.media}
        ${layout.media}
        ${leftNavCSS}
        ${facultyStyles.media}
        ${ctaStyles.media}
        ${globalCSS}
        ${modalCSS}
        ${hideAsideCSS}
      `}</style>
    </main>
  );
}
