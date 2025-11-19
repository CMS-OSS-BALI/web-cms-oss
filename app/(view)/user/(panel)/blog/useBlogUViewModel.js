// useBlogUViewModel.js
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/swr/fetcher";

/* ===================== COPY / i18n ===================== */
const COPY = {
  id: {
    heroTitle: "Jelajahi Dunia Mulai Dari Cerita Mereka",
    heroSubtitle:
      "Temukan Semua Yang Anda Butuhkan Untuk Mewujudkan Studi Dan Karier Impian Anda. Mulai Dari Tips Tuntas, Kegiatan Menarik, Panduan Proses Dari A–Z, Kisah Perjalanan Nyata Langsung Dari Mahasiswa Yang Telah Mewujudkan Mimpi Kuliah Di Luar Negeri. OSS Bali Hadir Untuk Menjawab Semua Tantangan Calon Mahasiswa Yang Ingin Melanjutkan Langkah Awal Dengan Eksplorasi Artikel Inspiratif Kami! #WEMAKEYOUPRIORITY",
    searchPlaceholder: "Cari judul berita",
    filter: "Filter",
    allCategories: "Semua Kategori",
    mainSection: "BERITA TERKINI",
    mostLiked: "PALING DISUKAI",
    mostRecent: "TERBARU",
    like: "Suka",
    alreadyLiked: "Anda sudah menyukai",
    categoryFallback: "Kategori",
    errorPrefix: "Terjadi kesalahan",
  },
  en: {
    heroTitle: "GLOBAL INSIGHTS, BOUNDLESS OPPORTUNITIES",
    heroSubtitle:
      "Find everything you need to make your studies and career dreams come true. From comprehensive tips, exciting activities, step-by-step guides, to real-life stories directly from students who have realized their dreams of studying abroad. OSS Bali is here to address all the challenges faced by prospective students who want to take their first steps with our inspiring articles! #WEMAKEYOUPRIORITY",
    searchPlaceholder: "Search blog title",
    filter: "Filter",
    allCategories: "All Categories",
    mainSection: "LATEST NEWS",
    mostLiked: "MOST LIKED",
    mostRecent: "MOST RECENT",
    like: "Like",
    alreadyLiked: "You already liked this",
    categoryFallback: "Category",
    errorPrefix: "Something went wrong",
  },
};
const tOf = (locale) => {
  const key = (locale || "id").toLowerCase();
  const dict = COPY[key] || COPY.en;
  return (k) => dict[k] ?? COPY.en[k] ?? k;
};

/* -------------------- helpers -------------------- */
// slugify ringan utk bandingkan nama kategori ke slug
const slugify = (s = "") =>
  String(s)
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

function buildUrl({
  page,
  perPage,
  sort,
  q,
  categoryId,
  categorySlug,
  locale = "id",
  fallback = "id",
}) {
  const p = new URLSearchParams();
  p.set("page", String(page));
  p.set("perPage", String(perPage));
  p.set("sort", sort);
  p.set("locale", locale);
  p.set("fallback", fallback);
  if (q?.trim()) p.set("q", q.trim());

  if (categoryId) {
    p.set("categoryId", String(categoryId));
    p.set("category_id", String(categoryId));
    p.set("category", String(categoryId));
  }
  if (categorySlug) {
    p.set("categorySlug", String(categorySlug));
    p.set("category_slug", String(categorySlug));
  }
  return `/api/blog?${p.toString()}`;
}

const imgSrc = (r) => r?.image_public_url || r?.image_url || "";

/** strip html ke text polos */
function strip(html = "") {
  return String(html)
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
const excerpt = (html = "", max = 180) => {
  const t = strip(html);
  return t.length <= max ? t : t.slice(0, max).replace(/\s+\S*$/, "") + "…";
};

// Robust date parse
function toDate(v) {
  if (!v && v !== 0) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === "number") {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof v === "string") {
    let t = Date.parse(v);
    if (Number.isNaN(t)) t = Date.parse(v.replace(" ", "T"));
    if (!Number.isNaN(t)) return new Date(t);
  }
  return null;
}

