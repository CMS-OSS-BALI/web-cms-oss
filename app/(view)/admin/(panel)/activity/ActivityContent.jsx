"use client";

import { useEffect, useMemo, useState } from "react";
import useActivityViewModel from "./useActivityViewModel";
import {
  ConfigProvider,
  Button,
  Modal,
  Form,
  Input,
  Upload,
  Empty,
  Skeleton,
  Popconfirm,
  Tooltip,
  Spin,
  Select,
} from "antd";
import {
  PlusCircleOutlined,
  EyeOutlined,
  DeleteOutlined,
  EditOutlined,
  LeftOutlined,
  RightOutlined,
  SearchOutlined,
} from "@ant-design/icons";

/* ===== compact tokens ===== */
const TOKENS = {
  shellW: "94%",
  maxW: 1140,
  blue: "#0b56c9",
  text: "#0f172a",
};

const T = {
  title: "Manajemen Aktivitas",
  totalLabel: "Total Aktivitas",
  listTitle: "Data Aktivitas",
  addNew: "Buat Data Baru",
  searchPh: "Cari judul aktivitas",
  nameCol: "Nama Aktivitas",
  pubCol: "Publikasi",
  action: "Aksi",
  view: "Lihat",
  edit: "Edit",
  del: "Hapus",
  save: "Simpan",

  cover: "Gambar (9:16)",
  name: "Judul (ID)",
  desc: "Deskripsi (opsional)",
  status: "Status",
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
    if (isNaN(dt.getTime())) return "-";
    return `${dt.getDate()} ${monthsId[dt.getMonth()]}`;
  } catch {
    return "-";
  }
};

const isImg = (f) =>
  ["image/jpeg", "image/png", "image/webp"].includes(f?.type || "");
const tooBig = (f, mb = 10) => f.size / 1024 / 1024 > mb;

