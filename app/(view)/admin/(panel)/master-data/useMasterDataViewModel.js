"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/* ---------- helpers ---------- */
const jsonFetcher = async (url, init = {}) => {
  const res = await fetch(url, {
    cache: "no-store",
    credentials: "include",
    headers: { Accept: "application/json", ...(init.headers || {}) },
    ...init,
  });
  // try decode even on error to surface message
  let payload = null;
  try {
    payload = await res.json();
  } catch {}
  if (!res.ok) {
    const msg =
      payload?.error?.message ||
      payload?.message ||
      `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.payload = payload;
    throw err;
  }
  return payload ?? {};
};

/* ---------- type registry ---------- */
const TYPES = {
  blog: {
    key: "blog",
    label: "Kategori Blog",
    buildListUrl: ({ page, perPage, q }) => {
      const u = new URL("/api/blog-categories", window.location.origin);
      u.searchParams.set("page", String(page));
      u.searchParams.set("perPage", String(perPage));
      u.searchParams.set("sort", "created_at:desc");
      u.searchParams.set("locale", "id");
      u.searchParams.set("fallback", "id");
      if (q?.trim()) u.searchParams.set("q", q.trim());
      return u.toString();
    },
    normalizeList: (json) => ({
      total: Number(json?.meta?.total || 0),
      totalPages: Number(json?.meta?.totalPages || 1),
      rows: (json?.data || []).map((r) => ({
        id: r.id,
        name: r.name ?? "-",
        created_at: r.created_at ?? null,
      })),
    }),
    getOne: (id) =>
      jsonFetcher(
        `/api/blog-categories/${encodeURIComponent(id)}?locale=id&fallback=id`
      ),
    create: (name) =>
      jsonFetcher("/api/blog-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name_id: String(name || ""),
          autoTranslate: true,
        }),
      }),
    update: (id, name) =>
      jsonFetcher(`/api/blog-categories/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name_id: String(name || ""),
          autoTranslate: true,
        }),
      }),
    remove: (id) =>
      jsonFetcher(`/api/blog-categories/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
  },

  event: {
    key: "event",
    label: "Kategori Event",
    buildListUrl: ({ page, perPage, q }) => {
      const u = new URL("/api/event-categories", window.location.origin);
      u.searchParams.set("page", String(page));
      u.searchParams.set("perPage", String(perPage));
      u.searchParams.set("sort", "created_at:desc");
      u.searchParams.set("locale", "id");
      u.searchParams.set("fallback", "id");
      if (q?.trim()) u.searchParams.set("q", q.trim());
      return u.toString();
    },
    normalizeList: (json) => ({
      total: Number(json?.meta?.total || 0),
      totalPages: Number(json?.meta?.totalPages || 1),
      rows: (json?.data || []).map((r) => ({
        id: r.id,
        name: r.name ?? "-",
        created_at: r.created_at ?? null,
      })),
    }),
    getOne: (id) =>
      jsonFetcher(
        `/api/event-categories/${encodeURIComponent(id)}?locale=id&fallback=id`
      ),
    create: (name) =>
      jsonFetcher("/api/event-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name_id: String(name || ""),
          autoTranslate: true,
        }),
      }),
    update: (id, name) =>
      jsonFetcher(`/api/event-categories/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name_id: String(name || ""),
          autoTranslate: true,
        }),
      }),
    remove: (id) =>
      jsonFetcher(`/api/event-categories/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
  },

  mitra: {
    key: "mitra",
    label: "Kategori Mitra (Dalam Negeri)",
    buildListUrl: ({ page, perPage, q }) => {
      const u = new URL(
        "/api/mitra-dalam-negeri-categories",
        window.location.origin
      );
      u.searchParams.set("page", String(page));
      u.searchParams.set("perPage", String(perPage));
      u.searchParams.set("sort", "created_at:desc");
      u.searchParams.set("locale", "id");
      u.searchParams.set("fallback", "id");
      if (q?.trim()) u.searchParams.set("q", q.trim());
      return u.toString();
    },
    normalizeList: (json) => ({
      total: Number(json?.meta?.total || 0),
      totalPages: Number(json?.meta?.totalPages || 1),
      rows: (json?.data || []).map((r) => ({
        id: r.id,
        name: r.name ?? "-",
        created_at: r.created_at ?? null,
      })),
    }),
    getOne: (id) =>
      jsonFetcher(
        `/api/mitra-dalam-negeri-categories/${encodeURIComponent(
          id
        )}?locale=id&fallback=id`
      ),
    create: (name) =>
      jsonFetcher("/api/mitra-dalam-negeri-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name_id: String(name || ""),
          autoTranslate: true,
        }),
      }),
    update: (id, name) =>
      jsonFetcher(
        `/api/mitra-dalam-negeri-categories/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name_id: String(name || ""),
            autoTranslate: true,
          }),
        }
      ),
    remove: (id) =>
      jsonFetcher(
        `/api/mitra-dalam-negeri-categories/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
        }
      ),
  },

  service: {
    key: "service",
    label: "Kategori Layanan",
    buildListUrl: ({ page, perPage, q }) => {
      const u = new URL("/api/service-categories", window.location.origin);
      u.searchParams.set("page", String(page));
      u.searchParams.set("limit", String(perPage));
      if (q?.trim()) u.searchParams.set("q", q.trim());
      // meta didukung (lihat patch endpoint di bawah)
      return u.toString();
    },
    normalizeList: (json) => {
      const rows = json?.data || [];
      const meta = json?.meta;
      return {
        total: meta?.total ?? rows.length,
        totalPages: meta?.totalPages ?? 1,
        rows: rows.map((r) => ({
          id: r.id,
          name: r.name ?? "-",
          created_at: r.created_at ?? null,
        })),
      };
    },
    getOne: (id) =>
      jsonFetcher(`/api/service-categories/${encodeURIComponent(id)}`),
    create: (name) =>
      jsonFetcher("/api/service-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: String(name || "") }),
      }),
    update: (id, name) =>
      jsonFetcher(`/api/service-categories/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: String(name || "") }),
      }),
    remove: (id) =>
      jsonFetcher(`/api/service-categories/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
  },

  testimonial: {
    key: "testimonial",
    label: "Kategori Testimoni",
    buildListUrl: () =>
      new URL(
        "/api/testimonials-category?locale=id",
        window.location.origin
      ).toString(),
    normalizeList: (json) => ({
      total: (json?.data || []).length,
      totalPages: 1,
      rows: (json?.data || []).map((r) => ({
        id: r.id,
        name: r.name ?? "-",
        created_at: null,
      })),
    }),
    getOne: (id) =>
      jsonFetcher(
        `/api/testimonials-category/${encodeURIComponent(id)}?locale=id`
      ),
    create: (name) =>
      jsonFetcher("/api/testimonials-category", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: String(name || ""), locale: "id" }),
      }),
    update: (id, name) =>
      jsonFetcher(`/api/testimonials-category/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: String(name || ""), locale: "id" }),
      }),
    remove: (id) =>
      jsonFetcher(`/api/testimonials-category/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
  },
};

const TYPE_OPTIONS = Object.values(TYPES).map(({ key, label }) => ({
  value: key,
  label,
}));

export default function useMasterDataViewModel() {
  /* ========== filters/state ========== */
  const [type, setType] = useState("blog");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [locale, setLocale] = useState("id");

  /* ========== list state ========== */
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [opLoading, setOpLoading] = useState(false);

  const current = useMemo(() => TYPES[type], [type]);
  const seqRef = useRef(0); // prevent stale commits

  const fetchList = useCallback(async () => {
    const seq = ++seqRef.current;
    setLoading(true);
    try {
      const url = current.buildListUrl({ page, perPage, q, locale });
      const json = await jsonFetcher(url);
      let {
        rows: rws,
        total: ttl,
        totalPages: tpg,
      } = current.normalizeList(json);

      // testimonial: manual filter + paginate
      if (current.key === "testimonial") {
        if (q?.trim()) {
          const kw = q.trim().toLowerCase();
          rws = rws.filter((r) => (r.name || "").toLowerCase().includes(kw));
        }
        const start = (page - 1) * perPage;
        const end = start + perPage;
        ttl = rws.length;
        tpg = Math.max(1, Math.ceil(ttl / perPage));
        rws = rws.slice(start, end);
      }

      // commit only if not stale
      if (seq === seqRef.current) {
        setRows(rws);
        setTotal(ttl);
        setTotalPages(tpg);
      }
    } catch (e) {
      if (seq === seqRef.current) {
        setRows([]);
        setTotal(0);
        setTotalPages(1);
      }
    } finally {
      if (seq === seqRef.current) setLoading(false);
    }
  }, [current, page, perPage, q, locale]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  /* ========== actions ========== */
  async function createCategory(name) {
    setOpLoading(true);
    try {
      await current.create(String(name || "").trim());
      await fetchList();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e?.message || "Gagal membuat kategori" };
    } finally {
      setOpLoading(false);
    }
  }

  async function updateCategory(id, name) {
    setOpLoading(true);
    try {
      await current.update(id, String(name || "").trim());
      await fetchList();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e?.message || "Gagal menyimpan perubahan" };
    } finally {
      setOpLoading(false);
    }
  }

  async function deleteCategory(id) {
    setOpLoading(true);
    try {
      await current.remove(id);
      await fetchList();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e?.message || "Gagal menghapus" };
    } finally {
      setOpLoading(false);
    }
  }

  async function getCategory(id) {
    try {
      const json = await current.getOne(id);
      const d = json?.data ?? json;
      return { ok: true, data: { id: d.id, name: d.name ?? d?.slug ?? "-" } };
    } catch (e) {
      return { ok: false, error: e?.message || "Gagal memuat detail" };
    }
  }

  function changeType(next) {
    setType(next);
    setQ("");
    setPage(1);
    // perPage tetap, atau sesuaikan bila perlu
  }

  return {
    // state
    type,
    setType: changeType,
    typeOptions: TYPE_OPTIONS,

    q,
    setQ,
    page,
    setPage,
    perPage,
    setPerPage,
    locale,
    setLocale,

    rows,
    total,
    totalPages,
    loading,
    opLoading,

    // actions
    fetchList,
    createCategory,
    updateCategory,
    deleteCategory,
    getCategory,
  };
}
