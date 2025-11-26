"use client";

import { useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import useMitraDalamNegeriViewModel from "./useMitraDalamNegeriViewModel";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, FreeMode } from "swiper/modules";
import "swiper/css";

const MERCH_SWIPER_CLASS = "mdn-merchant-swiper"; // LUAR NEGERI
const ORG_SWIPER_CLASS = "mdn-org-swiper"; // DALAM NEGERI

/* ===== Client locale helper (konsisten dengan EventsUContent) ===== */
const pickLocaleClient = (lang, ls, fallback = "id") => {
  const v = String(lang || ls || fallback)
    .slice(0, 2)
    .toLowerCase();
  return v === "en" ? "en" : "id";
};

/* ===== Reveal on Scroll (reusable) ===== */
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

/* ===== Hero Parallax (halus, desktop only) ===== */
function useHeroParallax(ref) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const el = ref.current;
    if (!el) return;

    const prefersReduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const isDesktop = () => window.innerWidth >= 992;
    if (prefersReduce || !isDesktop()) return;

    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const cx = (e.clientX - r.left) / r.width - 0.5;
      const cy = (e.clientY - r.top) / r.height - 0.5;
      el.style.backgroundPosition = `calc(50% + ${cx * 10}px) calc(20% + ${
        cy * 10
      }px)`;
    };
    const onLeave = () => {
      el.style.backgroundPosition = "center 20%";
    };
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [ref]);
}

