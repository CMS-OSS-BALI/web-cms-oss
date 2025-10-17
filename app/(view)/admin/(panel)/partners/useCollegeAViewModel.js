"use client";

import { useCallback, useEffect, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/swr/fetcher";

const DEFAULT_LOCALE = "id";
const FALLBACK_LOCALE = "en";

export default function useCollegeAdminViewModel() {
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("");
  const [type, setType] = useState("");

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(8);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

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

  const listKey = `/api/college?${sp.toString()}`;

  const {
    data: listJson,
    error: listErr,
    isLoading: listLoading,
    mutate,
  } = useSWR(listKey, fetcher);

  const colleges = listJson?.data || [];

  useEffect(() => {
    if (listJson?.total !== undefined) {
      setTotal(listJson.total);
      setTotalPages(listJson?.totalPages || 1);
      if (listJson?.page) setPage(listJson.page);
      if (listJson?.perPage) setPerPage(listJson.perPage);
    }
  }, [listJson]);

  const fetchColleges = useCallback(async (opts = {}) => {
    if ("page" in opts) setPage(Math.max(1, opts.page));
    if ("perPage" in opts) setPerPage(opts.perPage);
    if ("q" in opts) setQ(opts.q || "");
    if ("country" in opts) setCountry(opts.country || "");
    if ("type" in opts) setType(opts.type || "");
  }, []);

  // CREATE
  const createCollege = async (payload) => {
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/college", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, locale: DEFAULT_LOCALE }),
      });
      if (!res.ok)
        throw new Error(
          (await res.json().catch(() => null))?.message ||
            "Gagal menambah college"
        );
      setMessage("College berhasil ditambahkan");
      await fetchColleges({ page: 1 });
      await mutate();
      return { ok: true };
    } catch (e) {
      const msg = e?.message || "Gagal menambah college";
      setError(msg);
      return { ok: false, error: msg };
    }
  };

  // UPDATE (pakai route /api/college/[id])
  const updateCollege = async (id, payload) => {
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/college/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, locale: DEFAULT_LOCALE }),
      });
      if (!res.ok)
        throw new Error(
          (await res.json().catch(() => null))?.message ||
            "Gagal memperbarui college"
        );
      setMessage("College berhasil diperbarui");
      await mutate();
      return { ok: true };
    } catch (e) {
      const msg = e?.message || "Gagal memperbarui college";
      setError(msg);
      return { ok: false, error: msg };
    }
  };

  // DELETE (pakai route /api/college/[id])
  const deleteCollege = async (id) => {
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/college/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok)
        throw new Error(
          (await res.json().catch(() => null))?.message ||
            "Gagal menghapus college"
        );
      setMessage("College dihapus");
      await mutate();
      return { ok: true };
    } catch (e) {
      const msg = e?.message || "Gagal menghapus college";
      setError(msg);
      return { ok: false, error: msg };
    }
  };

  return {
    loading: listLoading,
    colleges,
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
    fetchColleges,
    createCollege,
    updateCollege,
    deleteCollege,
  };
}
