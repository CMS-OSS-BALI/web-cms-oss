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
        title: "STUDI LUAR NEGERI",
        subtitle:
          "Mulai perjalanan global Anda bersama OSS, dan jelajahi dunia penuh peluang tanpa batas.",
        illustration: "/overseas.svg",
      },

      description: `<p>Layanan Studi Luar Negeri di OSS Bali membantu peserta dalam merencanakan dan mengurus proses studi di luar negeri, mulai dari pemilihan kampus (College, Institute, TAFE, Polytechnic, & University), pengajuan aplikasi, hingga persiapan keberangkatan. Kami memberikan informasi lengkap mengenai berbagai program pendidikan internasional dan membantu peserta mempersiapkan segala kebutuhan administratif untuk mencapai tujuan studi mereka. Konsultasi Gratis yang kami sediakan berfokus pada profesionalitas untuk menyediakan kualitas informasi terbaik untuk siapapun.</p>`,

      studySection: {
        title: "STUDI LUAR NEGERI",
        text: "Study di luar negeri adalah langkah pertama menuju masa depan global Anda. Dapatkan pengalaman belajar di universitas internasional, kuasai bahasa, temukan budaya baru, dan buka pintu kesempatan karier tanpa batas.",
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
        text: "Mulai pengalaman kerja internasional yang akan mengubah karier Anda! Magang luar negeri memberi kesempatan belajar langsung di perusahaan global, memperluas jaringan, dan meningkatkan skill profesional. Jangan lewatkan kesempatan untuk bersaing di level dunia.",
        mainImage: "/laptop.svg",
        subImage: "/laptop2.svg",
        benefits: [
          { icon: "🌍", label: "Pengalaman internasional" },
          { icon: "💸", label: "Gaji per jam" },
          { icon: "📈", label: "Peluang kerja" },
          { icon: "🤝", label: "Relasi" },
        ],
      },

      /* ===== NEW: Levels Section (replace CTA) ===== */
      levelsSection: {
        title: "Level Kampus",
        image: "/level-kampus.svg", // ganti ke aset ilustrasi sesuai repo kamu
        items: [
          {
            title: "Level 1 (Universitas)",
            text: "Puncak Riset dan Teori. Institusi bagi pemikir strategis, memberikan fondasi akademik terluas untuk memimpin berbagai karir global.",
          },
          {
            title: "Level 2",
            text: "Pendidikan Berbasis Keahlian Vokasi. Fokus pada skill terapan yang relevan, menjamin kompetensi teknis dan transisi karir cepat ke dunia kerja.",
          },
          {
            title: "Level 3",
            text: "Akses Studi Internasional yang Efisien, menyediakan kualifikasi dasar dengan biaya terjangkau, dan pondasi ideal menuju jenjang akademik global.",
          },
        ],
      },
    };

    const EN = {
      hero: {
        title: "STUDY ABROAD",
        subtitle:
          "Start your global journey with OSS, and explore a world of unlimited opportunities.",
        illustration: "/overseas.svg",
      },

      description: `<p>OSS Bali's Study Abroad Services assist participants in planning and managing the process of studying abroad, from choosing a campus (college, institute, TAFE, polytechnic, and university) and submitting applications to preparing for departure. We provide comprehensive information on various international education programs and help participants prepare all the administrative requirements to achieve their study goals. The free consultation we provide focuses on professionalism to deliver the best quality information to anyone.</p>`,

      studySection: {
        title: "STUDY ABROAD",
        text: "Studying abroad is the first step toward your global future. Gain experience at international universities, master languages, discover new cultures, and open the door to unlimited career opportunities.",
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
        text: "Start an international work experience that will transform your career! Overseas internships provide opportunities to learn directly in global companies, expand networks, and elevate professional skills.",
        mainImage: "/laptop.svg",
        subImage: "/laptop2.svg",
        benefits: [
          { icon: "🌍", label: "International experience" },
          { icon: "💸", label: "Hourly pay" },
          { icon: "📈", label: "Job opportunities" },
          { icon: "🤝", label: "Connections" },
        ],
      },

      levelsSection: {
        title: "Campus Levels",
        image: "/level-kampus.svg",
        items: [
          {
            title: "Level 1 (University)",
            text: "Peak of research and theory. Designed for strategic thinkers; provides the broadest academic foundation to lead diverse global careers.",
          },
          {
            title: "Level 2",
            text: "Vocational, skills-based education. Focused on relevant applied skills, ensuring technical competence and a fast transition into the workforce.",
          },
          {
            title: "Level 3",
            text: "Efficient international study access providing affordable foundational qualifications and an ideal pathway to higher academic levels.",
          },
        ],
      },
    };

    return lk === "en" ? EN : ID;
  }, [lk]);

  const content = data && !error ? data : fallback;
  return { content, isLoading, isError: Boolean(error) };
}
