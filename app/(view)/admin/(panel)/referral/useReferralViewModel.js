// useReferralViewModel.js
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export default function useReferralViewModel() {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [opLoading, setOpLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // counters untuk tab (pakai meta.total dari perPage=1)
  const [cntPending, setCntPending] = useState(null);
  const [cntVerified, setCntVerified] = useState(null);
  const [cntRejected, setCntRejected] = useState(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL("/api/referral", window.location.origin);
      url.searchParams.set("page", String(page));
      url.searchParams.set("perPage", String(perPage));
      if (q && q.trim()) url.searchParams.set("q", q.trim());
      if (status && status !== "ALL") url.searchParams.set("status", status);

      const res = await fetch(url.toString(), { credentials: "include" });
      const json = await res.json().catch(() => ({}));
      const arr = Array.isArray(json?.data) ? json.data : [];
      setRows(arr);
      setTotal(Number(json?.meta?.total || 0));
      setTotalPages(Number(json?.meta?.totalPages || 1));
    } catch (e) {
      setRows([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, q, status]);

  const fetchCounts = useCallback(async () => {
    const get = async (st) => {
      const url = new URL("/api/referral", window.location.origin);
      url.searchParams.set("perPage", "1");
      url.searchParams.set("page", "1");
      url.searchParams.set("status", st);
      const res = await fetch(url.toString(), { credentials: "include" });
      const json = await res.json().catch(() => ({}));
      return Number(json?.meta?.total || 0);
    };
    try {
      const [p, v, r] = await Promise.all([
        get("PENDING"),
        get("VERIFIED"),
        get("REJECTED"),
      ]);
      setCntPending(p);
      setCntVerified(v);
      setCntRejected(r);
    } catch {
      setCntPending(null);
      setCntVerified(null);
      setCntRejected(null);
    }
  }, []);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);
  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // CRUD-ish
  const getReferral = useCallback(async (id) => {
    const res = await fetch(`/api/referral/${id}`, { credentials: "include" });
    const json = await res.json().catch(() => ({}));
    return {
      ok: res.ok,
      data: json?.data,
      previews: json?.previews,
      error: json?.error?.message,
    };
  }, []);

  const updateReferral = useCallback(
    async (id, payload) => {
      setOpLoading(true);
      try {
        const res = await fetch(`/api/referral/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload || {}),
          credentials: "include",
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok)
          return {
            ok: false,
            error: json?.error?.message || "Gagal menyimpan.",
          };
        await fetchList();
        await fetchCounts();
        return { ok: true, data: json?.data };
      } finally {
        setOpLoading(false);
      }
    },
    [fetchList, fetchCounts]
  );

  const replaceFront = useCallback(
    async (id, file) => {
      if (!(file instanceof File)) return { ok: false, error: "File invalid" };
      setOpLoading(true);
      try {
        const fd = new FormData();
        fd.append("front", file, file.name);
        const res = await fetch(`/api/referral/${id}`, {
          method: "PATCH",
          body: fd,
          credentials: "include",
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok)
          return {
            ok: false,
            error: json?.error?.message || "Ganti foto gagal.",
          };
        await fetchList();
        return { ok: true, data: json?.data, preview: json?.preview_front };
      } finally {
        setOpLoading(false);
      }
    },
    [fetchList]
  );

  const deleteReferral = useCallback(
    async (id) => {
      setOpLoading(true);
      try {
        const res = await fetch(`/api/referral/${id}`, {
          method: "DELETE",
          credentials: "include",
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok)
          return {
            ok: false,
            error: json?.error?.message || "Gagal menghapus.",
          };
        await fetchList();
        await fetchCounts();
        return { ok: true };
      } finally {
        setOpLoading(false);
      }
    },
    [fetchList, fetchCounts]
  );

  /* ========= Consultant helpers (now with name map) ========= */
  const [consultantMap, setConsultantMap] = useState({});
  const consultantName = useCallback(
    (id) => {
      const key = id ? String(id) : "";
      return key ? consultantMap[key] || null : null;
    },
    [consultantMap]
  );

  const searchConsultantOptions = useCallback(async (kw = "") => {
    try {
      const url = new URL("/api/consultants", window.location.origin);
      url.searchParams.set("public", "1");
      url.searchParams.set("limit", "50");
      if (kw && kw.trim()) url.searchParams.set("q", kw.trim());
      const res = await fetch(url.toString(), { credentials: "include" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const json = await res.json().catch(() => ({}));
      const items = Array.isArray(json?.data) ? json.data : [];
      const opts = items.map((it) => ({
        value: String(it.id),
        label: it.name || it.full_name || it.name_id || `Konsultan ${it.id}`,
      }));
      // cache label by ID
      setConsultantMap((m) => {
        const next = { ...m };
        for (const o of opts) next[o.value] = o.label;
        return next;
      });
      return opts;
    } catch {
      return [];
    }
  }, []);

  return {
    // data
    referrals: rows,
    loading,
    opLoading,
    page,
    perPage,
    total,
    totalPages,
    q,
    status,
    cntPending,
    cntVerified,
    cntRejected,

    // actions
    setPage,
    setPerPage,
    setQ,
    setStatus,
    fetchList,
    fetchCounts,
    getReferral,
    updateReferral,
    replaceFront,
    deleteReferral,

    // consultants
    searchConsultantOptions,
    consultantName,
  };
}
