"use client";

import useSWR from "swr";
import { useCallback, useMemo, useRef, useState } from "react";

const DEFAULT_LOCALE = "id";
const FALLBACK_FOR = (loc) =>
  String(loc).toLowerCase() === "id" ? "en" : "id";
const DEFAULT_PER_PAGE = 10;

const jsonFetcher = (url) =>
  fetch(url).then(async (r) => {
    if (!r.ok) {
      const t = await r.text().catch(() => "");
      throw new Error(t || `Request failed: ${r.status}`);
    }
    return r.json();
  });

function buildListKey({ page, perPage, q, locale, fallback, jurusan_id }) {
  const p = new URLSearchParams();
  p.set("page", String(page));
  p.set("perPage", String(perPage));
  if (q && q.trim()) p.set("q", q.trim());
  if (jurusan_id) p.set("jurusan_id", jurusan_id);
  p.set("locale", locale || DEFAULT_LOCALE);
  p.set("fallback", fallback || FALLBACK_FOR(locale || DEFAULT_LOCALE));
  return `/api/prodi?${p.toString()}`;
}

export default function useProdiViewModel(initial = {}) {
  // ---- state
  const [locale, setLocale] = useState(initial.locale || DEFAULT_LOCALE);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [q, setQ] = useState("");
  const [jurusanId, setJurusanId] = useState("");

  const fallback = FALLBACK_FOR(locale);
  const key = buildListKey({
    page,
    perPage,
    q,
    locale,
    fallback,
    jurusan_id: jurusanId,
  });

  const { data, error, isLoading, mutate } = useSWR(key, jsonFetcher, {
    keepPreviousData: true,
    revalidateOnFocus: false,
  });

  const prodi = useMemo(() => data?.data || [], [data]);

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
    data?.totalPages ?? (prodi.length < perPage && page > 1 ? page : undefined);

  // ---- name caches
  const jurusanCache = useRef(new Map()); // id -> { name, college_id }
  const collegeCache = useRef(new Map()); // id -> name

  const getJurusanDetail = useCallback(
    async (id) => {
      const url = `/api/jurusan/${encodeURIComponent(
        id
      )}?locale=${locale}&fallback=${fallback}`;
      const j = await jsonFetcher(url).catch(() => null);
      const d = j?.data || j;
      if (d?.id) {
        jurusanCache.current.set(d.id, {
          name: d.name || "",
          college_id: d.college_id || "",
        });
        if (d.college_id && !collegeCache.current.has(d.college_id)) {
          const cUrl = `/api/college/${encodeURIComponent(
            d.college_id
          )}?locale=${locale}&fallback=${fallback}`;
          const c = await jsonFetcher(cUrl).catch(() => null);
          const cd = c?.data || c;
          if (cd?.id) collegeCache.current.set(cd.id, cd.name || "");
        }
      }
    },
    [locale, fallback]
  );

  const getCollegeDetail = useCallback(
    async (id) => {
      const url = `/api/college/${encodeURIComponent(
        id
      )}?locale=${locale}&fallback=${fallback}`;
      const c = await jsonFetcher(url).catch(() => null);
      const d = c?.data || c;
      if (d?.id) collegeCache.current.set(d.id, d.name || "");
    },
    [locale, fallback]
  );

  const refreshNamesForPage = useCallback(
    async (rows = []) => {
      const needJur = [];
      const needCol = [];
      for (const r of rows) {
        if (r.jurusan_id && !jurusanCache.current.has(r.jurusan_id)) {
          needJur.push(r.jurusan_id);
        }
        if (r.college_id && !collegeCache.current.has(r.college_id)) {
          needCol.push(r.college_id);
        }
      }
      await Promise.all([
        ...Array.from(new Set(needJur)).map(getJurusanDetail),
        ...Array.from(new Set(needCol)).map(getCollegeDetail),
      ]);
    },
    [getJurusanDetail, getCollegeDetail]
  );

  const jurusanName = useCallback(
    (id) => jurusanCache.current.get(id)?.name || "",
    []
  );
  const collegeName = useCallback(
    (id) => collegeCache.current.get(id) || "",
    []
  );

  const searchJurusanOptions = useCallback(
    async (kw = "") => {
      const p = new URLSearchParams();
      p.set("page", "1");
      p.set("perPage", "20");
      if (kw && kw.trim()) p.set("q", kw.trim());
      p.set("locale", locale);
      p.set("fallback", fallback);
      const j = await jsonFetcher(`/api/jurusan?${p.toString()}`).catch(() => ({
        data: [],
      }));
      const items = j?.data || [];
      // hydrate caches and build option labels
      const opts = [];
      for (const it of items) {
        jurusanCache.current.set(it.id, {
          name: it.name || "",
          college_id: it.college_id || "",
        });
        if (it.college_id && !collegeCache.current.has(it.college_id)) {
          try {
            const c = await jsonFetcher(
              `/api/college/${encodeURIComponent(
                it.college_id
              )}?locale=${locale}&fallback=${fallback}`
            );
            const cd = c?.data || c;
            if (cd?.id) collegeCache.current.set(cd.id, cd.name || "");
          } catch {}
        }
        const label =
          it.name && it.college_id
            ? `${it.name} — ${collegeCache.current.get(it.college_id) || ""}`
            : it.name || "(untitled)";
        opts.push({ value: it.id, label });
      }
      return opts;
    },
    [locale, fallback]
  );

  // ---- CRUD
  const createProdi = useCallback(
    async ({ jurusan_id, name, description, autoTranslate = true }) => {
      const body = new FormData();
      body.set("locale", locale);
      body.set("jurusan_id", jurusan_id || "");
      body.set("name", name || "");
      if (description !== undefined && description !== null)
        body.set("description", String(description));
      body.set("autoTranslate", String(Boolean(autoTranslate)));

      const res = await fetch("/api/prodi", { method: "POST", body });
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

  const getProdi = useCallback(
    async (id) => {
      const res = await fetch(
        `/api/prodi/${encodeURIComponent(
          id
        )}?locale=${locale}&fallback=${fallback}`
      );
      if (!res.ok) return { ok: false, error: await res.text() };
      return { ok: true, data: await res.json() };
    },
    [locale, fallback]
  );

  const updateProdi = useCallback(
    async (id, payload = {}) => {
      const body = new FormData();
      // parent change
      if (payload.jurusan_id !== undefined)
        body.set("jurusan_id", payload.jurusan_id || "");
      // translation fields (need locale)
      if (Object.prototype.hasOwnProperty.call(payload, "name")) {
        body.set("locale", locale);
        body.set("name", payload.name || "");
      }
      if (Object.prototype.hasOwnProperty.call(payload, "description")) {
        body.set("locale", locale);
        body.set(
          "description",
          payload.description === null ? "" : String(payload.description || "")
        );
      }
      if (Object.prototype.hasOwnProperty.call(payload, "autoTranslate")) {
        body.set("autoTranslate", String(Boolean(payload.autoTranslate)));
      }
      const res = await fetch(`/api/prodi/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body,
      });
      if (!res.ok) {
        return {
          ok: false,
          error: (await res.json().catch(() => ({})))?.message || res.status,
        };
      }
      await mutate();
      return { ok: true, data: await res.json() }; // server returns full detail now
    },
    [locale, mutate]
  );

  const deleteProdi = useCallback(
    async (id) => {
      const res = await fetch(`/api/prodi/${encodeURIComponent(id)}`, {
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
    page,
    perPage,
    q,
    jurusanId,
    setLocale,
    setPage,
    setPerPage,
    setQ,
    setJurusanId,

    // data
    prodi,
    total,
    totalPages,
    loading: isLoading,
    error,

    // name helpers
    refreshNamesForPage,
    jurusanName,
    collegeName,

    // select options
    searchJurusanOptions,

    // ops
    createProdi,
    updateProdi,
    deleteProdi,
    getProdi,
  };
}
