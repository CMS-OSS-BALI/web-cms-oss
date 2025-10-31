"use client";

import { useMemo, useRef, useState } from "react";
import {
  ConfigProvider,
  Select,
  Skeleton,
  Empty,
  Typography,
  Tooltip,
} from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import useDashboardViewModel from "./useDashboardViewModel";
import Loading from "@/app/components/loading/LoadingImage";

/* =======================
   Lightweight Donut Pie
======================= */
const PIE_COLORS = [
  "#0b56c9",
  "#5aa8ff",
  "#8ab6ff",
  "#b3d4ff",
  "#d1e5ff",
  "#2c3e50",
];

function PieDonut({
  data,
  size = 240,
  inner = 86,
  palette = PIE_COLORS,
  centerTitle = "Total",
}) {
  const safe = Array.isArray(data) ? data : [];
  const total = Math.max(
    1,
    safe.reduce((a, b) => a + (Number(b.value) || 0), 0)
  );
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2;
  let acc = 0;
  const EPS = 1e-4;

  const polar = (cx, cy, r, a) => {
    const rad = ((a - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };
  const donutPath = (cx, cy, rO, rI, start, end) => {
    const large = end - start > 180 ? 1 : 0;
    const sO = polar(cx, cy, rO, start);
    const eO = polar(cx, cy, rO, end);
    const sI = polar(cx, cy, rI, end);
    const eI = polar(cx, cy, rI, start);
    return [
      `M ${sO.x} ${sO.y}`,
      `A ${rO} ${rO} 0 ${large} 1 ${eO.x} ${eO.y}`,
      `L ${sI.x} ${sI.y}`,
      `A ${rI} ${rI} 0 ${large} 0 ${eI.x} ${eI.y}`,
      "Z",
    ].join(" ");
  };

  const totalLabel = safe.reduce((a, b) => a + (Number(b.value) || 0), 0);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="Distribusi per tahun"
      style={{ display: "block" }}
    >
      {safe.map((d, i) => {
        const value = Number(d.value) || 0;
        if (value <= 0) return null;
        const pct = value / total;
        const angle = pct * 360;
        const start = acc;
        const end = acc + angle;
        acc = end;
        const fill = palette[i % palette.length];

        if (1 - pct < EPS) {
          return (
            <g key={i}>
              <circle cx={cx} cy={cy} r={r} fill={fill}>
                <title>{`${d.label}: ${value} (100%)`}</title>
              </circle>
            </g>
          );
        }
        return (
          <path
            key={i}
            d={donutPath(cx, cy, r, inner, start, Math.max(start + EPS, end))}
            fill={fill}
            stroke="#fff"
            strokeWidth="2"
          >
            <title>{`${d.label}: ${value} (${Math.round(pct * 100)}%)`}</title>
          </path>
        );
      })}
      <circle cx={cx} cy={cy} r={inner - 8} fill="#fff" />
      <text
        x={cx}
        y={cy - 2}
        textAnchor="middle"
        fontWeight="800"
        fontSize="22"
        fill="#0f172a"
      >
        {totalLabel}
      </text>
      <text x={cx} y={cy + 16} textAnchor="middle" fontSize="11" fill="#6b7280">
        {centerTitle}
      </text>
    </svg>
  );
}

/* =======================
   Lightweight Area Chart (with hover tooltip)
======================= */
function AreaChart({
  data = [], // [{label:'JAN', value: 0}, ...]
  width = 920,
  height = 240,
  showDot = true,
  highlightIndex = null,
}) {
  const pad = { l: 28, r: 10, t: 10, b: 28 };
  const W = width;
  const H = height;
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;

  const fmt = (n) => new Intl.NumberFormat("id-ID").format(Number(n || 0));
  const max = Math.max(1, ...data.map((d) => Number(d.value) || 0));
  const stepX = innerW / Math.max(1, data.length - 1);

  const points = data.map((d, i) => {
    const x = pad.l + i * stepX;
    const y = pad.t + innerH - (innerH * (Number(d.value) || 0)) / max;
    return { x, y, label: d.label, value: Number(d.value) || 0, i };
  });

  const pathD = points
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(" ");
  const areaD = `${pathD} L ${pad.l + innerW} ${pad.t + innerH} L ${pad.l} ${
    pad.t + innerH
  } Z`;

  // Hover interactivity
  const svgRef = useRef(null);
  const [hoverIdx, setHoverIdx] = useState(null);

  const onMove = (evt) => {
    if (!points.length || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mx = (evt.clientX ?? evt.touches?.[0]?.clientX) - rect.left;
    let best = 0,
      bestDist = Infinity;
    for (let i = 0; i < points.length; i++) {
      const d = Math.abs(points[i].x - mx);
      if (d < bestDist) {
        best = i;
        bestDist = d;
      }
    }
    setHoverIdx(best);
  };
  const onLeave = () => setHoverIdx(null);

  const tip = hoverIdx != null ? points[hoverIdx] : null;

  // tooltip bubble
  const bubbleH = 34;
  const text = tip ? fmt(tip.value) : "";
  const bubbleW = Math.max(70, text.length * 9 + 20);

  let bx = 0,
    by = 0,
    arrowPath = "";
  if (tip) {
    const preferLeft = tip.x > pad.l + innerW * 0.55;
    by = Math.max(
      pad.t + 4,
      Math.min(tip.y - bubbleH - 8, pad.t + innerH - bubbleH - 4)
    );
    if (preferLeft) {
      bx = Math.max(
        pad.l,
        Math.min(tip.x - (bubbleW + 14), pad.l + innerW - bubbleW)
      );
      arrowPath = `M ${bx + bubbleW} ${by + bubbleH / 2 - 7}
                   L ${tip.x - 6} ${tip.y}
                   L ${bx + bubbleW} ${by + bubbleH / 2 + 7} Z`;
    } else {
      bx = Math.min(Math.max(tip.x + 14, pad.l), pad.l + innerW - bubbleW);
      arrowPath = `M ${bx} ${by + bubbleH / 2 - 7}
                   L ${tip.x + 6} ${tip.y}
                   L ${bx} ${by + bubbleH / 2 + 7} Z`;
    }
  }

  return (
    <svg
      ref={svgRef}
      width={W}
      height={H}
      role="img"
      aria-label="Grafik area pageviews"
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onTouchMove={onMove}
      onTouchEnd={onLeave}
      style={{ display: "block", width: "100%", height: "auto" }}
    >
      {/* axes (minimal) */}
      <line
        x1={pad.l}
        y1={pad.t + innerH}
        x2={pad.l + innerW}
        y2={pad.t + innerH}
        stroke="#e5edff"
      />
      <line
        x1={pad.l}
        y1={pad.t}
        x2={pad.l}
        y2={pad.t + innerH}
        stroke="#e5edff"
      />

      {/* gradient */}
      <defs>
        <linearGradient id="pvfill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#0b56c9" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#0b56c9" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* area + line */}
      <path d={areaD} fill="url(#pvfill)" />
      <path d={pathD} fill="none" stroke="#0b56c9" strokeWidth="2" />

      {/* month labels */}
      {points.map((p, i) => (
        <text
          key={`m${i}`}
          x={p.x}
          y={H - 8}
          textAnchor="middle"
          fontSize="10.5"
          fill="#8aa0c8"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {p.label}
        </text>
      ))}

      {/* dots */}
      {showDot &&
        points.map((p, i) => (
          <g key={`d${i}`}>
            <circle
              cx={p.x}
              cy={p.y}
              r={i === highlightIndex ? 4 : 3}
              fill="#0b56c9"
            />
          </g>
        ))}

      {/* hover crosshair + tooltip */}
      {tip && (
        <>
          <line
            x1={tip.x}
            x2={tip.x}
            y1={pad.t}
            y2={pad.t + innerH}
            stroke="rgba(148,163,184,.4)"
            strokeDasharray="3 4"
          />
          <circle cx={tip.x} cy={tip.y} r="5.5" fill="#0b56c9" />
          <circle cx={tip.x} cy={tip.y} r="9" fill="#0b56c9" opacity="0.18" />
          <g>
            <rect
              x={bx}
              y={by}
              rx="10"
              ry="10"
              width={bubbleW}
              height={bubbleH}
              fill="rgba(11,18,35,0.96)"
              stroke="#2f3f60"
            />
            <path d={arrowPath} fill="rgba(11,18,35,0.96)" stroke="#2f3f60" />
            <text
              x={bx + bubbleW / 2}
              y={by + bubbleH / 2 + 4}
              textAnchor="middle"
              fontSize="14"
              style={{ fontWeight: 800 }}
              fill="#ffffff"
            >
              {text}
            </text>
          </g>
        </>
      )}

      {/* overlay pointer area */}
      <rect
        x={pad.l}
        y={pad.t}
        width={innerW}
        height={innerH}
        fill="transparent"
        pointerEvents="all"
      />
    </svg>
  );
}

/* ===== tokens ===== */
const TOKENS = { shellW: "94%", maxW: 1140, blue: "#0b56c9", text: "#0f172a" };
const { Title } = Typography;

export default function DashboardContent() {
  const vm = useDashboardViewModel();
  const { shellW, maxW, blue, text } = TOKENS;

  const yearOptions = useMemo(
    () => vm.years.map((y) => ({ value: y, label: String(y) })),
    [vm.years]
  );

  const leadsSlices = useMemo(() => {
    if (vm.yearA == null || vm.yearB == null) return [];
    return [
      { label: String(vm.yearA), value: vm.leadsA.total },
      { label: String(vm.yearB), value: vm.leadsB.total },
    ];
  }, [vm.leadsA.total, vm.leadsB.total, vm.yearA, vm.yearB]);

  const repsSlices = useMemo(() => {
    if (vm.yearA == null || vm.yearB == null) return [];
    return [
      { label: String(vm.yearA), value: vm.repsA.total },
      { label: String(vm.yearB), value: vm.repsB.total },
    ];
  }, [vm.repsA.total, vm.repsB.total, vm.yearA, vm.yearB]);

  const monthSeries = useMemo(
    () =>
      (vm.metrics.months || []).map((m) => ({
        label: m.label,
        value: m.pageviews,
      })),
    [vm.metrics.months]
  );

  const loadingLeads = vm.loading.leads;
  const loadingMetrics = vm.loading.metrics;

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: blue,
          colorText: text,
          fontFamily:
            '"Poppins", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
          borderRadius: 12,
          fontSize: 13,
          controlHeight: 36,
        },
      }}
    >
      <section
        style={{
          width: "100%",
          position: "relative",
          minHeight: "100dvh",
          display: "flex",
          alignItems: "flex-start",
          padding: "40px 0 56px",
          overflowX: "hidden",
        }}
      >
        {/* background */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, #f8fbff 0%, #eef5ff 40%, #ffffff 100%)",
            zIndex: 0,
          }}
        />
        <div
          style={{
            width: shellW,
            maxWidth: maxW,
            margin: "0 auto",
            position: "relative",
            zIndex: 1,
          }}
        >
          <Title level={2} style={{ margin: "0 0 12px", color: "#0b3e91" }}>
            Welcome Admin, OSS
          </Title>

          {/* ================== Row: 2 Donut Cards ================== */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 14,
              marginBottom: 14,
            }}
          >
            {/* Leads Donut */}
            <div style={styles.cardOuter}>
              <div style={styles.cardInner}>
                <div style={styles.sectionHeader}>
                  <div style={styles.sectionTitle}>
                    Peningkatan Daftar Leads
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                      minWidth: 240,
                    }}
                  >
                    <Select
                      allowClear
                      placeholder="Pilih tahun A"
                      value={vm.yearA ?? undefined}
                      options={yearOptions}
                      onChange={vm.setYearA}
                    />
                    <Select
                      allowClear
                      placeholder="Pilih tahun B"
                      value={vm.yearB ?? undefined}
                      options={yearOptions}
                      onChange={vm.setYearB}
                    />
                  </div>
                </div>

                {loadingLeads ? (
                  <Loading label="Memuat ringkasan leads…" />
                ) : !vm.yearA || !vm.yearB ? (
                  <div style={{ padding: 16 }}>
                    <Empty description="Pilih kedua tahun untuk melihat perbandingan" />
                  </div>
                ) : (
                  <div style={styles.donutRow}>
                    <PieDonut
                      data={leadsSlices}
                      size={240}
                      inner={90}
                      palette={PIE_COLORS}
                      centerTitle="Total Leads"
                    />
                    {/* Legend */}
                    <div style={styles.legendWrap}>
                      {leadsSlices.map((s, i) => (
                        <div key={s.label} style={styles.legendItem}>
                          <span
                            aria-hidden
                            style={{
                              width: 12,
                              height: 12,
                              borderRadius: 3,
                              background: PIE_COLORS[i % PIE_COLORS.length],
                              display: "inline-block",
                            }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontWeight: 700,
                                color: "#0f172a",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {s.label}
                            </div>
                            <div style={{ color: "#64748b", fontSize: 12 }}>
                              {vm.yearA === Number(s.label)
                                ? `${vm.leadsA.total} data`
                                : `${vm.leadsB.total} data`}
                            </div>
                          </div>
                          <div style={styles.legendNum}>
                            {vm.yearA === Number(s.label)
                              ? vm.leadsA.total
                              : vm.leadsB.total}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Representative Donut (assigned leads) */}
            <div style={styles.cardOuter}>
              <div style={styles.cardInner}>
                <div style={styles.sectionHeader}>
                  <div style={styles.sectionTitle}>
                    Peningkatan Representative
                    <InfoCircleOutlined
                      style={{ marginLeft: 6, color: "#8aa0c8" }}
                    />
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                      minWidth: 240,
                    }}
                  >
                    <Select
                      allowClear
                      placeholder="Pilih tahun A"
                      value={vm.yearA ?? undefined}
                      options={yearOptions}
                      onChange={vm.setYearA}
                    />
                    <Select
                      allowClear
                      placeholder="Pilih tahun B"
                      value={vm.yearB ?? undefined}
                      options={yearOptions}
                      onChange={vm.setYearB}
                    />
                  </div>
                </div>

                {loadingLeads ? (
                  <Loading label="Memuat representative…" />
                ) : !vm.yearA || !vm.yearB ? (
                  <div style={{ padding: 16 }}>
                    <Empty description="Pilih kedua tahun untuk melihat perbandingan" />
                  </div>
                ) : (
                  <div style={styles.donutRow}>
                    <PieDonut
                      data={repsSlices}
                      size={240}
                      inner={90}
                      palette={PIE_COLORS}
                      centerTitle="Total Representative"
                    />
                    <div style={styles.legendWrap}>
                      {repsSlices.map((s, i) => (
                        <div key={s.label} style={styles.legendItem}>
                          <span
                            aria-hidden
                            style={{
                              width: 12,
                              height: 12,
                              borderRadius: 3,
                              background: PIE_COLORS[i % PIE_COLORS.length],
                              display: "inline-block",
                            }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontWeight: 700,
                                color: "#0f172a",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {s.label}
                            </div>
                            <div style={{ color: "#64748b", fontSize: 12 }}>
                              {vm.yearA === Number(s.label)
                                ? `${vm.repsA.total} data`
                                : `${vm.repsB.total} data`}
                            </div>
                          </div>
                          <div style={styles.legendNum}>
                            {vm.yearA === Number(s.label)
                              ? vm.repsA.total
                              : vm.repsB.total}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ================== Pageviews Card ================== */}
          <div style={styles.cardOuter}>
            <div style={{ ...styles.cardInner, paddingTop: 14 }}>
              <div style={styles.sectionHeader}>
                <div style={styles.sectionTitle}>
                  Trafik Pengunjung (SEO)
                  {vm.metrics.year ? (
                    <span
                      style={{
                        color: "#8aa0c8",
                        marginLeft: 12,
                        fontWeight: 600,
                        fontSize: 12,
                      }}
                    >
                      {vm.metrics.year} · {vm.metrics.total.toLocaleString()}{" "}
                      pageviews
                    </span>
                  ) : null}
                </div>
                <Select
                  allowClear
                  placeholder="Pilih tahun"
                  value={vm.metrics.year ?? undefined}
                  options={yearOptions}
                  onChange={vm.setMetricsYear}
                  style={{ width: 140 }}
                />
              </div>

              {loadingMetrics ? (
                <Loading label="Memuat metrics…" />
              ) : !vm.metrics.year ? (
                <div style={{ padding: "20px 0" }}>
                  <Empty description="Pilih tahun untuk melihat grafik pageviews" />
                </div>
              ) : monthSeries.length === 0 ? (
                <div style={{ padding: "20px 0" }}>
                  <Empty description="Belum ada data" />
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <div style={{ minWidth: 720 }}>
                    <AreaChart
                      data={monthSeries}
                      width={1024}
                      height={280}
                      showDot
                      highlightIndex={vm.metrics.peakIndex}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ====== Responsive tweaks ====== */}
      <style jsx global>{`
        @media (max-width: 980px) {
          .ant-select {
            width: 100% !important;
          }
        }
        @media (max-width: 920px) {
          /* grid donuts stack */
          section > div > div:first-of-type {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </ConfigProvider>
  );
}

/* ===== styles ===== */
const styles = {
  cardOuter: {
    background: "#ffffff",
    borderRadius: 16,
    border: "1px solid #e6eeff",
    boxShadow:
      "0 10px 40px rgba(11, 86, 201, 0.07), 0 3px 12px rgba(11,86,201,0.05)",
    overflow: "hidden",
  },
  cardInner: { padding: "12px 14px 14px", position: "relative" },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 8,
    flexWrap: "wrap",
  },
  sectionTitle: { fontSize: 18, fontWeight: 800, color: "#0b3e91" },
  donutRow: {
    display: "grid",
    gridTemplateColumns: "280px 1fr",
    gap: 14,
    alignItems: "center",
  },
  legendWrap: {
    background: "#fff",
    borderRadius: 12,
    border: "1px solid #e6eeff",
    padding: 10,
    display: "grid",
    gap: 8,
  },
  legendItem: {
    display: "grid",
    gridTemplateColumns: "12px 1fr 90px",
    alignItems: "center",
    gap: 10,
    background: "#f5f8ff",
    borderRadius: 8,
    border: "1px solid #e8eeff",
    padding: "8px 10px",
  },
  legendNum: {
    textAlign: "right",
    fontWeight: 800,
    color: "#0f172a",
    fontVariantNumeric: "tabular-nums",
    fontFeatureSettings: '"tnum" 1, "lnum" 1',
  },
};
