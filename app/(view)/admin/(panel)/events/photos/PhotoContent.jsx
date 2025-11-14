// app/(view)/admin/events/photos/PhotoContent.jsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ConfigProvider,
  Button,
  Modal,
  Form,
  Upload,
  Empty,
  Skeleton,
  Popconfirm,
  Tooltip,
  Select,
  notification,
} from "antd";
import {
  PlusCircleOutlined,
  EyeOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  StopOutlined,
} from "@ant-design/icons";

/* ===== tokens ===== */
const TOKENS = {
  shellW: "94%",
  maxW: 1140,
  blue: "#0b56c9",
  text: "#0f172a",
};

/* ===== copy (ID) ===== */
const T = {
  title: "Manajemen Foto Event",
  totalLabel: "Foto",
  listTitle: "Data Foto Event",
  addNew: "Upload Foto Baru",
  status: "Status",
  uploadedAt: "Tanggal",
  action: "Aksi",
  cover: "Foto",
  save: "Simpan",
  filterAll: "Semua",
  filterPublished: "Publish",
  filterUnpublished: "Draft",
  publishedBadge: "Publish",
  unpublishedBadge: "Draft",
};

const monthsId = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const fmtDateId = (dLike) => {
  if (dLike === null || dLike === undefined || dLike === "") return "-";
  try {
    const dt =
      typeof dLike === "number" ? new Date(dLike) : new Date(String(dLike));
    if (Number.isNaN(dt.getTime())) return "-";
    return `${dt.getDate()} ${monthsId[dt.getMonth()]} ${dt.getFullYear()}`;
  } catch {
    return "-";
  }
};

