// app/(view)/admin/dashboard/DashboardContent.jsx
"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { ConfigProvider, Select, Empty, Typography, Tooltip } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import Loading from "@/app/components/loading/LoadingImage";

// ==== Dynamic imports (code splitting)
const PieDonut = dynamic(() => import("@/app/components/charts/PieDonut"), {
  ssr: false,
  loading: () => <Loading label="Memuat chart…" />,
});
const SeoSection = dynamic(() => import("@/app/components/charts/SeoSection"), {
  ssr: false,
  loading: () => <Loading label="Memuat modul SEO…" />,
});

/* ===== tokens ===== */
const TOKENS = { shellW: "94%", maxW: 1140, blue: "#0b56c9", text: "#0f172a" };
const { Title } = Typography;

/* ===== local palette untuk legend (sinkron dengan PieDonut default) ===== */
const PIE_COLORS = [
  "#0b56c9",
  "#5aa8ff",
  "#8ab6ff",
  "#b3d4ff",
  "#d1e5ff",
  "#2c3e50",
];

export default function DashboardContent({ vm }) {
  // NOTE: Hapus instansiasi hook di sini. Kita pakai vm dari props.
  const { shellW, maxW, blue, text } = TOKENS;

  const yearOptions = useMemo(
    () => (vm?.years ?? []).map((y) => ({ value: y, label: String(y) })),
    [vm?.years]
  );

  const leadsSlices = useMemo(() => {
    if (vm?.yearA == null || vm?.yearB == null) return [];
    const a = Number(vm.yearA);
    const b = Number(vm.yearB);
    return [
      { label: String(a), value: vm?.leadsA?.total ?? 0 },
      { label: String(b), value: vm?.leadsB?.total ?? 0 },
    ];
  }, [vm?.yearA, vm?.yearB, vm?.leadsA?.total, vm?.leadsB?.total]);

  const repsSlices = useMemo(() => {
    if (vm?.yearA == null || vm?.yearB == null) return [];
    const a = Number(vm.yearA);
    const b = Number(vm.yearB);
    return [
      { label: String(a), value: vm?.repsA?.total ?? 0 },
      { label: String(b), value: vm?.repsB?.total ?? 0 },
    ];
  }, [vm?.yearA, vm?.yearB, vm?.repsA?.total, vm?.repsB?.total]);

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: blue,
          colorText: text,
          fontFamily:
            '"Public Sans", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
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
                      value={vm?.yearA ?? undefined}
                      options={yearOptions}
                      onChange={vm?.setYearA}
                    />
                    <Select
                      allowClear
                      placeholder="Pilih tahun B"
                      value={vm?.yearB ?? undefined}
                      options={yearOptions}
                      onChange={vm?.setYearB}
                    />
                  </div>
                </div>

                {vm?.loading?.leads ? (
                  <Loading label="Memuat ringkasan leads…" />
                ) : !vm?.yearA || !vm?.yearB ? (
                  <div style={{ padding: 16 }}>
                    <Empty description="Pilih kedua tahun untuk melihat perbandingan" />
                  </div>
                ) : (
                  <div style={styles.donutRow}>
                    <PieDonut
                      data={leadsSlices}
                      size={240}
                      inner={90}
                      centerTitle="Total Leads"
                    />

                    {/* Legend */}
                    <div style={styles.legendWrap}>
                      {leadsSlices.map((s, i) => {
                        const isA = vm?.yearA === Number(s.label);
                        const count = isA
                          ? vm?.leadsA?.total ?? 0
                          : vm?.leadsB?.total ?? 0;
                        return (
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
                                {count} data
                              </div>
                            </div>
                            <div style={styles.legendNum}>{count}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Representative Donut */}
            <div style={styles.cardOuter}>
              <div style={styles.cardInner}>
                <div style={styles.sectionHeader}>
                  <div style={styles.sectionTitle}>
                    Peningkatan Representative
                    <Tooltip title="Jumlah leads yang telah di-assign ke representative">
                      <InfoCircleOutlined
                        style={{ marginLeft: 6, color: "#8aa0c8" }}
                      />
                    </Tooltip>
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
                      value={vm?.yearA ?? undefined}
                      options={yearOptions}
                      onChange={vm?.setYearA}
                    />
                    <Select
                      allowClear
                      placeholder="Pilih tahun B"
                      value={vm?.yearB ?? undefined}
                      options={yearOptions}
                      onChange={vm?.setYearB}
                    />
                  </div>
                </div>

                {vm?.loading?.leads ? (
                  <Loading label="Memuat representative…" />
                ) : !vm?.yearA || !vm?.yearB ? (
                  <div style={{ padding: 16 }}>
                    <Empty description="Pilih kedua tahun untuk melihat perbandingan" />
                  </div>
                ) : (
                  <div style={styles.donutRow}>
                    <PieDonut
                      data={repsSlices}
                      size={240}
                      inner={90}
                      centerTitle="Total Representative"
                    />
                    <div style={styles.legendWrap}>
                      {repsSlices.map((s, i) => {
                        const isA = vm?.yearA === Number(s.label);
                        const count = isA
                          ? vm?.repsA?.total ?? 0
                          : vm?.repsB?.total ?? 0;
                        return (
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
                                {count} data
                              </div>
                            </div>
                            <div style={styles.legendNum}>{count}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ============ SEO Traffic Section (dipisah ke komponen) ============ */}
          <div style={styles.cardOuter}>
            <div style={styles.cardInner}>
              <SeoSection
                seo={vm?.seo}
                loading={vm?.loading}
                error={vm?.error}
                onMetricChange={vm?.setSeoMetric}
                onGroupChange={vm?.setSeoGroup}
                onPeriodChange={vm?.setSeoPeriod}
              />
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

