"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_SORT = "created_at:desc";
const DEFAULT_LOCALE = "id";
const fallbackFor = (loc) => (String(loc).toLowerCase() === "id" ? "en" : "id");

// ---- helpers ----
function buildKey({
  page,
  perPage,
  q,
  serviceType,
  published,
  categoryId,
  sort,
  locale,
  fallback,
}) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("perPage", String(perPage));
  params.set("sort", sort || DEFAULT_SORT);
  params.set("locale", locale || DEFAULT_LOCALE);
  params.set("fallback", fallback || fallbackFor(locale || DEFAULT_LOCALE));
  if (q && q.trim()) params.set("q", q.trim());
  if (serviceType) params.set("service_type", serviceType);
  if (published !== undefined) params.set("published", String(!!published));
  if (categoryId) params.set("category_id", categoryId);
  return `/api/services?${params.toString()}`;
}

export default function useServicesViewModel(initial = {}) {
  /* ========== state list & filters ========== */
  const [services, setServices] = useState([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(12);
  const [loading, setLoading] = useState(false);

  const [q, setQ] = useState("");
  const [serviceType, setServiceType] = useState(""); // 'B2B' | 'B2C' | ""
  const [published, setPublished] = useState(undefined); // true | false | undefined
  const [categoryId, setCategoryId] = useState("");
  const [locale, setLocale] = useState(initial.locale || "id");

  /* categories dropdown options */
  const [categoryOptions, setCategoryOptions] = useState([]);
  const catAbort = useRef(null);

  const abortRef = useRef(null);

  const key = useMemo(
    () =>
      buildKey({
        page,
        perPage,
        q,
        serviceType,
        published,
        categoryId,
        sort: DEFAULT_SORT,
        locale,
        fallback: fallbackFor(locale),
      }),
    [page, perPage, q, serviceType, published, categoryId, locale]
  );

  const reload = useCallback(() => {
    setLoading(true);
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    return fetch(key, {
      signal: abortRef.current.signal,
      credentials: "include",
    })
      .then((r) => r.json())
      .then((j) => setServices(Array.isArray(j?.data) ? j.data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [key]);

  useEffect(() => {
    reload();
    return () => abortRef.current?.abort?.();
  }, [reload]);

  /* ====== CRUD ====== */
  const createService = useCallback(
    async (payload = {}) => {
      try {
        // kirim multipart kalau ada file, selain itu juga boleh
        const fd = new FormData();
        if (payload.file) fd.append("file", payload.file);
        // field string/number
        for (const [k, v] of Object.entries(payload)) {
          if (k === "file" || v === undefined) continue;
          fd.append(k, v === null ? "" : String(v));
        }

        const r = await fetch("/api/services", {
          method: "POST",
          body: fd,
          credentials: "include",
        });

        const ct = r.headers?.get?.("content-type") || "";
        const j = ct.includes("application/json")
          ? await r.json().catch(() => null)
          : null;

        if (!r.ok) return { ok: false, error: j?.message || "Request failed" };

        // penting: item baru biasanya muncul di halaman 1 (sort desc)
        setPage(1);
        await reload();

        return { ok: true, data: j?.data };
      } catch (e) {
        return { ok: false, error: e?.message || "Network error" };
      }
    },
    [reload]
  );

  const updateService = useCallback(
    async (id, payload = {}) => {
      try {
        // Kirim FormData jika ada file, atau jika ada string image_url tetap ok
        const hasFile = !!payload.file;
        let body;
        let headers;

        if (hasFile) {
          const fd = new FormData();
          fd.append("file", payload.file);
          for (const [k, v] of Object.entries(payload)) {
            if (k === "file" || v === undefined) continue;
            fd.append(k, v === null ? "" : String(v));
          }
          body = fd;
          headers = undefined;
        } else {
          // gunakan JSON agar simple
          const obj = { ...payload };
          delete obj.file;
          body = JSON.stringify(obj);
          headers = { "Content-Type": "application/json" };
        }

        const r = await fetch(`/api/services/${id}`, {
          method: "PATCH",
          body,
          headers,
          credentials: "include",
        });

        const ct = r.headers?.get?.("content-type") || "";
        const j = ct.includes("application/json")
          ? await r.json().catch(() => null)
          : null;

        if (!r.ok) return { ok: false, error: j?.message || "Request failed" };

        // revalidate list supaya tabel up-to-date
        await reload();

        return { ok: true, data: j?.data };
      } catch (e) {
        return { ok: false, error: e?.message || "Network error" };
      }
    },
    [reload]
  );

  const deleteService = useCallback(
    async (id) => {
      try {
        const r = await fetch(`/api/services/${id}`, {
          method: "DELETE",
          credentials: "include",
        });

        // aman untuk 204 / non-JSON
        const ct = r.headers?.get?.("content-type") || "";
        const j = ct.includes("application/json")
          ? await r.json().catch(() => null)
          : null;

        if (!r.ok) return { ok: false, error: j?.message || "Request failed" };

        // revalidate list setelah delete
        await reload();

        return { ok: true, data: j?.data };
      } catch (e) {
        return { ok: false, error: e?.message || "Network error" };
      }
    },
    [reload]
  );

  const getService = useCallback(async (id, loc = "id") => {
    try {
      const url = `/api/services/${id}?locale=${loc}&fallback=${fallbackFor(
        loc
      )}`;
      const r = await fetch(url, { credentials: "include" });
      const j = await r.json();
      if (!r.ok) return { ok: false, error: j?.message || "Request failed" };
      return { ok: true, data: j?.data };
    } catch (e) {
      return { ok: false, error: e?.message || "Network error" };
    }
  }, []);

  /* ===== view modal helper (fetch detail once) ===== */
  const [viewData, setViewData] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const fetchDetailForView = useCallback(
    async (id) => {
      setViewLoading(true);
      const res = await getService(id, locale);
      setViewLoading(false);
      if (res.ok) setViewData(res.data || null);
      else setViewData(null);
    },
    [getService, locale]
  );
  const clearView = () => setViewData(null);

  /* ===== categories search/options ===== */
  const searchCategories = useCallback(async (q = "") => {
    try {
      if (catAbort.current) catAbort.current.abort();
      catAbort.current = new AbortController();
      const r = await fetch(
        `/api/service-categories?q=${encodeURIComponent(q)}&limit=20&page=1`,
        { signal: catAbort.current.signal, credentials: "include" }
      );
      const j = await r.json();
      if (Array.isArray(j?.data)) {
        setCategoryOptions(j.data.map((c) => ({ value: c.id, label: c.name })));
      }
    } catch {}
  }, []);

  /* ===== money formatter ===== */
  const money = useCallback((n, currency = "IDR") => {
    try {
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(Number(n));
    } catch {
      return String(n);
    }
  }, []);

  return {
    // data
    services,
    loading,
    page,
    perPage,

    // filters
    q,
    serviceType,
    published,
    categoryId,
    locale,

    // options
    categoryOptions,

    // setters
    setPage,
    setPerPage,
    setQ,
    setServiceType,
    setPublished,
    setCategoryId,
    setLocale,

    // crud
    reload,
    createService,
    updateService,
    deleteService,
    getService,

    // view modal
    viewData,
    viewLoading,
    fetchDetailForView,
    clearView,

    // categories
    searchCategories,

    money,
  };
}
