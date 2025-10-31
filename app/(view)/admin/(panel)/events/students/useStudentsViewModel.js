"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** Map UI status → parameter backend:
 *  - "ALL"       → no status filter
 *  - "CONFIRMED" → status=CONFIRMED (Available)
 *  - "EXPIRED"   → kita treat sebagai status=CANCELLED atau expired-by-date (fallback)
 */
function mapStatusToQuery(uiStatus) {
  if (uiStatus === "CONFIRMED") return "CONFIRMED";
  if (uiStatus === "EXPIRED") return "CANCELLED"; // backend tidak punya 'EXPIRED' → pakai CANCELLED
  return "";
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
  const [eventName, setEventName] = useState("");
  const [locale, setLocale] = useState("id");

  /* ===== op state (per-row action) ===== */
  const [opLoadingId, setOpLoadingId] = useState(null);
  const [opType, setOpType] = useState("");

  /* ===== cache untuk judul event by event_id (agar tidak fetch berulang) ===== */
  const eventTitleByEventIdRef = useRef(new Map());

  /* ===== derived (list event name dari halaman ini) ===== */
  const eventNames = useMemo(() => {
    const set = new Set();
    for (const t of tickets) {
      if (t.event_title) set.add(t.event_title);
    }
    return Array.from(set);
  }, [tickets]);

  /* ===== fetch ===== */
  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("perPage", String(perPage));
      if (q && q.trim()) params.set("q", q.trim());
      const mapped = mapStatusToQuery(uiStatus);
      if (mapped) params.set("status", mapped);

      const res = await fetch(`/api/tickets?${params.toString()}`, {
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to fetch tickets");

      const list = Array.isArray(json.data) ? json.data : [];
      setTotal(Number(json.total || list.length || 0));
      setTotalPages(Number(json.totalPages || 0));

      // Enrichment: ambil event_title via /api/tickets/[id] (cached by event_id)
      const enriched = await Promise.all(
        list.map(async (it) => {
          let title = null;
          if (eventTitleByEventIdRef.current.has(it.event_id)) {
            title = eventTitleByEventIdRef.current.get(it.event_id);
          } else {
            try {
              const r = await fetch(`/api/tickets/${it.id}`, {
                cache: "no-store",
              });
              const j = await r.json().catch(() => ({}));
              if (r.ok) {
                title = j?.event_title || "";
                if (title) {
                  eventTitleByEventIdRef.current.set(it.event_id, title);
                }
              }
            } catch {}
          }

          // mapping label status untuk tampilan list
          let _statusLabel = "Pending";
          if (it.status === "CONFIRMED") _statusLabel = "Available";
          else if (it.status === "CANCELLED") _statusLabel = "Expired";
          else if (it.expires_at) _statusLabel = "Expired";

          return { ...it, event_title: title, _statusLabel };
        })
      );

      // Filter client-side berdasarkan eventName (kategori/event)
      const filtered = eventName
        ? enriched.filter(
            (x) =>
              (x.event_title || "").toLowerCase() === eventName.toLowerCase()
          )
        : enriched;

      setTickets(filtered);
    } catch (e) {
      console.error("[Students] fetchTickets error:", e?.message || e);
      setTickets([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, q, uiStatus, eventName]);

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
      setOpLoadingId(id);
      setOpType("resend");
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
    } finally {
      setOpLoadingId(null);
      setOpType("");
    }
  }, []);

  const deleteTicket = useCallback(
    async (id) => {
      try {
        setOpLoadingId(id);
        setOpType("delete");
        const r = await fetch(`/api/tickets/${id}`, { method: "DELETE" });
        const j = await r.json().catch(() => ({}));
        if (!r.ok)
          return { ok: false, error: j?.message || "Failed to delete" };

        // refresh current page
        fetchTickets();
        return { ok: true, data: j };
      } catch (e) {
        return { ok: false, error: e?.message || "Failed" };
      } finally {
        setOpLoadingId(null);
        setOpType("");
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
    eventName,
    eventNames,
    locale,

    // loading for ops
    opLoadingId,
    opType,

    // setters
    setQ,
    setPage,
    setPerPage,
    setUiStatus,
    setEventName,
    setLocale,

    // actions
    getTicket,
    resendTicket,
    deleteTicket,
  };
}
