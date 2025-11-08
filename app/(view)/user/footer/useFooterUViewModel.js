"use client";
import { useMemo } from "react";

function normLang(v) {
  return String(v || "id")
    .slice(0, 2)
    .toLowerCase() === "en"
    ? "en"
    : "id";
}

export default function useFooterUViewModel(opts = {}) {
  const lang = normLang(opts.initialLang);
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
        text: "Jalan Hayam Wuruk No 66B Lantai 2, Sumerta Kelod,\nDenpasar Timur, Kota Denpasar, Bali, Indonesia, 80239",
      },
      { icon: "phone", text: "+62 877 0509 2020" },
      { icon: "email", text: "info@onestepsolutionbali.com" },
    ],
    []
  );

  const navSections = useMemo(
    () => [
      {
        title: t("Kampus", "Campus"),
        links: [
          { label: "Student Visa", href: withLang("/user/visa#student") },
          { label: "Visitor/Tourist", href: withLang("/user/visa#visitor") },
          { label: "Visa Extention", href: withLang("/user/visa#extension") },
          { label: "Scholarship", href: withLang("/user/visa#scholarship") },
        ],
      },
      {
        title: t("Layanan", "Services"),
        links: [
          { label: "Overseas Study", href: withLang("/user/overseas-study") },
          { label: "Visa Apply", href: withLang("/user/visa-apply") },
          { label: "English Course", href: withLang("/user/english-course") },
          {
            label: t("Akomodasi", "Accommodation"),
            href: withLang("/user/accommodation"),
          },
        ],
      },
      {
        title: t("Dukungan", "Support"),
        links: [
          {
            label: t("Career With US", "Career With US"),
            href: withLang("/user/career?menu=career"),
          },
          { label: "Event", href: withLang("/user/event") },
          { label: "Mitra", href: withLang("/user/partners") },
          { label: "Calculator", href: withLang("/user/calculator") },
        ],
      },
    ],
    [t, withLang]
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

  const copyright = useMemo(
    () => "© " + new Date().getFullYear() + " OSS Bali. All Rights Reserved.",
    []
  );

  return { lang, logo, contacts, navSections, socials, copyright, withLang, t };
}
