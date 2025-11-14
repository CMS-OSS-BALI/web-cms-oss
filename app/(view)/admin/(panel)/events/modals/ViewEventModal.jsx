// app/(view)/admin/(panel)/events/modals/ViewEventModal.jsx
"use client";

import { Modal, Spin } from "antd";
import styles from "../eventsStyles";
import { fmtDateId, stripTags } from "../utils/eventUtils";

export default function ViewEventModal({ open, loading, data, onClose }) {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={920}
      destroyOnClose
      title={null}
    >
      <div style={styles.modalShell}>
        <Spin spinning={loading}>
          {!data ? null : (
            <div style={{ display: "grid", gap: 10 }}>
              <div style={styles.coverWrap}>
                <div style={styles.coverBox}>
                  {data.banner_url ? (
                    <img
                      src={data.banner_url}
                      alt="banner" title="banner"
                      style={styles.coverImg}
                    />
                  ) : (
                    <div style={styles.coverPlaceholder}>Tidak ada banner</div>
                  )}
                </div>
              </div>

              <div>
                <div style={styles.label}>Judul (Bahasa Indonesia)</div>
                <div style={styles.value}>{data.title_id || "—"}</div>
              </div>
              <div>
                <div style={styles.label}>Deskripsi (Bahasa Indonesia)</div>
                <div style={{ ...styles.value, whiteSpace: "pre-wrap" }}>
                  {stripTags(data.description_id) || "—"}
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                <div>
                  <div style={styles.label}>Mulai</div>
                  <div style={styles.value}>{fmtDateId(data.start_at)}</div>
                </div>
                <div>
                  <div style={styles.label}>Selesai</div>
                  <div style={styles.value}>{fmtDateId(data.end_at)}</div>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                <div>
                  <div style={styles.label}>Lokasi</div>
                  <div style={styles.value}>{data.location || "—"}</div>
                </div>
                <div>
                  <div style={styles.label}>Kategori</div>
                  <div style={styles.value}>{data.category_name || "—"}</div>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                <div>
                  <div style={styles.label}>Capacity</div>
                  <div style={styles.value}>
                    {data.capacity == null ? "Tanpa batas" : data.capacity}
                  </div>
                </div>
                <div>
                  <div style={styles.label}>Status</div>
                  <div style={styles.value}>
                    {data.is_published ? "Published" : "Draft"}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                <div>
                  <div style={styles.label}>Tipe Tiket</div>
                  <div style={styles.value}>{data.pricing_type}</div>
                </div>
                <div>
                  <div style={styles.label}>Harga Tiket</div>
                  <div style={styles.value}>
                    {data.pricing_type === "PAID"
                      ? new Intl.NumberFormat("id-ID", {
                          style: "currency",
                          currency: "IDR",
                        }).format(data.ticket_price || 0)
                      : "—"}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                <div>
                  <div style={styles.label}>Booth Price</div>
                  <div style={styles.value}>
                    {new Intl.NumberFormat("id-ID", {
                      style: "currency",
                      currency: "IDR",
                    }).format(data.booth_price || 0)}
                  </div>
                </div>
                <div>
                  <div style={styles.label}>Booth Quota</div>
                  <div style={styles.value}>
                    {data.booth_quota == null ? "—" : data.booth_quota}
                  </div>
                </div>
              </div>
            </div>
          )}
        </Spin>
      </div>
    </Modal>
  );
}