export default function ActivityContent(props) {
  const vm =
    props && Object.prototype.hasOwnProperty.call(props, "activities")
      ? props
      : useActivityViewModel({
          locale: props?.locale || "id",
          isPublished: true,
        });

  // ----- UI state
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [activeRow, setActiveRow] = useState(null);
  const [formCreate] = Form.useForm();
  const [formEdit] = Form.useForm();
  const [coverPrevCreate, setCoverPrevCreate] = useState("");
  const [coverPrevEdit, setCoverPrevEdit] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState(null);

  const rows = useMemo(() => vm.activities || [], [vm.activities]);

  // === Search (auto) ===
  const [searchValue, setSearchValue] = useState(vm.q || "");
  useEffect(() => setSearchValue(vm.q || ""), [vm.q]);
  useEffect(() => {
    const v = (searchValue || "").trim();
    const t = setTimeout(() => {
      vm.setQ?.(v);
      vm.setPage?.(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchValue]); // eslint-disable-line

  // === Filter publish (Draft/Published only) ===
  const pubFilter = useMemo(
    () => (vm.isPublished === false ? "draft" : "published"),
    [vm.isPublished]
  );
  const onChangePubFilter = (v) => {
    vm.setIsPublished?.(v === "published");
    vm.setPage?.(1);
  };

  // upload handlers 9:16
  const normList = (e) => (Array.isArray(e) ? e : e?.fileList || []);
  const beforeCoverCreate = (file) => {
    if (!isImg(file) || tooBig(file, 10)) return Upload.LIST_IGNORE;
    try {
      setCoverPrevCreate(URL.createObjectURL(file));
    } catch {}
    return false;
  };
  const beforeCoverEdit = (file) => {
    if (!isImg(file) || tooBig(file, 10)) return Upload.LIST_IGNORE;
    try {
      setCoverPrevEdit(URL.createObjectURL(file));
    } catch {}
    return false;
  };

  // ===== create
  const onCreate = async () => {
    const v = await formCreate.validateFields().catch(() => null);
    if (!v) return;
    const file = v.cover?.[0]?.originFileObj || null;

    const out = await vm.createActivity({
      file,
      name_id: v.name,
      description_id: v.description || "",
      is_published: v.status === "published",
      autoTranslate: true,
    });

    if (!out.ok) {
      Modal.error({ title: "Gagal", content: out.error || "Gagal menyimpan" });
      return;
    }
    setCreateOpen(false);
    formCreate.resetFields();
    setCoverPrevCreate("");
  };

  // ===== edit (load)
  const openEdit = async (row) => {
    setActiveRow(row);
    setEditOpen(true);
    setDetailLoading(true);
    setDetailData(null);
    const { ok, data, error } = await vm.getActivity(row.id);
    setDetailLoading(false);
    if (!ok) {
      setEditOpen(false);
      return Modal.error({ title: "Gagal memuat", content: error });
    }
    const d = data || row;
    setDetailData(d);
    formEdit.setFieldsValue({
      name: d.name || row.title || "",
      description: d.description || "",
      status: d.is_published ? "published" : "draft",
    });
    setCoverPrevEdit(d.image_url || row.image_src || "");
  };

  // ===== edit (submit)
  const onEditSubmit = async () => {
    if (!activeRow) return;
    const v = await formEdit.validateFields().catch(() => null);
    if (!v) return;
    const file = v.cover?.[0]?.originFileObj || null;

    const res = await vm.updateActivity(activeRow.id, {
      ...(file ? { file } : {}),
      name_id: v.name,
      description_id: v.description || "",
      is_published: v.status === "published",
      autoTranslate: true,
    });

    if (!res.ok) {
      return Modal.error({
        title: "Gagal",
        content: res.error || "Gagal menyimpan",
      });
    }
    setEditOpen(false);
    formEdit.resetFields();
    setCoverPrevEdit("");
  };

  const onDelete = async (id) => {
    const res = await vm.deleteActivity(id);
    if (!res.ok) {
      Modal.error({
        title: "Gagal",
        content: res.error || "Tidak bisa menghapus",
      });
    }
  };

  const { shellW, maxW, blue, text } = TOKENS;
  const req = (msg) => [{ required: true, message: msg }];

  return (
    <ConfigProvider
      componentSize="middle"
      theme={{
        token: {
          colorPrimary: blue,
          colorText: text,
          fontFamily:
            '"Poppins", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
          borderRadius: 12,
          fontSize: 13,
          controlHeight: 36,
        },
        components: { Button: { borderRadius: 10 } },
      }}
    >
      {/* paksa rasio 9:16 untuk Upload */}
      <style jsx global>{`
        .portrait-uploader.ant-upload.ant-upload-select-picture-card {
          width: 180px !important; /* 9:16 */
          height: 320px !important; /* 9:16 */
          padding: 0 !important;
        }
        .portrait-uploader .ant-upload {
          width: 100% !important;
          height: 100% !important;
        }
      `}</style>

      {/* ===== Page wrapper ===== */}
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
          {/* ===== Header Card ===== */}
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

          {/* ===== Data Card ===== */}
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

              {/* Filters (search kiri, publish kanan) */}
              <div style={styles.filtersRow}>
                <Input
                  allowClear
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onPressEnter={() => {
                    vm.setQ?.((searchValue || "").trim());
                    vm.setPage?.(1);
                  }}
                  placeholder={T.searchPh}
                  prefix={<SearchOutlined />}
                  style={styles.searchInput}
                />
                <Select
                  value={pubFilter}
                  onChange={onChangePubFilter}
                  options={[
                    { value: "published", label: "Published" },
                    { value: "draft", label: "Draft" },
                  ]}
                  style={styles.filterSelect}
                />
              </div>

              {/* Table header */}
              <div style={styles.tableHeader}>
                <div style={{ ...styles.thLeft, paddingLeft: 8 }}>
                  {T.nameCol}
                </div>
                <div style={styles.thCenter}>{T.pubCol}</div>
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
                    <Empty description="Belum ada data" />
                  </div>
                ) : (
                  rows.map((r) => {
                    const name = r.title || "(untitled)";
                    const isPub = !!r.is_published;
                    return (
                      <div key={r.id} style={styles.row}>
                        <div style={styles.colName}>
                          <div style={styles.logoBox}>
                            {r.image_src ? (
                              <img
                                src={r.image_src}
                                alt=""
                                style={styles.logoImg}
                              />
                            ) : (
                              <div style={styles.logoFallback}>📌</div>
                            )}
                          </div>
                          <div style={styles.nameWrap}>
                            <div style={styles.nameText} title={name}>
                              {name}
                            </div>
                            <div style={styles.subDate}>
                              {fmtDateId(r.created_ts || r.created_at)}
                            </div>
                          </div>
                        </div>

                        <div style={styles.colCenter}>
                          <span
                            style={{
                              ...styles.badge,
                              ...(isPub ? styles.badgePub : styles.badgeDraft),
                            }}
                          >
                            {isPub ? "Published" : "Draft"}
                          </span>
                        </div>

                        <div style={styles.colActionsCenter}>
                          <Tooltip title={T.view}>
                            <Button
                              size="small"
                              icon={<EyeOutlined />}
                              onClick={() => {
                                setActiveRow(r);
                                setViewOpen(true);
                                setDetailLoading(true);
                                setDetailData(null);
                                vm.getActivity(r.id).then(
                                  ({ ok, data, error }) => {
                                    setDetailLoading(false);
                                    if (!ok) {
                                      setViewOpen(false);
                                      Modal.error({
                                        title: "Gagal memuat",
                                        content: error,
                                      });
                                      return;
                                    }
                                    setDetailData(data);
                                  }
                                );
                              }}
                              style={styles.iconBtn}
                            />
                          </Tooltip>
                          <Tooltip title={T.del}>
                            <Popconfirm
                              title="Hapus aktivitas ini?"
                              okText="Ya"
                              cancelText="Batal"
                              onConfirm={() => onDelete(r.id)}
                            >
                              <Button
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                                style={styles.iconBtn}
                              />
                            </Popconfirm>
                          </Tooltip>
                          <Tooltip title={T.edit}>
                            <Button
                              size="small"
                              icon={<EditOutlined />}
                              onClick={() => openEdit(r)}
                              style={styles.iconBtn}
                            />
                          </Tooltip>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Pagination */}
              <div style={styles.pagination}>
                <Button
                  icon={<LeftOutlined />}
                  onClick={() => vm.setPage(Math.max(1, vm.page - 1))}
                  disabled={vm.page <= 1 || vm.loading}
                />
                <div style={styles.pageText}>
                  Page {vm.page}
                  {vm.totalPages ? ` of ${vm.totalPages}` : ""}
                </div>
                <Button
                  icon={<RightOutlined />}
                  onClick={() => vm.setPage(vm.page + 1)}
                  disabled={
                    vm.loading ||
                    (vm.totalPages
                      ? vm.page >= vm.totalPages
                      : rows.length < (vm.perPage || 10))
                  }
                />
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
                name="cover"
                valuePropName="fileList"
                getValueFromEvent={(e) =>
                  Array.isArray(e) ? e : e?.fileList || []
                }
                noStyle
                rules={[{ required: true, message: "Gambar wajib diisi" }]}
              >
                <Upload
                  accept="image/*"
                  listType="picture-card"
                  showUploadList={false}
                  beforeUpload={(file) => {
                    if (!isImg(file) || tooBig(file, 10))
                      return Upload.LIST_IGNORE;
                    try {
                      setCoverPrevCreate(URL.createObjectURL(file));
                    } catch {}
                    return false;
                  }}
                  className="portrait-uploader"
                >
                  <div style={styles.coverBox}>
                    {coverPrevCreate ? (
                      <img
                        src={coverPrevCreate}
                        alt="cover"
                        style={styles.coverImg}
                      />
                    ) : (
                      <div style={styles.coverPlaceholder}>+ {T.cover}</div>
                    )}
                  </div>
                </Upload>
              </Form.Item>
            </div>

            <Form.Item
              label={T.name}
              name="name"
              rules={[{ required: true, message: "Judul wajib" }]}
            >
              <Input placeholder="Contoh: Kunjungan Kampus ABC" />
            </Form.Item>

            <Form.Item label={T.desc} name="description">
              <Input.TextArea rows={3} placeholder="Deskripsi (opsional)..." />
            </Form.Item>

            <Form.Item
              label={T.status}
              name="status"
              initialValue="published"
              rules={[{ required: true, message: "Status wajib" }]}
            >
              <Select
                options={[
                  { value: "published", label: "Published" },
                  { value: "draft", label: "Draft" },
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

      {/* ===== Edit Modal ===== */}
      <Modal
        open={editOpen}
        onCancel={() => {
          setEditOpen(false);
          setCoverPrevEdit("");
          formEdit.resetFields();
        }}
        footer={null}
        width={820}
        destroyOnClose
        title={null}
      >
        <div style={styles.modalShell}>
          <Spin spinning={detailLoading}>
            <Form layout="vertical" form={formEdit}>
              <div style={styles.coverWrap}>
                <Form.Item
                  name="cover"
                  valuePropName="fileList"
                  getValueFromEvent={(e) =>
                    Array.isArray(e) ? e : e?.fileList || []
                  }
                  noStyle
                >
                  <Upload
                    accept="image/*"
                    listType="picture-card"
                    showUploadList={false}
                    beforeUpload={(file) => {
                      if (!isImg(file) || tooBig(file, 10))
                        return Upload.LIST_IGNORE;
                      try {
                        setCoverPrevEdit(URL.createObjectURL(file));
                      } catch {}
                      return false;
                    }}
                    className="portrait-uploader"
                  >
                    <div style={styles.coverBox}>
                      {coverPrevEdit ? (
                        <img
                          src={coverPrevEdit}
                          alt="cover"
                          style={styles.coverImg}
                        />
                      ) : (
                        <div style={styles.coverPlaceholder}>+ {T.cover}</div>
                      )}
                    </div>
                  </Upload>
                </Form.Item>
              </div>

              <Form.Item label={T.name} name="name">
                <Input placeholder="Judul aktivitas" />
              </Form.Item>

              <Form.Item label={T.desc} name="description">
                <Input.TextArea rows={3} placeholder="Deskripsi (opsional)" />
              </Form.Item>

              <Form.Item
                label={T.status}
                name="status"
                rules={[{ required: true, message: "Status wajib" }]}
              >
                <Select
                  options={[
                    { value: "published", label: "Published" },
                    { value: "draft", label: "Draft" },
                  ]}
                />
              </Form.Item>

              <div style={styles.modalFooter}>
                <Button
                  type="primary"
                  size="large"
                  onClick={onEditSubmit}
                  loading={vm.opLoading}
                  style={styles.saveBtn}
                >
                  Simpan Perubahan
                </Button>
              </div>
            </Form>
          </Spin>
        </div>
      </Modal>

      {/* ===== View Modal ===== */}
      <Modal
        open={viewOpen}
        onCancel={() => {
          setViewOpen(false);
          setDetailData(null);
        }}
        footer={null}
        width={820}
        destroyOnClose
        title={null}
      >
        <div style={styles.modalShell}>
          <Spin spinning={detailLoading}>
            <div style={styles.coverBoxRead}>
              {detailData?.image_url || activeRow?.image_src ? (
                <img
                  src={detailData?.image_url || activeRow?.image_src}
                  alt="cover"
                  style={styles.coverImgRead}
                />
              ) : (
                <div style={{ padding: 24, textAlign: "center" }}>
                  Tidak ada gambar
                </div>
              )}
            </div>
            <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
              <div>
                <div style={styles.label}>{T.name}</div>
                <div style={styles.value}>
                  {detailData?.name || activeRow?.title || "-"}
                </div>
              </div>

              <div>
                <div style={styles.label}>Tanggal</div>
                <div style={styles.value}>
                  {fmtDateId(
                    detailData?.created_ts ||
                      detailData?.created_at ||
                      activeRow?.created_ts ||
                      activeRow?.created_at
                  )}
                </div>
              </div>

              <div>
                <div style={styles.label}>{T.status}</div>
                <div style={styles.value}>
                  {detailData?.is_published ?? activeRow?.is_published
                    ? "Published"
                    : "Draft"}
                </div>
              </div>

              <div>
                <div style={styles.label}>{T.desc}</div>
                <div style={{ ...styles.value, whiteSpace: "pre-wrap" }}>
                  {detailData?.description || "—"}
                </div>
              </div>
            </div>
          </Spin>
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
    display: "grid",
    gridTemplateColumns: "1fr 180px",
    gap: 8,
    marginBottom: 10,
    alignItems: "center",
  },
  searchInput: { height: 36, borderRadius: 10 },
  filterSelect: { width: "100%" },

  tableHeader: {
    display: "grid",
    gridTemplateColumns: "2.2fr .8fr .7fr",
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
    gridTemplateColumns: "2.2fr .8fr .7fr",
    gap: 8,
    alignItems: "center",
    background: "#f5f8ff",
    borderRadius: 10,
    border: "1px solid #e8eeff",
    padding: "8px 10px",
    boxShadow: "0 6px 12px rgba(11, 86, 201, 0.05)",
  },

  colName: {
    background: "#ffffff",
    borderRadius: 10,
    border: "1px solid #eef3ff",
    padding: "6px 10px",
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  logoBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    background: "#fff",
    border: "1px solid #e5edff",
    display: "grid",
    placeItems: "center",
    overflow: "hidden",
    boxShadow: "0 2px 6px rgba(0,0,0,.04) inset",
  },
  logoImg: { width: "100%", height: "100%", objectFit: "cover" },
  logoFallback: { fontSize: 18 },
  nameWrap: { display: "grid", gap: 2, minWidth: 0 },
  nameText: {
    fontWeight: 600,
    color: "#111827",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  subDate: { fontSize: 11.5, color: "#6b7280" },

  colCenter: { textAlign: "center", color: "#0f172a", fontWeight: 600 },

  colActionsCenter: { display: "flex", justifyContent: "center", gap: 6 },
  iconBtn: { borderRadius: 8 },

  pagination: {
    marginTop: 12,
    display: "grid",
    gridTemplateColumns: "36px 1fr 36px",
    alignItems: "center",
    justifyItems: "center",
    gap: 8,
  },
  pageText: { fontSize: 12, color: "#475569" },

  label: { fontSize: 11.5, color: "#64748b" },
  value: {
    fontWeight: 600,
    color: "#0f172a",
    background: "#f8fafc",
    border: "1px solid #e8eeff",
    borderRadius: 10,
    padding: "8px 10px",
    boxShadow: "inset 0 2px 6px rgba(11,86,201,0.05)",
    wordBreak: "break-word",
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

  coverBoxRead: {
    width: "100%",
    borderRadius: 12,
    border: "1px solid #e6eeff",
    overflow: "hidden",
    background: "#f8fbff",
  },
  coverImgRead: { width: "100%", height: "auto", display: "block" },

  // badge publikasi
  badge: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
  },
  badgePub: {
    background: "#e8f1ff",
    color: "#0b56c9",
    border: "1px solid #cfe0ff",
  },
  badgeDraft: {
    background: "#fff4e5",
    color: "#b45309",
    border: "1px solid #fde0b2",
  },

  modalFooter: { marginTop: 8, display: "grid", placeItems: "center" },
  saveBtn: { minWidth: 200, height: 40, borderRadius: 12 },
};
