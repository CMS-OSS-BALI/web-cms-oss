"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ConfigProvider,
  Button,
  Modal,
  Form,
  Input,
  Upload,
  Empty,
  Skeleton,
  Popconfirm,
  Tooltip,
  Spin,
  Select,
  notification,
} from "antd";
import {
  PlusCircleOutlined,
  EyeOutlined,
  DeleteOutlined,
  EditOutlined,
  LeftOutlined,
  RightOutlined,
  SearchOutlined,
} from "@ant-design/icons";

/* ===================== Constants ===================== */
const DEFAULT_SORT = "created_at:desc";
const DEFAULT_LOCALE = "id";
const fallbackFor = (loc) =>
  String(loc || "").toLowerCase() === "id" ? "en" : "id";

/* ===================== Utils ===================== */
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

/** Normalisasi struktur counts dari berbagai bentuk respons */
function normalizeCounts(obj) {
  if (!obj) return null;

  const src =
    obj?.meta?.counts ||
    obj?.data?.counts ||
    obj?.summary ||
    obj?.counts ||
    obj?.data ||
    obj;

  if (!src || typeof src !== "object") return null;

  const lower = {};
  for (const [k, v] of Object.entries(src)) {
    lower[String(k).toLowerCase()] = Number(v);
  }

  const pending =
    lower.pending ??
    lower.awaiting ??
    (Number.isFinite(lower["pending"]) ? lower["pending"] : undefined);

  const approved =
    lower.approved ??
    lower.accepted ??
    (Number.isFinite(lower["approved"]) ? lower["approved"] : undefined);

  const declined =
    lower.declined ??
    lower.rejected ??
    (Number.isFinite(lower["declined"]) ? lower["declined"] : undefined);

  const anyDefined = [pending, approved, declined].some((x) =>
    Number.isFinite(x)
  );

  return anyDefined
    ? {
        pending: Number.isFinite(pending) ? pending : null,
        approved: Number.isFinite(approved) ? approved : null,
        declined: Number.isFinite(declined) ? declined : null,
      }
    : null;
}

