"use client";

import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useContext,
  createContext,
} from "react";
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
  Tag,
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
  CheckCircleOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";

export const ReferralVMContext = createContext(null);

export default function ReferralContent({ vm }) {
  const ctxVM = useContext(ReferralVMContext);
  const viewModel = vm || ctxVM;

  if (!viewModel) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn(
        "ReferralContent: 'vm' tidak disediakan. Bungkus dengan <ReferralVMContext.Provider value={vm}> atau kirim prop vm."
      );
    }
    return (
      <div style={{ padding: 16 }}>
        VM tidak tersedia. Inisialisasi useReferralViewModel di page dan
        teruskan ke konten.
      </div>
    );
  }

  const TOKENS = {
    shellW: "94%",
    maxW: 1140,
    blue: "#0b56c9",
    text: "#0f172a",
  };

  const T = {
    title: "Manajemen Referral",
    listTitle: "Data Referral",
    searchPh: "Search (nama/nik/email/wa/kode)",
    action: "Aksi",
    addNew: "—",
  };

  const [api, contextHolder] = notification.useNotification();
  const toast = {
    ok: (m, d) =>
      api.success({ message: m, description: d, placement: "topRight" }),
    err: (m, d) =>
      api.error({ message: m, description: d, placement: "topRight" }),
  };

  // UI State
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [activeRow, setActiveRow] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [formEdit] = Form.useForm();

  const rows = useMemo(() => viewModel.referrals || [], [viewModel.referrals]);

  // ===== consultant options state (remote search + cache) =====
  const [consultantOptions, setConsultantOptions] = useState([]);
  const [fetchingConsultant, setFetchingConsultant] = useState(false);

  const loadConsultants = useCallback(
    async (kw = "") => {
      try {
        setFetchingConsultant(true);
        const opts = await viewModel.searchConsultantOptions?.(kw);
        setConsultantOptions(opts || []);
      } finally {
        setFetchingConsultant(false);
      }
    },
    [viewModel]
  );

  // ===== date helper (pakai *_ts kalau ada) =====
  const fmtDateId = (dLike) => {
    if (dLike === null || dLike === undefined || dLike === "") return "—";
    try {
      const dt =
        typeof dLike === "number" ? new Date(dLike) : new Date(String(dLike));
      if (isNaN(dt.getTime())) return "—";
      return dt.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  };

  // search (debounce)
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

  // status filter
  const onChangeStatus = (v) => {
    viewModel.setStatus?.(v || "ALL");
    viewModel.setPage?.(1);
  };

  // open modals
  const openDetail = async (row) => {
    setActiveRow(row);
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailData(null);
    await loadConsultants("");
    const { ok, data, previews, error } = await viewModel.getReferral(row.id);
    setDetailLoading(false);
    if (!ok) {
      setDetailOpen(false);
      return toast.err(
        "Gagal memuat detail",
        error || "Tidak dapat memuat data"
      );
    }
    setDetailData({ ...data, previews });
  };

  const openEdit = async (row) => {
    setActiveRow(row);
    setEditOpen(true);
    setDetailLoading(true);
    const { ok, data, error } = await viewModel.getReferral(row.id);
    setDetailLoading(false);
    if (!ok) {
      setEditOpen(false);
      return toast.err(
        "Gagal memuat detail",
        error || "Tidak dapat memuat data"
      );
    }

    formEdit.setFieldsValue({
      status: data.status,
      notes: data.notes || "",
      pic_consultant_id: data.pic_consultant_id || undefined,
    });

    await loadConsultants("");
    if (data.pic_consultant_id) {
      setConsultantOptions((prev) => {
        const id = String(data.pic_consultant_id);
        const exists = prev.some((o) => String(o.value) === id);
        if (exists) return prev;
        const label =
          viewModel.consultantName?.(id) || `Konsultan ${id.slice(0, 6)}…`;
        return [{ value: id, label }, ...prev];
      });
    }
  };

  const submitEdit = async () => {
    const v = await formEdit.validateFields().catch(() => null);
    if (!v || !activeRow) return;
    const res = await viewModel.updateReferral(activeRow.id, {
      status: v.status,
      notes: v.notes || null,
      pic_consultant_id: v.pic_consultant_id || null,
    });
    if (!res.ok) return toast.err("Gagal menyimpan", res.error);
    toast.ok("Tersimpan", "Perubahan berhasil disimpan.");
    setEditOpen(false);
  };

  const onDelete = async (row) => {
    const res = await viewModel.deleteReferral(row.id);
    if (!res.ok) return toast.err("Gagal menghapus", res.error);
    toast.ok("Terhapus", "Data referral dihapus.");
  };

  const goPrev = () => viewModel.setPage(Math.max(1, viewModel.page - 1));
  const goNext = () => viewModel.setPage(viewModel.page + 1);

  const statusTag = (s) => {
    const up = String(s || "").toUpperCase();
    if (up === "VERIFIED") return <Tag color="green">VERIFIED</Tag>;
    if (up === "REJECTED") return <Tag color="red">REJECTED</Tag>;
    return <Tag color="gold">PENDING</Tag>;
  };

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

          {/* Counters */}
          <div style={styles.statsRow}>
            <div style={styles.statCard}>
              <div style={styles.statIconBox}>
                <CheckCircleOutlined />
              </div>
              <div style={styles.statTitle}>Verified</div>
              <div style={styles.statValue}>{viewModel.cntVerified ?? "—"}</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statIconBox}>
                <CloseCircleOutlined />
              </div>
              <div style={styles.statTitle}>Rejected</div>
              <div style={styles.statValue}>{viewModel.cntRejected ?? "—"}</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statIconBox}>
                <span style={{ fontWeight: 800 }}>P</span>
              </div>
              <div style={styles.statTitle}>Pending</div>
              <div style={styles.statValue}>{viewModel.cntPending ?? "—"}</div>
            </div>
          </div>

          {/* Data Card */}
          <div style={{ ...styles.cardOuter, marginTop: 12 }}>
            <div style={{ ...styles.cardInner, paddingTop: 14 }}>
              <div style={styles.sectionHeader}>
                <div style={styles.sectionTitle}>{T.listTitle}</div>
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
                  value={viewModel.status || "ALL"}
                  onChange={onChangeStatus}
                  options={[
                    { value: "ALL", label: "Semua" },
                    { value: "PENDING", label: "Pending" },
                    { value: "VERIFIED", label: "Verified" },
                    { value: "REJECTED", label: "Rejected" },
                  ]}
                  style={styles.filterSelect}
                  suffixIcon={<FilterOutlined />}
                />
              </div>

              {/* Table */}
              <div style={{ overflowX: "auto" }}>
                <div style={styles.tableHeader}>
                  <div style={{ ...styles.thLeft, paddingLeft: 8 }}>Nama</div>
                  <div style={styles.thCenter}>NIK</div>
                  <div style={styles.thCenter}>WhatsApp</div>
                  <div style={styles.thCenter}>Gender</div>
                  <div style={styles.thCenter}>Status</div>
                  <div style={styles.thCenter}>Kode</div>
                  <div style={styles.thCenter}>{T.action}</div>
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
                    rows.map((r) => (
                      <div key={r.id} style={styles.row}>
                        <div style={styles.colName}>
                          <div style={styles.nameWrap}>
                            <div style={styles.nameText}>
                              {r.full_name || "(tanpa nama)"}
                            </div>
                            <div style={styles.subDate}>
                              {fmtDateId(r.created_ts ?? r.created_at)}
                            </div>
                          </div>
                        </div>
                        <div style={styles.colCenter}>
                          <span style={styles.cellEllipsis}>
                            {r.nik || "—"}
                          </span>
                        </div>
                        <div style={styles.colCenter}>
                          <span style={styles.cellEllipsis}>
                            {r.whatsapp || "—"}
                          </span>
                        </div>
                        <div style={styles.colCenter}>
                          <span style={styles.cellEllipsis}>
                            {r.gender || "—"}
                          </span>
                        </div>
                        <div style={styles.colCenter}>
                          {statusTag(r.status)}
                        </div>
                        <div style={styles.colCenter}>
                          <span style={styles.cellEllipsis}>
                            {r.code || "—"}
                          </span>
                        </div>
                        <div style={styles.colActionsCenter}>
                          <Tooltip title="Lihat">
                            <Button
                              size="small"
                              icon={<EyeOutlined />}
                              onClick={() => openDetail(r)}
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
                              title="Hapus data ini?"
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

      {/* Detail Modal */}
      <Modal
        open={detailOpen}
        onCancel={() => {
          setDetailOpen(false);
          setDetailData(null);
        }}
        footer={null}
        width={760}
        destroyOnClose
        title={null}
      >
        <div style={styles.modalShell}>
          <Spin spinning={detailLoading}>
            {!detailData ? null : (
              <div style={{ display: "grid", gap: 10 }}>
                <div>
                  <div style={styles.label}>Nama</div>
                  <div style={styles.value}>{detailData.full_name || "—"}</div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                  }}
                >
                  <div>
                    <div style={styles.label}>NIK</div>
                    <div style={styles.value}>{detailData.nik || "—"}</div>
                  </div>
                  <div>
                    <div style={styles.label}>Gender</div>
                    <div style={styles.value}>{detailData.gender || "—"}</div>
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
                    <div style={styles.label}>WhatsApp</div>
                    <div style={styles.value}>{detailData.whatsapp || "—"}</div>
                  </div>
                  <div>
                    <div style={styles.label}>Email</div>
                    <div style={styles.value}>{detailData.email || "—"}</div>
                  </div>
                </div>

                <div>
                  <div style={styles.label}>Pekerjaan</div>
                  <div style={styles.value}>{detailData.pekerjaan || "—"}</div>
                </div>

                <div>
                  <div style={styles.label}>PIC Konsultan</div>
                  <div style={styles.value}>
                    {viewModel.consultantName?.(detailData.pic_consultant_id) ||
                      detailData.pic_consultant_id ||
                      "—"}
                  </div>
                </div>

                <div>
                  <div style={styles.label}>Alamat KTP</div>
                  <div style={styles.value}>
                    {[
                      detailData.address_line,
                      `RT ${detailData.rt || "-"}/RW ${detailData.rw || "-"}`,
                      detailData.kelurahan,
                      detailData.kecamatan,
                      detailData.city,
                      detailData.province,
                      detailData.postal_code,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                </div>

                <div>
                  <div style={styles.label}>Status</div>
                  <div style={styles.value}>{detailData.status}</div>
                </div>

                <div>
                  <div style={styles.label}>Kode Referral</div>
                  <div style={styles.value}>{detailData.code || "—"}</div>
                </div>

                <div>
                  <div style={styles.label}>Foto KTP</div>
                  <div style={{ ...styles.value, padding: 10 }}>
                    {detailData?.previews?.front ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={detailData.previews.front}
                        alt="KTP"
                        style={{ maxWidth: "100%", borderRadius: 8 }}
                      />
                    ) : (
                      "—"
                    )}
                  </div>
                </div>
              </div>
            )}
          </Spin>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        footer={null}
        width={720}
        destroyOnClose
        title={null}
      >
        <div style={styles.modalShell}>
          <Spin spinning={detailLoading}>
            <Form layout="vertical" form={formEdit}>
              <Form.Item
                label="Status"
                name="status"
                rules={[{ required: true, message: "Status wajib" }]}
              >
                <Select
                  options={[
                    { value: "PENDING", label: "PENDING" },
                    { value: "VERIFIED", label: "VERIFIED" },
                    { value: "REJECTED", label: "REJECTED" },
                  ]}
                />
              </Form.Item>

              <Form.Item label="PIC Konsultan" name="pic_consultant_id">
                <Select
                  showSearch
                  placeholder="Pilih/ketik nama konsultan"
                  filterOption={false}
                  optionFilterProp="label"
                  onFocus={() => loadConsultants("")}
                  onSearch={(kw) => loadConsultants(kw)}
                  options={consultantOptions}
                  notFoundContent={fetchingConsultant ? "Loading..." : null}
                  allowClear
                />
              </Form.Item>

              <Form.Item label="Catatan (optional)" name="notes">
                <Input.TextArea autoSize={{ minRows: 3, maxRows: 6 }} />
              </Form.Item>

              <div
                style={{ display: "grid", placeItems: "center", marginTop: 8 }}
              >
                <Button
                  type="primary"
                  size="large"
                  onClick={submitEdit}
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

  statsRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
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
    gridTemplateColumns: "1fr 180px",
    gap: 8,
    marginBottom: 10,
    alignItems: "center",
  },
  searchInput: { height: 36, borderRadius: 10 },
  filterSelect: { width: "100%" },

  tableHeader: {
    display: "grid",
    gridTemplateColumns: "1.6fr 1.1fr 1fr .8fr .9fr .9fr .8fr",
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
    gridTemplateColumns: "1.6fr 1.1fr 1fr .8fr .9fr .9fr .8fr",
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
};
