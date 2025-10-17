"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  GraduationCap,
  Users,
  Building2,
  UserCheck,
  UsersRound,
} from "lucide-react";

/**
 * Bilingual ViewModel (id/en)
 * Gunakan: const vm = useAboutUsViewModel({ locale: "id" | "en" })
 */
export default function useAboutUsViewModel({ locale = "id" } = {}) {
  const L = (id, en) => (locale === "en" ? en : id);

  const hero = {
    title: L("ABOUT US", "ABOUT US"),
    description: L(
      "OSS Bali adalah mitra resmi studi luar negeri dan konsultan karier internasional di bawah CV OSS Bali International. Berbasis di Denpasar dengan cabang di Singaraja, kami bermitra di 23+ negara dan membuka akses ke 300+ kampus serta 1.400+ pilihan jurusan. Sejak 2022, tim dengan pengalaman 11+ tahun mendampingi pelajar dan profesional Indonesia meraih studi dan karier global melalui layanan one-stop solution yang personal, terukur, dan sesuai preferensi.",
      "OSS Bali is an official overseas study partner and international career consultant under CV OSS Bali International. Headquartered in Denpasar with a branch in Singaraja, we partner across 23+ countries, opening access to 300+ universities and 1,400+ majors. Since 2022, our team—bringing 11+ years of experience—has supported Indonesian students and professionals to achieve global study and career goals through a personalized, measurable one-stop solution."
    ),
    ctaLabel: L("PROFIL PERUSAHAAN KAMI", "OUR COMPANY PROFILE"),
    ctaHref: "/profile",
    image: "/mascot-graduation.svg",
    bgCircle: "/latar-lingkaran.svg",
  };

  const standFor = useMemo(
    () => ({
      title: L("WHO WE STAND FOR", "WHO WE STAND FOR"),
      subtitle: L(
        "Kami mendampingi individu dan organisasi berorientasi prestasi untuk membuka potensi di panggung global dari perencanaan hingga keberangkatan, dari kampus hingga karier.",
        "We support achievement-oriented individuals and organizations to unlock their potential on the global stage—from planning to departure, from campus to career."
      ),
      items: [
        {
          id: "pro",
          title: L("PROFESIONAL", "PROFESSIONALS"),
          desc: L(
            "Strategi pengembangan karier internasional, peningkatan daya saing CV/LinkedIn, hingga peluang kerja lintas negara.",
            "International career strategies, stronger CV/LinkedIn positioning, and cross-border job opportunities."
          ),
          icon: Briefcase,
        },
        {
          id: "student",
          title: L("STUDENT", "STUDENTS"),
          desc: L(
            "Kurikulum pilihan, jalur beasiswa, dan bimbingan aplikasi kampus luar negeri yang rapi dan tepat waktu.",
            "Tailored curricula, scholarship pathways, and organized, on-time overseas university applications."
          ),
          icon: GraduationCap,
        },
        {
          id: "parent",
          title: L("ORANG TUA", "PARENTS"),
          desc: L(
            "Panduan keputusan pendidikan anak yang aman, transparan, dan sesuai minat bakat jangka panjang.",
            "Safe, transparent guidance for children’s education aligned with long-term interests and strengths."
          ),
          icon: Users,
        },
        {
          id: "instansi",
          title: L("INSTANSI", "INSTITUTIONS"),
          desc: L(
            "Kemitraan pendidikan, pelatihan SDM, serta program peningkatan kompetensi berbasis kebutuhan industri.",
            "Educational partnerships, HR development, and competency programs aligned with industry needs."
          ),
          icon: Building2,
        },
        {
          id: "alumni",
          title: L("ALUMNI", "ALUMNI"),
          desc: L(
            "Jejaring karier global, mentoring, dan akses peluang kolaborasi lintas disiplin.",
            "Global career networks, mentoring, and cross-disciplinary collaboration opportunities."
          ),
          icon: UserCheck,
        },
        {
          id: "komunitas",
          title: L("KOMUNITAS", "COMMUNITIES"),
          desc: L(
            "Kolaborasi event edukasi & karier untuk memperluas dampak pembelajaran dan kesiapan kerja.",
            "Collaborative education & career events to expand learning impact and job readiness."
          ),
          icon: UsersRound,
        },
      ],
    }),
    [locale]
  );

  // ===== Activities (from API) =====
  const [actItems, setActItems] = useState([]);
  const [actLoading, setActLoading] = useState(false);
  const [actError, setActError] = useState("");

  // Fallback statis jika API kosong/error
  const fallbackActivities = useMemo(
    () => [
      {
        id: "tirta",
        title: L("TIRTA YATRA", "TIRTA YATRA"),
        image: "/tirta.svg",
        desc: L(
          "Kegiatan pembinaan karakter dan spiritual untuk menumbuhkan integritas, empati, dan ketangguhan pribadi.",
          "Character and spiritual development to nurture integrity, empathy, and personal resilience."
        ),
      },
      {
        id: "jumat",
        title: L("JUMAT BERBAGI", "FRIDAY SHARING"),
        image: "/tirta.svg",
        desc: L(
          "Gerakan sosial mingguan: berbagi, peduli, dan membangun budaya kolaboratif di lingkungan sekitar.",
          "A weekly social initiative: sharing, caring, and fostering a collaborative culture in the community."
        ),
      },
      {
        id: "kunjungan",
        title: L("KUNJUNGAN CLIENT", "CLIENT VISITS"),
        image: "/tirta.svg",
        desc: L(
          "Sesi silaturahmi dan evaluasi berkala untuk memastikan layanan dan program berjalan tepat sasaran.",
          "Regular courtesy and review sessions to ensure services and programs stay on target."
        ),
      },
      {
        id: "training",
        title: L("TRAINING CAMPUS", "CAMPUS TRAINING"),
        image: "/tirta.svg",
        desc: L(
          "Workshop persiapan studi dan karier: personal branding, IELTS/TOEFL tips, hingga strategi aplikasi kampus.",
          "Study & career prep workshops: personal branding, IELTS/TOEFL tips, and university application strategies."
        ),
      },
    ],
    [locale]
  );

  useEffect(() => {
    let alive = true;
    async function load() {
      setActLoading(true);
      setActError("");
      try {
        const p = new URLSearchParams();
        p.set("page", "1");
        p.set("perPage", "8");
        p.set("sort", "sort:asc"); // backend sudah auto tambahkan created_at desc
        p.set("locale", locale);
        p.set("fallback", "id");
        p.set("is_published", "1");

        const res = await fetch(`/api/aktivitas?${p.toString()}`, {
          headers: { "cache-control": "no-store" },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();

        const items = (json?.data || []).map((r) => ({
          id: r.id,
          title: r.name || "(no title)",
          image: r.image_url || "",
          desc: r.description || "",
        }));

        if (alive) setActItems(items);
      } catch (e) {
        if (alive) {
          setActItems([]); // biar pakai fallback
          setActError(e?.message || "Failed to load activities");
        }
      } finally {
        if (alive) setActLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [locale]);

  const activities = useMemo(
    () => ({
      title: L("OUR ACTIVITY", "OUR ACTIVITY"),
      subtitle: L(
        "Kegiatan kami dirancang untuk memperkuat karakter, kompetensi, dan koneksi—modal utama menuju masa depan global yang berdaya.",
        "Our programs are designed to strengthen character, competence, and connections—the essentials for an empowered global future."
      ),
      items: actItems.length ? actItems : fallbackActivities,
      // kamu bisa pakai dua flag ini di UI (opsional)
      loading: actLoading,
      error: actError,
    }),
    [locale, actItems, actLoading, actError, fallbackActivities]
  );

  const career = {
    title: L("CAREER WITH US", "CAREER WITH US"),
    ctaLabel: L("GABUNG DI SINI", "JOIN HERE"),
    ctaHref: "/user/career?menu=about",
    watermark: "/images/watermark-burung.svg",
  };

  return { locale, hero, standFor, activities, career };
}
