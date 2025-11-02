// app/(view)/admin/(panel)/events/components/EventsStats.jsx
"use client";

import Image from "next/image";
import styles from "../eventsStyles";
import { fmtIDR } from "../utils/eventUtils";

export default function EventsStats({
  totalStudents,
  totalReps,
  totalRevenue,
  totalStudentsLoading,
}) {
  return (
    <div style={styles.statsRow}>
      <div style={styles.statCard}>
        <div style={styles.statIconBox}>
          <Image
            src="/simbolstudent.png"
            alt="Student"
            width={28}
            height={28}
            style={styles.statIconImg}
            priority
          />
        </div>
        <div style={styles.statTitle}>Total Student</div>
        <div style={styles.statValue}>
          {totalStudentsLoading ? "…" : totalStudents ?? "—"}
        </div>
      </div>

      <div style={styles.statCard}>
        <div style={styles.statIconBox}>
          <Image
            src="/simbolrep.png"
            alt="Rep"
            width={28}
            height={28}
            style={styles.statIconImg}
            priority
          />
        </div>
        <div style={styles.statTitle}>Total Representative</div>
        <div style={styles.statValue}>{totalReps ?? "—"}</div>
      </div>

      <div style={styles.statCard}>
        <div style={styles.statIconBox}>
          <Image
            src="/revenue.png"
            alt="Revenue"
            width={28}
            height={28}
            style={styles.statIconImg}
            priority
          />
        </div>
        <div style={styles.statTitle}>Total Revenue</div>
        <div
          style={styles.statValue}
          title="Estimasi dari booth sold x booth price"
        >
          {fmtIDR(totalRevenue || 0)}
        </div>
      </div>
    </div>
  );
}