export default function PhotoContent({ vm }) {
  const [api, contextHolder] = notification.useNotification();
  const toast = {
    ok: (m, d) =>
      api.success({ message: m, description: d, placement: "topRight" }),
    err: (m, d) =>
      api.error({ message: m, description: d, placement: "topRight" }),
    info: (m, d) =>
      api.info({ message: m, description: d, placement: "topRight" }),
  };

  const [createOpen, setCreateOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [activeRow, setActiveRow] = useState(null);
  const [formCreate] = Form.useForm();
  const [coverPrevCreate, setCoverPrevCreate] = useState("");

  // revoke object URL on unmount
  useEffect(() => {
    return () => {
      if (coverPrevCreate) URL.revokeObjectURL(coverPrevCreate);
    };
  }, [coverPrevCreate]);

  const rows = useMemo(() => vm.photos || [], [vm.photos]);

  const isImg = (f) =>
    ["image/jpeg", "image/png", "image/webp"].includes(f?.type || "");
  const tooBig = (f, mb = 10) => (f?.size || 0) / 1024 / 1024 > mb;
  const normList = (e) => (Array.isArray(e) ? e : e?.fileList || []);

  const beforeCoverCreate = useCallback(
    (file) => {
      if (!isImg(file)) {
        toast.err(
          "File tidak didukung",
          "Gunakan gambar dengan format JPEG, PNG, atau WebP."
        );
        return Upload.LIST_IGNORE;
      }
      if (tooBig(file, 10)) {
        toast.err(
          "File terlalu besar",
          "Ukuran maksimum 10MB. Kompres gambar terlebih dahulu."
        );
        return Upload.LIST_IGNORE;
      }
      try {
        const url = URL.createObjectURL(file);
        if (coverPrevCreate) URL.revokeObjectURL(coverPrevCreate);
        setCoverPrevCreate(url);
      } catch {}
      return false;
    },
    [coverPrevCreate, toast]
  );

  const onCreate = useCallback(async () => {
    const v = await formCreate.validateFields().catch(() => null);
    if (!v) return;
    const image = v.image?.[0]?.originFileObj || null;

    // dropdown draft/publish → boolean
    const status = v.status || "published"; // default publish
    const is_published = status === "published";

    const res = await vm.createPhoto({ image, is_published });
    if (res.ok) {
      toast.ok("Tersimpan", "Foto event berhasil diupload.");
      setCreateOpen(false);
      formCreate.resetFields();
      if (coverPrevCreate) URL.revokeObjectURL(coverPrevCreate);
      setCoverPrevCreate("");
    } else {
      toast.err("Gagal", res.error || "Gagal mengupload foto event.");
    }
  }, [formCreate, vm, coverPrevCreate, toast]);

  const onTogglePublish = useCallback(
    async (row) => {
      const targetStatus = !row.is_published;
      const res = await vm.updatePhotoPublished(row.id, targetStatus);
      if (res.ok) {
        toast.ok(
          "Berhasil",
          targetStatus
            ? "Foto berhasil dipublish ke slider."
            : "Foto di-set sebagai draft (tidak tampil di slider)."
        );
      } else {
        toast.err("Gagal", res.error || "Gagal mengubah status publish.");
      }
    },
    [vm, toast]
  );

  const onDelete = useCallback(
    async (id) => {
      const res = await vm.deletePhoto(id);
      if (!res.ok) {
        return toast.err("Gagal", res.error || "Tidak bisa menghapus foto.");
      }
      toast.ok("Terhapus", "Foto event berhasil dihapus.");
    },
    [vm, toast]
  );

  const openView = useCallback(
    (row) => {
      setActiveRow(row);
      setViewOpen(true);
    },
    [setActiveRow, setViewOpen]
  );

  const onChangeFilter = useCallback(
    (value) => {
      vm.setFilter?.(value || "all");
    },
    [vm]
  );

  const { shellW, maxW, blue, text } = TOKENS;

  return (
    <ConfigProvider
      componentSize="middle"
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
        components: { Button: { borderRadius: 10 } },
      }}
    >
      {contextHolder}

      {/* Global style untuk uploader 16:9 */}
      <style jsx global>{`
        .landscape-uploader.ant-upload.ant-upload-select-picture-card {
          width: 320px !important;
          height: 180px !important;
          padding: 0 !important;
        }
        .landscape-uploader .ant-upload {
          width: 100% !important;
          height: 100% !important;
        }
      `}</style>

      <section
        style={{
          width: "100%",
          position: "relative",
          minHeight: "100dvh",
          display: "flex",
          alignItems: "flex-start",
          padding: "56px 0",
          overflowX: "hidden",
        }}
      >
        {/* background layer */}
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
            paddingTop: 12,
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* Header Card */}
          <div style={styles.cardOuter}>
            <div style={styles.cardHeaderBar} />
            <div style={styles.cardInner}>
              <div style={styles.cardTitle}>{T.title}</div>
              <div style={styles.totalBadgeWrap}>
                <div style={styles.totalBadgeLabel}>{T.totalLabel}</div>
                <div style={styles.totalBadgeValue}>
                  {vm.total ?? rows.length ?? "—"}
                </div>
              </div>
            </div>
          </div>

          {/* Data Card */}
          <div style={{ ...styles.cardOuter, marginTop: 12 }}>
            <div style={{ ...styles.cardInner, paddingTop: 14 }}>
              <div style={styles.sectionHeader}>
                <div style={styles.sectionTitle}>{T.listTitle}</div>
                <Button
                  type="primary"
                  icon={<PlusCircleOutlined />}
                  onClick={() => setCreateOpen(true)}
                >
                  {T.addNew}
                </Button>
              </div>

              {/* Filter publish */}
              <div style={styles.filtersRow}>
                <Select
                  value={vm.filter || "all"}
                  onChange={onChangeFilter}
                  style={{ width: 200 }}
                  options={[
                    { value: "all", label: T.filterAll },
                    { value: "published", label: T.filterPublished },
                    { value: "unpublished", label: T.filterUnpublished },
                  ]}
                />
              </div>

              {/* Table header */}
              <div style={styles.tableHeader}>
                <div style={{ ...styles.thLeft, paddingLeft: 8 }}>
                  {T.cover}
                </div>
                <div style={styles.thCenter}>{T.status}</div>
                <div style={styles.thCenter}>{T.uploadedAt}</div>
                <div style={styles.thCenter}>{T.action}</div>
              </div>

              {/* Rows */}
              <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
                {vm.loading ? (
                  <div style={{ padding: "8px 4px" }}>
                    <Skeleton active paragraph={{ rows: 2 }} />
                  </div>
                ) : rows.length === 0 ? (
                  <div
                    style={{
                      display: "grid",
                      placeItems: "center",
                      padding: "20px 0",
                    }}
                  >
                    <Empty description="Belum ada foto event" />
                  </div>
                ) : (
                  rows.map((r) => (
                    <div key={r.id} style={styles.row}>
                      {/* Foto */}
                      <div style={styles.colPhoto}>
                        <div style={styles.photoThumbWrap}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={r.image_src || ""}
                            alt="Foto event"
                            title="Foto event"
                            style={styles.photoThumb}
                          />
                        </div>
                      </div>

                      {/* Status */}
                      <div style={styles.colCenter}>
                        <span
                          style={
                            r.is_published
                              ? styles.badgePublished
                              : styles.badgeDraft
                          }
                        >
                          {r.is_published
                            ? T.publishedBadge
                            : T.unpublishedBadge}
                        </span>
                      </div>

                      {/* Tanggal */}
                      <div style={styles.colCenter}>
                        {fmtDateId(r.created_ts || r.created_at)}
                      </div>

                      {/* Actions */}
                      <div style={styles.colActionsCenter}>
                        <Tooltip title="Lihat besar">
                          <Button
                            size="small"
                            aria-label="lihat"
                            icon={<EyeOutlined />}
                            onClick={() => openView(r)}
                            style={styles.iconBtn}
                          />
                        </Tooltip>

                        <Tooltip
                          title={
                            r.is_published
                              ? "Set jadi draft"
                              : "Publish ke slider"
                          }
                        >
                          <Button
                            size="small"
                            aria-label="toggle publish"
                            icon={
                              r.is_published ? (
                                <StopOutlined />
                              ) : (
                                <CheckCircleOutlined />
                              )
                            }
                            onClick={() => onTogglePublish(r)}
                            style={styles.iconBtn}
                            loading={vm.opLoading}
                          />
                        </Tooltip>

                        <Tooltip title="Hapus">
                          <Popconfirm
                            title="Hapus foto event ini?"
                            okText="Ya"
                            cancelText="Batal"
                            onConfirm={() => onDelete(r.id)}
                          >
                            <Button
                              size="small"
                              danger
                              aria-label="hapus"
                              icon={<DeleteOutlined />}
                              style={styles.iconBtn}
                              loading={vm.opLoading}
                            />
                          </Popconfirm>
                        </Tooltip>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Create Modal ===== */}
      <Modal
        open={createOpen}
        onCancel={() => {
          setCreateOpen(false);
          if (coverPrevCreate) URL.revokeObjectURL(coverPrevCreate);
          setCoverPrevCreate("");
          formCreate.resetFields();
        }}
        footer={null}
        width={760}
        destroyOnClose
        title={null}
      >
        <div style={styles.modalShell}>
          <Form layout="vertical" form={formCreate}>
            <div style={styles.coverWrap}>
              <Form.Item
                name="image"
                valuePropName="fileList"
                getValueFromEvent={normList}
                noStyle
                rules={[{ required: true, message: "Foto wajib diisi" }]}
              >
                <Upload
                  accept="image/*"
                  listType="picture-card"
                  showUploadList={false}
                  beforeUpload={beforeCoverCreate}
                  className="landscape-uploader"
                >
                  <div style={styles.coverBox}>
                    {coverPrevCreate ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={coverPrevCreate}
                        alt="preview"
                        title="preview"
                        style={styles.coverImg}
                      />
                    ) : (
                      <div style={styles.coverPlaceholder}>+ Foto (16:9)</div>
                    )}
                  </div>
                </Upload>
              </Form.Item>
              <div style={styles.coverHint}>
                Sistem akan otomatis memotong gambar ke rasio{" "}
                <b>16:9 (landscape)</b> dan menyimpannya dalam format WebP.
                Gunakan gambar horizontal agar hasil lebih maksimal.
              </div>
            </div>

            {/* Dropdown Draft / Publish */}
            <Form.Item
              name="status"
              label={T.status}
              initialValue="published"
              rules={[{ required: true, message: "Status wajib dipilih" }]}
            >
              <Select
                options={[
                  { value: "published", label: T.filterPublished },
                  { value: "unpublished", label: T.filterUnpublished },
                ]}
              />
            </Form.Item>

            <div style={styles.modalFooter}>
              <Button
                type="primary"
                size="large"
                onClick={onCreate}
                loading={vm.opLoading}
                style={styles.saveBtn}
              >
                {T.save}
              </Button>
            </div>
          </Form>
        </div>
      </Modal>

      {/* ===== View Modal ===== */}
      <Modal
        open={viewOpen}
        onCancel={() => {
          setViewOpen(false);
          setActiveRow(null);
        }}
        footer={null}
        width={820}
        destroyOnClose
        title={null}
      >
        <div style={styles.modalShell}>
          {activeRow ? (
            <>
              <div style={styles.coverBoxRead}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={activeRow.image_src || ""}
                  alt="Foto event"
                  title="Foto event"
                  style={styles.coverImgRead}
                />
              </div>
              <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                <div>
                  <div style={styles.label}>{T.status}</div>
                  <div style={styles.value}>
                    {activeRow.is_published
                      ? T.publishedBadge
                      : T.unpublishedBadge}
                  </div>
                </div>
                <div>
                  <div style={styles.label}>{T.uploadedAt}</div>
                  <div style={styles.value}>
                    {fmtDateId(
                      activeRow.created_ts || activeRow.created_at || ""
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </Modal>
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
  cardHeaderBar: {
    height: 20,
    background:
      "linear-gradient(90deg, #0b56c9 0%, #0b56c9 65%, rgba(11,86,201,0.35) 100%)",
  },
  cardInner: { padding: "12px 14px 14px", position: "relative" },
  cardTitle: {
    fontSize: 18,
    fontWeight: 800,
    color: "#0b3e91",
    marginTop: 8,
    marginBottom: 8,
  },
  totalBadgeWrap: {
    position: "absolute",
    right: 14,
    top: 8,
    display: "grid",
    gap: 4,
    justifyItems: "end",
    background: "#fff",
    border: "1px solid #e6eeff",
    borderRadius: 12,
    padding: "6px 12px",
    boxShadow: "0 6px 18px rgba(11,86,201,0.08)",
  },
  totalBadgeLabel: { fontSize: 12, color: "#0b3e91", fontWeight: 600 },
  totalBadgeValue: {
    fontSize: 16,
    color: "#0b56c9",
    fontWeight: 800,
    lineHeight: 1,
  },

  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 18, fontWeight: 800, color: "#0b3e91" },

  filtersRow: {
    display: "flex",
    justifyContent: "flex-end",
    marginBottom: 10,
  },

  tableHeader: {
    display: "grid",
    gridTemplateColumns: "2fr 0.8fr 0.9fr 0.7fr",
    gap: 8,
    marginBottom: 4,
    color: "#0b3e91",
    fontWeight: 700,
    alignItems: "center",
  },
  thLeft: { display: "flex", justifyContent: "flex-start", width: "100%" },
  thCenter: { display: "flex", justifyContent: "center", width: "100%" },

  row: {
    display: "grid",
    gridTemplateColumns: "2fr 0.8fr 0.9fr 0.7fr",
    gap: 8,
    alignItems: "center",
    background: "#f5f8ff",
    borderRadius: 10,
    border: "1px solid #e8eeff",
    padding: "8px 10px",
    boxShadow: "0 6px 12px rgba(11, 86, 201, 0.05)",
  },

  colPhoto: {
    background: "#ffffff",
    borderRadius: 10,
    border: "1px solid #eef3ff",
    padding: "6px 10px",
    boxShadow: "0 3px 8px rgba(0,0,0,0.04) inset",
    display: "flex",
    alignItems: "center",
  },
  photoThumbWrap: {
    width: "100%",
    maxWidth: 260,
    aspectRatio: "16 / 9",
    borderRadius: 10,
    overflow: "hidden",
    background: "#e5edff",
  },
  photoThumb: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },

  colCenter: { textAlign: "center", color: "#0f172a", fontWeight: 600 },
  colActionsCenter: { display: "flex", justifyContent: "center", gap: 6 },
  iconBtn: { borderRadius: 8 },

  badgePublished: {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    background: "rgba(22,163,74,0.12)",
    color: "#166534",
    border: "1px solid rgba(22,163,74,0.35)",
  },
  badgeDraft: {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    background: "rgba(148,163,184,0.12)",
    color: "#475569",
    border: "1px solid rgba(148,163,184,0.4)",
  },

  label: { fontSize: 11.5, color: "#64748b" },
  value: {
    fontWeight: 600,
    color: "#0f172a",
    background: "#f8fafc",
    border: "1px solid #e8eeff",
    borderRadius: 10,
    padding: "8px 10px",
    boxShadow: "inset 0 2px 6px rgba(11,86,201,0.05)",
  },

  modalShell: {
    position: "relative",
    background: "#fff",
    borderRadius: 16,
    padding: "14px 14px 8px",
    boxShadow: "0 10px 36px rgba(11,86,201,0.08)",
  },

  coverWrap: {
    display: "grid",
    justifyContent: "center",
    justifyItems: "center",
    marginTop: 6,
    marginBottom: 10,
    gap: 6,
  },
  coverBox: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
    border: "2px dashed #c0c8d8",
    background: "#f8fbff",
    display: "grid",
    placeItems: "center",
    overflow: "hidden",
  },
  coverImg: { width: "100%", height: "100%", objectFit: "cover" },
  coverPlaceholder: { fontWeight: 700, color: "#0b56c9", userSelect: "none" },
  coverHint: {
    fontSize: 11,
    color: "#64748b",
    textAlign: "center",
    maxWidth: 420,
  },

  coverBoxRead: {
    width: "100%",
    borderRadius: 12,
    border: "1px solid #e6eeff",
    overflow: "hidden",
    background: "#f8fbff",
  },
  coverImgRead: { width: "100%", height: "auto", display: "block" },

  modalFooter: { marginTop: 8, display: "grid", placeItems: "center" },
  saveBtn: { minWidth: 200, height: 40, borderRadius: 12 },
};
