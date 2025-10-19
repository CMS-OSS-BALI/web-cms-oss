"use client";

import { useMemo } from "react";
import Link from "next/link";
import useMitraDalamNegeriViewModel from "./useMitraDalamNegeriViewModel";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, FreeMode } from "swiper/modules";
import "swiper/css";

const MERCH_SWIPER_CLASS = "mdn-merchant-swiper";
const ORG_SWIPER_CLASS = "mdn-org-swiper";

export default function MitraDalamNegeriContent({ locale = "id" }) {
  const vm = useMitraDalamNegeriViewModel({ locale });

  const cta =
    locale === "en"
      ? {
          title: "COLLABORATE WITH US",
          outline: "JOIN NOW & ENJOY THE BENEFITS",
          primary: "JOIN HERE",
        }
      : {
          title: "BERKOLABORASI DENGAN KAMI",
          outline: "GABUNG SEKARANG JUGA & RASAKAN MANFAAT",
          primary: "GABUNG DISINI",
        };

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
          height: "100svh",
          overflow: "hidden",
          borderRadius: 0,
          boxShadow: "0 24px 48px rgba(15,23,42,.08)",
          backgroundImage: `url(${vm.hero.bg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        },
        overlayTop: {
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(10,56,72,.18) 0%, rgba(10,56,72,0) 45%, rgba(255,255,255,0) 65%, rgba(255,255,255,1) 100%)",
          pointerEvents: "none",
        },
        content: {
          position: "absolute",
          left: "50%",
          top: "clamp(56px, 10vh, 96px)",
          transform: "translateX(-50%)",
          width: "min(1360px, 96%)",
          textAlign: "center",
          color: "#0A3850",
          textTransform: "uppercase",
          userSelect: "none",
        },
        title: {
          fontWeight: 800,
          letterSpacing: ".06em",
          fontSize: "clamp(32px, 6vw, 72px)",
          lineHeight: 1.05,
          margin: 0,
          textShadow: "0 8px 24px rgba(10, 56, 72, .35)",
        },
        fadeBottom: {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: -1,
          height: "18%",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0) 0%, #ffffff 80%)",
        },
      },
      copy: {
        section: { padding: "48px 0 12px" },
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
        bodyWrap: { display: "flex", justifyContent: "center" },
        body: {
          maxWidth: "min(1120px, 96%)",
          textAlign: "center",
          color: "#0B56C9",
          fontWeight: 500,
          fontSize: "clamp(14px, 1.6vw, 18px)",
          lineHeight: 1.7,
          margin: 0,
        },
      },
      spacer: { height: 36 },
      merchant: {
        wrap: {
          width: "100vw",
          marginLeft: "calc(50% - 50vw)",
          marginRight: "calc(50% - 50vw)",
          padding: "10px 0 26px",
        },
        slide: { width: "var(--merchant-card-w, 380px)" },
        card: {
          width: "var(--merchant-card-w, 380px)",
          height: "var(--merchant-card-h, 300px)",
          background: "#FFFFFF",
          border: "1px solid rgba(14,30,62,.06)",
          borderRadius: 22,
          boxShadow:
            "0 2px 4px rgba(15,23,42,.06), 0 8px 16px rgba(15,23,42,.10), 0 20px 40px rgba(15,23,42,.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          transition: "box-shadow .22s ease, transform .22s ease",
          marginTop: "50px",
          willChange: "transform",
        },
        logo: {
          maxWidth: "82%",
          maxHeight: "82%",
          width: "auto",
          height: "auto",
          objectFit: "contain",
        },
      },
      organization: {
        wrap: {
          width: "100vw",
          marginLeft: "calc(50% - 50vw)",
          marginRight: "calc(50% - 50vw)",
          padding: "10px 0 26px",
        },
        slide: { width: "var(--org-card-w, 380px)" },
        card: {
          width: "var(--org-card-w, 380px)",
          height: "var(--org-card-h, 300px)",
          background: "#FFFFFF",
          border: "1px solid rgba(14,30,62,.06)",
          borderRadius: 22,
          boxShadow:
            "0 2px 4px rgba(15,23,42,.06), 0 8px 16px rgba(15,23,42,.10), 0 20px 40px rgba(15,23,42,.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          transition: "box-shadow .22s ease, transform .22s ease",
          marginTop: "50px",
          willChange: "transform",
        },
        logo: {
          maxWidth: "82%",
          maxHeight: "82%",
          width: "auto",
          height: "auto",
          objectFit: "contain",
        },
      },
      cta: {
        section: {
          width: "100vw",
          marginLeft: "calc(50% - 50vw)",
          marginRight: "calc(50% - 50vw)",
          padding: "clamp(36px, 7vw, 80px) 0",
          background: "#fff",
        },
        container: {
          width: "min(1360px, 96%)",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "1.2fr .8fr",
          alignItems: "center",
          gap: "clamp(16px, 4vw, 40px)",
        },
        left: {
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: "clamp(12px, 2.2vw, 18px)",
        },
        title: {
          margin: 0,
          color: "#0B56C9",
          fontWeight: 900,
          letterSpacing: ".06em",
          textTransform: "uppercase",
          fontSize: "clamp(28px, 5vw, 48px)",
          lineHeight: 1.1,
        },
        outlineBtn: {
          display: "inline-block",
          padding: "18px 28px",
          borderRadius: 14,
          border: "2px solid #2C6BD9",
          color: "#0B56C9",
          fontWeight: 800,
          letterSpacing: ".04em",
          boxShadow: "0 10px 18px rgba(11,86,201,.25)",
          background: "#fff",
          textDecoration: "none",
          textTransform: "uppercase",
        },
        primaryBtn: {
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          padding: "16px 26px",
          borderRadius: 14,
          background: "#0B56C9",
          color: "#fff",
          fontWeight: 900,
          letterSpacing: ".04em",
          textDecoration: "none",
          textTransform: "uppercase",
          boxShadow: "0 14px 28px rgba(11,86,201,.32)",
          transition: "transform .18s ease, box-shadow .18s ease, opacity .18s",
        },
        rightImgWrap: {
          display: "flex",
          justifyContent: "center",
        },
        rightImg: {
          width: "min(420px, 60vw)",
          height: "auto",
          objectFit: "contain",
          filter: "drop-shadow(0 12px 24px rgba(0,0,0,.18))",
        },
      },
    }),
    [vm, locale]
  );

  return (
    <main>
      <section style={styles.hero.section}>
        <div style={styles.hero.bleed}>
          <div style={styles.hero.frame}>
            <div style={styles.hero.content}>
              <h1 style={styles.hero.title}>{vm.hero.title}</h1>
            </div>
            <div style={styles.hero.overlayTop} />
            <div style={styles.hero.fadeBottom} />
          </div>
        </div>
      </section>

      <section style={styles.copy.section}>
        <div style={styles.sectionInner}>
          <h2 style={styles.copy.title}>{vm.sections.partner.title}</h2>
          <div style={styles.copy.bodyWrap}>
            <p style={styles.copy.body}>{vm.sections.partner.body}</p>
          </div>
        </div>
      </section>

      <div style={styles.spacer} />

      <section style={styles.copy.section}>
        <div style={styles.sectionInner}>
          <h2 style={styles.copy.title}>{vm.sections.merchant.title}</h2>
        </div>

        <div
          style={{
            ...styles.merchant.wrap,
            "--merchant-card-w": "380px",
            "--merchant-card-h": "300px",
          }}
        >
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
            {vm.merchants.map((m) => (
              <SwiperSlide key={m.id} style={styles.merchant.slide}>
                <div className="merchant-card" style={styles.merchant.card}>
                  <img src={m.logo} alt={m.name} style={styles.merchant.logo} />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </section>

      <div style={styles.spacer} />

      <section style={styles.copy.section}>
        <div style={styles.sectionInner}>
          <h2 style={styles.copy.title}>{vm.sections.organization.title}</h2>
        </div>

        <div
          style={{
            ...styles.organization.wrap,
            "--org-card-w": "380px",
            "--org-card-h": "300px",
          }}
        >
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
            {vm.organizations.map((o) => (
              <SwiperSlide key={o.id} style={styles.organization.slide}>
                <div className="org-card" style={styles.organization.card}>
                  <img
                    src={o.logo}
                    alt={o.name}
                    style={styles.organization.logo}
                  />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </section>

      <div style={styles.spacer} />

      <section style={styles.cta.section}>
        <div style={styles.cta.container}>
          <div style={styles.cta.left}>
            <h2 style={styles.cta.title}>{cta.title}</h2>
            <span style={styles.cta.outlineBtn}>{cta.outline}</span>
            <Link href="/user/form-mitra" style={styles.cta.primaryBtn}>
              <span>{cta.primary}</span>
              <span>→</span>
            </Link>
          </div>
          <div style={styles.cta.rightImgWrap}>
            <img
              src="/jempol.svg"
              alt="CTA Image"
              style={styles.cta.rightImg}
            />
          </div>
        </div>
      </section>

      <style jsx global>{`
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
        @media (max-width: 1024px) {
          section[style*="padding"] > div[style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
            text-align: center;
          }
          section[style*="padding"] h2 {
            text-align: center !important;
          }
          section[style*="padding"] a,
          section[style*="padding"] span {
            align-self: center !important;
          }
        }
      `}</style>
    </main>
  );
}
