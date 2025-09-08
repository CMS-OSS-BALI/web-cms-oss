"use client";

import { useCallback, useEffect, useState } from "react";
import { crudService } from "@/app/utils/services/crudService";

/**
 * ViewModel Testimonials
 * - Client-side search & pagination (karena GET /api/testimonials belum paging)
 * - Admin-only actions (create/update/delete) mengandalkan cookie session
 */
export default function useTestimonialsViewModel() {
  const [loading, setLoading] = useState(true);
  const [testimonials, setTestimonials] = useState([]);

  // filter & paging (client-side)
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(12);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const fetchTestimonials = useCallback(
    async (opts = {}) => {
      setLoading(true);
      setError("");

      try {
        const qv = (opts.q ?? q)?.trim().toLowerCase();
        const pp = Number(opts.perPage ?? perPage) || 12;
        let pg = Number(opts.page ?? page) || 1;

        // GET semua testimoni (publik)
        const json = await crudService.get(`/api/testimonials`);
        const raw = json?.data || [];

        // filter q (name/message)
        let filtered = raw.filter((it) => !it.deleted_at);
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

        setTestimonials(list);
        setPage(pg);
        setPerPage(pp);
        setTotal(ttl);
        setTotalPages(ttlPages);
      } catch (e) {
        setError(e?.message || "Gagal memuat data testimonials");
      } finally {
        setLoading(false);
      }
    },
    [page, perPage, q]
  );

  useEffect(() => {
    fetchTestimonials();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // CREATE (admin)
  const createTestimonial = async (payload) => {
    setError("");
    setMessage("");
    try {
      await crudService.post("/api/testimonials", payload); // butuh cookie session
      setMessage("Testimonial berhasil ditambahkan");
      await fetchTestimonials({ page: 1 });
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
      (await crudService.put?.(
        `/api/testimonials/${encodeURIComponent(id)}`,
        payload
      )) ??
        crudService.request(
          "PUT",
          `/api/testimonials/${encodeURIComponent(id)}`,
          payload
        );
      setMessage("Testimonial berhasil diperbarui");
      await fetchTestimonials({ page });
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
      await crudService.delete(`/api/testimonials/${encodeURIComponent(id)}`);
      setMessage("Testimonial dihapus");
      const nextPage = testimonials.length === 1 && page > 1 ? page - 1 : page;
      await fetchTestimonials({ page: nextPage });
      return { ok: true };
    } catch (e) {
      const msg = e?.message || "Gagal menghapus testimonial";
      setError(msg);
      return { ok: false, error: msg };
    }
  };

  return {
    loading,
    testimonials,
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
    fetchTestimonials,
    createTestimonial,
    updateTestimonial,
    deleteTestimonial,
  };
}
