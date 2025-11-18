"use client";

import { useMemo } from "react";
import useSWR from "swr";

const fetcher = (url) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Failed to load");
    return r.json();
  });

const t = (locale, id, en) =>
  String(locale).slice(0, 2).toLowerCase() === "en" ? en : id;

export default function useDocumentTranslateViewModel({ locale = "id" } = {}) {
  const { data, error, isLoading } = useSWR(
    `/api/doc-translate?locale=${locale}&fallback=id`,
    fetcher,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  const fallback = useMemo(
    () => ({
      hero: {
        title: t(locale, "Translate Document", "Translate Document"),
        subtitle: t(
          locale,
          "Terjemahkan dokumen Anda dengan akurat dan profesional, siap pakai untuk keperluan internasional.",
          "Translate your documents accurately and professionally—ready for official and international use."
        ),
        illustration: "/doctranslate.svg",
      },

      description: t(
        locale,
        `<p>OSS Bali menyediakan layanan penerjemahan dokumen akademik dan personal yang dirancang untuk memenuhi kebutuhan Anda di setiap tahap proses administrasi, baik untuk keperluan dalam negeri maupun luar negeri. Didukung oleh tim penerjemah profesional, kami melayani berbagai bahasa, termasuk Bahasa Inggris, Jepang, dan Jerman. Layanan kami telah dipercaya untuk membantu proses pengajuan visa, pendaftaran studi di luar negeri, serta berbagai keperluan administrasi resmi lainnya. Melalui sistem layanan yang mudah, cepat, dan akurat, kami berkomitmen memberikan hasil terjemahan dengan kualitas terbaik dan kepuasan maksimal bagi setiap klien.</p>`,
        `<p>OSS Bali provides academic and personal document translation services designed to meet your needs at every stage of the administrative process, both domestically and internationally. Supported by a team of professional translators, we offer services in various languages, including English, Japanese, and German. Our services have been trusted to assist with visa applications, overseas study registrations, and various other official administrative requirements. Through an easy, fast, and accurate service system, we are committed to providing the highest quality translations and maximum satisfaction for every client.</p>`
      ),

      // === JENIS PENERJEMAH ===
      services: {
        title: t(
          locale,
          "Jenis Penerjemah di OSS Bali",
          "Types of Translators at OSS Bali"
        ),
        heroImage: "/images/translator-right-placeholder.svg", // ganti sendiri path-nya
        items: [
          {
            id: "reguler",
            title: t(locale, "Penerjemahan Reguler", "Regular Translation"),
            desc: t(
              locale,
              "Untuk kebutuhan umum dan non-resmi.",
              "For general and non-official needs."
            ),
            icon: "/icons/translator-regular.svg",
          },
          {
            id: "certified",
            title: t(
              locale,
              "Penerjemahan Tersertifikasi",
              "Certified Translation"
            ),
            desc: t(
              locale,
              "Dilengkapi dengan tanda tangan penerjemah bersertifikat.",
              "Completed with the signature of a certified translator."
            ),
            icon: "/icons/translator-certified.svg",
          },
          {
            id: "sworn",
            title: t(locale, "Penerjemahan Tersumpah", "Sworn Translation"),
            desc: t(
              locale,
              "Hasil terjemahan resmi yang diakui oleh lembaga pemerintah dan institusi internasional.",
              "Official translations recognized by government bodies and international institutions."
            ),
            icon: "/icons/translator-sworn.svg",
          },
        ],
      },

      // === LIST DOKUMEN (11 ITEM) UNTUK SWIPER ===
      documentTypes: [
        {
          key: "id-card",
          labelId: "Kartu Identitas",
          labelEn: "Identity Card",
          icon: "/doc-translate/id-card.svg",
        },
        {
          key: "asset-certificate",
          labelId: "Sertifikat Aset",
          labelEn: "Asset Certificate",
          icon: "/doc-translate/asset-certificate.svg",
        },
        {
          key: "state-doc",
          labelId: "Dokumen Negara Non-Bilingual",
          labelEn: "Non-Bilingual State Document",
          icon: "/doc-translate/state-document.svg",
        },
        {
          key: "mou-moa",
          labelId: "MoU / MoA",
          labelEn: "MoU / MoA",
          icon: "/doc-translate/mou-moa.svg",
        },
        {
          key: "transcript",
          labelId: "Transkrip Nilai",
          labelEn: "Academic Transcript",
          icon: "/doc-translate/transcript.svg",
        },
        {
          key: "college-task",
          labelId: "Tugas Kuliah",
          labelEn: "College Assignment",
          icon: "/doc-translate/college-task.svg",
        },
        {
          key: "school-report",
          labelId: "Rapor Sekolah",
          labelEn: "School Report",
          icon: "/doc-translate/school-report.svg",
        },
        {
          key: "journal",
          labelId: "Jurnal",
          labelEn: "Journal",
          icon: "/doc-translate/journal.svg",
        },
        {
          key: "certificate",
          labelId: "Piagam",
          labelEn: "Certificate",
          icon: "/doc-translate/certificate.svg",
        },
        {
          key: "marriage-book",
          labelId: "Buku/ Akta Nikah",
          labelEn: "Marriage Book / Certificate",
          icon: "/doc-translate/marriage-book.svg",
        },
        {
          key: "skill-certificate",
          labelId: "Sertifikat Keahlian",
          labelEn: "Skill Certificate",
          icon: "/doc-translate/skill-certificate.svg",
        },
      ],

      // === KENAPA HARUS TRANSLET DI OSS BALI ===
      reasons: {
        title: t(
          locale,
          "Kenapa Harus Translate Di OSS Bali?",
          "Why Should You Translate with OSS Bali?"
        ),
        heroImage: "/doc-translate/why-hero.svg", // ganti path sesuai file kamu
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
              "We are committed to delivering with integrity, professionalism, and on-time results."
            ),
            icon: "/doc-translate/icon-fast.svg", // placeholder
          },
          {
            id: "secure",
            title: t(
              locale,
              "Perlindungan Penuh atas Data Anda",
              "Full Protection for Your Data"
            ),
            desc: t(
              locale,
              "Kerahasiaan dan keamanan dokumen Anda menjadi prioritas dalam setiap tahap proses kami.",
              "The confidentiality and security of your documents are prioritized at every stage."
            ),
            icon: "/doc-translate/icon-secure.svg",
          },
          {
            id: "sworn",
            title: t(
              locale,
              "Penerjemah Tersumpah (SWORN)",
              "Sworn Translators (SWORN)"
            ),
            desc: t(
              locale,
              "Terjemahan berlisensi ahli yang telah disumpah dan disertifikasi oleh lembaga khusus.",
              "Licensed experts who are sworn and certified by designated institutions."
            ),
            icon: "/doc-translate/icon-sworn.svg",
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
              "Dokumen terjemahan kami dapat digunakan untuk keperluan nasional maupun internasional.",
              "Our translations are suitable for both national and international requirements."
            ),
            icon: "/doc-translate/icon-legal.svg",
          },
        ],
      },

      cta: {
        title: t(
          locale,
          "Terjemahkan Dokumen Berkualitas<br/>Dengan Hasil Kurang Dari 24 Jam?",
          "Translate Quality Documents<br/>With Results in Less Than 24 Hours"
        ),
        subtitle: t(
          locale,
          "Kirim dokumenmu sekarang dan dapatkan terjemahan profesional yang rapi, siap pakai, dan diproses kurang dari 24 jam.",
          "Send your documents now and get a polished, ready-to-use professional translation processed in less than 24 hours."
        ),
        button: {
          label: t(locale, "Kirim Sekarang", "Send Now"),
          href: "/user/leads",
        },
      },
    }),
    [locale]
  );

  const content = data && !error ? data : fallback;

  return { content, isLoading, isError: Boolean(error) };
}
