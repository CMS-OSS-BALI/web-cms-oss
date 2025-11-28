// app/(view)/admin/negara/useNegaraViewModel.js
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
  withInactive,
  onlyInactive,
}) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("perPage", String(perPage));
  if (q?.trim()) params.set("q", q.trim());
  if (sort) params.set("sort", sort);
  params.set("locale", locale || DEFAULT_LOCALE);
  params.set("fallback", fallback || DEFAULT_FALLBACK);
  if (withInactive) params.set("with_inactive", "1");
  if (onlyInactive) params.set("only_inactive", "1");
  return `/api/negara?${params.toString()}`;
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

export default function useNegaraViewModel() {
  // list filters
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [sort, setSort] = useState(DEFAULT_SORT);
  const [locale, setLocale] = useState(DEFAULT_LOCALE);
  const [fallback, setFallback] = useState(DEFAULT_FALLBACK);

  const [withInactive, setWithInactive] = useState(false);
  const [onlyInactive, setOnlyInactive] = useState(false);

  // UI-only status (active|inactive|all)
  const [status, setStatus] = useState("active");

  // non-GET operations loading
  const [opLoading, setOpLoading] = useState(false);

  // sinkron status -> flag withInactive / onlyInactive
  useEffect(() => {
    if (status === "active") {
      setWithInactive(false);
      setOnlyInactive(false);
    } else if (status === "inactive") {
      setWithInactive(false);
      setOnlyInactive(true);
    } else if (status === "all") {
      setWithInactive(true);
      setOnlyInactive(false);
    }
  }, [status]);

  // ===== LIST NEGARA =====
  const listKey = buildListQuery({
    page,
    perPage,
    q,
    sort,
    locale,
    fallback,
    withInactive,
    onlyInactive,
  });

  const {
    data: listJson,
    error: listErrorObj,
    isLoading: listLoading,
    mutate: mutateList,
  } = useSWR(listKey, fetcher);

  // normalize rows
  const negara = useMemo(() => {
    const rows = listJson?.data ?? [];
    return rows.map((n) => {
      const createdAt = n.created_at || null;
      const updatedAt = n.updated_at || null;
      const createdTs = createdAt ? Date.parse(createdAt) : null;
      const updatedTs = updatedAt ? Date.parse(updatedAt) : null;
      return {
        ...n,
        title: n.name || "-",
        created_at: createdAt,
        created_ts: createdTs,
        updated_at: updatedAt,
        updated_ts: updatedTs,
        is_active: !!n.is_active,
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

  /* ===== CRUD ===== */
  async function createNegara(payload) {
    setOpLoading(true);
    try {
      const hasFile =
        payload?.file instanceof File || payload?.flag_file instanceof File;
      const body = hasFile
        ? toFormData({ ...payload, file: payload.file || payload.flag_file })
        : JSON.stringify(payload);

      const res = await fetch("/api/negara", {
        method: "POST",
        ...(hasFile ? {} : { headers: { "Content-Type": "application/json" } }),
        body,
      });

      if (!res.ok) {
        const info = await res.json().catch(() => null);
        const msg = extractErrorMessage(info, "Gagal menambah negara");
        throw new Error(msg);
      }

      // Negara baru biasanya ingin dilihat di halaman pertama
      setPage(1);
      await refresh();

      return { ok: true };
    } catch (err) {
      return { ok: false, error: err?.message || "Gagal menambah negara" };
    } finally {
      setOpLoading(false);
    }
  }

  async function updateNegara(id, payload) {
    setOpLoading(true);
    try {
      const hasFile =
        payload?.file instanceof File || payload?.flag_file instanceof File;
      const body = hasFile
        ? toFormData({ ...payload, file: payload.file || payload.flag_file })
        : JSON.stringify(payload);

      const res = await fetch(`/api/negara/${encodeURIComponent(id)}`, {
        method: "PATCH",
        ...(hasFile ? {} : { headers: { "Content-Type": "application/json" } }),
        body,
      });

      if (!res.ok) {
        const info = await res.json().catch(() => null);
        const msg = extractErrorMessage(info, "Gagal memperbarui negara");
        throw new Error(msg);
      }

      await refresh();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err?.message || "Gagal memperbarui negara" };
    } finally {
      setOpLoading(false);
    }
  }

  async function deleteNegara(id) {
    setOpLoading(true);
    try {
      const res = await fetch(`/api/negara/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const info = await res.json().catch(() => null);
        const msg = extractErrorMessage(info, "Gagal menonaktifkan negara");
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
      return { ok: false, error: err?.message || "Gagal menonaktifkan negara" };
    } finally {
      setOpLoading(false);
    }
  }

  async function getNegara(id) {
    try {
      const res = await fetch(
        `/api/negara/${encodeURIComponent(id)}?locale=${encodeURIComponent(
          locale || DEFAULT_LOCALE
        )}&fallback=${encodeURIComponent(fallback || DEFAULT_FALLBACK)}`,
        { method: "GET" }
      );
      if (!res.ok) {
        const info = await res.json().catch(() => null);
        const msg = extractErrorMessage(info, "Gagal memuat detail negara");
        throw new Error(msg);
      }
      const json = await res.json();
      const data = json?.data ?? json;
      return { ok: true, data };
    } catch (e) {
      return { ok: false, error: e?.message || "Gagal memuat detail negara" };
    }
  }

  const listError = listErrorObj?.message || "";

  return {
    // data
    negara,
    total,
    totalPages,

    // filters & pagination
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
    withInactive,
    setWithInactive,
    onlyInactive,
    setOnlyInactive,
    status,
    setStatus,

    // state
    loading: listLoading,
    opLoading,
    listError,

    // actions
    refresh,
    createNegara,
    updateNegara,
    deleteNegara,
    getNegara,
  };
}
