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
  // Gunakan seed dari server — tidak mengubah bahasa setelah mount,
  // sehingga tidak ada FOUC/mismatch.
  const lang = normLang(opts.initialLang);

  // Helper translate
  const t = (id, en) => (lang === "en" ? en : id);

  // Tambahkan ?lang=en hanya untuk EN; ID = tanpa query (canonical)
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
    () => ({ src: "/images/loading.png", alt: "OSS Bali" }),
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

  const navSections = useMemo(
    () => [
      {
        title: t("Layanan", "Services"),
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
        title: t("Informasi Visa", "Visa Information"),
        links: [
          { label: "Student Visa", href: withLang("/user/visa#student") },
          { label: "Visitor/Tourist", href: withLang("/user/visa#visitor") },
          { label: "Visa Extension", href: withLang("/user/visa#extension") },
          { label: "Scholarship", href: withLang("/user/visa#scholarship") },
        ],
      },
      {
        title: t("Dukungan", "Support"),
        links: [
          {
            label: t("Karier Bersama Kami", "Career With US"),
            href: withLang("/user/career?menu=career"),
          },
          { label: "Accommodation", href: withLang("/user/accommodation") },
          { label: "FAQ", href: withLang("/user/faq") },
          { label: "Review", href: withLang("/user/reviews") },
          { label: "Calculator", href: withLang("/user/calculator") },
        ],
      },
    ],
    [t, withLang]
  );

  const socials = useMemo(() => {
    const whatsappNumber = "6287705092020";
    return [
      { icon: "instagram", href: "#", ariaLabel: "Instagram" },
      {
        icon: "whatsapp",
        href: `https://wa.me/${whatsappNumber}`,
        ariaLabel: "WhatsApp",
      },
      { icon: "youtube", href: "#", ariaLabel: "YouTube" },
    ];
  }, []);

  const copyright = useMemo(
    () =>
      "\u00A9 " + new Date().getFullYear() + " OSS Bali. All Rights Reserved.",
    []
  );

  return { lang, logo, contacts, navSections, socials, copyright, withLang, t };
}
