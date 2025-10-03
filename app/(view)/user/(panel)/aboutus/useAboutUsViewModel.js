"use client";

import {
  Briefcase,
  GraduationCap,
  Users,
  Building2,
  UserCheck,
  UsersRound,
} from "lucide-react";

export function useAboutUsViewModel() {
  const hero = {
    title: "ABOUT US",
    description:
      // Ringkas, kuat, dan fokus manfaat
      "OSS Bali adalah mitra resmi studi luar negeri dan konsultan karier internasional di bawah CV OSS Bali International. Berbasis di Denpasar dengan cabang di Singaraja, kami bermitra di 23+ negara dan membuka akses ke 300+ kampus serta 1.400+ pilihan jurusan. Sejak 2022, tim dengan pengalaman 11+ tahun mendampingi pelajar dan profesional Indonesia meraih studi dan karier global melalui layanan one-stop solution yang personal, terukur, dan sesuai preferensi.",
    ctaLabel: "OUR PROFILE COMPANY",
    ctaHref: "/profile",
    image: "/mascot-graduation.svg",
    bgCircle: "/latar-lingkaran.svg",
  };

  const standFor = {
    title: "WHO WE STAND FOR",
    subtitle:
      // Lebih aspiratif dan spesifik
      "Kami mendampingi individu dan organisasi berorientasi prestasi untuk membuka potensi di panggung global dari perencanaan hingga keberangkatan, dari kampus hingga karier.",
    items: [
      {
        id: "pro",
        title: "PROFESIONAL",
        desc: "Strategi pengembangan karier internasional, peningkatan daya saing CV/LinkedIn, hingga peluang kerja lintas negara.",
        icon: Briefcase,
      },
      {
        id: "student",
        title: "STUDENT",
        desc: "Kurikulum pilihan, jalur beasiswa, dan bimbingan aplikasi kampus luar negeri yang rapi dan tepat waktu.",
        icon: GraduationCap,
      },
      {
        id: "parent",
        title: "ORANG TUA",
        desc: "Panduan keputusan pendidikan anak yang aman, transparan, dan sesuai minat bakat jangka panjang.",
        icon: Users,
      },
      {
        id: "instansi",
        title: "INSTANSI",
        desc: "Kemitraan pendidikan, pelatihan SDM, serta program peningkatan kompetensi berbasis kebutuhan industri.",
        icon: Building2,
      },
      {
        id: "alumni",
        title: "ALUMNI",
        desc: "Jejaring karier global, mentoring, dan akses peluang kolaborasi lintas disiplin.",
        icon: UserCheck,
      },
      {
        id: "komunitas",
        title: "KOMUNITAS",
        desc: "Kolaborasi event edukasi & karier untuk memperluas dampak pembelajaran dan kesiapan kerja.",
        icon: UsersRound,
      },
    ],
  };

  const activities = {
    title: "OUR ACTIVITY",
    subtitle:
      // Konsisten dengan positioning: dampingan real, bukan sekadar promosi
      "Kegiatan kami dirancang untuk memperkuat karakter, kompetensi, dan koneksi—modal utama menuju masa depan global yang berdaya.",
    items: [
      {
        id: "tirta",
        title: "TIRTA YATRA",
        image: "/tirta.svg",
        desc: "Kegiatan pembinaan karakter dan spiritual untuk menumbuhkan integritas, empati, dan ketangguhan pribadi.",
      },
      {
        id: "jumat",
        title: "JUMAT BERBAGI",
        image: "/tirta.svg",
        desc: "Gerakan sosial mingguan: berbagi, peduli, dan membangun budaya kolaboratif di lingkungan sekitar.",
      },
      {
        id: "kunjungan",
        title: "KUNJUNGAN CLIENT",
        image: "/tirta.svg",
        desc: "Sesi silaturahmi dan evaluasi berkala untuk memastikan layanan dan program berjalan tepat sasaran.",
      },
      {
        id: "training",
        title: "TRAINING CAMPUS",
        image: "/tirta.svg",
        desc: "Workshop persiapan studi dan karier: personal branding, IELTS/TOEFL tips, hingga strategi aplikasi kampus.",
      },
    ],
  };

  const career = {
    title: "CAREER WITH US",
    ctaLabel: "JOIN HERE",
    ctaHref: "/user/career?menu=about",
    watermark: "/images/watermark-burung.svg",
  };

  return { hero, standFor, activities, career };
}
