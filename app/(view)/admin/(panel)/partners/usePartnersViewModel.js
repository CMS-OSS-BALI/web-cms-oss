"use client";

import { useCallback, useEffect, useState } from "react";
import { crudService } from "@/app/utils/services/crudService";

export default function usePartnersViewModel() {
  const [loading, setLoading] = useState(true);
  const [partners, setPartners] = useState([]);

  const [q, setQ] = useState("");
  const [country, setCountry] = useState("");
  const [type, setType] = useState("");

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const fetchPartners = useCallback(
    async (opts = {}) => {
      setLoading(true);
      setError("");
      try {
        const sp = new URLSearchParams();
        sp.set("page", String(opts.page ?? page));
        sp.set("perPage", String(opts.perPage ?? perPage));

        const qv = (opts.q ?? q)?.trim();
        if (qv) sp.set("q", qv);

        const cv = (opts.country ?? country)?.trim();
        if (cv) sp.set("country", cv);

        const tv = (opts.type ?? type)?.toString().toUpperCase();
        if (tv) sp.set("type", tv);

        const json = await crudService.get(`/api/partners?${sp.toString()}`);

        setPartners(json?.data || []);
        setPage(json?.page || 1);
        setPerPage(json?.perPage || 10);
        setTotal(json?.total || 0);
        setTotalPages(json?.totalPages || 1);
      } catch (e) {
        setError(e?.message || "Gagal memuat data partners");
      } finally {
        setLoading(false);
      }
    },
    [page, perPage, q, country, type]
  );

  useEffect(() => {
    fetchPartners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // CREATE
  const createPartner = async (payload) => {
    setError("");
    setMessage("");
    try {
      await crudService.post("/api/partners", payload);
      setMessage("Partner berhasil ditambahkan");
      await fetchPartners({ page: 1 });
      return { ok: true };
    } catch (e) {
      const msg = e?.message || "Gagal menambah partner";
      setError(msg);
      return { ok: false, error: msg };
    }
  };

  // UPDATE (pakai route /api/partners/[id])
  const updatePartner = async (id, payload) => {
    setError("");
    setMessage("");
    try {
      await crudService.patch(
        `/api/partners/${encodeURIComponent(id)}`,
        payload
      );
      setMessage("Partner berhasil diperbarui");
      await fetchPartners({ page });
      return { ok: true };
    } catch (e) {
      const msg = e?.message || "Gagal memperbarui partner";
      setError(msg);
      return { ok: false, error: msg };
    }
  };

  // DELETE (pakai route /api/partners/[id])
  const deletePartner = async (id) => {
    setError("");
    setMessage("");
    try {
      await crudService.delete(`/api/partners/${encodeURIComponent(id)}`);
      setMessage("Partner dihapus");
      const nextPage = partners.length === 1 && page > 1 ? page - 1 : page;
      await fetchPartners({ page: nextPage });
      return { ok: true };
    } catch (e) {
      const msg = e?.message || "Gagal menghapus partner";
      setError(msg);
      return { ok: false, error: msg };
    }
  };

  return {
    loading,
    partners,
    q,
    setQ,
    country,
    setCountry,
    type,
    setType,
    page,
    setPage,
    perPage,
    setPerPage,
    total,
    totalPages,
    error,
    message,
    fetchPartners,
    createPartner,
    updatePartner,
    deletePartner,
  };
}
