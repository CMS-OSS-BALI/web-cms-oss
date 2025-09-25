"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/swr/fetcher";

// ---- default query state
const DEFAULT_SORT = "created_at:desc";
const DEFAULT_LOCALE = "id";
const DEFAULT_FALLBACK = "id";

function buildQuery({
  page,
  perPage,
  q,
  sort,
  locale,
  fallback,
  withDeleted,
  onlyDeleted,
}) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("perPage", String(perPage));
  if (q?.trim()) params.set("q", q.trim());
  if (sort) params.set("sort", sort);
  params.set("locale", locale || DEFAULT_LOCALE);
  params.set("fallback", fallback || DEFAULT_FALLBACK);
  if (withDeleted) params.set("with_deleted", "1");
  if (onlyDeleted) params.set("only_deleted", "1");
  return `/api/blog?${params.toString()}`;
}

export default function useBlogViewModel() {
  // list filters
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(12);
  const [sort, setSort] = useState(DEFAULT_SORT);
  const [locale, setLocale] = useState(DEFAULT_LOCALE);
  const [fallback, setFallback] = useState(DEFAULT_FALLBACK);
  const [withDeleted, setWithDeleted] = useState(false);
  const [onlyDeleted, setOnlyDeleted] = useState(false);

  // non-GET operations loading
  const [opLoading, setOpLoading] = useState(false);

  // swr key
  const listKey = buildQuery({
    page,
    perPage,
    q,
    sort,
    locale,
    fallback,
    withDeleted,
    onlyDeleted,
  });

  const {
    data: listJson,
    error: listErrorObj,
    isLoading: listLoading,
    mutate: mutateList,
  } = useSWR(listKey, fetcher);

  const blogs = listJson?.data ?? [];
  const total = listJson?.meta?.total ?? 0;
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / perPage)),
    [total, perPage]
  );

  useEffect(() => {
    if (listJson?.meta?.page) setPage(listJson.meta.page);
    if (listJson?.meta?.perPage) setPerPage(listJson.meta.perPage);
  }, [listJson]);

  const refresh = useCallback(() => mutateList(), [mutateList]);

  // ===== CRUD =====
  async function createBlog(payload) {
    // payload: { image_url, name_id, description_id?, name_en?, description_en?, autoTranslate? }
    setOpLoading(true);
    try {
      const res = await fetch("/api/blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const info = await res.json().catch(() => null);
        throw new Error(info?.message || "Gagal menambah blog");
      }
      await refresh();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err?.message || "Gagal menambah blog" };
    } finally {
      setOpLoading(false);
    }
  }

  async function updateBlog(id, payload) {
    // payload: { image_url?, name_id?, description_id?, name_en?, description_en?, autoTranslate?, views_count?, likes_count? }
    setOpLoading(true);
    try {
      const res = await fetch(`/api/blog/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const info = await res.json().catch(() => null);
        throw new Error(info?.message || "Gagal memperbarui blog");
      }
      await refresh();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err?.message || "Gagal memperbarui blog" };
    } finally {
      setOpLoading(false);
    }
  }

  async function deleteBlog(id) {
    setOpLoading(true);
    try {
      const res = await fetch(`/api/blog/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const info = await res.json().catch(() => null);
        throw new Error(info?.message || "Gagal menghapus blog");
      }
      await refresh();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err?.message || "Gagal menghapus blog" };
    } finally {
      setOpLoading(false);
    }
  }

  async function bumpStat(id, type = "view", inc = 1) {
    try {
      await fetch(`/api/blog/${encodeURIComponent(id)}/stats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, inc }),
      });
      await refresh();
    } catch {
      /* ignore */
    }
  }

  const listError = listErrorObj?.message || "";

  return {
    // data
    blogs,
    total,
    totalPages,

    // filters
    q,
    setQ,
    page,
    setPage,
    perPage,
    setPerPage,
    sort,
    setSort,
    locale,
    setLocale,
    fallback,
    setFallback,
    withDeleted,
    setWithDeleted,
    onlyDeleted,
    setOnlyDeleted,

    // state
    loading: listLoading,
    opLoading,
    listError,

    // actions
    refresh,
    createBlog,
    updateBlog,
    deleteBlog,
    bumpStat,
  };
}
