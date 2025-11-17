"use client";

import useSWR from "swr";
import { useMemo } from "react";

const fetcher = (url) =>
  fetch(url, { cache: "no-store" }).then(async (r) => {
    if (!r.ok)
      throw new Error(
        (await r.text().catch(() => "")) || `Request failed: ${r.status}`
      );
    return r.json();
  });

const PLACEHOLDER =
  "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=1200&auto=format&fit=crop";

const t = (locale, id, en) => (locale === "en" ? en : id);

const CATEGORY_SLUG = "english-course";

const normalizeLocale = (value) => {
  const raw = String(value || "")
    .trim()
    .toLowerCase();
  if (raw.startsWith("en")) return "en";
  return "id";
};

const normalizeServiceType = (value) => {
  const upper = String(value || "")
    .trim()
    .toUpperCase();
  return upper === "B2B" || upper === "B2C" ? upper : undefined;
};

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

  if (n.includes("intensive"))
    return F(
      [
        "20x Pertemuan",
        "Jadwal fleksibel ditentukan siswa",
        "1 Siswa 1 Guru",
        "Guru kompeten dan bersertifikat",
      ],
      [
        "20 Sessions",
        "Student-picked flexible schedule",
        "1 Student 1 Tutor",
        "Qualified & certified tutor",
      ]
    );

  if (n.includes("group"))
    return F(
      [
        "20x Pertemuan",
        "Min. 3 siswa per kelas",
        "Bisa diskusi tugas sekolah",
        "Membahas kisi-kisi UAS",
      ],
      [
        "20 Sessions",
        "Min. 3 students per class",
        "School homework discussion",
        "Covers exam preparation",
      ]
    );

  if (n.includes("ielts"))
    return F(
      [
        "30x Pertemuan",
        "1 Siswa 1 Guru",
        "Jadwal fleksibel ditentukan siswa",
        "Fokus persiapan tes IELTS",
      ],
      [
        "30 Sessions",
        "1 Student 1 Tutor",
        "Student-picked flexible schedule",
        "Focused IELTS preparation",
      ]
    );

  if (n.includes("profesional") || n.includes("professional"))
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

  return fallback;
}

/** Selalu ambil kategori 'english-course' saja. */
export default function useEnglishCViewModel({
  locale = "id",
  serviceType = "B2C",
} = {}) {
  const LEAD_URL = "/user/leads";
  const safeLocale = normalizeLocale(locale);
  const safeServiceType = normalizeServiceType(serviceType);
  const fallbackLocale = safeLocale === "en" ? "id" : "en";

  const hero = useMemo(
    () => ({
      title: t(safeLocale, "Kursus Bahasa Inggris", "English Course"),
      subtitle: t(
        safeLocale,
        "Raih skor terbaik TOEFL/IELTS Anda melalui bimbingan intensif dan materi belajar yang terstruktur.",
        "Reach your best TOEFL/IELTS score with intensive guidance and structured learning materials."
      ),
      bullets: [
        {
          id: "free-consult",
          label: t(safeLocale, "1 Siswa 1 Guru", "1 Student 1 Tutor"),
        },
        {
          id: "flex",
          label: t(
            safeLocale,
            "Akses materi lewat LMS",
            "Learning materials on LMS"
          ),
        },
      ],
      illustration: "/buku.svg",
    }),
    [safeLocale]
  );

  // Copy deskripsi disesuaikan dengan tone promosi kelas
  const description = t(
    safeLocale,
    "Layanan kursus Bahasa Inggris di OSS Bali dirancang untuk membantu peserta meningkatkan kemampuan berbahasa Inggris, baik untuk keperluan akademik, profesional, maupun komunikasi sehari-hari. Program ini mencakup berbagai tingkat kemampuan, dari pemula hingga lanjutan, dengan metode pengajaran yang interaktif dan berbasis kebutuhan peserta. Program kursus kami juga mencakup persiapan berbagai jenis tes seperti IELTS, TOEFL, TOEIC, PTE, Duolingo, CAE, IPT, dan lainnya.",
    "OSS Bali's English course is designed to help learners improve their English for academic, professional, and everyday communication. It covers all levels—from beginner to advanced—with interactive, needs-based teaching. Our program also includes preparation for major tests such as IELTS, TOEFL, TOEIC, PTE, Duolingo, CAE, IPT, and more."
  );

  const servicesKey = useMemo(() => {
    const p = new URLSearchParams({
      published: "true",
      perPage: "100",
      sort: "price:asc",
      locale: safeLocale,
      fallback: fallbackLocale,
      category_slug: CATEGORY_SLUG,
    });
    if (safeServiceType) p.set("service_type", safeServiceType);
    return `/api/services?${p.toString()}`;
  }, [safeLocale, safeServiceType, fallbackLocale]);

  const { data, error, isLoading, mutate } = useSWR(servicesKey, fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
    dedupingInterval: 2000,
    keepPreviousData: true,
  });

  const packages = useMemo(() => {
    const rows = Array.isArray(data?.data) ? data.data : [];
    const filtered = rows.filter(
      (item) => item?.category?.slug === CATEGORY_SLUG
    );
    return filtered.map((p) => {
      const ver = p.updated_at ? `?v=${new Date(p.updated_at).getTime()}` : "";
      const base =
        p.image_resolved_url ||
        p.image_public_url ||
        p.image_url ||
        PLACEHOLDER;
      const imgSrc =
        typeof base === "string" && base.includes("token=") ? base : base + ver;

      const rawName = p.name || "";
      const n = rawName.toLowerCase();
      let title = rawName || t(safeLocale, "(Tanpa judul)", "(No title)");

      // Normalisasi judul supaya konsisten dengan desain
      if (n.includes("intensive")) {
        title = t(safeLocale, "INTENSIVE CLASS", "INTENSIVE CLASS");
      } else if (n.includes("group")) {
        title = t(safeLocale, "GROUP CLASS", "GROUP CLASS");
      }

      return {
        id: p.id,
        price: Number(p.price ?? 0),
        title,
        image: imgSrc,
        desc: p.description || "",
        benefits: getBenefitsByName(rawName, safeLocale),
        cta: {
          label: t(safeLocale, "Daftar Sekarang", "Enroll Now"),
          href: LEAD_URL,
        },
      };
    });
  }, [data, safeLocale]);

  return {
    hero,
    description,
    packages,
    loading: isLoading,
    error: error?.message || "",
    refresh: mutate,
  };
}