// Human “time ago” (ID/EN)
function timeAgoFrom(input, now = Date.now(), locale = "id") {
  const d = toDate(input);
  if (!d) return "";
  const diffSec = Math.floor((now - d.getTime()) / 1000);
  if (locale === "en") {
    if (diffSec < 60) return "just now";
    const m = Math.floor(diffSec / 60);
    if (m < 60) return `${m} min ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} hr ago`;
    const dys = Math.floor(h / 24);
    if (dys < 7) return `${dys} day${dys > 1 ? "s" : ""} ago`;
    const w = Math.floor(dys / 7);
    if (w < 5) return `${w} wk ago`;
    const mo = Math.floor(dys / 30);
    if (mo < 12) return `${mo} mo ago`;
    const y = Math.floor(dys / 365);
    return `${y} yr ago`;
  }
  // id
  if (diffSec < 60) return "baru saja";
  const m = Math.floor(diffSec / 60);
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const dys = Math.floor(h / 24);
  if (dys < 7) return `${dys} hari lalu`;
  const w = Math.floor(dys / 7);
  if (w < 5) return `${w} mgg lalu`;
  const mo = Math.floor(dys / 30);
  if (mo < 12) return `${mo} bln lalu`;
  const y = Math.floor(dys / 365);
  return `${y} thn lalu`;
}

// Read time (ID/EN)
const readTime = (html, locale = "id") => {
  const w = strip(html).split(/\s+/).filter(Boolean).length;
  const mins = Math.max(1, Math.round(w / 200));
  return locale === "en" ? `${mins} min read` : `${mins} mnt baca`;
};

// like-once localStorage
const LS_KEY = "oss_blog_liked_ids";
function loadLikedIds() {
  try {
    const raw =
      typeof window !== "undefined"
        ? window.localStorage.getItem(LS_KEY)
        : "[]";
    const arr = JSON.parse(raw || "[]");
    if (Array.isArray(arr)) return new Set(arr);
  } catch {}
  return new Set();
}
function saveLikedIds(set) {
  try {
    const arr = Array.from(set);
    window.localStorage.setItem(LS_KEY, JSON.stringify(arr));
  } catch {}
}

// Ambil category id/slug/name dari beragam bentuk field
const getCatId = (r) =>
  String(
    r?.category_id ??
      r?.categoryId ??
      (typeof r?.category === "object" ? r?.category?.id : r?.category ?? "")
  );

const getCatSlug = (r) =>
  String(
    r?.category_slug ??
      (typeof r?.category === "object" ? r?.category?.slug : r?.slug ?? "")
  ).toLowerCase();

const getCatName = (r) =>
  String(
    r?.category_name ??
      (typeof r?.category === "object" ? r?.category?.name : r?.name ?? "")
  );

