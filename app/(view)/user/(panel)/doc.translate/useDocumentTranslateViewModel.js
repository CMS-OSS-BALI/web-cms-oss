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
        // Title Case agar sama seperti mockup
        title: t(locale, "Translate Document", "Translate Document"),
        subtitle: t(
          locale,
          "Terjemahkan dokumen Anda dengan akurat dan profesional, siap pakai untuk keperluan internasional.",
          "Translate your documents accurately and professionally—ready for official and international use."
        ),
        illustration: "/doctranslate.svg",
      },

      // Copywriting disederhanakan & rapi sesuai desain
      description: t(
        locale,
        `<p>Layanan ini menyediakan jasa penerjemahan dokumen dalam berbagai bahasa untuk Sub-District Regency/City membantu klien yang membutuhkan penerjemahan yang tersumpah dan cepat dengan Provinc jaminan bisa selesai kurang dari 24 Jam. Layanan ini mencakup dokumen resmi, msident indes No Place Date of akademik, bisnis, serta materi lainnya yang diperlukan untuk komunikasi internasional atau keperluan administratif.</p>`,
        `<p>This service provides document translation services in various languages for sub-districts, regencies, and cities, assisting clients who need fast, certified translations with a guarantee that they will be completed in less than 24 hours. This service covers official documents, academic transcripts, business documents, and other materials required for international communication or administrative purposes.</p>`
      ),

      services: {
        title: t(
          locale,
          "Portofolio Dokumen Legal Tersertifikasi",
          "Certified Legal Document Portfolio"
        ),
        items: [
          {
            id: "ktp",
            title: t(locale, "Kartu Tanda Penduduk", "National ID"),
            icon: "/acc.svg",
            href: "/user/leads",
          },
          {
            id: "kk",
            title: t(locale, "Kartu Keluarga", "Family Card"),
            icon: "/kk.svg",
            href: "/user/leads",
          },
          {
            id: "transkrip",
            title: t(locale, "Transkrip Nilai", "Transcript"),
            icon: "/nilai.svg",
            href: "/user/leads",
          },
          {
            id: "akta",
            title: t(locale, "Akta Kelahiran", "Birth Certificate"),
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
            id: "fast",
            title: t(
              locale,
              "Terjemahan Cepat & Tepat",
              "Fast & Accurate Translation"
            ),
            desc: t(
              locale,
              "Kami Berkomitmen Memberikan Layanan Dengan Integritas, Profesionalisme, Dan Hasil Tepat Waktu.",
              "We are committed to delivering with integrity, professionalism, and on-time results."
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
              "Kerahasiaan Dan Keamanan Dokumen Anda Menjadi Prioritas Dalam Setiap Tahap Proses Kami.",
              "The confidentiality and security of your documents are prioritized at every stage of our process."
            ),
            icon: "/secure.svg",
          },
          {
            id: "sworn", // boleh tetap "accuracy" jika ada dependensi, teks tetap sama
            title: t(
              locale,
              "Penerjeman Tersumpah (SWORN)",
              "Sworn Translation (SWORN)"
            ),
            desc: t(
              locale,
              "Terjemahan Berlisensi Ahli Yang Telah Sumpah Dan Disertivikasi Oleh Lembaga Khusus",
              "Performed by licensed experts who are sworn and certified by designated institutions."
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
              "Dokumen Terjemahan Kami Dapat Digunakan Untuk Keperluan Nasional Maupun International",
              "Our translations are suitable for national and international requirements."
            ),
            icon: "/check.svg",
          },
        ],

        images: {
          mainImage: "/landscape.svg",
          subImage: "/phone.svg",
        },
      },

      // CTA (opsional)
      cta: {
        title: t(
          locale,
          "BANGUN KREDIBILITAS MELALUI<br/>TERJEMAHAN BERKUALITAS",
          "BUILD CREDIBILITY WITH<br/>QUALITY TRANSLATIONS"
        ),
        subtitle: t(
          locale,
          "Dengan layanan terjemahan profesional kami, setiap detail diterjemahkan secara akurat dan siap digunakan untuk keperluan resmi maupun internasional.",
          "With our professional translation services, every detail is delivered accurately and ready for official and international use."
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
