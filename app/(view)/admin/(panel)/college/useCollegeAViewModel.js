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

/**
 * Pencarian hanya berdasarkan NAMA:
 * - kirim ?name=... (utama)
 * - kirim ?q_name=... (fallback)
 * (opsional: aktifkan baris ?q=... kalau backend lama masih memakainya)
 */
function buildListKey({ page, perPage, q, locale, fallback, country }) {
  const p = new URLSearchParams();
  p.set("page", String(page));
  p.set("perPage", String(perPage));
  if (q && q.trim()) {
    const name = q.trim();
    p.set("name", name);
    p.set("q_name", name);
    // p.set("q", name);
  }
  if (country) p.set("country", country);
  p.set("locale", locale || DEFAULT_LOCALE);
  p.set("fallback", fallback || FALLBACK_FOR(locale || DEFAULT_LOCALE));
  return `/api/college?${p.toString()}`;
}

function pickEnglishLines(reqItems = []) {
  const out = [];
  for (const it of reqItems) {
    const s = (it?.text || "").trim();
    if (!s) continue;
    const lower = s.toLowerCase();
    if (lower.includes("ielts") || lower.includes("toefl")) out.push(s);
    if (out.length >= 2) break;
  }
  return out;
}

export default function useCollegeAViewModel({ locale = DEFAULT_LOCALE } = {}) {
  // ---- list state
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [q, setQ] = useState(""); // query nama kampus
  const [country, setCountry] = useState("");

  const fallback = FALLBACK_FOR(locale);
  const key = buildListKey({ page, perPage, q, locale, fallback, country });

  const { data, error, isLoading, mutate } = useSWR(key, jsonFetcher, {
    keepPreviousData: true,
    revalidateOnFocus: false,
  });

  const colleges = useMemo(() => data?.data || [], [data]);

  // total pintar (fallback ke panjang data)
  const total = useMemo(() => {
    const d = data || {};
    const candidates = [
      d.total,
      d?.meta?.total,
      d.count,
      d.totalCount,
      d?.pagination?.total,
      d?.paging?.total,
      d?.meta?.count,
      Array.isArray(d.data) ? d.data.length : undefined,
    ];
    const val = candidates.find((v) => v !== undefined && v !== null);
    if (val === undefined || val === null) return undefined;
    const n = Number(val);
    return Number.isFinite(n) ? n : undefined;
  }, [data]);

  const totalPages =
    data?.totalPages ??
    (colleges.length < perPage && page > 1 ? page : undefined);

  // ---- english cache (opsional)
  const englishCache = useRef(new Map());
  const [loadingEnglish, setLoadingEnglish] = useState(false);

  const refreshEnglishForPage = useCallback(async () => {
    if (!colleges?.length) return;
    setLoadingEnglish(true);
    try {
      const jobs = colleges.map(async (c) => {
        if (englishCache.current.has(c.id)) return;
        const url = `/api/college/${encodeURIComponent(
          c.id
        )}/requirements?locale=${locale}&fallback=${fallback}`;
        const json = await jsonFetcher(url).catch(() => ({ data: [] }));
        const lines = pickEnglishLines(json?.data || []);
        englishCache.current.set(c.id, lines);
      });
      await Promise.all(jobs);
    } finally {
      setLoadingEnglish(false);
    }
  }, [colleges, locale, fallback]);

  const money = useCallback((n, currency = "IDR") => {
    if (n === null || n === undefined) return null;
    try {
      const val = typeof n === "string" ? Number(n) : n;
      const loc = currency === "IDR" ? "id-ID" : "en-US";
      return new Intl.NumberFormat(loc, {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(val || 0);
    } catch {
      return String(n);
    }
  }, []);

  // ---- CRUD
  const createCollege = useCallback(
    async ({
      file,
      name,
      description,
      country,
      city,
      state,
      postal_code,
      website,
      address,
      tuition_min,
      tuition_max,
      living_cost_estimate,
      contact_name,
      no_telp,
      email,
      autoTranslate = true,
    }) => {
      const form = new FormData();
      form.set("locale", locale);
      form.set("name", name || "");
      if (description != null) form.set("description", description || "");
      if (country) form.set("country", country);
      if (city) form.set("city", city);
      if (state) form.set("state", state);
      if (postal_code) form.set("postal_code", postal_code);
      if (website) form.set("website", website);
      if (address) form.set("address", address);
      if (tuition_min != null) form.set("tuition_min", String(tuition_min));
      if (tuition_max != null) form.set("tuition_max", String(tuition_max));
      if (living_cost_estimate != null)
        form.set("living_cost_estimate", String(living_cost_estimate));
      if (contact_name != null) form.set("contact_name", String(contact_name));
      if (no_telp != null) form.set("no_telp", String(no_telp));
      if (email != null) form.set("email", String(email));
      form.set("autoTranslate", String(Boolean(autoTranslate)));
      if (file) form.set("file", file);

      const res = await fetch("/api/college", { method: "POST", body: form });
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

  const getCollege = useCallback(
    async (id) => {
      const url = `/api/college/${encodeURIComponent(
        id
      )}?locale=${locale}&fallback=${fallback}`;
      const res = await fetch(url);
      if (!res.ok) return { ok: false, error: await res.text() };
      return { ok: true, data: await res.json() };
    },
    [locale, fallback]
  );

  const updateCollege = useCallback(
    async (id, payload = {}) => {
      const form = new FormData();
      if (payload.file) form.set("file", payload.file);
      if ("name" in payload) {
        form.set("locale", locale);
        form.set("name", payload.name || "");
      }
      for (const k of [
        "country",
        "city",
        "state",
        "postal_code",
        "website",
        "address",
        "tuition_min",
        "tuition_max",
        "living_cost_estimate",
        "contact_name",
        "no_telp",
        "email",
      ]) {
        if (payload[k] !== undefined && payload[k] !== null) {
          form.set(k, String(payload[k]));
        }
      }
      if ("description" in payload) {
        form.set("locale", locale);
        form.set(
          "description",
          payload.description === null ? "" : String(payload.description || "")
        );
      }
      if ("autoTranslate" in payload) {
        form.set("autoTranslate", String(Boolean(payload.autoTranslate)));
      }

      const res = await fetch(`/api/college/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: form,
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

  const deleteCollege = useCallback(
    async (id) => {
      const res = await fetch(`/api/college/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        return {
          ok: false,
          error: (await res.json().catch(() => ({})))?.message || res.status,
        };
      }
      englishCache.current.delete(id);
      await mutate();
      return { ok: true };
    },
    [mutate]
  );

  const englishFor = useCallback(
    (id) => englishCache.current.get(id) || [],
    []
  );

  return {
    // state
    locale,
    fallback,
    page,
    perPage,
    q, // query nama kampus
    country,
    setLocale: () => {},
    setPage,
    setPerPage,
    setQ, // set query nama
    setCountry,

    // data
    colleges,
    total,
    totalPages,
    loading: isLoading,
    error,

    // english requirements
    refreshEnglishForPage,
    loadingEnglish,
    englishFor,

    // money format
    money,

    // ops
    createCollege,
    updateCollege,
    deleteCollege,
    getCollege,
  };
}
