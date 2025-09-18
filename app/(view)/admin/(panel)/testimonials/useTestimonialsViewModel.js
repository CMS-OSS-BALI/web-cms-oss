"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/swr/fetcher";

/**
 * ViewModel Testimonials
 * - Client-side search & pagination (karena GET /api/testimonials belum paging)
 * - Admin-only actions (create/update/delete) mengandalkan cookie session
 */
export default function useTestimonialsViewModel() {
  const [loading, setLoading] = useState(false); // non-GET ops

  // filter & paging (client-side)
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(12);
  const [total, setTotal] = useState(0); // derived
  const [totalPages, setTotalPages] = useState(1); // derived

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // SWR all testimonials
  const { data: rawJson, error: rawErr, isLoading: listLoading, mutate } = useSWR(`/api/testimonials`, fetcher);
  const rawList = useMemo(() => (rawJson?.data || []).filter((it) => !it.deleted_at), [rawJson]);

  const computePaged = useCallback(() => {
    const qv = (q || "").trim().toLowerCase();
    const pp = Number(perPage) || 12;
    let pg = Number(page) || 1;

    let filtered = rawList;
    if (qv) {
      filtered = filtered.filter(
        (it) =>
          (it.name || "").toLowerCase().includes(qv) ||
          (it.message || "").toLowerCase().includes(qv)
      );
    }

    const ttl = filtered.length;
    const ttlPages = Math.max(1, Math.ceil(ttl / pp));
    if (pg > ttlPages) pg = ttlPages;
    const start = (pg - 1) * pp;
    const list = filtered.slice(start, start + pp);
    return { list, ttl, ttlPages, pg, pp };
  }, [rawList, q, page, perPage]);

  const { list: testimonials, ttl, ttlPages, pg, pp } = computePaged();
  // sync derived paging numbers when data or filters change
  useEffect(() => {
    setTotal(ttl);
    setTotalPages(ttlPages);
    if (pg !== page) setPage(pg);
    if (pp !== perPage) setPerPage(pp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ttl, ttlPages, pg, pp]);

  const fetchTestimonials = useCallback(async (opts = {}) => {
    if ("q" in opts) setQ(opts.q || "");
    if ("page" in opts) setPage(Math.max(1, opts.page));
    if ("perPage" in opts) setPerPage(opts.perPage);
    // SWR will refetch raw list as needed
  }, []);

  // CREATE (admin)
  const createTestimonial = async (payload) => {
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/testimonials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json().catch(()=>null))?.message || "Gagal menambah testimonial");
      setMessage("Testimonial berhasil ditambahkan");
      await fetchTestimonials({ page: 1 });
      await mutate();
      return { ok: true };
    } catch (e) {
      const msg = e?.message || "Gagal menambah testimonial";
      setError(msg);
      return { ok: false, error: msg };
    }
  };

  // UPDATE (admin) pakai PUT
  const updateTestimonial = async (id, payload) => {
    setError("");
    setMessage("");
    try {
      // Jika crudService tidak punya method put, ganti ke: crudService.request("PUT", url, payload)
      const res = await fetch(`/api/testimonials/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json().catch(()=>null))?.message || "Gagal memperbarui testimonial");
      setMessage("Testimonial berhasil diperbarui");
      await mutate();
      return { ok: true };
    } catch (e) {
      const msg = e?.message || "Gagal memperbarui testimonial";
      setError(msg);
      return { ok: false, error: msg };
    }
  };

  // DELETE (admin) soft delete
  const deleteTestimonial = async (id) => {
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/testimonials/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json().catch(()=>null))?.message || "Gagal menghapus testimonial");
      setMessage("Testimonial dihapus");
      await mutate();
      return { ok: true };
    } catch (e) {
      const msg = e?.message || "Gagal menghapus testimonial";
      setError(msg);
      return { ok: false, error: msg };
    }
  };

  return {
    loading: listLoading || loading,
    testimonials,
    q,
    setQ,
    page,
    setPage,
    perPage,
    setPerPage,
    total,
    totalPages,
    error: error || (rawErr?.message || ""),
    message,
    fetchTestimonials,
    createTestimonial,
    updateTestimonial,
    deleteTestimonial,
  };
}
