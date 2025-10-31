"use client";

import useSWR from "swr";
import { useCallback, useMemo, useRef, useState } from "react";

const DEFAULT_LOCALE = "id";
const FALLBACK_FOR = (loc) =>
  String(loc).toLowerCase() === "id" ? "en" : "id";
const DEFAULT_PER_PAGE = 10;

const jsonFetcher = (url) =>
  fetch(url).then(async (r) => {
    if (!r.ok) throw new Error((await r.text().catch(() => "")) || r.status);
    return r.json();
  });

const toTs = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const d = new Date(String(v));
  const t = d.getTime();
  return Number.isFinite(t) ? t : null;
};

function buildListKey({ page, perPage, q, locale, fallback, collegeId }) {
  const p = new URLSearchParams();
  p.set("page", String(page));
  p.set("perPage", String(perPage));
  if (q && q.trim()) p.set("q", q.trim());
  if (collegeId) p.set("college_id", String(collegeId));
  p.set("locale", locale);
  p.set("fallback", fallback);
  return `/api/jurusan?${p.toString()}`;
}

export default function useJurusanViewModel(initial = {}) {
  const [locale, setLocale] = useState(initial.locale || DEFAULT_LOCALE);
  const fallback = FALLBACK_FOR(locale);

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);

  // wrap setters -> selalu reset page ke 1 saat filter berubah
  const [_q, _setQ] = useState("");
  const setQ = useCallback(
    (v) => {
      _setQ(v);
      setPage(1);
    },
    [setPage]
  );

  const [_collegeId, _setCollegeId] = useState("");
  const setCollegeId = useCallback(
    (v) => {
      _setCollegeId(v);
      setPage(1);
    },
    [setPage]
  );

  const key = buildListKey({
    page,
    perPage,
    q: _q,
    locale,
    fallback,
    collegeId: _collegeId,
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
    }));
  }, [data]);

  const total = useMemo(() => {
    const d = data || {};
    const candidates = [
      d.total,
      d?.meta?.total,
      d.count,
      d.totalCount,
      d?.pagination?.total,
      Array.isArray(d.data) ? d.data.length : undefined,
    ];
    const val = candidates.find((v) => v !== undefined && v !== null);
    if (val === undefined || val === null) return undefined;
    const n = Number(val);
    return Number.isFinite(n) ? n : undefined;
  }, [data]);

  const totalPages =
    data?.totalPages ??
    (jurusan.length < perPage && page > 1 ? page : undefined);

  /* ---------- College name cache ---------- */
  const collegeNameCache = useRef(new Map());

  const collegeName = useCallback((id) => {
    if (!id) return "";
    return collegeNameCache.current.get(String(id)) || "";
  }, []);

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
      if (keyword.trim()) p.set("name", keyword.trim());
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

  /* ----------------------------- CRUD ----------------------------- */
  const createJurusan = useCallback(
    async ({ college_id, name, description, autoTranslate = true }) => {
      const payload = {
        locale,
        college_id,
        name,
        description: description ?? null,
        autoTranslate: Boolean(autoTranslate),
      };
      const res = await fetch("/api/jurusan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        return {
          ok: false,
          error: (await res.json().catch(() => ({})))?.message || res.status,
        };
      }
      await mutate();
      return { ok: true, data: await res.json() };
    },
    [locale, mutate]
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
      const res = await fetch(`/api/jurusan/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          ...payload,
        }),
      });
      if (!res.ok) {
        return {
          ok: false,
          error: (await res.json().catch(() => ({})))?.message || res.status,
        };
      }
      await mutate();
      return { ok: true, data: await res.json() };
    },
    [locale, mutate]
  );

  const deleteJurusan = useCallback(
    async (id) => {
      const res = await fetch(`/api/jurusan/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        return {
          ok: false,
          error: (await res.json().catch(() => ({})))?.message || res.status,
        };
      }
      await mutate();
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
    q: _q,
    collegeId: _collegeId,
    setPage,
    setPerPage,
    setQ,
    setCollegeId,

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

    // ops
    createJurusan,
    updateJurusan,
    deleteJurusan,
    getJurusan,
  };
}
