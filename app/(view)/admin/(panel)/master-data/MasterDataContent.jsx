"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ConfigProvider,
  Button,
  Modal,
  Form,
  Input,
  Empty,
  Skeleton,
  Popconfirm,
  Tooltip,
  Spin,
  Tag,
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

export default function MasterDataContent({ vm }) {
  const viewModel = vm ?? require("./useMasterDataViewModel").default();

  const TOKENS = {
    shellW: "94%",
    maxW: 1140,
    blue: "#0b56c9",
    text: "#0f172a",
  };

  const T = {
    title: "Manajemen Master Data",
    listTitle: "Daftar Kategori",
    searchPh: "Search (nama)",
    addNew: "Buat Kategori",
    action: "Aksi",
  };

  const [api, contextHolder] = notification.useNotification();
  const toast = {
    ok: (m, d) =>
      api.success({ message: m, description: d, placement: "topRight" }),
    err: (m, d) =>
      api.error({ message: m, description: d, placement: "topRight" }),
  };

  // UI
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [activeRow, setActiveRow] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [formCreate] = Form.useForm();
  const [formEdit] = Form.useForm();

  const rows = useMemo(() => viewModel.rows || [], [viewModel.rows]);

  // search debounce
  const [searchValue, setSearchValue] = useState(viewModel.q || "");
  useEffect(() => setSearchValue(viewModel.q || ""), [viewModel.q]);
  useEffect(() => {
    const v = (searchValue || "").trim();
    const t = setTimeout(() => {
      viewModel.setQ?.(v);
      viewModel.setPage?.(1);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [searchValue]);

  const openCreate = () => {
    setCreateOpen(true);
    formCreate.resetFields();
  };

  const onCreate = async () => {
    const v = await formCreate.validateFields().catch(() => null);
    if (!v) return;
    const res = await viewModel.createCategory(v.name);
    if (!res.ok) return toast.err("Gagal", res.error);
    toast.ok("Tersimpan", "Kategori berhasil dibuat.");
    setCreateOpen(false);
  };

  const openEdit = async (row) => {
    setActiveRow(row);
    setEditOpen(true);
    setDetailLoading(true);
    const { ok, data, error } = await viewModel.getCategory(row.id);
    setDetailLoading(false);
    if (!ok) {
      setEditOpen(false);
      return toast.err("Gagal memuat detail", error);
    }
    setDetailData(data);
    formEdit.setFieldsValue({ name: data.name || "" });
  };

  const onEditSubmit = async () => {
    if (!activeRow) return;
    const v = await formEdit.validateFields().catch(() => null);
    if (!v) return;
    const res = await viewModel.updateCategory(activeRow.id, v.name);
    if (!res.ok) return toast.err("Gagal menyimpan", res.error);
    toast.ok("Tersimpan", "Perubahan berhasil disimpan.");
    setEditOpen(false);
  };

  const onDelete = async (row) => {
    const res = await viewModel.deleteCategory(row.id);
    if (!res.ok) return toast.err("Gagal menghapus", res.error);
    toast.ok("Terhapus", "Kategori dihapus.");
  };

  const openView = async (row) => {
    setActiveRow(row);
    setViewOpen(true);
    setDetailLoading(true);
    setDetailData(null);
    const { ok, data, error } = await viewModel.getCategory(row.id);
    setDetailLoading(false);
    if (!ok) {
      setViewOpen(false);
      return toast.err("Gagal memuat detail", error);
    }
    setDetailData(data);
  };

  const goPrev = () => viewModel.setPage(Math.max(1, viewModel.page - 1));
  const goNext = () => viewModel.setPage(viewModel.page + 1);

  const { shellW, maxW, blue, text } = TOKENS;

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
      {contextHolder}
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
          {/* Header */}
          <div style={styles.cardOuter}>
            <div style={styles.cardHeaderBar} />
            <div style={styles.cardInner}>
              <div style={styles.cardTitle}>{T.title}</div>
              <div style={styles.totalBadgeWrap}>
                <div style={styles.totalBadgeLabel}>Total</div>
                <div style={styles.totalBadgeValue}>
                  {viewModel.total ?? rows.length ?? "—"}
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
                  onClick={openCreate}
                >
                  {T.addNew}
                </Button>
              </div>

              {/* Filters — Search kiri, Kategori kanan (locale dropdown DIHAPUS) */}
              <div style={styles.filtersRow}>
                <Input
                  allowClear
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onPressEnter={() => {
                    viewModel.setQ?.((searchValue || "").trim());
                    viewModel.setPage?.(1);
                  }}
                  placeholder={T.searchPh}
                  prefix={<SearchOutlined />}
                  style={styles.searchInput}
                />
                <Select
                  value={viewModel.type}
                  onChange={(t) => viewModel.setType?.(t)}
                  options={viewModel.typeOptions}
                  style={styles.filterSelect}
                />
              </div>

              {/* Table header */}
              <div style={styles.tableHeader}>
                <div style={{ ...styles.thLeft, paddingLeft: 8 }}>Nama</div>
                <div style={styles.thCenter}>{T.action}</div>
              </div>

              {/* Rows */}
              <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
                {viewModel.loading ? (
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
                  rows.map((r) => (
                    <div key={r.id} style={styles.row}>
                      <div style={styles.colName}>
                        <div style={styles.nameWrap}>
                          <div style={styles.nameText}>{r.name || "-"}</div>
                        </div>
                      </div>
                      <div style={styles.colActionsCenter}>
                        <Tooltip title="Lihat">
                          <Button
                            size="small"
                            icon={<EyeOutlined />}
                            onClick={() => openView(r)}
                            style={styles.iconBtn}
                          />
                        </Tooltip>
                        <Tooltip title="Edit">
                          <Button
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => openEdit(r)}
                            style={styles.iconBtn}
                          />
                        </Tooltip>
                        <Tooltip title="Hapus">
                          <Popconfirm
                            title="Hapus kategori ini?"
                            okText="Ya"
                            cancelText="Batal"
                            onConfirm={() => onDelete(r)}
                          >
                            <Button
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                              style={styles.iconBtn}
                            />
                          </Popconfirm>
                        </Tooltip>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Pagination */}
              <div style={styles.pagination}>
                <Button
                  icon={<LeftOutlined />}
                  onClick={goPrev}
                  disabled={viewModel.page <= 1 || viewModel.loading}
                />
                <div style={styles.pageText}>
                  Page {viewModel.page}
                  {viewModel.totalPages ? ` of ${viewModel.totalPages}` : ""}
                </div>
                <Button
                  icon={<RightOutlined />}
                  onClick={goNext}
                  disabled={
                    viewModel.loading ||
                    (viewModel.totalPages
                      ? viewModel.page >= viewModel.totalPages
                      : rows.length < (viewModel.perPage || 10))
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* View Modal (nama saja) */}
      <Modal
        open={viewOpen}
        onCancel={() => {
          setViewOpen(false);
          setDetailData(null);
        }}
        footer={null}
        width={640}
        destroyOnClose
        title={null}
      >
        <div style={styles.modalShell}>
          <Spin spinning={detailLoading}>
            {!detailData ? null : (
              <div style={{ display: "grid", gap: 10 }}>
                <div>
                  <div style={styles.label}>Nama Kategori</div>
                  <div style={styles.value}>{detailData.name || "-"}</div>
                </div>
              </div>
            )}
          </Spin>
        </div>
      </Modal>

      {/* Create Modal (input nama saja) */}
      <Modal
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        footer={null}
        width={640}
        destroyOnClose
        title={null}
      >
        <div style={styles.modalShell}>
          <Form layout="vertical" form={formCreate}>
            <Form.Item
              label="Nama Kategori"
              name="name"
              rules={[{ required: true, message: "Nama wajib diisi" }]}
            >
              <Input placeholder="Contoh: Beasiswa" />
            </Form.Item>
            <div
              style={{ display: "grid", placeItems: "center", marginTop: 8 }}
            >
              <Button
                type="primary"
                size="large"
                onClick={onCreate}
                loading={viewModel.opLoading}
                style={{ minWidth: 200 }}
              >
                Simpan
              </Button>
            </div>
          </Form>
        </div>
      </Modal>

      {/* Edit Modal (input nama saja) */}
      <Modal
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        footer={null}
        width={640}
        destroyOnClose
        title={null}
      >
        <div style={styles.modalShell}>
          <Spin spinning={detailLoading}>
            <Form layout="vertical" form={formEdit}>
              <Form.Item
                label="Nama Kategori"
                name="name"
                rules={[{ required: true, message: "Nama wajib diisi" }]}
              >
                <Input placeholder="Ubah nama kategori" />
              </Form.Item>
              <div
                style={{ display: "grid", placeItems: "center", marginTop: 8 }}
              >
                <Button
                  type="primary"
                  size="large"
                  onClick={onEditSubmit}
                  loading={viewModel.opLoading}
                  style={{ minWidth: 200 }}
                >
                  Simpan Perubahan
                </Button>
              </div>
            </Form>
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

  // >>> Search kiri, Kategori kanan
  filtersRow: {
    display: "grid",
    gridTemplateColumns: "1fr 240px",
    gap: 8,
    marginBottom: 10,
    alignItems: "center",
  },
  searchInput: { height: 36, borderRadius: 10 },
  filterSelect: { width: "100%" },

  tableHeader: {
    display: "grid",
    gridTemplateColumns: "1.4fr .6fr",
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
    gridTemplateColumns: "1.4fr .6fr",
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
    minWidth: 0,
  },
  nameWrap: { display: "grid", gap: 2, minWidth: 0 },
  nameText: {
    fontWeight: 600,
    color: "#111827",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

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
};
