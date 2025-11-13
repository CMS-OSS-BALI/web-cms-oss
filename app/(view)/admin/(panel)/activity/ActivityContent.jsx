"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
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
  notification,
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
import useActivityViewModel from "./useActivityViewModel";
import AdminShell from "@/app/components/admin/AdminShell";
import useAdminTokens from "@/app/components/admin/useAdminTokens";

const isImg = (f) =>
  ["image/jpeg", "image/png", "image/webp"].includes(f?.type || "");
const tooBig = (f, mb = 10) => (f?.size || 0) / 1024 / 1024 > mb;

const fmtDateId = (dLike) => {
  if (!dLike && dLike !== 0) return "-";
  const dt =
    typeof dLike === "number" || typeof dLike === "bigint"
      ? new Date(Number(dLike))
      : new Date(String(dLike));
  if (Number.isNaN(dt.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
  }).format(dt);
};

export default function ActivityContent({ vm: externalVm, locale = "id" }) {
  const vm =
    externalVm ??
    useActivityViewModel({
      locale,
      isPublished: true,
    });

  const { styles: S } = useAdminTokens();

  // Notification
  const [notify, contextHolder] = notification.useNotification();
  const ok = useCallback(
    (message, description) =>
      notify.success({ message, description, placement: "topRight" }),
    [notify]
  );
  const err = useCallback(
    (message, description) =>
      notify.error({ message, description, placement: "topRight" }),
    [notify]
  );

  // UI State
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [activeRow, setActiveRow] = useState(null);
  const [formCreate] = Form.useForm();
  const [formEdit] = Form.useForm();
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState(null);

  // Preview URLs
  const [coverPrevCreate, setCoverPrevCreate] = useState("");
  const [coverPrevEdit, setCoverPrevEdit] = useState("");
  const blobUrlsRef = useRef(new Set());
  const addBlobUrl = useCallback(
    (url) => url && blobUrlsRef.current.add(url),
    []
  );
  const revokeAllBlobUrls = useCallback(() => {
    blobUrlsRef.current.forEach((u) => {
      try {
        URL.revokeObjectURL(u);
      } catch {}
    });
    blobUrlsRef.current.clear();
  }, []);
  useEffect(() => () => revokeAllBlobUrls(), [revokeAllBlobUrls]);

  const rows = useMemo(() => vm.activities || [], [vm.activities]);

  // Search (debounced)
  const [searchValue, setSearchValue] = useState(vm.q || "");
  useEffect(() => setSearchValue(vm.q || ""), [vm.q]);
  useEffect(() => {
    const v = (searchValue || "").trim();
    const t = setTimeout(() => {
      vm.setQ?.(v);
      vm.setPage?.(1);
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  const pubFilter = useMemo(
    () => (vm.isPublished === false ? "draft" : "published"),
    [vm.isPublished]
  );
  const onChangePubFilter = useCallback(
    (v) => {
      vm.setIsPublished?.(v === "published");
      vm.setPage?.(1);
    },
    [vm]
  );

  const beforeUploadCreate = useCallback(
    (file) => {
      if (!isImg(file) || tooBig(file, 10)) return Upload.LIST_IGNORE;
      try {
        const url = URL.createObjectURL(file);
        addBlobUrl(url);
        setCoverPrevCreate(url);
      } catch {}
      return false;
    },
    [addBlobUrl]
  );

  const beforeUploadEdit = useCallback(
    (file) => {
      if (!isImg(file) || tooBig(file, 10)) return Upload.LIST_IGNORE;
      try {
        const url = URL.createObjectURL(file);
        addBlobUrl(url);
        setCoverPrevEdit(url);
      } catch {}
      return false;
    },
    [addBlobUrl]
  );

  // CRUD
  const handleCreate = useCallback(async () => {
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
    if (!out.ok)
      return err("Gagal menyimpan", out.error || "Terjadi kesalahan.");
    ok("Berhasil", "Aktivitas berhasil dibuat.");
    setCreateOpen(false);
    formCreate.resetFields();
    setCoverPrevCreate("");
    revokeAllBlobUrls();
  }, [formCreate, vm, ok, err, revokeAllBlobUrls]);

  const openEdit = useCallback(
    async (row) => {
      setActiveRow(row);
      setEditOpen(true);
      setDetailLoading(true);
      setDetailData(null);
      const { ok: success, data, error } = await vm.getActivity(row.id);
      setDetailLoading(false);
      if (!success) {
        setEditOpen(false);
        return err("Gagal memuat", error || "Terjadi kesalahan.");
      }
      const d = data || row;
      setDetailData(d);
      formEdit.setFieldsValue({
        name: d.name || row.title || "",
        description: d.description || "",
        status: d.is_published ? "published" : "draft",
      });
      setCoverPrevEdit(d.image_url || row.image_src || "");
    },
    [vm, formEdit, err]
  );

  const handleEditSubmit = useCallback(async () => {
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
    if (!res.ok)
      return err("Gagal menyimpan", res.error || "Terjadi kesalahan.");
    ok("Berhasil", "Perubahan telah disimpan.");
    setEditOpen(false);
    formEdit.resetFields();
    setCoverPrevEdit("");
    revokeAllBlobUrls();
  }, [activeRow, formEdit, vm, ok, err, revokeAllBlobUrls]);

  const handleDelete = useCallback(
    async (id) => {
      const res = await vm.deleteActivity(id);
      if (!res.ok)
        return err("Gagal menghapus", res.error || "Terjadi kesalahan.");
      ok("Terhapus", "Aktivitas berhasil dihapus.");
    },
    [vm, ok, err]
  );

  // Local grids
  const L = {
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
      boxShadow: "0 6px 12px rgba(0, 0, 0, 0.05)",
    },

    colName: {
      background: "#ffffff",
      borderRadius: 10,
      border: "1px solid #eef3ff",
      padding: "6px 10px",
      display: "flex",
      alignItems: "center",
      gap: 10,
      minWidth: 0,
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
      flex: "0 0 auto",
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

    modalFooter: { marginTop: 8, display: "grid", placeItems: "center" },
    saveBtn: { minWidth: 200, height: 40, borderRadius: 12 },

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
  };

  return (
    <AdminShell
      title="Manajemen Aktivitas"
      totalLabel="Total Aktivitas"
      totalValue={vm.total ?? rows.length ?? "—"}
    >
      {contextHolder}

      {/* paksa frame 16:9 untuk Upload (landscape) */}
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

      {/* Data Card */}
      <div style={{ ...S.cardOuter, marginTop: 12 }}>
        <div style={{ ...S.cardInner, paddingTop: 14 }}>
          <div style={S.sectionHeader}>
            <div style={S.sectionTitle}>Data Aktivitas</div>
            <Button
              type="primary"
              icon={<PlusCircleOutlined />}
              onClick={() => setCreateOpen(true)}
            >
              Buat Data Baru
            </Button>
          </div>

          {/* Filters */}
          <div style={L.filtersRow}>
            <Input
              allowClear
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onPressEnter={() => {
                vm.setQ?.((searchValue || "").trim());
                vm.setPage?.(1);
              }}
              placeholder="Cari judul aktivitas"
              prefix={<SearchOutlined />}
              style={L.searchInput}
            />
            <Select
              value={pubFilter}
              onChange={onChangePubFilter}
              options={[
                { value: "published", label: "Published" },
                { value: "draft", label: "Draft" },
              ]}
              style={L.filterSelect}
            />
          </div>

          {/* Table header */}
          <div style={L.tableHeader}>
            <div style={{ ...L.thLeft, paddingLeft: 8 }}>Nama Aktivitas</div>
            <div style={L.thCenter}>Publikasi</div>
            <div style={L.thCenter}>Aksi</div>
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
                  <div key={r.id} style={L.row}>
                    <div style={L.colName}>
                      <div style={L.logoBox}>
                        {r.image_src ? (
                          <img
                            src={r.image_src}
                            alt=""
                            style={L.logoImg}
                            loading="lazy"
                          />
                        ) : (
                          <div style={L.logoFallback}>📌</div>
                        )}
                      </div>
                      <div style={L.nameWrap}>
                        <div style={L.nameText} title={name}>
                          {name}
                        </div>
                        <div style={L.subDate}>
                          {fmtDateId(r.created_ts || r.created_at)}
                        </div>
                      </div>
                    </div>

                    <div style={L.colCenter}>
                      {isPub ? "Published" : "Draft"}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      <Tooltip title="Lihat">
                        <Button
                          size="small"
                          icon={<EyeOutlined />}
                          onClick={() => {
                            setActiveRow(r);
                            setViewOpen(true);
                            setDetailLoading(true);
                            setDetailData(null);
                            vm.getActivity(r.id).then(
                              ({ ok: success, data, error }) => {
                                setDetailLoading(false);
                                if (!success) {
                                  setViewOpen(false);
                                  err("Gagal memuat", error);
                                  return;
                                }
                                setDetailData(data);
                              }
                            );
                          }}
                          style={S.iconBtn}
                        />
                      </Tooltip>

                      <Tooltip title="Hapus">
                        <Popconfirm
                          title="Hapus aktivitas ini?"
                          okText="Ya"
                          cancelText="Batal"
                          onConfirm={() => handleDelete(r.id)}
                        >
                          <Button
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            style={S.iconBtn}
                            loading={vm.opLoading}
                          />
                        </Popconfirm>
                      </Tooltip>

                      <Tooltip title="Edit">
                        <Button
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => openEdit(r)}
                          style={S.iconBtn}
                        />
                      </Tooltip>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          <div style={S.pagination}>
            <Button
              icon={<LeftOutlined />}
              onClick={() => vm.setPage(Math.max(1, vm.page - 1))}
              disabled={vm.page <= 1 || vm.loading}
            />
            <div style={S.pageText}>
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

      {/* Create Modal */}
      <Modal
        open={createOpen}
        onCancel={() => {
          setCreateOpen(false);
          setCoverPrevCreate("");
          formCreate.resetFields();
          revokeAllBlobUrls();
        }}
        footer={null}
        width={760}
        destroyOnClose
        title={null}
      >
        <div style={S.modalShell}>
          <Form layout="vertical" form={formCreate}>
            <div style={L.coverWrap}>
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
                  beforeUpload={beforeUploadCreate}
                  className="landscape-uploader"
                >
                  <div style={L.coverBox}>
                    {coverPrevCreate ? (
                      <img
                        src={coverPrevCreate}
                        alt="cover"
                        style={L.coverImg}
                      />
                    ) : (
                      <div style={L.coverPlaceholder}>+ Gambar (16:9)</div>
                    )}
                  </div>
                </Upload>
              </Form.Item>
            </div>

            <Form.Item
              label="Judul (ID)"
              name="name"
              rules={[{ required: true, message: "Judul wajib" }]}
            >
              <Input placeholder="Contoh: Kunjungan Kampus ABC" />
            </Form.Item>

            <Form.Item label="Deskripsi (opsional)" name="description">
              <Input.TextArea rows={3} placeholder="Deskripsi (opsional)..." />
            </Form.Item>

            <Form.Item
              label="Status"
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

            <div style={L.modalFooter}>
              <Button
                type="primary"
                size="large"
                onClick={handleCreate}
                loading={vm.opLoading}
                style={L.saveBtn}
              >
                Simpan
              </Button>
            </div>
          </Form>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={editOpen}
        onCancel={() => {
          setEditOpen(false);
          setCoverPrevEdit("");
          formEdit.resetFields();
          revokeAllBlobUrls();
        }}
        footer={null}
        width={820}
        destroyOnClose
        title={null}
      >
        <div style={S.modalShell}>
          <Spin spinning={detailLoading}>
            <Form layout="vertical" form={formEdit}>
              <div style={L.coverWrap}>
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
                    beforeUpload={beforeUploadEdit}
                    className="landscape-uploader"
                  >
                    <div style={L.coverBox}>
                      {coverPrevEdit ? (
                        <img
                          src={coverPrevEdit}
                          alt="cover"
                          style={L.coverImg}
                        />
                      ) : (
                        <div style={L.coverPlaceholder}>+ Gambar (16:9)</div>
                      )}
                    </div>
                  </Upload>
                </Form.Item>
              </div>

              <Form.Item label="Judul (ID)" name="name">
                <Input placeholder="Judul aktivitas" />
              </Form.Item>

              <Form.Item label="Deskripsi (opsional)" name="description">
                <Input.TextArea rows={3} placeholder="Deskripsi (opsional)" />
              </Form.Item>

              <Form.Item
                label="Status"
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

              <div style={L.modalFooter}>
                <Button
                  type="primary"
                  size="large"
                  onClick={handleEditSubmit}
                  loading={vm.opLoading}
                  style={L.saveBtn}
                >
                  Simpan Perubahan
                </Button>
              </div>
            </Form>
          </Spin>
        </div>
      </Modal>

      {/* View Modal */}
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
        <div style={S.modalShell}>
          <Spin spinning={detailLoading}>
            <div style={L.coverBoxRead}>
              {detailData?.image_url || activeRow?.image_src ? (
                <img
                  src={detailData?.image_url || activeRow?.image_src}
                  alt="cover"
                  style={L.coverImgRead}
                />
              ) : (
                <div style={{ padding: 24, textAlign: "center" }}>
                  Tidak ada gambar
                </div>
              )}
            </div>

            <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
              <div>
                <div style={S.label}>Judul (ID)</div>
                <div style={S.value}>
                  {detailData?.name || activeRow?.title || "-"}
                </div>
              </div>

              <div>
                <div style={S.label}>Tanggal</div>
                <div style={S.value}>
                  {fmtDateId(
                    detailData?.created_ts ||
                      detailData?.created_at ||
                      activeRow?.created_ts ||
                      activeRow?.created_at
                  )}
                </div>
              </div>

              <div>
                <div style={S.label}>Status</div>
                <div style={S.value}>
                  {detailData?.is_published ?? activeRow?.is_published
                    ? "Published"
                    : "Draft"}
                </div>
              </div>

              <div>
                <div style={S.label}>Deskripsi</div>
                <div style={{ ...S.value, whiteSpace: "pre-wrap" }}>
                  {detailData?.description || "—"}
                </div>
              </div>
            </div>
          </Spin>
        </div>
      </Modal>
    </AdminShell>
  );
}
