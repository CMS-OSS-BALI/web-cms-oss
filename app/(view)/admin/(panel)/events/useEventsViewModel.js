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

  /** Build query params for /api/events/summary */
  const buildSummaryParams = useCallback(() => {
    const p = new URLSearchParams();
    if (qDebounced) p.set("q", qDebounced);
    if (categoryId) p.set("category_id", String(categoryId));
    if (year) {
      p.set("from", toISODate(year, 1, 1));
      p.set("to", toISODate(year, 12, 31));
    }
    p.set("limit", "8"); // batas item untuk chart
    p.set("_", String(Date.now()));
    return p;
  }, [qDebounced, categoryId, year]);

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

  // Optional: distinct years endpoint (kalau ada, pakai; kalau tidak ada, tidak masalah)
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

  /** Hitung chart “Student” dari /api/tickets per event (subset/top) */
  const loadStudentCounts = useCallback(async (eventRows) => {
    setChartLoading(true);
    try {
      const promises = (eventRows || []).map(async (ev) => {
        const p = new URLSearchParams();
        p.set("event_id", String(ev.id));
        p.set("status", "CONFIRMED");
        p.set("perPage", "1"); // ringan; ambil total dari response.total
        p.set("_", String(Date.now()));
        const r = await fetch(`/api/tickets?` + p.toString(), {
          cache: "no-store",
        });
        const j = await r.json().catch(() => ({}));
        const total =
          Number(j?.meta?.total) ?? Number(j?.total) ?? Number(j?.count) ?? 0;
        return {
          id: ev.id,
          title: ev.title || ev.title_id || "Event",
          total: Number.isFinite(total) ? total : 0,
        };
      });
      const items = await Promise.all(promises);
      const max = Math.max(1, ...items.map((i) => Number(i.total || 0)));
      setChartStudent(
        items.map((i) => {
          const label = i.title || "Event";
          const short =
            label.length > 10 ? label.slice(0, 9).trim() + "…" : label;
          const v = Number(i.total || 0);
          return {
            id: i.id,
            label,
            short,
            value: v,
            percent: (v / max) * 100,
          };
        })
      );
    } catch (e) {
      console.error("[Events] load student counts err:", e);
      setChartStudent([]);
    } finally {
      setChartLoading(false);
    }
  }, []);

  const loadTotalsAndChartsSmart = useCallback(
    async ({ currentRows }) => {
      setChartLoading(true);
      setTotalStudentsLoading(true);
      try {
        const sp = buildSummaryParams();
        const res = await fetch(`/api/events/summary?${sp.toString()}`, {
          cache: "no-store",
        });

        let usedFallback = false;

        if (res.ok) {
          const j = await res.json().catch(() => ({}));
          const data = j?.data ?? j ?? {};
          const totals = data?.totals ?? {};
          const charts = data?.charts ?? {};

          // totals (langsung dari summary)
          const students = totals.students ?? totals.total_students ?? null;
          const reps = totals.reps ?? totals.total_reps ?? 0;
          const revenue = totals.revenue ?? totals.total_revenue ?? 0;

          setTotalStudents(
            Number.isFinite(Number(students)) ? Number(students) : null
          );
          setTotalReps(Number.isFinite(Number(reps)) ? Number(reps) : 0);
          setTotalRevenue(
            Number.isFinite(Number(revenue)) ? Number(revenue) : 0
          );

          // normalisasi sisi klien
          const studentsRaw =
            charts.student ||
            charts.students ||
            data.student ||
            data.students ||
            [];
          const repsRaw =
            charts.rep || charts.reps || data.rep || data.reps || [];

          const normBars = (arr) => {
            const list = Array.isArray(arr) ? arr : [];
            const max = Math.max(
              1,
              ...list.map((i) => Number(i.value ?? i.count ?? 0))
            );
            return list.slice(0, 8).map((it, idx) => {
              const label = it.label || it.title || it.name || "Event";
              const value = Number(it.value ?? it.count ?? 0) || 0;
              return {
                id: it.id || it.event_id || `${label}-${idx}`,
                label,
                short:
                  label.length > 10 ? label.slice(0, 9).trim() + "…" : label,
                value,
                percent: (value / max) * 100,
              };
            });
          };

          const stuBars = normBars(studentsRaw);
          const repBars = normBars(repsRaw);

          // jika summary 200 tapi kosong → fallback lokal
          if (
            stuBars.length === 0 &&
            repBars.length === 0 &&
            (currentRows || []).length
          ) {
            usedFallback = true;
          } else {
            setChartStudent(stuBars);
            setChartRep(repBars);
          }
        } else {
          usedFallback = true;
        }

        if (usedFallback) {
          const top = (currentRows || []).slice(0, 8);

          // Rep dari booth_sold_count
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

          // Student per event (hitung via /api/tickets)
          await loadStudentCounts(top);

          // Totals fallback
          try {
            const tRes = await fetch(
              `/api/tickets?status=CONFIRMED&perPage=1&_=${Date.now()}`,
              { cache: "no-store" }
            );
            const tJs = await tRes.json().catch(() => ({}));
            const tTotal =
              Number(tJs?.meta?.total) ??
              Number(tJs?.total) ??
              Number(tJs?.count) ??
              null;
            setTotalStudents(
              Number.isFinite(Number(tTotal)) ? Number(tTotal) : null
            );
          } catch {
            setTotalStudents(null);
          }
          const repSum = (currentRows || []).reduce(
            (acc, r) => acc + Number(r?.booth_sold_count || 0),
            0
          );
          setTotalReps(repSum);
          const rev = (currentRows || []).reduce(
            (acc, r) =>
              acc +
              Number(r?.booth_sold_count || 0) *
                Math.max(0, Number(r?.booth_price || 0)),
            0
          );
          setTotalRevenue(rev);
        }
      } catch (e) {
        console.error("[Events] summary load error:", e);
        setChartStudent([]);
        setChartRep([]);
      } finally {
        setChartLoading(false);
        setTotalStudentsLoading(false);
      }
    },
    [buildSummaryParams, loadStudentCounts]
  );

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

      // meta total & totalPages yang benar
      const meta = js?.meta || {};
      setTotal(Number(meta.total ?? js?.total ?? rows.length ?? 0));
      setTotalPages(Number(meta.totalPages ?? js?.totalPages ?? 1));

      // Tahun dari rows (fallback kalau /events/years tidak ada)
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

      // ===== Summary-first charts & metrics =====
      await loadTotalsAndChartsSmart({ currentRows: rows });
    } catch (e) {
      if (e?.name !== "AbortError") console.error("[Events] load error:", e);
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [buildQuery, loadTotalsAndChartsSmart]);

  // (Opsional legacy) Global total students via tickets — tetap disimpan sebagai fallback callable
  const loadTotalStudents = useCallback(async () => {
    setTotalStudentsLoading(true);
    try {
      const res = await fetch(
        "/api/tickets?status=CONFIRMED&perPage=1&_=" + Date.now(),
        { cache: "no-store" }
      );
      const js = await res.json().catch(() => ({}));
      const totalVal =
        Number(js?.meta?.total) ??
        Number(js?.total) ??
        Number(js?.count) ??
        null;
      setTotalStudents(
        Number.isFinite(totalVal) && totalVal >= 0 ? totalVal : null
      );
    } catch {
      setTotalStudents(null);
    } finally {
      setTotalStudentsLoading(false);
    }
  }, []);

  const loadRevenue = useCallback(async () => {
    // (Opsional) Jika nanti ada endpoint agregasi global revenue, isi di sini.
    return;
  }, []);

  const refresh = useCallback(async () => {
    // Summary sudah dipanggil dari loadEvents
    await loadEvents();
  }, [loadEvents]);

  // refetch saat filter berubah
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qDebounced, page, perPage, categoryId, year]);

  // initial lookups
  useEffect(() => {
    loadCategories();
    loadDistinctYears(); // optional; aman bila 404
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
        const js = await res.json().catch(() => ({}));
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

        ensureYearOptionFromFD(fd);
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

        ensureYearOptionFromFD(fd);
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

  /** ===== READ helper buat modal View/Edit (dipakai di EventsContent) ===== */
  const getEvent = useCallback(async (id, { includeCategory = true } = {}) => {
    try {
      const url =
        `/api/events/${id}?` +
        new URLSearchParams({
          include_category: includeCategory ? "1" : "0",
          _: String(Date.now()),
        }).toString();
      const r = await fetch(url, { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok)
        return { ok: false, error: j?.error?.message || "Gagal memuat data" };
      return { ok: true, data: j?.data };
    } catch (e) {
      return { ok: false, error: e?.message || "Gagal memuat data" };
    }
  }, []);

  /** ===== CSV download ===== */
  const downloadCSV = useCallback(async () => {
    try {
      // 1) Coba server-side export (kalau belum ada, otomatis fallback)
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

      // 2) Fallback: generate dari rows saat ini
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
    refetch: loadEvents, // refresh sudah memanggil summary di dalamnya

    // CRUD helpers
    createEvent,
    updateEvent,
    getEvent,
  };
}

export default useEventsViewModel;
