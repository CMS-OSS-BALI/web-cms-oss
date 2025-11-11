// app/(view)/admin/(panel)/events/components/EventsCharts.jsx
"use client";

import { Skeleton, Empty, Button } from "antd";
import { BarChartOutlined } from "@ant-design/icons";
import styles from "../eventsStyles";

/* Normalizer agar selalu ada: id, label, short, value, percent */
function normalizeBars(arr) {
  const list = Array.isArray(arr) ? arr : [];
  const vals = list.map((it) => Number(it?.value ?? it?.count ?? 0));
  const max = Math.max(1, ...vals);
  return list.map((it, idx) => {
    const label = String(it?.label ?? it?.title ?? it?.name ?? "Event");
    const value = Number(it?.value ?? it?.count ?? 0) || 0;
    const percentRaw =
      Number.isFinite(it?.percent) && it?.percent >= 0
        ? Number(it.percent)
        : (value / max) * 100;

    return {
      id: it?.id ?? it?.event_id ?? `${label}-${idx}`,
      label,
      short:
        it?.short ??
        (label.length > 10 ? label.slice(0, 9).trim() + "…" : label),
      value,
      percent: Math.max(0, Math.min(100, percentRaw)),
    };
  });
}

export default function EventsCharts({
  show,
  loading,
  student,
  rep,
  onToggle,
}) {
  if (!show) {
    return (
      <div style={{ ...styles.cardOuter, marginTop: 12 }}>
        <div style={{ ...styles.cardInner, paddingTop: 14 }}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionTitle}>Analisis Event</div>
            <Button size="small" icon={<BarChartOutlined />} onClick={onToggle}>
              Tampilkan Grafik
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const studentsNorm = normalizeBars(student);
  const repsNorm = normalizeBars(rep);

  return (
    <div style={{ ...styles.cardOuter, marginTop: 12 }}>
      <div style={{ ...styles.cardInner, paddingTop: 14 }}>
        <div style={styles.sectionHeader}>
          <div style={styles.sectionTitle}>Analisis Event</div>
          <Button size="small" icon={<BarChartOutlined />} onClick={onToggle}>
            Sembunyikan Grafik
          </Button>
        </div>

        <div style={styles.chartsGrid}>
          {/* Student */}
          <div style={styles.chartCard}>
            <div style={styles.chartTitle}>Student</div>
            {loading ? (
              <Skeleton active paragraph={{ rows: 3 }} />
            ) : studentsNorm.length === 0 ? (
              <Empty description="Belum ada data" />
            ) : (
              <div style={styles.barsArea}>
                {studentsNorm.map((it) => (
                  <div key={it.id} style={styles.barItem}>
                    <div style={styles.barCol}>
                      <div
                        style={{ ...styles.barInner, height: `${it.percent}%` }}
                        title={`${it.label}: ${it.value}`}
                        aria-label={`${it.label}: ${it.value}`}
                        role="img"
                      />
                    </div>
                    <div style={styles.barLabel} title={it.label}>
                      {it.short}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Representative */}
          <div style={styles.chartCard}>
            <div style={styles.chartTitle}>Representative</div>
            {loading ? (
              <Skeleton active paragraph={{ rows: 3 }} />
            ) : repsNorm.length === 0 ? (
              <Empty description="Belum ada data" />
            ) : (
              <div style={styles.barsArea}>
                {repsNorm.map((it) => (
                  <div key={it.id} style={styles.barItem}>
                    <div style={styles.barCol}>
                      <div
                        style={{
                          ...styles.barInnerAlt,
                          height: `${it.percent}%`,
                        }}
                        title={`${it.label}: ${it.value}`}
                        aria-label={`${it.label}: ${it.value}`}
                        role="img"
                      />
                    </div>
                    <div style={styles.barLabel} title={it.label}>
                      {it.short}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
