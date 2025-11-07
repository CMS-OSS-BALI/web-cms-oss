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

      cta: {
        title: "Mulai Perjalananmu Sekarang",
        subtitle: "Temukan Program Luar Negeri dan Raih Kampus Impianmu.",
        button: { label: "COBA SEKARANG", href: "/user/leads" },
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
        text: "Studying abroad is the first step toward your global future. Gain experience studying at an international university, master a language, discover new cultures, and open the door to unlimited career opportunities.",
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
        text: "Start an international work experience that will transform your career! Overseas internships provide opportunities to learn directly from global companies, expand your network, and improve your professional skills. Don't miss the chance to compete at a global level.",
        mainImage: "/laptop.svg",
        subImage: "/laptop2.svg",
        benefits: [
          { icon: "🌍", label: "International experience" },
          { icon: "💸", label: "Hourly pay" },
          { icon: "📈", label: "Job opportunities" },
          { icon: "🤝", label: "Connections" },
        ],
      },

      cta: {
        title: "Start Your Journey Now",
        subtitle:
          "Discover Study Abroad Programs and Achieve Your Dream Campus.",
        button: { label: "GET STARTED", href: "/user/leads" },
      },
    };

    return lk === "en" ? EN : ID;
  }, [lk]);

  const content = data && !error ? data : fallback;
  return { content, isLoading, isError: Boolean(error) };
}
