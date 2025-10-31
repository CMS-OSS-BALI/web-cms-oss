"use client";

import { useEffect, useMemo, useState } from "react";

/* ========================
   Helpers
======================== */
const ymd = (y, m, d) =>
  `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

function safeJSON(res) {
  return res.json().catch(() => ({}));
}

async function fetchAllLeadsByYear(year) {
  if (year == null) return [];
  const from = ymd(year, 1, 1);
  const to = ymd(year, 12, 31);
  const perPage = 100;

  let page = 1;
  let rows = [];
  for (let i = 0; i < 50; i++) {
    const url = `/api/leads?from=${from}&to=${to}&page=${page}&perPage=${perPage}&include_assigned=1`;
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) break;
    const { data = [], meta = {} } = await safeJSON(r);
    rows = rows.concat(Array.isArray(data) ? data : []);
    const total = meta?.total ?? rows.length;
    const totalPages = Math.max(1, Math.ceil((total || 0) / perPage));
    if (page >= totalPages) break;
    page += 1;
  }
  return rows;
}

function monthlyBuckets(year, rows, mapper) {
  const out = new Array(12).fill(0);
  rows.forEach((r) => {
    const ts = Number(r.created_ts || Date.parse(r.created_at));
    if (!Number.isFinite(ts)) return;
    const d = new Date(ts);
    if (d.getFullYear() !== year) return;
    if (mapper ? !mapper(r) : false) return;
    out[d.getMonth()] += 1;
  });
  return out;
}

function toMonthSeries(year, arr) {
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
  return arr.map((v, i) => ({
    label: labels[i],
    pageviews: Number(v || 0),
    year,
  }));
}

/* ========================
   ViewModel
======================== */
export default function useDashboardViewModel() {
  const now = new Date();
  const currentYear = now.getFullYear();

  const years = useMemo(() => {
    const arr = [];
    for (let y = currentYear - 5; y <= currentYear + 1; y++) arr.push(y);
    return arr;
  }, [currentYear]);

  // Tahun default KOSONG (null)
  const [yearA, setYearA] = useState(null);
  const [yearB, setYearB] = useState(null);

  const [loading, setLoading] = useState({ leads: false, metrics: false });
  const [error, setError] = useState({});

  // leads (total per tahun) + reps(assigned) per tahun
  const [leadsA, setLeadsA] = useState({ total: 0, monthly: [] });
  const [leadsB, setLeadsB] = useState({ total: 0, monthly: [] });
  const [repsA, setRepsA] = useState({ total: 0, monthly: [] });
  const [repsB, setRepsB] = useState({ total: 0, monthly: [] });

  // metrics: default KOSONG (null) sampai user pilih
  const [metricsYear, setMetricsYear] = useState(null);
  const [metrics, setMetrics] = useState({
    year: null,
    months: [],
    total: 0,
    peakIndex: null,
  });

  async function loadYear(year, setLeadsState, setRepsState) {
    const rows = await fetchAllLeadsByYear(year);
    const allMonthly = monthlyBuckets(year, rows, () => true);
    const repsMonthly = monthlyBuckets(year, rows, (r) => !!r.assigned_to);

    const allTotal = allMonthly.reduce((a, b) => a + b, 0);
    const repsTotal = repsMonthly.reduce((a, b) => a + b, 0);

    setLeadsState({ total: allTotal, monthly: allMonthly });
    setRepsState({ total: repsTotal, monthly: repsMonthly });
  }

  // Muat leads saat yearA/B di-set (tidak memaksa kedua-duanya ada)
  useEffect(() => {
    let mounted = true;
    (async () => {
      const tasks = [];
      try {
        if (yearA != null || yearB != null)
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
      } catch (e) {
        setError((s) => ({ ...s, leads: e?.message || "Leads gagal dimuat" }));
      } finally {
        if (yearA != null || yearB != null)
          mounted && setLoading((s) => ({ ...s, leads: false }));
      }
    })();
    return () => {
      mounted = false;
    };
  }, [yearA, yearB]);

  // metrics
  async function loadMetrics(y) {
    // ambil agregasi bulanan langsung dari server (lebih hemat payload)
    const r = await fetch(`/api/analytics/metrics?year=${y}&group=month`, {
      cache: "no-store",
    });
    if (!r.ok) throw new Error("Metrics error");
    const j = await safeJSON(r);
    const series = Array.isArray(j.series) ? j.series : [];

    // isi 12 bulan (0 kalau kosong)
    const monthly = new Array(12).fill(0);
    series.forEach((row) => {
      const ym = row.ym || (row.date || "").slice(0, 7); // "YYYY-MM"
      const [yy, mm] = String(ym).split("-");
      if (Number(yy) === y) {
        const idx = Number(mm) - 1;
        if (idx >= 0 && idx < 12) monthly[idx] = Number(row.pageviews || 0);
      }
    });

    const months = toMonthSeries(y, monthly);
    const total = monthly.reduce((a, b) => a + b, 0);
    let peakIndex = null;
    let peak = -1;
    monthly.forEach((v, i) => {
      if (v > peak) {
        peak = v;
        peakIndex = i;
      }
    });

    return { year: y, months, total, peakIndex };
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      // kalau belum pilih tahun, jangan fetch
      if (metricsYear == null) {
        mounted &&
          setMetrics({
            year: null,
            months: [],
            total: 0,
            peakIndex: null,
          });
        return;
      }
      try {
        setLoading((s) => ({ ...s, metrics: true }));
        const m = await loadMetrics(metricsYear);
        mounted && setMetrics(m);
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
    setMetricsYear: setMetricsYear,
  };
}
