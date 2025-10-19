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
          "Terjemahkan dokumen Anda secara akurat, cepat, dan siap pakai.",
          "Translate your documents with accuracy and speed."
        ),
        illustration: "/doctranslate.svg",
      },

      description: t(
        locale,
        `<p>Layanan ini menyediakan jasa penerjemahan dokumen dalam berbagai bahasa untuk Sub-District Regency/City membantu klien yang membutuhkan penerjemahan yang tersumpah dan cepat dengan provinsi jaminan bisa selesai kurang dari 24 Jam. Layanan ini mencakup dokumen resmi, akademik, bisnis, serta materi lainnya yang diperlukan untuk komunikasi internasional atau keperluan administratif.</p>`,
        `<p>This service provides document translation in multiple languages—sworn and fast—often within 24 hours, covering official, academic, and business materials for international communication and administrative needs.</p>`
      ),

      services: {
        title: t(
          locale,
          "OUR PRODUCT DOCUMENT TRANSLATION",
          "OUR PRODUCT DOCUMENT TRANSLATION"
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
            id: "transkrip",
            title: t(locale, "TRANSKRIP NILAI", "TRANSCRIPT"),
            icon: "/nilai.svg",
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
        title: t(locale, "WHY CHOOSE OUR SERVICE", "WHY CHOOSE OUR SERVICE"),
        items: [
          {
            id: "fast",
            title: t(
              locale,
              "Terjemahan Cepat & Tepat",
              "Fast & Accurate Translation"
            ),
            desc: t(
              locale,
              "Kami berkomitmen memberikan layanan dengan integritas, profesionalisme, dan hasil tepat waktu.",
              "We deliver with integrity, professionalism, and on-time results."
            ),
            icon: "/fast.svg",
          },
          {
            id: "secure",
            title: t(
              locale,
              "Perlindungan Penuh atas Data Anda",
              "Full Protection of Your Data"
            ),
            desc: t(
              locale,
              "Kerahasiaan dan keamanan dokumen Anda menjadi prioritas dalam setiap tahap proses kami.",
              "Confidentiality and security are prioritized at every step."
            ),
            icon: "/secure.svg",
          },
          {
            id: "accuracy",
            title: t(
              locale,
              "Akurasi Linguistik Berstandar Global",
              "Global-Standard Linguistic Accuracy"
            ),
            desc: t(
              locale,
              "Terjemahan presisi tinggi oleh ahli berstandar internasional.",
              "High-precision translation by internationally-qualified experts."
            ),
            icon: "/accuracy.svg",
          },
          {
            id: "legal",
            title: t(
              locale,
              "Dokumen Siap Validasi Resmi",
              "Documents Ready for Official Validation"
            ),
            desc: t(
              locale,
              "Memenuhi standar institusi akademik dan kebutuhan legal internasional.",
              "Meets academic institutions and international legal requirements."
            ),
            icon: "/check.svg",
          },
        ],
        images: {
          mainImage: "/landscape.svg",
          subImage: "/phone.svg",
        },
      },

      // ==== CTA ====
      cta: {
        title: t(
          locale,
          "BANGUN KREDIBILITAS MELALUI<br/>TERJEMAHAN BERKUALITAS",
          "BUILD CREDIBILITY WITH<br/>QUALITY TRANSLATIONS"
        ),
        subtitle: t(
          locale,
          "Dengan layanan terjemahan profesional kami, setiap detail diterjemahkan secara akurat dan siap membawa Anda melangkah lebih jauh di kancah global.",
          "With our professional translation services, every detail is delivered accurately and ready to take you further on the global stage."
        ),
        button: {
          label: t(locale, "COBA SEKARANG", "TRY NOW"),
          href: "/user/leads",
        },
      },
    }),
    [locale]
  );

  const content = data && !error ? data : fallback;

  return { content, isLoading, isError: Boolean(error) };
}
