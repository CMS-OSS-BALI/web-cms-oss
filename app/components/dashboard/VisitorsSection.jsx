"use client";
import { useEffect, useMemo, useState, useRef } from "react";
import { Segmented } from "antd";

/* ===== Utils ===== */
const fmt = (n) => new Intl.NumberFormat("id-ID").format(n ?? 0);
function formatLabel(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

/* ===== Warna per metrik ===== */
const METRIC_COLORS = {
  visitors: "#3b82f6", // biru
  sessions: "#22c55e", // hijau
  pageviews: "#a855f7", // ungu
};

/* ===== SVG Line Chart: tooltip-only (no per-point markers) ===== */
function LineChart({
  points,
  height = 260,
  color = "#3b82f6",
  yTicks = 4,
  xTicks = 5,
}) {
  const padding = { top: 16, right: 12, bottom: 28, left: 36 };
  const width = 640; // viewBox width (responsif via CSS)
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const maxY = Math.max(1, ...points.map((p) => p.y));
  const xPos = (i) =>
    points.length <= 1 ? 0 : (i / (points.length - 1)) * innerW;
  const yPos = (v) => innerH - (v / maxY) * innerH;

  const coords = points.map((p, i) => ({
    cx: padding.left + xPos(i),
    cy: padding.top + yPos(p.y),
    label: formatLabel(p.x),
    value: p.y,
  }));

  const path = coords
    .map((c, i) => `${i ? "L" : "M"} ${c.cx} ${c.cy}`)
    .join(" ");

  const gridLines = Array.from({ length: yTicks + 1 }, (_, i) => ({
    y: padding.top + (innerH / yTicks) * i,
    label: Math.round(maxY - maxY * (i / yTicks)),
  }));

  const xIdx = points.length
    ? Array.from({ length: Math.min(xTicks, points.length) }, (_, i) =>
        Math.round(
          (i * (points.length - 1)) / (Math.min(xTicks, points.length) - 1 || 1)
        )
      )
    : [];

  // ===== Hover interactivity =====
  const svgRef = useRef(null);
  const [hoverIdx, setHoverIdx] = useState(null);

  const onMove = (evt) => {
    if (!coords.length || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mx = (evt.clientX ?? evt.touches?.[0]?.clientX) - rect.left;
    let best = 0,
      bestDist = Infinity;
    for (let i = 0; i < coords.length; i++) {
      const d = Math.abs(coords[i].cx - mx);
      if (d < bestDist) {
        best = i;
        bestDist = d;
      }
    }
    setHoverIdx(best);
  };
  const onLeave = () => setHoverIdx(null);

  const tip = hoverIdx != null ? coords[hoverIdx] : null;
  const tipText = tip ? `${tip.label} • ${fmt(points[hoverIdx].y)}` : "";
  const tipWidth = Math.max(90, tipText.length * 7 + 16);
  const tipHeight = 28;
  const tipX = tip
    ? Math.min(
        Math.max(tip.cx - tipWidth / 2, padding.left),
        padding.left + innerW - tipWidth
      )
    : 0;
  const tipY = tip ? Math.max(tip.cy - 36, padding.top + 4) : 0;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: "100%", height: "auto", display: "block" }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onTouchMove={onMove}
      onTouchEnd={onLeave}
    >
      {/* Grid & Y labels */}
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

      {/* Line only */}
      <path d={path} fill="none" stroke={color} strokeWidth="2.2" />

      {/* X labels */}
      {xIdx.map((idx, i) => (
        <text
          key={`x-${i}`}
          x={coords[idx]?.cx ?? padding.left}
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

      {/* Hover crosshair + dot + tooltip */}
      {tip && (
        <>
          <line
            x1={tip.cx}
            x2={tip.cx}
            y1={padding.top}
            y2={padding.top + innerH}
            stroke="rgba(148,163,184,.35)"
            strokeDasharray="3 4"
          />
          {/* dot hanya saat hover */}
          <circle cx={tip.cx} cy={tip.cy} r="5.5" fill={color} opacity="0.95" />
          <circle cx={tip.cx} cy={tip.cy} r="9" fill={color} opacity="0.15" />

          <g>
            <rect
              x={tipX}
              y={tipY}
              rx="8"
              ry="8"
              width={tipWidth}
              height={tipHeight}
              fill="rgba(11,18,35,0.96)"
              stroke="#2f3f60"
            />
            <text
              x={tipX + 10}
              y={tipY + 18}
              fontSize="12"
              fill="#e6eaf2"
              style={{ fontWeight: 700 }}
            >
              {tipText}
            </text>
          </g>
        </>
      )}

      {/* overlay pointer */}
      <rect
        x={padding.left}
        y={padding.top}
        width={innerW}
        height={innerH}
        fill="transparent"
        pointerEvents="all"
      />
    </svg>
  );
}

/* ===== VisitorsSection ===== */
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

  const color = METRIC_COLORS[metric] ?? "#3b82f6";

  return (
    <div style={{ color: "#e5e7eb" }}>
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
            {days} hari terakhir • total {fmt(total)} • rata-rata {fmt(avg)}
            /hari
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
        <LineChart points={points} height={260} color={color} />
        {!points.length && (
          <div style={{ marginTop: 8, fontSize: 12, color: "#94a3b8" }}>
            Tidak ada data untuk rentang ini.
          </div>
        )}
      </div>
    </div>
  );
}
