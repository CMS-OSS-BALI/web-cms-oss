"use client";

import useSWR from "swr";
import { useMemo } from "react";

/* ============== tiny utils ============== */
const fetcher = (url) =>
  fetch(url, { cache: "no-store" }).then(async (r) => {
    if (!r.ok) {
      const t = await r.text().catch(() => "");
      throw new Error(t || `Request failed: ${r.status}`);
    }
    return r.json();
  });

const PLACEHOLDER =
  "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=1200&auto=format&fit=crop";

const t = (locale, id, en) => (locale === "en" ? en : id);

/* ============== helper: benefits by name ============== */
function getBenefitsByName(name, locale) {
  const n = String(name || "")
    .toLowerCase()
    .trim();

  const F = (idArr, enArr) => (locale === "en" ? enArr : idArr);

  const fallback = F(
    [
      "20x Pertemuan",
      "Jadwal fleksibel",
      "Mentor berpengalaman",
      "Materi terstruktur",
    ],
    [
      "20 Sessions",
      "Flexible schedule",
      "Experienced mentor",
      "Structured materials",
    ]
  );

  if (n.includes("intensive")) {
    return F(
      [
        "20x Pertemuan",
        "Jadwal fleksibel ditentukan siswa",
        "1 Siswa 1 Guru",
        "Guru kompeten & bersertifikat",
      ],
      [
        "20 Sessions",
        "Student-picked flexible schedule",
        "1 Student 1 Tutor",
        "Qualified & certified tutor",
      ]
    );
  } else if (n.includes("group")) {
    return F(
      [
        "20x Pertemuan",
        "Min. 3 siswa per kelas",
        "Bisa diskusi tugas sekolah",
        "Membahas Kisi-kisi UAS",
      ],
      [
        "20 Sessions",
        "Min. 3 students/class",
        "Homework discussion welcome",
        "Covers school exam grids",
      ]
    );
  } else if (n.includes("ielts")) {
    return F(
      [
        "30x Pertemuan",
        "1 Siswa 1 Guru",
        "Jadwal fleksibel ditentukan siswa",
        "Target skor terukur (IELTS)",
      ],
      [
        "30 Sessions",
        "1 Student 1 Tutor",
        "Student-picked flexible schedule",
        "Measured target (IELTS)",
      ]
    );
  } else if (n.includes("profesional") || n.includes("professional")) {
    return F(
      [
        "20x Pertemuan",
        "Jadwal fleksibel ditentukan siswa",
        "Materi level profesional",
        "Pengajar berpengalaman industri",
      ],
      [
        "20 Sessions",
        "Student-picked flexible schedule",
        "Professional-level materials",
        "Industry-experienced instructors",
      ]
    );
  }
  return fallback;
}

/* ============== ViewModel ============== */
export default function useEnglishCViewModel({ locale = "id" } = {}) {
  const LEAD_URL = "/user/leads";

  const hero = useMemo(
    () => ({
      title: t(locale, "KURSUS BAHASA INGGRIS", "ENGLISH COURSE"),
      subtitle: t(
        locale,
        "Raih skor TOEFL/IELTS terbaikmu dengan pendampingan intensif dan materi terstruktur.",
        "Achieve your best TOEFL/IELTS score with intensive guidance and structured materials."
      ),
      bullets: [
        {
          id: "free-consult",
          label: t(locale, "Konsultasi Gratis", "Free Consultation"),
        },
        {
          id: "flex",
          label: t(locale, "Jadwal Fleksibel", "Flexible Schedule"),
        },
      ],
      whatsapp: {
        label: t(locale, "Chat Konsultan", "Chat Consultant"),
        href: LEAD_URL,
      },
      illustration: "/buku.svg",
    }),
    [locale]
  );

  const description = t(
    locale,
    "English Course OSS Bali membantu kamu meningkatkan kemampuan bahasa Inggris untuk studi dan kerja—mulai dari dasar, komunikasi harian, hingga persiapan TOEFL/IELTS. Belajar dengan materi terstruktur, jadwal fleksibel, dan pendampingan tutor berpengalaman agar progresmu terasa setiap pertemuan.",
    "OSS Bali’s English Course helps you improve English for study and work—from basics and daily communication to TOEFL/IELTS prep. Learn with structured materials, flexible schedules, and experienced tutors so you make progress every session."
  );

  const params = new URLSearchParams({
    program_category: "LANGUAGE_COURSE",
    published: "true",
    perPage: "100",
    sort: "price:asc",
    locale, // ← localized content
    fallback: "id",
    public: "1",
  });

  const { data, error, isLoading, mutate } = useSWR(
    `/api/programs?${params.toString()}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  // Map API → UI packages
  const packages = useMemo(() => {
    const rows = data?.data || [];
    return rows.map((p) => {
      const ver = p.updated_at ? `?v=${new Date(p.updated_at).getTime()}` : "";
      const imgSrc = (p.image_public_url || p.image_url || PLACEHOLDER) + ver;

      return {
        id: p.id,
        price: Number(p.price ?? 0),
        title: p.name || t(locale, "(Tanpa judul)", "(No title)"),
        image: imgSrc,
        desc: p.description || "",
        benefits: getBenefitsByName(p.name, locale),
        icon: "/tutoring.svg",
        cta: {
          label: t(locale, "Daftar Sekarang", "Enroll Now"),
          href: LEAD_URL,
        },
      };
    });
  }, [data, locale]);

  return {
    hero,
    description,
    packages,
    loading: isLoading,
    error: error?.message || "",
    refresh: mutate,
  };
}
