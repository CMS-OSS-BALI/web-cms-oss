"use client";

import { useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";

/**
 * ViewModel: supplies data arrays & handlers.
 * Replace image paths with your real assets in /public/images/career/...
 */
export default function useCareerViewModel() {
  const router = useRouter();

  const hero = useMemo(
    () => ({
      title: "LET’S JOIN WITH US",
      quote: "“Together We Dream, Together We Make It Real”",
      image: "/career-bg.svg",
      objectPosition: "35% 40%", // kiri 35%, atas 40% — tweak sesuai foto
    }),
    []
  );

  const benefits = useMemo(
    () => [
      {
        key: "growth",
        title: "KESEMPATAN BERKEMBANG",
        points: [
          "Program pelatihan & sertifikasi profesional",
          "Promosi & jenjang karier yang jelas",
          "Seminar & workshop untuk pengembangan diri",
        ],
        icon: "/growth.svg",
      },
      {
        key: "collab",
        title: "LINGKUNGAN KOLABORATIF",
        points: [
          "Budaya kerja inklusif dan terbuka",
          "Didukung tim dan manajemen",
          "Kolaborasi lintas divisi untuk memperluas wawasan",
        ],
        icon: "/collab.svg",
      },
      {
        key: "innovation",
        title: "INOVASI & KREATIVITAS",
        points: [
          "Kebebasan menyampaikan ide baru",
          "Akses tools & teknologi modern",
          "Project menantang untuk mengasah kreativitas",
        ],
        icon: "/innovation.svg",
      },
      {
        key: "benefit",
        title: "TUNJANGAN KARYAWAN",
        points: [
          "BPJS Kesehatan & Ketenagakerjaan",
          "Transportasi & makan sesuai kebijakan",
          "Insentif, bonus, dan cuti tahunan",
        ],
        icon: "/benefit.svg",
      },
    ],
    []
  );

  const culture = useMemo(
    () => ({
      leftImage: "/weekly-meeting.svg",
      items: [
        {
          key: "celebration",
          title: "CELEBRATION",
          body: "Rasa syukur bersama menjadi momen kebersamaan. Pencapaian kecil hingga besar kami rayakan untuk menumbuhkan semangat positif.",
          image: "/celebration.svg",
          label: "CELEBRATION",
        },
        {
          key: "games",
          title: "GAME WITH TEAM",
          body: "Aktivitas kebersamaan membangun keakraban lintas tim. Kegiatan ringan untuk menjaga work-life balance.",
          image: "/games.svg",
          label: "GAMES",
        },
        {
          key: "holiday",
          title: "HOLIDAY WITH TEAM",
          body: "Kegiatan liburan bersama mempererat hubungan dan menciptakan momen kebersamaan di luar rutinitas kerja.",
          image: "/holiday.svg",
          label: "HOLIDAY TEAM",
        },
      ],
      bottomCaptionTitle: "KOMUNIKASI TERBUKA DAN TRANSPARAN",
      bottomCaptionBody:
        "Transparansi bukan hanya nilai, tapi cara kami bekerja. Bersama, kita ciptakan ruang kerja yang inspiratif dan inklusif.",
    }),
    []
  );

  const testimonials = useMemo(
    () => [
      {
        id: 1,
        name: "Putri Indah",
        role: "Team II",
        avatar: "/images/loading.png",
        quote:
          "Being an innovator is very challenging but very worth it, because as individuals we are required to always learn and apply it directly. The process of learn and grow as innovator is taking me to the most important thing, because innovation is definitely synonymous with failure, so we must learning from failure and growing.",
      },
      {
        id: 2,
        name: "Rama",
        role: "Design",
        avatar: "/images/loading.png",
        quote:
          "Lingkungan yang suportif bikin cepat berkembang. Feedback jelas, target realistis, dan tim saling bantu.",
      },
      {
        id: 3,
        name: "Nadia",
        role: "Operations",
        avatar: "/images/loading.png",
        quote:
          "Budaya kolaboratif dan komunikasi terbuka bikin kerja terasa aman dan menyenangkan.",
      },
    ],
    []
  );

  const onCTATeam = useCallback(() => {
    router.push("/career/team-member");
  }, [router]);

  const onCTAReferral = useCallback(() => {
    // Keeping the label “Reveral” as in your screenshot
    router.push("/user/referral?menu=career");
  }, [router]);

  const ctaImage = "/cta-girl.svg";

  return {
    hero,
    benefits,
    culture,
    testimonials,
    onCTATeam,
    onCTAReferral,
    ctaImage,
  };
}
