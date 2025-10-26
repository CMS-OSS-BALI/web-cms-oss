// LeadsContent.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ConfigProvider,
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

export default function LeadsContent({ vm }) {
  const viewModel = vm ?? require("./useLeadsViewModel").default();

  /* ===== tokens ===== */
  const TOKENS = {
    shellW: "94%",
    maxW: 1140,
    blue: "#0b56c9",
    text: "#0f172a",
  };

  const T = {
    title: "Manajemen Data Form Leads",
    totalLabel: "Leads",
    listTitle: "Data Leads",
    searchPh: "Search",

    // table
    nameCol: "Nama Leads",
    emailCol: "Email",
    waCol: "No. WhatsApp",
    eduCol: "Pendidikan Terakhir",
    consCol: "Konsultan",
    action: "Aksi",

    // filters
    status: "Status",
    statusAll: "Semua",
    statusAssigned: "Sudah Assign",
    statusUnassigned: "Belum Assign",
    eduFilter: "Pendidikan",

    // view / edit
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

  // ----- notifications -----
  const [api, contextHolder] = notification.useNotification();
  const toast = {
    ok: (m, d) =>
      api.success({ message: m, description: d, placement: "topRight" }),
    err: (m, d) =>
      api.error({ message: m, description: d, placement: "topRight" }),
    info: (m, d) =>
      api.info({ message: m, description: d, placement: "topRight" }),
  };

  // ----- UI state -----
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [activeRow, setActiveRow] = useState(null);
  const [formEdit] = Form.useForm();
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState(null);

  const rows = useMemo(() => viewModel.leads || [], [viewModel.leads]);

  // build education options from current page rows (simple)
  const eduOptions = useMemo(() => {
    const set = new Set(rows.map((r) => r.education_last).filter(Boolean));
    return Array.from(set).map((e) => ({ value: e, label: e }));
  }, [rows]);

  // ======= consultant select (search remote) =======
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

  // ===== Search / Filter =====
  const [searchValue, setSearchValue] = useState(viewModel.q || "");
  useEffect(() => setSearchValue(viewModel.q || ""), [viewModel.q]);

  // debounce ke backend (400ms)
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

  /* ========================== EDIT ========================== */
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

    // ensure consultant option exists
    const label = viewModel.consultantName?.(d.assigned_to) || "";
    if (d.assigned_to && label) {
      setConsultantOptions((prev) => {
        const has = prev.some((x) => x.value === d.assigned_to);
        return has ? prev : [{ value: d.assigned_to, label }, ...prev];
      });
    }

    // hanya field assign yang bisa diubah
    formEdit.setFieldsValue({
      assigned_to: d.assigned_to || undefined,
    });
  };

  const onEditSubmit = async () => {
    if (!activeRow) return;
    const v = await formEdit.validateFields().catch(() => null);
    if (!v) return;

    const res = await viewModel.updateLead(activeRow.id, {
      assigned_to: v.assigned_to || null, // hanya kirim assigned_to
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

  /* ============================== UI =============================== */
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
                  {viewModel.totalLeads ??
                    viewModel.total ??
                    rows.length ??
                    "—"}
                </div>
              </div>
            </div>
          </div>

          {/* Ringkasan Assign / Unassign */}
          <div style={styles.statsRow}>
            <div style={styles.statCard}>
              <div style={styles.statIconBox}>
                <img
                  src="/image266.svg"
                  alt=""
                  aria-hidden="true"
                  style={styles.statIconImg}
                />
              </div>
              <div style={styles.statTitle}>Leads Belum Assign</div>
              <div style={styles.statValue}>
                {viewModel.unassignedCount ?? "—"}
              </div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statIconBox}>
                <img
                  src="/image266.svg"
                  alt=""
                  aria-hidden="true"
                  style={styles.statIconImg}
                />
              </div>
              <div style={styles.statTitle}>Leads Sudah Assign</div>
              <div style={styles.statValue}>
                {viewModel.assignedCount ?? "—"}
              </div>
            </div>
          </div>

          {/* Data Card */}
          <div style={{ ...styles.cardOuter, marginTop: 12 }}>
            <div style={{ ...styles.cardInner, paddingTop: 14 }}>
              <div style={styles.sectionHeader}>
                <div style={styles.sectionTitle}>{T.listTitle}</div>
                {/* NOTE: tombol create dihilangkan (admin tidak boleh create) */}
                <div />
              </div>

              {/* Filters */}
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
                  value={viewModel.status || "all"}
                  onChange={onChangeStatus}
                  options={[
                    { value: "all", label: T.statusAll },
                    { value: "assigned", label: T.statusAssigned },
                    { value: "unassigned", label: T.statusUnassigned },
                  ]}
                  style={styles.filterSelect}
                  suffixIcon={<FilterOutlined />}
                />
                <Select
                  allowClear
                  placeholder={T.eduFilter}
                  value={viewModel.education || undefined}
                  onChange={onChangeEdu}
                  options={eduOptions}
                  style={styles.filterSelect}
                />
              </div>

              {/* Table header */}
              <div style={{ overflowX: "auto" }}>
                <div style={styles.tableHeader}>
                  <div style={{ ...styles.thLeft, paddingLeft: 8 }}>
                    {T.nameCol}
                  </div>
                  <div style={styles.thCenter}>{T.emailCol}</div>
                  <div style={styles.thCenter}>{T.waCol}</div>
                  <div style={styles.thCenter}>{T.eduCol}</div>
                  <div style={styles.thCenter}>{T.consCol}</div>
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
                    rows.map((r) => {
                      const consName =
                        viewModel.consultantName?.(r.assigned_to) || "—";
                      return (
                        <div key={r.id} style={styles.row}>
                          {/* Nama */}
                          <div style={styles.colName}>
                            <div style={styles.nameWrap}>
                              <Tooltip title={r.full_name || "(tanpa nama)"}>
                                <div style={styles.nameText}>
                                  {r.full_name || "(tanpa nama)"}
                                </div>
                              </Tooltip>
                              <div style={styles.subDate}>
                                {fmtDateId(r.created_ts ?? r.created_at)}
                              </div>
                            </div>
                          </div>

                          {/* Email */}
                          <div style={styles.colCenter}>
                            <Tooltip title={r.email || "—"}>
                              <span style={styles.cellEllipsis}>
                                {r.email || "—"}
                              </span>
                            </Tooltip>
                          </div>

                          {/* Whatsapp */}
                          <div style={styles.colCenter}>
                            <span style={styles.cellEllipsis}>
                              {r.whatsapp || "—"}
                            </span>
                          </div>

                          {/* Pendidikan */}
                          <div style={styles.colCenter}>
                            <span style={styles.cellEllipsis}>
                              {r.education_last || "—"}
                            </span>
                          </div>

                          {/* Konsultan */}
                          <div style={styles.colCenter}>
                            <Tooltip title={consName}>
                              <span style={styles.cellEllipsis}>
                                {consName}
                              </span>
                            </Tooltip>
                          </div>

                          {/* Aksi */}
                          <div style={styles.colActionsCenter}>
                            <Tooltip title="Lihat">
                              <Button
                                size="small"
                                icon={<EyeOutlined />}
                                onClick={() => openView(r)}
                                style={styles.iconBtn}
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
                                  style={styles.iconBtn}
                                />
                              </Popconfirm>
                            </Tooltip>
                            <Tooltip title="Edit (Assign Konsultan)">
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
        <div style={styles.modalShell}>
          <Spin spinning={detailLoading}>
            {/* Ringkasan read-only */}
            <div style={{ display: "grid", gap: 8, marginBottom: 10 }}>
              <div>
                <div style={styles.label}>{T.name}</div>
                <div style={styles.value}>
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
                  <div style={styles.label}>{T.email}</div>
                  <div style={styles.value}>{detailData?.email || "—"}</div>
                </div>
                <div>
                  <div style={styles.label}>{T.wa}</div>
                  <div style={styles.value}>{detailData?.whatsapp || "—"}</div>
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
                  <div style={styles.label}>{T.domicile}</div>
                  <div style={styles.value}>{detailData?.domicile || "—"}</div>
                </div>
                <div>
                  <div style={styles.label}>{T.edu}</div>
                  <div style={styles.value}>
                    {detailData?.education_last || "—"}
                  </div>
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

              <div style={styles.modalFooter}>
                <Button
                  type="primary"
                  size="large"
                  onClick={onEditSubmit}
                  loading={viewModel.opLoading}
                  style={styles.saveBtn}
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
        <div style={styles.modalShell}>
          <Spin spinning={detailLoading}>
            <div style={{ display: "grid", gap: 8 }}>
              <div>
                <div style={styles.label}>{T.name}</div>
                <div style={styles.value}>
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
                  <div style={styles.label}>{T.email}</div>
                  <div style={styles.value}>{detailData?.email || "—"}</div>
                </div>
                <div>
                  <div style={styles.label}>{T.wa}</div>
                  <div style={styles.value}>{detailData?.whatsapp || "—"}</div>
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
                  <div style={styles.label}>{T.domicile}</div>
                  <div style={styles.value}>{detailData?.domicile || "—"}</div>
                </div>
                <div>
                  <div style={styles.label}>{T.edu}</div>
                  <div style={styles.value}>
                    {detailData?.education_last || "—"}
                  </div>
                </div>
              </div>
              <div>
                <div style={styles.label}>{T.consultant}</div>
                <div style={styles.value}>
                  {viewModel.consultantName?.(
                    detailData?.assigned_to || activeRow?.assigned_to
                  ) || "—"}
                </div>
              </div>
              <div>
                <div style={styles.label}>Tanggal dibuat</div>
                <div style={styles.value}>
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

  /* ringkasan */
  statsRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
    marginTop: 12,
  },
  statCard: {
    background: "#fff",
    borderRadius: 14,
    border: "1px solid #e6eeff",
    boxShadow: "0 10px 24px rgba(11,86,201,0.08)",
    padding: "12px 16px",
    display: "grid",
    gridTemplateColumns: "48px 1fr auto",
    alignItems: "center",
    columnGap: 12,
  },
  statIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    border: "1px solid #e6eeff",
    background: "#f8fbff",
    display: "grid",
    placeItems: "center",
    boxShadow: "inset 0 2px 8px rgba(11,86,201,0.06)",
  },
  statIconImg: {
    width: 32,
    height: 32,
    objectFit: "contain",
    display: "block",
  },
  statTitle: { fontWeight: 800, color: "#0b3e91", textAlign: "center" },
  statValue: { fontWeight: 800, fontSize: 24, color: "#0b56c9" },

  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 18, fontWeight: 800, color: "#0b3e91" },

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

  modalFooter: { marginTop: 8, display: "grid", placeItems: "center" },
  saveBtn: { minWidth: 200, height: 40, borderRadius: 12 },
};
