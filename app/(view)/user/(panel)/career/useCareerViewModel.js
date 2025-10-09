"use client";

import { useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";

/**
 * ViewModel bilingual (id/en).
 * Gunakan: const vm = useCareerViewModel({ locale: "id" | "en" })
 */
export default function useCareerViewModel({ locale = "id" } = {}) {
  const router = useRouter();
  const L = (id, en) => (locale === "en" ? en : id);

  const hero = useMemo(
    () => ({
      title: L("GABUNG BERSAMA KAMI", "LET’S JOIN WITH US"),
      quote: L(
        "“Bermimpi bersama, Mewujudkannya bersama”",
        "“Together We Dream, Together We Make It Real”"
      ),
      image: "/career-bg.svg",
      objectPosition: "35% 40%",
    }),
    [locale]
  );

  const benefits = useMemo(
    () => [
      {
        key: "growth",
        title: L("KESEMPATAN BERKEMBANG", "GROWTH OPPORTUNITIES"),
        points: [
          L(
            "Program pelatihan & sertifikasi profesional",
            "Professional training & certification programs"
          ),
          L(
            "Promosi & jenjang karier yang jelas",
            "Clear promotion & career path"
          ),
          L(
            "Seminar & workshop untuk pengembangan diri",
            "Seminars & workshops for self-development"
          ),
        ],
        icon: "/growth.svg",
      },
      {
        key: "collab",
        title: L("LINGKUNGAN KOLABORATIF", "COLLABORATIVE ENVIRONMENT"),
        points: [
          L(
            "Budaya kerja inklusif dan terbuka",
            "Inclusive, open work culture"
          ),
          L("Didukung tim dan manajemen", "Supportive team and leadership"),
          L(
            "Kolaborasi lintas divisi untuk memperluas wawasan",
            "Cross-division collaboration to broaden perspectives"
          ),
        ],
        icon: "/collab.svg",
      },
      {
        key: "innovation",
        title: L("INOVASI & KREATIVITAS", "INNOVATION & CREATIVITY"),
        points: [
          L("Kebebasan menyampaikan ide baru", "Freedom to pitch new ideas"),
          L(
            "Akses tools & teknologi modern",
            "Access to modern tools & technology"
          ),
          L(
            "Project menantang untuk mengasah kreativitas",
            "Challenging projects that sharpen creativity"
          ),
        ],
        icon: "/innovation.svg",
      },
      {
        key: "benefit",
        title: L("TUNJANGAN KARYAWAN", "EMPLOYEE BENEFITS"),
        points: [
          L("BPJS Kesehatan & Ketenagakerjaan", "Health & employment security"),
          L(
            "Transportasi & makan sesuai kebijakan",
            "Transport & meals per policy"
          ),
          L(
            "Insentif, bonus, dan cuti tahunan",
            "Incentives, bonuses, and annual leave"
          ),
        ],
        icon: "/benefit.svg",
      },
    ],
    [locale]
  );

  const culture = useMemo(
    () => ({
      leftImage: "/weekly-meeting.svg",
      items: [
        {
          key: "celebration",
          title: L("CELEBRATION", "CELEBRATION"),
          body: L(
            "Rasa syukur bersama menjadi momen kebersamaan. Pencapaian kecil hingga besar kami rayakan untuk menumbuhkan semangat positif.",
            "Sharing gratitude becomes our moment of togetherness. We celebrate small to big wins to build positive spirit."
          ),
          image: "/celebration.svg",
          label: L("PERAYAAN", "CELEBRATION"),
        },
        {
          key: "games",
          title: L("GAME WITH TEAM", "TEAM GAMES"),
          body: L(
            "Aktivitas kebersamaan membangun keakraban lintas tim. Kegiatan ringan untuk menjaga work-life balance.",
            "Team activities foster bonds across teams. Light activities that support work-life balance."
          ),
          image: "/games.svg",
          label: L("GAMES", "GAMES"),
        },
        {
          key: "holiday",
          title: L("HOLIDAY WITH TEAM", "TEAM HOLIDAY"),
          body: L(
            "Kegiatan liburan bersama mempererat hubungan dan menciptakan momen kebersamaan di luar rutinitas kerja.",
            "Team trips strengthen relationships and create shared moments beyond daily routines."
          ),
          image: "/holiday.svg",
          label: L("LIBURAN TIM", "TEAM HOLIDAY"),
        },
      ],
      bottomCaptionTitle: L(
        "KOMUNIKASI TERBUKA DAN TRANSPARAN",
        "OPEN & TRANSPARENT COMMUNICATION"
      ),
      bottomCaptionBody: L(
        "Transparansi bukan hanya nilai, tapi cara kami bekerja. Bersama, kita ciptakan ruang kerja yang inspiratif dan inklusif.",
        "Transparency is not just a value—it’s how we work. Together, we build an inspiring and inclusive workplace."
      ),
    }),
    [locale]
  );

  const testimonials = useMemo(
    () => [
      {
        id: 1,
        name: "Putri Indah",
        role: L("Tim II", "Team II"),
        avatar: "/images/loading.png",
        quote: L(
          "Menjadi inovator itu menantang namun sangat berharga: kita dituntut terus belajar dan langsung mempraktikkannya. Proses belajar dari kegagalan dan bertumbuh adalah kuncinya.",
          "Being an innovator is challenging yet rewarding: we must keep learning and apply it directly. Learning from failure and growing is the key."
        ),
      },
      {
        id: 2,
        name: "Rama",
        role: L("Desain", "Design"),
        avatar: "/images/loading.png",
        quote: L(
          "Lingkungan yang suportif bikin cepat berkembang. Feedback jelas, target realistis, dan tim saling bantu.",
          "A supportive environment accelerates growth. Clear feedback, realistic targets, and a team that has your back."
        ),
      },
      {
        id: 3,
        name: "Nadia",
        role: L("Operasional", "Operations"),
        avatar: "/images/loading.png",
        quote: L(
          "Budaya kolaboratif dan komunikasi terbuka bikin kerja terasa aman dan menyenangkan.",
          "A collaborative culture and open communication make work feel safe and enjoyable."
        ),
      },
    ],
    [locale]
  );

  const onCTATeam = useCallback(() => {
    router.push("/career/team-member");
  }, [router]);

  const onCTAReferral = useCallback(() => {
    router.push("/user/referral?menu=career");
  }, [router]);

  const ctaImage = "/cta-girl.svg";

  return {
    locale,
    hero,
    benefits,
    culture,
    testimonials,
    onCTATeam,
    onCTAReferral,
    ctaImage,
  };
}
