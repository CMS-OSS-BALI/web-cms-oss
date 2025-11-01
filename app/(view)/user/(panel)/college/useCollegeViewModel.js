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

  const collegeUrl = useMemo(() => {
    const p = new URLSearchParams();
    p.set("page", "1");
    p.set("perPage", String(perPage));
    p.set("locale", locale);
    p.set("fallback", "id");
    if (q) p.set("q", q);
    if (country) p.set("country", country);
    return `/api/college?${p.toString()}`;
  }, [locale, q, country, perPage]);

  const { data, error, isLoading } = useSWR(collegeUrl, fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  const vm = useMemo(() => {
    const rows = Array.isArray(data?.data) ? data.data : [];

    const universities = rows.map((r, i) => {
      const name = r?.name || r?.slug || `Campus ${i + 1}`;
      const country = r?.country || "";
      const city = r?.city || "";
      const locText = [country, city].filter(Boolean).join(" - ");

      const min = fmtMoney(r?.tuition_min, r?.currency);
      const max = fmtMoney(r?.tuition_max, r?.currency);
      const moneyText =
        min && max ? `${min} - ${max}` : min ? `${min}` : max ? `${max}` : "";

      // >>> Ganti type -> jenjang (ditampilkan dengan ikon 'cap')
      const jenjangText = (r?.jenjang || "").toString().trim();

      const bullets = [
        ...(jenjangText ? [{ icon: "cap", text: jenjangText }] : []),
        ...(locText ? [{ icon: "pin", text: locText }] : []),
        ...(moneyText ? [{ icon: "money", text: moneyText }] : []),
      ];

      return {
        id: r.id,
        name,
        country,
        logo_url: r?.logo_url || "",
        excerpt: strip(r?.description || ""),
        bullets,
        href: r?.slug ? `/user/college/${r.slug}` : r?.website || "#",
      };
    });

    const relevantCampus = rows
      .filter((r) => typeof r.logo_url === "string" && r.logo_url.trim() !== "")
      .slice(0, 16)
      .map((r) => ({
        id: r.id,
        name: r.name || r.slug || "",
        logo_url: r.logo_url.trim(),
      }));

    return {
      loading: isLoading,
      error: error ? error?.message || "Failed to load colleges" : "",
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
      // voiceHint dihapus karena microphone dihilangkan
      search: {
        label: t("Pencarian", "Search"),
        placeholder: t(
          "Cari program atau universitas (mis. IT, di Kanada)",
          "Search for program or university (e.g., IT, in Canada)"
        ),
        onSearchHref: "/user/layanan?menu=layanan",
      },
      recommendedUniversity: {
        title: t("RECOMMENDED UNIVERSITY", "RECOMMENDED UNIVERSITY"),
        subtitle: t(
          "Temukan jalurmu di universitas-universitas terkemuka dunia",
          "Find Your Path At Leading Universities Worldwide"
        ),
        relevantCampus,
      },
      universities,

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
  }, [data, error, isLoading, locale]);

  return vm;
}
