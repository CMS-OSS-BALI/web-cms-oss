// app/(view)/admin/(panel)/events/components/EventsCharts.jsx
"use client";

import { Skeleton, Empty, Button } from "antd";
import { BarChartOutlined } from "@ant-design/icons";
import styles from "../eventsStyles";

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
          <div style={styles.chartCard}>
            <div style={styles.chartTitle}>Student</div>
            {loading ? (
              <Skeleton active paragraph={{ rows: 3 }} />
            ) : (student || []).length === 0 ? (
              <Empty description="Belum ada data" />
            ) : (
              <div style={styles.barsArea}>
                {student.map((it) => (
                  <div key={it.id} style={styles.barItem}>
                    <div style={styles.barCol}>
                      <div
                        style={{
                          ...styles.barInner,
                          height: `${Math.min(100, it.percent)}%`,
                        }}
                        title={`${it.label}: ${it.value}`}
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

          <div style={styles.chartCard}>
            <div style={styles.chartTitle}>Representative</div>
            {loading ? (
              <Skeleton active paragraph={{ rows: 3 }} />
            ) : (rep || []).length === 0 ? (
              <Empty description="Belum ada data" />
            ) : (
              <div style={styles.barsArea}>
                {rep.map((it) => (
                  <div key={it.id} style={styles.barItem}>
                    <div style={styles.barCol}>
                      <div
                        style={{
                          ...styles.barInnerAlt,
                          height: `${Math.min(100, it.percent)}%`,
                        }}
                        title={`${it.label}: ${it.value}`}
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
