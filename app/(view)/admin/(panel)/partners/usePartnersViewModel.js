"use client";

import { useCallback, useEffect, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/swr/fetcher";

const DEFAULT_LOCALE = "id";
const FALLBACK_LOCALE = "en";

export default function usePartnersViewModel() {
  const [loading, setLoading] = useState(false); // for non-GET ops

  const [q, setQ] = useState("");
  const [country, setCountry] = useState("");
  const [type, setType] = useState("");

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(8);
  const [total, setTotal] = useState(0); // derived
  const [totalPages, setTotalPages] = useState(1); // derived

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const sp = new URLSearchParams();
  sp.set("page", String(page));
  sp.set("perPage", String(perPage));
  if (q.trim()) sp.set("q", q.trim());
  if (country.trim()) sp.set("country", country.trim());
  if (type) sp.set("type", String(type).toUpperCase());
  sp.set("locale", DEFAULT_LOCALE);
  sp.set("fallback", FALLBACK_LOCALE);
  const listKey = `/api/partners?${sp.toString()}`;
  const {
    data: listJson,
    error: listErr,
    isLoading: listLoading,
    mutate,
  } = useSWR(listKey, fetcher);
  const partners = listJson?.data || [];
  useEffect(() => {
    if (listJson?.total !== undefined) {
      setTotal(listJson.total);
      setTotalPages(listJson?.totalPages || 1);
      if (listJson?.page) setPage(listJson.page);
      if (listJson?.perPage) setPerPage(listJson.perPage);
    }
  }, [listJson]);

  const fetchPartners = useCallback(async (opts = {}) => {
    if ("page" in opts) setPage(Math.max(1, opts.page));
    if ("perPage" in opts) setPerPage(opts.perPage);
    if ("q" in opts) setQ(opts.q || "");
    if ("country" in opts) setCountry(opts.country || "");
    if ("type" in opts) setType(opts.type || "");
  }, []);

  // CREATE
  const createPartner = async (payload) => {
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, locale: DEFAULT_LOCALE }),
      });
      if (!res.ok)
        throw new Error(
          (await res.json().catch(() => null))?.message ||
            "Gagal menambah partner"
        );
      setMessage("Partner berhasil ditambahkan");
      await fetchPartners({ page: 1 });
      await mutate();
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
      const res = await fetch(`/api/partners/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, locale: DEFAULT_LOCALE }),
      });
      if (!res.ok)
        throw new Error(
          (await res.json().catch(() => null))?.message ||
            "Gagal memperbarui partner"
        );
      setMessage("Partner berhasil diperbarui");
      await mutate();
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
      const res = await fetch(`/api/partners/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok)
        throw new Error(
          (await res.json().catch(() => null))?.message ||
            "Gagal menghapus partner"
        );
      setMessage("Partner dihapus");
      await mutate();
      return { ok: true };
    } catch (e) {
      const msg = e?.message || "Gagal menghapus partner";
      setError(msg);
      return { ok: false, error: msg };
    }
  };

  return {
    loading: listLoading || loading,
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
    error: error || listErr?.message || "",
    message,
    fetchPartners,
    createPartner,
    updatePartner,
    deletePartner,
  };
}