export default function MitraDalamNegeriContent({
  initialLocale = "id",
  locale: localeProp, // optional override kalau mau
}) {
  const search = useSearchParams();

  // baseLocale = seed dari server (initialLocale) atau prop override
  const baseLocale = localeProp || initialLocale || "id";

  // Locale final: prioritas ?lang= → localStorage → baseLocale
  const locale = useMemo(() => {
    const fromQuery = search?.get("lang") || "";
    const fromLs =
      typeof window !== "undefined"
        ? window.localStorage.getItem("oss.lang") || ""
        : "";
    return pickLocaleClient(fromQuery || baseLocale, fromLs);
  }, [search, baseLocale]);

  // Persist locale ke localStorage supaya konsisten di halaman lain
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("oss.lang", locale);
      } catch {
        // ignore
      }
    }
  }, [locale]);

  const vm = useMitraDalamNegeriViewModel({ locale });

  const cta =
    locale === "en"
      ? { title: "Ready to Grow Faster?", primary: "Partner With Us" }
      : {
          title: "Siap Tumbuh Lebih Cepat?",
          primary: "Saatnya Berpartner Dengan Kami",
        };

  const heroRef = useRef(null);

  // Fallback hero title dibuat lebih kaya keyword untuk SEO
  const heroTitle =
    vm.hero?.title ||
    (locale === "en"
      ? "Domestic Partners Who Collaborate with OSS Bali"
      : "Mitra Dalam Negeri yang Berkolaborasi dengan OSS Bali");

  useRevealOnScroll([vm.merchants.length, vm.organizations.length]);
  useHeroParallax(heroRef);

  const styles = useMemo(
    () => ({
      sectionInner: {
        width: "min(1360px, 96%)",
        margin: "0 auto",
        fontFamily: vm.font,
      },
      hero: {
        section: {
          marginTop: "calc(-1 * clamp(48px, 8vw, 84px))",
          background: "#fff",
        },
        bleed: { width: "100vw", marginLeft: "calc(50% - 50vw)" },
        frame: {
          position: "relative",
          width: "100vw",
          height: "var(--hero-h, 72vh)",
          overflow: "hidden",
          backgroundImage: `url(${vm.hero.bg})`,
          backgroundSize: "cover",
          backgroundPosition: "center 20%",
          backgroundRepeat: "no-repeat",
          willChange: "background-position",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          padding: "0 clamp(16px, 4vw, 40px) clamp(32px, 5vw, 56px)",
          boxSizing: "border-box",
        },
        overlayTop: {
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0) 55%)",
          pointerEvents: "none",
          zIndex: 0,
        },
        content: {
          position: "relative",
          zIndex: 1,
          width: "min(1180px, 100%)",
          display: "flex",
          justifyContent: "center",
        },
        title: {
          margin: 0,
          fontFamily: vm.font,
          textTransform: "uppercase",
          fontWeight: 900,
          letterSpacing: "0.08em",
          fontSize: "clamp(28px, 4.4vw, 48px)",
          color: "#ffffff",
          textAlign: "center",
          lineHeight: 1.05,
          paddingInline: "clamp(16px, 4vw, 32px)",
          textShadow: "0 2px 4px rgba(0,0,0,0.6), 0 8px 24px rgba(0,0,0,0.8)", // biar kebaca di atas bg
        },
      },

      copy: {
        section: { padding: "48px 0 12px", background: "#fff" },
        title: {
          textAlign: "center",
          color: "#0B56C9",
          textTransform: "uppercase",
          fontWeight: 800,
          letterSpacing: ".06em",
          fontSize: "clamp(22px, 4vw, 40px)",
          lineHeight: 1.15,
          margin: "0 0 12px",
        },
      },

      /* ====== LUAR NEGERI (square card) ====== */
      merchant: {
        wrap: {
          width: "100vw",
          marginLeft: "calc(50% - 50vw)",
          marginRight: "calc(50% - 50vw)",
          padding: "10px 0 26px",
          background: "#fff",
        },
        slide: { width: "var(--merchant-card-size, 300px)" },
        card: {
          width: "var(--merchant-card-size, 300px)",
          height: "var(--merchant-card-size, 300px)",
          aspectRatio: "1 / 1",
          background: "#FFFFFF",
          border: "1px solid rgba(14,30,62,.06)",
          borderRadius: 22,
          boxShadow:
            "0 2px 4px rgba(15,23,42,.06), 0 8px 16px rgba(15,23,42,.10), 0 20px 40px rgba(15,23,42,.12)",
          display: "grid",
          placeItems: "center",
          overflow: "hidden",
          transition: "box-shadow .22s ease, transform .22s ease",
          marginTop: "50px",
          willChange: "transform",
        },
        logo: {
          maxWidth: "86%",
          maxHeight: "86%",
          width: "auto",
          height: "auto",
          objectFit: "contain",
          display: "block",
        },
        empty: {
          padding: 20,
          color: "#64748b",
          textAlign: "center",
          fontWeight: 600,
        },
      },

      /* ====== DALAM NEGERI (square card) ====== */
      organization: {
        wrap: {
          width: "100vw",
          marginLeft: "calc(50% - 50vw)",
          marginRight: "calc(50% - 50vw)",
          padding: "10px 0 26px",
          background: "#fff",
        },
        slide: { width: "var(--org-card-size, 300px)" },
        card: {
          width: "var(--org-card-size, 300px)",
          height: "var(--org-card-size, 300px)",
          aspectRatio: "1 / 1",
          background: "#FFFFFF",
          border: "1px solid rgba(14,30,62,.06)",
          borderRadius: 22,
          boxShadow:
            "0 2px 4px rgba(15,23,42,.06), 0 8px 16px rgba(15,23,42,.10), 0 20px 40px rgba(15,23,42,.12)",
          display: "grid",
          placeItems: "center",
          overflow: "hidden",
          transition: "box-shadow .22s ease, transform .22s ease",
          marginTop: "50px",
          willChange: "transform",
        },
        logo: {
          maxWidth: "86%",
          maxHeight: "86%",
          width: "auto",
          height: "auto",
          objectFit: "contain",
          display: "block",
        },
        empty: {
          padding: 20,
          color: "#64748b",
          textAlign: "center",
          fontWeight: 600,
        },
      },

      cta: {
        section: {
          width: "100vw",
          marginLeft: "calc(50% - 50vw)",
          marginRight: "calc(50% - 50vw)",
          padding: "clamp(34px, 8vw, 96px) 0",
          background: "#fff",
        },
        container: {
          width: "min(1360px, 96%)",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "1.2fr .8fr",
          alignItems: "center",
          gap: "clamp(16px, 4vw, 48px)",
        },
        left: {
          display: "flex",
          flexDirection: "column",
          gap: "clamp(16px, 2.4vw, 22px)",
          alignItems: "flex-start",
        },
        title: {
          margin: 0,
          color: "#0B56C9",
          fontWeight: 900,
          letterSpacing: "0.01em",
          fontSize: "clamp(26px, 4.6vw, 48px)",
          lineHeight: 1.15,
        },
        btn: {
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          padding: "16px 28px",
          borderRadius: 12,
          background: "#0B56C9",
          color: "#fff",
          fontWeight: 800,
          fontSize: "clamp(14px, 2.2vw, 18px)",
          letterSpacing: "0.01em",
          textDecoration: "none",
          boxShadow: "0 12px 24px rgba(11,86,201,.28)",
          transition: "transform .16s ease, box-shadow .16s ease",
          width: "fit-content",
          maxWidth: "min(92vw, 420px)",
          whiteSpace: "nowrap",
          alignSelf: "flex-start",
          boxSizing: "border-box",
        },
        rightImgWrap: { display: "flex", justifyContent: "center" },
        rightImg: {
          width: "min(420px, 48vw)",
          height: "auto",
          objectFit: "contain",
          filter: "drop-shadow(0 12px 24px rgba(0,0,0,.14))",
        },
      },
    }),
    [vm, locale]
  );

  return (
    <main
      className="mitra-page"
      data-shell="full"
      style={{ position: "relative", zIndex: 0, background: "#fff" }}
    >
      {/* HERO */}
      <section style={styles.hero.section}>
        <div style={styles.hero.bleed}>
          <div
            ref={heroRef}
            className="reveal"
            data-anim="zoom"
            style={{ ...styles.hero.frame, ["--rvd"]: "20ms" }}
          >
            <div style={styles.hero.overlayTop} />
            <div style={styles.hero.content}>
              <h1 style={styles.hero.title}>{heroTitle}</h1>
            </div>
          </div>
        </div>
      </section>

      {/* MITRA LUAR NEGERI */}
      <section style={styles.copy.section}>
        <div style={styles.sectionInner}>
          <h2
            className="reveal"
            data-anim="down"
            style={{ ...styles.copy.title, ["--rvd"]: "40ms" }}
          >
            {vm.sections.merchant.title ||
              (locale === "en"
                ? "International Partners"
                : "Mitra Luar Negeri")}
          </h2>
        </div>

        <div
          className="reveal"
          data-anim="up"
          style={{
            ...styles.merchant.wrap,
            "--merchant-card-size": "380px",
            ["--rvd"]: "100ms",
          }}
        >
          {vm.loading && vm.merchants.length === 0 ? (
            <div style={styles.merchant.empty}>Memuat mitra…</div>
          ) : vm.merchants.length === 0 ? (
            <div style={styles.merchant.empty}>Belum ada mitra disetujui</div>
          ) : (
            <Swiper
              className={MERCH_SWIPER_CLASS}
              modules={[Autoplay, FreeMode]}
              slidesPerView="auto"
              spaceBetween={24}
              loop
              speed={6500}
              allowTouchMove={false}
              autoplay={{ delay: 0, disableOnInteraction: false }}
              freeMode={{ enabled: true, momentum: false, sticky: false }}
            >
              {vm.merchants.map((m, i) => (
                <SwiperSlide key={m.id} style={styles.merchant.slide}>
                  <div
                    className="merchant-card reveal"
                    data-anim="zoom"
                    style={{
                      ...styles.merchant.card,
                      ["--rvd"]: `${(i % 6) * 70 + 80}ms`,
                    }}
                    title={m.name}
                  >
                    <img
                      src={m.logo}
                      alt={m.name}
                      title={m.name}
                      style={styles.merchant.logo}
                      onError={(e) => (e.currentTarget.src = "/noimage.svg")}
                    />
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          )}
        </div>
      </section>

      {/* MITRA DALAM NEGERI */}
      <section style={styles.copy.section}>
        <div style={styles.sectionInner}>
          <h2
            className="reveal"
            data-anim="down"
            style={{ ...styles.copy.title, ["--rvd"]: "40ms" }}
          >
            {vm.sections.organization.title ||
              (locale === "en" ? "Domestic Partners" : "Mitra Dalam Negeri")}
          </h2>
        </div>

        <div
          className="reveal"
          data-anim="up"
          style={{
            ...styles.organization.wrap,
            "--org-card-size": "380px",
            ["--rvd"]: "100ms",
          }}
        >
          {vm.loading && vm.organizations.length === 0 ? (
            <div style={styles.organization.empty}>Memuat mitra…</div>
          ) : vm.organizations.length === 0 ? (
            <div style={styles.organization.empty}>
              Belum ada mitra disetujui
            </div>
          ) : (
            <Swiper
              className={ORG_SWIPER_CLASS}
              modules={[Autoplay, FreeMode]}
              slidesPerView="auto"
              spaceBetween={24}
              loop
              speed={6500}
              allowTouchMove={false}
              autoplay={{
                delay: 0,
                disableOnInteraction: false,
                reverseDirection: true,
              }}
              freeMode={{ enabled: true, momentum: false, sticky: false }}
            >
              {vm.organizations.map((o, i) => (
                <SwiperSlide key={o.id} style={styles.organization.slide}>
                  <div
                    className="org-card reveal"
                    data-anim="zoom"
                    style={{
                      ...styles.organization.card,
                      ["--rvd"]: `${(i % 6) * 70 + 80}ms`,
                    }}
                    title={o.name}
                  >
                    <img
                      src={o.logo}
                      alt={o.name}
                      title={o.name}
                      style={styles.organization.logo}
                      onError={(e) => (e.currentTarget.src = "/noimage.svg")}
                    />
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          )}
        </div>
      </section>

      {/* CTA */}
      <section style={styles.cta.section}>
        <div className="reveal" data-anim="zoom" style={styles.cta.container}>
          <div style={styles.cta.left}>
            <h2
              className="reveal"
              data-anim="down"
              style={{ ...styles.cta.title, ["--rvd"]: "40ms" }}
            >
              {cta.title}
            </h2>
            <Link
              href="/user/form-mitra"
              className="cta-btn hero-cta--pulse hero-cta--bob reveal"
              data-anim="up"
              aria-label={cta.primary}
              style={{ ...styles.cta.btn, ["--rvd"]: "140ms" }}
            >
              {cta.primary}
            </Link>
          </div>
          <div
            className="reveal"
            data-anim="right"
            style={{ ...styles.cta.rightImgWrap, ["--rvd"]: "160ms" }}
          >
            <img
              src="/oss-bird.svg"
              onError={(e) => (e.currentTarget.src = "/jempol.svg")}
              alt="OSS Mascot"
              style={styles.cta.rightImg}
            />
          </div>
        </div>
      </section>

      <style jsx global>{`
        /* Default (tablet & mobile): hero adaptif */
        :root {
          --nav-h: clamp(60px, 7vw, 84px);
          --hero-h: min(max(520px, calc(100svh - var(--nav-h))), 780px);
        }

        /* Desktop: paksa minimal 1 layar penuh */
        @media (min-width: 1024px) {
          :root {
            --hero-h: 100svh;
          }
        }

        @media (max-width: 640px) {
          :root {
            --hero-h: min(max(380px, calc(100svh - var(--nav-h))), 560px);
          }
        }

        /* ===== Reveal utilities ===== */
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

        /* Micro-motions untuk CTA */
        @keyframes y-bob {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-3px);
          }
        }
        .hero-cta--bob {
          animation: y-bob 3s ease-in-out infinite;
        }
        @keyframes pulse-soft {
          0%,
          100% {
            box-shadow: 0 12px 24px rgba(11, 86, 201, 0.28);
          }
          50% {
            box-shadow: 0 16px 32px rgba(11, 86, 201, 0.36);
          }
        }
        .hero-cta--pulse {
          animation: pulse-soft 2.8s ease-in-out infinite;
        }

        /* Swiper utility */
        .${MERCH_SWIPER_CLASS}, .${ORG_SWIPER_CLASS} {
          overflow: visible;
          padding-inline: clamp(12px, 4vw, 24px);
        }
        .${MERCH_SWIPER_CLASS} .swiper-wrapper,
        .${ORG_SWIPER_CLASS} .swiper-wrapper {
          align-items: stretch;
        }
        .${MERCH_SWIPER_CLASS} .swiper-slide,
        .${ORG_SWIPER_CLASS} .swiper-slide {
          height: auto;
          display: flex;
          align-items: stretch;
        }
        .${MERCH_SWIPER_CLASS} .merchant-card:hover,
        .${ORG_SWIPER_CLASS} .org-card:hover {
          box-shadow: 0 8px 20px rgba(15, 23, 42, 0.14),
            0 18px 44px rgba(15, 23, 42, 0.22), 0 0 0 1px rgba(14, 30, 62, 0.08);
          transform: translateY(-4px);
        }

        /* CTA layout collapse ke 1 kolom saat tablet/mobile */
        @media (max-width: 1024px) {
          section[style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
            text-align: center;
          }
          .cta-btn {
            align-self: center !important;
          }
        }

        /* Guard agar tombol tidak melebar penuh */
        .cta-btn {
          width: max-content !important;
          white-space: nowrap;
        }
        @media (max-width: 1024px) {
          .cta-btn {
            width: auto !important;
          }
        }

        .cta-btn:focus-visible {
          outline: 3px solid #5aa8ff;
          outline-offset: 3px;
          border-radius: 12px;
        }
        @media (hover: hover) {
          .cta-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 14px 28px rgba(11, 86, 201, 0.36);
          }
        }

        /* Anti horizontal scroll: hanya di halaman ini */
        .mitra-page {
          overflow-x: hidden;
        }
        @supports (overflow: clip) {
          .mitra-page {
            overflow-x: clip;
          }
        }
      `}</style>
    </main>
  );
}
