"use client";

const DEFAULT_COLORS = [
  "#0b56c9",
  "#5aa8ff",
  "#8ab6ff",
  "#b3d4ff",
  "#d1e5ff",
  "#2c3e50",
];

function polar(cx, cy, r, a) {
  const rad = ((a - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutPath(cx, cy, rO, rI, start, end) {
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
}

/** Donut Pie ringan (SVG) */
export default function PieDonut({
  data,
  size = 240,
  inner = 86,
  palette = DEFAULT_COLORS,
  centerTitle = "Total",
  ariaLabel = "Distribusi",
  centerBg = "#fff",
}) {
  const safe = Array.isArray(data) ? data : [];
  const total = Math.max(
    1,
    safe.reduce((a, b) => a + (Number(b.value) || 0), 0)
  );
  const cx = size / 2,
    cy = size / 2,
    r = size / 2;
  let acc = 0;
  const EPS = 1e-4;
  const totalLabel = safe.reduce((a, b) => a + (Number(b.value) || 0), 0);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={ariaLabel}
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
      <circle cx={cx} cy={cy} r={inner - 8} fill={centerBg} />
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

export const PIE_COLORS = DEFAULT_COLORS;
