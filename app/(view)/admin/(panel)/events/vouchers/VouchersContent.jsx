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
  Switch,
  DatePicker,
  notification,
  InputNumber,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  LeftOutlined,
  RightOutlined,
  SearchOutlined,
  DownloadOutlined,
  PlusCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

/* ===== compact tokens ===== */
const TOKENS = {
  shellW: "94%",
  maxW: 1140,
  blue: "#0b56c9",
  text: "#0f172a",
};

const T = {
  title: "Data Voucher",
  totalLabel: "Total Voucher",
  listTitle: "Daftar Voucher",
  searchPh: "Cari Kode Voucher",
  typePh: "Tipe",
  statusPh: "Status",
  action: "Aksi",
  view: "Lihat",
  edit: "Ubah",
  del: "Nonaktifkan",
  downloadCSV: "Download CSV",
  create: "Buat Voucher",

  colCode: "Kode",
  colType: "Tipe",
  colValue: "Nilai",
  colMaxDisc: "Maks Diskon",
  colActive: "Status",
  colUsage: "Terpakai",
  colPeriod: "Periode",
};

const TYPE_OPTS = [
  { value: "ALL", label: "Semua Tipe" },
  { value: "PERCENT", label: "Percent" },
  { value: "FIXED", label: "Fixed" },
];

const STATUS_OPTS = [
  { value: "ALL", label: "Semua Status" },
  { value: "ACTIVE", label: "Aktif" },
  { value: "INACTIVE", label: "Nonaktif" },
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
    return `${dt.getDate()} ${monthsId[dt.getMonth()]} ${dt.getFullYear()}`;
  } catch {
    return "-";
  }
};

// ⬇️ Perbaikan separator pakai dash biasa, bukan karakter encoding aneh
const fmtRange = (from, to) => {
  const a = fmtDateId(from);
  const b = fmtDateId(to);
  if (a === "-" && b === "-") return "-";
  if (a !== "-" && b !== "-") return `${a} - ${b}`;
  return a !== "-" ? `${a} -` : `- ${b}`;
};

/* ===== NEW: IDR currency helper ===== */
const fmtIDR = (n) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return "Rp. -";
  return `Rp. ${v.toLocaleString("id-ID")}`;
};

