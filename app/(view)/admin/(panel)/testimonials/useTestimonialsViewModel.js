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

/** util: POST/PUT/DELETE (json atau form) */
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
const FETCH_LIMIT = 200; // ambil banyak lalu paginate di client

function buildListUrl({ locale, categoryId }) {
  const p = new URLSearchParams();
  p.set("locale", locale || "id");
  p.set("limit", String(FETCH_LIMIT));
  if (categoryId) p.set("category_id", String(categoryId));
  return `/api/testimonials?${p.toString()}`;
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

  // RAW data dari server
  const [loading, setLoading] = useState(false);
  const [rawRows, setRawRows] = useState([]);

  // filters & pagination (client-side)
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

  const filteredRows = useMemo(
    () =>
      (rawRows || []).filter((r) =>
        matchesFilters(r, { q, categoryId, rating })
      ),
    [rawRows, q, categoryId, rating]
  );

  const total = filteredRows.length;
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / Math.max(1, perPage))),
    [total, perPage]
  );

  const pageRows = useMemo(() => {
    const start = (Math.max(1, page) - 1) * Math.max(1, perPage);
    return filteredRows.slice(start, start + Math.max(1, perPage));
  }, [filteredRows, page, perPage]);

  /** Fetch RAW list dari server (limit besar; kategori bisa difilter server) */
  const fetchList = useCallback(async () => {
    if (abortRef.current && !abortRef.current.signal.aborted) {
      abortRef.current.abort("refresh-list");
    }
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    try {
      const url = buildListUrl({ locale, categoryId });
      const json = await getJson(url, { signal: ctrl.signal });
      if (ctrl.signal.aborted || abortRef.current !== ctrl) return;

      const list = Array.isArray(json?.data) ? json.data : [];
      setRawRows(list);

      const nextTotalPages = Math.max(
        1,
        Math.ceil(list.length / Math.max(1, perPage))
      );
      if (page > nextTotalPages) setPage(nextTotalPages);
    } catch (e) {
      if (e?.name !== "AbortError") {
        console.error("fetchList error:", e);
      }
    } finally {
      if (abortRef.current === ctrl) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, categoryId]);

  useEffect(() => {
    fetchList();
    return () => {
      const c = abortRef.current;
      if (c && !c.signal.aborted) c.abort("effect-cleanup");
    };
  }, [fetchList]);

  // ============== CATEGORIES ==============
  const fetchCategories = useCallback(async () => {
    setCatLoading(true);
    try {
      // Coba endpoint A dulu
      let data;
      try {
        const res1 = await getJson(
          `/api/testimonial-categories?locale=${encodeURIComponent(
            locale
          )}&sort=slug:asc`
        );
        data = res1?.data;
      } catch (e) {
        if (e?.status === 404 || e?.status === 405) {
          // fallback ke endpoint B (nama lama)
          const res2 = await getJson(
            `/api/testimonials-category?locale=${encodeURIComponent(
              locale
            )}&sort=slug:asc`
          );
          data = res2?.data;
        } else {
          throw e;
        }
      }

      const all = Array.isArray(data) ? data : [];
      setAllCategories(all);
      setCategoryOptions(
        all.map((c) => ({
          value: c.id,
          label: c.name || c.slug || "(no name)",
        }))
      );
    } catch (e) {
      if (e?.name !== "AbortError") {
        console.error("fetchCategories error:", e);
      }
      setAllCategories([]);
      setCategoryOptions([]);
    } finally {
      setCatLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

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

  // ======= Client crop 9:16 (portrait) sebelum upload (best-effort) =======
  const maybeClientCrop9x16 = async (file) => {
    try {
      const mod = await import("@/app/utils/cropper");

      // 1) Prioritas: cropFileTo9x16Webp -> ambil .file (browser)
      if (typeof mod.cropFileTo9x16Webp === "function") {
        const out = await mod.cropFileTo9x16Webp(file, {
          height: 1920,
          quality: 90,
        });
        if (out?.file instanceof File) return out.file;
        if (out?.buffer) {
          // fallback: bentuk File dari buffer
          return new File(
            [out.buffer],
            file.name.replace(/\.[^/.]+$/, "") + ".webp",
            {
              type: "image/webp",
            }
          );
        }
      }

      // 2) Fallback: cropCenterAndResize9x16(heightOnly)
      if (typeof mod.cropCenterAndResize9x16 === "function") {
        return await mod.cropCenterAndResize9x16(file, 1920);
      }

      // 3) fallback final: kirim original (server akan crop)
      return file;
    } catch {
      return file;
    }
  };

  // ========== CRUD ==========
  const getTestimonial = useCallback(
    async (id) => {
      try {
        const { data } = await getJson(
          `/api/testimonials/${id}?locale=${encodeURIComponent(locale)}`
        );
        return { ok: true, data };
      } catch (e) {
        if (e?.name !== "AbortError") {
          console.error("getTestimonial error:", e);
        }
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
          const processed = await maybeClientCrop9x16(file); // 9:16
          const fd = new FormData();
          fd.append("file", processed);
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

        // versi lokal untuk bust cache jika server tidak mengubah URL
        const v = Date.now();
        setRawRows((prev) => [{ ...data, _v: v }, ...prev]);
        setPage(1);
        return { ok: true, data };
      } catch (e) {
        return { ok: false, error: e?.message || "Failed to create" };
      }
    },
    [locale]
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
          const processed = await maybeClientCrop9x16(file); // 9:16
          const fd = new FormData();
          fd.append("locale", locale || "id");
          fd.append("file", processed);
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

        // Optimistic merge + bump versi lokal utk cache-busting
        setRawRows((prev) => {
          const idx = prev.findIndex((r) => r.id === id);
          if (idx === -1) return prev;
          const next = [...prev];
          const v = Date.now();
          next[idx] = { ...prev[idx], ...data, _v: v };
          return next;
        });

        return { ok: true, data };
      } catch (e) {
        return { ok: false, error: e?.message || "Failed to update" };
      }
    },
    [locale]
  );

  const deleteTestimonial = useCallback(
    async (id) => {
      try {
        await send(`/api/testimonials/${id}`, { method: "DELETE" });
        setRawRows((prev) => prev.filter((r) => r.id !== id));
        setPage((p) => {
          const totalAfter = Math.max(0, total - 1);
          const pagesAfter = Math.max(
            1,
            Math.ceil(totalAfter / Math.max(1, perPage))
          );
          return Math.min(p, pagesAfter);
        });
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e?.message || "Failed to delete" };
      }
    },
    [perPage, total]
  );

  return {
    // base
    locale,
    setLocale,
    loading,
    total,
    totalPages,
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
    // derived
    testimonials: pageRows,
    // categories
    catLoading,
    categoryOptions,
    searchCategories,
    // ops
    refresh: fetchList,
    getTestimonial,
    createTestimonial,
    updateTestimonial,
    deleteTestimonial,
  };
}
