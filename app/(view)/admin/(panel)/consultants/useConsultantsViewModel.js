"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/swr/fetcher";

const DEFAULT_SORT = "created_at:desc";

function buildKey({ page, perPage, q, sort }) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("perPage", String(perPage));
  if (q && q.trim()) params.set("q", q.trim());
  if (sort) params.set("sort", sort);
  return `/api/consultants?${params.toString()}`;
}

function normalizePayload(values = {}) {
  return {
    name: values.name?.trim?.() || "",
    email: values.email?.trim?.() || null,
    whatsapp: values.whatsapp?.trim?.() || null,
  };
}

export default function useConsultantsViewModel() {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState(DEFAULT_SORT);
  const [opLoading, setOpLoading] = useState(false);

  const listKey = useMemo(
    () => buildKey({ page, perPage, q, sort }),
    [page, perPage, q, sort]
  );

  const {
    data: listJson,
    error: listErrorObj,
    isLoading,
    mutate,
  } = useSWR(listKey, fetcher);

  const consultants = listJson?.data ?? [];
  const total = listJson?.meta?.total ?? 0;
  const metaPage = listJson?.meta?.page;
  const metaPerPage = listJson?.meta?.perPage;

  useEffect(() => {
    if (metaPage && metaPage !== page) setPage(metaPage);
    if (metaPerPage && metaPerPage !== perPage) setPerPage(metaPerPage);
  }, [metaPage, metaPerPage, page, perPage]);

  const totalPages = useMemo(() => {
    const denom = metaPerPage ?? perPage ?? 1; // ← fix: no mixing ?? with ||
    return Math.max(1, Math.ceil(total / denom));
  }, [total, metaPerPage, perPage]);

  const refresh = useCallback(() => mutate(), [mutate]);

  async function createConsultant(values) {
    setOpLoading(true);
    try {
      const payload = normalizePayload(values);
      const res = await fetch("/api/consultants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const info = await res.json().catch(() => null);
        throw new Error(
          info?.error?.message || info?.message || "Gagal menambah konsultan"
        );
      }
      await refresh();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err?.message || "Gagal menambah konsultan" };
    } finally {
      setOpLoading(false);
    }
  }

  async function updateConsultant(id, values) {
    setOpLoading(true);
    try {
      const payload = normalizePayload(values);
      const res = await fetch(`/api/consultants/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const info = await res.json().catch(() => null);
        throw new Error(
          info?.error?.message || info?.message || "Gagal memperbarui konsultan"
        );
      }
      await refresh();
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err?.message || "Gagal memperbarui konsultan",
      };
    } finally {
      setOpLoading(false);
    }
  }

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
    consultants,
    total,
    totalPages,
    page,
    perPage,
    q,
    sort,
    setPage,
    setPerPage,
    setQ,
    setSort,
    loading: isLoading,
    opLoading,
    listError,
    createConsultant,
    updateConsultant,
    deleteConsultant,
    refresh,
  };
}
