"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/swr/fetcher";

const DEFAULT_LOCALE = "id";
const DEFAULT_LIMIT = 500;

const toJsonPayload = (payload = {}) => {
  const result = {};
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined) return;
    result[key] = value;
  });
  return result;
};

const appendFormDataSafe = (formData, payload = {}) => {
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined) return;
    if (value === null) {
      formData.append(key, "");
    } else if (value instanceof Blob) {
      formData.append(key, value);
    } else {
      formData.append(key, String(value));
    }
  });
};

const isFileObject = (value) =>
  typeof File !== "undefined" && value instanceof File;

export default function useTestimonialsViewModel() {
  // filter & paging (client-side + server filter by category)
  const [q, setQ] = useState("");
  const [categorySlug, setCategorySlug] = useState(""); // NEW
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(12);
  const [total, setTotal] = useState(0); // derived
  const [totalPages, setTotalPages] = useState(1); // derived

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // SWR: daftar kategori untuk dropdown (id, slug, name)
  const { data: catJson } = useSWR(
    `/api/testimonials-category?locale=${DEFAULT_LOCALE}`,
    fetcher
  );
  const categories = useMemo(() => catJson?.data || [], [catJson]);

  // SWR: testimonials (server diberi filter slug biar hemat)
  const listKey = useMemo(() => {
    const params = new URLSearchParams();
    params.set("limit", String(DEFAULT_LIMIT));
    params.set("locale", DEFAULT_LOCALE);
    if (categorySlug) params.set("category_slug", categorySlug);
    return `/api/testimonials?${params.toString()}`;
  }, [categorySlug]);

  const {
    data: rawJson,
    error: rawErr,
    isLoading: listLoading,
    mutate,
  } = useSWR(listKey, fetcher);

  const rawList = useMemo(
    () =>
      (rawJson?.data || [])
        .filter((it) => !it.deleted_at)
        .map((it) => ({
          ...it,
          photo_public_url: it.photo_public_url ?? null,
        })),
    [rawJson]
  );

  const computePaged = useCallback(() => {
    const qv = (q || "").trim().toLowerCase();
    const pp = Number(perPage) || 12;
    let pg = Number(page) || 1;

    let filtered = rawList;
    if (qv) {
      filtered = filtered.filter((it) => {
        const name = (it.name || "").toLowerCase();
        const messageVal = (it.message || "").toLowerCase();
        const campus = (it.kampus_negara_tujuan || "").toLowerCase();
        const catName = (it.category?.name || "").toLowerCase();
        const catSlug = (it.category?.slug || "").toLowerCase();
        return (
          name.includes(qv) ||
          messageVal.includes(qv) ||
          campus.includes(qv) ||
          catName.includes(qv) ||
          catSlug.includes(qv)
        );
      });
    }

    const ttl = filtered.length;
    const ttlPages = Math.max(1, Math.ceil(ttl / pp));
    if (pg > ttlPages) pg = ttlPages;
    const start = (pg - 1) * pp;
    const list = filtered.slice(start, start + pp);
    return { list, ttl, ttlPages, pg, pp };
  }, [rawList, q, page, perPage]);

  const { list: testimonials, ttl, ttlPages, pg, pp } = computePaged();

  useEffect(() => {
    setTotal(ttl);
    setTotalPages(ttlPages);
    if (pg !== page) setPage(pg);
    if (pp !== perPage) setPerPage(pp);
  }, [ttl, ttlPages, pg, pp]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchTestimonials = useCallback(async (opts = {}) => {
    if ("q" in opts) setQ(opts.q || "");
    if ("page" in opts) setPage(Math.max(1, opts.page));
    if ("perPage" in opts) setPerPage(opts.perPage);
    if ("categorySlug" in opts) setCategorySlug(opts.categorySlug || "");
  }, []);

  const createTestimonial = async (payload = {}) => {
    setError("");
    setMessage("");

    const { file, ...rest } = payload;
    const basePayload = {
      name: rest.name,
      photo_url: rest.photo_url,
      message: rest.message,
      star: typeof rest.star === "number" ? rest.star : undefined,
      youtube_url: rest.youtube_url ?? undefined,
      kampus_negara_tujuan:
        rest.kampus_negara_tujuan !== undefined
          ? rest.kampus_negara_tujuan
          : undefined,
      category_slug: rest.category_slug,
      category_id: rest.category_id,
      locale: rest.locale ?? DEFAULT_LOCALE,
    };

    try {
      let res;
      if (isFileObject(file)) {
        const fd = new FormData();
        fd.append("file", file);
        const { photo_url, ...payloadWithoutPhotoUrl } = basePayload;
        appendFormDataSafe(fd, payloadWithoutPhotoUrl);
        res = await fetch("/api/testimonials", {
          method: "POST",
          body: fd,
        });
      } else {
        const body = toJsonPayload(basePayload);
        res = await fetch("/api/testimonials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      const json = await res.json().catch(() => null);
      if (!res.ok)
        throw new Error(json?.message || "Gagal menambah testimonial");

      setMessage("Testimonial berhasil ditambahkan");
      await fetchTestimonials({ page: 1 });
      await mutate();
      return { ok: true, data: json?.data };
    } catch (e) {
      const msg = e?.message || "Gagal menambah testimonial";
      setError(msg);
      return { ok: false, error: msg };
    }
  };

  const updateTestimonial = async (id, payload = {}) => {
    setError("");
    setMessage("");

    const { file, ...rest } = payload;
    const basePayload = {
      name: rest.name,
      photo_url: rest.photo_url,
      message: rest.message,
      star: typeof rest.star === "number" ? rest.star : undefined,
      youtube_url: rest.youtube_url ?? undefined,
      kampus_negara_tujuan:
        rest.kampus_negara_tujuan !== undefined
          ? rest.kampus_negara_tujuan
          : undefined,
      category_slug: rest.category_slug,
      category_id: rest.category_id,
      locale: rest.locale ?? DEFAULT_LOCALE,
    };

    try {
      let res;
      if (isFileObject(file)) {
        const fd = new FormData();
        fd.append("file", file);
        const { photo_url, ...payloadWithoutPhotoUrl } = basePayload;
        appendFormDataSafe(fd, payloadWithoutPhotoUrl);
        res = await fetch(`/api/testimonials/${encodeURIComponent(id)}`, {
          method: "PUT",
          body: fd,
        });
      } else {
        const body = toJsonPayload(basePayload);
        res = await fetch(`/api/testimonials/${encodeURIComponent(id)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      const json = await res.json().catch(() => null);
      if (!res.ok)
        throw new Error(json?.message || "Gagal memperbarui testimonial");

      setMessage("Testimonial berhasil diperbarui");
      await mutate();
      return { ok: true, data: json?.data };
    } catch (e) {
      const msg = e?.message || "Gagal memperbarui testimonial";
      setError(msg);
      return { ok: false, error: msg };
    }
  };

  const deleteTestimonial = async (id) => {
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/testimonials/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok)
        throw new Error(json?.message || "Gagal menghapus testimonial");
      setMessage("Testimonial dihapus");
      await mutate();
      return { ok: true, data: json?.data };
    } catch (e) {
      const msg = e?.message || "Gagal menghapus testimonial";
      setError(msg);
      return { ok: false, error: msg };
    }
  };

  return {
    loading: listLoading,
    testimonials,
    categories, // NEW: untuk dropdown
    categorySlug, // NEW
    setCategorySlug, // NEW
    q,
    setQ,
    page,
    setPage,
    perPage,
    setPerPage,
    total,
    totalPages,
    error: error || rawErr?.message || "",
    message,
    fetchTestimonials,
    createTestimonial,
    updateTestimonial,
    deleteTestimonial,
  };
}
