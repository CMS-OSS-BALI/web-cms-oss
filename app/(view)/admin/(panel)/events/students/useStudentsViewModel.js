"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { fetcher, swrDefaults } from "@/lib/swr/fetcher";

/** Map UI status → parameter backend */
function mapStatusToQuery(uiStatus) {
  if (uiStatus === "CONFIRMED") return "CONFIRMED";
  if (uiStatus === "EXPIRED") return "CANCELLED";
  return "";
}
const fallbackFor = (loc) =>
  String(loc || "id").toLowerCase() === "id" ? "en" : "id";

/** Lightweight cached options fetcher with graceful fallback */
async function fetchEventOptionsCached(url) {
  // 1) coba endpoint ringan
  try {
    const res = await fetch(url, { cache: "no-store" });
    const js = await res.json();
    if (!res.ok) throw new Error(js?.message || "options not available");
    const arr = Array.isArray(js) ? js : js?.data;
    if (Array.isArray(arr) && arr.length) {
      return arr
        .map((it) =>
          it?.value && it?.label
            ? { value: it.value, label: it.label }
            : {
                value: it?.id,
                label: it?.title || it?.title_id || "(untitled)",
              }
        )
        .filter((o) => o?.value && o?.label);
    }
    // jika kosong, lanjut fallback
    throw new Error("empty options");
  } catch {
    // 2) fallback: hit endpoint list dengan batas kecil
    const u = new URL(
      url,
      typeof window === "undefined" ? "http://x" : window.location.origin
    );
    const locale = u.searchParams.get("locale") || "id";
    const fallback = u.searchParams.get("fallback") || fallbackFor(locale);
    const qp = new URLSearchParams();
    qp.set("page", "1");
    qp.set("perPage", "100");
    qp.set("is_published", "1");
    qp.set("sort", "start_at:desc");
    qp.set("locale", locale);
    qp.set("fallback", fallback);
    qp.set("_", String(Date.now()));
    const res2 = await fetch(`/api/events?${qp.toString()}`, {
      cache: "no-store",
    });
    const js2 = await res2.json().catch(() => ({}));
    const list = Array.isArray(js2?.data) ? js2.data : [];
    return list
      .map((e) => ({
        value: e?.id,
        label: e?.title || e?.title_id || "(untitled)",
      }))
      .filter((o) => o.value && o.label);
  }
}

export default function useStudentsViewModel() {
  /* ===== listing state ===== */
  const [tickets, setTickets] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);

  /* ===== filters ===== */
  const [q, setQ] = useState("");
  const [uiStatus, setUiStatus] = useState("ALL"); // ALL | CONFIRMED | EXPIRED
  const [eventId, setEventId] = useState(""); // id event utk filter
  const [locale, setLocale] = useState("id");

  /* ===== event options (cached via SWR) ===== */
  const optionsUrl = useMemo(() => {
    const p = new URLSearchParams();
    p.set("locale", locale);
    p.set("fallback", fallbackFor(locale));
    // optional small limit param if backend supports it
    p.set("limit", "100");
    p.set("_", String(Date.now())); // avoid intermediates caching while SWR caches result
    return `/api/events/options?${p.toString()}`;
  }, [locale]);

  const {
    data: eventOptions = [],
    isLoading: eventOptionsLoading,
    error: eventOptionsError,
  } = useSWR(optionsUrl, fetchEventOptionsCached, {
    ...swrDefaults,
    // opsi cache agar tidak fetch berulang saat fokus/tab
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    keepPreviousData: true,
    dedupingInterval: 5 * 60 * 1000, // 5 menit
  });

  /* ===== fetch tickets ===== */
  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("perPage", String(perPage));
      params.set("locale", locale);
      params.set("fallback", fallbackFor(locale));
      if (q && q.trim()) params.set("q", q.trim());

      const mapped = mapStatusToQuery(uiStatus);
      if (mapped) params.set("status", mapped);
      if (eventId && eventId.trim()) params.set("event_id", eventId.trim());

      const res = await fetch(`/api/tickets?${params.toString()}`, {
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to fetch tickets");

      const list = Array.isArray(json.data) ? json.data : [];

      const normalized = list.map((it) => {
        let _statusLabel = "Pending";
        if (it.status === "CONFIRMED") _statusLabel = "Available";
        else if (it.status === "CANCELLED") _statusLabel = "Expired";
        else if (it.expires_at) _statusLabel = "Expired";
        return { ...it, _statusLabel };
      });

      setTickets(normalized);
      setTotal(Number(json.total || list.length || 0));
      setTotalPages(Number(json.totalPages || 0));
    } catch (e) {
      console.error("[Students] fetchTickets error:", e?.message || e);
      setTickets([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, q, uiStatus, eventId, locale]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  /* ===== public API ===== */
  return {
    // data
    tickets,
    total,
    page,
    perPage,
    totalPages,
    loading,

    // filters
    q,
    uiStatus,
    eventId, // id event untuk filter
    locale,

    // dropdown (cached)
    eventOptions,
    eventOptionsLoading,
    eventOptionsError,

    // setters
    setQ,
    setPage,
    setPerPage,
    setUiStatus,
    setEventId,
    setLocale,

    // actions
    getTicket: useCallback(async (id) => {
      try {
        const r = await fetch(`/api/tickets/${id}`, { cache: "no-store" });
        const j = await r.json().catch(() => ({}));
        if (!r.ok)
          return { ok: false, error: j?.message || "Failed to fetch ticket" };
        return { ok: true, data: j };
      } catch (e) {
        return { ok: false, error: e?.message || "Failed" };
      }
    }, []),

    resendTicket: useCallback(async (id) => {
      try {
        const r = await fetch(`/api/tickets/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ action: "resend" }),
          headers: { "content-type": "application/json" },
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok)
          return { ok: false, error: j?.message || "Failed to resend" };
        return { ok: true, data: j };
      } catch (e) {
        return { ok: false, error: e?.message || "Failed" };
      }
    }, []),

    deleteTicket: useCallback(
      async (id) => {
        try {
          const r = await fetch(`/api/tickets/${id}`, { method: "DELETE" });
          const j = await r.json().catch(() => ({}));
          if (!r.ok)
            return { ok: false, error: j?.message || "Failed to delete" };
          // refresh current page
          fetchTickets();
          return { ok: true, data: j };
        } catch (e) {
          return { ok: false, error: e?.message || "Failed" };
        }
      },
      [fetchTickets]
    ),
  };
}
