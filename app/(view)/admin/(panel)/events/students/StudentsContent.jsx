"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ConfigProvider,
  Button,
  Modal,
  Input,
  Empty,
  Skeleton,
  Popconfirm,
  Tooltip,
  Spin,
  Select,
  Tag,
  notification,
} from "antd";
import {
  EyeOutlined,
  DeleteOutlined,
  LeftOutlined,
  RightOutlined,
  SearchOutlined,
  MailOutlined,
  DownloadOutlined,
} from "@ant-design/icons";

/* ===== compact tokens ===== */
const TOKENS = {
  shellW: "94%",
  maxW: 1140,
  blue: "#0b56c9",
  text: "#0f172a",
};

const T = {
  title: "Data Student",
  totalLabel: "Total Student",
  listTitle: "Daftar Student",
  searchPh: "Cari Nama Student",
  statusPh: "Status",
  categoryPh: "Kategori",
  action: "Aksi",
  view: "Lihat",
  resend: "Kirim Ulang Ticket",
  del: "Hapus",
  downloadCSV: "Download CSV",

  colEvent: "Nama Event",
  colStudent: "Nama Student",
  colTicketStatus: "Status Tiket",
  colTicketId: "ID Tiket",
};

const STATUS_OPTS = [
  { value: "ALL", label: "Semua" },
  { value: "CONFIRMED", label: "Available" },
  { value: "EXPIRED", label: "Expired" },
];

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
  if (dLike == null || dLike === "") return "-";
  try {
    const dt =
      typeof dLike === "number" ? new Date(dLike) : new Date(String(dLike));
    if (isNaN(dt.getTime())) return "-";
    return `${dt.getDate()} ${monthsId[dt.getMonth()]}`;
  } catch {
    return "-";
  }
};

