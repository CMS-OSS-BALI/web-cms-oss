"use client";

import useSWR from "swr";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import usePaginationQuerySync from "@/app/hooks/usePaginationQuerySync";

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

function buildListKey({
  page,
  perPage,
  q,
  locale,
  fallback,
  jurusan_id,
  sort,
}) {
  const p = new URLSearchParams();
  p.set("page", String(page));
  p.set("perPage", String(perPage));
  if (q && q.trim()) p.set("q", q.trim());
  if (jurusan_id) p.set("jurusan_id", jurusan_id);
  p.set("locale", locale || DEFAULT_LOCALE);
  p.set("fallback", fallback || FALLBACK_FOR(locale || DEFAULT_LOCALE));
  if (sort) p.set("sort", String(sort));
  return `/api/prodi?${p.toString()}`;
}

// Decimal-like → number
const toNum = (x) => {
  if (x === null || x === undefined || x === "") return null;
  if (typeof x === "number") return x;
  if (typeof x === "object" && typeof x?.toString === "function") {
    const n = Number(x.toString());
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
};

// timestamp
const toTs = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const d = new Date(String(v));
  const t = d.getTime();
  return Number.isFinite(t) ? t : null;
};

export default function useProdiViewModel(initial = {}) {
  // ---- state
  const [locale, setLocale] = useState(initial.locale || DEFAULT_LOCALE);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [sort, setSort] = useState(DEFAULT_SORT);

  // wrap setters to reset page on filter changes
  const [_q, _setQ] = useState("");
  const setQ = useCallback((v) => {
    _setQ(v);
    setPage(1);
  }, []);

  const [_jurusanId, _setJurusanId] = useState("");
  const setJurusanId = useCallback((v) => {
    _setJurusanId(v);
    setPage(1);
  }, []);

  const fallback = FALLBACK_FOR(locale);
  const key = buildListKey({
    page,
    perPage,
    q: _q,
    locale,
    fallback,
    jurusan_id: _jurusanId,
    sort,
  });

  const { data, error, isLoading, mutate } = useSWR(key, jsonFetcher, {
    keepPreviousData: true,
    revalidateOnFocus: false,
  });
  usePaginationQuerySync({
    page,
    perPage,
    setPage,
    setPerPage,
    hydrateFromQuery: true,
  });
  // revalidate setiap parameter key (page/filter/sort) berubah
  useEffect(() => {
    mutate();
  }, [key, mutate]);

  const prodi = useMemo(() => {
    const rows = data?.data || [];
    return rows.map((r) => ({
      ...r,
      harga: toNum(r.harga),
      created_ts:
        r.created_ts ?? toTs(r.created_at) ?? toTs(r.updated_at) ?? null,
    }));
  }, [data]);

  const total = useMemo(() => {
    const d = data || {};
    const candidates = [
      d?.meta?.total,
      d.total,
      d.count,
      d.totalCount,
      d?.pagination?.total,
    ];
    const val = candidates.find((v) => v !== undefined && v !== null);
    if (val === undefined || val === null) return undefined;
    const n = Number(val);
    return Number.isFinite(n) ? n : undefined;
  }, [data]);

  const totalPages = data?.meta?.totalPages ?? data?.totalPages ?? undefined;

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
        if (r.jurusan_id && !jurusanCache.current.has(r.jurusan_id))
          needJur.push(r.jurusan_id);
        if (r.college_id && !collegeCache.current.has(r.college_id))
          needCol.push(r.college_id);
      }
      await Promise.all([
        ...Array.from(new Set(needJur)).map(getJurusanDetail),
        ...Array.from(new Set(needCol)).map(getCollegeDetail),
      ]);
    },
    [getJurusanDetail, getCollegeDetail]
  );

  const jurusanName = useCallback(
    (id) => (id ? jurusanCache.current.get(id)?.name || "" : ""),
    []
  );
  const collegeName = useCallback(
    (id) => (id ? collegeCache.current.get(id) || "" : ""),
    []
  );

  // optional helper: dapatkan college_id dari cache jurusan
  const collegeIdOfJurusan = useCallback((jurId) => {
    if (!jurId) return "";
    return jurusanCache.current.get(jurId)?.college_id || "";
  }, []);

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

  /* ----------------------------- CRUD ----------------------------- */
  const createProdi = useCallback(
    async ({
      jurusan_id,
      name,
      description,
      in_take,
      harga,
      autoTranslate = true,
    }) => {
      const payload = {
        locale,
        jurusan_id: jurusan_id || null,
        name,
        description: description ?? null,
        in_take: in_take ?? null, // string: "Januari, Maret" atau null
        harga: harga ?? null, // stringMode (server normalize)
        autoTranslate: Boolean(autoTranslate),
      };
      const res = await fetch("/api/prodi", {
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
        return {
          ok: false,
          error: msg || res.status,
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
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        return { ok: false, error: txt || res.status };
      }
      const json = await res.json();
      if (json?.data) json.data.harga = toNum(json.data.harga);
      const d = json?.data || json;
      const created_ts =
        d.created_ts ?? toTs(d.created_at) ?? toTs(d.updated_at) ?? null;
      return { ok: true, data: { ...json, data: { ...d, created_ts } } };
    },
    [locale, fallback]
  );

  const updateProdi = useCallback(
    async (id, payload = {}) => {
      const res = await fetch(`/api/prodi/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, ...payload }), // kirim locale untuk upsert translate
      });
      if (!res.ok) {
        let msg = "";
        try {
          const j = await res.json();
          msg = j?.error?.message || j?.message;
        } catch {
          msg = await res.text();
        }
        return {
          ok: false,
          error: msg || res.status,
        };
      }
      await mutate();
      return { ok: true, data: await res.json() };
    },
    [locale, mutate]
  );

  const deleteProdi = useCallback(
    async (id) => {
      const res = await fetch(`/api/prodi/${encodeURIComponent(id)}`, {
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
        return {
          ok: false,
          error: msg || res.status,
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
    sort,
    q: _q,
    jurusanId: _jurusanId,
    setLocale,
    setPage,
    setPerPage,
    setQ,
    setJurusanId,
    setSort,

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
    collegeIdOfJurusan,

    // select options
    searchJurusanOptions,

    // ops
    createProdi,
    updateProdi,
    deleteProdi,
    getProdi,
  };
}
