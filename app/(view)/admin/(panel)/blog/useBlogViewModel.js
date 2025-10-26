"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/swr/fetcher";

// ---- defaults
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
  categoryId,
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
  if (categoryId) params.set("category_id", String(categoryId));
  // penting: agar category_name ikut dibawa oleh API
  params.set("include_category", "1");
  return `/api/blog?${params.toString()}`;
}

// helper: payload -> FormData (dukung file/cover_file)
function toFormData(payload = {}) {
  const fd = new FormData();
  Object.entries(payload).forEach(([k, v]) => {
    if (v === undefined || v === null) return;

    if (v instanceof File) {
      fd.append(k, v);
      return;
    }
    if (Array.isArray(v)) {
      v.forEach((it) => fd.append(`${k}[]`, it));
      return;
    }
    if (typeof v === "boolean") {
      fd.append(k, v ? "true" : "false");
      return;
    }
    fd.append(k, String(v));
  });
  return fd;
}

/* ===== NEW: query builder untuk kategori blog ===== */
function buildBlogCategoriesQuery({
  page = 1,
  perPage = 200,
  locale,
  fallback,
}) {
  const p = new URLSearchParams();
  p.set("page", String(page));
  p.set("perPage", String(perPage));
  p.set("sort", "created_at:desc");
  p.set("locale", locale || DEFAULT_LOCALE);
  p.set("fallback", fallback || DEFAULT_FALLBACK);
  return `/api/blog-categories?${p.toString()}`;
}

export default function useBlogViewModel() {
  // list filters
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [sort, setSort] = useState(DEFAULT_SORT);
  const [locale, setLocale] = useState(DEFAULT_LOCALE);
  const [fallback, setFallback] = useState(DEFAULT_FALLBACK);
  const [withDeleted, setWithDeleted] = useState(false);
  const [onlyDeleted, setOnlyDeleted] = useState(false);

  // UI-only status (tidak dikirim ke API, kita pakai untuk toggle deleted)
  const [status, setStatus] = useState("all"); // all | deleted
  const [categoryId, setCategoryId] = useState(""); // filter by ID

  // non-GET operations loading
  const [opLoading, setOpLoading] = useState(false);

  // ===== LIST BLOG =====
  const listKey = buildQuery({
    page,
    perPage,
    q,
    sort,
    locale,
    fallback,
    withDeleted,
    onlyDeleted,
    categoryId,
  });

  const {
    data: listJson,
    error: listErrorObj,
    isLoading: listLoading,
    mutate: mutateList,
  } = useSWR(listKey, fetcher);

  // normalize rows -> pastikan created_at dipakai
  const blogs = useMemo(() => {
    const rows = listJson?.data ?? [];
    return rows.map((b) => ({
      ...b,
      id: b.id,
      title:
        b.name ||
        b.title ||
        b.name_id ||
        b.title_id ||
        b.name_en ||
        b.title_en ||
        "-",
      created_at: b.created_at || null,
      created_ts:
        b.created_ts ?? (b.created_at ? Date.parse(b.created_at) : null),

      category_id: b.category_id || b.category?.id || "",
      category_name: b.category_name || b.category?.name || b.category || "-",

      views_count: Number(b.views_count ?? b.views ?? 0),
      likes_count: Number(b.likes_count ?? b.likes ?? 0),

      image_src: b.image_public_url || b.image_url || b.cover_url || "",

      status: b.status || "published",
    }));
  }, [listJson]);

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

  // ===== NEW: KATEGORI BLOG (from /api/blog-categories) =====
  const blogCatsKey = buildBlogCategoriesQuery({ locale, fallback });
  const { data: blogCatsJson } = useSWR(blogCatsKey, fetcher);

  // opsi untuk FILTER (by id)
  const blogCategoryFilterOptions = useMemo(() => {
    const arr = blogCatsJson?.data || [];
    return arr.map((c) => ({
      value: c.id, // filter ke /api/blog pakai category_id
      label: c.name ?? c.slug ?? "(tanpa nama)",
    }));
  }, [blogCatsJson]);

  // opsi untuk FORM (by slug)
  const blogCategoryFormOptions = useMemo(() => {
    const arr = blogCatsJson?.data || [];
    return arr.map((c) => ({
      value: c.slug, // create/update blog pakai category_slug
      label: c.name ?? c.slug ?? "(tanpa nama)",
    }));
  }, [blogCatsJson]);

  // ===== CRUD =====
  async function createBlog(payload) {
    setOpLoading(true);
    try {
      let res;
      if (
        payload?.file instanceof File ||
        payload?.cover_file instanceof File
      ) {
        const fd = toFormData({
          ...payload,
          file: payload.cover_file || payload.file,
        });
        res = await fetch("/api/blog", { method: "POST", body: fd });
      } else {
        res = await fetch("/api/blog", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
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
    setOpLoading(true);
    try {
      let res;
      if (
        payload?.file instanceof File ||
        payload?.cover_file instanceof File
      ) {
        const fd = toFormData({
          ...payload,
          file: payload.cover_file || payload.file,
        });
        res = await fetch(`/api/blog/${encodeURIComponent(id)}`, {
          method: "PATCH",
          body: fd,
        });
      } else {
        res = await fetch(`/api/blog/${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
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

  // ===== Detail =====
  async function getBlog(id) {
    try {
      const res = await fetch(
        `/api/blog/${encodeURIComponent(id)}?include_category=1`,
        { method: "GET" }
      );
      if (!res.ok) {
        const info = await res.json().catch(() => null);
        throw new Error(info?.message || "Gagal memuat detail");
      }
      const json = await res.json();
      const data = json?.data ?? json;
      return { ok: true, data };
    } catch (e) {
      return { ok: false, error: e?.message || "Gagal memuat detail" };
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
    status,
    setStatus, // dipakai UI untuk toggle Deleted/All
    categoryId,
    setCategoryId,

    // kategori blog (NEW)
    blogCategoryFilterOptions, // value=id (untuk filter list /api/blog)
    blogCategoryFormOptions, // value=slug (untuk create/edit /api/blog)

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
    getBlog,
  };
}
