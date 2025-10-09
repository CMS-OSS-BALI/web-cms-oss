"use client";

import { useMemo } from "react";
import useSWR from "swr";

/* ===== Helpers ===== */
const fetcher = (url) =>
  fetch(url, { cache: "no-store" }).then((r) => {
    if (!r.ok) throw new Error("Failed to load");
    return r.json();
  });

/** Append ?menu=layanan to child links */
const withMenu = (href = "#") =>
  href.includes("?") ? `${href}&menu=layanan` : `${href}?menu=layanan`;

/** Normalize to 'id' or 'en' (handles 'en-US', etc.) */
const pickLocale = (v) => {
  const s = String(v || "id")
    .trim()
    .toLowerCase();
  return s.startsWith("en") ? "en" : "id";
};

/* ===== Texts ===== */
const TEXT = {
  id: {
    hero: {
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
          label: "ACCOMMODATION",
          icon: "/akomodasi.svg",
          href: withMenu("/user/accommodation"),
        },
        {
          label: "STUDY OVERSEAS",
          icon: "/overseas.svg",
          href: withMenu("/user/overseas-study"),
        }, // fixed
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
        }, // fixed
      ],
    },
    reasons: [
      {
        key: "one-stop",
        title: "ONE STOP SERVICE",
        desc: "Semua layanan dalam satu tempat.",
        icon: "/vector-why.svg",
      },
      {
        key: "quality-ec",
        title: "QUALITY ENGLISH COURSE",
        desc: "Kursus bahasa standar internasional.",
        icon: "/vector-why.svg",
      },
      {
        key: "personal-guidance",
        title: "PERSONAL GUIDANCE",
        desc: "Pendampingan sesuai kebutuhanmu.",
        icon: "/vector-why.svg",
      },
      {
        key: "fast-transparent",
        title: "FAST & TRANSPARENT PROCESS",
        desc: "Cepat, mudah, dan jelas.",
        icon: "/vector-why.svg",
      },
    ],
    whyImage: "/why-choose.svg",
    services: [
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
        href: withMenu("/user/overseas-study"),
      }, // fixed
      {
        id: "doc",
        title: "DOC. TRANSLATION",
        image: "/org-bljr.svg",
        href: withMenu("/user/doc.translate"),
      }, // fixed
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
    serviceIntro:
      "Layanan kami dirancang untuk mendampingi setiap langkah perjalanan Anda, memberikan solusi tepat, dukungan menyeluruh, dan pengalaman terbaik menuju impian studi global.",
    testiEmpty: "Belum ada testimoni untuk kategori layanan",
  },

  en: {
    hero: {
      image: "/hero-layanan.svg",
      objectPosition: "40% 50%",
      title: "OSS SERVICES",
      quoteTop: "FROM LANGUAGE COURSES, VISA PROCESSING,",
      quoteBottom: "TO STUDYING ABROAD",
      pills: [
        {
          label: "ENGLISH COURSE",
          icon: "/engcourse.svg",
          href: withMenu("/user/english-course"),
        },
        {
          label: "ACCOMMODATION",
          icon: "/akomodasi.svg",
          href: withMenu("/user/accommodation"),
        },
        {
          label: "STUDY OVERSEAS",
          icon: "/overseas.svg",
          href: withMenu("/user/overseas-study"),
        }, // fixed
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
        }, // fixed
      ],
    },
    reasons: [
      {
        key: "one-stop",
        title: "ONE STOP SERVICE",
        desc: "All services in one place.",
        icon: "/vector-why.svg",
      },
      {
        key: "quality-ec",
        title: "QUALITY ENGLISH COURSE",
        desc: "International-standard language course.",
        icon: "/vector-why.svg",
      },
      {
        key: "personal-guidance",
        title: "PERSONAL GUIDANCE",
        desc: "Personalized guidance for your needs.",
        icon: "/vector-why.svg",
      },
      {
        key: "fast-transparent",
        title: "FAST & TRANSPARENT PROCESS",
        desc: "Fast, easy, and clear.",
        icon: "/vector-why.svg",
      },
    ],
    whyImage: "/why-choose.svg",
    services: [
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
        href: withMenu("/user/overseas-study"),
      }, // fixed
      {
        id: "doc",
        title: "DOC. TRANSLATION",
        image: "/org-bljr.svg",
        href: withMenu("/user/doc.translate"),
      }, // fixed
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
    serviceIntro:
      "Our services are designed to accompany every step of your journey — providing precise solutions, comprehensive support, and the best experience toward your global study goals.",
    testiEmpty: "No testimonials yet for services category",
  },
};

/* ===== View Model ===== */
export default function useLayananViewModel({
  locale = "id",
  testiLimit = 12,
} = {}) {
  const lk = pickLocale(locale);
  const T = TEXT[lk];

  // memoized blocks
  const hero = useMemo(() => T.hero, [T]);
  const reasons = useMemo(() => T.reasons, [T]);
  const services = useMemo(() => T.services, [T]);
  const whyImage = T.whyImage;
  const serviceIntro = T.serviceIntro;

  // testimonials (category=layanan)
  const qs = useMemo(
    () =>
      new URLSearchParams({
        category: "layanan",
        locale: lk,
        limit: String(testiLimit),
        fields: "image,name,description",
      }).toString(),
    [lk, testiLimit]
  );

  const { data, error, isLoading } = useSWR(
    `/api/testimonials?${qs}`,
    fetcher,
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  );

  const testimonials = Array.isArray(data?.data) ? data.data : [];

  return {
    locale: lk,
    hero,
    reasons,
    whyImage,
    services,
    serviceIntro,
    testimonials,
    testiLoading: isLoading,
    testiError: !!error,
    testiEmptyText: T.testiEmpty,
  };
}