export default function useMerchantsViewModel() {
  /* ========== list state ========== */
  const [merchants, setMerchants] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  /* ========== filters & paging ========== */
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [locale, setLocale] = useState(DEFAULT_LOCALE);

  /* ========== loading flags ========== */
  const [loading, setLoading] = useState(false);
  const [opLoading, setOpLoading] = useState(false);

  /* ========== abort controllers ========== */
  const listAbort = useRef(null);
  const countAbort = useRef(null);
  const catAbort = useRef(null);

  /* ========== category options (remote) ========== */
  const [categoryOptions, _setCategoryOptions] = useState([]);
  const setCategoryOptions = (fnOrArr) =>
    _setCategoryOptions((prev) =>
      typeof fnOrArr === "function" ? fnOrArr(prev) : fnOrArr
    );

  /* ========== status summary (single-call first) ========== */
  const [statusCounts, setStatusCounts] = useState({
    pending: null,
    approved: null,
    declined: null,
  });

  /** Panggil endpoint summary (1x request) */
  const fetchSummaryOnce = useCallback(async (signal) => {
    const res = await fetch(`/api/mitra-dalam-negeri/summary`, {
      cache: "no-store",
      signal,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json?.error?.message || "Failed summary");
    }
    const counts = normalizeCounts(json);
    if (!counts) throw new Error("Summary missing counts");
    return counts;
  }, []);

  /** Fallback lama: 3 panggilan (PENDING/APPROVED/DECLINED) */
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
      if (!res.ok) throw new Error(j?.error?.message || "Failed count");
      return j?.meta?.total ?? 0;
    },
    [locale]
  );

  /** Refresh summary */
  const refreshStatusCounts = useCallback(async () => {
    countAbort.current?.abort?.();
    const ac = new AbortController();
    countAbort.current = ac;

    try {
      const counts = await fetchSummaryOnce(ac.signal);
      setStatusCounts(counts);
      return;
    } catch {}

    try {
      const url = buildKey({
        page: 1,
        perPage: 1,
        q: "",
        sort: DEFAULT_SORT,
        locale,
        fallback: fallbackFor(locale),
        status: "",
        categoryId: "",
      });
      const probe = await fetch(url, { cache: "no-store", signal: ac.signal });
      const probeJson = await probe.json().catch(() => ({}));
      const maybe = normalizeCounts(probeJson);
      if (maybe) {
        setStatusCounts(maybe);
        return;
      }
    } catch {}

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
  }, [locale, fetchSummaryOnce, fetchCountByStatus]);

  /* ========== reload list (mendukung override page/perPage) ========== */
  const reload = useCallback(
    async (opts = {}) => {
      const effPage = opts.page ?? page;
      const effPerPage = opts.perPage ?? perPage;

      setLoading(true);
      listAbort.current?.abort?.();
      const ac = new AbortController();
      listAbort.current = ac;

      try {
        const url = buildKey({
          page: effPage,
          perPage: effPerPage,
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
        const nextTotal = meta.total ?? rows.length ?? 0;

        const defaultPages = Math.ceil(nextTotal / (effPerPage || 10)) || 1;
        const nextTotalPages = Math.max(1, meta.totalPages ?? defaultPages);

        setMerchants(rows);
        setTotal(nextTotal);
        setTotalPages(nextTotalPages);

        const maybeCounts = normalizeCounts(json);
        if (maybeCounts) {
          setStatusCounts((prev) => ({ ...prev, ...maybeCounts }));
        }

        if (effPage > nextTotalPages) {
          setPage(nextTotalPages);
        }
      } catch (e) {
        if (e?.name !== "AbortError") {
          setMerchants([]);
          setTotal(0);
          setTotalPages(1);
        }
      } finally {
        setLoading(false);
      }
    },
    [page, perPage, q, status, categoryId, locale]
  );

  useEffect(() => {
    reload();
    return () => {
      listAbort.current?.abort?.();
    };
  }, [reload]);

  useEffect(() => {
    refreshStatusCounts();
    return () => {
      countAbort.current?.abort?.();
    };
  }, [refreshStatusCounts]);

  /* ========== detail / update / delete ========== */
  const getMerchant = useCallback(
    async (id) => {
      try {
        const url = `/api/mitra-dalam-negeri/${id}?locale=${locale}&fallback=${fallbackFor(
          locale
        )}`;
        const res = await fetch(url, { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          return {
            ok: false,
            error: json?.error?.message || "Load detail failed",
          };
        }
        return { ok: true, data: json?.data };
      } catch (e) {
        return { ok: false, error: e?.message || "Load detail failed" };
      }
    },
    [locale]
  );

  const updateMerchant = useCallback(
    async (id, payload) => {
      setOpLoading(true);
      try {
        let body;
        if (payload instanceof FormData) {
          body = payload;
        } else {
          const fd = new FormData();

          const file = payload?.file;
          if (file) fd.set("image", file);

          const attachmentsNew = Array.isArray(payload?.attachments_new)
            ? payload.attachments_new
            : [];
          attachmentsNew.forEach((f) => fd.append("attachments", f));

          const attachmentsToDelete = Array.isArray(
            payload?.attachments_to_delete
          )
            ? payload.attachments_to_delete
            : [];
          attachmentsToDelete.forEach((x) =>
            fd.append("attachments_to_delete", String(x))
          );

          const SKIP = new Set([
            "file",
            "attachments_new",
            "attachments_to_delete",
          ]);
          Object.entries(payload || {}).forEach(([k, v]) => {
            if (SKIP.has(k)) return;
            if (v === undefined || v === null) return;
            if (typeof v === "boolean") {
              fd.set(k, v ? "true" : "false");
            } else {
              fd.set(k, String(v));
            }
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

        const newTotal = Math.max(0, (total || 0) - 1);
        const nextTotalPages = Math.max(
          1,
          Math.ceil(newTotal / Math.max(1, perPage))
        );
        const targetPage = Math.min(page, nextTotalPages);
        if (targetPage !== page) setPage(targetPage);

        await Promise.all([
          reload({ page: targetPage }),
          refreshStatusCounts(),
        ]);

        return { ok: true };
      } catch (e) {
        return { ok: false, error: e?.message || "Gagal menghapus" };
      } finally {
        setOpLoading(false);
      }
    },
    [page, perPage, total, reload, refreshStatusCounts]
  );

  /* ========== kategori options (remote) ========== */
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
          {
            cache: "no-store",
            signal: ac.signal,
          }
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

  /* ========== CSV export (include NIK) ========== */
  const exportCSV = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set("format", "csv");
      params.set("locale", locale);
      params.set("fallback", fallbackFor(locale));
      if (q && q.trim()) params.set("q", q.trim());
      if (status && String(status).trim())
        params.set("status", String(status).trim().toUpperCase());
      if (categoryId && String(categoryId).trim())
        params.set("category_id", String(categoryId).trim());

      const resp = await fetch(
        `/api/mitra-dalam-negeri/export?${params.toString()}`,
        { cache: "no-store" }
      );

      if (resp.ok) {
        const ct = (resp.headers.get("content-type") || "").toLowerCase();
        if (ct.includes("text/csv") || ct.includes("octet-stream")) {
          return await resp.blob();
        }
      }
    } catch {}

    try {
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
      const allTotal = head?.meta?.total ?? 0;

      const HEADERS = [
        "id",
        "merchant_name",
        "status",
        "category",
        "email",
        "phone",
        "nik",
        "website",
        "city",
        "province",
        "created_at",
      ];

      if (!allTotal) {
        return new Blob([HEADERS.join(",")], {
          type: "text/csv;charset=utf-8",
        });
      }

      const PER = 250;
      const pages = Math.max(1, Math.ceil(allTotal / PER));

      const MAX_CONCURRENCY =
        typeof navigator !== "undefined" && navigator.hardwareConcurrency
          ? Math.min(
              8,
              Math.max(2, Math.floor(navigator.hardwareConcurrency / 2))
            )
          : 6;

      const fetchPage = async (p) => {
        const url = buildKey({
          page: p,
          perPage: PER,
          q,
          sort: DEFAULT_SORT,
          locale,
          fallback: fallbackFor(locale),
          status,
          categoryId,
        });
        const json = await fetch(url, { cache: "no-store" }).then((r) =>
          r.json()
        );
        return Array.isArray(json?.data) ? json.data : [];
      };

      const pageChunks = new Array(pages);

      const rowsToCsvLines = (rows) =>
        rows
          .map((r) =>
            [
              r.id,
              csvSafe(r.merchant_name),
              csvSafe(r.status),
              csvSafe(r?.category?.name || ""),
              csvSafe(r.email || ""),
              csvSafe(r.phone || ""),
              csvSafe(r.nik || ""),
              csvSafe(r.website || ""),
              csvSafe(r.city || ""),
              csvSafe(r.province || ""),
              r.created_at ? new Date(r.created_at).toISOString() : "",
            ].join(",")
          )
          .join("\n");

      let cursor = 1;
      const worker = async () => {
        while (true) {
          const myPage = cursor;
          cursor += 1;
          if (myPage > pages) break;

          const rows = await fetchPage(myPage);
          pageChunks[myPage - 1] = rowsToCsvLines(rows);
          await new Promise((r) => setTimeout(r, 0));
        }
      };

      const workers = Array.from({ length: MAX_CONCURRENCY }, () => worker());
      await Promise.all(workers);

      const parts = [];
      parts.push(HEADERS.join(","), "\n");
      for (let i = 0; i < pageChunks.length; i += 1) {
        if (pageChunks[i]) {
          parts.push(pageChunks[i]);
          if (i !== pageChunks.length - 1) parts.push("\n");
        }
      }

      return new Blob(parts, { type: "text/csv;charset=utf-8" });
    } catch (e) {
      console.error("exportCSV error:", e);
      return null;
    }
  }, [q, locale, status, categoryId]);

  return {
    // data
    merchants,
    total,
    totalPages,

    // paging & filters
    page,
    perPage,
    q,
    status,
    categoryId,
    locale,

    // setters
    setQ,
    setStatus,
    setCategoryId,
    setLocale,
    setPage,
    setPerPage,

    // loading
    loading,
    opLoading,

    // category
    categoryOptions,
    fetchCategoryOptions,
    setCategoryOptions,

    // ops
    getMerchant,
    updateMerchant,
    deleteMerchant,

    // summary counts & list reload
    statusCounts,
    reload,
    refreshStatusCounts,

    // export
    exportCSV,
  };
}
