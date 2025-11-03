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

function buildListKey({
  page,
  perPage,
  q,
  locale,
  fallback,
  country,
  jenjang,
}) {
  const p = new URLSearchParams();
  p.set("page", String(page));
  p.set("perPage", String(perPage));
  if (q && q.trim()) p.set("q", q.trim());
  if (country) p.set("country", country);
  if (jenjang) p.set("jenjang", jenjang);
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
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("");
  const [jenjang, setJenjang] = useState("");

  const fallback = FALLBACK_FOR(locale);
  const key = buildListKey({
    page,
    perPage,
    q,
    locale,
    fallback,
    country,
    jenjang,
  });

  const { data, error, isLoading, mutate } = useSWR(key, jsonFetcher, {
    keepPreviousData: true,
    revalidateOnFocus: false,
  });

  const colleges = useMemo(() => data?.data || [], [data]);

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

  // ===== Requirements API =====
  const listRequirements = useCallback(
    async (collegeId, { prodi_id } = {}) => {
      const p = new URLSearchParams();
      p.set("locale", locale);
      p.set("fallback", fallback);
      if (prodi_id) p.set("prodi_id", prodi_id);
      const res = await fetch(
        `/api/college/${encodeURIComponent(
          collegeId
        )}/requirements?${p.toString()}`
      );
      if (!res.ok) {
        return { ok: false, error: await res.text() };
      }
      const json = await res.json();
      return { ok: true, data: Array.isArray(json?.data) ? json.data : [] };
    },
    [locale, fallback]
  );

  const createRequirement = useCallback(
    async (
      collegeId,
      { text, prodi_id, sort, loc = locale, autoTranslate = true } = {}
    ) => {
      const body = { text, locale: loc, autoTranslate };
      if (prodi_id) body.prodi_id = String(prodi_id);
      if (Number.isFinite(sort)) body.sort = Number(sort);

      const res = await fetch(
        `/api/college/${encodeURIComponent(collegeId)}/requirements`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) {
        return {
          ok: false,
          error: (await res.json().catch(() => ({})))?.message || res.status,
        };
      }
      const json = await res.json().catch(() => ({}));
      return { ok: true, data: json?.data || {} };
    },
    [locale]
  );

  const updateRequirement = useCallback(
    async (
      collegeId,
      reqId,
      { text, prodi_id, sort, loc = locale, autoTranslate = true } = {}
    ) => {
      const body = { locale: loc, autoTranslate };
      if (text !== undefined) body.text = text;
      if (prodi_id !== undefined) body.prodi_id = prodi_id || "";
      if (sort !== undefined) body.sort = sort;

      const res = await fetch(
        `/api/college/${encodeURIComponent(
          collegeId
        )}/requirements/${encodeURIComponent(reqId)}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) {
        return {
          ok: false,
          error: (await res.json().catch(() => ({})))?.message || res.status,
        };
      }
      const json = await res.json().catch(() => ({}));
      return { ok: true, data: json?.data || {} };
    },
    [locale]
  );

  const deleteRequirement = useCallback(async (collegeId, reqId) => {
    const res = await fetch(
      `/api/college/${encodeURIComponent(
        collegeId
      )}/requirements/${encodeURIComponent(reqId)}`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      return {
        ok: false,
        error: (await res.json().catch(() => ({})))?.message || res.status,
      };
    }
    return { ok: true };
  }, []);

  const bulkCreateRequirements = useCallback(
    async (
      collegeId,
      items = [],
      { loc = locale, autoTranslate = true } = {}
    ) => {
      const results = [];
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (!it?.text?.trim()) continue;
        const sort = Number.isFinite(it.sort) ? it.sort : i + 1;
        const r = await createRequirement(collegeId, {
          text: it.text.trim(),
          prodi_id: it.prodi_id,
          sort,
          loc,
          autoTranslate,
        });
        results.push(r);
      }
      return results;
    },
    [createRequirement, locale]
  );
  // ===========================================

  // ---- CRUD College ----

  // Helper clamp page setelah delete (pakai meta total jika ada; fallback dari panjang rows)
  const clampPageAfterDelete = useCallback(() => {
    // Jika kita punya total meta → hitung dari sana
    if (Number.isFinite(total)) {
      const newTotal = Math.max(0, Number(total) - 1);
      const nextTotalPages = Math.max(
        1,
        Math.ceil(newTotal / Math.max(1, perPage))
      );
      setPage((p) => Math.min(p, nextTotalPages));
      return;
    }
    // Fallback: kalau di halaman ini tinggal 1 item dan >1 page, mundur 1 halaman
    if (colleges.length <= 1 && page > 1) {
      setPage(page - 1);
    }
  }, [total, perPage, colleges.length, page]);

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
      jenjang,
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
      if (jenjang != null && jenjang !== "")
        form.set("jenjang", String(jenjang));
      form.set("autoTranslate", String(Boolean(autoTranslate)));
      if (file) form.set("file", file);

      const res = await fetch("/api/college", { method: "POST", body: form });
      if (!res.ok) {
        return {
          ok: false,
          error: (await res.json().catch(() => ({})))?.message || res.status,
        };
      }
      const json = await res.json().catch(() => ({}));

      // 🔁 Reset ke halaman 1 agar item baru langsung terlihat
      if (page !== 1) setPage(1);
      await mutate(); // revalidate list

      return { ok: true, data: json };
    },
    [locale, mutate, page]
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
      if ("jenjang" in payload && payload.jenjang !== undefined) {
        const v = payload.jenjang;
        if (v === null || v === "") form.set("jenjang", "");
        else form.set("jenjang", String(v));
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
      const json = await res.json().catch(() => ({}));
      await mutate(); // update tidak perlu adjust page
      return { ok: true, data: json };
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

      // 🔁 Clamp halaman terhadap total baru agar tidak tersisa di page kosong
      clampPageAfterDelete();

      await mutate();
      return { ok: true };
    },
    [mutate, clampPageAfterDelete]
  );

  const englishFor = useCallback(
    (id) => englishCache.current.get(id) || [],
    []
  );

  return {
    locale,
    fallback,
    page,
    perPage,
    q,
    country,
    jenjang,
    setLocale: () => {},
    setPage,
    setPerPage,
    setQ,
    setCountry,
    setJenjang,

    colleges,
    total,
    totalPages,
    loading: isLoading,
    error,

    refreshEnglishForPage,
    loadingEnglish,
    englishFor,

    money,

    createCollege,
    updateCollege,
    deleteCollege,
    getCollege,

    listRequirements,
    createRequirement,
    updateRequirement,
    deleteRequirement,
    bulkCreateRequirements,
  };
}
