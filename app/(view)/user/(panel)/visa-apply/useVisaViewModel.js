"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";

/* Generic fetcher for SWR */
const fetcher = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.json();
};

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
    cta: {
      title: "ADA PERTANYAAN?",
      subtitle: "Klik untuk konsultasi gratis bersama tim kami.",
      button: { label: "CLICK HERE", href: "/user/leads" }, // <- sesuai request
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
      title: "ANY QUESTION?",
      subtitle: "Click to get a free consultation with our team.",
      button: { label: "CLICK HERE", href: "/user/leads" }, // <- sesuai request
    },
  },
};

function pickLocale(locale) {
  const key = String(locale || "id")
    .slice(0, 2)
    .toLowerCase();
  return key === "en" ? "en" : "id";
}

/** ViewModel for Visa Apply page (JSX version) */
export default function useVisaViewModel({
  locale = "id",
  testiLimit = 6, // override when calling the hook if needed
} = {}) {
  /* ---------- Static/Content (simulated) ---------- */
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
    }, 300);
    return () => clearTimeout(t);
  }, [locale]);

  /* ---------- Testimonials (category=visa-apply) ---------- */
  const safeLimit = Number.isFinite(Number(testiLimit))
    ? String(Number(testiLimit))
    : "6";

  const lk = pickLocale(locale);
  const params = new URLSearchParams();
  params.set("category", "visa-apply");
  params.set("locale", lk);
  params.set("limit", safeLimit);
  params.set("fields", "image,name,description");

  const testiKey = `/api/testimonials?${params.toString()}`;
  const {
    data: testiData,
    error: testiError,
    isLoading: isLoadingTesti,
  } = useSWR(testiKey, fetcher);

  const testimonials = Array.isArray(testiData?.data) ? testiData.data : [];

  /* ---------- Expose ---------- */
  return {
    content, // {hero, description, poster, benefits, cta} -> localized
    isLoading, // loading for static content
    testimonials, // testimonials for category "visa-apply"
    isLoadingTesti, // loading for testimonials
    testiError, // potential error
    locale: lk,
  };
}
