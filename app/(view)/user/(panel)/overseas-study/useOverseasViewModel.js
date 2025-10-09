"use client";

import { useMemo } from "react";
import useSWR from "swr";

const fetcher = (url) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Failed to load");
    return r.json();
  });

export default function useOverseasViewModel({ locale = "id" } = {}) {
  const lk =
    String(locale || "id")
      .slice(0, 2)
      .toLowerCase() === "en"
      ? "en"
      : "id";

  const { data, error, isLoading } = useSWR(
    `/api/overseas?locale=${lk}`,
    fetcher,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  const fallback = useMemo(() => {
    const ID = {
      hero: {
        title: "OVERSEAS STUDY",
        subtitle:
          "Mulai perjalanan globalmu bersama Overseas Study, dan melangkah ke dunia penuh kemungkinan.",
        bullets: [
          { id: "b1", label: "Konsultasi Kampus & Jurusan" },
          { id: "b2", label: "Pendampingan Dokumen" },
          { id: "b3", label: "Persiapan Keberangkatan" },
        ],
        illustration: "/overseas.svg",
        whatsapp: {
          href: "https://wa.me/6281234567890?text=Halo%20OSS%20Bali,%20saya%20ingin%20konsultasi%20program%20Overseas%20Study.",
          label: "Chat Konsultan",
        },
      },

      description: `<p>Overseas Study adalah layanan pendampingan bagi mereka yang ingin melanjutkan studi dan mengembangkan karier di luar negeri. Kami membantu mulai dari pemilihan universitas, pengurusan dokumen, persiapan bahasa, hingga konsultasi karier internasional. Dengan dukungan mentor berpengalaman dan jaringan global, Overseas Study menjadi jembatan bagi setiap individu untuk meraih impian, memperluas wawasan, serta membangun masa depan yang lebih cerah di kancah internasional.</p>`,

      tracks: [
        {
          id: "study",
          label: "STUDY LUAR NEGERI",
          href: "/layanan/overseas/study",
        },
        {
          id: "intern",
          label: "MAGANG LUAR NEGERI",
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

      cta: {
        title: "MULAI PERJALANANMU SEKARANG",
        subtitle: "Jelajahi program luar negeri dan raih kampus impianmu",
        button: { label: "CLICK HERE", href: "/user/leads" },
      },
    };

    const EN = {
      hero: {
        title: "OVERSEAS STUDY",
        subtitle:
          "Begin your global journey with Overseas Study and step into a world full of possibilities.",
        bullets: [
          { id: "b1", label: "Major & University Matching" },
          { id: "b2", label: "Document Assistance" },
          { id: "b3", label: "Pre-departure Prep" },
        ],
        illustration: "/overseas.svg",
        whatsapp: {
          href: "https://wa.me/6281234567890?text=Hi%20OSS%20Bali,%20I%20want%20to%20consult%20about%20Overseas%20Study.",
          label: "Chat Consultant",
        },
      },

      description: `<p>Overseas Study is a guidance service for those who want to continue their studies and develop careers abroad. We support you from university selection, document processing, language preparation, to international career counseling. Backed by experienced mentors and a global network, Overseas Study becomes a bridge to achieve your dreams, broaden horizons, and build a brighter future on the international stage.</p>`,

      tracks: [
        { id: "study", label: "STUDY ABROAD", href: "/layanan/overseas/study" },
        {
          id: "intern",
          label: "OVERSEAS INTERNSHIP",
          href: "/layanan/overseas/magang",
        },
      ],

      studySection: {
        title: "STUDY ABROAD",
        text: "Studying abroad is the first step toward your global future. Experience international universities, master languages, discover new cultures, and unlock limitless career opportunities.",
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
        text: "Kickstart an international work experience that elevates your career! Internships abroad let you learn directly in global companies, expand your network, and sharpen professional skills.",
        mainImage: "/laptop.svg",
        subImage: "/laptop2.svg",
      },

      cta: {
        title: "START YOUR JOURNEY NOW",
        subtitle: "Discover overseas programs and embrace your dream campus",
        button: { label: "CLICK HERE", href: "/user/leads" },
      },
    };

    return lk === "en" ? EN : ID;
  }, [lk]);

  const content = data && !error ? data : fallback;

  return {
    content,
    isLoading,
    isError: Boolean(error),
  };
}
