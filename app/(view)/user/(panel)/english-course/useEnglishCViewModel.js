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

/* ============== helper: benefits by name ============== */
function getBenefitsByName(name) {
  const n = String(name || "")
    .toLowerCase()
    .trim();

  const fallback = [
    "20x Pertemuan",
    "Jadwal fleksibel",
    "Mentor berpengalaman",
    "Materi terstruktur",
  ];

  if (n.includes("intensive")) {
    return [
      "20x Pertemuan",
      "Jadwal fleksibel ditentukan siswa",
      "1 Siswa 1 Guru",
      "Guru kompeten & bersertifikat",
    ];
  } else if (n.includes("group")) {
    return [
      "20x Pertemuan",
      "Min. 3 siswa per kelas",
      "Bisa diskusi tugas sekolah",
      "Membahas Kisi-kisi UAS",
    ];
  } else if (n.includes("ielts")) {
    return [
      "30x Pertemuan",
      "1 Siswa 1 Guru",
      "Jadwal fleksibel ditentukan siswa",
      "Guaranteed target (IELTS)",
    ];
  } else if (n.includes("profesional") || n.includes("professional")) {
    return [
      "20x Pertemuan",
      "Jadwal fleksibel ditentukan siswa",
      "Materi level profesional",
      "Pengajar berpengalaman industri",
    ];
  }
  return fallback;
}

/* ============== ViewModel ============== */
export default function useEnglishCViewModel() {
  // URL tujuan lead (bisa diganti ke env/relative path sesuai kebutuhan)
  const LEAD_URL = "/user/leads";

  const hero = useMemo(
    () => ({
      title: "ENGLISH COURSE",
      subtitle:
        "Achieve your best TOEFL/IELTS score with intensive guidance and structured materials.",
      bullets: [
        { id: "free-consult", label: "Konsultasi Gratis" },
        { id: "flex", label: "Jadwal Fleksibel" },
      ],
      whatsapp: {
        label: "Chat Konsultan",
        href: LEAD_URL, // ⬅️ arahkan ke halaman leads
      },
      illustration: "/buku.svg",
    }),
    []
  );

  const description =
    "English Course OSS Bali membantu kamu meningkatkan kemampuan bahasa Inggris untuk studi dan kerja—mulai dari dasar, komunikasi harian, hingga persiapan TOEFL/IELTS. Belajar dengan materi terstruktur, jadwal fleksibel, dan pendampingan tutor berpengalaman agar progresmu terasa setiap pertemuan.";

  const params = new URLSearchParams({
    program_category: "LANGUAGE_COURSE",
    published: "true",
    perPage: "100",
    sort: "price:asc",
    locale: "id",
    fallback: "id",
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
        title: p.name || "(No title)",
        image: imgSrc,
        desc: p.description || "",
        benefits: getBenefitsByName(p.name),
        icon: "/tutoring.svg",
        cta: {
          label: "Daftar Sekarang",
          href: LEAD_URL, // ⬅️ arahkan ke halaman leads
          // Jika mau kirim konteks program, bisa gunakan query string:
          // href: `${LEAD_URL}?program_id=${encodeURIComponent(p.id)}&program_name=${encodeURIComponent(p.name || "")}`
        },
      };
    });
  }, [data]);

  return {
    hero,
    description,
    packages,
    loading: isLoading,
    error: error?.message || "",
    refresh: mutate,
  };
}
