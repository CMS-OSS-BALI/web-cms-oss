// useLeadsViewModel.js
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export default function useLeadsViewModel() {
  /* ========== state list & filters ========== */
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [loading, setLoading] = useState(false);
  const [opLoading, setOpLoading] = useState(false);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all"); // all | assigned | unassigned
  const [education, setEducation] = useState("");
  const [locale, setLocale] = useState("id");

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((total || 0) / (perPage || 10))),
    [total, perPage]
  );

  /* ========== GLOBAL COUNTERS (untuk ringkasan) ========== */
  const [totalLeads, setTotalLeads] = useState(0);
  const [assignedCount, setAssignedCount] = useState(0);
  const [unassignedCount, setUnassignedCount] = useState(0);

  /* ========== fetch list ========== */
  const abortRef = useRef(null);

  // helper normalisasi timestamp -> ms
  const toMs = (v) => {
    if (v === null || v === undefined || v === "") return null;
    if (v instanceof Date) return v.getTime();
    const n = Number(v);
    if (Number.isFinite(n)) {
      return n < 1e12 ? n * 1000 : n; // detik -> ms jika perlu
    }
    const t = Date.parse(String(v));
    return Number.isNaN(t) ? null : t;
  };

  const fetchList = useCallback(async () => {
    try {
      abortRef.current?.abort?.();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);

      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("perPage", String(perPage));
      params.set("summary", "1"); // <<— minta ringkasan sekalian
      if (q) params.set("q", q);
      if (education) params.set("education", education);

      // status mapping → API params
      if (status === "all") {
        params.set("include_assigned", "1"); // semua (assigned & unassigned)
      } else if (status === "assigned") {
        params.set("only_assigned", "1"); // hanya yang assigned
      } // "unassigned" → default: assigned_to null

      const res = await fetch(`/api/leads?${params.toString()}`, {
        signal: ctrl.signal,
        cache: "no-store",
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const raw = json?.data || [];
      const meta = json?.meta || {};
      const summary = json?.summary || null;

      // normalisasi created_ts di client (ms)
      const data = raw.map((r) => ({
        ...r,
        created_ts:
          toMs(r.created_ts) ?? (r.created_at ? toMs(r.created_at) : null),
      }));

      setLeads(data);
      setTotal(meta?.total || data.length || 0);

      // isi counter global bila tersedia
      if (summary) {
        setTotalLeads(summary.total ?? 0);
        setAssignedCount(summary.assigned ?? 0);
        setUnassignedCount(summary.unassigned ?? 0);
      }

      // refresh consultant names map untuk halaman ini
      refreshConsultantNamesForPage(data);
    } catch (e) {
      if (e?.name !== "AbortError") {
        setLeads([]);
        setTotal(0);
      }
    } finally {
      setLoading(false);
    }
  }, [page, perPage, q, status, education]);

  useEffect(() => {
    fetchList();
    return () => abortRef.current?.abort?.();
  }, [fetchList]);

  /* ========== REFRESH COUNTERS (total, assigned, unassigned) ========== */
  const refreshCounters = useCallback(async () => {
    try {
      const p = new URLSearchParams();
      p.set("perPage", "1"); // biar cepat
      p.set("summary", "1"); // <<— cukup 1 request
      if (education) p.set("education", education);

      const res = await fetch(`/api/leads?${p.toString()}`, {
        cache: "no-store",
        credentials: "include",
      });
      if (!res.ok) return;

      const j = await res.json();
      const s = j?.summary;
      if (s) {
        setTotalLeads(s.total ?? 0);
        setAssignedCount(s.assigned ?? 0);
        setUnassignedCount(s.unassigned ?? 0);
      }
    } catch {
      // diamkan; UI tetap jalan
    }
  }, [education]);

  useEffect(() => {
    refreshCounters();
  }, [refreshCounters]);

  /* ========== CREATE (disabled for admin) ========== */
  async function createLead() {
    // Admin tidak boleh membuat lead dari panel → balikan error terkontrol
    return {
      ok: false,
      error: "Admin tidak diizinkan membuat lead dari panel.",
    };
  }

  /* ========== READ DETAIL ========== */
  async function getLead(id) {
    try {
      const res = await fetch(`/api/leads/${encodeURIComponent(id)}`, {
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) return { ok: false, error: json?.error?.message || "Gagal" };
      return { ok: true, data: json };
    } catch (e) {
      return { ok: false, error: e?.message || "Gagal" };
    }
  }

  /* ========== UPDATE (only assigned_to) ========== */
  async function updateLead(id, payload) {
    try {
      setOpLoading(true);
      const body = { assigned_to: payload?.assigned_to ?? null }; // hanya kirim assigned_to
      const res = await fetch(`/api/leads/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) return { ok: false, error: json?.error?.message || "Gagal" };
      fetchList();
      refreshCounters(); // update ringkasan (assignment bisa berubah)
      return { ok: true, data: json?.data };
    } catch (e) {
      return { ok: false, error: e?.message || "Gagal" };
    } finally {
      setOpLoading(false);
    }
  }

  /* ========== DELETE ========== */
  async function deleteLead(id) {
    try {
      const res = await fetch(`/api/leads/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) return { ok: false, error: json?.error?.message || "Gagal" };
      fetchList();
      refreshCounters(); // total berkurang
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e?.message || "Gagal" };
    }
  }

  /* ========== consultant helpers (best-effort) ========== */
  const [consultantMap, setConsultantMap] = useState({});
  const consultantName = useCallback(
    (id) => (id ? consultantMap[id] || null : null),
    [consultantMap]
  );

  async function searchConsultantOptions(q = "") {
    try {
      const url = `/api/consultants?perPage=10&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, {
        cache: "no-store",
        credentials: "include",
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const json = await res.json();
      const rows = json?.data || json?.rows || [];
      const opts = rows.map((r) => ({
        value: r.id,
        label: r.name || r.full_name || r.email || r.id,
      }));
      // cache ke map juga
      setConsultantMap((m) => {
        const next = { ...m };
        for (const o of opts) next[o.value] = o.label;
        return next;
      });
      return opts;
    } catch {
      return [];
    }
  }

  async function refreshConsultantNamesForPage(data) {
    const ids = Array.from(
      new Set((data || []).map((r) => r.assigned_to).filter(Boolean))
    ).filter((id) => !consultantMap[id]);
    if (!ids.length) return;

    // best effort: search by joined ids
    const joined = ids.slice(0, 10).join(" ");
    await searchConsultantOptions(joined);
  }

  return {
    // list state
    leads,
    total,
    page,
    perPage,
    totalPages,
    loading,
    opLoading,

    // filters
    q,
    status,
    education,
    setQ,
    setStatus,
    setEducation,

    // paging
    setPage,
    setPerPage,

    // locale
    setLocale,

    // GLOBAL counters
    totalLeads,
    assignedCount,
    unassignedCount,
    refreshCounters,

    // CRUD (create disabled)
    createLead,
    getLead,
    updateLead,
    deleteLead,

    // consultant helpers
    searchConsultantOptions,
    consultantName,
    refreshConsultantNamesForPage,
  };
}
