"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/* =========================
   Endpoint constants
========================= */
const VOUCHERS_URL = "/api/vouchers";

/* =========================
   Utilities
========================= */
function safeJson(res) {
  return res.json().catch(() => ({}));
}
function qsp(obj = {}) {
  const p = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    p.set(k, String(v));
  });
  return p.toString();
}

export default function useVouchersViewModel() {
  /* ========== states ========== */
  const [locale, setLocale] = useState("id");

  const [vouchers, setVouchers] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // filters (client-side)
  const [q, setQ] = useState("");
  const [uiType, setUiType] = useState("ALL"); // ALL | PERCENT | FIXED
  const [uiStatus, setUiStatus] = useState("ALL"); // ALL | ACTIVE | INACTIVE

  // op loading flags
  const [opLoadingId, setOpLoadingId] = useState(null);
  const [opType, setOpType] = useState(""); // 'create' | 'update' | 'delete' | 'view'

  const abortRef = useRef(null);

  /* ========== loaders ========== */
  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    if (abortRef.current) abortRef.current.abort();
    const ctl = new AbortController();
    abortRef.current = ctl;

    try {
      const url = `${VOUCHERS_URL}?${qsp({ page, perPage })}`;
      const res = await fetch(url, { signal: ctl.signal, cache: "no-store" });
      const data = await safeJson(res);
      if (!res.ok) {
        setError(data?.error?.message || "Gagal memuat voucher.");
        setVouchers([]);
        setTotal(0);
        setTotalPages(1);
        return;
      }
      const rows = Array.isArray(data?.data) ? data.data : [];
      setVouchers(rows);
      setTotal(data?.meta?.total ?? rows.length ?? 0);
      setTotalPages(data?.meta?.totalPages ?? 1);
    } catch (e) {
      if (e?.name !== "AbortError") {
        setError("Gagal memuat voucher.");
      }
    } finally {
      setLoading(false);
    }
  }, [page, perPage]);

  useEffect(() => {
    load();
  }, [load]);

  /* ========== CRUD ops ========== */
  const getVoucher = useCallback(async (id) => {
    setOpLoadingId(id);
    setOpType("view");
    try {
      const res = await fetch(`${VOUCHERS_URL}/${id}`, { cache: "no-store" });
      const data = await safeJson(res);
      if (!res.ok)
        return {
          ok: false,
          error: data?.error?.message || "Gagal memuat voucher.",
        };
      return { ok: true, data: data?.data };
    } catch {
      return { ok: false, error: "Gagal memuat voucher." };
    } finally {
      setOpLoadingId(null);
      setOpType("");
    }
  }, []);

  const createVoucher = useCallback(
    async (payload = {}) => {
      setOpLoadingId("new");
      setOpType("create");
      try {
        const res = await fetch(VOUCHERS_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await safeJson(res);
        if (!res.ok)
          return {
            ok: false,
            error: data?.error?.message || "Gagal membuat voucher.",
          };
        await load();
        return { ok: true, data: data?.data };
      } catch {
        return { ok: false, error: "Gagal membuat voucher." };
      } finally {
        setOpLoadingId(null);
        setOpType("");
      }
    },
    [load]
  );

  const updateVoucher = useCallback(
    async (id, payload = {}) => {
      setOpLoadingId(id);
      setOpType("update");
      try {
        const res = await fetch(`${VOUCHERS_URL}/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await safeJson(res);
        if (!res.ok)
          return {
            ok: false,
            error: data?.error?.message || "Gagal memperbarui voucher.",
          };
        await load();
        return { ok: true, data: data?.data };
      } catch {
        return { ok: false, error: "Gagal memperbarui voucher." };
      } finally {
        setOpLoadingId(null);
        setOpType("");
      }
    },
    [load]
  );

  const deleteVoucher = useCallback(
    async (id) => {
      setOpLoadingId(id);
      setOpType("delete");
      try {
        const res = await fetch(`${VOUCHERS_URL}/${id}`, { method: "DELETE" });
        const data = await safeJson(res);
        if (!res.ok)
          return {
            ok: false,
            error: data?.error?.message || "Gagal menonaktifkan voucher.",
          };
        await load();
        return { ok: true, data: data?.data };
      } catch {
        return { ok: false, error: "Gagal menonaktifkan voucher." };
      } finally {
        setOpLoadingId(null);
        setOpType("");
      }
    },
    [load]
  );

  /* ========== derived (client filters) ========== */
  const rows = useMemo(() => {
    const ql = (q || "").trim().toLowerCase();
    return (vouchers || []).filter((v) => {
      if (ql) {
        const code = String(v.code || "").toLowerCase();
        if (!code.includes(ql)) return false;
      }
      if (uiType !== "ALL" && String(v.type).toUpperCase() !== uiType)
        return false;
      if (uiStatus !== "ALL") {
        const active = !!v.is_active;
        if (uiStatus === "ACTIVE" && !active) return false;
        if (uiStatus === "INACTIVE" && active) return false;
      }
      return true;
    });
  }, [vouchers, q, uiType, uiStatus]);

  return {
    // data
    vouchers,
    rows,
    total,
    totalPages,

    // list state
    page,
    perPage,
    loading,
    error,

    // filters
    q,
    uiType,
    uiStatus,

    // ops state
    opLoadingId,
    opType,

    // actions
    setLocale,
    setPage,
    setPerPage,
    setQ,
    setUiType,
    setUiStatus,

    load,
    getVoucher,
    createVoucher,
    updateVoucher,
    deleteVoucher,
  };
}
