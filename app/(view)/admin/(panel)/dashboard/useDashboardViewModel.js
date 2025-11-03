// app/(view)/admin/(panel)/dashboard/useDashboardViewModel.js
"use client";
import { useEffect, useMemo, useState } from "react";

/* ========================
   Helpers kecil
======================== */
function safeJSON(res) {
  return res.json().catch(() => ({}));
}

/** Ambil ringkasan (server agregasi) */
async function fetchLeadsSummary(year) {
  if (year == null)
    return {
      leads: { total: 0, monthly: [] },
      reps: { total: 0, monthly: [] },
    };
  const url = `/api/admin/leads/summary?year=${year}`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error("Leads summary error");
  const j = await safeJSON(r);
  return j;
}

/* ========================
   ViewModel
======================== */
export default function useDashboardViewModel() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const lastYear = currentYear - 1;

  const years = useMemo(() => {
    const arr = [];
    for (let y = currentYear - 5; y <= currentYear + 1; y++) arr.push(y);
    return arr;
  }, [currentYear]);

  // Prefill default comparison: current vs last year
  const [yearA, setYearA] = useState(currentYear);
  const [yearB, setYearB] = useState(lastYear);

  const [loading, setLoading] = useState({
    leads: false,
    metrics: false,
    seo: false,
    seoTop: false,
  });
  const [error, setError] = useState({});

  // ----- donut (leads & reps) -----
  const [leadsA, setLeadsA] = useState({ total: 0, monthly: [] });
  const [leadsB, setLeadsB] = useState({ total: 0, monthly: [] });
  const [repsA, setRepsA] = useState({ total: 0, monthly: [] });
  const [repsB, setRepsB] = useState({ total: 0, monthly: [] });

  // Prefill metrics tahun berjalan
  const [metricsYear, setMetricsYear] = useState(currentYear);
  const [metrics, setMetrics] = useState({
    year: null,
    months: [],
    total: 0,
    peakIndex: null,
  });

  async function loadMetrics(y) {
    const r = await fetch(`/api/analytics/metrics?year=${y}&group=month`, {
      cache: "no-store",
    });
    if (!r.ok) throw new Error("Metrics error");
    const j = await safeJSON(r);
    const series = Array.isArray(j.series) ? j.series : [];
    const monthly = new Array(12).fill(0);
    series.forEach((row) => {
      const ym = row.bucket || (row.date || "").slice(0, 7);
      const [yy, mm] = String(ym).split("-");
      if (Number(yy) === y) {
        const idx = Number(mm) - 1;
        if (idx >= 0 && idx < 12) monthly[idx] = Number(row.pageviews || 0);
      }
    });
    const labels = [
      "JAN",
      "FEB",
      "MAR",
      "APR",
      "MAY",
      "JUN",
      "JUL",
      "AUG",
      "SEP",
      "OCT",
      "NOV",
      "DEC",
    ];
    const months = monthly.map((v, i) => ({
      label: labels[i],
      pageviews: Number(v || 0),
      year: y,
    }));
    const total = monthly.reduce((a, b) => a + b, 0);
    let peakIndex = null,
      peak = -1;
    monthly.forEach((v, i) => {
      if (v > peak) {
        peak = v;
        peakIndex = i;
      }
    });
    return { year: y, months, total, peakIndex };
  }

  // ==== Metrics effect (prefilled & clear stale error on success/init) ====
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (metricsYear == null) {
        mounted &&
          setMetrics({ year: null, months: [], total: 0, peakIndex: null });
        return;
      }
      try {
        // reset error sebelum fetch supaya pesan lama tidak muncul saat loading
        setError((s) => ({ ...s, metrics: undefined }));
        setLoading((s) => ({ ...s, metrics: true }));
        const m = await loadMetrics(metricsYear);
        if (mounted) {
          setMetrics(m);
          // clear error ketika data baru sudah ada
          setError((s) => ({ ...s, metrics: undefined }));
        }
      } catch (e) {
        setError((s) => ({
          ...s,
          metrics: e?.message || "Metrics gagal dimuat",
        }));
      } finally {
        mounted && setLoading((s) => ({ ...s, metrics: false }));
      }
    })();
    return () => {
      mounted = false;
    };
  }, [metricsYear]);

  /** Gantikan loop client → 1x call ke summary server */
  async function loadYear(year, setLeadsState, setRepsState) {
    const j = await fetchLeadsSummary(year);
    const l = j?.leads || { total: 0, monthly: [] };
    const r = j?.reps || { total: 0, monthly: [] };
    setLeadsState({
      total: Number(l.total) || 0,
      monthly: Array.isArray(l.monthly) ? l.monthly : [],
    });
    setRepsState({
      total: Number(r.total) || 0,
      monthly: Array.isArray(r.monthly) ? r.monthly : [],
    });
  }

  // ==== Leads/Reps effect (prefilled & clear stale error on success/init) ====
  useEffect(() => {
    let mounted = true;
    (async () => {
      const tasks = [];
      try {
        // reset error sebelum fetch agar pesan lama tidak tampil saat state berubah
        setError((s) => ({ ...s, leads: undefined }));
        setLoading((s) => ({ ...s, leads: true }));

        if (yearA != null) {
          tasks.push(
            loadYear(
              yearA,
              (v) => mounted && setLeadsA(v),
              (v) => mounted && setRepsA(v)
            )
          );
        } else {
          mounted && setLeadsA({ total: 0, monthly: [] });
          mounted && setRepsA({ total: 0, monthly: [] });
        }

        if (yearB != null) {
          tasks.push(
            loadYear(
              yearB,
              (v) => mounted && setLeadsB(v),
              (v) => mounted && setRepsB(v)
            )
          );
        } else {
          mounted && setLeadsB({ total: 0, monthly: [] });
          mounted && setRepsB({ total: 0, monthly: [] });
        }

        if (tasks.length) await Promise.all(tasks);

        // clear error ketika data baru sukses masuk
        mounted && setError((s) => ({ ...s, leads: undefined }));
      } catch (e) {
        setError((s) => ({ ...s, leads: e?.message || "Leads gagal dimuat" }));
      } finally {
        mounted && setLoading((s) => ({ ...s, leads: false }));
      }
    })();
    return () => {
      mounted = false;
    };
  }, [yearA, yearB]);

  // ================= SEO (tetap sama) =================
  const [seoGroup, setSeoGroup] = useState("day");
  const [seoPeriod, setSeoPeriod] = useState("30d");
  const [seoMetric, setSeoMetric] = useState("pageviews");
  const [seoSeries, setSeoSeries] = useState([]);
  const [seoTop, setSeoTop] = useState([]);
  const [seoLabel, setSeoLabel] = useState("");

  const periodOptions = useMemo(() => {
    switch (seoGroup) {
      case "day":
        return [
          { label: "7d", value: "7d" },
          { label: "30d", value: "30d" },
          { label: "90d", value: "90d" },
          { label: "YTD", value: "ytd" },
        ];
      case "week":
        return [
          { label: "12w", value: "12w" },
          { label: "26w", value: "26w" },
          { label: "52w", value: "52w" },
          { label: "YTD", value: "ytd" },
        ];
      case "month":
        return [
          { label: "6m", value: "6m" },
          { label: "12m", value: "12m" },
          { label: "24m", value: "24m" },
          { label: "YTD", value: "ytd" },
        ];
      case "year":
        return [
          { label: "5y", value: "5y" },
          { label: "10y", value: "10y" },
        ];
      default:
        return [{ label: "30d", value: "30d" }];
    }
  }, [seoGroup]);

  const seoTotalPageviews = useMemo(
    () => seoSeries.reduce((s, r) => s + (Number(r.pageviews) || 0), 0),
    [seoSeries]
  );

  const prettyDayLabel = (bucket) => {
    const s = String(bucket);
    const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T00:00:00Z` : s);
    return Number.isNaN(d.getTime())
      ? s
      : d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
  };

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setLoading((s) => ({ ...s, seo: true }));
        const q = new URLSearchParams({ group: seoGroup, period: seoPeriod });
        const r = await fetch(`/api/analytics/metrics?${q.toString()}`, {
          cache: "no-store",
        });
        const j = r.ok ? await r.json() : { series: [] };
        const series = Array.isArray(j.series) ? j.series : [];
        const labeled = series.map((row) => ({
          ...row,
          label:
            seoGroup === "day"
              ? prettyDayLabel(row.bucket)
              : String(row.bucket),
        }));
        if (!ignore) {
          setSeoSeries(labeled);
          setSeoLabel(j?.label || "");
        }
      } catch {
        if (!ignore) setSeoSeries([]);
      } finally {
        if (!ignore) setLoading((s) => ({ ...s, seo: false }));
      }
    })();
    return () => {
      ignore = true;
    };
  }, [seoGroup, seoPeriod]);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setLoading((s) => ({ ...s, seoTop: true }));
        const q = new URLSearchParams({ period: seoPeriod });
        const r = await fetch(`/api/analytics/top-pages?${q.toString()}`, {
          cache: "no-store",
        });
        const j = r.ok ? await r.json() : { rows: [] };
        if (!ignore) setSeoTop(Array.isArray(j.rows) ? j.rows : []);
      } catch {
        if (!ignore) setSeoTop([]);
      } finally {
        if (!ignore) setLoading((s) => ({ ...s, seoTop: false }));
      }
    })();
    return () => {
      ignore = true;
    };
  }, [seoPeriod]);

  return {
    years,
    yearA,
    yearB,
    setYearA,
    setYearB,
    leadsA,
    leadsB,
    repsA,
    repsB,
    loading,
    error,
    metrics,
    setMetricsYear, // default: currentYear
    seo: {
      group: seoGroup,
      period: seoPeriod,
      periodOptions,
      metric: seoMetric,
      series: seoSeries,
      top: seoTop,
      label: seoLabel,
      totalPageviews: seoTotalPageviews,
    },
    setSeoGroup: (v) => setSeoGroup(String(v)),
    setSeoPeriod: (v) => setSeoPeriod(String(v)),
    setSeoMetric: (v) => setSeoMetric(String(v)),
  };
}
