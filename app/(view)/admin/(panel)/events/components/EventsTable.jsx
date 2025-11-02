// app/(view)/admin/(panel)/events/components/EventsTable.jsx
"use client";

import { Button, Tooltip, Popconfirm, Skeleton, Empty, Tag } from "antd";
import {
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  LeftOutlined,
  RightOutlined,
} from "@ant-design/icons";
import styles from "../eventsStyles";
import { fmtDateId, toTs } from "../utils/eventUtils";

function statusPill(s0, e0) {
  const now = Date.now();
  const s = toTs(s0);
  const e = toTs(e0);
  if (s && e) {
    if (now < s) return <Tag color="blue">UPCOMING</Tag>;
    if (now >= s && now <= e) return <Tag color="green">ONGOING</Tag>;
    if (now > e) return <Tag color="default">DONE</Tag>;
  }
  return <Tag>—</Tag>;
}

export default function EventsTable({
  rows,
  loading,
  page,
  totalPages,
  perPage,
  onPrev,
  onNext,
  onView,
  onEdit,
  onDelete,
  opLoading,
}) {
  return (
    <div style={{ ...styles.cardOuter, marginTop: 12 }}>
      <div style={{ ...styles.cardInner, paddingTop: 14 }}>
        <div style={styles.sectionHeader}>
          <div style={styles.sectionTitle}>Daftar Event</div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <div style={styles.tableHeader}>
            <div style={{ ...styles.thLeft, paddingLeft: 8 }}>Nama Event</div>
            <div style={styles.thCenter}>Status</div>
            <div style={styles.thCenter}>Tanggal</div>
            <div style={styles.thCenter}>Tempat</div>
            <div style={styles.thCenter}>Kapasitas</div>
            <div style={styles.thCenter}>Total Rep</div>
            <div style={styles.thCenter}>Aksi</div>
          </div>

          <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
            {loading ? (
              <div style={{ padding: "8px 4px" }}>
                <Skeleton active paragraph={{ rows: 3 }} />
              </div>
            ) : rows.length === 0 ? (
              <div
                style={{
                  display: "grid",
                  placeItems: "center",
                  padding: "20px 0",
                }}
              >
                <Empty description="Belum ada data" />
              </div>
            ) : (
              rows.map((r) => (
                <div key={r.id} style={styles.row}>
                  <div style={styles.colName}>
                    <div style={styles.nameWrap}>
                      <div style={styles.nameText}>
                        {r.title || r.title_id || "(tanpa judul)"}
                      </div>
                      <div style={styles.subDate}>
                        {r.category_name ? `Kategori: ${r.category_name}` : "—"}
                      </div>
                    </div>
                  </div>
                  <div style={styles.colCenter}>
                    {statusPill(r.start_ts || r.start_at, r.end_ts || r.end_at)}
                  </div>
                  <div style={styles.colCenter}>
                    <span style={styles.cellEllipsis}>
                      {fmtDateId(r.start_ts || r.start_at)}
                    </span>
                  </div>
                  <div style={styles.colCenter}>
                    <span style={styles.cellEllipsis}>{r.location || "—"}</span>
                  </div>
                  <div style={styles.colCenter}>
                    <span style={styles.cellEllipsis}>
                      {r.capacity == null ? "∞" : r.capacity}
                    </span>
                  </div>
                  <div style={styles.colCenter}>
                    <span style={styles.cellEllipsis}>
                      {r.booth_sold_count ?? 0}
                    </span>
                  </div>
                  <div style={styles.colActionsCenter}>
                    <Tooltip title="Lihat">
                      <Button
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => onView(r)}
                        style={styles.iconBtn}
                      />
                    </Tooltip>
                    <Tooltip title="Edit">
                      <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => onEdit(r)}
                        style={styles.iconBtn}
                      />
                    </Tooltip>
                    <Tooltip title="Hapus">
                      <Popconfirm
                        title="Hapus event ini?"
                        okText="Ya"
                        cancelText="Batal"
                        onConfirm={() => onDelete(r)}
                      >
                        <Button
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          loading={opLoading}
                          style={styles.iconBtn}
                        />
                      </Popconfirm>
                    </Tooltip>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={styles.pagination}>
          <Button
            icon={<LeftOutlined />}
            onClick={onPrev}
            disabled={(page || 1) <= 1 || loading}
          />
          <div style={styles.pageText}>
            Page {page || 1}
            {totalPages ? ` of ${totalPages}` : ""}
          </div>
          <Button
            icon={<RightOutlined />}
            onClick={onNext}
            disabled={
              loading ||
              (totalPages
                ? (page || 1) >= totalPages
                : rows.length < (perPage || 10))
            }
          />
        </div>
      </div>
    </div>
  );
}
