"use client";

import { useCallback, useEffect, useState } from "react";
import { crudService } from "@/app/utils/services/crudService";

export default function useMerchantsViewModel() {
  const [loading, setLoading] = useState(true);
  const [merchants, setMerchants] = useState([]);

  // filters
  const [q, setQ] = useState("");

  // pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // status
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  /** LIST */
  const fetchMerchants = useCallback(
    async (opts = {}) => {
      setLoading(true);
      setError("");
      try {
        const sp = new URLSearchParams();
        sp.set("page", String(opts.page ?? page));
        sp.set("perPage", String(opts.perPage ?? perPage));
        const qv = (opts.q ?? q)?.trim();
        if (qv) sp.set("q", qv);

        const json = await crudService.get(`/api/merchants?${sp.toString()}`);

        setMerchants(json?.data || []);
        setPage(json?.page || 1);
        setPerPage(json?.perPage || 10);
        setTotal(json?.total || 0);
        setTotalPages(json?.totalPages || 1);
      } catch (e) {
        setError(e?.message || "Gagal memuat data merchants");
      } finally {
        setLoading(false);
      }
    },
    [page, perPage, q]
  );

  useEffect(() => {
    fetchMerchants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** CREATE */
  const createMerchant = async (payload) => {
    setError("");
    setMessage("");
    try {
      // payload mencakup image_url (opsional)
      await crudService.post("/api/merchants", payload);
      setMessage("Merchant berhasil ditambahkan");
      await fetchMerchants({ page: 1 });
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
      await crudService.patch(
        `/api/merchants/${encodeURIComponent(id)}`,
        payload
      );
      setMessage("Merchant berhasil diperbarui");
      await fetchMerchants({ page });
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
      await crudService.delete(`/api/merchants/${encodeURIComponent(id)}`);
      setMessage("Merchant dihapus");
      const nextPage = merchants.length === 1 && page > 1 ? page - 1 : page;
      await fetchMerchants({ page: nextPage });
      return { ok: true };
    } catch (e) {
      const msg = e?.message || "Gagal menghapus merchant";
      setError(msg);
      return { ok: false, error: msg };
    }
  };

  return {
    loading,
    merchants,
    q,
    setQ,
    page,
    setPage,
    perPage,
    setPerPage,
    total,
    totalPages,
    error,
    message,
    fetchMerchants,
    createMerchant,
    updateMerchant,
    deleteMerchant,
  };
}
