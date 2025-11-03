"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** util: GET JSON (with credentials) */
async function getJson(url, init = {}) {
  const res = await fetch(url, { credentials: "include", ...init });
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

function buildListUrl({
  locale,
  page,
  perPage,
  q,
  categoryId,
  rating,
  signal,
}) {
  const p = new URLSearchParams();
  p.set("locale", locale || "id");
  p.set("page", String(page || 1));
  p.set("perPage", String(perPage || DEFAULT_PER_PAGE));
  if (q && q.trim()) p.set("q", q.trim());
  if (categoryId) p.set("category_id", String(categoryId));
  if (rating !== "" && rating != null) p.set("rating", String(rating));
  const url = `/api/testimonials?${p.toString()}`;
  return { url, init: { signal } };
}

function matchesFilters(item, { q, categoryId, rating }) {
  const s = (q || "").trim().toLowerCase();
  const okQ =
    !s ||
    (item?.name || "").toLowerCase().includes(s) ||
    (item?.message || "").toLowerCase().includes(s);
  const okCat = !categoryId || (item?.category?.id || "") === categoryId;
  const okStar = rating === "" || Number(item?.star ?? 0) === Number(rating);
  return okQ && okCat && okStar;
}

export default function useTestimonialsViewModel({
  locale: initialLocale = "id",
} = {}) {
  const [locale, setLocale] = useState(initialLocale);

  // list
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  // filters & pagination (SERVER-SIDE)
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

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((total || 0) / (perPage || DEFAULT_PER_PAGE))),
    [total, perPage]
  );

  /** Fetch current page from server (no page reset) */
  const fetchList = useCallback(async () => {
    abortRef.current?.abort?.();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    try {
      const { url, init } = buildListUrl({
        locale,
        page,
        perPage,
        q,
        categoryId,
        rating,
        signal: ctrl.signal,
      });
      const json = await getJson(url, init);
      const list = Array.isArray(json?.data) ? json.data : [];
      const metaTotal =
        json?.meta?.total ??
        json?.total ??
        (Array.isArray(json?.data) ? json.data.length : 0);

      setRows(list);
      setTotal(Number(metaTotal) || 0);

      // clamp page if server shrank dataset
      const nextTotalPages = Math.max(
        1,
        Math.ceil((Number(metaTotal) || 0) / Math.max(1, perPage))
      );
      if (page > nextTotalPages) setPage(nextTotalPages);
    } finally {
      setLoading(false);
    }
  }, [locale, page, perPage, q, categoryId, rating]);

  useEffect(() => {
    fetchList();
    return () => abortRef.current?.abort?.();
  }, [fetchList]);

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
    } catch {
      setAllCategories([]);
      setCategoryOptions([]);
    } finally {
      setCatLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // remote options filtered locally for dropdown UX
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

  // ========== CRUD (with optimistic updates) ==========
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

        // optimistic: bump total; if new item matches filter and we are on page 1, prepend
        setTotal((t) => (Number.isFinite(t) ? t + 1 : 1));
        const item = data;
        if (page === 1 && matchesFilters(item, { q, categoryId, rating })) {
          setRows((prev) => {
            const next = [item, ...prev];
            // maintain page size
            return next.slice(0, perPage);
          });
        }
        // otherwise, keep current page intact; new item appears when user goes to page 1
        return { ok: true, data };
      } catch (e) {
        return { ok: false, error: e?.message || "Failed to create" };
      }
    },
    [locale, page, perPage, q, categoryId, rating]
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

        // optimistic merge on current page
        setRows((prev) => {
          const idx = prev.findIndex((r) => r.id === id);
          if (idx === -1) return prev;
          const merged = { ...prev[idx], ...data };
          // if it no longer matches filters, drop it and (optionally) backfill by refetching this page
          if (!matchesFilters(merged, { q, categoryId, rating })) {
            const clipped = [...prev.slice(0, idx), ...prev.slice(idx + 1)];
            // backfill one item to keep page full
            (async () => {
              try {
                const { url, init } = buildListUrl({
                  locale,
                  page,
                  perPage,
                  q,
                  categoryId,
                  rating,
                });
                const json = await getJson(url, init);
                const list = Array.isArray(json?.data) ? json.data : [];
                setRows(list);
                const metaTotal =
                  json?.meta?.total ?? json?.total ?? list.length ?? 0;
                setTotal(Number(metaTotal) || 0);
              } catch {
                // ignore; clipped page is acceptable briefly
              }
            })();
            return clipped;
          }
          const next = [...prev];
          next[idx] = merged;
          return next;
        });

        return { ok: true, data };
      } catch (e) {
        return { ok: false, error: e?.message || "Failed to update" };
      }
    },
    [locale, page, perPage, q, categoryId, rating]
  );

  const deleteTestimonial = useCallback(
    async (id) => {
      try {
        await send(`/api/testimonials/${id}`, { method: "DELETE" });

        // optimistic: remove from current page and decrement total
        let removed = false;
        setRows((prev) => {
          const idx = prev.findIndex((r) => r.id === id);
          if (idx === -1) return prev;
          removed = true;
          const next = [...prev.slice(0, idx), ...prev.slice(idx + 1)];
          return next;
        });
        setTotal((t) => Math.max(0, (t || 0) - 1));

        // compute next valid page after deletion
        const nextTotalPages = Math.max(
          1,
          Math.ceil(Math.max(0, (total || 0) - 1) / Math.max(1, perPage))
        );
        const targetPage = Math.min(page, nextTotalPages);
        if (targetPage !== page) setPage(targetPage);

        // backfill to keep page filled (single request, not full reload)
        if (removed) {
          const { url, init } = buildListUrl({
            locale,
            page: targetPage,
            perPage,
            q,
            categoryId,
            rating,
          });
          const json = await getJson(url, init);
          const list = Array.isArray(json?.data) ? json.data : [];
          setRows(list);
          const metaTotal =
            json?.meta?.total ?? json?.total ?? list.length ?? 0;
          setTotal(Number(metaTotal) || 0);
        }

        return { ok: true };
      } catch (e) {
        return { ok: false, error: e?.message || "Failed to delete" };
      }
    },
    [locale, page, perPage, q, categoryId, rating, total]
  );

  return {
    // base
    locale,
    setLocale,
    loading,
    total,
    totalPages,

    // filters & pagination (server-side)
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

    // derived/list (already paginated by server)
    testimonials: rows,

    // categories
    catLoading,
    categoryOptions,
    searchCategories,

    // ops
    refresh: fetchList, // fetch current page with current filters
    getTestimonial,
    createTestimonial,
    updateTestimonial,
    deleteTestimonial,
  };
}
