// app/(view)/admin/kota/useKotaViewModel.js
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/swr/fetcher";

const DEFAULT_LOCALE = "id";
const DEFAULT_FALLBACK = "id";
const DEFAULT_PER_PAGE = 10;
const DEFAULT_SORT = "created_at:desc";

/* ===== list key builder ===== */
function buildListQuery({
  page,
  perPage,
  q,
  sort,
  locale,
  fallback,
  withInactive,
  onlyInactive,
  negaraId,
}) {
  const p = new URLSearchParams();
  p.set("page", String(page));
  p.set("perPage", String(perPage));
  if (q && q.trim()) p.set("q", q.trim());
  if (sort) p.set("sort", String(sort));
  p.set("locale", locale || DEFAULT_LOCALE);
  p.set("fallback", fallback || DEFAULT_FALLBACK);
  if (withInactive) p.set("with_inactive", "1");
  if (onlyInactive) p.set("only_inactive", "1");
  if (negaraId) p.set("negara_id", String(negaraId));
  return `/api/kota?${p.toString()}`;
}

/* ===== error helper ===== */
function extractErrorMessage(json, fallback = "Terjadi kesalahan.") {
  if (!json || typeof json !== "object") return fallback;
  return json?.error?.message || json?.message || json?.error?.hint || fallback;
}

/* ===== to timestamp ===== */
const toTs = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const d = new Date(String(v));
  const t = d.getTime();
  return Number.isFinite(t) ? t : null;
};

