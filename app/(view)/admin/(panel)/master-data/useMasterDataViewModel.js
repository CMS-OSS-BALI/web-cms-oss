"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

/** ===== type registry (tiap kategori → endpoint & adapter) ===== */
const TYPES = {
  blog: {
    key: "blog",
    label: "Kategori Blog",
    // server paginated
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
      fetch(
        `/api/blog-categories/${encodeURIComponent(id)}?locale=id&fallback=id`
      ).then((r) => r.json()),
    create: (name) =>
      fetch("/api/blog-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name_id: name, autoTranslate: true }),
        credentials: "include",
      }),
    update: (id, name) =>
      fetch(`/api/blog-categories/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name_id: name, autoTranslate: true }),
        credentials: "include",
      }),
    remove: (id) =>
      fetch(`/api/blog-categories/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
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
      fetch(
        `/api/event-categories/${encodeURIComponent(id)}?locale=id&fallback=id`
      ).then((r) => r.json()),
    create: (name) =>
      fetch("/api/event-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name_id: name, autoTranslate: true }),
        credentials: "include",
      }),
    update: (id, name) =>
      fetch(`/api/event-categories/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name_id: name, autoTranslate: true }),
        credentials: "include",
      }),
    remove: (id) =>
      fetch(`/api/event-categories/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
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
      fetch(
        `/api/mitra-dalam-negeri-categories/${encodeURIComponent(
          id
        )}?locale=id&fallback=id`
      ).then((r) => r.json()),
    create: (name) =>
      fetch("/api/mitra-dalam-negeri-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name_id: name, autoTranslate: true }),
        credentials: "include",
      }),
    update: (id, name) =>
      fetch(`/api/mitra-dalam-negeri-categories/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name_id: name, autoTranslate: true }),
        credentials: "include",
      }),
    remove: (id) =>
      fetch(`/api/mitra-dalam-negeri-categories/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      }),
  },

  service: {
    key: "service",
    label: "Kategori Layanan",
    // server paginated (limit/page)
    buildListUrl: ({ page, perPage, q }) => {
      const u = new URL("/api/service-categories", window.location.origin);
      u.searchParams.set("page", String(page));
      u.searchParams.set("limit", String(perPage));
      if (q?.trim()) u.searchParams.set("q", q.trim());
      return u.toString();
    },
    normalizeList: (json) => {
      const rows = json?.data || [];
      return {
        total: rows.length, // API tidak kirim total, tapi aman
        totalPages: 1,
        rows: rows.map((r) => ({
          id: r.id,
          name: r.name ?? "-",
          created_at: r.created_at ?? null,
        })),
      };
    },
    getOne: (id) =>
      fetch(`/api/service-categories/${encodeURIComponent(id)}`).then((r) =>
        r.json()
      ),
    create: (name) =>
      fetch("/api/service-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
        credentials: "include",
      }),
    update: (id, name) =>
      fetch(`/api/service-categories/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
        credentials: "include",
      }),
    remove: (id) =>
      fetch(`/api/service-categories/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      }),
  },

  testimonial: {
    key: "testimonial",
    label: "Kategori Testimoni",
    // API list tidak paginated → kita filter + paginate manual
    buildListUrl: () =>
      new URL(
        "/api/testimonial-categories?locale=id",
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
      fetch(
        `/api/testimonial-categories/${encodeURIComponent(id)}?locale=id`
      ).then((r) => r.json()),
    create: (name) =>
      fetch("/api/testimonial-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, locale: "id" }),
        credentials: "include",
      }),
    update: (id, name) =>
      fetch(`/api/testimonial-categories/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, locale: "id" }),
        credentials: "include",
      }),
    remove: (id) =>
      fetch(`/api/testimonial-categories/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      }),
  },
};

const TYPE_OPTIONS = Object.values(TYPES).map(({ key, label }) => ({
  value: key,
  label,
}));

export default function useMasterDataViewModel() {
  // filters/state
  const [type, setType] = useState("blog"); // default: blog categories
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // data
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [opLoading, setOpLoading] = useState(false);

  const current = useMemo(() => TYPES[type], [type]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const url = current.buildListUrl({ page, perPage, q });
      const res = await fetch(url, { credentials: "include" });
      const json = await res.json().catch(() => ({}));
      let { rows, total, totalPages } = current.normalizeList(json);

      // khusus testimonial: filter & paginate manual
      if (current.key === "testimonial") {
        if (q?.trim()) {
          const kw = q.trim().toLowerCase();
          rows = rows.filter((r) => (r.name || "").toLowerCase().includes(kw));
        }
        const start = (page - 1) * perPage;
        const end = start + perPage;
        total = rows.length;
        totalPages = Math.max(1, Math.ceil(total / perPage));
        rows = rows.slice(start, end);
      }

      setRows(rows);
      setTotal(total);
      setTotalPages(totalPages);
    } catch {
      setRows([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [current, page, perPage, q]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // actions
  async function createCategory(name) {
    setOpLoading(true);
    try {
      const res = await current.create(String(name || "").trim());
      if (!res.ok) {
        const info = await res.json().catch(() => null);
        throw new Error(info?.message || "Gagal membuat kategori");
      }
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
      const res = await current.update(id, String(name || "").trim());
      if (!res.ok) {
        const info = await res.json().catch(() => null);
        throw new Error(info?.message || "Gagal menyimpan perubahan");
      }
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
      const res = await current.remove(id);
      if (!res.ok) {
        const info = await res.json().catch(() => null);
        throw new Error(info?.message || "Gagal menghapus");
      }
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
      return {
        ok: true,
        data: { id: d.id, name: d.name ?? d?.slug ?? "-" },
      };
    } catch (e) {
      return { ok: false, error: e?.message || "Gagal memuat detail" };
    }
  }

  // when changing type, reset page & refetch
  function changeType(next) {
    setType(next);
    setPage(1);
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
