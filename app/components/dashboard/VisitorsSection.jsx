"use client";
import { useEffect, useMemo, useState } from "react";
import { Segmented } from "antd";

/* utils */
function formatLabel(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

/* minimal SVG line chart */
function LineChart({ points, height = 260 }) {
  const padding = { top: 16, right: 12, bottom: 28, left: 36 };
  const width = 640;
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const maxY = Math.max(1, ...points.map((p) => p.y));
  const x = (i) =>
    points.length <= 1 ? 0 : (i / (points.length - 1)) * innerW;
  const y = (v) => innerH - (v / maxY) * innerH;

  const path = points
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"} ${padding.left + x(i)} ${padding.top + y(p.y)}`
    )
    .join(" ");

  const yTicks = 4;
  const gridLines = Array.from({ length: yTicks + 1 }, (_, i) => ({
    y: padding.top + (innerH / yTicks) * i,
    label: Math.round(maxY - maxY * (i / yTicks)),
  }));

  const xTicks = 5;
  const xIdx = points.length
    ? Array.from({ length: Math.min(xTicks, points.length) }, (_, i) =>
        Math.round((i * (points.length - 1)) / (xTicks - 1 || 1))
      )
    : [];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: "100%", height: "auto", display: "block" }}
    >
      {gridLines.map((g, i) => (
        <g key={`g-${i}`}>
          <line
            x1={padding.left}
            x2={padding.left + innerW}
            y1={g.y}
            y2={g.y}
            stroke="rgba(148,163,184,.25)"
          />
          <text
            x={padding.left - 6}
            y={g.y + 4}
            fontSize="10"
            textAnchor="end"
            fill="rgba(226,232,240,.9)"
          >
            {g.label}
          </text>
        </g>
      ))}
      <path d={path} fill="none" stroke="currentColor" strokeWidth="2.2" />
      {xIdx.map((idx, i) => (
        <text
          key={`x-${i}`}
          x={padding.left + x(idx)}
          y={height - 6}
          fontSize="10"
          textAnchor={
            i === 0 ? "start" : i === xIdx.length - 1 ? "end" : "middle"
          }
          fill="rgba(226,232,240,.9)"
        >
          {points[idx] ? formatLabel(points[idx].x) : ""}
        </text>
      ))}
    </svg>
  );
}

export default function VisitorsSection() {
  const [days, setDays] = useState(30);
  const [metric, setMetric] = useState("visitors"); // "visitors" | "sessions" | "pageviews"
  const [series, setSeries] = useState([]);

  useEffect(() => {
    let ignore = false;
    fetch(`/api/analytics/metrics?days=${days}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((res) => !ignore && setSeries(res?.series ?? []))
      .catch(() => !ignore && setSeries([]));
    return () => {
      ignore = true;
    };
  }, [days]);

  const points = useMemo(
    () => (series || []).map((d) => ({ x: d.date, y: Number(d[metric] || 0) })),
    [series, metric]
  );

  const total = points.reduce((s, p) => s + p.y, 0);
  const avg = points.length ? Math.round(total / points.length) : 0;

  const title =
    metric === "visitors"
      ? "Unique Visitors"
      : metric === "sessions"
      ? "Visits (Sessions)"
      : "Pageviews";

  return (
    <div className="card-dark card-hover" style={{ color: "#e5e7eb" }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 10,
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 220 }}>
          <h3
            style={{
              margin: 0,
              fontWeight: 800,
              fontSize: 14,
              color: "#e5e7eb",
            }}
          >
            {title}
          </h3>
          <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>
            {days} hari terakhir • total {total} • rata-rata {avg}/hari
          </p>
        </div>

        <div className="chart-toolbar">
          <Segmented
            size="small"
            className="seg-dark"
            value={metric}
            onChange={(v) => setMetric(String(v))}
            options={[
              { label: "Visitors", value: "visitors" },
              { label: "Sessions", value: "sessions" },
              { label: "Pageviews", value: "pageviews" },
            ]}
          />
          <Segmented
            size="small"
            className="seg-dark seg-compact"
            value={days}
            onChange={(v) => setDays(Number(v))}
            options={[
              { label: "7d", value: 7 },
              { label: "30d", value: 30 },
              { label: "90d", value: 90 },
            ]}
          />
        </div>
      </div>

      {/* CHART */}
      <div style={{ minHeight: 280 }}>
        <LineChart points={points} height={260} />
        {!points.length && (
          <div style={{ marginTop: 8, fontSize: 12, color: "#94a3b8" }}>
            Tidak ada data untuk rentang ini.
          </div>
        )}
      </div>
    </div>
  );
}
