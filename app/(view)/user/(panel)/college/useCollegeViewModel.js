"use client";

import { useMemo } from "react";
import useSWR from "swr";

const fetcher = (url) =>
  fetch(url, { headers: { "cache-control": "no-store" } }).then((r) => {
    if (!r.ok) throw new Error(`Failed to load ${url} (${r.status})`);
    return r.json();
  });

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
    return new Intl.NumberFormat("en-US", {
      style: currency ? "currency" : "decimal",
      currency: (currency || "USD").toUpperCase(),
      maximumFractionDigits: 0,
    }).format(Number(n));
  } catch {
    return String(n);
  }
};

export default function useCollegeViewModel({
  locale = "id",
  q = "",
  country = "",
  perPage = 100,
} = {}) {
  const t = (id, en) => (locale === "en" ? en : id);

  /* --------- build URLs --------- */
  const collegeUrl = useMemo(() => {
    const p = new URLSearchParams();
    p.set("page", "1");
    p.set("perPage", String(perPage));
    p.set("locale", locale);
    p.set("fallback", "id");
    if (country) p.set("country", country);
    // jangan kirim q ke /college — filter kampus dilakukan dari jurusan/prodi
    return `/api/college?${p.toString()}`;
  }, [locale, country, perPage]);

  const jurusanUrl = useMemo(() => {
    if (!q || !q.trim()) return null;
    const p = new URLSearchParams();
    p.set("page", "1");
    p.set("perPage", "1000");
    p.set("q", q.trim());
    p.set("locale", locale);
    p.set("fallback", "id");
    return `/api/jurusan?${p.toString()}`;
  }, [locale, q]);

  const prodiUrl = useMemo(() => {
    if (!q || !q.trim()) return null;
    const p = new URLSearchParams();
    p.set("page", "1");
    p.set("perPage", "1000");
    p.set("q", q.trim());
    p.set("locale", locale);
    p.set("fallback", "id");
    return `/api/prodi?${p.toString()}`;
  }, [locale, q]);

  /* --------- fetch --------- */
  const {
    data: collegeData,
    error: collegeErr,
    isLoading: loadingCollege,
  } = useSWR(collegeUrl, fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  const {
    data: jurusanData,
    error: jurusanErr,
    isLoading: loadingJurusan,
  } = useSWR(jurusanUrl, jurusanUrl ? fetcher : null, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  const {
    data: prodiData,
    error: prodiErr,
    isLoading: loadingProdi,
  } = useSWR(prodiUrl, prodiUrl ? fetcher : null, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  /* --------- shape colleges -> universities VM --------- */
  const rows = Array.isArray(collegeData?.data) ? collegeData.data : [];

  const baseUniversities = rows.map((r, i) => {
    const name = r?.name || r?.slug || `Campus ${i + 1}`;
    const countryVal = r?.country || "";
    const city = r?.city || "";
    const locText = [countryVal, city].filter(Boolean).join(" - ");

    const min = fmtMoney(r?.tuition_min, r?.currency);
    const max = fmtMoney(r?.tuition_max, r?.currency);
    const moneyText =
      min && max ? `${min} - ${max}` : min ? `${min}` : max ? `${max}` : "";

    // jenjang (bukan "type")
    const jenjangText = (r?.jenjang || "").toString().trim();

    const bullets = [
      ...(jenjangText ? [{ icon: "cap", text: jenjangText }] : []),
      ...(locText ? [{ icon: "pin", text: locText }] : []),
      ...(moneyText ? [{ icon: "money", text: moneyText }] : []),
    ];

    return {
      id: r.id,
      name,
      country: countryVal,
      logo_url: r?.logo_url || "",
      excerpt: strip(r?.description || ""),
      bullets,
      href: r?.slug ? `/user/college/${r.slug}` : r?.website || "#",
    };
  });

  /* --------- relevant campus (logo) --------- */
  const relevantCampus = rows
    .filter((r) => typeof r.logo_url === "string" && r.logo_url.trim() !== "")
    .slice(0, 16)
    .map((r) => ({
      id: r.id,
      name: r.name || r.slug || "",
      logo_url: r.logo_url.trim(),
    }));

  /* --------- jurusan/prodi match -> filter colleges --------- */
  const jpMatchMap = new Map(); // college_id -> { jurusan:[], prodi:[] }
  if (Array.isArray(jurusanData?.data)) {
    for (const j of jurusanData.data) {
      const cId = j?.college_id || j?.collegeId || j?.kampus_id;
      if (!cId) continue;
      const entry = jpMatchMap.get(String(cId)) || { jurusan: [], prodi: [] };
      if (j?.name) entry.jurusan.push(j.name);
      jpMatchMap.set(String(cId), entry);
    }
  }
  if (Array.isArray(prodiData?.data)) {
    for (const p of prodiData.data) {
      const cId =
        p?.college_id ||
        p?.collegeId ||
        p?.kampus_id ||
        p?.kampusId ||
        p?.college;
      if (!cId) continue;
      const entry = jpMatchMap.get(String(cId)) || { jurusan: [], prodi: [] };
      if (p?.name) entry.prodi.push(p.name);
      jpMatchMap.set(String(cId), entry);
    }
  }

  const hasQuery = Boolean(q && q.trim());
  const universities = hasQuery
    ? baseUniversities.filter((u) => jpMatchMap.has(String(u.id)))
    : baseUniversities;

  /* --------- recommended section copy --------- */
  const recommendedUniversity = {
    title: t("RECOMMENDED UNIVERSITY", "RECOMMENDED UNIVERSITY"),
    subtitle: t(
      "Temukan jalurmu di universitas-universitas terkemuka dunia",
      "Find Your Path At Leading Universities Worldwide"
    ),
    relevantCampus,
  };

  return {
    loading:
      loadingCollege || (hasQuery && (loadingJurusan || loadingProdi)) || false,
    error:
      collegeErr?.message || jurusanErr?.message || prodiErr?.message || "",

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
        "Cari program/jurusan atau universitas (mis. Informatika, Kanada)",
        "Find a program/major or university (e.g., Computer Science, Canada)"
      ),
      onSearchHref: "/user/layanan?menu=layanan",
    },

    recommendedUniversity,
    universities,

    // Untuk badge match di kartu kampus
    jpMatchesByCollegeId: Object.fromEntries(jpMatchMap),

    // CTA Beasiswa (aman jika tak dipakai)
    scholarshipCTA: {
      title: t(
        "TEMUKAN KESEMPATAN BEASISWAMU",
        "DISCOVER YOUR SCHOLARSHIP OPPORTUNITIES"
      ),
      body: t(
        "Jelajahi beasiswa luar negeri dan peluang pendanaan bagi mahasiswa dari Indonesia sepertimu. Tersedia lebih dari 5.000 beasiswa dari berbagai universitas di luar negeri.",
        "Explore overseas scholarships and funding opportunities for Indonesian students like you. Access 5,000+ scholarships from universities worldwide."
      ),
      ctaLabel: t("Lihat selengkapnya", "Learn more"),
      href: "/user/blog",
    },
  };
}
