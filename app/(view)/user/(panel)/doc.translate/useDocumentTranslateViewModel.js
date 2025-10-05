"use client";

import { useMemo } from "react";
import useSWR from "swr";

const fetcher = (url) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Failed to load");
    return r.json();
  });

export default function useDocumentTranslateViewModel({ locale = "id" } = {}) {
  const { data, error, isLoading } = useSWR(
    `/api/doc-translate?locale=${locale}`,
    fetcher,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  const fallback = useMemo(
    () => ({
      hero: {
        title: "DOC.TRANSLATION",
        subtitle:
          locale === "id"
            ? "Terjemahkan dokumen Anda secara akurat, cepat, dan siap pakai untuk kebutuhan akademik, legal, maupun profesional."
            : "Translate your documents with accuracy and speed—ready for academic, legal, and professional use.",
        bullets: [
          {
            id: "b1",
            label:
              locale === "id"
                ? "Rapi Ikuti Format Asli"
                : "Clean, Source-Matching Layout",
          },
          {
            id: "b2",
            label:
              locale === "id"
                ? "Terminologi Konsisten"
                : "Consistent Terminology",
          },
          {
            id: "b3",
            label:
              locale === "id"
                ? "Proses Cepat & Tepat"
                : "Fast & Reliable Turnaround",
          },
        ],
        illustration: "/doctranslate.svg",
      },

      description:
        locale === "id"
          ? `<p>Layanan penerjemahan dokumen resmi atau pribadi dari satu bahasa ke bahasa lain, baik untuk keperluan akademik, profesional, maupun hukum. Layanan ini memastikan setiap dokumen diterjemahkan secara akurat, mempertahankan makna asli, format, dan konteksnya, sehingga siap digunakan untuk aplikasi pendidikan, pekerjaan, visa, atau kepentingan resmi lainnya.</p>`
          : `<p>Professional translation for personal and official documents. We preserve meaning, context, and layout—ready for study, work, visa, and other official needs.</p>`,

      productSection: {
        title: "OUR PRODUCT DOCUMENT TRANSLATION",
        items: [
          {
            id: "ktp",
            title: locale === "id" ? "KARTU PENDUDUK" : "NATIONAL ID",
            icon: "/acc.svg",
            href: "/user/leads",
          },
          {
            id: "kk",
            title: locale === "id" ? "KARTU KELUARGA" : "FAMILY CARD",
            icon: "/kk.svg",
            href: "/user/leads",
          },
          {
            id: "akta",
            title: locale === "id" ? "AKTA KELAHIRAN" : "BIRTH CERTIFICATE",
            icon: "/akta.svg",
            href: "/user/leads",
          },
        ],
      },

      // NEW: Why section
      why: {
        title:
          locale === "id" ? "WHY CHOOSE OUR SERVICE" : "WHY CHOOSE OUR SERVICE",
        items: [
          {
            id: "quality",
            title:
              locale === "id" ? "Quality Guaranteed" : "Quality Guaranteed",
            desc:
              locale === "id"
                ? "Cepat, andal, dan dokumen siap pakai di genggaman Anda."
                : "Fast, reliable, and ready-to-use documents at your fingertips.",
            icon: "/petir.svg", // ganti dengan asetmu
          },
          {
            id: "expert",
            title: locale === "id" ? "Expert Translator" : "Expert Translator",
            desc:
              locale === "id"
                ? "Tim penerjemah berpengalaman dengan terminologi konsisten."
                : "Experienced translators with consistent terminology.",
            icon: "/petir.svg",
          },
          {
            id: "fast",
            title: locale === "id" ? "Fast Service" : "Fast Service",
            desc:
              locale === "id"
                ? "Proses cepat tanpa mengorbankan kualitas hasil terjemahan."
                : "Quick process without compromising translation quality.",
            icon: "/petir.svg",
          },
        ],
      },

      // NEW: CTA block
      cta: {
        title:
          locale === "id" ? "READY TO GET STARTED" : "READY TO GET STARTED",
        button: {
          label: locale === "id" ? "KLIK HERE" : "CLICK HERE",
          href: "/user/leads",
        },
      },
    }),
    [locale]
  );

  const content = data && !error ? data : fallback;

  return {
    content,
    isLoading,
    isError: Boolean(error),
  };
}
