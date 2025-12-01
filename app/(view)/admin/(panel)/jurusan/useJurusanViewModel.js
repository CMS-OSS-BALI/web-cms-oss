"use client";

import useSWR from "swr";
import { useCallback, useMemo, useRef, useState } from "react";

const DEFAULT_LOCALE = "id";
const FALLBACK_FOR = (loc) =>
  String(loc).toLowerCase() === "id" ? "en" : "id";
const DEFAULT_PER_PAGE = 10;
const DEFAULT_SORT = "created_at:desc";

const jsonFetcher = (url) =>
  fetch(url).then(async (r) => {
    if (!r.ok) {
      let msg = "";
      try {
        const j = await r.json();
        msg = j?.error?.message || j?.message || "";
      } catch {
        msg = await r.text().catch(() => "");
      }
      throw new Error(msg || `Request failed: ${r.status}`);
    }
    return r.json();
  });

const toTs = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const d = new Date(String(v));
  const t = d.getTime();
  return Number.isFinite(t) ? t : null;
};

function buildListKey({ page, perPage, q, locale, fallback, collegeId, sort }) {
  const p = new URLSearchParams();
  p.set("page", String(page));
  p.set("perPage", String(perPage));
  if (q && q.trim()) p.set("q", q.trim());
  if (collegeId) p.set("college_id", String(collegeId));
  p.set("locale", locale);
  p.set("fallback", fallback);
  if (sort) p.set("sort", String(sort));
  return `/api/jurusan?${p.toString()}`;
}

