// app/(view)/admin/(panel)/events/components/EventsTable.jsx
// -*- coding: utf-8 -*-
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

/* =========================
   A11Y-safe text sanitizers
========================= */
const A11Y_DASH = "-";
const A11Y_NA = "Tidak tersedia";

/** Deteksi string 'aneh' yang umum muncul dari mojibake */
function isMojibake(s) {
  if (s == null) return true;
  const str = String(s).trim();

  // kosong setelah trim
  if (!str) return true;

  // karakter pengganti / kontrol ASCII
  if (str.includes("�") || /[\u0000-\u001F\u007F]/.test(str)) return true;

  // pola placeholder umum yang bocor ke UI
  if (/^(\?+|["']?\?["']?|(\^z))$/i.test(str)) return true;

  return false;
}

/** Normalisasi tampilan text */
function normalizeDisplay(val, { fallback = A11Y_DASH } = {}) {
  if (val == null) return fallback;
  const s = String(val).trim();
  if (isMojibake(s)) return fallback;

  // Hilangkan spasi berulang
  const collapsed = s.replace(/\s+/g, " ");
  // Jika setelah buang huruf/angka tak ada apa-apa -> fallback
  const meaningful = collapsed.replace(/[\s\p{P}\p{S}]+/gu, "");
  if (!meaningful) return fallback;

  return collapsed;
}

/** Khusus judul: fallback yang lebih informatif */
function normalizeTitle(title, titleId) {
  const primary = normalizeDisplay(title, { fallback: "" });
  if (primary) return primary;
  const alt = normalizeDisplay(titleId, { fallback: "" });
  if (alt) return alt;
  return "(Tanpa judul)";
}

/** Status pill */
function statusPill(s0, e0) {
  const now = Date.now();
  const s = toTs(s0);
  const e = toTs(e0);
  if (s && e) {
    if (now < s) return <Tag color="blue">UPCOMING</Tag>;
    if (now >= s && now <= e) return <Tag color="green">ONGOING</Tag>;
    if (now > e) return <Tag color="default">DONE</Tag>;
  }
  return <Tag>{A11Y_DASH}</Tag>;
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
  const safeRows = Array.isArray(rows) ? rows : [];

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
            ) : safeRows.length === 0 ? (
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
              safeRows.map((r) => {
                const title = normalizeTitle(r.title, r.title_id);
                const category = normalizeDisplay(r.category_name, {
                  fallback: A11Y_NA,
                });
                const dateStr = normalizeDisplay(
                  fmtDateId(r.start_ts || r.start_at),
                  { fallback: A11Y_DASH }
                );
                const location = normalizeDisplay(r.location, {
                  fallback: A11Y_DASH,
                });
                const capacity =
                  r.capacity == null || r.capacity === ""
                    ? "∞"
                    : normalizeDisplay(r.capacity, { fallback: A11Y_DASH });
                const boothSold = Number(r.booth_sold_count ?? 0);

                return (
                  <div key={r.id} style={styles.row}>
                    <div style={styles.colName}>
                      <div style={styles.nameWrap}>
                        <div style={styles.nameText}>{title}</div>
                        <div style={styles.subDate}>
                          {category === A11Y_NA
                            ? A11Y_DASH
                            : `Kategori: ${category}`}
                        </div>
                      </div>
                    </div>

                    <div style={styles.colCenter}>
                      {statusPill(
                        r.start_ts || r.start_at,
                        r.end_ts || r.end_at
                      )}
                    </div>

                    <div style={styles.colCenter}>
                      <span style={styles.cellEllipsis}>{dateStr}</span>
                    </div>

                    <div style={styles.colCenter}>
                      <span style={styles.cellEllipsis}>{location}</span>
                    </div>

                    <div style={styles.colCenter}>
                      <span style={styles.cellEllipsis}>{capacity}</span>
                    </div>

                    <div style={styles.colCenter}>
                      <span style={styles.cellEllipsis}>{boothSold}</span>
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
                );
              })
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
                : safeRows.length < (perPage || 10))
            }
          />
        </div>
      </div>
    </div>
  );
}
