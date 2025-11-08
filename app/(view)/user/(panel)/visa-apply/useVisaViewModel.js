"use client";

import { useEffect, useState } from "react";

/* ===== Copywriting sesuai desain Benefit ===== */
const TEXT = {
  id: {
    hero: {
      title: "Visa Apply",
      subtitle:
        "Kami menyediakan solusi komprehensif untuk pengurusan visa, memfasilitasi perjalanan Anda ke hampir semua destinasi global dengan proses yang efisien dan mudah.",
      illustration: "/visa.svg",
    },
    description:
      "Jangan ambil risiko dengan dokumen penting. OSS Bali memberikan dukungan personal dan menyeluruh untuk semua jenis visa (studi, kerja, pasangan), sehingga Anda bisa fokus pada persiapan keberangkatan, studi, dan karier. Kami bantu dari pengecekan dokumen, pengisian formulir, penjadwalan, hingga pelacakan status pengajuan.",
    poster: { src: "/poster-apply.svg", alt: "Visa Anda, Prioritas Kami" },
    benefits: [
      {
        id: "b1",
        title: "Kemudahan Proses",
        desc: "Eksplorasi berbagai destinasi studi luar negeri dengan menyenangkan.",
        icon: "/step1.svg",
      },
      {
        id: "b2",
        title: "Fasilitas Cakupan Visa Luas",
        desc: "Fasilitas dukungan visa global untuk lebih dari 150 negara.",
        icon: "/step2.svg",
      },
      {
        id: "b3",
        title: "Biaya Efisien",
        desc: "Biaya proses visa yang efisien dan transparan.",
        icon: "/step3.svg",
      },
    ],
    cta: {
      title: "SIAPKAN LANGKAH GLOBAL DENGAN PENGURUSAN VISA TERPERCAYA",
      subtitle:
        "Dengan layanan Visa Apply dari OSS Bali, setiap detail dokumen ditangani secara tepat agar perjalanan studi atau karier internasional Anda berjalan lancar.",
      button: { label: "COBA SEKARANG", href: "/user/leads" },
    },
  },
  en: {
    hero: {
      title: "Visa Apply",
      subtitle:
        "We provide a comprehensive solution for visa processing, enabling your journey to almost any global destination with an efficient and simple process.",
      illustration: "/visa.svg",
    },
    description:
      "Don’t risk your important documents. OSS Bali offers personal, end-to-end support for all visa types (study, work, partner) so you can focus on preparation, study, and career. We help with document checks, form filling, scheduling, and tracking.",
    poster: { src: "/poster-apply.svg", alt: "Your Visa, Our Priority" },
    benefits: [
      {
        id: "b1",
        title: "Easy Process",
        desc: "Explore study destinations abroad with ease.",
        icon: "/step1.svg",
      },
      {
        id: "b2",
        title: "Wide Visa Coverage",
        desc: "Global visa support for 150+ countries.",
        icon: "/step2.svg",
      },
      {
        id: "b3",
        title: "Cost-Efficient",
        desc: "Efficient and transparent processing fees.",
        icon: "/step3.svg",
      },
    ],
    cta: {
      title: "TAKE YOUR GLOBAL STEP WITH A TRUSTED VISA SERVICE",
      subtitle:
        "With OSS Bali’s Visa Apply, every document detail is handled properly so your study or international career journey runs smoothly.",
      button: { label: "TRY NOW", href: "/user/leads" },
    },
  },
};

const pickLocale = (v) =>
  String(v || "id")
    .slice(0, 2)
    .toLowerCase() === "en"
    ? "en"
    : "id";

/** ViewModel */
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
    }, 200);
    return () => clearTimeout(t);
  }, [locale]);

  return { content, isLoading, locale: pickLocale(locale) };
}