export default function StudentsContent({ vm }) {
  const [notify, contextHolder] = notification.useNotification();
  const ok = (message, description) =>
    notify.success({ message, description, placement: "topRight" });
  const err = (message, description) =>
    notify.error({ message, description, placement: "topRight" });

  const rows = useMemo(() => vm.tickets || [], [vm.tickets]);
  const { shellW, maxW, blue, text } = TOKENS;

  // search (debounce -> vm.setQ)
  const [searchValue, setSearchValue] = useState(vm.q || "");
  useEffect(() => setSearchValue(vm.q || ""), [vm.q]);
  useEffect(() => {
    const t = setTimeout(() => {
      vm.setQ?.((searchValue || "").trim());
      vm.setPage?.(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchValue]); // eslint-disable-line

  // view modal
  const [viewOpen, setViewOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState(null);

  const openView = async (row) => {
    setDetailLoading(true);
    setViewOpen(true);
    const res = await vm.getTicket(row.id);
    setDetailLoading(false);
    if (!res?.ok) {
      setViewOpen(false);
      err("Gagal memuat detail", res?.error || "Terjadi kesalahan");
      return;
    }
    setDetailData(res.data);
  };

  const onDelete = async (row) => {
    const res = await vm.deleteTicket(row.id);
    if (!res?.ok)
      return err("Gagal menghapus", res?.error || "Tidak bisa menghapus");
    ok("Berhasil", "Ticket dihapus");
  };

  const onResend = async (row) => {
    const res = await vm.resendTicket(row.id);
    if (!res?.ok)
      return err("Gagal mengirim ulang", res?.error || "Tidak bisa mengirim");
    ok("Dikirim", "Ticket berhasil dikirim ulang ke email student");
  };

  // === CSV export (client-side) ===
  const downloadCSV = () => {
    const head = [
      "Nama Event",
      "Nama Student",
      "Status Tiket",
      "ID Tiket",
      "Email",
      "WhatsApp",
      "Created",
    ];
    const lines = [head.join(",")];
    rows.forEach((r) => {
      const ev = (r.event_title || "").replace(/"/g, '""');
      const nm = (r.full_name || "").replace(/"/g, '""');
      const st = r._statusLabel || r.status || "";
      const tc = (r.ticket_code || "").replace(/"/g, '""');
      const em = (r.email || "").replace(/"/g, '""');
      const wa = (r.whatsapp || "").replace(/"/g, '""');
      const cr = fmtDateId(r.created_at);
      lines.push([ev, nm, st, tc, em, wa, cr].map((x) => `"${x}"`).join(","));
    });
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `students_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
          {/* Header Card */}
          <div style={styles.cardOuter}>
            <div style={styles.cardHeaderBar} />
            <div style={styles.cardInner}>
              <div style={styles.cardTitle}>{T.title}</div>
              <div style={styles.totalBadgeWrap}>
                <div style={styles.totalBadgeLabel}>{T.totalLabel}</div>
                <div style={styles.totalBadgeValue}>
                  {vm.total ?? rows.length ?? "â€”"}
                </div>
              </div>
            </div>
          </div>

          {/* Data Card */}
          <div style={{ ...styles.cardOuter, marginTop: 12 }}>
            <div style={{ ...styles.cardInner, paddingTop: 14 }}>
              <div style={styles.sectionHeader}>
                <div style={styles.sectionTitle}>{T.listTitle}</div>
              </div>

              {/* Filters + Download CSV (sebaris) */}
              <div style={styles.filtersRow3}>
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
                  value={vm.uiStatus || "ALL"}
                  onChange={(v) => {
                    vm.setUiStatus(v);
                    vm.setPage(1);
                  }}
                  options={STATUS_OPTS}
                  placeholder={T.statusPh}
                />

                <Select
                  allowClear
                  showSearch
                  placeholder={T.categoryPh}
                  value={vm.eventId || undefined} // â† nilai = id event
                  onChange={(v) => {
                    vm.setEventId(v || "");
                    vm.setPage(1);
                  }}
                  options={vm.eventOptions} // â† dari VM
                  optionFilterProp="label" // agar pencarian pakai label (judul)
                  filterOption={(input, opt) =>
                    String(opt?.label ?? "")
                      .toLowerCase()
                      .includes(String(input).toLowerCase())
                  }
                />

                <Button
                  icon={<DownloadOutlined />}
                  onClick={downloadCSV}
                  type="default"
                  style={{ justifySelf: "end" }}
                >
                  {T.downloadCSV}
                </Button>
              </div>

              {/* Table */}
              <div style={{ overflowX: "auto" }}>
                <div style={styles.tableHeader}>
                  <div style={{ ...styles.thLeft, paddingLeft: 8 }}>
                    {T.colEvent}
                  </div>
                  <div style={styles.thCenter}>{T.colStudent}</div>
                  <div style={styles.thCenter}>{T.colTicketStatus}</div>
                  <div style={styles.thCenter}>{T.colTicketId}</div>
                  <div style={styles.thCenter}>{T.action}</div>
                </div>

                <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
                  {vm.loading ? (
                    <div style={{ padding: "8px 4px" }}>
                      <Skeleton active paragraph={{ rows: 3 }} />
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
                      const statusLabel =
                        r._statusLabel ||
                        (r.status === "CONFIRMED"
                          ? "Available"
                          : r.status === "CANCELLED"
                          ? "Expired"
                          : r.expires_at
                          ? "Expired"
                          : "Pending");

                      const statusTag =
                        statusLabel === "Available" ? (
                          <Tag color="green">Available</Tag>
                        ) : statusLabel === "Expired" ? (
                          <Tag color="red">Expired</Tag>
                        ) : statusLabel === "Pending" ? (
                          <Tag color="blue">Pending</Tag>
                        ) : (
                          <Tag>â€”</Tag>
                        );

                      return (
                        <div key={r.id} style={styles.row}>
                          <div style={styles.colName}>
                            <div style={styles.nameWrap}>
                              <div
                                style={styles.nameText}
                                title={r.event_title || "â€”"}
                              >
                                {r.event_title || "â€”"}
                              </div>
                              <div style={styles.subDate}>
                                {fmtDateId(r.created_at)}
                              </div>
                            </div>
                          </div>

                          <div style={styles.colCenter}>
                            {r.full_name || "-"}
                          </div>

                          <div style={styles.colCenter}>{statusTag}</div>

                          <div style={styles.colCenter}>
                            {r.ticket_code || "-"}
                          </div>

                          <div style={styles.colActionsCenter}>
                            <Tooltip title={T.view}>
                              <Button
                                size="small"
                                icon={<EyeOutlined />}
                                onClick={() => openView(r)}
                                style={styles.iconBtn}
                              />
                            </Tooltip>

                            <Tooltip title={T.resend}>
                              <Button
                                size="small"
                                icon={<MailOutlined />}
                                onClick={() => onResend(r)}
                                loading={
                                  vm.opLoadingId === r.id &&
                                  vm.opType === "resend"
                                }
                                style={styles.iconBtn}
                              />
                            </Tooltip>

                            <Tooltip title={T.del}>
                              <Popconfirm
                                title="Hapus ticket ini?"
                                okText="Ya"
                                cancelText="Batal"
                                onConfirm={() => onDelete(r)}
                              >
                                <Button
                                  size="small"
                                  danger
                                  icon={<DeleteOutlined />}
                                  loading={
                                    vm.opLoadingId === r.id &&
                                    vm.opType === "delete"
                                  }
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

      {/* View Modal */}
      <Modal
        open={viewOpen}
        onCancel={() => {
          setViewOpen(false);
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
                  <div style={styles.label}>Nama Event</div>
                  <div style={styles.value}>
                    {detailData?.event_title || "â€”"}
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
                    <div style={styles.label}>Nama Student</div>
                    <div style={styles.value}>
                      {detailData?.full_name || "â€”"}
                    </div>
                  </div>
                  <div>
                    <div style={styles.label}>Email</div>
                    <div style={styles.value}>{detailData?.email || "â€”"}</div>
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
                    <div style={styles.value}>
                      {detailData?.whatsapp || "â€”"}
                    </div>
                  </div>
                  <div>
                    <div style={styles.label}>ID Tiket</div>
                    <div style={styles.value}>
                      {detailData?.ticket_code || "â€”"}
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
                    <div style={styles.label}>Status</div>
                    <div style={styles.value}>{detailData?.status || "â€”"}</div>
                  </div>
                  <div>
                    <div style={styles.label}>Check-in</div>
                    <div style={styles.value}>
                      {detailData?.checkin_status || "â€”"}
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
                    <div style={styles.label}>Dibuat</div>
                    <div style={styles.value}>
                      {fmtDateId(detailData?.created_at)}
                    </div>
                  </div>
                  <div>
                    <div style={styles.label}>Diupdate</div>
                    <div style={styles.value}>
                      {fmtDateId(detailData?.updated_at)}
                    </div>
                  </div>
                </div>
              </div>
            )}
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

  // kolom terakhir dipakai utk tombol CSV
  filtersRow3: {
    display: "grid",
    gridTemplateColumns: "1fr 160px 220px auto",
    gap: 8,
    marginBottom: 10,
    alignItems: "center",
  },
  searchInput: { height: 36, borderRadius: 10 },

  tableHeader: {
    display: "grid",
    gridTemplateColumns: "2fr 1.4fr .9fr 1fr .9fr",
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
    gridTemplateColumns: "2fr 1.4fr .9fr 1fr .9fr",
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
};

