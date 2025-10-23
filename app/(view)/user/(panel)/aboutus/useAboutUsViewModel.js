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

/* ===== I18N DICTIONARY ===== */
const DICT = {
  id: {
    hero: {
      title: "ABOUT US",
      description:
        "OSS Bali adalah mitra resmi studi luar negeri dan konsultan karier internasional di bawah CV OSS Bali International. Berbasis di Denpasar dengan cabang di Singaraja, kami bermitra di 23+ negara dan membuka akses ke 300+ kampus serta 1.400+ pilihan jurusan. Sejak 2022, tim dengan pengalaman 11+ tahun mendampingi pelajar dan profesional Indonesia meraih studi dan karier global melalui layanan one-stop solution yang personal, terukur, dan sesuai preferensi.",
      ctaLabel: "PROFIL PERUSAHAAN KAMI",
    },
    standFor: {
      title: "WHO WE STAND FOR",
      subtitle:
        "Kami mendampingi individu dan organisasi berorientasi prestasi untuk membuka potensi di panggung global dari perencanaan hingga keberangkatan, dari kampus hingga karier.",
      items: {
        pro: {
          title: "PROFESIONAL",
          desc: "Strategi pengembangan karier internasional, peningkatan daya saing CV/LinkedIn, hingga peluang kerja lintas negara.",
        },
        student: {
          title: "STUDENT",
          desc: "Kurikulum pilihan, jalur beasiswa, dan bimbingan aplikasi kampus luar negeri yang rapi dan tepat waktu.",
        },
        parent: {
          title: "ORANG TUA",
          desc: "Panduan keputusan pendidikan anak yang aman, transparan, dan sesuai minat bakat jangka panjang.",
        },
        instansi: {
          title: "INSTANSI",
          desc: "Kemitraan pendidikan, pelatihan SDM, serta program peningkatan kompetensi berbasis kebutuhan industri.",
        },
        alumni: {
          title: "ALUMNI",
          desc: "Jejaring karier global, mentoring, dan akses peluang kolaborasi lintas disiplin.",
        },
        komunitas: {
          title: "KOMUNITAS",
          desc: "Kolaborasi event edukasi & karier untuk memperluas dampak pembelajaran dan kesiapan kerja.",
        },
      },
    },
    activities: {
      title: "OUR ACTIVITY",
      subtitle:
        "Kegiatan kami dirancang untuk memperkuat karakter, kompetensi, dan koneksi—modal utama menuju masa depan global yang berdaya.",
      fallback: {
        tirta: {
          title: "TIRTA YATRA",
          desc: "Kegiatan pembinaan karakter dan spiritual untuk menumbuhkan integritas, empati, dan ketangguhan pribadi.",
        },
        jumat: {
          title: "JUMAT BERBAGI",
          desc: "Gerakan sosial mingguan: berbagi, peduli, dan membangun budaya kolaboratif di lingkungan sekitar.",
        },
        kunjungan: {
          title: "KUNJUNGAN CLIENT",
          desc: "Sesi silaturahmi dan evaluasi berkala untuk memastikan layanan dan program berjalan tepat sasaran.",
        },
        training: {
          title: "TRAINING CAMPUS",
          desc: "Workshop persiapan studi dan karier: personal branding, IELTS/TOEFL tips, hingga strategi aplikasi kampus.",
        },
      },
    },
    career: {
      sectionTitle: "BANGUN KARIR BERSAMA KAMI",
      cardTitle: "JADILAH BAGIAN DARI PERJALANAN KAMI",
      cardBody:
        "Mulai langkah awal kariermu sekarang bersama kami. Bangun pengalaman, koneksi, dan peluang baru untuk masa depan yang lebih gemilang.",
      ctaLabel: "CEK SEKARANG",
      topCtaLabel: "GABUNG DI SINI",
    },
  },

  en: {
    hero: {
      title: "ABOUT US",
      description:
        "OSS Bali is an official overseas study partner and international career consultant under CV OSS Bali International. Headquartered in Denpasar with a branch in Singaraja, we partner across 23+ countries, opening access to 300+ universities and 1,400+ majors. Since 2022, our team—bringing 11+ years of experience—has supported Indonesian students and professionals to achieve global study and career goals through a personalized, measurable one-stop solution.",
      ctaLabel: "OUR COMPANY PROFILE",
    },
    standFor: {
      title: "WHO WE STAND FOR",
      subtitle:
        "We support achievement-oriented individuals and organizations to unlock their potential on the global stage—from planning to departure, from campus to career.",
      items: {
        pro: {
          title: "PROFESSIONALS",
          desc: "International career strategies, stronger CV/LinkedIn positioning, and cross-border job opportunities.",
        },
        student: {
          title: "STUDENTS",
          desc: "Tailored curricula, scholarship pathways, and organized, on-time overseas university applications.",
        },
        parent: {
          title: "PARENTS",
          desc: "Safe, transparent guidance for children’s education aligned with long-term interests and strengths.",
        },
        instansi: {
          title: "INSTITUTIONS",
          desc: "Educational partnerships, HR development, and competency programs aligned with industry needs.",
        },
        alumni: {
          title: "ALUMNI",
          desc: "Global career networks, mentoring, and cross-disciplinary collaboration opportunities.",
        },
        komunitas: {
          title: "COMMUNITIES",
          desc: "Collaborative education & career events to expand learning impact and job readiness.",
        },
      },
    },
    activities: {
      title: "OUR ACTIVITY",
      subtitle:
        "Our programs are designed to strengthen character, competence, and connections—the essentials for an empowered global future.",
      fallback: {
        tirta: {
          title: "TIRTA YATRA",
          desc: "Character and spiritual development to nurture integrity, empathy, and personal resilience.",
        },
        jumat: {
          title: "FRIDAY SHARING",
          desc: "A weekly social initiative: sharing, caring, and fostering a collaborative culture in the community.",
        },
        kunjungan: {
          title: "CLIENT VISITS",
          desc: "Regular courtesy and review sessions to ensure services and programs stay on target.",
        },
        training: {
          title: "CAMPUS TRAINING",
          desc: "Study & career prep workshops: personal branding, IELTS/TOEFL tips, and university application strategies.",
        },
      },
    },
    career: {
      sectionTitle: "BUILD A CAREER WITH US",
      cardTitle: "BE PART OF OUR JOURNEY",
      cardBody:
        "Kickstart your career with us today. Build new experience, connections, and opportunities for a brighter future.",
      ctaLabel: "CHECK NOW",
      topCtaLabel: "JOIN HERE",
    },
  },
};

