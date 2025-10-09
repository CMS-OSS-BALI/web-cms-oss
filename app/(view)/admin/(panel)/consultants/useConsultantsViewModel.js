"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/swr/fetcher";

const DEFAULT_SORT = "created_at:desc";
const DEFAULT_LOCALE = "id";
const fallbackFor = (loc) => (String(loc).toLowerCase() === "id" ? "en" : "id");

/* ========== Helpers ========== */
function buildKey({ page, perPage, q, sort, locale, fallback }) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("perPage", String(perPage));
  params.set("sort", sort || DEFAULT_SORT);
  params.set("locale", locale || DEFAULT_LOCALE);
  params.set("fallback", fallback || fallbackFor(locale || DEFAULT_LOCALE));
  if (q && q.trim()) params.set("q", q.trim());
  return `/api/consultants?${params.toString()}`;
}

/**
 * toFormData (mendukung multi file)
 * - Untuk galeri program, **SELALU** kirim sebagai "files[]"
 * - Jika caller mengirim "program_images" (array string path), kirim sebagai "program_images[]"
 */
function toFormData(payload = {}) {
  const fd = new FormData();

  Object.entries(payload).forEach(([k, v]) => {
    if (v === undefined || v === null) return;

    // Back-compat: terima "program_files" atau "files" → kirim sebagai files[]
    if (k === "program_files" || k === "files") {
      const arr = Array.isArray(v) ? v : v instanceof FileList ? [...v] : [];
      arr.forEach((f) => f instanceof File && fd.append("files[]", f));
      return;
    }

    // Array string untuk path gambar (jika pakai skema upload terpisah)
    if (k === "program_images" && Array.isArray(v)) {
      v.forEach(
        (s) => typeof s === "string" && fd.append("program_images[]", s)
      );
      return;
    }

    // Catatan: API saat ini TIDAK membaca field file tunggal ini (disiapkan untuk masa depan)
    if (k === "profile_file" || k === "program_consultant_file") {
      if (v instanceof File) fd.append(k, v);
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

export default function useConsultantsViewModel() {
  // filters/paging
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState(DEFAULT_SORT);
  const [locale, setLocale] = useState(DEFAULT_LOCALE);
  const [fallback, setFallback] = useState(fallbackFor(DEFAULT_LOCALE));

  // op loading (POST/PATCH/DELETE)
  const [opLoading, setOpLoading] = useState(false);

  const listKey = useMemo(
    () => buildKey({ page, perPage, q, sort, locale, fallback }),
    [page, perPage, q, sort, locale, fallback]
  );

  const {
    data: listJson,
    error: listErrorObj,
    isLoading,
    mutate,
  } = useSWR(listKey, fetcher, { revalidateOnFocus: false });

  const consultants = listJson?.data ?? [];
  const total = listJson?.meta?.total ?? 0;
  const metaPage = listJson?.meta?.page;
  const metaPerPage = listJson?.meta?.perPage;

  useEffect(() => {
    if (metaPage && metaPage !== page) setPage(metaPage);
    if (metaPerPage && metaPerPage !== perPage) setPerPage(metaPerPage);
  }, [metaPage, metaPerPage, page, perPage]);

  const totalPages = useMemo(() => {
    const denom = metaPerPage ?? perPage ?? 1;
    return Math.max(1, Math.ceil(total / denom));
  }, [total, metaPerPage, perPage]);

  const refresh = useCallback(() => mutate(), [mutate]);

  /* ===== CREATE ===== */
  async function createConsultant(payload) {
    // payload bisa campur: { files?: File[], program_images?: string[] } + fields text
    setOpLoading(true);
    try {
      const fd = toFormData(payload);
      const res = await fetch("/api/consultants", {
        method: "POST",
        body: fd, // biar browser set boundary otomatis
      });
      const info = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          info?.error?.message || info?.message || "Gagal menambah konsultan"
        );
      }
      await refresh();
      return { ok: true, data: info?.data };
    } catch (err) {
      return { ok: false, error: err?.message || "Gagal menambah konsultan" };
    } finally {
      setOpLoading(false);
    }
  }

  /* ===== UPDATE ===== */
  async function updateConsultant(id, payload) {
    // payload bisa: files?: File[], program_images_mode?: 'append' | 'replace'
    setOpLoading(true);
    try {
      const fd = toFormData(payload);
      const res = await fetch(`/api/consultants/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: fd,
      });
      const info = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          info?.error?.message || info?.message || "Gagal memperbarui konsultan"
        );
      }
      await refresh();
      return { ok: true, data: info?.data };
    } catch (err) {
      return {
        ok: false,
        error: err?.message || "Gagal memperbarui konsultan",
      };
    } finally {
      setOpLoading(false);
    }
  }

  /* ===== DELETE ===== */
  async function deleteConsultant(id) {
    setOpLoading(true);
    try {
      const res = await fetch(`/api/consultants/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const info = await res.json().catch(() => null);
        throw new Error(
          info?.error?.message || info?.message || "Gagal menghapus konsultan"
        );
      }
      await refresh();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err?.message || "Gagal menghapus konsultan" };
    } finally {
      setOpLoading(false);
    }
  }

  const listError = listErrorObj?.message || "";

  return {
    // data
    consultants,
    total,
    totalPages,

    // filters & paging
    page,
    perPage,
    q,
    sort,
    locale,
    fallback,

    // setters
    setPage,
    setPerPage,
    setQ,
    setSort,
    setLocale,
    setFallback,

    // states
    loading: isLoading,
    opLoading,
    listError,

    // actions
    createConsultant,
    updateConsultant,
    deleteConsultant,
    refresh,
  };
}
