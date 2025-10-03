"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/swr/fetcher";

/* ---------- helpers ---------- */
const DEFAULT_LOCALE = "id";
const DEFAULT_FALLBACK = "id";

function buildUrl({ page, perPage, sort, q }) {
  const p = new URLSearchParams();
  p.set("page", String(page));
  p.set("perPage", String(perPage));
  p.set("sort", sort);
  p.set("locale", DEFAULT_LOCALE);
  p.set("fallback", DEFAULT_FALLBACK);
  if (q?.trim()) p.set("q", q.trim());
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
  if (v instanceof Date && !isNaN(v)) return v;
  if (typeof v === "number") {
    const d = new Date(v);
    return isNaN(d) ? null : d;
  }
  if (typeof v === "string") {
    let t = Date.parse(v);
    if (Number.isNaN(t)) t = Date.parse(v.replace(" ", "T"));
    if (!Number.isNaN(t)) return new Date(t);
  }
  return null;
}

// Human “time ago” (ID)
function timeAgoFrom(input, now = Date.now()) {
  const d = toDate(input);
  if (!d) return "";
  const diffSec = Math.floor((now - d.getTime()) / 1000);
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

// Read time
const readTime = (html) => {
  const w = strip(html).split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(w / 200))} min read`;
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

export function useBlogUViewModel() {
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

  // popular
  const [page, setPage] = useState(1);
  const perPage = 6;
  const keyPopular = buildUrl({ page, perPage, sort: "views_count:desc" });

  const {
    data: popularJson,
    isLoading: popularLoading,
    error: popularErr,
    mutate: mutatePopular,
  } = useSWR(keyPopular, fetcher);

  const popular = useMemo(() => {
    const rows = popularJson?.data ?? [];
    return rows.map((r) => {
      const ts =
        r?.created_ts ?? r?.updated_ts ?? r?.created_at ?? r?.updated_at;
      return {
        ...r,
        image_src: imgSrc(r),
        time_ago: timeAgoFrom(ts, now),
        read_str: readTime(r.description || ""),
        excerpt: excerpt(r.description || "", 220),
      };
    });
  }, [popularJson, now]);

  const total = popularJson?.meta?.total ?? 0;
  const totalPages =
    popularJson?.meta?.totalPages ?? Math.max(1, Math.ceil(total / perPage));

  // top likes
  const keyTopLike = buildUrl({
    page: 1,
    perPage: 3,
    sort: "likes_count:desc",
  });
  const {
    data: topLikeJson,
    isLoading: likeLoading,
    error: likeErr,
    mutate: mutateTopLike,
  } = useSWR(keyTopLike, fetcher);

  const topLikes = useMemo(() => {
    const rows = topLikeJson?.data ?? [];
    return rows.map((r, i) => {
      const ts =
        r?.created_ts ?? r?.updated_ts ?? r?.created_at ?? r?.updated_at;
      return {
        ...r,
        image_src: imgSrc(r),
        no: String(i + 1).padStart(2, "0"),
        time_ago: timeAgoFrom(ts, now),
        read_str: readTime(r.description || ""),
        // ✨ tambahkan excerpt agar dipakai di sidebar
        excerpt: excerpt(r.description || "", 140),
      };
    });
  }, [topLikeJson, now]);

  // late posts
  const keyLate = buildUrl({ page: 1, perPage: 3, sort: "created_at:desc" });
  const {
    data: lateJson,
    isLoading: lateLoading,
    error: lateErr,
    mutate: mutateLate,
  } = useSWR(keyLate, fetcher);

  const latePosts = useMemo(() => {
    const rows = lateJson?.data ?? [];
    return rows.map((r, i) => {
      const ts =
        r?.created_ts ?? r?.updated_ts ?? r?.created_at ?? r?.updated_at;
      return {
        ...r,
        image_src: imgSrc(r),
        no: String(i + 1).padStart(2, "0"),
        time_ago: timeAgoFrom(ts, now),
        read_str: readTime(r.description || ""),
        // ✨ tambahkan excerpt agar dipakai di sidebar
        excerpt: excerpt(r.description || "", 140),
      };
    });
  }, [lateJson, now]);

  const goTo = useCallback(
    (p) => setPage(Math.max(1, Math.min(p, totalPages))),
    [totalPages]
  );

  // stats
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

      // optimistic update
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

  return {
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
