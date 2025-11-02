// app/(view)/admin/(panel)/events/components/EventsHeader.jsx
"use client";

import styles from "../eventsStyles";

export default function EventsHeader({ title, total }) {
  return (
    <div style={styles.cardOuter}>
      <div style={styles.cardHeaderBar} />
      <div style={styles.cardInner}>
        <div style={styles.cardTitle}>{title}</div>
        <div style={styles.totalBadgeWrap}>
          <div style={styles.totalBadgeLabel}>Total Event</div>
          <div style={styles.totalBadgeValue}>{total ?? "—"}</div>
        </div>
      </div>
    </div>
  );
}
