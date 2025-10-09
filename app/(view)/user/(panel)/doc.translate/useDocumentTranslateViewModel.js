"use client";

import { useMemo } from "react";
import useSWR from "swr";

const fetcher = (url) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Failed to load");
    return r.json();
  });

const t = (locale, id, en) => (locale === "en" ? en : id);

export default function useDocumentTranslateViewModel({ locale = "id" } = {}) {
  const { data, error, isLoading } = useSWR(
    `/api/doc-translate?locale=${locale}&fallback=id`,
    fetcher,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  const fallback = useMemo(
    () => ({
      hero: {
        title: t(locale, "TERJEMAHAN DOKUMEN", "DOCUMENT TRANSLATION"),
        subtitle: t(
          locale,
          "Terjemahkan dokumen Anda secara akurat, cepat, dan siap pakai untuk kebutuhan akademik, legal, maupun profesional.",
          "Translate your documents with accuracy and speed—ready for academic, legal, and professional use."
        ),
        bullets: [
          {
            id: "b1",
            label: t(
              locale,
              "Rapi Ikuti Format Asli",
              "Clean, Source-Matching Layout"
            ),
          },
          {
            id: "b2",
            label: t(locale, "Terminologi Konsisten", "Consistent Terminology"),
          },
          {
            id: "b3",
            label: t(
              locale,
              "Proses Cepat & Tepat",
              "Fast & Reliable Turnaround"
            ),
          },
        ],
        illustration: "/doctranslate.svg",
      },

      description: t(
        locale,
        `<p>Layanan penerjemahan dokumen resmi atau pribadi dari satu bahasa ke bahasa lain, baik untuk keperluan akademik, profesional, maupun hukum. Layanan ini memastikan setiap dokumen diterjemahkan secara akurat, mempertahankan makna asli, format, dan konteksnya, sehingga siap digunakan untuk aplikasi pendidikan, pekerjaan, visa, atau kepentingan resmi lainnya.</p>`,
        `<p>Professional translation for personal and official documents. We preserve meaning, context, and layout—ready for study, work, visa, and other official needs.</p>`
      ),

      productSection: {
        title: t(
          locale,
          "PRODUK TERJEMAHAN DOKUMEN KAMI",
          "OUR DOCUMENT TRANSLATION PRODUCTS"
        ),
        items: [
          {
            id: "ktp",
            title: t(locale, "KARTU PENDUDUK", "NATIONAL ID"),
            icon: "/acc.svg",
            href: "/user/leads",
          },
          {
            id: "kk",
            title: t(locale, "KARTU KELUARGA", "FAMILY CARD"),
            icon: "/kk.svg",
            href: "/user/leads",
          },
          {
            id: "akta",
            title: t(locale, "AKTA KELAHIRAN", "BIRTH CERTIFICATE"),
            icon: "/akta.svg",
            href: "/user/leads",
          },
        ],
      },

      why: {
        title: t(
          locale,
          "MENGAPA MEMILIH LAYANAN KAMI",
          "WHY CHOOSE OUR SERVICE"
        ),
        items: [
          {
            id: "quality",
            title: t(locale, "Kualitas Terjamin", "Quality Guaranteed"),
            desc: t(
              locale,
              "Cepat, andal, dan dokumen siap pakai di genggaman Anda.",
              "Fast, reliable, and ready-to-use documents at your fingertips."
            ),
            icon: "/petir.svg",
          },
          {
            id: "expert",
            title: t(locale, "Penerjemah Ahli", "Expert Translator"),
            desc: t(
              locale,
              "Tim penerjemah berpengalaman dengan terminologi konsisten.",
              "Experienced translators with consistent terminology."
            ),
            icon: "/petir.svg",
          },
          {
            id: "fast",
            title: t(locale, "Layanan Cepat", "Fast Service"),
            desc: t(
              locale,
              "Proses cepat tanpa mengorbankan kualitas hasil terjemahan.",
              "Quick process without compromising translation quality."
            ),
            icon: "/petir.svg",
          },
        ],
      },

      cta: {
        title: t(locale, "SIAP MEMULAI", "READY TO GET STARTED"),
        button: {
          label: t(locale, "Klik di sini", "Click here"),
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
