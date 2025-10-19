"use client";

import { useMemo } from "react";
import useSWR from "swr";

const fetcher = (url) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Failed to load");
    return r.json();
  });

export default function useOverseasViewModel({ locale = "id" } = {}) {
  // normalisasi 'id' | 'en'
  const lk =
    String(locale || "id")
      .slice(0, 2)
      .toLowerCase() === "en"
      ? "en"
      : "id";

  const { data, error, isLoading } = useSWR(
    `/api/overseas?locale=${lk}`,
    fetcher,
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  );

  const fallback = useMemo(() => {
    const ID = {
      hero: {
        title: "STUDI LUAR NEGERI",
        subtitle:
          "Mulai perjalanan global Anda bersama OSS—dari pemilihan kampus & jurusan, pendampingan dokumen, hingga persiapan keberangkatan—semua dalam satu layanan terpadu.",
        illustration: "/overseas.svg",
        // optional decorations (biar komponen tidak kosong jika diset):
      },

      description: `<p>Overseas Study adalah layanan pendampingan bagi mereka yang ingin melanjutkan studi dan mengembangkan karier di luar negeri. Kami membantu mulai dari pemilihan universitas, pengurusan dokumen, persiapan bahasa, hingga konsultasi karier internasional. Dengan dukungan mentor berpengalaman dan jaringan global, Overseas Study menjadi jembatan untuk meraih impian, memperluas wawasan, dan membangun masa depan yang lebih cerah di kancah internasional.</p>`,

      studySection: {
        title: "STUDI LUAR NEGERI",
        text: "Studi di luar negeri adalah langkah pertama menuju masa depan global Anda. Dapatkan pengalaman belajar di universitas internasional, kuasai bahasa, temukan budaya baru, dan buka pintu kesempatan karier tanpa batas.",
        image: "/ngopi.svg",
        pills: [
          { id: "p1", label: "Pendidikan berkualitas", icon: "🎓" },
          { id: "p2", label: "International Networking", icon: "👥" },
          { id: "p3", label: "Global Experience", icon: "🌐" },
          { id: "p4", label: "Peluang Karier", icon: "📈" },
        ],
      },

      internSection: {
        title: "MAGANG LUAR NEGERI",
        text: "Mulai pengalaman kerja internasional yang akan mengubah karier Anda! Magang luar negeri memberi kesempatan belajar langsung di perusahaan global, memperluas jaringan, dan meningkatkan keterampilan profesional.",
        mainImage: "/laptop.svg",
        subImage: "/laptop2.svg",
      },

      cta: {
        title: "BANGUN KREDIBILITAS MELALUI TERJEMAHAN BERKUALITAS",
        subtitle:
          "Dengan layanan profesional kami, setiap detail diterjemahkan akurat dan siap membawa Anda melangkah lebih jauh di kancah global.",
        button: { label: "COBA SEKARANG", href: "/user/leads" },
      },
    };

    const EN = {
      hero: {
        title: "STUDY ABROAD",
        subtitle:
          "Begin your global journey with OSS—university & major matching, document assistance, and pre-departure preparation in one seamless service.",
        illustration: "/overseas.svg",
        decorationTop: "/cap-top.svg",
        decorationBottom: "/cap-bottom.svg",
      },

      description: `<p>Overseas Study is a guidance service for students and professionals aiming to study and develop careers abroad. We support you end-to-end—from shortlisting universities and handling documents to language preparation and international career counseling. With experienced mentors and a global network, we help you pursue your dream, broaden horizons, and build a brighter future on the international stage.</p>`,

      studySection: {
        title: "STUDY ABROAD",
        text: "Studying abroad is the first step toward a global future. Experience international universities, master new languages, discover diverse cultures, and unlock limitless career opportunities.",
        image: "/ngopi.svg",
        pills: [
          { id: "p1", label: "High-quality education", icon: "🎓" },
          { id: "p2", label: "International networking", icon: "👥" },
          { id: "p3", label: "Global experience", icon: "🌐" },
          { id: "p4", label: "Career opportunities", icon: "📈" },
        ],
      },

      internSection: {
        title: "OVERSEAS INTERNSHIP",
        text: "Kickstart an international work experience that elevates your career. Learn inside global companies, expand your network, and sharpen your professional skills.",
        mainImage: "/laptop.svg",
        subImage: "/laptop2.svg",
      },

      cta: {
        title: "BUILD CREDIBILITY THROUGH QUALITY TRANSLATION",
        subtitle:
          "Our professional service delivers accurate, ready-to-use results—helping you go further on the global stage.",
        button: { label: "GET STARTED", href: "/user/leads" },
      },
    };

    return lk === "en" ? EN : ID;
  }, [lk]);

  const content = data && !error ? data : fallback;
  return { content, isLoading, isError: Boolean(error) };
}
