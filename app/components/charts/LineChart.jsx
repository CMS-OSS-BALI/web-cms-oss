"use client";

import { useRef, useState } from "react";

const fmt = (n) => new Intl.NumberFormat("id-ID").format(n ?? 0);

/** LineChart ringan + bubble tooltip */
export default function LineChart({
  points = [], // [{ label, y }]
  height = 280,
  color = "#0b56c9",
  yTicks = 4,
  xTicks = 6,
  width = 920, // viewBox width (SVG responsive via CSS)
}) {
  const padding = { top: 16, right: 12, bottom: 28, left: 36 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const maxY = Math.max(1, ...points.map((p) => Number(p.y) || 0));
  const xPos = (i) =>
    points.length <= 1 ? 0 : (i / (points.length - 1)) * innerW;
  const yPos = (v) => innerH - ((Number(v) || 0) / maxY) * innerH;

  const coords = points.map((p, i) => ({
    cx: padding.left + xPos(i),
    cy: padding.top + yPos(p.y),
    label: p.label,
    value: Number(p.y) || 0,
  }));

  const path = coords
    .map((c, i) => `${i ? "L" : "M"} ${c.cx} ${c.cy}`)
    .join(" ");

  const gridLines = Array.from({ length: yTicks + 1 }, (_, i) => ({
    y: padding.top + (innerH / yTicks) * i,
    label: Math.round(maxY - maxY * (i / yTicks)),
  }));

  const pickIdx = points.length
    ? Array.from({ length: Math.min(xTicks, points.length) }, (_, i) =>
        Math.round(
          (i * (points.length - 1)) / (Math.min(xTicks, points.length) - 1 || 1)
        )
      )
    : [];

  const svgRef = useRef(null);
  const [hoverIdx, setHoverIdx] = useState(null);

  const onMove = (evt) => {
    if (!coords.length || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX =
      "touches" in evt && evt.touches?.length
        ? evt.touches[0].clientX
        : evt.clientX;
    const mx = clientX - rect.left;
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
  const tipText = tip ? fmt(points[hoverIdx].y) : "";
  const bubbleW = Math.max(64, tipText.length * 8 + 24);
  const bubbleH = 32;

  let bx = 0,
    by = 0,
    arrow = "",
    placeLeft = true;

  if (tip) {
    by = Math.max(
      padding.top,
      Math.min(tip.cy - bubbleH / 2, padding.top + innerH - bubbleH)
    );

    bx = tip.cx - (bubbleW + 12);
    if (bx < padding.left) {
      bx = tip.cx + 12;
      placeLeft = false;
    }

    if (placeLeft) {
      arrow = `M ${bx + bubbleW} ${by + bubbleH / 2 - 8}
               L ${tip.cx - 2} ${tip.cy}
               L ${bx + bubbleW} ${by + bubbleH / 2 + 8} Z`;
    } else {
      arrow = `M ${bx} ${by + bubbleH / 2 - 8}
               L ${tip.cx + 2} ${tip.cy}
               L ${bx} ${by + bubbleH / 2 + 8} Z`;
    }
  }

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
            fill="#8aa0c8"
          >
            {g.label}
          </text>
        </g>
      ))}

      {/* Line */}
      <path d={path} fill="none" stroke={color} strokeWidth="2.2" />

      {/* X labels (sampled) */}
      {pickIdx.map((idx, i) => (
        <text
          key={`x-${i}`}
          x={coords[idx]?.cx ?? padding.left}
          y={height - 6}
          fontSize="10"
          textAnchor={
            i === 0 ? "start" : i === pickIdx.length - 1 ? "end" : "middle"
          }
          fill="#8aa0c8"
        >
          {points[idx]?.label ?? ""}
        </text>
      ))}

      {/* Hover crosshair, dot & tooltip bubble */}
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
          <circle cx={tip.cx} cy={tip.cy} r="5.5" fill={color} />
          <circle cx={tip.cx} cy={tip.cy} r="9.5" fill={color} opacity="0.15" />

          {/* Bubble */}
          <g>
            <rect
              x={bx}
              y={by}
              rx="10"
              ry="10"
              width={bubbleW}
              height={bubbleH}
              fill="rgba(0,0,0,0.92)"
            />
            <path d={arrow} fill="rgba(0,0,0,0.92)" />
            <text
              x={bx + bubbleW / 2}
              y={by + bubbleH / 2 + 4}
              textAnchor="middle"
              fontSize="14"
              style={{ fontWeight: 800 }}
              fill="#ffffff"
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
