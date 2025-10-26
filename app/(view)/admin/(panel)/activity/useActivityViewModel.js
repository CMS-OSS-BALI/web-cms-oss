"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/swr/fetcher";

/* ===== defaults ===== */
const DEFAULT_SORT = "sort:asc";
const DEFAULT_LOCALE = "id";
const DEFAULT_FALLBACK = "id";

/* ===== helpers ===== */
function buildQuery({
  page,
  perPage,
  q,
  sort,
  locale,
  fallback,
  withDeleted,
  onlyDeleted,
  isPublished, // null | true | false
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
  if (isPublished !== null && isPublished !== undefined) {
    params.set("is_published", isPublished ? "1" : "0");
  }
  return `/api/aktivitas?${params.toString()}`;
}

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

function firstErrMessage(obj) {
  return (
    obj?.error?.message || obj?.message || obj?.error || "Terjadi kesalahan."
  );
}

export default function useActivityViewModel(init = {}) {
  // list filters
  const [q, setQ] = useState(init.q ?? "");
  const [page, setPage] = useState(init.page ?? 1);
  const [perPage, setPerPage] = useState(init.perPage ?? 10);
  const [sort, setSort] = useState(init.sort ?? DEFAULT_SORT);
  const [locale, setLocale] = useState(init.locale ?? DEFAULT_LOCALE);
  const [fallback, setFallback] = useState(init.fallback ?? DEFAULT_FALLBACK);
  const [withDeleted, setWithDeleted] = useState(!!init.withDeleted);
  const [onlyDeleted, setOnlyDeleted] = useState(!!init.onlyDeleted);
  // default to Published list to match UI dropdown’s default label
  const [isPublished, setIsPublished] = useState(init.isPublished ?? true); // true|false|null

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
    isPublished,
  });

  const {
    data: listJson,
    error: listErrorObj,
    isLoading: listLoading,
    mutate: mutateList,
  } = useSWR(listKey, fetcher);

  // normalize rows
  const activities = useMemo(() => {
    const rows = listJson?.data ?? [];
    return rows.map((r) => ({
      id: r.id,
      title: r.name || "-",
      description: r.description || "",
      created_at: r.created_at || null,
      updated_at: r.updated_at || null,
      deleted_at: r.deleted_at || null,
      created_ts:
        r.created_ts ?? (r.created_at ? Date.parse(r.created_at) : null),
      updated_ts:
        r.updated_ts ?? (r.updated_at ? Date.parse(r.updated_at) : null),
      deleted_at_ts:
        r.deleted_at_ts ?? (r.deleted_at ? Date.parse(r.deleted_at) : null),
      image_src: r.image_url || "",
      is_published: !!r.is_published,
      sort: r.sort ?? 0,
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

  /* ===== CRUD ===== */
  async function createActivity(payload) {
    setOpLoading(true);
    try {
      const hasFile =
        payload?.file instanceof File ||
        payload?.image instanceof File ||
        payload?.image_file instanceof File;

      let res;
      if (hasFile) {
        const fd = toFormData({
          ...payload,
          image: payload.file || payload.image || payload.image_file,
        });
        res = await fetch("/api/aktivitas", {
          method: "POST",
          body: fd,
          credentials: "include",
        });
      } else {
        res = await fetch("/api/aktivitas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          credentials: "include",
        });
      }
      const info = await res.json().catch(() => null);
      if (!res.ok) throw new Error(firstErrMessage(info));
      await refresh();
      return { ok: true, data: info?.data };
    } catch (err) {
      return { ok: false, error: err?.message || "Gagal menambah aktivitas" };
    } finally {
      setOpLoading(false);
    }
  }

  async function updateActivity(id, payload) {
    setOpLoading(true);
    try {
      const hasFile =
        payload?.file instanceof File ||
        payload?.image instanceof File ||
        payload?.image_file instanceof File;

      let res;
      if (hasFile) {
        const fd = toFormData({
          ...payload,
          image: payload.file || payload.image || payload.image_file,
        });
        res = await fetch(`/api/aktivitas/${encodeURIComponent(id)}`, {
          method: "PATCH",
          body: fd,
          credentials: "include",
        });
      } else {
        res = await fetch(`/api/aktivitas/${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          credentials: "include",
        });
      }
      const info = await res.json().catch(() => null);
      if (!res.ok) throw new Error(firstErrMessage(info));
      await refresh();
      return { ok: true, data: info?.data };
    } catch (err) {
      return {
        ok: false,
        error: err?.message || "Gagal memperbarui aktivitas",
      };
    } finally {
      setOpLoading(false);
    }
  }

  async function deleteActivity(id) {
    setOpLoading(true);
    try {
      const res = await fetch(`/api/aktivitas/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const info = await res.json().catch(() => null);
      if (!res.ok) throw new Error(firstErrMessage(info));
      await refresh();
      return { ok: true, data: info?.data };
    } catch (err) {
      return { ok: false, error: err?.message || "Gagal menghapus aktivitas" };
    } finally {
      setOpLoading(false);
    }
  }

  /* ===== Detail ===== */
  async function getActivity(id) {
    try {
      const res = await fetch(
        `/api/aktivitas/${encodeURIComponent(
          id
        )}?locale=${locale}&fallback=${fallback}`,
        { method: "GET", credentials: "include" }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(firstErrMessage(json));
      const data = json?.data ?? json;
      return { ok: true, data };
    } catch (e) {
      return { ok: false, error: e?.message || "Gagal memuat detail" };
    }
  }

  const listError = listErrorObj?.message || "";

  return {
    // data
    activities,
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
    isPublished,
    setIsPublished,

    // state
    loading: listLoading,
    opLoading,
    listError,

    // actions
    refresh,
    createActivity,
    updateActivity,
    deleteActivity,
    getActivity,
  };
}
