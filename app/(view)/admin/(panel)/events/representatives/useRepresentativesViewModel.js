"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/* ================================
   Endpoint constants (server API)
=================================== */
const BOOKINGS_URL = "/api/admin/bookings"; // GET list (admin)
const BOOKING_ITEM_URL = (id) => `/api/bookings/${id}`; // GET/DELETE
const EVENT_CATS_URL = "/api/event-categories"; // GET list
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
    // prefer title → fallback ke location (lihat endpoint /api/events)
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
  const [category, setCategory] = useState(""); // slug/id sesuai opsi
  const [locale, setLocale] = useState(DEFAULT_LOCALE);

  // Kategori event (dinamis)
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [catLoading, setCatLoading] = useState(false);

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

  // Optional admin header (x-admin-key) — untuk Postman/testing
  const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_TEST_KEY || "";
  const adminHeaders = useMemo(
    () => (ADMIN_KEY ? { "x-admin-key": ADMIN_KEY } : {}),
    [ADMIN_KEY]
  );

  /* =======================
     Builders
  ======================== */
  const buildListKey = useCallback(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("perPage", String(perPage));
    if (debouncedQ && debouncedQ.trim()) params.set("q", debouncedQ.trim());
    // interpretasi di server: voucher=voucher|non (selain itu abaikan)
    if (filterVoucher && filterVoucher !== "all")
      params.set("voucher", filterVoucher);
    if (category) {
      // kirim dua-duanya biar aman (tergantung implementasi server)
      params.set("category", category);
      params.set("category_slug", category);
    }
    return `${BOOKINGS_URL}?${params.toString()}`;
  }, [page, perPage, debouncedQ, filterVoucher, category]);

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
      const res = await fetchJson(key, {
        headers: { ...adminHeaders },
        signal: ctrl.signal,
      });
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

      // beberapa backend mengembalikan list kategori di payload; gunakan jika ada
      if (Array.isArray(res?.categories) && res.categories.length) {
        const opts = res.categories.map((c) => ({
          value: c.slug || c.id,
          label: c.name || c.slug || c.id,
        }));
        setCategoryOptions(opts);
      }
    } catch (e) {
      if (e?.name === "AbortError") return; // race guard
      if (!mountRef.current) return;
      setRows([]);
      setTotal(0);
    } finally {
      if (mountRef.current) setLoading(false);
    }
  }, [buildListKey, adminHeaders]);

  // Load kategori dari /api/event-categories → dipakai filter dropdown
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
      // biarkan kosong
    } finally {
      if (mountRef.current) setCatLoading(false);
    }
  }, [locale]);

  // initial + refresh on deps
  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

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
        const res = await fetchJson(BOOKING_ITEM_URL(id), {
          headers: { ...adminHeaders },
        });
        if (res?.error) return { ok: false, error: res.error?.message };
        // beberapa backend menaruh detail di res.data; normalize saja
        const data = res?.data || res;
        return { ok: true, data };
      } catch (e) {
        return { ok: false, error: e?.message || "Gagal memuat detail" };
      }
    },
    [adminHeaders]
  );

  const cancelBooking = useCallback(
    async (id) => {
      try {
        setOpType("delete");
        setOpLoadingId(id);
        const res = await fetchJson(BOOKING_ITEM_URL(id), {
          method: "DELETE",
          headers: { ...adminHeaders },
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
    [adminHeaders]
  );

  /* =======================
     Payments (Midtrans)
  ======================== */
  const charge = useCallback(
    async (booking_id) => {
      try {
        setOpType("charge");
        setOpLoadingId(booking_id);

        // gunakan form-url-encoded agar cocok dengan route charge (mendukung form/json)
        const body = new URLSearchParams();
        body.set("booking_id", booking_id);

        const res = await fetchJson(PAY_CHARGE_URL, {
          method: "POST",
          headers: { ...adminHeaders },
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
    [adminHeaders]
  );

  const check = useCallback(
    async (order_id) => {
      try {
        setOpType("check");
        // penting: loading key pakai order_id (disesuaikan di Content)
        setOpLoadingId(order_id);
        const url = `${PAY_CHECK_URL}?order_id=${encodeURIComponent(order_id)}`;
        const res = await fetchJson(url, { headers: { ...adminHeaders } });
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
    [adminHeaders]
  );

  const reconcile = useCallback(
    async (order_id) => {
      try {
        const body = new URLSearchParams();
        body.set("order_id", order_id);
        const res = await fetchJson(PAY_RECONCILE_URL, {
          method: "POST",
          headers: { "x-public-reconcile": "1", ...adminHeaders },
          body,
        });
        if (res?.error) return { ok: false, error: res.error?.message };
        return { ok: true, data: res?.data || res };
      } catch (e) {
        return { ok: false, error: e?.message || "Gagal rekonsiliasi" };
      }
    },
    [adminHeaders]
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
        const res = await fetchJson(`${VOUCHERS_URL}?${qs.toString()}`, {
          headers: { ...adminHeaders },
        });
        if (res?.valid === true) return { ok: true, data: res.data };
        return { ok: false, error: res?.reason || "Voucher tidak valid" };
      } catch (e) {
        return { ok: false, error: e?.message || "Gagal validasi voucher" };
      }
    },
    [adminHeaders]
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

    // filters
    q,
    filterVoucher,
    category,
    categoryOptions,
    locale,

    // setters
    setQ,
    setPage,
    setPerPage,
    setFilterVoucher,
    setCategory,
    setLocale,

    // derived metrics
    statusCounts, // e.g. { total, PAID, PENDING, REVIEW, ... }

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
