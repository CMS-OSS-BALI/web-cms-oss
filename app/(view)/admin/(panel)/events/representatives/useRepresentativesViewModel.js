"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/* ================================
   Endpoint constants (server API)
=================================== */
const BOOKINGS_URL = "/api/admin/bookings"; // GET list (admin)
const BOOKING_ITEM_URL = (id) => `/api/bookings/${id}`; // GET/DELETE
const EVENT_CATS_URL = "/api/event-categories"; // GET list
const EVENTS_URL = "/api/events"; // GET list (for dropdown)
const PAY_CHARGE_URL = "/api/payments/charge"; // POST
const PAY_CHECK_URL = "/api/payments/check"; // GET
const PAY_RECONCILE_URL = "/api/payments/reconcile"; // POST
const VOUCHERS_URL = "/api/vouchers"; // GET (public validate)

const DEFAULT_PER_PAGE = 10;
const DEFAULT_LOCALE = "id";

/* ================================
   Small utilities
=================================== */
function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/** Shared fetch helper (JSON / text) — keep cookies for session guard */
async function fetchJson(url, opts = {}) {
  const init = {
    method: "GET",
    credentials: "include",
    ...opts,
  };
  const res = await fetch(url, init);
  const ct = res.headers.get("content-type") || "";
  let data;
  if (ct.includes("application/json")) data = await res.json();
  else data = await res.text();

  if (!res.ok) {
    const message =
      typeof data === "string" ? data : data?.error?.message || "Request error";
    return { error: { message, status: res.status }, status: res.status };
  }
  return data;
}

/** Normalisasi baris booking agar UI konsisten walau payload beda-beda */
function formatBookingRow(r = {}) {
  return {
    id: r.id,
    order_id: r.order_id || r.ticket_id || r.id,
    event_id: r.event_id || r.event?.id || null,
    // ✅ prefer title → fallback ke location
    event_title: r.event_title || r.event?.title || r.event?.location || "",
    event_category:
      r.event_category ||
      r.event?.category_name ||
      r.event?.category?.name ||
      "",
    rep_name: r.rep_name || r.name || r.representative || "",
    campus_name: r.campus_name || r.campus || "",
    voucher_code: r.voucher_code || "",
    amount: r.amount ?? null,
    status: r.status || "",
    created_at: r.created_at || r.createdAt || r.created || null,
  };
}

