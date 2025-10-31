/* app/(view)/admin/events/useEventsViewModel.js */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/** Small helpers */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const toISODate = (y, m, d) =>
  new Date(Date.UTC(y, m - 1, d, 0, 0, 0)).toISOString();

function useEventsViewModel() {
  const router = useRouter();

  // ===== query state =====
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [year, setYear] = useState(null); // e.g. 2025
  const [categoryId, setCategoryId] = useState(null);
  const [showCharts, setShowCharts] = useState(true);

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
  const [chartStudent, setChartStudent] = useState([]); // {id,label,short,value,percent}
  const [chartRep, setChartRep] = useState([]);

  const abortRef = useRef(null);

  const buildQuery = useCallback(() => {
    const p = new URLSearchParams();
    p.set("include_category", "1");
    p.set("perPage", String(perPage));
    p.set("page", String(page));
    if (q) p.set("q", q);
    if (categoryId) p.set("category_id", categoryId);
    if (year) {
      p.set("from", toISODate(year, 1, 1));
      p.set("to", toISODate(year, 12, 31));
    }
    return "/api/events?" + p.toString();
  }, [q, page, perPage, categoryId, year]);

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch(
        "/api/event-categories?perPage=100&sort=sort:asc"
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

  const loadEvents = useCallback(async () => {
    abortRef.current?.abort?.();
    abortRef.current = new AbortController();
    const { signal } = abortRef.current;
    setLoading(true);
    try {
      const res = await fetch(buildQuery(), { signal });
      const js = await res.json();
      const rows = js?.data || [];
      setEvents(rows);
      setTotal(js?.meta?.total || rows.length || 0);
      setTotalPages(js?.meta?.totalPages || 1);

      // dynamic year options
      const years = new Set(
        rows
          .map((r) => {
            const d = r?.start_ts ? new Date(r.start_ts) : null;
            return d ? d.getUTCFullYear?.() || d.getFullYear?.() : null;
          })
          .filter(Boolean)
      );
      const arr = Array.from(years).sort((a, b) => b - a);
      setYearOptions((prev) => {
        const merged = Array.from(new Set([...prev, ...arr])).sort(
          (a, b) => b - a
        );
        return merged.slice(0, 8);
      });

      // metrics derived from events
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

      // charts (rep)
      const top = rows.slice(0, 8);
      const maxRep = Math.max(
        1,
        ...top.map((r) => Number(r?.booth_sold_count || 0))
      );
      setChartRep(
        top.map((r) => {
          const label = r.title || "Event";
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

      // chart students loaded separately (tickets per event)
      await loadStudentCounts(top);
    } catch (e) {
      if (e?.name !== "AbortError") console.error("[Events] load error:", e);
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [buildQuery]);

  const loadTotalStudents = useCallback(async () => {
    setTotalStudentsLoading(true);
    try {
      const res = await fetch("/api/tickets?status=CONFIRMED&perPage=1");
      const js = await res.json();
      setTotalStudents(js?.total ?? null);
    } catch {
      setTotalStudents(null);
    } finally {
      setTotalStudentsLoading(false);
    }
  }, []);

  const loadStudentCounts = useCallback(async (eventRows) => {
    setChartLoading(true);
    try {
      const promises = (eventRows || []).map(async (ev) => {
        const url = `/api/tickets?event_id=${encodeURIComponent(
          ev.id
        )}&status=CONFIRMED&perPage=1`;
        const r = await fetch(url);
        const j = await r.json();
        return { id: ev.id, title: ev.title || "Event", total: j?.total || 0 };
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

  // (optional future) get revenue via payments endpoint — placeholder
  const loadRevenue = useCallback(async () => {
    // If you later expose `/api/admin/metrics?sum=revenue`, compute here.
    // For now, revenue is estimated from events in `loadEvents`.
    return;
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([loadEvents(), loadTotalStudents(), loadRevenue()]);
  }, [loadEvents, loadTotalStudents, loadRevenue]);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, page, perPage, categoryId, year]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

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

  const toggleCharts = useCallback(() => setShowCharts((v) => !v), []);

  /** ===== CSV download ===== */
  const downloadCSV = useCallback(async () => {
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
    const lines = [headers.join(",")];

    for (const r of events) {
      const est =
        Number(r?.booth_sold_count || 0) * Number(r?.booth_price || 0);
      const row = [
        r.id,
        `"${(r.title || "").replace(/"/g, '""')}"`,
        new Date(
          r.start_ts || r.start_at || r.startAt || r.start || Date.now()
        ).toISOString(),
        new Date(
          r.end_ts || r.end_at || r.endAt || r.end || Date.now()
        ).toISOString(),
        `"${(r.location || "").replace(/"/g, '""')}"`,
        `"${(r.category_name || r.category_slug || "").replace(/"/g, '""')}"`,
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
  }, [events]);

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
  };
}

export default useEventsViewModel;