const SUPPORTED = Object.keys(DICT);
const DEFAULT_LOCALE = "id";

function getPath(obj, path) {
  return path.split(".").reduce((o, k) => (o ? o[k] : undefined), obj);
}
function normalizeLocale(l) {
  const v = (l || "").toLowerCase().slice(0, 2);
  return SUPPORTED.includes(v) ? v : DEFAULT_LOCALE;
}
function t(locale, path) {
  const loc = normalizeLocale(locale);
  const primary = getPath(DICT[loc], path);
  if (typeof primary === "string") return primary;
  const fallback = getPath(DICT[DEFAULT_LOCALE], path);
  return typeof fallback === "string" ? fallback : path;
}

/* ===== ViewModel (multilingual) ===== */
export default function useAboutUsViewModel({ locale = "id" } = {}) {
  const loc = normalizeLocale(locale);

  const hero = {
    title: t(loc, "hero.title"),
    description: t(loc, "hero.description"),
    ctaLabel: t(loc, "hero.ctaLabel"),
    ctaHref: "/profile",
    image: "/mascot-graduation.svg",
    bgCircle: "/latar-lingkaran.svg",
  };

  const standFor = useMemo(
    () => ({
      title: t(loc, "standFor.title"),
      subtitle: t(loc, "standFor.subtitle"),
      items: [
        {
          id: "pro",
          title: t(loc, "standFor.items.pro.title"),
          desc: t(loc, "standFor.items.pro.desc"),
          icon: Briefcase,
        },
        {
          id: "student",
          title: t(loc, "standFor.items.student.title"),
          desc: t(loc, "standFor.items.student.desc"),
          icon: GraduationCap,
        },
        {
          id: "parent",
          title: t(loc, "standFor.items.parent.title"),
          desc: t(loc, "standFor.items.parent.desc"),
          icon: Users,
        },
        {
          id: "instansi",
          title: t(loc, "standFor.items.instansi.title"),
          desc: t(loc, "standFor.items.instansi.desc"),
          icon: Building2,
        },
        {
          id: "alumni",
          title: t(loc, "standFor.items.alumni.title"),
          desc: t(loc, "standFor.items.alumni.desc"),
          icon: UserCheck,
        },
        {
          id: "komunitas",
          title: t(loc, "standFor.items.komunitas.title"),
          desc: t(loc, "standFor.items.komunitas.desc"),
          icon: UsersRound,
        },
      ],
    }),
    [loc]
  );

  // ===== Activities (from API) =====
  const [actItems, setActItems] = useState([]);
  const [actLoading, setActLoading] = useState(false);
  const [actError, setActError] = useState("");

  const fallbackActivities = useMemo(
    () => [
      {
        id: "tirta",
        title: t(loc, "activities.fallback.tirta.title"),
        image: "/tirta.svg",
        desc: t(loc, "activities.fallback.tirta.desc"),
      },
      {
        id: "jumat",
        title: t(loc, "activities.fallback.jumat.title"),
        image: "/tirta.svg",
        desc: t(loc, "activities.fallback.jumat.desc"),
      },
      {
        id: "kunjungan",
        title: t(loc, "activities.fallback.kunjungan.title"),
        image: "/tirta.svg",
        desc: t(loc, "activities.fallback.kunjungan.desc"),
      },
      {
        id: "training",
        title: t(loc, "activities.fallback.training.title"),
        image: "/tirta.svg",
        desc: t(loc, "activities.fallback.training.desc"),
      },
    ],
    [loc]
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
        p.set("sort", "sort:asc");
        p.set("locale", loc);
        p.set("fallback", DEFAULT_LOCALE);
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
          setActItems([]);
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
  }, [loc]);

  const activities = useMemo(
    () => ({
      title: t(loc, "activities.title"),
      subtitle: t(loc, "activities.subtitle"),
      items: actItems.length ? actItems : fallbackActivities,
      loading: actLoading,
      error: actError,
    }),
    [loc, actItems, actLoading, actError, fallbackActivities]
  );

  const career = {
    title: t(loc, "career.sectionTitle"),
    cardTitle: t(loc, "career.cardTitle"),
    cardBody: t(loc, "career.cardBody"),
    ctaLabel: t(loc, "career.ctaLabel"),
    topCtaLabel: t(loc, "career.topCtaLabel"),
    ctaHref: "/user/career?menu=about",
    watermark: "/images/watermark-burung.svg",
    mascot: "/images/loading.png",
  };

  return { locale: loc, hero, standFor, activities, career };
}
