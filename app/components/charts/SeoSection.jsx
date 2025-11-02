"use client";

import { Segmented, Empty, Typography, Table } from "antd";
import LineChart from "./LineChart";
import Loading from "@/app/components/loading/LoadingImage";

const { Text } = Typography;

function metricColor(metric) {
  if (metric === "visitors") return "#3b82f6";
  if (metric === "sessions") return "#22c55e";
  return "#a855f7"; // pageviews / default
}

/** Seksi SEO: header filter + LineChart + tabel Top Pages */
export default function SeoSection({
  seo, // { series, metric, group, period, periodOptions, label, totalPageviews, top }
  loading, // { seo: bool, seoTop: bool }
  onMetricChange,
  onGroupChange,
  onPeriodChange,
}) {
  const points = (seo?.series || []).map((s) => ({
    label: s.label,
    y: Number(s?.[seo?.metric] || 0),
  }));

  const topColumns = [
    {
      title: "Path",
      dataIndex: "path",
      key: "path",
      render: (v) => (
        <a
          href={v}
          target="_blank"
          rel="noreferrer"
          style={{ fontWeight: 600 }}
        >
          {v}
        </a>
      ),
    },
    {
      title: "Pageviews",
      dataIndex: "pageviews",
      key: "pageviews",
      align: "right",
      render: (n) => (Number(n) || 0).toLocaleString("id-ID"),
    },
    {
      title: "Sessions",
      dataIndex: "sessions",
      key: "sessions",
      align: "right",
      render: (n) => (Number(n) || 0).toLocaleString("id-ID"),
    },
    {
      title: "Visitors",
      dataIndex: "visitors",
      key: "visitors",
      align: "right",
      render: (n) => (Number(n) || 0).toLocaleString("id-ID"),
    },
    {
      title: "Share",
      key: "share",
      align: "right",
      render: (_, row) => {
        const pv = Number(row?.pageviews) || 0;
        const total = Number(seo?.totalPageviews) || 0;
        const pct = total ? Math.round((pv / total) * 100) : 0;
        return `${pct}%`;
      },
    },
  ];

  return (
    <div style={{ paddingTop: 14 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: "#0b3e91",
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          Trafik Pengunjung (SEO)
          {seo?.label && (
            <span
              style={{
                color: "#8aa0c8",
                marginLeft: 4,
                fontWeight: 600,
                fontSize: 12,
              }}
            >
              {seo.label} · {(seo.totalPageviews || 0).toLocaleString("id-ID")}{" "}
              pageviews
            </span>
          )}
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <Segmented
            size="small"
            value={seo?.metric}
            onChange={onMetricChange}
            options={[
              { label: "Visitors", value: "visitors" },
              { label: "Sessions", value: "sessions" },
              { label: "Pageviews", value: "pageviews" },
            ]}
          />
          <Segmented
            size="small"
            value={seo?.group}
            onChange={onGroupChange}
            options={[
              { label: "Harian", value: "day" },
              { label: "Mingguan", value: "week" },
              { label: "Bulanan", value: "month" },
              { label: "Tahunan", value: "year" },
            ]}
          />
          <Segmented
            size="small"
            value={seo?.period}
            onChange={onPeriodChange}
            options={seo?.periodOptions || []}
          />
        </div>
      </div>

      {/* Chart */}
      {loading?.seo ? (
        <Loading label="Memuat grafik SEO…" />
      ) : !points.length ? (
        <div style={{ padding: "20px 0" }}>
          <Empty description="Belum ada data untuk rentang ini" />
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <div style={{ minWidth: 720 }}>
            <LineChart
              points={points}
              height={280}
              color={metricColor(seo?.metric)}
            />
          </div>
        </div>
      )}

      {/* Top Pages */}
      <div style={{ marginTop: 16 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <Text strong style={{ fontSize: 14, color: "#0b3e91" }}>
            Top Pages
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {seo?.top?.length || 0} paths • periode {seo?.label || "-"}
          </Text>
        </div>
        {loading?.seoTop ? (
          <Loading label="Memuat top pages…" />
        ) : (
          <Table
            size="small"
            rowKey="path"
            columns={topColumns}
            dataSource={seo?.top || []}
            pagination={false}
            bordered
          />
        )}
      </div>
    </div>
  );
}
