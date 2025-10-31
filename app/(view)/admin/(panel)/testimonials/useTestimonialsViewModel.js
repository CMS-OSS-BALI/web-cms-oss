"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** util: GET JSON (with credentials) */
async function getJson(url) {
  const res = await fetch(url, { credentials: "include" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || data?.message || res.statusText;
    const e = new Error(msg);
    e.status = res.status;
    e.data = data;
    throw e;
  }
  return data;
}

/** util: POST/PUT/DELETE (json or form) */
async function send(url, { method = "POST", json, form }) {
  const init = { method, credentials: "include", headers: {} };
  if (form) {
    init.body = form; // multipart
  } else if (json) {
    init.headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(json);
  }
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || data?.message || res.statusText;
    const e = new Error(msg);
    e.status = res.status;
    e.data = data;
    throw e;
  }
  return data;
}

const DEFAULT_PER_PAGE = 10;
const MAX_FETCH = 200;

export default function useTestimonialsViewModel({
  locale: initialLocale = "id",
} = {}) {
  const [locale, setLocale] = useState(initialLocale);

  // list
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  // filters & pagination
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [rating, setRating] = useState(""); // number | ""
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);

  // categories
  const [catLoading, setCatLoading] = useState(false);
  const [allCategories, setAllCategories] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);

  const abortRef = useRef(null);

  const refresh = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    try {
      const url = `/api/testimonials?locale=${encodeURIComponent(
        locale
      )}&limit=${MAX_FETCH}`;
      const { data } = await getJson(url);
      const list = Array.isArray(data) ? data : [];
      setRows(list);
      setTotal(list.length);
      setPage(1);
    } catch (e) {
      console.error("fetch testimonials failed:", e);
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // categories: fetch semua, set default options
  const fetchCategories = useCallback(async () => {
    setCatLoading(true);
    try {
      const { data } = await getJson(
        `/api/testimonials-category?locale=${encodeURIComponent(locale)}`
      );
      const all = Array.isArray(data) ? data : [];
      setAllCategories(all);
      setCategoryOptions(
        all.map((c) => ({
          value: c.id,
          label: c.name || c.slug || "(no name)",
        }))
      );
    } catch (e) {
      console.error("fetch categories failed:", e);
      setAllCategories([]);
      setCategoryOptions([]);
    } finally {
      setCatLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // exposed: live search (client-side) that also updates options state
  const searchCategories = useCallback(
    (keyword = "") => {
      const s = String(keyword || "")
        .trim()
        .toLowerCase();
      const opts = (allCategories || [])
        .filter((c) => {
          if (!s) return true;
          const name = (c?.name || "").toLowerCase();
          const slug = (c?.slug || "").toLowerCase();
          return name.includes(s) || slug.includes(s);
        })
        .map((c) => ({ value: c.id, label: c.name || c.slug || "(no name)" }));
      setCategoryOptions(opts);
      return opts;
    },
    [allCategories]
  );

  // client-side filtered & paginated
  const filtered = useMemo(() => {
    const s = (q || "").trim().toLowerCase();
    return (rows || []).filter((r) => {
      const okQ =
        !s ||
        (r?.name || "").toLowerCase().includes(s) ||
        (r?.message || "").toLowerCase().includes(s);
      const okCat = !categoryId || (r?.category?.id || "") === categoryId;
      const okStar = !rating || Number(r?.star ?? 0) === Number(rating);
      return okQ && okCat && okStar;
    });
  }, [rows, q, categoryId, rating]);

  const totalPages = useMemo(
    () =>
      Math.max(1, Math.ceil(filtered.length / (perPage || DEFAULT_PER_PAGE))),
    [filtered.length, perPage]
  );

  const pageItems = useMemo(() => {
    const p = Math.min(Math.max(1, page), totalPages);
    const start = (p - 1) * (perPage || DEFAULT_PER_PAGE);
    const end = start + (perPage || DEFAULT_PER_PAGE);
    return filtered.slice(start, end);
  }, [filtered, page, perPage, totalPages]);

  // ========== CRUD (wrapped with {ok, data|error}) ==========
  const getTestimonial = useCallback(
    async (id) => {
      try {
        const { data } = await getJson(
          `/api/testimonials/${id}?locale=${encodeURIComponent(locale)}`
        );
        return { ok: true, data };
      } catch (e) {
        return { ok: false, error: e?.message || "Failed to load" };
      }
    },
    [locale]
  );

  const createTestimonial = useCallback(
    async ({
      file,
      name,
      message,
      star,
      youtube_url,
      kampus_negara_tujuan,
      category_id,
    }) => {
      try {
        let body;
        if (file) {
          const fd = new FormData();
          fd.append("file", file);
          fd.append("name", name || "");
          fd.append("message", message || "");
          fd.append("locale", locale || "id");
          if (star != null) fd.append("star", String(star));
          if (youtube_url != null) fd.append("youtube_url", youtube_url);
          if (kampus_negara_tujuan != null)
            fd.append("kampus_negara_tujuan", kampus_negara_tujuan);
          if (category_id) fd.append("category_id", category_id);
          body = { form: fd };
        } else {
          body = {
            json: {
              name,
              message,
              locale: locale || "id",
              star,
              youtube_url,
              kampus_negara_tujuan,
              category_id: category_id || null,
            },
          };
        }
        const { data } = await send("/api/testimonials", {
          method: "POST",
          ...body,
        });
        await refresh();
        return { ok: true, data };
      } catch (e) {
        return { ok: false, error: e?.message || "Failed to create" };
      }
    },
    [locale, refresh]
  );

  const updateTestimonial = useCallback(
    async (
      id,
      {
        file,
        name,
        message,
        star,
        youtube_url,
        kampus_negara_tujuan,
        category_id,
      }
    ) => {
      try {
        let body;
        if (file) {
          const fd = new FormData();
          fd.append("locale", locale || "id");
          fd.append("file", file);
          if (name != null) fd.append("name", name);
          if (message != null) fd.append("message", message);
          if (star != null) fd.append("star", String(star));
          if (youtube_url != null) fd.append("youtube_url", youtube_url);
          if (kampus_negara_tujuan != null)
            fd.append("kampus_negara_tujuan", kampus_negara_tujuan);
          if (category_id != null) fd.append("category_id", category_id);
          body = { form: fd };
        } else {
          body = {
            json: {
              locale: locale || "id",
              ...(name != null ? { name } : {}),
              ...(message != null ? { message } : {}),
              ...(star != null ? { star } : {}),
              ...(youtube_url != null ? { youtube_url } : {}),
              ...(kampus_negara_tujuan != null ? { kampus_negara_tujuan } : {}),
              ...(category_id != null ? { category_id } : {}),
            },
          };
        }
        const { data } = await send(`/api/testimonials/${id}`, {
          method: "PUT",
          ...body,
        });
        await refresh();
        return { ok: true, data };
      } catch (e) {
        return { ok: false, error: e?.message || "Failed to update" };
      }
    },
    [locale, refresh]
  );

  const deleteTestimonial = useCallback(
    async (id) => {
      try {
        await send(`/api/testimonials/${id}`, { method: "DELETE" });
        await refresh();
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e?.message || "Failed to delete" };
      }
    },
    [refresh]
  );

  return {
    // base
    locale,
    setLocale,
    loading,
    total,

    // filters & pagination
    q,
    setQ,
    categoryId,
    setCategoryId,
    rating,
    setRating,
    page,
    setPage,
    perPage,
    setPerPage,
    totalPages,

    // derived/list
    testimonials: pageItems,

    // categories
    catLoading,
    categoryOptions,
    searchCategories,

    // ops
    refresh,
    getTestimonial,
    createTestimonial,
    updateTestimonial,
    deleteTestimonial,
  };
}
