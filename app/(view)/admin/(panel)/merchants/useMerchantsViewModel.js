"use client";

import { useCallback, useEffect, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/swr/fetcher";

const DEFAULT_LOCALE = "id";
const FALLBACK_LOCALE = "en";

export default function useMerchantsViewModel() {
  const [loading, setLoading] = useState(false); // non-GET ops

  // filters
  const [q, setQ] = useState("");

  // pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(8);
  const [total, setTotal] = useState(0); // derived
  const [totalPages, setTotalPages] = useState(1); // derived

  // status
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // SWR list
  const qs = new URLSearchParams();
  qs.set("page", String(page));
  qs.set("perPage", String(perPage));
  if (q.trim()) qs.set("q", q.trim());
  qs.set("locale", DEFAULT_LOCALE);
  qs.set("fallback", FALLBACK_LOCALE);
  const listKey = `/api/merchants?${qs.toString()}`;
  const {
    data: listJson,
    error: listErr,
    isLoading: listLoading,
    mutate,
  } = useSWR(listKey, fetcher);
  const merchants = listJson?.data || [];
  useEffect(() => {
    if (listJson?.total !== undefined) {
      setTotal(listJson.total);
      setTotalPages(listJson?.totalPages || 1);
      if (listJson?.page) setPage(listJson.page);
      if (listJson?.perPage) setPerPage(listJson.perPage);
    }
  }, [listJson]);

  const fetchMerchants = useCallback(async (opts = {}) => {
    if ("page" in opts) setPage(Math.max(1, opts.page));
    if ("perPage" in opts) setPerPage(opts.perPage);
    if ("q" in opts) setQ(opts.q || "");
  }, []);

  /** CREATE */
  const createMerchant = async (payload) => {
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/merchants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, locale: DEFAULT_LOCALE }),
      });
      if (!res.ok)
        throw new Error(
          (await res.json().catch(() => null))?.message ||
            "Gagal menambah merchant"
        );
      setMessage("Merchant berhasil ditambahkan");
      await fetchMerchants({ page: 1 });
      await mutate();
      return { ok: true };
    } catch (e) {
      const msg = e?.message || "Gagal menambah merchant";
      setError(msg);
      return { ok: false, error: msg };
    }
  };

  /** UPDATE */
  const updateMerchant = async (id, payload) => {
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/merchants/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, locale: DEFAULT_LOCALE }),
      });
      if (!res.ok)
        throw new Error(
          (await res.json().catch(() => null))?.message ||
            "Gagal memperbarui merchant"
        );
      setMessage("Merchant berhasil diperbarui");
      await mutate();
      return { ok: true };
    } catch (e) {
      const msg = e?.message || "Gagal memperbarui merchant";
      setError(msg);
      return { ok: false, error: msg };
    }
  };

  /** DELETE */
  const deleteMerchant = async (id) => {
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/merchants/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok)
        throw new Error(
          (await res.json().catch(() => null))?.message ||
            "Gagal menghapus merchant"
        );
      setMessage("Merchant dihapus");
      await mutate();
      return { ok: true };
    } catch (e) {
      const msg = e?.message || "Gagal menghapus merchant";
      setError(msg);
      return { ok: false, error: msg };
    }
  };

  return {
    loading: listLoading || loading,
    merchants,
    q,
    setQ,
    page,
    setPage,
    perPage,
    setPerPage,
    total,
    totalPages,
    error: error || listErr?.message || "",
    message,
    fetchMerchants,
    createMerchant,
    updateMerchant,
    deleteMerchant,
  };
}