export default function useJurusanViewModel(initial = {}) {
  const [locale, setLocale] = useState(initial.locale || DEFAULT_LOCALE);
  const fallback = FALLBACK_FOR(locale);

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [sort, setSort] = useState(DEFAULT_SORT);

  // reset page saat filter berubah
  const [_q, _setQ] = useState("");
  const setQ = useCallback((v) => {
    _setQ(v);
    setPage(1);
  }, []);

  const [_collegeId, _setCollegeId] = useState("");
  const setCollegeId = useCallback((v) => {
    _setCollegeId(v);
    setPage(1);
  }, []);

  const key = buildListKey({
    page,
    perPage,
    q: _q,
    locale,
    fallback,
    collegeId: _collegeId,
    sort,
  });

  const { data, error, isLoading, mutate } = useSWR(key, jsonFetcher, {
    keepPreviousData: true,
    revalidateOnFocus: false,
  });

  // normalize rows
  const jurusan = useMemo(() => {
    const rows = data?.data || [];
    return rows.map((r) => ({
      ...r,
      created_ts:
        r.created_ts ?? toTs(r.created_at) ?? toTs(r.updated_at) ?? null,
      // kota_name & harga sudah dipetakan server (mapJurusan + sanitize)
    }));
  }, [data]);

  // meta
  const meta = data?.meta || {};
  const total =
    meta.total ??
    data?.total ??
    (Array.isArray(data?.data) ? data.data.length : undefined);
  const totalPages =
    meta.totalPages ??
    (jurusan.length < perPage && page > 1 ? page : undefined);

  /* ---------- College name cache ---------- */
  const collegeNameCache = useRef(new Map());
  const collegeName = useCallback(
    (id) => (id ? collegeNameCache.current.get(String(id)) || "" : ""),
    []
  );
  const refreshCollegeNamesForPage = useCallback(
    async (rows = []) => {
      const missing = [];
      for (const r of rows) {
        const key = String(r.college_id || "");
        if (key && !collegeNameCache.current.has(key)) missing.push(key);
      }
      if (!missing.length) return;
      await Promise.all(
        Array.from(new Set(missing)).map(async (id) => {
          const url = `/api/college/${encodeURIComponent(
            id
          )}?locale=${locale}&fallback=${fallback}`;
          const json = await jsonFetcher(url).catch(() => null);
          const name =
            json?.data?.name ||
            json?.name ||
            json?.data?.title ||
            "(Tanpa Nama)";
          collegeNameCache.current.set(String(id), String(name || ""));
        })
      );
    },
    [locale, fallback]
  );

  const searchCollegeOptions = useCallback(
    async (keyword = "") => {
      const p = new URLSearchParams();
      p.set("perPage", "10");
      if (keyword.trim()) p.set("name", keyword.trim()); // server mendukung filter name
      p.set("locale", locale);
      p.set("fallback", fallback);
      const url = `/api/college?${p.toString()}`;
      const json = await jsonFetcher(url).catch(() => ({ data: [] }));
      const opts = (json?.data || []).map((c) => ({
        value: c.id,
        label: c.name || "(Tanpa Nama)",
      }));
      for (const o of opts)
        collegeNameCache.current.set(String(o.value), o.label);
      return opts;
    },
    [locale, fallback]
  );

  /* ---------- Kota options (untuk form) ---------- */
  const searchKotaOptions = useCallback(
    async (keyword = "") => {
      const p = new URLSearchParams();
      p.set("perPage", "10");
      if (keyword.trim()) p.set("q", keyword.trim());
      p.set("locale", locale);
      p.set("fallback", fallback);
      const url = `/api/kota?${p.toString()}`;
      const json = await jsonFetcher(url).catch(() => ({ data: [] }));
      const opts = (json?.data || []).map((k) => ({
        value: k.id,
        label: k.name || k.name_id || k.name_en || k.label || "(Tanpa Nama)",
      }));
      return opts;
    },
    [locale, fallback]
  );

  /* ----------------------------- CRUD ----------------------------- */
  const createJurusan = useCallback(
    async ({
      college_id,
      name,
      description,
      harga,
      kota_id,
      autoTranslate,
    }) => {
      const payload = {
        locale,
        college_id,
        name,
        description: description ?? null,
        harga: harga ?? null, // stringMode -> server toDecimalNullable
        // kota_id optional; boleh null/array
        ...(kota_id !== undefined ? { kota_id } : {}),
        autoTranslate: !!(autoTranslate ?? true),
      };
      const res = await fetch("/api/jurusan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let msg = "";
        try {
          const j = await res.json();
          msg = j?.error?.message || j?.message;
        } catch {
          msg = await res.text();
        }
        return { ok: false, error: msg || res.status };
      }
      const json = await res.json();
      setPage(1); // pastikan item baru tampil di halaman pertama
      await mutate(undefined, { revalidate: true });
      return { ok: true, data: json };
    },
    [locale, mutate, setPage]
  );

  const getJurusan = useCallback(
    async (id) => {
      const url = `/api/jurusan/${encodeURIComponent(
        id
      )}?locale=${locale}&fallback=${fallback}`;
      const res = await fetch(url);
      if (!res.ok) return { ok: false, error: await res.text() };
      const json = await res.json();
      const d = json?.data || json;
      const created_ts =
        d.created_ts ?? toTs(d.created_at) ?? toTs(d.updated_at) ?? null;
      return { ok: true, data: { ...json, data: { ...d, created_ts } } };
    },
    [locale, fallback]
  );

  const updateJurusan = useCallback(
    async (id, payload = {}) => {
      const {
        college_id,
        name,
        description,
        harga,
        kota_id,
        autoTranslate,
      } = payload;

      const body = {
        locale,
        ...(college_id !== undefined ? { college_id } : {}),
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(harga !== undefined ? { harga } : {}),
        ...(kota_id !== undefined ? { kota_id } : {}),
        ...(autoTranslate !== undefined ? { autoTranslate } : {}),
      };

      const res = await fetch(`/api/jurusan/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        let msg = "";
        try {
          const j = await res.json();
          msg = j?.error?.message || j?.message;
        } catch {
          msg = await res.text();
        }
        return { ok: false, error: msg || res.status };
      }
      const json = await res.json();
      await mutate(undefined, { revalidate: true });
      return { ok: true, data: json };
    },
    [locale, mutate]
  );

  const deleteJurusan = useCallback(
    async (id) => {
      const res = await fetch(`/api/jurusan/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        let msg = "";
        try {
          const j = await res.json();
          msg = j?.error?.message || j?.message;
        } catch {
          msg = await res.text();
        }
        return { ok: false, error: msg || res.status };
      }
      await mutate(undefined, { revalidate: true });
      return { ok: true };
    },
    [mutate]
  );

  return {
    // state
    locale,
    fallback,
    setLocale,
    page,
    perPage,
    sort,
    q: _q,
    collegeId: _collegeId,
    setPage,
    setPerPage,
    setQ,
    setCollegeId,
    setSort,

    // data
    jurusan,
    total,
    totalPages,
    loading: isLoading,
    error,

    // college helpers
    collegeName,
    refreshCollegeNamesForPage,
    searchCollegeOptions,

    // kota helpers
    searchKotaOptions,

    // ops
    createJurusan,
    updateJurusan,
    deleteJurusan,
    getJurusan,
  };
}
