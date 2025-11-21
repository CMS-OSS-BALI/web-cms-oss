"use client";
import { useEffect, useMemo, useState } from "react";

const LANG_COOKIE = "oss.lang";

const normalizeLang = (value, fallback = "id") => {
  const base = String(value || "")
    .trim()
    .toLowerCase();
  if (base.startsWith("en")) return "en";
  if (base.startsWith("id")) return "id";
  return fallback === "en" ? "en" : "id";
};

export default function useFooterUViewModel(opts = {}) {
  const [lang, setLang] = useState(() => normalizeLang(opts.initialLang, "id"));

  // Baca bahasa global dari <html lang>, ?lang, dan localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    const computeFromGlobal = () => {
      try {
        const url = new URL(window.location.href);
        const urlLang = url.searchParams.get("lang");
        const htmlLang = document.documentElement.getAttribute("lang");
        const lsLang = window.localStorage.getItem(LANG_COOKIE);
        return normalizeLang(urlLang || htmlLang || lsLang || opts.initialLang);
      } catch {
        return normalizeLang(opts.initialLang);
      }
    };

    // initial sync
    setLang(computeFromGlobal());

    // observe perubahan atribut lang di <html> (diubah oleh HeaderUser)
    const observer = new MutationObserver(() => {
      setLang(computeFromGlobal());
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["lang"],
    });

    return () => observer.disconnect();
  }, [opts.initialLang]);

  const t = (id, en) => (lang === "en" ? en : id);

  const withLang = useMemo(() => {
    return (path) => {
      if (!path) return path;
      const [base, hash] = String(path).split("#");

      if (lang === "en") {
        const url = new URL(base, "http://dummy.local");
        url.searchParams.set("lang", "en");
        const q = url.search ? url.search : "";
        return `${url.pathname}${q}${hash ? `#${hash}` : ""}`;
      }

      return `${base}${hash ? `#${hash}` : ""}`;
    };
  }, [lang]);

  const logo = useMemo(
    () => ({
      src: "/images/mascot-oss.svg",
      alt: "OSS Bali",
    }),
    []
  );

  const contacts = useMemo(
    () => [
      {
        icon: "location",
        text:
          "Jalan Hayam Wuruk No 66B Lantai 2, Sumerta Kelod,\n" +
          "Denpasar Timur, Kota Denpasar, Bali, Indonesia, 80239",
      },
      { icon: "phone", text: "+62 877 0509 2020" },
      { icon: "email", text: "info@onestepsolutionbali.com" },
    ],
    []
  );

  const navSections = useMemo(
    () => [
      {
        title: t("Kampus & Mitra", "Campuses & Partners"),
        links: [
          {
            label: t("Tentang OSS", "About OSS"),
            href: withLang("/user/aboutus"),
          },
          {
            label: t("Kampus", "Colleges"),
            href: withLang("/user/college"),
          },
          {
            label: t("Mitra", "Partners"),
            href: withLang("/user/mitra-dalam-negeri"),
          },
          {
            label: t("Berita & Artikel", "News & Articles"),
            href: withLang("/user/blog"),
          },
        ],
      },
      {
        title: t("Layanan", "Services"),
        links: [
          {
            label: t("Studi Luar Negeri", "Overseas Study"),
            href: withLang("/user/overseas-study"),
          },
          {
            label: t("Pengurusan Visa", "Visa Application"),
            href: withLang("/user/visa-apply"),
          },
          {
            label: t("Kursus Bahasa Inggris", "English Course"),
            href: withLang("/user/english-course"),
          },
          {
            label: t("Pemesanan Akomodasi", "Accommodation Booking"),
            href: withLang("/user/accommodation"),
          },
          {
            label: t("Penerjemahan Dokumen", "Document Translation"),
            href: withLang("/user/doc.translate"),
          },
        ],
      },
      {
        title: t("Dukungan", "Support"),
        links: [
          {
            label: t("Karier di OSS", "Career With OSS"),
            href: withLang("/user/career"),
          },
          {
            label: t("Event & Webinar", "Events & Webinars"),
            href: withLang("/user/events"),
          },
          {
            label: t("Form Mitra", "Partner Form"),
            href: withLang("/user/form-mitra"),
          },
          {
            label: t("Form Representative", "Representative Form"),
            href: withLang("/user/form-rep"),
          },
          {
            label: t("Kalkulator Biaya Studi", "Study Cost Calculator"),
            href: withLang("/user/calculator"),
          },
        ],
      },
    ],
    [withLang, lang]
  );

  const socials = useMemo(() => {
    const whatsappNumber = "6287705092020";
    return [
      {
        icon: "instagram",
        href: "https://www.instagram.com/oss_bali/",
        ariaLabel: "Instagram",
      },
      { icon: "facebook", href: "#", ariaLabel: "Facebook" },
      {
        icon: "whatsapp",
        href: `https://wa.me/${whatsappNumber}`,
        ariaLabel: "WhatsApp",
      },
      {
        icon: "tiktok",
        href: "https://www.tiktok.com/@oss_bali",
        ariaLabel: "TikTok",
      },
      {
        icon: "linkedin",
        href: "https://www.linkedin.com/in/one-step-solution-bali-7b4150238/",
        ariaLabel: "LinkedIn",
      },
      {
        icon: "youtube",
        href: "https://www.youtube.com/@onestepsolutionbali1853",
        ariaLabel: "YouTube",
      },
    ];
  }, []);

  const copyright = useMemo(() => {
    const year = new Date().getFullYear();
    return lang === "en"
      ? `© ${year} OSS Bali. All Rights Reserved.`
      : `© ${year} OSS Bali. Hak Cipta Dilindungi.`;
  }, [lang]);

  return { lang, logo, contacts, navSections, socials, copyright, withLang, t };
}
