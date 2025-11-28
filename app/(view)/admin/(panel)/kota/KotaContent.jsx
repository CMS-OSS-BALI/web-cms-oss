// app/(view)/admin/kota/KotaContent.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ConfigProvider,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Empty,
  Skeleton,
  Popconfirm,
  Tooltip,
  Spin,
  Select,
  Switch,
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
  FilterOutlined,
} from "@ant-design/icons";

/* ===== compact tokens ===== */
const TOKENS = {
  shellW: "94%",
  maxW: 1140,
  blue: "#0b56c9",
  text: "#0f172a",
};

/* ===== Grid kolom
   Kota | Negara | Living cost | Status | Aksi  ===== */
const GRID_COLS =
  "minmax(260px,2fr) minmax(220px,1.3fr) minmax(180px,.9fr) minmax(120px,.7fr) 120px";

const T = {
  title: "Manajemen Kota",
  totalLabel: "Total Kota",
  listTitle: "Data Kota",
  addNew: "Buat Kota Baru",
  searchPh: "Cari nama kota",
  kotaCol: "Nama Kota",
  negaraCol: "Negara",
  livingCol: "Living Cost (IDR)",
  statusCol: "Status",
  action: "Aksi",
  view: "Lihat",
  edit: "Edit",
  del: "Nonaktifkan",
  activate: "Aktifkan",
  save: "Simpan",

  // form
  nameId: "Nama Kota (Bahasa Indonesia)",
  negara: "Negara",
  livingCost: "Perkiraan living cost (IDR) (opsional)",
  isActive: "Status Aktif",

  // sorting
  sort: "Urutkan",
  sNewest: "Dibuat terbaru",
  sOldest: "Dibuat terlama",
  sUpdatedNewest: "Diubah terbaru",
  sUpdatedOldest: "Diubah terlama",

  // status filter
  statusFilter: "Status",
  statusAll: "Semua",
  statusActive: "Aktif",
  statusInactive: "Nonaktif",
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
  if (dLike === null || dLike === undefined || dLike === "") return "—";
  try {
    const dt =
      typeof dLike === "number" ? new Date(dLike) : new Date(String(dLike));
    if (Number.isNaN(dt.getTime())) return "—";
    const day = dt.getDate();
    const month = monthsId[dt.getMonth()];
    const year = dt.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return "—";
  }
};

/* tanggal: created_ts -> created_at -> updated_ts -> updated_at */
const pickCreated = (obj) =>
  obj?.created_ts ??
  obj?.created_at ??
  obj?.updated_ts ??
  obj?.updated_at ??
  null;

/* ==== currency helpers ==== */
const fmtIdr = (v) => {
  if (v === null || v === undefined || v === "") return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  const hasFrac = Math.abs(n - Math.round(n)) > 1e-6;
  return (
    "Rp " +
    new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: hasFrac ? 2 : 0,
      maximumFractionDigits: 2,
    }).format(n)
  );
};

