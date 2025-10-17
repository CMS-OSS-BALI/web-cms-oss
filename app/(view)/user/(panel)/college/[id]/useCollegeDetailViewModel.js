"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/swr/fetcher";

/* =========================
   Helpers & Constants
========================= */
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

const FALLBACK_HERO =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='1600' height='900'>
      <defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'>
        <stop offset='0%' stop-color='#0b4da6' stop-opacity='0.55'/>
        <stop offset='100%' stop-color='#0b2f74' stop-opacity='0.55'/>
      </linearGradient></defs>
      <rect width='100%' height='100%' fill='url(#g)'/>
    </svg>`
  );

const FALLBACK_LOGO =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='140'>
      <rect x='1' y='1' width='398' height='138' rx='16' fill='#ffffff' stroke='#e5e7eb'/>
      <text x='200' y='78' text-anchor='middle' dominant-baseline='middle'
            font-family='Poppins, Arial, sans-serif' font-weight='700' font-size='22' fill='#0B2F74'>
        LOGO
      </text>
    </svg>`
  );

const SWR_OPTS = { revalidateOnFocus: false, shouldRetryOnError: false };

const normalizeLocale = (v, fb = "id") => {
  const raw = String(v ?? "")
    .trim()
    .toLowerCase();
  if (!raw) return fb;
  if (raw.startsWith("en")) return "en";
  if (raw.startsWith("id")) return "id";
  return fb;
};

const normalizeId = (value) => {
  const s =
    typeof value === "string"
      ? value.trim()
      : value != null
      ? String(value).trim()
      : "";
  return s && s !== "undefined" && s !== "null" ? s : "";
};

const COUNTRY_ASSETS = [
  { match: ["australia"], flag: "/flags/au.svg", cover: "/aus-campus.svg" },
  { match: ["canada"], flag: "/flags/ca.svg", cover: "/can-campus.svg" },
  {
    match: ["united kingdom", "uk", "england", "great britain", "britain"],
    flag: "/flags/gb.svg",
    cover: "/uk-campus.svg",
  },
];

const pickCountryAsset = (countryName = "") => {
  const c = countryName.toLowerCase();
  const found =
    COUNTRY_ASSETS.find((x) => x.match.some((m) => c.includes(m))) || null;
  return {
    flag: found?.flag || "/flags/gb.svg",
    cover: found?.cover || FALLBACK_HERO,
  };
};

const buildQuery = (obj = {}) => {
  const p = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
  });
  return p.toString();
};

// Nama program bisa beda-beda; ini fallback aman
const pickName = (it) =>
  it?.name ??
  it?.nama ??
  it?.title ??
  it?.program_name ??
  it?.programName ??
  "";

// Param filter untuk /api/prodi
const PRODI_PARAM = "jurusan_id";

// Ambil ID jurusan dengan beberapa kemungkinan nama field
const getJurusanId = (j) =>
  j?.id ??
  j?.jurusan_id ??
  j?.jurusanId ??
  j?.department_id ??
  j?.departmentId ??
  null;

