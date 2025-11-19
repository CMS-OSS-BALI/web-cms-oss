"use client";

import { useEffect, useState } from "react";

/* ===== List card Benefit (10 item) ===== */
/* Silakan ganti path icon sesuai file di /public */
const BENEFIT_CARDS = [
  {
    key: "consultation",
    labelId: "Konsultasi Visa 1-on-1",
    labelEn: "1-on-1 Visa Consultation",
    icon: "/visa-benefit/benefit-01.svg",
  },
  {
    key: "doc-check",
    labelId: "Cek Kelengkapan Dokumen",
    labelEn: "Document Completeness Check",
    icon: "/visa-benefit/benefit-02.svg",
  },
  {
    key: "form-guidance",
    labelId: "Panduan Pengisian Formulir",
    labelEn: "Form Filling Guidance",
    icon: "/visa-benefit/benefit-03.svg",
  },
  {
    key: "timeline",
    labelId: "Strategi Jadwal & Timeline",
    labelEn: "Timeline & Scheduling Strategy",
    icon: "/visa-benefit/benefit-04.svg",
  },
  {
    key: "interview-support",
    labelId: "Bantuan Janji Wawancara",
    labelEn: "Interview Appointment Assistance",
    icon: "/visa-benefit/benefit-05.svg",
  },
  {
    key: "status-update",
    labelId: "Update Status Proses Visa",
    labelEn: "Visa Process Status Updates",
    icon: "/visa-benefit/benefit-06.svg",
  },
  {
    key: "coordination",
    labelId: "Koordinasi dengan Kampus/Perusahaan",
    labelEn: "Coordination with Campus/Company",
    icon: "/visa-benefit/benefit-07.svg",
  },
  {
    key: "deadline-reminder",
    labelId: "Reminder Deadline Otomatis",
    labelEn: "Automatic Deadline Reminders",
    icon: "/visa-benefit/benefit-08.svg",
  },
  {
    key: "multi-country",
    labelId: "Dukungan Multi Negara Tujuan",
    labelEn: "Support for Multiple Destinations",
    icon: "/visa-benefit/benefit-09.svg",
  },
  {
    key: "until-issued",
    labelId: "Pendampingan Sampai Visa Terbit",
    labelEn: "Support Until Visa is Issued",
    icon: "/visa-benefit/benefit-10.svg",
  },
];

/* ===== Data Section Premium Advantage ===== */
/* Silakan ganti path image & icon sesuai file di /public */
const PREMIUM_ID_ITEMS = [
  {
    key: "easy-process",
    title: "Kemudahan Proses",
    desc: "Eksplorasi berbagai destinasi studi luar negeri dengan proses visa yang menyenangkan.",
    icon: "/visa-premium/icon-process.svg",
  },
  {
    key: "wide-coverage",
    title: "Fasilitas Cakupan Visa Luas",
    desc: "Fasilitas dukungan visa global untuk lebih dari 150 negara.",
    icon: "/visa-premium/icon-coverage.svg",
  },
  {
    key: "efficient-cost",
    title: "Biaya Efisien",
    desc: "Biaya proses visa yang efisien dan transparan.",
    icon: "/visa-premium/icon-cost.svg",
  },
];

const PREMIUM_EN_ITEMS = [
  {
    key: "easy-process",
    title: "Easy Process",
    desc: "Explore various overseas study destinations with a pleasant and guided visa process.",
    icon: "/visa-premium/icon-process.svg",
  },
  {
    key: "wide-coverage",
    title: "Wide Visa Coverage",
    desc: "Global visa support facilities for more than 150 countries.",
    icon: "/visa-premium/icon-coverage.svg",
  },
  {
    key: "efficient-cost",
    title: "Efficient Cost",
    desc: "Efficient and transparent visa processing fees.",
    icon: "/visa-premium/icon-cost.svg",
  },
];

/* ===== Copywriting utama ===== */
const TEXT = {
  id: {
    hero: {
      title: "Visa Apply",
      subtitle:
        "Kami menyediakan solusi komprehensif untuk pengurusan visa, memfasilitasi perjalanan Anda ke hampir semua destinasi global dengan proses yang efisien dan mudah.",
      illustration: "/visa.svg",
    },
    description:
      "OSS Bali hadir untuk memberikan dukungan personal dan menyeluruh dalam pengurusan semua jenis visa . Dengan layanan premium kami, Anda bisa fokus sepenuhnya pada persiapan keberangkatan, studi, dan karier, sementara kami menangani semua proses administrasi dengan aman, cepat, dan terpercaya.",
    benefits: BENEFIT_CARDS,
    premium: {
      heading: "Keunggulan Premium Layanan Visa Di OSS Bali",
      image: "/visa-premium/premium-photo.svg", // ganti sesuai path di /public
      items: PREMIUM_ID_ITEMS,
    },
    cta: {
      title:
        "Segera Mulai Proses Visa Kamu Dengan Praktis Sekarang Juga Hanya Di OSS Bali",
      subtitle: "", // desain tidak pakai subcopy, jadi dikosongkan
      button: {
        label: "Daftar Visamu Disini!",
        href: "/user/leads",
      },
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
      "OSS Bali is here to provide personal and comprehensive support in processing all types of visas. With our premium services, you can focus entirely on preparing for your departure, studies, and career, while we handle all administrative processes safely, quickly, and reliably.",
    benefits: BENEFIT_CARDS,
    premium: {
      heading: "Premium Advantages of OSS Bali Visa Services",
      image: "/visa-premium/premium-photo.svg",
      items: PREMIUM_EN_ITEMS,
    },
    cta: {
      title: "Start Your Visa Process Easily with OSS Bali",
      subtitle:
        "Begin your visa journey today with a fast and practical service from OSS Bali.",
      button: {
        label: "Apply for Your Visa Here",
        href: "/user/leads",
      },
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
    benefits: [],
    premium: { heading: "", image: "", items: [] },
    cta: {},
  });

  useEffect(() => {
    setIsLoading(true);
    const t = setTimeout(() => {
      const lk = pickLocale(locale);
      setContent(TEXT[lk]);
      setIsLoading(false);
    }, 200);
    return () => clearTimeout(t);
  }, [locale]);

  return { content, isLoading, locale: pickLocale(locale) };
}