export default function useKotaViewModel(initial = {}) {
  const [locale, setLocale] = useState(initial.locale || DEFAULT_LOCALE);
  const [fallback, setFallback] = useState(DEFAULT_FALLBACK);

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [sort, setSort] = useState(DEFAULT_SORT);

  // search
  const [_q, _setQ] = useState("");
  const setQ = useCallback((v) => {
    _setQ(v || "");
    setPage(1);
  }, []);

  // negara filter
  const [_negaraId, _setNegaraId] = useState("");
  const setNegaraId = useCallback((v) => {
    _setNegaraId(v || "");
    setPage(1);
  }, []);

  // status -> withInactive / onlyInactive
  const [status, setStatus] = useState("active"); // active | inactive | all
  const [withInactive, setWithInactive] = useState(false);
  const [onlyInactive, setOnlyInactive] = useState(false);

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

  const listKey = buildListQuery({
    page,
    perPage,
    q: _q,
    sort,
    locale,
    fallback,
    withInactive,
    onlyInactive,
    negaraId: _negaraId,
  });

  const {
    data: listJson,
    error: listErrorObj,
    isLoading: listLoading,
    mutate: mutateList,
  } = useSWR(listKey, fetcher, {
    keepPreviousData: true,
    revalidateOnFocus: false,
  });

  // normalize rows
  const kota = useMemo(() => {
    const rows = listJson?.data ?? [];
    return rows.map((r) => {
      const createdAt = r.created_at || null;
      const updatedAt = r.updated_at || null;
      const createdTs =
        r.created_ts ?? toTs(createdAt) ?? toTs(updatedAt) ?? null;
      const updatedTs = r.updated_ts ?? toTs(updatedAt) ?? null;
      return {
        ...r,
        created_at: createdAt,
        created_ts: createdTs,
        updated_at: updatedAt,
        updated_ts: updatedTs,
        is_active: !!r.is_active,
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

  // non-GET operations loading
  const [opLoading, setOpLoading] = useState(false);

  /* ---------- Negara name cache ---------- */
  const negaraNameCache = useRef(new Map());
  const negaraName = useCallback((id) => {
    if (!id) return "";
    return negaraNameCache.current.get(String(id)) || "";
  }, []);

  const refreshNegaraNamesForPage = useCallback(
    async (rows = []) => {
      const missing = [];
      for (const r of rows) {
        const key = String(r.negara_id || "");
        if (key && !negaraNameCache.current.has(key)) missing.push(key);
      }
      if (!missing.length) return;
      const uniq = Array.from(new Set(missing));
      await Promise.all(
        uniq.map(async (id) => {
          try {
            const url = `/api/negara/${encodeURIComponent(
              id
            )}?locale=${encodeURIComponent(
              locale || DEFAULT_LOCALE
            )}&fallback=${encodeURIComponent(fallback || DEFAULT_FALLBACK)}`;
            const res = await fetch(url);
            const json = await res.json().catch(() => ({}));
            const name = json?.data?.name || json?.name || "(Tanpa Nama)";
            negaraNameCache.current.set(String(id), String(name || ""));
          } catch {
            // silent
          }
        })
      );
    },
    [locale, fallback]
  );

  const searchNegaraOptions = useCallback(
    async (keyword = "") => {
      const p = new URLSearchParams();
      p.set("perPage", "20");
      if (keyword.trim()) p.set("q", keyword.trim());
      p.set("locale", locale || DEFAULT_LOCALE);
      p.set("fallback", fallback || DEFAULT_FALLBACK);
      // untuk filter referensi, include inactive juga
      p.set("with_inactive", "1");
      const url = `/api/negara?${p.toString()}`;
      try {
        const res = await fetch(url);
        const json = await res.json().catch(() => ({ data: [] }));
        const opts = (json?.data || []).map((n) => ({
          value: n.id,
          label: n.name || "(Tanpa Nama)",
        }));
        for (const o of opts)
          negaraNameCache.current.set(String(o.value), o.label);
        return opts;
      } catch {
        return [];
      }
    },
    [locale, fallback]
  );

  /* ----------------------------- CRUD ----------------------------- */
  async function createKota(payload = {}) {
    setOpLoading(true);
    try {
      const body = {
        negara_id: payload.negara_id,
        name_id: payload.name_id,
        living_cost:
          payload.living_cost === "" ? null : payload.living_cost ?? null,
        is_active: payload.is_active === undefined ? true : !!payload.is_active,
        // autoTranslate tidak dikirim; server default true
      };

      const res = await fetch("/api/kota", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const info = await res.json().catch(() => null);
        const msg = extractErrorMessage(info, "Gagal menambah kota");
        throw new Error(msg);
      }

      // kota baru → kembali ke halaman pertama
      setPage(1);
      await refresh();

      return { ok: true };
    } catch (err) {
      return { ok: false, error: err?.message || "Gagal menambah kota" };
    } finally {
      setOpLoading(false);
    }
  }

  async function updateKota(id, payload = {}) {
    setOpLoading(true);
    try {
      const body = {
        ...payload,
      };
      if ("living_cost" in body) {
        body.living_cost =
          body.living_cost === "" || body.living_cost === undefined
            ? null
            : body.living_cost;
      }

      const res = await fetch(`/api/kota/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const info = await res.json().catch(() => null);
        const msg = extractErrorMessage(info, "Gagal memperbarui kota");
        throw new Error(msg);
      }

      await refresh();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err?.message || "Gagal memperbarui kota" };
    } finally {
      setOpLoading(false);
    }
  }

  async function deleteKota(id) {
    setOpLoading(true);
    try {
      const res = await fetch(`/api/kota/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const info = await res.json().catch(() => null);
        const msg = extractErrorMessage(info, "Gagal menonaktifkan kota");
        throw new Error(msg);
      }

      // setelah nonaktif, refresh list
      await refresh();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err?.message || "Gagal menonaktifkan kota" };
    } finally {
      setOpLoading(false);
    }
  }

  async function getKota(id) {
    try {
      const url = `/api/kota/${encodeURIComponent(
        id
      )}?locale=${encodeURIComponent(
        locale || DEFAULT_LOCALE
      )}&fallback=${encodeURIComponent(fallback || DEFAULT_FALLBACK)}`;
      const res = await fetch(url, { method: "GET" });
      if (!res.ok) {
        const info = await res.json().catch(() => null);
        const msg = extractErrorMessage(info, "Gagal memuat detail kota");
        throw new Error(msg);
      }
      const json = await res.json();
      const data = json?.data ?? json;
      const created_ts =
        data.created_ts ??
        toTs(data.created_at) ??
        toTs(data.updated_at) ??
        null;
      return { ok: true, data: { ...json, data: { ...data, created_ts } } };
    } catch (e) {
      return { ok: false, error: e?.message || "Gagal memuat detail kota" };
    }
  }

  const listError = listErrorObj?.message || "";

  return {
    // data
    kota,
    total,
    totalPages,

    // filters & pagination
    locale,
    setLocale,
    fallback,
    setFallback,
    page,
    setPage,
    perPage,
    setPerPage,
    sort,
    setSort,
    q: _q,
    setQ,
    negaraId: _negaraId,
    setNegaraId,
    status,
    setStatus,
    withInactive,
    onlyInactive,

    // state
    loading: listLoading,
    opLoading,
    listError,

    // helpers
    refresh,
    negaraName,
    refreshNegaraNamesForPage,
    searchNegaraOptions,

    // ops
    createKota,
    updateKota,
    deleteKota,
    getKota,
  };
}
