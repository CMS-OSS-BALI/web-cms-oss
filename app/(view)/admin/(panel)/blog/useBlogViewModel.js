// app/(view)/admin/blog/useBlogViewModel.js
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/swr/fetcher";

// ---- defaults
const DEFAULT_SORT = "created_at:desc";
const DEFAULT_LOCALE = "id";
const DEFAULT_FALLBACK = "id";

/* ===== query builders ===== */
function buildListQuery({
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

function buildCategoriesQuery({ page = 1, perPage = 200, locale, fallback }) {
  const p = new URLSearchParams();
  p.set("page", String(page));
  p.set("perPage", String(perPage));
  p.set("sort", "created_at:desc");
  p.set("locale", locale || DEFAULT_LOCALE);
  p.set("fallback", fallback || DEFAULT_FALLBACK);
  return `/api/blog-categories?${p.toString()}`;
}

/* ===== helpers ===== */
function toFormData(payload = {}) {
  const fd = new FormData();
  Object.entries(payload).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (v instanceof File) {
      fd.append(k, v);
    } else if (Array.isArray(v)) {
      v.forEach((it) => fd.append(`${k}[]`, it));
    } else if (typeof v === "boolean") {
      fd.append(k, v ? "true" : "false");
    } else {
      fd.append(k, String(v));
    }
  });
  return fd;
}

// Ambil pesan error yang bener dari response API
function extractErrorMessage(json, fallback = "Terjadi kesalahan.") {
  if (!json || typeof json !== "object") return fallback;
  return json?.error?.message || json?.message || json?.error?.hint || fallback;
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

  // UI-only status (toggle), filter by kategori (ID)
  const [status, setStatus] = useState("all"); // all | published | draft | deleted
  const [categoryId, setCategoryId] = useState("");

  // non-GET operations loading
  const [opLoading, setOpLoading] = useState(false);

  // ===== LIST BLOG =====
  const listKey = buildListQuery({
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

  // normalize rows
  const blogs = useMemo(() => {
    const rows = listJson?.data ?? [];
    return rows.map((b) => {
      const createdAt = b.created_at || null;
      const createdTs =
        b.created_ts ?? (createdAt ? Date.parse(createdAt) : null);
      return {
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
        created_at: createdAt,
        created_ts: createdTs,

        category_id: b.category_id || b.category?.id || "",
        category_name: b.category_name || b.category?.name || b.category || "-",

        views_count: Number(b.views_count ?? b.views ?? 0),
        likes_count: Number(b.likes_count ?? b.likes ?? 0),

        image_src: b.image_public_url || b.image_url || b.cover_url || "",

        status: b.status || "published",
      };
    });
  }, [listJson]);

  const total = listJson?.meta?.total ?? 0;
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / perPage)),
    [total, perPage]
  );

  // sinkron meta pagination → state (kalau API override)
  useEffect(() => {
    if (listJson?.meta?.page) setPage(listJson.meta.page);
    if (listJson?.meta?.perPage) setPerPage(listJson.meta.perPage);
  }, [listJson]);

  const refresh = useCallback(() => mutateList(), [mutateList]);

  // ===== KATEGORI BLOG =====
  const blogCatsKey = buildCategoriesQuery({ locale, fallback });
  const { data: blogCatsJson } = useSWR(blogCatsKey, fetcher);

  // opsi FILTER (by id)
  const blogCategoryFilterOptions = useMemo(() => {
    const arr = blogCatsJson?.data || [];
    return arr.map((c) => ({
      value: c.id,
      label: c.name ?? c.slug ?? "(tanpa nama)",
    }));
  }, [blogCatsJson]);

  // opsi FORM (by slug)
  const blogCategoryFormOptions = useMemo(() => {
    const arr = blogCatsJson?.data || [];
    return arr.map((c) => ({
      value: c.slug,
      label: c.name ?? c.slug ?? "(tanpa nama)",
    }));
  }, [blogCatsJson]);

  // ===== CRUD =====
  async function createBlog(payload) {
    setOpLoading(true);
    try {
      const hasFile =
        payload?.file instanceof File || payload?.cover_file instanceof File;
      const body = hasFile
        ? toFormData({ ...payload, file: payload.cover_file || payload.file })
        : JSON.stringify(payload);

      const res = await fetch("/api/blog", {
        method: "POST",
        ...(hasFile ? {} : { headers: { "Content-Type": "application/json" } }),
        body,
      });

      if (!res.ok) {
        const info = await res.json().catch(() => null);
        const msg = extractErrorMessage(info, "Gagal menambah blog");
        throw new Error(msg);
      }

      // Penting: artikel baru biasanya ada di page 1 (sort desc)
      setPage(1);
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
      const hasFile =
        payload?.file instanceof File || payload?.cover_file instanceof File;
      const body = hasFile
        ? toFormData({ ...payload, file: payload.cover_file || payload.file })
        : JSON.stringify(payload);

      const res = await fetch(`/api/blog/${encodeURIComponent(id)}`, {
        method: "PATCH",
        ...(hasFile ? {} : { headers: { "Content-Type": "application/json" } }),
        body,
      });

      if (!res.ok) {
        const info = await res.json().catch(() => null);
        const msg = extractErrorMessage(info, "Gagal memperbarui blog");
        throw new Error(msg);
      }

      // Tidak perlu ubah page; cukup revalidate
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
        const msg = extractErrorMessage(info, "Gagal menghapus blog");
        throw new Error(msg);
      }

      // Clamp page agar tidak tersisa halaman kosong
      const newTotal = Math.max(0, (total ?? 0) - 1);
      const totalPagesAfterDelete = Math.max(
        1,
        Math.ceil(newTotal / Math.max(1, perPage))
      );
      setPage((p) => Math.min(p, totalPagesAfterDelete));

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

  async function getBlog(id) {
    try {
      const res = await fetch(
        `/api/blog/${encodeURIComponent(id)}?include_category=1`,
        { method: "GET" }
      );
      if (!res.ok) {
        const info = await res.json().catch(() => null);
        const msg = extractErrorMessage(info, "Gagal memuat detail blog");
        throw new Error(msg);
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

    // kategori blog
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
