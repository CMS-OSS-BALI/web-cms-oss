"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/swr/fetcher";

const DEFAULT_SORT = "created_at:desc";
const DEFAULT_LOCALE = "id";
const DEFAULT_FALLBACK = "id";

/* ========== Helpers ========== */
function buildKey({ page, perPage, q, sort, locale, fallback }) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("perPage", String(perPage));
  params.set("sort", sort || DEFAULT_SORT);
  params.set("locale", locale || DEFAULT_LOCALE);
  params.set("fallback", fallback || DEFAULT_FALLBACK);
  if (q && q.trim()) params.set("q", q.trim());
  return `/api/consultants?${params.toString()}`;
}

const trimOrNull = (v) =>
  typeof v === "string" ? (v.trim() === "" ? null : v.trim()) : v ?? null;

function normalizeCreatePayload(values = {}) {
  // CREATE expects:
  // email?, whatsapp?, profile_image_url?, program_consultant_image_url?
  // name_id (required), description_id?
  return {
    email: trimOrNull(values.email),
    whatsapp: trimOrNull(values.whatsapp),
    profile_image_url: trimOrNull(values.profile_image_url),
    program_consultant_image_url: trimOrNull(
      values.program_consultant_image_url
    ),

    name_id: (values.name_id ?? "").toString().trim(),
    description_id:
      typeof values.description_id === "string" ? values.description_id : null,

    autoTranslate: true,
  };
}


function normalizeUpdatePayload(values = {}) {
  // PATCH fields semua opsional:
  // email?, whatsapp?, profile_image_url?, program_consultant_image_url?
  // name_id?, description_id?
  const out = {};

  if ("email" in values) out.email = trimOrNull(values.email);
  if ("whatsapp" in values) out.whatsapp = trimOrNull(values.whatsapp);
  if ("profile_image_url" in values)
    out.profile_image_url = trimOrNull(values.profile_image_url);
  if ("program_consultant_image_url" in values)
    out.program_consultant_image_url = trimOrNull(
      values.program_consultant_image_url
    );

  if ("name_id" in values) {
    const raw = values.name_id;
    if (raw == null) out.name_id = null;
    else {
      const trimmed = raw.toString().trim();
      out.name_id = trimmed.length ? trimmed : null;
    }
  }

  if ("description_id" in values) {
    const raw = values.description_id;
    if (raw == null) out.description_id = null;
    else if (typeof raw === "string") out.description_id = raw;
    else out.description_id = String(raw);
  }


  return out;
}


/* ========== Hook ========== */
export default function useConsultantsViewModel() {
  // filters/paging
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState(DEFAULT_SORT);
  const [locale, setLocale] = useState(DEFAULT_LOCALE);
  const [fallback, setFallback] = useState(DEFAULT_FALLBACK);

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
  async function createConsultant(values) {
    setOpLoading(true);
    try {
      const payload = normalizeCreatePayload(values);
      if (!payload.name_id || payload.name_id.length < 2) {
        throw new Error("Nama (ID) wajib diisi (min 2 karakter)");
      }
      const res = await fetch("/api/consultants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
  async function updateConsultant(id, values) {
    setOpLoading(true);
    try {
      const payload = normalizeUpdatePayload(values);
      const res = await fetch(`/api/consultants/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
