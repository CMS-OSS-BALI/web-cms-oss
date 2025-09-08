"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { crudService } from "@/app/utils/services/crudService";

export default function useEventsViewModel() {
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState([]);

  const [q, setQ] = useState("");
  const [isPublished, setIsPublished] = useState("");
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(12);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const buildQuery = useCallback(
    (params = {}) => {
      const sp = new URLSearchParams();
      const p = {
        page,
        perPage,
        q,
        is_published: isPublished, // "1" | "0" | ""
        from,
        to,
        ...params,
      };

      if (p.page) sp.set("page", String(p.page));
      if (p.perPage) sp.set("perPage", String(p.perPage));
      if (p.q) sp.set("q", p.q);
      if (p.is_published === "1" || p.is_published === "0") {
        sp.set("is_published", p.is_published);
      }
      if (p.from) sp.set("from", p.from);
      if (p.to) sp.set("to", p.to);
      return sp.toString();
    },
    [page, perPage, q, isPublished, from, to]
  );

  /** LIST */
  const fetchEvents = useCallback(
    async (overrides = {}) => {
      setLoading(true);
      setError("");
      try {
        const qs = buildQuery(overrides);
        const json = await crudService.get(`/api/events?${qs}`);

        setEvents(Array.isArray(json?.data) ? json.data : []);
        setTotal(Number(json?.total || 0));
        setTotalPages(Number(json?.totalPages || 1));

        // sinkronkan state jika ada overrides
        if ("page" in overrides) setPage(Math.max(1, overrides.page));
        if ("perPage" in overrides) setPerPage(overrides.perPage);
        if ("q" in overrides) setQ(overrides.q);
        if ("is_published" in overrides) setIsPublished(overrides.is_published);
        if ("from" in overrides) setFrom(overrides.from ?? null);
        if ("to" in overrides) setTo(overrides.to ?? null);
      } catch (e) {
        setError(e?.message || "Failed to fetch");
      } finally {
        setLoading(false);
      }
    },
    [buildQuery]
  );

  /** CREATE */
  const createEvent = useCallback(
    async (payload) => {
      setError("");
      setMessage("");
      try {
        const data = await crudService.post("/api/events", payload);
        setMessage("Event berhasil ditambahkan.");
        await fetchEvents({ page: 1 });
        return { ok: true, data };
      } catch (e) {
        return { ok: false, error: e?.message || "Failed to create" };
      }
    },
    [fetchEvents]
  );

  /** UPDATE (pakai /api/events/[id]) */
  const updateEvent = useCallback(
    async (id, payload) => {
      setError("");
      setMessage("");
      try {
        const data = await crudService.patch(`/api/events/${id}`, payload);
        setMessage("Event berhasil diperbarui.");
        await fetchEvents(); // refresh current view
        return { ok: true, data };
      } catch (e) {
        return { ok: false, error: e?.message || "Failed to update" };
      }
    },
    [fetchEvents]
  );

  /** DELETE (pakai /api/events/[id]) */
  const deleteEvent = useCallback(
    async (id) => {
      setError("");
      setMessage("");
      try {
        const data = await crudService.delete(`/api/events/${id}`);
        setMessage("Event berhasil dihapus.");
        await fetchEvents(); // atau hitung page baru jika perlu
        return { ok: true, data };
      } catch (e) {
        return { ok: false, error: e?.message || "Failed to delete" };
      }
    },
    [fetchEvents]
  );

  useEffect(() => {
    fetchEvents({ page: 1, perPage });
  }, []);

  return {
    loading,
    events,
    q,
    setQ,
    isPublished,
    setIsPublished,
    from,
    setFrom,
    to,
    setTo,
    page,
    setPage,
    perPage,
    setPerPage,
    total,
    totalPages,
    error,
    message,
    fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
  };
}
