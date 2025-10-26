"use client";

import { useEffect, useMemo, useState } from "react";

function normLang(v) {
  return String(v || "id")
    .slice(0, 2)
    .toLowerCase() === "en"
    ? "en"
    : "id";
}

export default function useFooterUViewModel(opts = {}) {
  // 1) Seed dari server (props) agar SSR dan initial client SAMA persis.
  //    Jika tidak dikirim, default "id" aman (tidak munculin hydration error).
  const [lang, setLang] = useState(() => normLang(opts.initialLang));

  // 2) Setelah mount di client, barulah deteksi bahasa aktual.
  useEffect(() => {
    try {
      const urlLang =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("lang")
          : null;
      const stored =
        typeof window !== "undefined"
          ? window.localStorage.getItem("oss.lang")
          : null;
      const navLang =
        typeof navigator !== "undefined" ? navigator.language : null;

      const detected = normLang(urlLang || stored || navLang);
      setLang((prev) => {
        if (detected !== prev) {
          if (typeof window !== "undefined") {
            window.localStorage.setItem("oss.lang", detected);
          }
          return detected;
        }
        return prev;
      });
    } catch {
      // no-op
    }
    // sengaja dependency kosong agar hanya jalan sekali saat mount
  }, []);

  // Helper translate
  const t = (id, en) => (lang === "en" ? en : id);

  // Append ?lang= ke setiap link (jaga #hash)
  const withLang = useMemo(() => {
    return (path) => {
      if (!path) return path;
      const [base, hash] = String(path).split("#");
      const joiner = base.includes("?") ? "&" : "?";
      return `${base}${joiner}lang=${lang}${hash ? `#${hash}` : ""}`;
    };
  }, [lang]);

  // --- data dasar
  const logo = useMemo(
    () => ({
      src: "/images/loading.png",
      alt: "OSS Bali",
    }),
    []
  );

  const contacts = useMemo(
    () => [
      { icon: "location", text: "Hayam Wuruk 66 B, lt 2 Denpasar" },
      { icon: "phone", text: "+62 877 0509 2020" },
      { icon: "email", text: "onestepsolution@gmail.com" },
    ],
    []
  );

  // --- NAV sections (title tergantung lang)
  const navSections = useMemo(
    () => [
      {
        title: lang === "en" ? "Services" : "Layanan",
        links: [
          {
            label: "Study Abroad",
            href: withLang("/user/services#study-abroad"),
          },
          {
            label: "Work Abroad",
            href: withLang("/user/services#work-abroad"),
          },
          { label: "Language Course", href: withLang("/user/english-course") },
          { label: "Visa Consultant", href: withLang("/user/visa-apply") },
        ],
      },
      {
        title: lang === "en" ? "Visa Information" : "Informasi Visa",
        links: [
          { label: "Student Visa", href: withLang("/user/visa#student") },
          { label: "Visitor/Tourist", href: withLang("/user/visa#visitor") },
          { label: "Visa Extension", href: withLang("/user/visa#extension") },
          { label: "Scholarship", href: withLang("/user/visa#scholarship") },
        ],
      },
      {
        title: lang === "en" ? "Support" : "Dukungan",
        links: [
          {
            label: "Career With US",
            href: withLang("/user/career?menu=career"),
          },
          { label: "Accommodation", href: withLang("/user/accommodation") },
          { label: "FAQ", href: withLang("/user/faq") },
          { label: "Review", href: withLang("/user/reviews") },
          { label: "Calculator", href: withLang("/user/calculator") },
        ],
      },
    ],
    [lang, withLang]
  );

  const socials = useMemo(() => {
    const whatsappNumber = "6287705092020";
    return [
      { icon: "instagram", href: "#", ariaLabel: "Instagram" }, // TODO: ganti
      {
        icon: "whatsapp",
        href: `https://wa.me/${whatsappNumber}`,
        ariaLabel: "WhatsApp",
      },
      { icon: "youtube", href: "#", ariaLabel: "YouTube" }, // TODO: ganti
    ];
  }, []);

  const copyright = useMemo(
    () =>
      "\u00A9 " + new Date().getFullYear() + " OSS Bali. All Rights Reserved.",
    []
  );

  return { lang, logo, contacts, navSections, socials, copyright, withLang, t };
}
