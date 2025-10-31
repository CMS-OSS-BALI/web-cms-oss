"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_SORT = "created_at:desc";
const DEFAULT_LOCALE = "id";
const fallbackFor = (loc) => (String(loc).toLowerCase() === "id" ? "en" : "id");

function buildKey({
  page,
  perPage,
  q,
  sort,
  locale,
  fallback,
  status,
  categoryId,
}) {
  const params = new URLSearchParams();
  params.set("page", String(page || 1));
  params.set("perPage", String(perPage || 10));
  params.set("sort", sort || DEFAULT_SORT);
  params.set("locale", locale || DEFAULT_LOCALE);
  params.set("fallback", fallback || fallbackFor(locale || DEFAULT_LOCALE));
  if (q && q.trim()) params.set("q", q.trim());
  if (status && String(status).trim())
    params.set("status", String(status).trim().toUpperCase());
  if (categoryId && String(categoryId).trim())
    params.set("category_id", String(categoryId).trim());
  return `/api/mitra-dalam-negeri?${params.toString()}`;
}

/** CSV safe wrap */
const csvSafe = (v) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export default function useMerchantsViewModel() {
  // list state
  const [merchants, setMerchants] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // filters & paging
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [locale, setLocale] = useState(DEFAULT_LOCALE);

  // loading
  const [loading, setLoading] = useState(false);
  const [opLoading, setOpLoading] = useState(false);

  // cancelable fetch
  const listAbort = useRef(null);
  const countAbort = useRef(null);
  const catAbort = useRef(null);

  // category options (remote)
  const [categoryOptions, _setCategoryOptions] = useState([]);
  const setCategoryOptions = (fnOrArr) =>
    _setCategoryOptions((prev) =>
      typeof fnOrArr === "function" ? fnOrArr(prev) : fnOrArr
    );

  // status summary
  const [statusCounts, setStatusCounts] = useState({
    pending: null,
    approved: null,
    declined: null,
  });

  const reload = useCallback(async () => {
    setLoading(true);
    listAbort.current?.abort?.();
    const ac = new AbortController();
    listAbort.current = ac;
    try {
      const url = buildKey({
        page,
        perPage,
        q,
        sort: DEFAULT_SORT,
        locale,
        fallback: fallbackFor(locale),
        status,
        categoryId,
      });
      const res = await fetch(url, { cache: "no-store", signal: ac.signal });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error?.message || "Load failed");

      const rows = json?.data || [];
      const meta = json?.meta || {};
      setMerchants(rows);
      setTotal(meta.total ?? rows.length ?? 0);
      setTotalPages(meta.totalPages ?? 1);
    } catch (e) {
      if (e?.name !== "AbortError") {
        setMerchants([]);
        setTotal(0);
        setTotalPages(1);
      }
    } finally {
      setLoading(false);
    }
  }, [page, perPage, q, status, categoryId, locale]);

  useEffect(() => {
    reload();
    return () => {
      listAbort.current?.abort?.();
    };
  }, [reload]);

  // fetch total per status (global)
  const fetchCountByStatus = useCallback(
    async (st, signal) => {
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("perPage", "1");
      params.set("sort", DEFAULT_SORT);
      params.set("locale", locale);
      params.set("fallback", fallbackFor(locale));
      params.set("status", st);
      const res = await fetch(`/api/mitra-dalam-negeri?${params.toString()}`, {
        cache: "no-store",
        signal,
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error?.message || "Failed");
      return j?.meta?.total ?? 0;
    },
    [locale]
  );

  const refreshStatusCounts = useCallback(async () => {
    countAbort.current?.abort?.();
    const ac = new AbortController();
    countAbort.current = ac;
    try {
      const [p, a, d] = await Promise.all([
        fetchCountByStatus("PENDING", ac.signal),
        fetchCountByStatus("APPROVED", ac.signal),
        fetchCountByStatus("DECLINED", ac.signal),
      ]);
      setStatusCounts({ pending: p, approved: a, declined: d });
    } catch (e) {
      if (e?.name !== "AbortError") {
        setStatusCounts({ pending: null, approved: null, declined: null });
      }
    }
  }, [fetchCountByStatus]);

  useEffect(() => {
    refreshStatusCounts();
    return () => {
      countAbort.current?.abort?.();
    };
  }, [refreshStatusCounts]);

  /* ===== detail ===== */
  const getMerchant = useCallback(
    async (id) => {
      try {
        const url = `/api/mitra-dalam-negeri/${id}?locale=${locale}&fallback=${fallbackFor(
          locale
        )}`;
        const res = await fetch(url, { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok)
          return {
            ok: false,
            error: json?.error?.message || "Load detail failed",
          };
        return { ok: true, data: json?.data };
      } catch (e) {
        return { ok: false, error: e?.message || "Load detail failed" };
      }
    },
    [locale]
  );

  /* ===== update ===== */
  const updateMerchant = useCallback(
    async (id, payload) => {
      setOpLoading(true);
      try {
        let body;
        if (payload instanceof FormData) {
          body = payload;
        } else {
          const fd = new FormData();
          if (payload.file) {
            fd.set("image", payload.file);
            delete payload.file;
          }
          if (Array.isArray(payload.attachments_new)) {
            payload.attachments_new.forEach((f) => fd.append("attachments", f));
            delete payload.attachments_new;
          }
          if (Array.isArray(payload.attachments_to_delete)) {
            payload.attachments_to_delete.forEach((id) =>
              fd.append("attachments_to_delete", id)
            );
            delete payload.attachments_to_delete;
          }
          Object.entries(payload || {}).forEach(([k, v]) => {
            if (v !== undefined && v !== null) fd.set(k, String(v));
          });
          fd.set("locale", locale);
          body = fd;
        }
        const res = await fetch(`/api/mitra-dalam-negeri/${id}`, {
          method: "PATCH",
          body,
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok)
          return { ok: false, error: j?.error?.message || "Gagal menyimpan" };

        await Promise.all([reload(), refreshStatusCounts()]);
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e?.message || "Gagal menyimpan" };
      } finally {
        setOpLoading(false);
      }
    },
    [locale, reload, refreshStatusCounts]
  );

  const deleteMerchant = useCallback(
    async (id) => {
      setOpLoading(true);
      try {
        const res = await fetch(`/api/mitra-dalam-negeri/${id}`, {
          method: "DELETE",
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok)
          return { ok: false, error: j?.error?.message || "Gagal menghapus" };

        await Promise.all([reload(), refreshStatusCounts()]);
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e?.message || "Gagal menghapus" };
      } finally {
        setOpLoading(false);
      }
    },
    [reload, refreshStatusCounts]
  );

  /* ===== kategori options ===== */
  const fetchCategoryOptions = useCallback(
    async (kw = "") => {
      catAbort.current?.abort?.();
      const ac = new AbortController();
      catAbort.current = ac;
      try {
        const params = new URLSearchParams();
        params.set("page", "1");
        params.set("perPage", "30");
        params.set("locale", locale);
        params.set("fallback", fallbackFor(locale));
        if (kw && kw.trim()) params.set("q", kw.trim());
        const res = await fetch(
          `/api/mitra-dalam-negeri-categories?${params.toString()}`,
          { cache: "no-store", signal: ac.signal }
        );
        const json = await res.json().catch(() => ({}));
        const rows = json?.data || [];
        setCategoryOptions(
          rows.map((r) => ({
            value: r.id,
            label: r.name || r.slug || "(no name)",
          }))
        );
      } catch (e) {
        if (e?.name !== "AbortError") setCategoryOptions([]);
      }
    },
    [locale]
  );

  /* ===== CSV ===== */
  const exportCSV = useCallback(async () => {
    try {
      // discover total first
      const headUrl = buildKey({
        page: 1,
        perPage: 1,
        q,
        sort: DEFAULT_SORT,
        locale,
        fallback: fallbackFor(locale),
        status,
        categoryId,
      });
      const head = await fetch(headUrl, { cache: "no-store" }).then((r) =>
        r.json()
      );
      const total = head?.meta?.total ?? 0;

      if (!total) {
        const headers = [
          "id",
          "merchant_name",
          "status",
          "category",
          "email",
          "phone",
          "website",
          "city",
          "province",
          "created_at",
        ].join(",");
        return new Blob([headers], { type: "text/csv;charset=utf-8" });
      }

      const per = 100;
      const pages = Math.max(1, Math.ceil(total / per));
      const all = [];
      for (let p = 1; p <= pages; p += 1) {
        const url = buildKey({
          page: p,
          perPage: per,
          q,
          sort: DEFAULT_SORT,
          locale,
          fallback: fallbackFor(locale),
          status,
          categoryId,
        });
        const { data } = await fetch(url, { cache: "no-store" }).then((r) =>
          r.json()
        );
        all.push(...(data || []));
      }

      const headers = [
        "id",
        "merchant_name",
        "status",
        "category",
        "email",
        "phone",
        "website",
        "city",
        "province",
        "created_at",
      ];
      const rows = all.map((r) => [
        r.id,
        csvSafe(r.merchant_name),
        csvSafe(r.status),
        csvSafe(r?.category?.name || ""),
        csvSafe(r.email || ""),
        csvSafe(r.phone || ""),
        csvSafe(r.website || ""),
        csvSafe(r.city || ""),
        csvSafe(r.province || ""),
        r.created_at ? new Date(r.created_at).toISOString() : "",
      ]);
      const lines = [headers.join(","), ...rows.map((a) => a.join(","))].join(
        "\n"
      );
      return new Blob([lines], { type: "text/csv;charset=utf-8" });
    } catch (e) {
      console.error("exportCSV error:", e);
      return null;
    }
  }, [q, locale, status, categoryId]);

  return {
    merchants,
    total,
    totalPages,
    page,
    perPage,
    loading,
    opLoading,
    q,
    status,
    categoryId,
    locale,
    setQ,
    setStatus,
    setCategoryId,
    setLocale,
    setPage,
    setPerPage,
    categoryOptions,
    fetchCategoryOptions,
    setCategoryOptions,
    getMerchant,
    updateMerchant,
    deleteMerchant,
    statusCounts,
    exportCSV,
  };
}