/* ===== Thousand separator helper (untuk InputNumber) ===== */
const formatThousand = (value) => {
  const v = value == null || value === "" ? "" : String(value);
  if (!v) return "";
  return v.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const parseThousand = (value) => {
  const v = value == null ? "" : String(value);
  return v.replace(/\./g, "");
};

/* ===== responsive hook (optional) ===== */
function useIsNarrow(bp = 900) {
  const [n, setN] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(`(max-width:${bp}px)`);
    const apply = () => setN(mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, [bp]);
  return n;
}

export default function VouchersContent({ vm }) {
  const [notify, contextHolder] = notification.useNotification();
  const ok = (message, description) =>
    notify.success({ message, description, placement: "topRight" });
  const err = (message, description) =>
    notify.error({ message, description, placement: "topRight" });

  const { shellW, maxW, blue, text } = TOKENS;
  const isNarrow = useIsNarrow(920);

  /* ===== rows (client-filtered in VM) ===== */
  const rows = useMemo(() => vm.rows || [], [vm.rows]);

  /* ===== search (debounce -> vm.setQ) ===== */
  const [searchValue, setSearchValue] = useState(vm.q || "");
  useEffect(() => setSearchValue(vm.q || ""), [vm.q]);
  useEffect(() => {
    const t = setTimeout(() => {
      vm.setQ?.((searchValue || "").trim());
      vm.setPage?.(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchValue]); // eslint-disable-line

  /* ===== Create / Edit modal states ===== */
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState("create"); // create | edit
  const [formLoading, setFormLoading] = useState(false);
  const [formValues, setFormValues] = useState({
    code: "",
    type: "PERCENT",
    value: 10,
    max_discount: 0, // only PERCENT
    is_active: true,
    max_uses: null,
    valid_from: null,
    valid_to: null,
  });
  const [currentId, setCurrentId] = useState(null);

  const resetForm = () => {
    setFormValues({
      code: "",
      type: "PERCENT",
      value: 10,
      max_discount: 0,
      is_active: true,
      max_uses: null,
      valid_from: null,
      valid_to: null,
    });
    setCurrentId(null);
  };

  const openCreate = () => {
    setFormMode("create");
    resetForm();
    setFormOpen(true);
  };

  const openEdit = async (row) => {
    setFormMode("edit");
    setFormOpen(true);
    setFormLoading(true);
    setCurrentId(row.id);
    const res = await vm.getVoucher(row.id);
    setFormLoading(false);
    if (!res?.ok) {
      setFormOpen(false);
      return err("Gagal membuka data", res?.error || "Terjadi kesalahan");
    }
    const d = res.data || {};
    setFormValues({
      code: d.code || "",
      type: (d.type || "PERCENT").toUpperCase(),
      value: d.value ?? 0,
      max_discount: d.max_discount ?? null,
      is_active: !!d.is_active,
      max_uses: d.max_uses ?? null,
      valid_from: d.valid_from ? dayjs(d.valid_from) : null,
      valid_to: d.valid_to ? dayjs(d.valid_to) : null,
    });
  };

  const closeForm = () => {
    setFormOpen(false);
    setFormLoading(false);
    resetForm();
  };

  /* ===== Handlers ===== */
  const onDelete = async (row) => {
    const res = await vm.deleteVoucher(row.id);
    if (!res?.ok) return err("Gagal", res?.error || "Tidak bisa menonaktifkan");
    ok("Berhasil", "Voucher dinonaktifkan");
  };

  const onSave = async () => {
    const payload = {
      code: String(formValues.code || "").trim(),
      type: (formValues.type || "PERCENT").toUpperCase(),
      value: Number(formValues.value ?? 0),
      max_discount:
        (formValues.type || "PERCENT").toUpperCase() === "PERCENT"
          ? formValues.max_discount != null
            ? Number(formValues.max_discount)
            : null
          : null,
      is_active: !!formValues.is_active,
      max_uses:
        formValues.max_uses === "" || formValues.max_uses == null
          ? null
          : Number(formValues.max_uses),
      valid_from: formValues.valid_from ? formValues.valid_from.toDate() : null,
      valid_to: formValues.valid_to ? formValues.valid_to.toDate() : null,
    };

    if (!payload.code) return err("Validasi", "Kode tidak boleh kosong");
    if (payload.type === "PERCENT") {
      if (payload.value < 1 || payload.value > 100)
        // ⬇️ perbaiki teks, pakai dash biasa
        return err("Validasi", "Nilai (percent) harus 1-100");
      if (payload.max_discount != null && payload.max_discount < 0)
        return err("Validasi", "Maks diskon harus >= 0 atau kosong");
    } else {
      if (payload.value < 0) return err("Validasi", "Nilai (fixed) harus >= 0");
    }
    if (
      payload.valid_from &&
      payload.valid_to &&
      payload.valid_to < payload.valid_from
    ) {
      return err("Validasi", "Tanggal akhir harus sesudah tanggal mulai");
    }

    setFormLoading(true);
    const res =
      formMode === "create"
        ? await vm.createVoucher(payload)
        : await vm.updateVoucher(currentId, payload);
    setFormLoading(false);

    if (!res?.ok) return err("Gagal", res?.error || "Operasi gagal");
    ok(
      "Berhasil",
      formMode === "create" ? "Voucher dibuat" : "Voucher diperbarui"
    );
    closeForm();
  };

  // CSV (sesuaikan format % dan Rp.)
  const downloadCSV = () => {
    const head = [
      "Kode",
      "Tipe",
      "Nilai",
      "Max Diskon",
      "Aktif?",
      "Terpakai",
      "Maks Pakai",
      "Periode",
      "Dibuat",
      "Diupdate",
    ];
    const lines = [head.join(",")];
    rows.forEach((r) => {
      const code = (r.code || "").replace(/"/g, '""');
      const type = String(r.type || "").toUpperCase();
      const value =
        r.value == null
          ? ""
          : type === "PERCENT"
          ? `${r.value}%`
          : String(r.value);
      const md =
        type === "PERCENT" && r.max_discount != null
          ? `Rp. ${Number(r.max_discount).toLocaleString("id-ID")}`
          : "";
      const active = r.is_active ? "Ya" : "Tidak";
      const used = r.used_count ?? 0;
      const maxu = r.max_uses ?? "";
      const period = fmtRange(r.valid_from, r.valid_to).replace(/"/g, '""');
      const cr = fmtDateId(r.created_at);
      const up = fmtDateId(r.updated_at);
      lines.push(
        [code, type, value, md, active, used, maxu, period, cr, up]
          .map((x) => `"${x}"`)
          .join(",")
      );
    });
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vouchers_${new Date().toISOString().slice(0, 10)}.csv`;
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
                  {vm.total ?? rows.length ?? "-"}
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
                  {T.create}
                </Button>
              </div>

              {/* Filters + Download CSV */}
              <div
                style={{
                  ...styles.filtersRow3,
                  gridTemplateColumns: isNarrow
                    ? "1fr"
                    : "1fr 160px 180px auto",
                }}
              >
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
                  value={vm.uiType || "ALL"}
                  onChange={(v) => {
                    vm.setUiType(v);
                    vm.setPage(1);
                  }}
                  options={TYPE_OPTS}
                  placeholder={T.typePh}
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

                <Button
                  icon={<DownloadOutlined />}
                  onClick={downloadCSV}
                  type="default"
                  style={{ justifySelf: isNarrow ? "stretch" : "end" }}
                >
                  {T.downloadCSV}
                </Button>
              </div>

              {/* Table */}
              <div style={{ overflowX: "auto" }}>
                <div style={styles.tableHeader}>
                  <div style={styles.thLeft}>{T.colCode}</div>
                  <div style={styles.thCenter}>{T.colType}</div>
                  <div style={styles.thCenter}>{T.colValue}</div>
                  <div style={styles.thCenter}>{T.colMaxDisc}</div>
                  <div style={styles.thCenter}>{T.colActive}</div>
                  <div style={styles.thCenter}>{T.colUsage}</div>
                  <div style={styles.thCenter}>{T.colPeriod}</div>
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
                      const typeU = String(r.type || "").toUpperCase();
                      const statusTag = r.is_active ? (
                        <Tag color="green">Aktif</Tag>
                      ) : (
                        <Tag color="red">Nonaktif</Tag>
                      );
                      return (
                        <div key={r.id} style={styles.row}>
                          <div style={styles.colName}>
                            <div style={styles.nameWrap}>
                              <div
                                style={styles.nameText}
                                title={r.code || "-"}
                              >
                                {r.code || "-"}
                              </div>
                              <div style={styles.subDate}>
                                Dibuat: {fmtDateId(r.created_at)}
                              </div>
                            </div>
                          </div>

                          <div style={styles.colCenter}>{typeU}</div>

                          {/* Nilai: % kalau PERCENT, Rp kalau FIXED */}
                          <div style={styles.colCenter}>
                            {r.value != null
                              ? typeU === "PERCENT"
                                ? `${r.value}%`
                                : fmtIDR(r.value)
                              : "-"}
                          </div>

                          {/* Maks Diskon: tampil Rp. ... kalau PERCENT */}
                          <div style={styles.colCenter}>
                            {typeU === "PERCENT"
                              ? r.max_discount != null
                                ? fmtIDR(r.max_discount)
                                : "-"
                              : "-"}
                          </div>

                          <div style={styles.colCenter}>{statusTag}</div>

                          <div style={styles.colCenter}>
                            {r.used_count ?? 0}/{r.max_uses ?? "∞"}
                          </div>

                          <div style={styles.colCenter}>
                            {fmtRange(r.valid_from, r.valid_to)}
                          </div>

                          <div style={styles.colActionsCenter}>
                            <Tooltip title={T.edit}>
                              <Button
                                size="small"
                                icon={<EditOutlined />}
                                onClick={() => openEdit(r)}
                                loading={
                                  vm.opLoadingId === r.id &&
                                  vm.opType === "view"
                                }
                                style={styles.iconBtn}
                              />
                            </Tooltip>

                            <Tooltip title={T.del}>
                              <Popconfirm
                                title="Nonaktifkan voucher ini?"
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
                    (vm.totalPages ? vm.page >= vm.totalPages : false)
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Create/Edit Modal */}
      <Modal
        open={formOpen}
        onCancel={closeForm}
        onOk={onSave}
        okText={formMode === "create" ? "Buat" : "Simpan"}
        title={formMode === "create" ? "Buat Voucher" : "Ubah Voucher"}
        confirmLoading={formLoading}
        destroyOnClose
        width={720}
      >
        <Spin spinning={formLoading}>
          <div style={{ display: "grid", gap: 10 }}>
            <div style={styles.label}>Kode Voucher</div>
            <Input
              placeholder="Contoh: NEWYEAR50"
              value={formValues.code}
              onChange={(e) =>
                setFormValues((s) => ({ ...s, code: e.target.value }))
              }
              maxLength={64}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              <div>
                <div style={styles.label}>Tipe</div>
                <Select
                  value={formValues.type}
                  onChange={(v) => setFormValues((s) => ({ ...s, type: v }))}
                  options={[
                    { value: "PERCENT", label: "Percent" },
                    { value: "FIXED", label: "Fixed" },
                  ]}
                />
              </div>
              <div>
                <div style={styles.label}>
                  Nilai {formValues.type === "PERCENT" ? "(%)" : "(Rp)"}
                </div>
                <InputNumber
                  min={0}
                  max={formValues.type === "PERCENT" ? 100 : undefined}
                  value={formValues.value}
                  onChange={(v) =>
                    setFormValues((s) => ({ ...s, value: v ?? 0 }))
                  }
                  style={{ width: "100%" }}
                  // ⬇️ hanya format ribuan kalau tipe FIXED
                  formatter={
                    formValues.type === "FIXED"
                      ? (value) => formatThousand(value)
                      : undefined
                  }
                  parser={
                    formValues.type === "FIXED"
                      ? (value) => parseThousand(value)
                      : undefined
                  }
                />
              </div>
            </div>

            {formValues.type === "PERCENT" ? (
              <div>
                <div style={styles.label}>Maks Diskon (opsional)</div>
                <InputNumber
                  min={0}
                  value={formValues.max_discount}
                  onChange={(v) =>
                    setFormValues((s) => ({
                      ...s,
                      max_discount: v == null ? null : v,
                    }))
                  }
                  style={{ width: "100%" }}
                  placeholder="Boleh kosong"
                  // ⬇️ selalu format ribuan karena ini rupiah
                  formatter={(value) => formatThousand(value)}
                  parser={(value) => parseThousand(value)}
                />
              </div>
            ) : null}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              <div>
                <div style={styles.label}>Maks Pemakaian (opsional)</div>
                <InputNumber
                  min={0}
                  value={formValues.max_uses}
                  onChange={(v) =>
                    setFormValues((s) => ({
                      ...s,
                      max_uses: v == null ? null : v,
                    }))
                  }
                  style={{ width: "100%" }}
                  placeholder="Kosong = tanpa batas"
                />
              </div>
              <div>
                <div style={styles.label}>Status</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Switch
                    checked={formValues.is_active}
                    onChange={(v) =>
                      setFormValues((s) => ({ ...s, is_active: v }))
                    }
                  />
                  <span>{formValues.is_active ? "Aktif" : "Nonaktif"}</span>
                </div>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              <div>
                <div style={styles.label}>Berlaku Dari</div>
                <DatePicker
                  style={{ width: "100%" }}
                  value={formValues.valid_from}
                  onChange={(d) =>
                    setFormValues((s) => ({ ...s, valid_from: d }))
                  }
                  format="YYYY-MM-DD"
                />
              </div>
              <div>
                <div style={styles.label}>Berlaku Sampai</div>
                <DatePicker
                  style={{ width: "100%" }}
                  value={formValues.valid_to}
                  onChange={(d) =>
                    setFormValues((s) => ({ ...s, valid_to: d }))
                  }
                  format="YYYY-MM-DD"
                />
              </div>
            </div>
          </div>
        </Spin>
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
    gap: 8,
    marginBottom: 8,
    flexWrap: "wrap",
  },
  sectionTitle: { fontSize: 18, fontWeight: 800, color: "#0b3e91" },

  filtersRow3: {
    display: "grid",
    gap: 8,
    marginBottom: 10,
    alignItems: "center",
  },
  searchInput: { height: 36, borderRadius: 10 },

  tableHeader: {
    display: "grid",
    gridTemplateColumns: "1.4fr .8fr .8fr .9fr .8fr .8fr 1.2fr .9fr",
    gap: 8,
    marginBottom: 4,
    color: "#0b3e91",
    fontWeight: 700,
    alignItems: "center",
    minWidth: 1080,
  },
  thLeft: { display: "flex", justifyContent: "flex-start", width: "100%" },
  thCenter: { display: "flex", justifyContent: "center", width: "100%" },

  row: {
    display: "grid",
    gridTemplateColumns: "1.4fr .8fr .8fr .9fr .8fr .8fr 1.2fr .9fr",
    gap: 8,
    alignItems: "center",
    background: "#f5f8ff",
    borderRadius: 10,
    border: "1px solid #e8eeff",
    padding: "8px 10px",
    boxShadow: "0 6px 12px rgba(11, 86, 201, 0.05)",
    minWidth: 1080,
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
};