/* =========================
   Hook
========================= */
export default function useCollegeDetailViewModel({ id, locale = "id" } = {}) {
  const safeId = normalizeId(id);
  const activeLocale = normalizeLocale(locale, "id");
  const fallbackLocale = "id";

  // 1) DETAIL
  const detailUrl = useMemo(() => {
    if (!safeId) return null;
    return `/api/college/${encodeURIComponent(safeId)}?${buildQuery({
      locale: activeLocale,
      fallback: fallbackLocale,
    })}`;
  }, [safeId, activeLocale]);

  const {
    data: college,
    error: resolveErr,
    isLoading: loadingCollege,
  } = useSWR(detailUrl, fetcher, SWR_OPTS);

  // 2) JURUSAN
  const jurusanUrl = useMemo(() => {
    if (!college?.id) return null;
    return `/api/jurusan?${buildQuery({
      page: 1,
      perPage: 1000,
      locale: activeLocale,
      fallback: fallbackLocale,
      college_id: college.id,
      public: 1,
    })}`;
  }, [college?.id, activeLocale]);

  const {
    data: jurusanRes,
    error: jurusanErr,
    isLoading: loadingJurusan,
  } = useSWR(jurusanUrl, fetcher, SWR_OPTS);

  const jurusanList = Array.isArray(jurusanRes?.data) ? jurusanRes.data : [];

  // KUMPULKAN ID JURUSAN
  const jurusanIds = useMemo(
    () =>
      jurusanList
        .map((j) => getJurusanId(j))
        .filter((x) => typeof x === "string" && x.trim().length > 0),
    [jurusanList]
  );

  // 3) PRODI per jurusan — FIX: fetcher menerima array key sebagai 1 argumen
  const prodiKey = useMemo(() => {
    if (!jurusanIds.length) return null;
    return ["prodi-by-jurusan", JSON.stringify(jurusanIds), activeLocale];
  }, [jurusanIds, activeLocale]);

  const { data: prodiMapRes, error: prodiErr } = useSWR(
    prodiKey,
    // SWR passes the whole array as the first argument
    async (key) => {
      const [_, idsJSON, loc] = Array.isArray(key)
        ? key
        : [null, "[]", activeLocale];
      const ids = JSON.parse(idsJSON || "[]");
      const reqLocale = normalizeLocale(loc, "id");

      const results = await Promise.all(
        ids.map((jurusanId) =>
          fetcher(
            `/api/prodi?${buildQuery({
              page: 1,
              perPage: 1000,
              locale: reqLocale,
              fallback: fallbackLocale,
              [PRODI_PARAM]: jurusanId,
            })}`
          ).catch(() => ({ data: [] }))
        )
      );

      return results.reduce((acc, r, i) => {
        const items = Array.isArray(r?.data) ? r.data : [];
        acc[ids[i]] = items.map(pickName).filter(Boolean);
        return acc;
      }, {});
    },
    SWR_OPTS
  );
  const prodiMap = prodiMapRes || {};

  // 4) REQUIREMENTS
  const requirementsUrl = useMemo(() => {
    if (!college?.id) return null;
    return `/api/college/${encodeURIComponent(
      college.id
    )}/requirements?${buildQuery({
      locale: activeLocale,
      fallback: fallbackLocale,
    })}`;
  }, [college?.id, activeLocale]);

  const {
    data: reqRes,
    error: reqErr,
    isLoading: loadingReq,
  } = useSWR(requirementsUrl, fetcher, SWR_OPTS);

  const requirements = Array.isArray(reqRes?.data)
    ? reqRes.data.map((r) => r?.text).filter(Boolean)
    : [];

  /* ----- hero ----- */
  const countryName = (college?.country || "").trim();
  const { flag, cover } = pickCountryAsset(countryName);

  const hero = {
    name: college?.name || "College",
    cover,
    logo:
      typeof college?.logo_url === "string" && college.logo_url.trim()
        ? college.logo_url
        : FALLBACK_LOGO,
    websiteText: college?.website
      ? String(college.website).replace(/^https?:\/\//, "")
      : "",
    objectPosition: "50% 50%",
    flagSrc: flag,
    countryName,
  };

  /* ----- sections ----- */
  const faculties = jurusanList.map((j) => {
    const jid = getJurusanId(j);
    return {
      id: jid || undefined,
      title: j?.name || j?.nama || "-",
      items: prodiMap[jid] || [],
    };
  });

  const sections = {
    aboutTitle:
      college?.about_title ||
      (activeLocale === "en"
        ? `About ${college?.name || "the College"}`
        : `Tentang ${college?.name || "Kampus"}`),
    aboutHTML:
      typeof college?.description === "string" && college.description
        ? college.description
        : activeLocale === "en"
        ? "<p>Description is not available yet.</p>"
        : "<p>Deskripsi kampus belum tersedia.</p>",
    faculties,
    requirements,
    excerpt: strip(college?.description || ""),
  };

  /* ----- tuition ----- */
  const currency = (college?.currency || "IDR").toUpperCase();
  const min = fmtMoney(college?.tuition_min, currency);
  const max = fmtMoney(college?.tuition_max, currency);
  const feeLabel = min && max ? `${min} - ${max}` : min || max || "-";

  const tuition = {
    feeLabel,
    livingCost:
      college?.living_cost_estimate != null
        ? fmtMoney(college.living_cost_estimate, currency)
        : "-",
  };

  /* ----- website href ----- */
  let websiteHref = college?.website || "";
  if (websiteHref && !/^https?:\/\//i.test(websiteHref)) {
    websiteHref = `https://${websiteHref}`;
  }

  const isLoading =
    loadingCollege ||
    loadingJurusan ||
    loadingReq ||
    (jurusanIds.length > 0 && !prodiMapRes && !prodiErr);

  const error = resolveErr || jurusanErr || prodiErr || reqErr || null;

  return {
    isLoading,
    error,
    hero,
    countryName: hero.countryName || "",
    websiteHref,
    sections,
    tuition,
  };
}