// untuk InputNumber.stringMode
const idrFormatter = (val) => {
  if (val === undefined || val === null || val === "") return "";
  const s = String(val).replace(/[^\d.,-]/g, "");
  const negative = s.startsWith("-") ? "-" : "";
  const raw = negative ? s.slice(1) : s;
  const cleaned = raw.replace(/[^0-9.,]/g, "");
  let int = cleaned;
  let frac = "";
  if (cleaned.includes(".")) {
    const [i, f] = cleaned.split(".");
    int = i;
    frac = f ? "," + f.slice(0, 2) : "";
  } else if (cleaned.includes(",")) {
    const [i, f] = cleaned.split(",");
    int = i;
    frac = f ? "," + f.slice(0, 2) : "";
  }
  int = int.replace(/\D/g, "");
  if (!int) int = "0";
  int = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${negative}Rp ${int}${frac}`;
};

const idrParser = (val) => {
  if (!val) return "";
  const s = String(val).replace(/[^\d,.\-]/g, "");
  const noThousand = s.replace(/\./g, "");
  const lastComma = noThousand.lastIndexOf(",");
  if (lastComma >= 0) {
    const left = noThousand.slice(0, lastComma).replace(/,/g, "");
    const right = noThousand.slice(lastComma + 1);
    return `${left}.${right}`;
  }
  return noThousand.replace(/,/g, "");
};

export default function KotaContent({ vm, initialLocale = "id" }) {
  const viewModel = vm ?? require("./useKotaViewModel").default();

  // sinkron locale dari prop (kalau nanti multi-locale)
  useEffect(() => {
    viewModel.setLocale?.(initialLocale);
    viewModel.setFallback?.(initialLocale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLocale]);

  // ----- notifications -----
  const [api, contextHolder] = notification.useNotification();
  const toast = {
    ok: (msg, desc) =>
      api.success({ message: msg, description: desc, placement: "topRight" }),
    err: (msg, desc) =>
      api.error({ message: msg, description: desc, placement: "topRight" }),
    info: (msg, desc) =>
      api.info({ message: msg, description: desc, placement: "topRight" }),
  };

  // ----- UI state
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [activeRow, setActiveRow] = useState(null);
  const [formCreate] = Form.useForm();
  const [formEdit] = Form.useForm();
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState(null);

  const rows = useMemo(() => viewModel.kota || [], [viewModel.kota]);

  // refresh nama negara berdasar rows (cache di VM)
  useEffect(() => {
    viewModel.refreshNegaraNamesForPage?.(rows);
  }, [rows, viewModel]); // eslint-disable-line

  // ===== Search & Filter =====
  const [searchValue, setSearchValue] = useState(viewModel.q || "");
  useEffect(() => setSearchValue(viewModel.q || ""), [viewModel.q]);

  // debounce search
  useEffect(() => {
    const v = (searchValue || "").trim();
    const t = setTimeout(() => {
      viewModel.setQ?.(v); // setter di VM auto setPage(1)
    }, 400);
    return () => clearTimeout(t);
  }, [searchValue, viewModel]); // eslint-disable-line

  // negara options (remote)
  const [negaraOptions, setNegaraOptions] = useState([]);
  const [fetchingNegara, setFetchingNegara] = useState(false);

  const fetchNegaraOpts = async (kw = "") => {
    setFetchingNegara(true);
    const opts = await viewModel.searchNegaraOptions?.(kw).catch(() => []);
    setNegaraOptions(opts || []);
    setFetchingNegara(false);
  };

  useEffect(() => {
    fetchNegaraOpts("");
  }, []); // eslint-disable-line

  // Pastikan label untuk value terpilih selalu ada di options
  useEffect(() => {
    const id = viewModel.negaraId;
    if (!id) return;
    const sid = String(id);
    const already = negaraOptions.some((o) => String(o.value) === sid);
    if (already) return;
    const label = viewModel.negaraName?.(sid) || "";
    if (label) {
      setNegaraOptions((prev) => [{ value: id, label }, ...prev]);
    }
  }, [viewModel.negaraId, viewModel, negaraOptions]);

  const { shellW, maxW, blue, text } = TOKENS;
  const req = (msg) => [{ required: true, message: msg }];

  const sortOptions = [
    { value: "created_at:desc", label: T.sNewest },
    { value: "created_at:asc", label: T.sOldest },
    { value: "updated_at:desc", label: T.sUpdatedNewest },
    { value: "updated_at:asc", label: T.sUpdatedOldest },
  ];

  const statusOptions = [
    { value: "active", label: T.statusActive },
    { value: "all", label: T.statusAll },
    { value: "inactive", label: T.statusInactive },
  ];

  /* ========================== CRUD Handlers ========================== */
  const onCreate = async () => {
    const v = await formCreate.validateFields().catch(() => null);
    if (!v) return;

    const out = await viewModel.createKota({
      negara_id: v.negara_id,
      name_id: v.name_id,
      living_cost: v.living_cost ?? null,
      is_active: v.is_active ?? true,
      // autoTranslate tidak perlu dikirim; server default true
    });

    if (!out.ok) {
      toast.err("Gagal membuat kota", out.error || "Gagal menyimpan data.");
      return;
    }
    toast.ok("Berhasil", `Kota "${v.name_id}" berhasil dibuat.`);
    setCreateOpen(false);
    formCreate.resetFields();
  };

  const openEdit = async (row) => {
    setActiveRow(row);
    setEditOpen(true);
    setDetailLoading(true);
    setDetailData(null);

    const { ok, data, error } = await viewModel.getKota(row.id);
    setDetailLoading(false);
    if (!ok) {
      setEditOpen(false);
      toast.err("Gagal memuat detail", error || "Tidak dapat memuat data.");
      return;
    }

    const d = data?.data || data || row;
    setDetailData(d);

    // pastikan negara terpilih ada di options
    const label = viewModel.negaraName?.(d.negara_id) || "";
    if (d.negara_id && label) {
      setNegaraOptions((prev) => {
        const has = prev.some((x) => x.value === d.negara_id);
        return has ? prev : [{ value: d.negara_id, label }, ...prev];
      });
    }

    formEdit.setFieldsValue({
      negara_id: d.negara_id || undefined,
      name_id: d.name || "",
      living_cost:
        d.living_cost !== undefined && d.living_cost !== null
          ? String(d.living_cost)
          : "",
      is_active: d.is_active ?? true,
    });
  };

  const onEditSubmit = async () => {
    if (!activeRow) return;
    const v = await formEdit.validateFields().catch(() => null);
    if (!v) return;

    const res = await viewModel.updateKota(activeRow.id, {
      negara_id: v.negara_id,
      name_id: v.name_id,
      living_cost: v.living_cost ?? null,
      is_active: v.is_active ?? true,
      // autoTranslate tidak dikirim; update manual saja
    });

    if (!res.ok) {
      toast.err(
        "Gagal menyimpan perubahan",
        res.error || "Perubahan tidak tersimpan."
      );
      return;
    }
    toast.ok(
      "Perubahan disimpan",
      `Kota "${v.name_id || activeRow.name}" telah diperbarui.`
    );
    setEditOpen(false);
    formEdit.resetFields();
  };

  const onSoftDelete = async (row) => {
    if (!row) return;
    const res = await viewModel.deleteKota(row.id);
    if (!res.ok) {
      toast.err(
        "Gagal",
        res.error || "Kota tidak bisa dinonaktifkan saat ini."
      );
      return;
    }
    toast.ok("Berhasil", "Kota berhasil dinonaktifkan.");
  };

  const onActivate = async (row) => {
    if (!row) return;
    const res = await viewModel.updateKota(row.id, { is_active: true });
    if (!res.ok) {
      toast.err(
        "Gagal",
        res.error || "Kota tidak bisa diaktifkan kembali saat ini."
      );
      return;
    }
    toast.ok("Berhasil", "Kota berhasil diaktifkan kembali.");
  };

  /* ============================== UI =============================== */
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
      {/* notification portal */}
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
                  {viewModel.total ?? rows.length ?? "—"}
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

              {/* Filters */}
              <div style={styles.filtersRow}>
                <Input
                  allowClear
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onPressEnter={() =>
                    viewModel.setQ?.((searchValue || "").trim())
                  }
                  placeholder={T.searchPh}
                  prefix={<SearchOutlined />}
                  style={styles.searchInput}
                />

                <Select
                  allowClear
                  showSearch
                  placeholder="Filter negara"
                  value={viewModel.negaraId || undefined}
                  onChange={(v) => viewModel.setNegaraId?.(v || "")}
                  filterOption={false}
                  notFoundContent={fetchingNegara ? "Loading..." : null}
                  onSearch={fetchNegaraOpts}
                  options={negaraOptions}
                  style={styles.filterSelect}
                />

                <Select
                  value={viewModel.sort}
                  onChange={(v) => viewModel.setSort(v)}
                  options={sortOptions}
                  style={styles.filterSelect}
                />

                <Select
                  value={viewModel.status || "active"}
                  onChange={(v) => viewModel.setStatus?.(v)}
                  options={statusOptions}
                  style={styles.filterStatus}
                  suffixIcon={<FilterOutlined />}
                />
              </div>

              {/* Table */}
              <div style={{ overflowX: "auto" }}>
                {/* Header */}
                <div style={styles.tableHeader}>
                  <div style={{ ...styles.thLeft, paddingLeft: 8 }}>
                    {T.kotaCol}
                  </div>
                  <div style={styles.thCenter}>{T.negaraCol}</div>
                  <div style={styles.thRight}>{T.livingCol}</div>
                  <div style={styles.thCenter}>{T.statusCol}</div>
                  <div style={styles.thCenter}>{T.action}</div>
                </div>

                {/* Rows */}
                <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
                  {viewModel.loading ? (
                    Array.from({
                      length: Math.max(3, Math.min(viewModel.perPage || 10, 8)),
                    }).map((_, i) => (
                      <div key={`sk-${i}`} style={styles.row}>
                        <div style={styles.colName}>
                          <Skeleton.Input
                            active
                            size="small"
                            style={{ width: 220, height: 16, borderRadius: 6 }}
                          />
                        </div>
                        <div style={styles.colCenter}>
                          <Skeleton.Input
                            active
                            size="small"
                            style={{ width: 180, height: 16, borderRadius: 6 }}
                          />
                        </div>
                        <div style={styles.colRight}>
                          <Skeleton.Input
                            active
                            size="small"
                            style={{
                              width: 120,
                              height: 16,
                              borderRadius: 6,
                              marginLeft: "auto",
                            }}
                          />
                        </div>
                        <div style={styles.colCenter}>
                          <Skeleton.Input
                            active
                            size="small"
                            style={{ width: 80, height: 16, borderRadius: 6 }}
                          />
                        </div>
                        <div style={styles.colActionsCenter}>
                          <Skeleton.Input
                            active
                            size="small"
                            style={{ width: 96, height: 28, borderRadius: 8 }}
                          />
                        </div>
                      </div>
                    ))
                  ) : rows.length === 0 ? (
                    <div
                      style={{
                        display: "grid",
                        placeItems: "center",
                        padding: "20px 0",
                      }}
                    >
                      <Empty description="Belum ada data kota" />
                    </div>
                  ) : (
                    rows.map((r) => {
                      const name = r.name || "(tanpa nama)";
                      const negaraLabel =
                        viewModel.negaraName?.(r.negara_id) || "";
                      const living = r.living_cost;

                      return (
                        <div key={r.id} style={styles.row}>
                          {/* Nama Kota */}
                          <div style={styles.colName}>
                            <div style={styles.nameWrap}>
                              <div style={styles.nameText} title={name}>
                                {name}
                              </div>
                              <div style={styles.subDate}>
                                {fmtDateId(pickCreated(r))}
                              </div>
                            </div>
                          </div>

                          {/* Negara */}
                          <div style={styles.colCenter}>
                            {negaraLabel ? (
                              <div style={styles.clampCell} title={negaraLabel}>
                                {negaraLabel}
                              </div>
                            ) : r.negara_id ? (
                              <Skeleton.Input
                                active
                                size="small"
                                style={{
                                  width: 160,
                                  height: 16,
                                  borderRadius: 6,
                                  margin: "0 auto",
                                }}
                              />
                            ) : (
                              "—"
                            )}
                          </div>

                          {/* Living cost */}
                          <div style={styles.colRight}>{fmtIdr(living)}</div>

                          {/* Status */}
                          <div style={styles.colCenter}>
                            <span
                              style={{
                                padding: "2px 10px",
                                borderRadius: 999,
                                fontSize: 11.5,
                                fontWeight: 600,
                                backgroundColor: r.is_active
                                  ? "rgba(22,163,74,0.08)"
                                  : "rgba(248,113,113,0.08)",
                                color: r.is_active ? "#15803d" : "#b91c1c",
                                border: `1px solid ${
                                  r.is_active
                                    ? "rgba(22,163,74,0.35)"
                                    : "rgba(248,113,113,0.5)"
                                }`,
                              }}
                            >
                              {r.is_active ? "Aktif" : "Nonaktif"}
                            </span>
                          </div>

                          {/* Aksi */}
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
                                  viewModel
                                    .getKota(r.id)
                                    .then(({ ok, data, error }) => {
                                      setDetailLoading(false);
                                      if (!ok) {
                                        setViewOpen(false);
                                        toast.err(
                                          "Gagal memuat detail",
                                          error || "Tidak dapat memuat data."
                                        );
                                        return;
                                      }
                                      setDetailData(data?.data || data);
                                    });
                                }}
                                style={styles.iconBtn}
                              />
                            </Tooltip>

                            {r.is_active ? (
                              <Tooltip title={T.del}>
                                <Popconfirm
                                  title="Nonaktifkan kota ini?"
                                  okText="Ya"
                                  cancelText="Batal"
                                  onConfirm={() => onSoftDelete(r)}
                                >
                                  <Button
                                    size="small"
                                    danger
                                    icon={<DeleteOutlined />}
                                    style={styles.iconBtn}
                                  />
                                </Popconfirm>
                              </Tooltip>
                            ) : (
                              <Tooltip title={T.activate}>
                                <Button
                                  size="small"
                                  type="default"
                                  onClick={() => onActivate(r)}
                                  style={styles.iconBtn}
                                >
                                  {T.activate}
                                </Button>
                              </Tooltip>
                            )}

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
              </div>

              {/* Pagination */}
              <div style={styles.pagination}>
                <Button
                  icon={<LeftOutlined />}
                  onClick={() =>
                    viewModel.setPage(Math.max(1, viewModel.page - 1))
                  }
                  disabled={viewModel.page <= 1 || viewModel.loading}
                />
                <div style={styles.pageText}>
                  Page {viewModel.page}
                  {viewModel.totalPages ? ` of ${viewModel.totalPages}` : ""}
                </div>
                <Button
                  icon={<RightOutlined />}
                  onClick={() => viewModel.setPage(viewModel.page + 1)}
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

      {/* ===== Create Modal ===== */}
      <Modal
        open={createOpen}
        onCancel={() => {
          setCreateOpen(false);
          formCreate.resetFields();
        }}
        footer={null}
        width={720}
        destroyOnClose
        title={null}
      >
        <div style={styles.modalShell}>
          <Form
            layout="vertical"
            form={formCreate}
            initialValues={{ is_active: true }}
          >
            <Form.Item
              label={T.negara}
              name="negara_id"
              rules={req("Negara wajib dipilih")}
            >
              <Select
                showSearch
                placeholder="Cari negara…"
                filterOption={false}
                onSearch={fetchNegaraOpts}
                notFoundContent={fetchingNegara ? "Loading..." : null}
                options={negaraOptions}
              />
            </Form.Item>

            <Form.Item
              label={T.nameId}
              name="name_id"
              rules={req("Nama kota wajib diisi")}
            >
              <Input placeholder="Contoh: Melbourne" />
            </Form.Item>

            <Form.Item label={T.livingCost} name="living_cost">
              <InputNumber
                stringMode
                min={0}
                step="100000"
                style={{ width: "100%" }}
                formatter={idrFormatter}
                parser={idrParser}
                placeholder="Contoh: Rp 15.000.000"
              />
            </Form.Item>

            <Form.Item
              label={T.isActive}
              name="is_active"
              valuePropName="checked"
            >
              <Switch checkedChildren="Aktif" unCheckedChildren="Nonaktif" />
            </Form.Item>

            <div style={styles.modalFooter}>
              <Button
                type="primary"
                size="large"
                onClick={onCreate}
                loading={viewModel.opLoading}
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
          formEdit.resetFields();
        }}
        footer={null}
        width={740}
        destroyOnClose
        title={null}
      >
        <div style={styles.modalShell}>
          <Spin spinning={detailLoading}>
            <Form layout="vertical" form={formEdit}>
              <Form.Item label={T.negara} name="negara_id">
                <Select
                  showSearch
                  placeholder="Pilih negara"
                  filterOption={false}
                  onSearch={fetchNegaraOpts}
                  notFoundContent={fetchingNegara ? "Loading..." : null}
                  options={negaraOptions}
                />
              </Form.Item>

              <Form.Item label={T.nameId} name="name_id">
                <Input placeholder="Nama kota" />
              </Form.Item>

              <Form.Item label={T.livingCost} name="living_cost">
                <InputNumber
                  stringMode
                  min={0}
                  step="100000"
                  style={{ width: "100%" }}
                  formatter={idrFormatter}
                  parser={idrParser}
                  placeholder="Contoh: Rp 15.000.000"
                />
              </Form.Item>

              <Form.Item
                label={T.isActive}
                name="is_active"
                valuePropName="checked"
              >
                <Switch checkedChildren="Aktif" unCheckedChildren="Nonaktif" />
              </Form.Item>

              <div style={styles.modalFooter}>
                <Button
                  type="primary"
                  size="large"
                  onClick={onEditSubmit}
                  loading={viewModel.opLoading}
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
        width={660}
        destroyOnClose
        title={null}
      >
        <div style={styles.modalShell}>
          <Spin spinning={detailLoading}>
            <div style={{ display: "grid", gap: 8 }}>
              <div>
                <div style={styles.label}>{T.kotaCol}</div>
                <div style={styles.value}>
                  {detailData?.name || activeRow?.name || "—"}
                </div>
              </div>
              <div>
                <div style={styles.label}>{T.negara}</div>
                <div style={styles.value}>
                  {viewModel.negaraName?.(
                    detailData?.negara_id || activeRow?.negara_id
                  ) || "—"}
                </div>
              </div>
              <div>
                <div style={styles.label}>{T.livingCol}</div>
                <div style={styles.value}>
                  {fmtIdr(detailData?.living_cost ?? activeRow?.living_cost)}
                </div>
              </div>
              <div>
                <div style={styles.label}>{T.statusCol}</div>
                <div style={styles.value}>
                  {detailData?.is_active ?? activeRow?.is_active
                    ? "Aktif"
                    : "Nonaktif"}
                </div>
              </div>
              <div>
                <div style={styles.label}>Tanggal dibuat</div>
                <div style={styles.value}>
                  {fmtDateId(
                    pickCreated(detailData) ?? pickCreated(activeRow) ?? null
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

  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 18, fontWeight: 800, color: "#0b3e91" },

  filtersRow: {
    display: "grid",
    gridTemplateColumns: "1.4fr 1fr 1fr 0.9fr",
    gap: 8,
    marginBottom: 10,
    alignItems: "center",
  },
  searchInput: { height: 36, borderRadius: 10 },
  filterSelect: { width: "100%" },
  filterStatus: { width: "100%" },

  tableHeader: {
    display: "grid",
    gridTemplateColumns: GRID_COLS,
    gap: 8,
    marginBottom: 4,
    color: "#0b3e91",
    fontWeight: 700,
    alignItems: "center",
    minWidth: 960,
  },
  thLeft: { display: "flex", justifyContent: "flex-start", width: "100%" },
  thCenter: { display: "flex", justifyContent: "center", width: "100%" },
  thRight: { display: "flex", justifyContent: "flex-end", width: "100%" },

  row: {
    display: "grid",
    gridTemplateColumns: GRID_COLS,
    gap: 8,
    alignItems: "center",
    background: "#f5f8ff",
    borderRadius: 10,
    border: "1px solid #e8eeff",
    padding: "8px 10px",
    boxShadow: "0 6px 12px rgba(11, 86, 201, 0.05)",
    minWidth: 960,
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
  nameWrap: { display: "grid", gap: 2, minWidth: 0, width: "100%" },
  nameText: {
    fontWeight: 600,
    color: "#111827",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  subDate: { fontSize: 11.5, color: "#6b7280" },

  clampCell: {
    maxWidth: 220,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    margin: "0 auto",
  },

  colCenter: { textAlign: "center", color: "#0f172a", fontWeight: 600 },
  colRight: {
    textAlign: "right",
    color: "#0f172a",
    fontWeight: 700,
    paddingRight: 6,
    fontVariantNumeric: "tabular-nums",
  },
  colActionsCenter: {
    display: "flex",
    justifyContent: "center",
    gap: 6,
    minWidth: 120,
  },
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