/* ================================
   View Model
=================================== */
export default function useRepresentativesViewModel() {
  /* ========== list state & filters ========== */
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [loading, setLoading] = useState(false);

  const [opLoadingId, setOpLoadingId] = useState(null);
  const [opType, setOpType] = useState(""); // "charge" | "check" | "delete"

  const [q, setQ] = useState("");
  const debouncedQ = useDebounced(q, 350);

  const [filterVoucher, setFilterVoucher] = useState("all"); // "all" | "voucher" | "non"
  const [category, setCategory] = useState(""); // slug/id
  const [eventId, setEventId] = useState(""); // ✅ filter by event
  const [locale, setLocale] = useState(DEFAULT_LOCALE);

  // Kategori event (dinamis)
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [catLoading, setCatLoading] = useState(false);

  // Event list (dropdown Nama Event)
  const [eventOptions, setEventOptions] = useState([]);
  const [eventLoading, setEventLoading] = useState(false);

  // guards
  const mountRef = useRef(true);
  const listAbortRef = useRef(null);

  useEffect(() => {
    mountRef.current = true;
    return () => {
      mountRef.current = false;
      if (listAbortRef.current) listAbortRef.current.abort();
    };
  }, []);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((total || 0) / (perPage || DEFAULT_PER_PAGE))),
    [total, perPage]
  );

  /* =======================
     Builders
  ======================== */
  const buildListKey = useCallback(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("perPage", String(perPage));
    params.set("locale", locale || DEFAULT_LOCALE);
    params.set("fallback", locale === "id" ? "en" : "id");
    if (debouncedQ && debouncedQ.trim()) params.set("q", debouncedQ.trim());
    if (filterVoucher && filterVoucher !== "all")
      params.set("voucher", filterVoucher);
    if (category) {
      params.set("category", category);
      params.set("category_slug", category);
    }
    if (eventId) params.set("event_id", eventId);
    return `${BOOKINGS_URL}?${params.toString()}`;
  }, [page, perPage, debouncedQ, filterVoucher, category, eventId, locale]);

  /* =======================
     Data loaders
  ======================== */
  const fetchList = useCallback(async () => {
    if (listAbortRef.current) listAbortRef.current.abort();
    const ctrl = new AbortController();
    listAbortRef.current = ctrl;

    setLoading(true);
    try {
      const key = buildListKey();
      const res = await fetchJson(key, { signal: ctrl.signal });
      if (res?.error) throw new Error(res.error?.message || "Fetch error");

      const data = res?.data || res?.rows || [];
      const nextRows = (Array.isArray(data) ? data : []).map(formatBookingRow);

      if (!mountRef.current) return;
      setRows(nextRows);

      const meta = res?.meta || {};
      setTotal(
        Number.isFinite(Number(meta.total))
          ? Number(meta.total)
          : nextRows.length
      );

      // categories (opsional dari payload)
      if (Array.isArray(res?.categories) && res.categories.length) {
        const opts = res.categories.map((c) => ({
          value: c.slug || c.id,
          label: c.name || c.slug || c.id,
        }));
        setCategoryOptions(opts);
      }
    } catch (e) {
      if (e?.name === "AbortError") return;
      if (!mountRef.current) return;
      setRows([]);
      setTotal(0);
    } finally {
      if (mountRef.current) setLoading(false);
    }
  }, [buildListKey]);

  // Load kategori untuk dropdown kategori
  const fetchCategories = useCallback(async () => {
    setCatLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("perPage", "100");
      params.set("sort", "sort:asc");
      params.set("locale", locale || DEFAULT_LOCALE);
      params.set("fallback", locale === "id" ? "en" : "id");

      const url = `${EVENT_CATS_URL}?${params.toString()}`;
      const res = await fetchJson(url, { credentials: "include" });
      const list = Array.isArray(res?.data) ? res.data : [];

      const opts = list.map((r) => ({
        value: r.slug || r.id,
        label: r.name || r.slug || r.id,
      }));
      if (mountRef.current) setCategoryOptions(opts);
    } catch {
      // ignore
    } finally {
      if (mountRef.current) setCatLoading(false);
    }
  }, [locale]);

  // Load daftar event untuk dropdown Nama Event
  const fetchEvents = useCallback(async () => {
    setEventLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("perPage", "200");
      params.set("sort", "start_at:desc");
      params.set("locale", locale || DEFAULT_LOCALE);
      params.set("fallback", locale === "id" ? "en" : "id");
      // tampilkan event publish/non-publish tetap (optional) — biarkan default

      const url = `${EVENTS_URL}?${params.toString()}`;
      const res = await fetchJson(url, { credentials: "include" });
      const list = Array.isArray(res?.data) ? res.data : [];

      const opts = list.map((e) => ({
        value: e.id,
        label: e.title || e.location || e.id,
      }));
      if (mountRef.current) setEventOptions(opts);
    } catch {
      // ignore
    } finally {
      if (mountRef.current) setEventLoading(false);
    }
  }, [locale]);

  // initial + refresh on deps
  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    fetchCategories();
    fetchEvents();
  }, [fetchCategories, fetchEvents]);

  const reload = useCallback(() => fetchList(), [fetchList]);

  /* =======================
     Derived metrics (for UI)
  ======================== */
  const statusCounts = useMemo(() => {
    const acc = { total: rows.length };
    for (const r of rows) {
      const k = String(r.status || "").toUpperCase();
      acc[k] = (acc[k] || 0) + 1;
    }
    return acc;
  }, [rows]);

  /* =======================
     Item helpers
  ======================== */
  const getBooking = useCallback(
    async (id) => {
      try {
        const res = await fetchJson(BOOKING_ITEM_URL(id));
        if (res?.error) return { ok: false, error: res.error?.message };
        const data = res?.data || res;
        return { ok: true, data };
      } catch (e) {
        return { ok: false, error: e?.message || "Gagal memuat detail" };
      }
    },
    []
  );

  const cancelBooking = useCallback(
    async (id) => {
      try {
        setOpType("delete");
        setOpLoadingId(id);
        const res = await fetchJson(BOOKING_ITEM_URL(id), {
          method: "DELETE",
        });
        setOpLoadingId(null);
        setOpType("");
        if (res?.error) return { ok: false, error: res.error?.message };
        return { ok: true, data: res?.data || res };
      } catch (e) {
        setOpLoadingId(null);
        setOpType("");
        return { ok: false, error: e?.message || "Gagal membatalkan" };
      }
    },
    []
  );

  /* =======================
     Payments (Midtrans)
  ======================== */
  const charge = useCallback(
    async (booking_id) => {
      try {
        setOpType("charge");
        setOpLoadingId(booking_id);

        const body = new URLSearchParams();
        body.set("booking_id", booking_id);

        const res = await fetchJson(PAY_CHARGE_URL, {
          method: "POST",
          body,
        });

        setOpLoadingId(null);
        setOpType("");
        if (res?.error) return { ok: false, error: res.error?.message };

        const data = res?.data || res;
        return {
          ok: true,
          data,
          openSnap: () => {
            if (data?.redirect_url) window.open(data.redirect_url, "_blank");
          },
        };
      } catch (e) {
        setOpLoadingId(null);
        setOpType("");
        return { ok: false, error: e?.message || "Gagal membuat pembayaran" };
      }
    },
    []
  );

  const check = useCallback(
    async (order_id) => {
      try {
        setOpType("check");
        setOpLoadingId(order_id);
        const url = `${PAY_CHECK_URL}?order_id=${encodeURIComponent(order_id)}`;
        const res = await fetchJson(url);
        setOpLoadingId(null);
        setOpType("");
        if (res?.error) return { ok: false, error: res.error?.message };
        return { ok: true, data: res?.data || res };
      } catch (e) {
        setOpLoadingId(null);
        setOpType("");
        return { ok: false, error: e?.message || "Gagal mengecek status" };
      }
    },
    []
  );

  const reconcile = useCallback(
    async (order_id) => {
      try {
        const body = new URLSearchParams();
        body.set("order_id", order_id);
        const res = await fetchJson(PAY_RECONCILE_URL, {
          method: "POST",
          body,
        });
        if (res?.error) return { ok: false, error: res.error?.message };
        return { ok: true, data: res?.data || res };
      } catch (e) {
        return { ok: false, error: e?.message || "Gagal rekonsiliasi" };
      }
    },
    []
  );

  /* =======================
     Voucher
  ======================== */
  const validateVoucher = useCallback(
    async ({ code, event_id }) => {
      try {
        const qs = new URLSearchParams();
        if (code) qs.set("code", String(code).trim());
        if (event_id) qs.set("event_id", String(event_id).trim());
        const res = await fetchJson(`${VOUCHERS_URL}?${qs.toString()}`);
        if (res?.valid === true) return { ok: true, data: res.data };
        return { ok: false, error: res?.reason || "Voucher tidak valid" };
      } catch (e) {
        return { ok: false, error: e?.message || "Gagal validasi voucher" };
      }
    },
    []
  );

  /* =======================
     Expose to UI
  ======================== */
  return {
    // state
    rows,
    total,
    totalPages,
    page,
    perPage,
    loading,
    opLoadingId,
    opType,
    catLoading,
    eventLoading,

    // filters
    q,
    filterVoucher,
    category,
    eventId,
    categoryOptions,
    eventOptions,
    locale,

    // setters
    setQ,
    setPage,
    setPerPage,
    setFilterVoucher,
    setCategory,
    setEventId,
    setLocale,

    // derived metrics
    statusCounts,

    // io
    fetch: fetchList,
    reload,

    // endpoints
    getBooking,
    cancelBooking,
    charge,
    check,
    reconcile,
    validateVoucher,
  };
}
