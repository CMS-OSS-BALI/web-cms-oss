"use client";

import { useMemo } from "react";
import useSWR from "swr";

const fetcher = (url) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`Failed to load ${url}`);
    return r.json();
  });

/* helpers */
const strip = (html = "") =>
  String(html)
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const fmtMoney = (n, currency) => {
  if (n === null || n === undefined || n === "") return null;
  try {
    if (currency)
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: (currency || "USD").toUpperCase(),
        maximumFractionDigits: 0,
      }).format(Number(n));
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
      Number(n)
    );
  } catch {
    return String(n);
  }
};

export default function useCollegeViewModel({ locale = "id" } = {}) {
  const t = (id, en) => (locale === "en" ? en : id);

  // Ambil data kampus dari /api/partners (bilingual + fallback)
  const perPage = 100;
  const fallback = "id";
  const partnersUrl = `/api/partners?page=1&perPage=${perPage}&locale=${locale}&fallback=${fallback}`;

  const { data } = useSWR(partnersUrl, fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  const vm = useMemo(() => {
    const api = data || {};
    const rows = Array.isArray(api.data) ? api.data : [];

    // ===== Universitas untuk daftar utama (boleh pakai gambar apapun yang ada) =====
    const universities = rows.map((r, i) => {
      const name = r?.name || r?.slug || `Campus ${i + 1}`;
      const country = r?.country || "";
      const city = r?.city || "";
      const locText = [country, city].filter(Boolean).join(" - ");

      const min = fmtMoney(r?.tuition_min, r?.currency);
      const max = fmtMoney(r?.tuition_max, r?.currency);
      const moneyText =
        min && max
          ? `${min} - ${max}${r?.currency ? ` (${r.currency})` : ""}`
          : min
          ? `${min}${r?.currency ? ` (${r.currency})` : ""}`
          : max
          ? `${max}${r?.currency ? ` (${r.currency})` : ""}`
          : "";

      const bullets = [
        ...(r?.type ? [{ icon: "cap", text: r.type }] : []),
        ...(locText ? [{ icon: "pin", text: locText }] : []),
        ...(moneyText ? [{ icon: "money", text: moneyText }] : []),
      ];

      // Untuk daftar utama, tetap gunakan logo_url dulu, jika kosong boleh jatuh ke image_*
      const logo =
        r?.logo_url ||
        r?.image_url ||
        r?.image_public_url ||
        r?.logo ||
        r?.image ||
        "";

      return {
        id: r.id,
        name,
        country,
        logo,
        excerpt: strip(r?.description || ""),
        bullets,
        rating: 0,
        href: r?.slug ? `/user/partners/${r.slug}` : r?.website || "#",
      };
    });

    // ===== Relevant Campus: HANYA pakai logo_url dari endpoint =====
    const relevantCampus = rows
      // WAJIB ada logo_url string non-kosong
      .filter((r) => typeof r.logo_url === "string" && r.logo_url.trim() !== "")
      .slice(0, 16)
      .map((r) => ({
        id: r.id,
        name: r.name || r.slug || "",
        logo_url: r.logo_url.trim(), // kirim sebagai logo_url
      }));

    return {
      hero: {
        titleLine1: t("KULIAH", "STUDY"),
        titleLine2: t("DI LUAR NEGERI", "ABROAD"),
        image: "/canada-hero.svg",
        imageAlt: t("Mahasiswa wisuda", "Graduate"),
        objectPosition: "40% 50%",
      },
      findProgram: {
        title: t(
          "TEMUKAN PROGRAM KULIAH LUAR NEGERI TERBAIK UNTUKMU",
          "FIND YOUR PERFECT STUDY ABROAD PROGRAM"
        ),
      },
      popularMajors: [
        {
          id: "data-analysis",
          title: t("Data Analysis", "Data Analysis"),
          icon: "/data-analysis.svg",
        },
        {
          id: "house-keeping",
          title: t("House Keeping", "House Keeping"),
          icon: "/house-keeping.svg",
        },
        {
          id: "tataboga",
          title: t("Tataboga", "Culinary Arts"),
          icon: "/tataboga.svg",
        },
      ],
      search: {
        label: t("Pencarian", "Search"),
        placeholder: t(
          "Cari program atau universitas (mis. IT, di Kanada)",
          "Search for program or university (e.g., IT, in Canada)"
        ),
        voiceHint: t("Ucapkan untuk mencari", "Tap to speak"),
        onSearchHref: "/user/layanan?menu=layanan",
      },
      recommendedUniversity: {
        title: t("RECOMMENDED UNIVERSITY", "RECOMMENDED UNIVERSITY"),
        subtitle: t(
          "Temukan jalurmu di universitas-universitas terkemuka dunia",
          "Find Your Path At Leading Universities Worldwide"
        ),
        relevantCampus, // ← sudah hanya pakai logo_url
      },
      universities,
      scholarshipCTA: {
        title: t(
          "TEMUKAN KESEMPATAN BEASISWAMU",
          "FIND YOUR SCHOLARSHIP OPPORTUNITIES"
        ),
        body: t(
          "Jelajahi Beasiswa Luar Negeri Dan Peluang Pendanaan Bagi Mahasiswa Dari Indonesia Sepertimu. Tersedia Lebih Dari 5,000 Beasiswa Dari Berbagai Universitas Di Luar Negeri.",
          "Explore overseas scholarships and funding opportunities. 5,000+ scholarships from universities abroad."
        ),
        ctaLabel: t("View More", "View More"),
        href: "/scholarships",
      },
    };
  }, [data, locale]);

  return vm;
}
