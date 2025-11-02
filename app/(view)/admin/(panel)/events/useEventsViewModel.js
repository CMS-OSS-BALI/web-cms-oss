"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/** Small helpers */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const toISODate = (y, m, d) =>
  new Date(Date.UTC(y, m - 1, d, 0, 0, 0)).toISOString();

const SCANNER_PATH = "/admin/scanner";

function useEventsViewModel() {
  const router = useRouter();

  // ===== query state =====
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [year, setYear] = useState(null);
  const [categoryId, setCategoryId] = useState(null);
  const [showCharts, setShowCharts] = useState(true);

  // Debounce search
  const [qDebounced, setQDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQDebounced((q || "").trim()), 350);
    return () => clearTimeout(t);
  }, [q]);

  // ===== data state =====
  const [loading, setLoading] = useState(false);
  const [opLoading, setOpLoading] = useState(false);
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [categoryOptions, setCategoryOptions] = useState([]);
  const [yearOptions, setYearOptions] = useState([]);

  // metrics
  const [totalStudents, setTotalStudents] = useState(null);
  const [totalStudentsLoading, setTotalStudentsLoading] = useState(false);
  const [totalReps, setTotalReps] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);

  // charts
  const [chartLoading, setChartLoading] = useState(false);
  const [chartStudent, setChartStudent] = useState([]);
  const [chartRep, setChartRep] = useState([]);

  const abortRef = useRef(null);

  /** ===================== Year helpers ===================== */
  const ensureYearOption = useCallback((y) => {
    if (!Number.isFinite(y)) return;
    setYearOptions((prev) => {
      const next = Array.from(new Set([y, ...prev])).sort((a, b) => b - a);
      return next.slice(0, 15);
    });
  }, []);

  const ensureYearOptionFromFD = useCallback(
    (fd) => {
      const sa = fd?.get?.("start_at");
      if (!sa) return;
      const d = new Date(String(sa));
      const y = d.getUTCFullYear?.() ?? d.getFullYear?.();
      if (Number.isFinite(y)) ensureYearOption(y);
    },
    [ensureYearOption]
  );
  /** ======================================================== */

  /** Build query string for server-side filtering & pagination */
  const buildQuery = useCallback(() => {
    const p = new URLSearchParams();
    p.set("include_category", "1");
    p.set("perPage", String(perPage || 10));
    p.set("page", String(page || 1));

    if (qDebounced) p.set("q", qDebounced);
    if (categoryId) p.set("category_id", String(categoryId));
    if (year) {
      p.set("from", toISODate(year, 1, 1));
      p.set("to", toISODate(year, 12, 31));
    }
    p.set("_", String(Date.now()));
    return "/api/events?" + p.toString();
  }, [qDebounced, page, perPage, categoryId, year]);

  /** Load supporting lookups */
  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch(
        "/api/event-categories?perPage=100&sort=sort:asc&_=" + Date.now(),
        { cache: "no-store" }
      );
      const js = await res.json();
      const rows = js?.data || [];
      setCategoryOptions(
        rows.map((r) => ({
          value: r.id,
          label: r.name || r.slug || "Kategori",
        }))
      );
    } catch {
      /* ignore */
    }
  }, []);

  // Optional: distinct years endpoint (jika tersedia)
  const loadDistinctYears = useCallback(async () => {
    try {
      const res = await fetch("/api/events/years?distinct=1&_=" + Date.now(), {
        cache: "no-store",
      });
      if (!res.ok) return;
      const js = await res.json();
      const years = (js?.data || [])
        .filter((y) => Number.isFinite(Number(y)))
        .map(Number);
      if (years?.length) {
        setYearOptions(
          Array.from(new Set(years))
            .sort((a, b) => b - a)
            .slice(0, 15)
        );
      }
    } catch {
      // fallback handled by rows inference
    }
  }, []);

  /** Try aggregated charts endpoint (if your backend provides it) */
  const loadChartsAggregated = useCallback(async () => {
    setChartLoading(true);
    try {
      const p = new URLSearchParams();
      if (qDebounced) p.set("q", qDebounced);
      if (categoryId) p.set("category_id", String(categoryId));
      if (year) {
        p.set("from", toISODate(year, 1, 1));
        p.set("to", toISODate(year, 12, 31));
      }
      p.set("limit", "8");
      p.set("_", String(Date.now()));

      // Example endpoints (ubah sesuai backend kamu)
      const [repRes, stuRes] = await Promise.all([
        fetch(`/api/events/summary/booth?` + p.toString(), {
          cache: "no-store",
        }),
        fetch(`/api/events/summary/students?` + p.toString(), {
          cache: "no-store",
        }),
      ]);

      if (!repRes.ok || !stuRes.ok)
        throw new Error("summary endpoint not available");

      const repJs = await repRes.json();
      const stuJs = await stuRes.json();

      const repItems = (repJs?.data || []).slice(0, 8);
      const maxRep = Math.max(1, ...repItems.map((i) => Number(i.value || 0)));
      setChartRep(
        repItems.map((it) => ({
          id: it.id,
          label: it.label,
          short:
            it.label?.length > 10
              ? it.label.slice(0, 9).trim() + "…"
              : it.label,
          value: Number(it.value || 0),
          percent: (Number(it.value || 0) / maxRep) * 100,
        }))
      );

      const stuItems = (stuJs?.data || []).slice(0, 8);
      const maxStu = Math.max(1, ...stuItems.map((i) => Number(i.value || 0)));
      setChartStudent(
        stuItems.map((it) => ({
          id: it.id,
          label: it.label,
          short:
            it.label?.length > 10
              ? it.label.slice(0, 9).trim() + "…"
              : it.label,
          value: Number(it.value || 0),
          percent: (Number(it.value || 0) / maxStu) * 100,
        }))
      );
    } finally {
      setChartLoading(false);
    }
  }, [qDebounced, categoryId, year]);

  /** Fallback: hitung student chart per event (hanya untuk subset/top) */
  const loadStudentCounts = useCallback(async (eventRows) => {
    setChartLoading(true);
    try {
      const promises = (eventRows || []).map(async (ev) => {
        const p = new URLSearchParams();
        p.set("event_id", String(ev.id));
        p.set("status", "CONFIRMED");
        p.set("perPage", "1");
        p.set("_", String(Date.now()));
        const r = await fetch(`/api/tickets?` + p.toString(), {
          cache: "no-store",
        });
        const j = await r.json();
        return {
          id: ev.id,
          title: ev.title || ev.title_id || "Event",
          total: j?.total || 0,
        };
      });
      const items = await Promise.all(promises);
      const max = Math.max(1, ...items.map((i) => i.total));
      setChartStudent(
        items.map((i) => ({
          id: i.id,
          label: i.title,
          short:
            i.title.length > 10 ? i.title.slice(0, 9).trim() + "…" : i.title,
          value: i.total,
          percent: (i.total / max) * 100,
        }))
      );
    } catch (e) {
      console.error("[Events] load student counts err:", e);
      setChartStudent([]);
    } finally {
      setChartLoading(false);
    }
  }, []);

  /** Core loader — server-side filtering + pagination */
  const loadEvents = useCallback(async () => {
    abortRef.current?.abort?.();
    abortRef.current = new AbortController();
    const { signal } = abortRef.current;
    setLoading(true);
    try {
      const url = buildQuery();
      const res = await fetch(url, { signal, cache: "no-store" });
      const js = await res.json().catch(() => ({}));

      const rows = js?.data || [];
      setEvents(rows);
      setTotal(js?.meta?.total ?? js?.total ?? rows.length ?? 0);
      setTotalPages(js?.meta?.totalPages ?? js?.totalPages ?? 1);

      // derive metrics from current page (or rely on summary endpoint below)
      const reps = rows.reduce(
        (acc, r) => acc + Number(r?.booth_sold_count || 0),
        0
      );
      setTotalReps(reps);
      const revenueEst = rows.reduce(
        (acc, r) =>
          acc +
          Number(r?.booth_sold_count || 0) *
            Math.max(0, Number(r?.booth_price || 0)),
        0
      );
      setTotalRevenue(revenueEst);

      // Infer year options from current page if distinct endpoint unavailable
      const years = new Set(
        rows
          .map((r) => {
            const d = r?.start_ts
              ? new Date(r.start_ts)
              : r?.start_at
              ? new Date(r.start_at)
              : null;
            return d ? d.getUTCFullYear?.() || d.getFullYear?.() : null;
          })
          .filter(Boolean)
      );
      if (years.size) {
        setYearOptions((prev) => {
          const merged = Array.from(
            new Set([...Array.from(years), ...prev])
          ).sort((a, b) => b - a);
          return merged.slice(0, 15);
        });
      }

      // Charts: try aggregated endpoint first (better for big data)
      await loadChartsAggregated().catch(async () => {
        // Fallback: compute from this page only (cheap)
        const top = rows.slice(0, 8);
        const maxRep = Math.max(
          1,
          ...top.map((r) => Number(r?.booth_sold_count || 0))
        );
        setChartRep(
          top.map((r) => {
            const label = r.title || r.title_id || "Event";
            const short =
              label.length > 10 ? label.slice(0, 9).trim() + "…" : label;
            const v = Number(r?.booth_sold_count || 0);
            return {
              id: r.id,
              label,
              short,
              value: v,
              percent: (v / maxRep) * 100,
            };
          })
        );
        await loadStudentCounts(top);
      });
    } catch (e) {
      if (e?.name !== "AbortError") console.error("[Events] load error:", e);
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [buildQuery, loadChartsAggregated, loadStudentCounts]);

  const loadTotalStudents = useCallback(async () => {
    setTotalStudentsLoading(true);
    try {
      // Prefer endpoint count khusus jika tersedia
      // const res = await fetch("/api/tickets/count?status=CONFIRMED&_=" + Date.now(), { cache: "no-store" });
      // const js = await res.json();
      // setTotalStudents(js?.data?.count ?? js?.count ?? null);

      const res = await fetch(
        "/api/tickets?status=CONFIRMED&perPage=1&_=" + Date.now(),
        { cache: "no-store" }
      );
      const js = await res.json();
      setTotalStudents(js?.total ?? null);
    } catch {
      setTotalStudents(null);
    } finally {
      setTotalStudentsLoading(false);
    }
  }, []);

  const loadRevenue = useCallback(async () => {
    // Opsional: sediakan endpoint agregasi total revenue global
    return;
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([loadEvents(), loadTotalStudents(), loadRevenue()]);
  }, [loadEvents, loadTotalStudents, loadRevenue]);

  // refetch saat filter berubah (server akan handle pagination & filter)
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qDebounced, page, perPage, categoryId, year]);

  // initial lookups
  useEffect(() => {
    loadCategories();
    loadDistinctYears(); // opsional, enrich dropdown tahun
  }, [loadCategories, loadDistinctYears]);

  // Revalidate on focus/visibility
  useEffect(() => {
    const onFocus = () => refresh();
    const onVis = () => {
      if (!document.hidden) refresh();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [refresh]);

  /** ===== actions ===== */
  const deleteEvent = useCallback(
    async (id) => {
      setOpLoading(true);
      try {
        const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
        const js = await res.json();
        if (!res.ok) return { ok: false, error: js?.error?.message || "Gagal" };
        await sleep(250);
        await loadEvents();
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e?.message || "Gagal" };
      } finally {
        setOpLoading(false);
      }
    },
    [loadEvents]
  );

  const goCreate = useCallback(() => {
    router.push("/admin/events/new");
  }, [router]);

  const goEdit = useCallback(
    (id) => {
      router.push(`/admin/events/${id}/edit`);
    },
    [router]
  );

  const goScanner = useCallback(() => {
    router.push(SCANNER_PATH);
  }, [router]);

  const toggleCharts = useCallback(() => setShowCharts((v) => !v), []);

  /** ===== CREATE & UPDATE helper ===== */
  const createEvent = useCallback(
    async (fd) => {
      setOpLoading(true);
      try {
        const r = await fetch("/api/events?_=" + Date.now(), {
          method: "POST",
          body: fd,
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok)
          return {
            ok: false,
            error: j?.error?.message || "Gagal membuat event",
          };

        ensureYearOptionFromFD(fd); // inject tahun baru bila perlu
        await refresh();
        return { ok: true, data: j?.data };
      } catch (e) {
        return { ok: false, error: e?.message || "Gagal membuat event" };
      } finally {
        setOpLoading(false);
      }
    },
    [refresh, ensureYearOptionFromFD]
  );

  const updateEvent = useCallback(
    async (id, fd) => {
      setOpLoading(true);
      try {
        const r = await fetch(`/api/events/${id}?_=${Date.now()}`, {
          method: "PATCH",
          body: fd,
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok)
          return {
            ok: false,
            error: j?.error?.message || "Gagal memperbarui event",
          };

        ensureYearOptionFromFD(fd); // update tahun filter jika berubah
        await refresh();
        return { ok: true, data: j?.data };
      } catch (e) {
        return { ok: false, error: e?.message || "Gagal memperbarui event" };
      } finally {
        setOpLoading(false);
      }
    },
    [refresh, ensureYearOptionFromFD]
  );

  /** ===== CSV download ===== */
  const downloadCSV = useCallback(async () => {
    try {
      // 1) Coba server-side export
      const p = new URLSearchParams();
      p.set("perPage", String(perPage || 10));
      p.set("page", String(page || 1));
      if (qDebounced) p.set("q", qDebounced);
      if (categoryId) p.set("category_id", String(categoryId));
      if (year) {
        p.set("from", toISODate(year, 1, 1));
        p.set("to", toISODate(year, 12, 31));
      }
      p.set("format", "csv");
      p.set("_", String(Date.now()));

      const resp = await fetch("/api/events/export?" + p.toString(), {
        cache: "no-store",
      });

      if (resp.ok) {
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `events-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }

      // 2) Fallback: generate dari rows saat ini (terbatas pada page aktif)
      const headers = [
        "Event ID",
        "Judul",
        "Mulai",
        "Selesai",
        "Lokasi",
        "Kategori",
        "Capacity",
        "Sold Ticket (calc)",
        "Booth Price",
        "Booth Sold",
        "Booth Quota",
        "Est. Revenue (Rp)",
      ];
      const esc = (s) =>
        `"${String(s ?? "")
          .replace(/"/g, '""')
          .replace(/\r?\n/g, " ")}"`;
      const lines = [headers.join(",")];

      for (const r of events) {
        const est =
          Number(r?.booth_sold_count || 0) * Number(r?.booth_price || 0);
        const startISO = new Date(
          r.start_ts || r.start_at || r.startAt || r.start || Date.now()
        ).toISOString();
        const endISO = new Date(
          r.end_ts || r.end_at || r.endAt || r.end || Date.now()
        ).toISOString();

        const row = [
          r.id,
          esc(r.title || r.title_id || ""),
          startISO,
          endISO,
          esc(r.location || ""),
          esc(r.category_name || r.category_slug || ""),
          r.capacity ?? "",
          r.sold ?? "",
          r.booth_price ?? "",
          r.booth_sold_count ?? "",
          r.booth_quota ?? "",
          est,
        ];
        lines.push(row.join(","));
      }

      const blob = new Blob([lines.join("\n")], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `events-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("downloadCSV error:", e);
      throw e;
    }
  }, [events, page, perPage, qDebounced, categoryId, year]);

  /** ===== expose ===== */
  return {
    // query
    q,
    setQ,
    page,
    setPage,
    perPage,
    setPerPage,
    year,
    setYear,
    yearOptions,
    categoryId,
    setCategoryId,
    categoryOptions,

    // data
    loading,
    opLoading,
    events,
    total,
    totalPages,

    // metrics
    totalStudents,
    totalStudentsLoading,
    totalReps,
    totalRevenue,

    // charts
    showCharts,
    chartLoading,
    chartStudent,
    chartRep,
    toggleCharts,

    // actions
    downloadCSV,
    deleteEvent,
    goCreate,
    goEdit,
    goScanner,
    refetch: refresh,

    // CRUD helpers
    createEvent,
    updateEvent,
  };
}

export default useEventsViewModel;
