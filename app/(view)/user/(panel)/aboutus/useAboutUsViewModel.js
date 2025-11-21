// useAboutUsViewModel.js
"use client";

import { useEffect, useMemo, useState } from "react";

/* ===== I18N ===== */
const DICT = {
  id: {
    hero: {
      title: "Tentang Kami",
      description:
        "Sejak 2022, One Step Solution (OSS) Bali telah menjadi Konsultan Pendidikan Terpercaya dan Mitra Resmi Kampus Luar Negeri. Tim profesional kami berdedikasi penuh untuk menjadi solusi satu langkah Anda menuju pendidikan dan karier internasional.",
      ctaLabel: "Profil Perusahaan",
    },
    vision: {
      title: "Visi Kami",
      statement:
        "Menjadi Konsultan Terpercaya dan Solutif bagi Generasi Muda Indonesia dalam mencapai Pendidikan dan Karier Internasional.",
    },
    mission: {
      title: "Misi Kami",
      items: [
        {
          id: "we",
          heading: "WE",
          body: "Kami memberikan layanan konsultasi gratis, mendampingi klien dalam memilih negara, kota, kampus, jurusan, karier, serta pengurusan visa yang tepat.",
          image: "/images/mission-we.svg",
        },
        {
          id: "make-you",
          heading: "MAKE YOU",
          body: "Menjadikan generasi muda Indonesia terhubung dengan peluang terbaik melalui jaringan kemitraan global kami yang kuat dan terpercaya.",
          image: "/images/mission-makeyou.svg",
        },
        {
          id: "priority",
          heading: "PRIORITY",
          body: "Memprioritaskan klien melalui solusi yang tepat dan pendekatan strategis yang berkesinambungan, memberdayakan setiap individu untuk meraih pencapaian global maksimal.",
          image: "/images/mission-priority.svg",
        },
      ],
    },
    video: {
      title: "Mengenal Lebih Dekat Dengan OSS Bali",
      url: "https://youtu.be/Py1jA2EjCmk?si=qke7rB0X2BlWXHsv",
    },

    /* ===== SUPPORT (NEW) ===== */
    support: {
      title: "Dukungan Untuk Generasi GLOBAL",
      subtitle:
        "Kami hadir untuk membekali generasi muda dengan wawasan, kesempatan, dan pengalaman internasional agar siap bersaing di dunia global.",
      items: [
        {
          id: "pelajar",
          title: "PELAJAR",
          desc: "Siswa kelas 12 dan mahasiswa(i) yang ingin melanjutkan pendidikan ke jenjang berikutnya.",
          icon: "/icons/support-student.svg",
        },
        {
          id: "alumni",
          title: "ALUMNI / UMUM",
          desc: "Individu yang telah menyelesaikan pendidikan formal/informal dan sedang mencari peluang untuk meningkatkan kualifikasi.",
          icon: "/icons/support-alumni.svg",
        },
        {
          id: "orangtua",
          title: "ORANG TUA",
          desc: "Orang tua yang proaktif mencari akses terbaik dan siap berinvestasi untuk masa depan pendidikan dan karier global anak mereka.",
          icon: "/icons/support-parents.svg",
        },
        {
          id: "profesional",
          title: "PROFESIONAL",
          desc: "Profesional yang ingin career shift, melanjutkan studi pascasarjana, atau mendapatkan pelatihan spesialis untuk bersaing di pasar kerja global.",
          icon: "/icons/support-professional.svg",
        },
        {
          id: "instansi",
          title: "INSTANSI",
          desc: "Menghubungkan instansi lokal/global untuk program kerjasama, pertukaran akademik, dan peningkatan mutu pendidikan & relevansi global institusi.",
          icon: "/icons/support-institution.svg",
        },
        {
          id: "komunitas",
          title: "KOMUNITAS",
          desc: "Kelompok masyarakat/organisasi pemuda yang fokus pengembangan kapasitas anggota melalui program studi banding dan tur.",
          icon: "/icons/support-community.svg",
        },
      ],
    },

    activities: {
      title: "OUR ACTIVITY",
      subtitle:
        "Kegiatan kami dirancang untuk memperkuat karakter, kompetensi, dan koneksi—modal utama menuju masa depan global yang berdaya.",
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
      title: "About Us",
      description:
        "Since 2022, One Step Solution (OSS) Bali has been a trusted education consultant and an official partner of overseas universities. Our professional team is fully dedicated to being your one-step solution toward international education and career.",
      ctaLabel: "Company Profile",
    },
    vision: {
      title: "Our Vision",
      statement:
        "To be a trusted and solution-oriented consultant for Indonesia’s young generation in achieving international education and careers.",
    },
    mission: {
      title: "Our Mission",
      items: [
        {
          id: "we",
          heading: "WE",
          body: "We provide free consultation services, guiding clients to choose the right country, city, university, major, career path, and visa process.",
          image: "/images/mission-we.svg",
        },
        {
          id: "make-you",
          heading: "MAKE YOU",
          body: "Connecting Indonesia’s young generation with the best opportunities through our strong and trusted global partnerships.",
          image: "/images/mission-makeyou.svg",
        },
        {
          id: "priority",
          heading: "PRIORITY",
          body: "We prioritise clients through precise solutions and continuous strategic approaches, empowering each individual to achieve their maximum global potential.",
          image: "/images/mission-priority.svg",
        },
      ],
    },
    video: {
      title: "Get to Know OSS Bali Better",
      url: "https://youtu.be/Py1jA2EjCmk?si=qke7rB0X2BlWXHsv",
    },

    support: {
      title: "Support for the GLOBAL Generation",
      subtitle:
        "We equip young people with international exposure, opportunities, and experiences to compete confidently in the global arena.",
      items: [
        {
          id: "students",
          title: "STUDENTS",
          desc: "High school seniors and undergraduates planning to continue to the next academic level.",
          icon: "/icons/support-student.svg",
        },
        {
          id: "alumni",
          title: "ALUMNI / GENERAL",
          desc: "Individuals who have completed formal/informal education and seek opportunities to upgrade their qualifications.",
          icon: "/icons/support-alumni.svg",
        },
        {
          id: "parents",
          title: "PARENTS",
          desc: "Proactive parents seeking the best access and ready to invest in their child’s global education and career.",
          icon: "/icons/support-parents.svg",
        },
        {
          id: "professionals",
          title: "PROFESSIONALS",
          desc: "Professionals aiming for a career shift, postgraduate study, or specialist training to compete globally.",
          icon: "/icons/support-professional.svg",
        },
        {
          id: "institutions",
          title: "INSTITUTIONS",
          desc: "Linking local/global institutions for partnerships, academic exchanges, and quality improvement aligned with global relevance.",
          icon: "/icons/support-institution.svg",
        },
        {
          id: "communities",
          title: "COMMUNITIES",
          desc: "Community groups/youth organizations focusing on capacity building via study tours and exchange programs.",
          icon: "/icons/support-community.svg",
        },
      ],
    },

    activities: {
      title: "OUR ACTIVITY",
      subtitle:
        "Our programs are designed to strengthen character, competence, and connections—the essentials for an empowered global future.",
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

const DEFAULT_LOCALE = "id";
const SUPPORTED = Object.keys(DICT);
const normalize = (l) => {
  const v = (l || "").toLowerCase().slice(0, 2);
  return SUPPORTED.includes(v) ? v : DEFAULT_LOCALE;
};
const pick = (loc, path) =>
  path.split(".").reduce((o, k) => (o ? o[k] : undefined), DICT[loc]);

/* ================= ViewModel ================= */
export default function useAboutUsViewModel({ locale = "id" } = {}) {
  const loc = normalize(locale);

  const hero = {
    title: pick(loc, "hero.title"),
    description: pick(loc, "hero.description"),
    ctaLabel: pick(loc, "hero.ctaLabel"),
    ctaHref: "/profile",
    image: "/mascot-graduation.svg",
    bgCircle: "/latar-lingkaran.svg",
  };

  const vision = useMemo(
    () => ({
      title: pick(loc, "vision.title"),
      statement: pick(loc, "vision.statement"),
    }),
    [loc]
  );

  const mission = useMemo(
    () => ({
      title: pick(loc, "mission.title"),
      items: pick(loc, "mission.items") || [],
    }),
    [loc]
  );

  const video = useMemo(
    () => ({ title: pick(loc, "video.title"), url: pick(loc, "video.url") }),
    [loc]
  );

  const support = useMemo(
    () => ({
      title: pick(loc, "support.title"),
      subtitle: pick(loc, "support.subtitle"),
      items: pick(loc, "support.items") || [],
    }),
    [loc]
  );

  // Activities (optional fetch)
  const [actItems, setActItems] = useState([]);
  const [actLoading, setActLoading] = useState(false);
  const [actError, setActError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      setActLoading(true);
      setActError("");
      try {
        const p = new URLSearchParams({
          page: "1",
          perPage: "8",
          sort: "sort:asc",
          locale: loc,
          fallback: DEFAULT_LOCALE,
          is_published: "1",
        });
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
    })();
    return () => {
      alive = false;
    };
  }, [loc]);

  const activities = useMemo(
    () => ({
      title: pick(loc, "activities.title"),
      subtitle: pick(loc, "activities.subtitle"),
      items: actItems,
      loading: actLoading,
      error: actError,
    }),
    [loc, actItems, actLoading, actError]
  );

  const career = {
    title: pick(loc, "career.sectionTitle"),
    cardTitle: pick(loc, "career.cardTitle"),
    cardBody: pick(loc, "career.cardBody"),
    ctaLabel: pick(loc, "career.ctaLabel"),
    topCtaLabel: pick(loc, "career.topCtaLabel"),
    ctaHref: "/user/career?menu=about",
    watermark: "/images/watermark-burung.svg",
    mascot: "/images/loading.png",
  };

  return {
    locale: loc,
    hero,
    vision,
    mission,
    video,
    support,
    activities,
    career,
  };
}