/* -------------------- main hook -------------------- */
export function useBlogUViewModel({
  locale = "id",
  perPage = 6,
  q = "",
  categoryId = "",
  categorySlug = "",
} = {}) {
  // expose translator
  const t = useMemo(() => tOf(locale), [locale]);

  // like-once
  const [likedSet, setLikedSet] = useState(() => new Set());
  useEffect(() => setLikedSet(loadLikedIds()), []);
  const hasLiked = useCallback((id) => likedSet.has(id), [likedSet]);

  // trigger re-render timeAgo tiap menit
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  // pagination
  const [page, setPage] = useState(1);

  const nameQuery = (q || "").trim().toLowerCase();
  const selectedCatId = String(categoryId || "");
  const selectedCatSlug = String(categorySlug || "").toLowerCase();

  const matchesCategory = (row) => {
    if (!selectedCatId && !selectedCatSlug) return true;
    const rid = getCatId(row);
    const rslug = getCatSlug(row);
    const rnameSlug = slugify(getCatName(row));
    return (
      (selectedCatId && rid === selectedCatId) ||
      (selectedCatSlug &&
        (rslug === selectedCatSlug || rnameSlug === selectedCatSlug))
    );
  };

  /* -------- popular (utama) -------- */
  const keyPopular = buildUrl({
    page,
    perPage,
    sort: "created_at:desc",
    q,
    categoryId: selectedCatId || undefined,
    categorySlug: selectedCatSlug || undefined,
    locale,
    fallback: "id",
  });

  const {
    data: popularJson,
    isLoading: popularLoading,
    error: popularErr,
    mutate: mutatePopular,
  } = useSWR(keyPopular, fetcher, { keepPreviousData: true });

  const popular = useMemo(() => {
    let rows = (popularJson?.data ?? []).slice();

    rows = rows.filter(matchesCategory);

    rows.sort((a, b) => {
      const ta =
        toDate(
          a?.created_ts ?? a?.updated_ts ?? a?.created_at ?? a?.updated_at
        )?.getTime() ?? 0;
      const tb =
        toDate(
          b?.created_ts ?? b?.updated_ts ?? b?.created_at ?? b?.updated_at
        )?.getTime() ?? 0;
      return tb - ta;
    });

    if (nameQuery) {
      rows = rows.filter((r) =>
        String(r?.name || "")
          .toLowerCase()
          .includes(nameQuery)
      );
    }

    return rows.map((r) => {
      const ts =
        r?.created_ts ?? r?.updated_ts ?? r?.created_at ?? r?.updated_at;
      return {
        ...r,
        image_src: imgSrc(r),
        time_ago: timeAgoFrom(ts, now, locale),
        read_str: readTime(r.description || "", locale),
        excerpt: excerpt(r.description || "", 220),
      };
    });
  }, [popularJson, now, locale, nameQuery, matchesCategory]);

  const total = popularJson?.meta?.total ?? 0;
  const totalPages =
    popularJson?.meta?.totalPages ?? Math.max(1, Math.ceil(total / perPage));

  /* -------- top likes -------- */
  const keyTopLike = buildUrl({
    page: 1,
    perPage: 3,
    sort: "likes_count:desc",
    categoryId: selectedCatId || undefined,
    categorySlug: selectedCatSlug || undefined,
    locale,
    fallback: "id",
  });
  const {
    data: topLikeJson,
    isLoading: likeLoading,
    error: likeErr,
    mutate: mutateTopLike,
  } = useSWR(keyTopLike, fetcher, { keepPreviousData: true });

  const topLikes = useMemo(() => {
    let rows = topLikeJson?.data ?? [];
    rows = rows.filter(matchesCategory);
    return rows.map((r, i) => {
      const ts =
        r?.created_ts ?? r?.updated_ts ?? r?.created_at ?? r?.updated_at;
      return {
        ...r,
        image_src: imgSrc(r),
        no: String(i + 1).padStart(2, "0"),
        time_ago: timeAgoFrom(ts, now, locale),
        read_str: readTime(r.description || "", locale),
        excerpt: excerpt(r.description || "", 140),
      };
    });
  }, [topLikeJson, now, locale, matchesCategory]);

  /* -------- late posts (terkini) -------- */
  const keyLate = buildUrl({
    page: 1,
    perPage: 3,
    sort: "created_at:desc",
    categoryId: selectedCatId || undefined,
    categorySlug: selectedCatSlug || undefined,
    locale,
    fallback: "id",
  });
  const {
    data: lateJson,
    isLoading: lateLoading,
    error: lateErr,
    mutate: mutateLate,
  } = useSWR(keyLate, fetcher, { keepPreviousData: true });

  const latePosts = useMemo(() => {
    let rows = lateJson?.data ?? [];
    rows = rows.filter(matchesCategory);
    return rows.map((r, i) => {
      const ts =
        r?.created_ts ?? r?.updated_ts ?? r?.created_at ?? r?.updated_at;
      return {
        ...r,
        image_src: imgSrc(r),
        no: String(i + 1).padStart(2, "0"),
        time_ago: timeAgoFrom(ts, now, locale),
        read_str: readTime(r.description || "", locale),
        excerpt: excerpt(r.description || "", 140),
      };
    });
  }, [lateJson, now, locale, matchesCategory]);

  const goTo = useCallback(
    (p) => setPage(Math.max(1, Math.min(p, totalPages))),
    [totalPages]
  );

  /* -------------- actions -------------- */
  async function bumpStat(id, type = "view", inc = 1) {
    await fetch(`/api/blog/${encodeURIComponent(id)}/stats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, inc }),
    });
  }

  const onView = useCallback(
    async (id) => {
      try {
        await bumpStat(id, "view", 1);
        mutatePopular();
        mutateTopLike();
        mutateLate();
      } catch {}
    },
    [mutatePopular, mutateTopLike, mutateLate]
  );

  const onLike = useCallback(
    async (id) => {
      if (likedSet.has(id)) return;

      mutatePopular((prev) => {
        if (!prev?.data) return prev;
        return {
          ...prev,
          data: prev.data.map((it) =>
            it.id === id
              ? { ...it, likes_count: (it.likes_count ?? 0) + 1 }
              : it
          ),
        };
      }, false);

      try {
        await bumpStat(id, "like", 1);
      } finally {
        const next = new Set(likedSet);
        next.add(id);
        setLikedSet(next);
        saveLikedIds(next);

        mutatePopular();
        mutateTopLike();
        mutateLate();
      }
    },
    [likedSet, mutatePopular, mutateTopLike, mutateLate]
  );

  /* -------------- return -------------- */
  return {
    locale,
    t, // ⬅ expose translator

    // data
    popular,
    topLikes,
    latePosts,

    // state
    loading: popularLoading || likeLoading || lateLoading,
    error: popularErr?.message || likeErr?.message || lateErr?.message || "",

    // pagination
    page,
    perPage,
    total,
    totalPages,
    goTo,
    setPage,

    // like-once
    hasLiked,
    likedIds: useMemo(() => Array.from(likedSet), [likedSet]),

    // actions
    refresh: mutatePopular,
    onView,
    onLike,
  };
}

export default useBlogUViewModel;
