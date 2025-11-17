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
        `<p>OSS Bali menyediakan layanan penerjemahan dokumen akademik dan personal yang dirancang untuk memenuhi kebutuhan Anda di setiap tahap proses administrasi, baik untuk keperluan dalam negeri maupun luar negeri.Didukung oleh tim penerjemah profesional, kami melayani berbagai bahasa, termasuk Bahasa Inggris, Jepang, dan Jerman. Layanan kami telah dipercaya untuk membantu proses pengajuan visa, pendaftaran studi di luar negeri, serta berbagai keperluan administrasi resmi lainnya. Melalui sistem layanan yang mudah, cepat, dan akurat, kami berkomitmen memberikan hasil terjemahan dengan kualitas terbaik dan kepuasan maksimal bagi setiap klien.</p>`,
        `<p>OSS Bali provides academic and personal document translation services designed to meet your needs at every stage of the administrative process, both domestically and internationally. Supported by a team of professional translators, we offer services in various languages, including English, Japanese, and German. Our services have been trusted to assist with visa applications, overseas study registrations, and various other official administrative requirements. Through an easy, fast, and accurate service system, we are committed to providing the highest quality translations and maximum satisfaction for every client.</p>`
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
