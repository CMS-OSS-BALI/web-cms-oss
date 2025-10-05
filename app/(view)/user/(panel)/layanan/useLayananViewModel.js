"use client";

import { useMemo } from "react";
import useSWR from "swr";

/* ===== Helpers ===== */
const fetcher = (url) =>
  fetch(url, { cache: "no-store" }).then((r) => {
    if (!r.ok) throw new Error("Failed to load");
    return r.json();
  });

// helper: tambahkan ?menu=layanan ke semua link anak layanan
const withMenu = (href = "#") =>
  href.includes("?") ? `${href}&menu=layanan` : `${href}?menu=layanan`;

/* ===== View Model ===== */
export default function useLayananViewModel({
  locale = "id",
  testiLimit = 12,
} = {}) {
  /* ---------- HERO ---------- */
  const hero = useMemo(
    () => ({
      image: "/hero-layanan.svg",
      objectPosition: "40% 50%",
      title: "LAYANAN OSS",
      quoteTop: "MULAI DARI KURSUS BAHASA, PENGURUSAN",
      quoteBottom: "VISA, HINGGA STUDI KE LUAR NEGERI",
      pills: [
        {
          label: "ENGLISH COURSE",
          icon: "/engcourse.svg",
          href: withMenu("/user/english-course"),
        },
        {
          label: "AKOMODATION",
          icon: "/akomodasi.svg",
          href: withMenu("/user/accommodation"),
        },
        {
          label: "STUDY OVERSEAS",
          icon: "/overseas.svg",
          href: withMenu("/user/overseas-study"),
        },
        {
          label: "VISA APPLY",
          icon: "/visa.svg",
          href: withMenu("/user/visa-apply"),
        },
        {
          label: "DOCUMENT TRANSLATION",
          icon: "/doctranslate.svg",
          href: withMenu("/user/doc.translate"),
          wide: true,
        },
      ],
    }),
    []
  );

  /* ---------- WHY CHOOSE ---------- */
  const reasons = useMemo(
    () => [
      {
        key: "one-stop",
        title: "ONE STOP SERVICE",
        desc: "Semua Layanan Dalam Satu Tempat.",
        icon: "/vector-why.svg",
      },
      {
        key: "quality-ec",
        title: "QUALITY ENGLISH COURSE",
        desc: "Kursus Bahasa Standar Internasional.",
        icon: "/vector-why.svg",
      },
      {
        key: "personal-guidance",
        title: "PERSONAL GUIDANCE",
        desc: "Pendampingan Sesuai Kebutuhanmu.",
        icon: "/vector-why.svg",
      },
      {
        key: "fast-transparent",
        title: "FAST & TRANSPARENT PROCESS",
        desc: "Cepat, Mudah, Dan Jelas.",
        icon: "/vector-why.svg",
      },
    ],
    []
  );

  const whyImage = "/why-choose.svg";

  /* ---------- OUR SERVICE ---------- */
  const services = useMemo(
    () => [
      {
        id: "english",
        title: "ENGLISH COURSE",
        image: "/org-bljr.svg",
        href: withMenu("/user/english-course"),
      },
      {
        id: "overseas",
        title: "OVERSEAS STUDY",
        image: "/org-bljr.svg",
        href: withMenu("/user/overseas"),
      },
      {
        id: "doc",
        title: "DOC. TRANSLATION",
        image: "/org-bljr.svg",
        href: withMenu("/user/document-translation"),
      },
      {
        id: "visa",
        title: "VISA APPLY",
        image: "/org-bljr.svg",
        href: withMenu("/user/visa-apply"),
      },
      {
        id: "accommodation",
        title: "ACCOMMODATION",
        image: "/org-bljr.svg",
        href: withMenu("/user/accommodation"),
      },
    ],
    []
  );

  const serviceIntro =
    "Layanan kami dirancang untuk mendampingi setiap langkah perjalanan Anda, memberikan solusi tepat, dukungan menyeluruh, dan pengalaman terbaik menuju impian studi global";

  /* ---------- TESTIMONI (category=layanan) ---------- */
  // minta hanya kolom minimal: image, name, description
  const qs = new URLSearchParams({
    category: "layanan",
    locale,
    limit: String(testiLimit),
    fields: "image,name,description",
  }).toString();

  const { data, error, isLoading } = useSWR(`/api/testimonials?${qs}`, fetcher);
  const testimonials = Array.isArray(data?.data) ? data.data : [];

  return {
    hero,
    reasons,
    whyImage,
    services,
    serviceIntro,
    testimonials, // berisi { id, image, name, description }
    testiLoading: isLoading,
    testiError: !!error,
  };
}
