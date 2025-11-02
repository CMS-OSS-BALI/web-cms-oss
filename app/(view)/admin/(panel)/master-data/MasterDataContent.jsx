"use client";

import React, {
  useEffect,
  useMemo,
  useState,
  useContext,
  createContext,
} from "react";
import {
  Button,
  Modal,
  Form,
  Input,
  Select,
  Empty,
  Skeleton,
  Popconfirm,
  Tooltip,
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
import AdminShell from "@/app/components/admin/AdminShell";
import useAdminTokens from "@/app/components/admin/useAdminTokens";

export const MasterDataVMContext = createContext(null);

export default function MasterDataContent({ vm }) {
  const ctxVM = useContext(MasterDataVMContext);
  const viewModel = vm || ctxVM;

  if (!viewModel) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn(
        "MasterDataContent: 'vm' tidak disediakan. Bungkus dengan <MasterDataVMContext.Provider value={vm}> atau kirim prop vm."
      );
    }
    return (
      <div style={{ padding: 16 }}>
        VM tidak tersedia. Inisialisasi useMasterDataViewModel di page, lalu
        teruskan ke konten.
      </div>
    );
  }

  const { styles: S } = useAdminTokens();

  const T = {
    title: "Manajemen Master Data",
    listTitle: "Daftar Kategori",
    searchPh: "Cari nama kategori",
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

  // UI state
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [activeRow, setActiveRow] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [formCreate] = Form.useForm();
  const [formEdit] = Form.useForm();

  const rows = useMemo(() => viewModel.rows || [], [viewModel.rows]);

  /* search debounce */
  const [searchValue, setSearchValue] = useState(viewModel.q || "");
  useEffect(() => setSearchValue(viewModel.q || ""), [viewModel.q]);
  useEffect(() => {
    const v = (searchValue || "").trim();
    const t = setTimeout(() => {
      viewModel.setQ(v);
      viewModel.setPage(1);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const goNext = () =>
    viewModel.setPage(
      viewModel.totalPages
        ? Math.min(viewModel.totalPages, viewModel.page + 1)
        : viewModel.page + 1
    );

  // ===== local styles (hanya grid spesifik halaman) =====
  const L = {
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
  };

  const totalLabel =
    viewModel.typeOptions?.find((o) => o.value === viewModel.type)?.label ||
    "Total";

  return (
    <AdminShell
      title={T.title}
      totalLabel={totalLabel}
      totalValue={viewModel.total ?? rows.length ?? "—"}
    >
      {contextHolder}

      {/* Data Card */}
      <div style={{ ...S.cardOuter, marginTop: 12 }}>
        <div style={{ ...S.cardInner, paddingTop: 14 }}>
          <div style={S.sectionHeader}>
            <div style={S.sectionTitle}>{T.listTitle}</div>
            <Button
              type="primary"
              icon={<PlusCircleOutlined />}
              onClick={openCreate}
            >
              {T.addNew}
            </Button>
          </div>

          {/* Filters */}
          <div style={L.filtersRow}>
            <Input
              allowClear
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onPressEnter={() => {
                viewModel.setQ((searchValue || "").trim());
                viewModel.setPage(1);
              }}
              placeholder={T.searchPh}
              prefix={<SearchOutlined />}
              style={L.searchInput}
            />
            <Select
              value={viewModel.type}
              onChange={(t) => viewModel.setType(t)}
              options={viewModel.typeOptions}
              style={L.filterSelect}
            />
          </div>

          {/* Table header */}
          <div style={L.tableHeader}>
            <div style={{ ...L.thLeft, paddingLeft: 8 }}>Nama</div>
            <div style={L.thCenter}>{T.action}</div>
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
                <div key={r.id} style={L.row}>
                  <div style={L.colName}>
                    <div style={L.nameWrap}>
                      <div style={L.nameText}>{r.name || "-"}</div>
                    </div>
                  </div>
                  <div style={L.colActionsCenter}>
                    <Tooltip title="Lihat">
                      <Button
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => openView(r)}
                        style={S.iconBtn}
                      />
                    </Tooltip>
                    <Tooltip title="Edit">
                      <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => openEdit(r)}
                        style={S.iconBtn}
                        disabled={viewModel.opLoading}
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
                          style={S.iconBtn}
                          disabled={viewModel.opLoading}
                        />
                      </Popconfirm>
                    </Tooltip>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          <div style={S.pagination}>
            <Button
              icon={<LeftOutlined />}
              onClick={goPrev}
              disabled={viewModel.page <= 1 || viewModel.loading}
            />
            <div style={S.pageText}>
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

      {/* View Modal */}
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
        <div style={S.modalShell}>
          <Skeleton loading={detailLoading} active paragraph={{ rows: 2 }}>
            {!detailData ? null : (
              <div style={{ display: "grid", gap: 10 }}>
                <div>
                  <div style={S.label}>Nama Kategori</div>
                  <div style={S.value}>{detailData.name || "-"}</div>
                </div>
              </div>
            )}
          </Skeleton>
        </div>
      </Modal>

      {/* Create Modal */}
      <Modal
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        footer={null}
        width={640}
        destroyOnClose
        title={null}
      >
        <div style={S.modalShell}>
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

      {/* Edit Modal */}
      <Modal
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        footer={null}
        width={640}
        destroyOnClose
        title={null}
      >
        <div style={S.modalShell}>
          <Skeleton loading={detailLoading} active paragraph={{ rows: 3 }}>
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
          </Skeleton>
        </div>
      </Modal>
    </AdminShell>
  );
}
