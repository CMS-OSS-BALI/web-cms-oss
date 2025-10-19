"use client";

import { useEffect, useState } from "react";

/* ===================== i18n ===================== */
const TEXT = {
  id: {
    hero: {
      title: "VISA APPLY",
      subtitle:
        "Permudah perjalanan Anda ke luar negeri dengan layanan Visa Apply yang cepat dan terpercaya.",
      illustration: "/visa.svg",
    },
    description:
      "Overseas Study adalah layanan pendampingan bagi mereka yang ingin melanjutkan studi dan mengembangkan karier di luar negeri. Kami membantu mulai dari pemilihan universitas, pengurusan dokumen, persiapan bahasa, hingga konsultasi karier internasional. Dengan dukungan mentor berpengalaman dan jaringan global, Overseas Study menjadi jembatan untuk meraih impian, memperluas wawasan, serta membangun masa depan yang lebih cerah di kancah internasional.",
    poster: { src: "/poster-apply.svg", alt: "Visa Anda, Prioritas Kami" },
    benefits: [
      {
        id: "b1",
        title: "Kemudahan Proses",
        desc: "Eksplorasi berbagai destinasi studi luar negeri.",
        icon: "/step1.svg",
      },
      {
        id: "b2",
        title: "Pengalaman Apply Terjamin",
        desc: "Bangun koneksi global dengan institusi.",
        icon: "/step2.svg",
      },
      {
        id: "b3",
        title: "Biaya Terjangkau",
        desc: "Rancang jalur studi & kariermu dengan efisien.",
        icon: "/step3.svg",
      },
    ],
    /* === CTA content: disamakan dengan desain === */
    cta: {
      title: "SIAPKAN LANGKAH GLOBAL DENGAN PENGURUSAN VISA TERPERCAYA",
      subtitle:
        "Dengan Layanan Visa Terpercaya, Kami Memastikan Setiap Dokumen Dan Proses Anda Ditangani Tepat Agar Perjalanan Studi Atau Karier Internasional Berjalan Lancar.",
      button: { label: "COBA SEKARANG", href: "/user/leads" },
    },
  },
  en: {
    hero: {
      title: "VISA APPLY",
      subtitle:
        "Make your overseas journey easier with our fast and reliable Visa Apply service.",
      illustration: "/visa.svg",
    },
    description:
      "Overseas Study is a tailored assistance service for those who wish to pursue education and develop a career abroad. We help with university selection, document processing, language preparation, and international career consulting. With experienced mentors and a global network, we bridge your ambitions to a brighter future on the international stage.",
    poster: { src: "/poster-apply.svg", alt: "Your Visa, Our Priority" },
    benefits: [
      {
        id: "b1",
        title: "Smooth Process",
        desc: "Explore a wide range of study destinations abroad.",
        icon: "/step1.svg",
      },
      {
        id: "b2",
        title: "Proven Apply Experience",
        desc: "Build global connections with institutions.",
        icon: "/step2.svg",
      },
      {
        id: "b3",
        title: "Cost-Effective",
        desc: "Shape your study & career path efficiently.",
        icon: "/step3.svg",
      },
    ],
    cta: {
      title: "TAKE YOUR GLOBAL STEP WITH A TRUSTED VISA SERVICE",
      subtitle:
        "With our trusted visa service, every document and process is handled properly so your study or international career journey runs smoothly.",
      button: { label: "TRY NOW", href: "/user/leads" },
    },
  },
};

function pickLocale(locale) {
  const key = String(locale || "id")
    .slice(0, 2)
    .toLowerCase();
  return key === "en" ? "en" : "id";
}

/** ViewModel for Visa Apply page */
export default function useVisaViewModel({ locale = "id" } = {}) {
  const [isLoading, setIsLoading] = useState(true);
  const [content, setContent] = useState({
    hero: {},
    description: "",
    poster: {},
    benefits: [],
    cta: {},
  });

  useEffect(() => {
    const t = setTimeout(() => {
      const lk = pickLocale(locale);
      setContent(TEXT[lk]);
      setIsLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, [locale]);

  return {
    content,
    isLoading,
    locale: pickLocale(locale),
  };
}
