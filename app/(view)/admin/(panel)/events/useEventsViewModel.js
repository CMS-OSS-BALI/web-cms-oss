"use client";

import { useCallback, useEffect, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/swr/fetcher";

const DEFAULT_LOCALE = "id";
const FALLBACK_LOCALE = "en";

export default function useEventsViewModel() {
  const [q, setQ] = useState("");
  const [isPublished, setIsPublished] = useState("");
  const [status, setStatus] = useState(""); // "done" | ""
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(6);
  const [total, setTotal] = useState(0); // kept for compatibility (derived)
  const [totalPages, setTotalPages] = useState(1); // derived

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
        status,
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
      if (p.status) sp.set("status", p.status);
      if (p.from) sp.set("from", p.from);
      if (p.to) sp.set("to", p.to);
      sp.set("locale", DEFAULT_LOCALE);
      sp.set("fallback", FALLBACK_LOCALE);
      return sp.toString();
    },
    [page, perPage, q, isPublished, status, from, to]
  );

  // SWR key builder based on current filters/pagination
  const listKey = `/api/events?${buildQuery({
    page,
    perPage,
    q,
    is_published: isPublished,
    status,
    from,
    to,
  })}`;
  const {
    data: listJson,
    error: listErr,
    isLoading: listLoading,
    mutate,
  } = useSWR(listKey, fetcher);

  const events = Array.isArray(listJson?.data) ? listJson.data : [];
  useEffect(() => {
    if (typeof listJson?.total === "number") {
      setTotal(listJson.total);
      setTotalPages(Number(listJson?.totalPages || 1));
    }
  }, [listJson]);

  const fetchEvents = useCallback(async (overrides = {}) => {
    // update filters/pagination; SWR will refetch due to key change
    if ("page" in overrides) setPage(Math.max(1, overrides.page));
    if ("perPage" in overrides) setPerPage(overrides.perPage);
    if ("q" in overrides) setQ(overrides.q);
    if ("is_published" in overrides) setIsPublished(overrides.is_published);
    if ("status" in overrides) setStatus(overrides.status ?? "");
    if ("from" in overrides) setFrom(overrides.from ?? null);
    if ("to" in overrides) setTo(overrides.to ?? null);
  }, []);

  /** CREATE */
  const createEvent = useCallback(
    async (payload) => {
      setError("");
      setMessage("");
      try {
        const res = await fetch(`/api/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, locale: DEFAULT_LOCALE }),
        });
        if (!res.ok)
          throw new Error(
            (await res.json().catch(() => null))?.message || "Failed to create"
          );
        setMessage("Event berhasil ditambahkan.");
        // go to first page and revalidate
        await fetchEvents({ page: 1 });
        await mutate();
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e?.message || "Failed to create" };
      }
    },
    [fetchEvents, mutate]
  );

  /** UPDATE (pakai /api/events/[id]) */
  const updateEvent = useCallback(
    async (id, payload) => {
      setError("");
      setMessage("");
      try {
        const res = await fetch(`/api/events/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, locale: DEFAULT_LOCALE }),
        });
        if (!res.ok)
          throw new Error(
            (await res.json().catch(() => null))?.message || "Failed to update"
          );
        setMessage("Event berhasil diperbarui.");
        await mutate();
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e?.message || "Failed to update" };
      }
    },
    [mutate]
  );

  /** DELETE (pakai /api/events/[id]) */
  const deleteEvent = useCallback(
    async (id) => {
      setError("");
      setMessage("");
      try {
        const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
        if (!res.ok)
          throw new Error(
            (await res.json().catch(() => null))?.message || "Failed to delete"
          );
        setMessage("Event berhasil dihapus.");
        await mutate();
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e?.message || "Failed to delete" };
      }
    },
    [mutate]
  );

  // initial page size
  // keep default perPage 8

  return {
    loading: listLoading,
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
    error: error || listErr?.message || "",
    message,
    fetchEvents,
    status,
    setStatus,
    createEvent,
    updateEvent,
    deleteEvent,
  };
}
