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

const otherLocale = (loc) => (loc === "en" ? "id" : "en");

/** Generate kode jenjang berdasarkan nama (UPPER_SNAKE, max 32 char) */
const makeJenjangCode = (name) => {
  const raw = String(name || "")
    .trim()
    .toUpperCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // remove accent
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32);

  if (raw) return raw;
  // fallback kalau nama kosong
  return `JENJANG_${Date.now().toString(36).toUpperCase()}`;
};

/* ---------- type registry ---------- */
const TYPES = {
  blog: {
    key: "blog",
    label: "Kategori Blog",
    buildListUrl: ({ page, perPage, q /*, locale*/ }) => {
      const u = new URL("/api/blog-categories", window.location.origin);
      u.searchParams.set("page", String(page));
      u.searchParams.set("perPage", String(perPage));
      u.searchParams.set("sort", "created_at:desc");
      // endpoint lama: tetap pakai ID
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
    getOne: (id /*, opt */) =>
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
    buildListUrl: ({ page, perPage, q /*, locale*/ }) => {
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
    getOne: (id /*, opt */) =>
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

  /* ======= BARU: jenjang master ======= */
  jenjang: {
    key: "jenjang",
    label: "Kategori Jenjang",
    buildListUrl: ({ page, perPage, q, locale, withDeleted, onlyDeleted }) => {
      const u = new URL("/api/jenjang-master", window.location.origin);
      u.searchParams.set("page", String(page));
      u.searchParams.set("perPage", String(perPage));
      // default sort by sort ascending
      u.searchParams.set("sort", "sort:asc");

      const loc = (locale || "id").slice(0, 2).toLowerCase();
      u.searchParams.set("locale", loc);
      u.searchParams.set("fallback", otherLocale(loc));

      // mapping soft-delete flag ke inactive di backend
      if (withDeleted) u.searchParams.set("with_inactive", "1");
      if (onlyDeleted) u.searchParams.set("only_inactive", "1");

      if (q?.trim()) u.searchParams.set("q", q.trim());
      return u.toString();
    },
    normalizeList: (json) => ({
      total: Number(json?.meta?.total || 0),
      totalPages: Number(json?.meta?.totalPages || 1),
      rows: (json?.data || []).map((r) => ({
        id: r.id,
        name: r.name ?? "-", // dari projector: t.name atau master.name
        created_at: r.created_at ?? null,
      })),
    }),
    getOne: (id, { locale } = {}) => {
      const loc = (locale || "id").slice(0, 2).toLowerCase();
      return jsonFetcher(
        `/api/jenjang-master/${encodeURIComponent(
          id
        )}?locale=${encodeURIComponent(loc)}&fallback=${encodeURIComponent(
          otherLocale(loc)
        )}`
      );
    },
    create: (name) => {
      const nm = String(name || "").trim();
      const code = makeJenjangCode(nm);
      return jsonFetcher("/api/jenjang-master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code, // penting: endpoint butuh code
          name_id: nm,
          autoTranslate: true, // ID -> EN otomatis
        }),
      });
    },
    update: (id, name) => {
      const nm = String(name || "").trim();
      return jsonFetcher(`/api/jenjang-master/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name_id: nm,
          autoTranslate: true, // sinkron EN dari ID
        }),
      });
    },
    remove: (id) =>
      jsonFetcher(`/api/jenjang-master/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
  },

  /* ======= ADJUSTED: mitra uses new locale/fallback + soft-delete flags ======= */
  mitra: {
    key: "mitra",
    label: "Kategori Mitra",
    buildListUrl: ({ page, perPage, q, locale, withDeleted, onlyDeleted }) => {
      const u = new URL(
        "/api/mitra-dalam-negeri-categories",
        window.location.origin
      );
      u.searchParams.set("page", String(page));
      u.searchParams.set("perPage", String(perPage));
      u.searchParams.set("sort", "created_at:desc");
      const loc = (locale || "id").slice(0, 2).toLowerCase();
      u.searchParams.set("locale", loc);
      u.searchParams.set("fallback", otherLocale(loc));
      if (withDeleted) u.searchParams.set("with_deleted", "1");
      if (onlyDeleted) u.searchParams.set("only_deleted", "1");
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
    getOne: (id, { locale } = {}) => {
      const loc = (locale || "id").slice(0, 2).toLowerCase();
      return jsonFetcher(
        `/api/mitra-dalam-negeri-categories/${encodeURIComponent(
          id
        )}?locale=${encodeURIComponent(loc)}&fallback=${encodeURIComponent(
          otherLocale(loc)
        )}`
      );
    },
    create: (name) =>
      jsonFetcher("/api/mitra-dalam-negeri-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name_id: String(name || ""),
          autoTranslate: true, // ID -> EN otomatis (lihat endpoint)
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
            autoTranslate: true, // sinkron EN dari ID
          }),
        }
      ),
    remove: (id) =>
      jsonFetcher(
        `/api/mitra-dalam-negeri-categories/${encodeURIComponent(id)}`,
        {
          method: "DELETE", // soft delete di server
        }
      ),
  },

  service: {
    key: "service",
    label: "Kategori Layanan",
    buildListUrl: ({ page, perPage, q /*, locale*/ }) => {
      const u = new URL("/api/service-categories", window.location.origin);
      u.searchParams.set("page", String(page));
      u.searchParams.set("limit", String(perPage));
      if (q?.trim()) u.searchParams.set("q", q.trim());
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
    getOne: (id /*, opt */) =>
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
    getOne: (id /*, opt */) =>
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

  // locale untuk endpoint yang mendukung (mitra, jenjang)
  const [locale, setLocale] = useState("id");

  // dukungan soft-delete flags (mitra) / inactive flags (jenjang)
  const [withDeleted, setWithDeleted] = useState(false);
  const [onlyDeleted, setOnlyDeleted] = useState(false);

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
      const url = current.buildListUrl({
        page,
        perPage,
        q,
        locale,
        withDeleted,
        onlyDeleted,
      });
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
  }, [current, page, perPage, q, locale, withDeleted, onlyDeleted]);

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
      const json = await current.getOne(id, { locale });
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
    // perPage tetap
  }

  // ketika onlyDeleted aktif, matikan withDeleted agar konsisten
  useEffect(() => {
    if (onlyDeleted && withDeleted) setWithDeleted(false);
  }, [onlyDeleted, withDeleted]);

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

    withDeleted,
    setWithDeleted,
    onlyDeleted,
    setOnlyDeleted,

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
