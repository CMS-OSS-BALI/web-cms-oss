"use client";

import { useMemo } from "react";
import useSWR from "swr";

const fetcher = (url) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Failed to load");
    return r.json();
  });

export default function useOverseasViewModel({ locale = "id" } = {}) {
  const { data, error, isLoading } = useSWR(
    `/api/overseas?locale=${locale}`,
    fetcher,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  const fallback = useMemo(
    () => ({
      hero: {
        title: "OVERSEAS STUDY",
        subtitle:
          locale === "id"
            ? "Mulai perjalanan globalmu bersama Overseas Study, dan melangkah ke dunia penuh kemungkinan."
            : "Begin your global journey with Overseas Study and step into a world full of possibilities.",
        bullets: [
          {
            id: "b1",
            label:
              locale === "id"
                ? "Konsultasi Kampus & Jurusan"
                : "Major & University Matching",
          },
          {
            id: "b2",
            label:
              locale === "id" ? "Pendampingan Dokumen" : "Document Assistance",
          },
          {
            id: "b3",
            label:
              locale === "id"
                ? "Persiapan Keberangkatan"
                : "Pre-departure Prep",
          },
        ],
        illustration: "/overseas.svg",
        whatsapp: {
          href: "https://wa.me/6281234567890?text=Halo%20OSS%20Bali,%20saya%20ingin%20konsultasi%20program%20Overseas%20Study.",
          label: locale === "id" ? "Chat Konsultan" : "Chat Consultant",
        },
      },

      description:
        locale === "id"
          ? `<p>Overseas Study adalah layanan pendampingan bagi mereka yang ingin melanjutkan studi dan mengembangkan karier di luar negeri. Kami membantu mulai dari pemilihan universitas, pengurusan dokumen, persiapan bahasa, hingga konsultasi karier internasional. Dengan dukungan mentor berpengalaman dan jaringan global, Overseas Study menjadi jembatan bagi setiap individu untuk meraih impian, memperluas wawasan, serta membangun masa depan yang lebih cerah di kancah internasional.</p>`
          : `<p>Overseas Study is a guidance service for those who want to continue their studies and develop careers abroad. We support you from university selection, document processing, language preparation, to international career counseling. Backed by experienced mentors and a global network, Overseas Study becomes a bridge for every individual to achieve their dreams, broaden horizons, and build a brighter future on the international stage.</p>`,

      tracks: [
        {
          id: "study",
          label: locale === "id" ? "STUDY LUAR NEGERI" : "STUDY ABROAD",
          href: "/layanan/overseas/study",
        },
        {
          id: "intern",
          label: locale === "id" ? "MAGANG LUAR NEGERI" : "OVERSEAS INTERNSHIP",
          href: "/layanan/overseas/magang",
        },
      ],

      studySection: {
        title: "STUDY LUAR NEGERI",
        text: "Study di luar negeri adalah langkah pertama menuju masa depan global Anda. Dapatkan pengalaman belajar di universitas internasional, kuasai bahasa, temukan budaya baru, dan buka pintu kesempatan karier tanpa batas.",
        image: "/ngopi.svg",
        pills: [
          { id: "p1", label: "Pendidikan berkualitas", icon: "🎓" },
          { id: "p2", label: "International Networking", icon: "👥" },
          { id: "p3", label: "Global Experience", icon: "🌐" },
          { id: "p4", label: "Peluang Karir", icon: "📈" },
        ],
      },

      internSection: {
        title: "MAGANG LUAR NEGERI",
        text: "Mulai pengalaman kerja internasional yang akan mengubah karier Anda! Magang luar negeri memberi kesempatan belajar langsung di perusahaan global, memperluas jaringan, dan meningkatkan skill profesional. Jangan lewatkan kesempatan untuk bersaing di level dunia.",
        mainImage: "/laptop.svg",
        subImage: "/laptop2.svg",
      },

      // ➜ NEW: CTA banner content
      cta: {
        title:
          locale === "id"
            ? "MULAI PERJALANANMU SEKARANG"
            : "START YOUR JOURNEY NOW",
        subtitle:
          locale === "id"
            ? "Jelajahi program luar negeri dan raih kampus impianmu"
            : "Discover Overseas Programs And Embrace Your Dream Campus",
        button: {
          label: locale === "id" ? "KLIK DI SINI" : "CLICK HERE",
          href: "/contact", // ubah ke tujuanmu
        },
      },

      // (highlight diabaikan sesuai permintaan sebelumnya)
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
