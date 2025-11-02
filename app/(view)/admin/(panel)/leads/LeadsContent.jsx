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
  Spin,
  notification,
} from "antd";
import {
  EyeOutlined,
  DeleteOutlined,
  EditOutlined,
  LeftOutlined,
  RightOutlined,
  SearchOutlined,
  FilterOutlined,
} from "@ant-design/icons";
import AdminShell from "@/app/components/admin/AdminShell";
import useAdminTokens from "@/app/components/admin/useAdminTokens";

export const LeadsVMContext = createContext(null);

export default function LeadsContent({ vm }) {
  const ctxVM = useContext(LeadsVMContext);
  const viewModel = vm || ctxVM;

  if (!viewModel) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn(
        "LeadsContent: 'vm' tidak disediakan. Gunakan <LeadsVMContext.Provider value={vm}> atau kirim prop vm."
      );
    }
    return (
      <div style={{ padding: 16 }}>
        VM tidak tersedia. Inisialisasi useLeadsViewModel di page dan teruskan
        ke konten.
      </div>
    );
  }

  const { styles: S } = useAdminTokens();

  const T = {
    title: "Manajemen Data Form Leads",
    totalLabel: "Leads",
    listTitle: "Data Leads",
    searchPh: "Search",
    nameCol: "Nama Leads",
    emailCol: "Email",
    waCol: "No. WhatsApp",
    eduCol: "Pendidikan Terakhir",
    consCol: "Konsultan",
    action: "Aksi",
    status: "Status",
    statusAll: "Semua",
    statusAssigned: "Sudah Assign",
    statusUnassigned: "Belum Assign",
    eduFilter: "Pendidikan",
    name: "Nama Lengkap",
    email: "Email",
    wa: "No. WhatsApp",
    domicile: "Domisili",
    edu: "Pendidikan Terakhir",
    consultant: "Konsultan",
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
      return `${dt.getDate()} ${monthsId[dt.getMonth()]} ${dt.getFullYear()}`;
    } catch {
      return "-";
    }
  };

  // notifications
  const [api, contextHolder] = notification.useNotification();
  const toast = {
    ok: (m, d) =>
      api.success({ message: m, description: d, placement: "topRight" }),
    err: (m, d) =>
      api.error({ message: m, description: d, placement: "topRight" }),
    info: (m, d) =>
      api.info({ message: m, description: d, placement: "topRight" }),
  };

  // UI state
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [activeRow, setActiveRow] = useState(null);
  const [formEdit] = Form.useForm();
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState(null);

  const rows = useMemo(() => viewModel.leads || [], [viewModel.leads]);

  // edu options (simple from current rows)
  const eduOptions = useMemo(() => {
    const set = new Set(rows.map((r) => r.education_last).filter(Boolean));
    return Array.from(set).map((e) => ({ value: e, label: e }));
  }, [rows]);

  // consultant remote search
  const [consultantOptions, setConsultantOptions] = useState([]);
  const [fetchingConsultant, setFetchingConsultant] = useState(false);
  const fetchConsultantOpts = async (kw = "") => {
    setFetchingConsultant(true);
    const opts = await viewModel.searchConsultantOptions?.(kw).catch(() => []);
    setConsultantOptions(opts || []);
    setFetchingConsultant(false);
  };
  useEffect(() => {
    fetchConsultantOpts("");
  }, []); // eslint-disable-line

  // search/filter
  const [searchValue, setSearchValue] = useState(viewModel.q || "");
  useEffect(() => setSearchValue(viewModel.q || ""), [viewModel.q]);

  useEffect(() => {
    const v = (searchValue || "").trim();
    const t = setTimeout(() => {
      viewModel.setQ?.(v);
      viewModel.setPage?.(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchValue]); // eslint-disable-line

  const onChangeStatus = (v) => {
    viewModel.setStatus?.(v || "all");
    viewModel.setPage?.(1);
  };
  const onChangeEdu = (v) => {
    viewModel.setEducation?.(v || "");
    viewModel.setPage?.(1);
  };

  // edit
  const openEdit = async (row) => {
    setActiveRow(row);
    setEditOpen(true);
    setDetailLoading(true);
    setDetailData(null);
    const { ok, data, error } = await viewModel.getLead(row.id);
    setDetailLoading(false);
    if (!ok) {
      setEditOpen(false);
      return toast.err(
        "Gagal memuat detail",
        error || "Tidak dapat memuat data."
      );
    }
    const d = data?.data || data || row;
    setDetailData(d);

    // ensure selected consultant option exists
    const label = viewModel.consultantName?.(d.assigned_to) || "";
    if (d.assigned_to && label) {
      setConsultantOptions((prev) => {
        const has = prev.some((x) => x.value === d.assigned_to);
        return has ? prev : [{ value: d.assigned_to, label }, ...prev];
      });
    }
    formEdit.setFieldsValue({ assigned_to: d.assigned_to || undefined });
  };

  const onEditSubmit = async () => {
    if (!activeRow) return;
    const v = await formEdit.validateFields().catch(() => null);
    if (!v) return;
    const res = await viewModel.updateLead(activeRow.id, {
      assigned_to: v.assigned_to || null,
    });
    if (!res.ok)
      return toast.err(
        "Gagal menyimpan perubahan",
        res.error || "Tidak tersimpan."
      );
    toast.ok("Perubahan disimpan", `Assignment konsultan telah diperbarui.`);
    setEditOpen(false);
    formEdit.resetFields();
  };

  const onDelete = async (id) => {
    const res = await viewModel.deleteLead(id);
    if (!res.ok)
      return toast.err(
        "Gagal menghapus",
        res.error || "Tidak bisa menghapus data."
      );
    toast.ok("Terhapus", "Lead berhasil dihapus.");
  };

  const openView = async (row) => {
    setActiveRow(row);
    setViewOpen(true);
    setDetailLoading(true);
    setDetailData(null);
    const { ok, data, error } = await viewModel.getLead(row.id);
    setDetailLoading(false);
    if (!ok) {
      setViewOpen(false);
      return toast.err(
        "Gagal memuat detail",
        error || "Tidak dapat memuat data."
      );
    }
    setDetailData(data?.data || data);
  };

  const goPrev = () => viewModel.setPage(Math.max(1, viewModel.page - 1));
  const goNext = () => viewModel.setPage(viewModel.page + 1);

  // local grid styles
  const L = {
    filtersRow: {
      display: "grid",
      gridTemplateColumns: "1fr 180px 180px",
      gap: 8,
      marginBottom: 10,
      alignItems: "center",
    },
    searchInput: { height: 36, borderRadius: 10 },
    filterSelect: { width: "100%" },
    tableHeader: {
      display: "grid",
      gridTemplateColumns: "1.6fr 1.2fr 1fr 1.2fr 1fr .7fr",
      gap: 8,
      marginBottom: 4,
      color: "#0b3e91",
      fontWeight: 700,
      alignItems: "center",
      minWidth: 980,
    },
    thLeft: { display: "flex", justifyContent: "flex-start", width: "100%" },
    thCenter: { display: "flex", justifyContent: "center", width: "100%" },

    row: {
      display: "grid",
      gridTemplateColumns: "1.6fr 1.2fr 1fr 1.2fr 1fr .7fr",
      gap: 8,
      alignItems: "center",
      background: "#f5f8ff",
      borderRadius: 10,
      border: "1px solid #e8eeff",
      padding: "8px 10px",
      boxShadow: "0 6px 12px rgba(11, 86, 201, 0.05)",
      minWidth: 980,
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
    subDate: { fontSize: 11.5, color: "#6b7280" },

    colCenter: {
      textAlign: "center",
      color: "#0f172a",
      fontWeight: 600,
      minWidth: 0,
    },
    cellEllipsis: {
      display: "inline-block",
      maxWidth: "100%",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      verticalAlign: "bottom",
    },

    colActionsCenter: { display: "flex", justifyContent: "center", gap: 6 },

    modalFooter: { marginTop: 8, display: "grid", placeItems: "center" },
    saveBtn: { minWidth: 200, height: 40, borderRadius: 12 },
  };

  return (
    <AdminShell
      title={T.title}
      totalLabel={T.totalLabel}
      totalValue={viewModel.totalLeads ?? viewModel.total ?? rows.length ?? "—"}
    >
      {contextHolder}

      {/* Ringkasan Assign / Unassign */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 14,
          marginTop: 12,
        }}
      >
        <div style={S.cardOuter}>
          <div style={S.cardInner} className="__nobar">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "48px 1fr auto",
                alignItems: "center",
                columnGap: 12,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  border: "1px solid #e6eeff",
                  background: "#f8fbff",
                  display: "grid",
                  placeItems: "center",
                  boxShadow: "inset 0 2px 8px rgba(11,86,201,0.06)",
                }}
              >
                <img
                  src="/image266.svg"
                  alt=""
                  aria-hidden="true"
                  style={{ width: 32, height: 32, objectFit: "contain" }}
                />
              </div>
              <div
                style={{
                  fontWeight: 800,
                  color: "#0b3e91",
                  textAlign: "center",
                }}
              >
                Leads Belum Assign
              </div>
              <div style={{ fontWeight: 800, fontSize: 24, color: "#0b56c9" }}>
                {viewModel.unassignedCount ?? "—"}
              </div>
            </div>
          </div>
        </div>

        <div style={S.cardOuter}>
          <div style={S.cardInner} className="__nobar">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "48px 1fr auto",
                alignItems: "center",
                columnGap: 12,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  border: "1px solid #e6eeff",
                  background: "#f8fbff",
                  display: "grid",
                  placeItems: "center",
                  boxShadow: "inset 0 2px 8px rgba(11,86,201,0.06)",
                }}
              >
                <img
                  src="/image266.svg"
                  alt=""
                  aria-hidden="true"
                  style={{ width: 32, height: 32, objectFit: "contain" }}
                />
              </div>
              <div
                style={{
                  fontWeight: 800,
                  color: "#0b3e91",
                  textAlign: "center",
                }}
              >
                Leads Sudah Assign
              </div>
              <div style={{ fontWeight: 800, fontSize: 24, color: "#0b56c9" }}>
                {viewModel.assignedCount ?? "—"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Card */}
      <div style={{ ...S.cardOuter, marginTop: 12 }}>
        <div style={{ ...S.cardInner, paddingTop: 14 }}>
          <div style={S.sectionHeader}>
            <div style={S.sectionTitle}>{T.listTitle}</div>
            <div />
          </div>

          {/* Filters */}
          <div style={L.filtersRow}>
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
              style={L.searchInput}
            />
            <Select
              value={viewModel.status || "all"}
              onChange={onChangeStatus}
              options={[
                { value: "all", label: T.statusAll },
                { value: "assigned", label: T.statusAssigned },
                { value: "unassigned", label: T.statusUnassigned },
              ]}
              style={L.filterSelect}
              suffixIcon={<FilterOutlined />}
            />
            <Select
              allowClear
              placeholder={T.eduFilter}
              value={viewModel.education || undefined}
              onChange={onChangeEdu}
              options={eduOptions}
              style={L.filterSelect}
            />
          </div>

          {/* Table header + Rows */}
          <div style={{ overflowX: "auto" }}>
            <div style={L.tableHeader}>
              <div style={{ ...L.thLeft, paddingLeft: 8 }}>{T.nameCol}</div>
              <div style={L.thCenter}>{T.emailCol}</div>
              <div style={L.thCenter}>{T.waCol}</div>
              <div style={L.thCenter}>{T.eduCol}</div>
              <div style={L.thCenter}>{T.consCol}</div>
              <div style={L.thCenter}>{T.action}</div>
            </div>

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
                rows.map((r) => {
                  const consName =
                    viewModel.consultantName?.(r.assigned_to) || "—";
                  return (
                    <div key={r.id} style={L.row}>
                      {/* Nama */}
                      <div style={L.colName}>
                        <div style={L.nameWrap}>
                          <Tooltip title={r.full_name || "(tanpa nama)"}>
                            <div style={L.nameText}>
                              {r.full_name || "(tanpa nama)"}
                            </div>
                          </Tooltip>
                          <div style={L.subDate}>
                            {fmtDateId(r.created_ts ?? r.created_at)}
                          </div>
                        </div>
                      </div>

                      {/* Email */}
                      <div style={L.colCenter}>
                        <Tooltip title={r.email || "—"}>
                          <span style={L.cellEllipsis}>{r.email || "—"}</span>
                        </Tooltip>
                      </div>

                      {/* Whatsapp */}
                      <div style={L.colCenter}>
                        <span style={L.cellEllipsis}>{r.whatsapp || "—"}</span>
                      </div>

                      {/* Pendidikan */}
                      <div style={L.colCenter}>
                        <span style={L.cellEllipsis}>
                          {r.education_last || "—"}
                        </span>
                      </div>

                      {/* Konsultan */}
                      <div style={L.colCenter}>
                        <Tooltip title={consName}>
                          <span style={L.cellEllipsis}>{consName}</span>
                        </Tooltip>
                      </div>

                      {/* Aksi */}
                      <div style={L.colActionsCenter}>
                        <Tooltip title="Lihat">
                          <Button
                            size="small"
                            icon={<EyeOutlined />}
                            onClick={() => openView(r)}
                            style={S.iconBtn}
                          />
                        </Tooltip>
                        <Tooltip title="Hapus">
                          <Popconfirm
                            title="Hapus lead ini?"
                            okText="Ya"
                            cancelText="Batal"
                            onConfirm={() => onDelete(r.id)}
                          >
                            <Button
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                              style={S.iconBtn}
                            />
                          </Popconfirm>
                        </Tooltip>
                        <Tooltip title="Edit (Assign Konsultan)">
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

      {/* ===== Edit Modal (Only assign consultant) ===== */}
      <Modal
        open={editOpen}
        onCancel={() => {
          setEditOpen(false);
          formEdit.resetFields();
        }}
        footer={null}
        width={820}
        destroyOnClose
        title={null}
      >
        <div style={S.modalShell}>
          <Spin spinning={detailLoading}>
            {/* Ringkasan read-only */}
            <div style={{ display: "grid", gap: 8, marginBottom: 10 }}>
              <div>
                <div style={S.label}>{T.name}</div>
                <div style={S.value}>
                  {detailData?.full_name || activeRow?.full_name || "—"}
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
                  <div style={S.label}>{T.email}</div>
                  <div style={S.value}>{detailData?.email || "—"}</div>
                </div>
                <div>
                  <div style={S.label}>{T.wa}</div>
                  <div style={S.value}>{detailData?.whatsapp || "—"}</div>
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
                  <div style={S.label}>{T.domicile}</div>
                  <div style={S.value}>{detailData?.domicile || "—"}</div>
                </div>
                <div>
                  <div style={S.label}>{T.edu}</div>
                  <div style={S.value}>{detailData?.education_last || "—"}</div>
                </div>
              </div>
            </div>

            {/* Form: hanya konsultan */}
            <Form layout="vertical" form={formEdit}>
              <Form.Item label={T.consultant} name="assigned_to">
                <Select
                  showSearch
                  allowClear
                  placeholder="Pilih/ketik nama konsultan (opsional)"
                  filterOption={false}
                  onSearch={fetchConsultantOpts}
                  notFoundContent={fetchingConsultant ? "Loading..." : null}
                  options={consultantOptions}
                />
              </Form.Item>

              <div style={L.modalFooter}>
                <Button
                  type="primary"
                  size="large"
                  onClick={onEditSubmit}
                  loading={viewModel.opLoading}
                  style={L.saveBtn}
                >
                  Simpan Assignment
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
        width={740}
        destroyOnClose
        title={null}
      >
        <div style={S.modalShell}>
          <Spin spinning={detailLoading}>
            <div style={{ display: "grid", gap: 8 }}>
              <div>
                <div style={S.label}>{T.name}</div>
                <div style={S.value}>
                  {detailData?.full_name || activeRow?.full_name || "—"}
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
                  <div style={S.label}>{T.email}</div>
                  <div style={S.value}>{detailData?.email || "—"}</div>
                </div>
                <div>
                  <div style={S.label}>{T.wa}</div>
                  <div style={S.value}>{detailData?.whatsapp || "—"}</div>
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
                  <div style={S.label}>{T.domicile}</div>
                  <div style={S.value}>{detailData?.domicile || "—"}</div>
                </div>
                <div>
                  <div style={S.label}>{T.edu}</div>
                  <div style={S.value}>{detailData?.education_last || "—"}</div>
                </div>
              </div>
              <div>
                <div style={S.label}>{T.consultant}</div>
                <div style={S.value}>
                  {viewModel.consultantName?.(
                    detailData?.assigned_to || activeRow?.assigned_to
                  ) || "—"}
                </div>
              </div>
              <div>
                <div style={S.label}>Tanggal dibuat</div>
                <div style={S.value}>
                  {fmtDateId(
                    detailData?.created_ts ??
                      detailData?.created_at ??
                      activeRow?.created_ts ??
                      activeRow?.created_at
                  )}
                </div>
              </div>
            </div>
          </Spin>
        </div>
      </Modal>
    </AdminShell>
  );
}
