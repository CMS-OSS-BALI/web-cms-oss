"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

/** Map UI status → parameter backend */
function mapStatusToQuery(uiStatus) {
  if (uiStatus === "CONFIRMED") return "CONFIRMED";
  if (uiStatus === "EXPIRED") return "CANCELLED";
  return "";
}
const fallbackFor = (loc) =>
  String(loc || "id").toLowerCase() === "id" ? "en" : "id";

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
  const [eventId, setEventId] = useState(""); // ← pakai id event utk filter
  const [locale, setLocale] = useState("id");

  /* ===== dropdown options (event list) ===== */
  const [eventOptions, setEventOptions] = useState([]); // [{value:id,label:title}]

  /* ===== fetch event options once ===== */
  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams();
        params.set("page", "1");
        params.set("perPage", "200");
        params.set("is_published", "1");
        params.set("sort", "start_at:desc");
        params.set("locale", locale);
        params.set("fallback", fallbackFor(locale));
        const r = await fetch(`/api/events?${params.toString()}`, {
          cache: "no-store",
        });
        const j = await r.json().catch(() => ({}));
        const list = Array.isArray(j?.data) ? j.data : [];
        const opts = list
          .map((e) => ({
            value: e.id,
            label: e.title || "(untitled)",
          }))
          .filter((o) => o.label && o.value);
        setEventOptions(opts);
      } catch (e) {
        setEventOptions([]);
      }
    })();
  }, [locale]);

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

  /* ===== actions ===== */
  const getTicket = useCallback(async (id) => {
    try {
      const r = await fetch(`/api/tickets/${id}`, { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok)
        return { ok: false, error: j?.message || "Failed to fetch ticket" };
      return { ok: true, data: j };
    } catch (e) {
      return { ok: false, error: e?.message || "Failed" };
    }
  }, []);

  const resendTicket = useCallback(async (id) => {
    try {
      const r = await fetch(`/api/tickets/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "resend" }),
        headers: { "content-type": "application/json" },
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return { ok: false, error: j?.message || "Failed to resend" };
      return { ok: true, data: j };
    } catch (e) {
      return { ok: false, error: e?.message || "Failed" };
    }
  }, []);

  const deleteTicket = useCallback(
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
  );

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
    eventId, // ← pakai id
    eventOptions, // ← opsi dropdown (id+title)
    locale,

    // setters
    setQ,
    setPage,
    setPerPage,
    setUiStatus,
    setEventId,
    setLocale,

    // actions
    getTicket,
    resendTicket,
    deleteTicket,
  };
}
