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

/* ===== compact tokens ===== */
const TOKENS = {
  shellW: "94%",
  maxW: 1140,
  blue: "#0b56c9",
  text: "#0f172a",
};

/* ===== Grid kolom konsisten (header & baris)
   Fakultas | Kampus | Kota | Harga | Aksi  ===== */
const GRID_COLS =
  "minmax(320px,2fr) minmax(260px,1.2fr) minmax(140px,.9fr) minmax(160px,.9fr) 120px";

const T = {
  title: "Manajemen Fakultas",
  totalLabel: "Total Fakultas",
  listTitle: "Data Fakultas",
  addNew: "Buat Data Baru",
  searchPh: "Cari nama fakultas",
  majorCol: "Nama Fakultas",
  collegeCol: "Nama Kampus",
  intakeCol: "Kota", // kolom ketiga sekarang kota
  priceCol: "Harga",
  action: "Aksi",
  view: "Lihat",
  edit: "Edit",
  del: "Hapus",
  save: "Simpan",

  // form
  name: "Nama Fakultas",
  desc: "Deskripsi",
  college: "Kampus",
  price: "Harga (IDR)",
  intake: "Kota (boleh lebih dari satu / opsional)",

  // sorting
  sort: "Urutkan",
  sNewest: "Terbaru",
  sOldest: "Terlama",
  sUpdatedNewest: "Diubah terbaru",
  sUpdatedOldest: "Diubah terlama",
  sNameAsc: "Nama A–Z",
  sNameDesc: "Nama Z–A",
  sPriceAsc: "Harga termurah",
  sPriceDesc: "Harga termahal",
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

/* tanggal: created_ts -> created_at -> updated_ts -> updated_at */
const pickCreated = (obj) =>
  obj?.created_ts ??
  obj?.created_at ??
  obj?.updated_ts ??
  obj?.updated_at ??
  null;

const stripTags = (s) => (s ? String(s).replace(/<[^>]*>/g, "") : "");

/* ==== Shortcut helper untuk Multiple Select (Pilih Semua / Hapus Semua) ==== */
const renderSelectShortcuts = ({ menu, onSelectAll, onClear, disabledAll }) => (
  <div>
    {menu}
    <div style={{ display: "flex", gap: 8, padding: "6px 8px" }}>
      <Button size="small" onClick={onSelectAll} disabled={disabledAll}>
        Pilih Semua
      </Button>
      <Button size="small" danger onClick={onClear}>
        Hapus Semua
      </Button>
    </div>
  </div>
);

const normalizeArray = (val) => {
  if (!val) return [];
  if (Array.isArray(val))
    return val
      .map((v) => (v ?? "").toString().trim())
      .filter(Boolean)
      .filter((v, i, arr) => arr.indexOf(v) === i);
  return (val || "")
    .toString()
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
};

const toKotaArray = (val) => normalizeArray(val);
const toIntakeArray = (val) => normalizeArray(val);

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

export default function JurusanContent({ vm }) {
  const viewModel = vm ?? require("./useJurusanViewModel").default();

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
  const [createLoading, setCreateLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState(null);

  const rows = useMemo(() => viewModel.jurusan || [], [viewModel.jurusan]);

  useEffect(() => {
    viewModel.refreshCollegeNamesForPage?.(rows);
  }, [rows]); // eslint-disable-line

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

  // college options (remote)
  const [collegeOptions, setCollegeOptions] = useState([]);
  const [fetchingCollege, setFetchingCollege] = useState(false);
  const fetchCollegeOpts = async (kw = "") => {
    setFetchingCollege(true);
    const opts = await viewModel.searchCollegeOptions?.(kw).catch(() => []);
    setCollegeOptions(opts || []);
    setFetchingCollege(false);
  };
  useEffect(() => {
    fetchCollegeOpts("");
  }, []); // eslint-disable-line

  // kota options (remote, opsional)
  const [kotaOptions, setKotaOptions] = useState([]);
  const [fetchingKota, setFetchingKota] = useState(false);
  const fetchKotaOpts = async (kw = "") => {
    setFetchingKota(true);
    const opts = await viewModel.searchKotaOptions?.(kw).catch(() => []);
    setKotaOptions(opts || []);
    setFetchingKota(false);
  };
  useEffect(() => {
    fetchKotaOpts("");
  }, []); // eslint-disable-line

  // Pastikan label untuk value kampus terpilih selalu ada di options (UX aman)
  useEffect(() => {
    const id = viewModel.collegeId;
    if (!id) return;
    const sid = String(id);
    const already = collegeOptions.some((o) => String(o.value) === sid);
    if (already) return;
    const label = viewModel.collegeName?.(sid) || "";
    if (label) {
      setCollegeOptions((prev) => [{ value: id, label }, ...prev]);
      return;
    }
    (async () => {
      try {
        const url = `/api/college/${encodeURIComponent(sid)}?locale=${
          viewModel.locale
        }&fallback=${viewModel.fallback}`;
        const res = await fetch(url);
        const json = await res.json().catch(() => ({}));
        const name =
          json?.data?.name || json?.name || json?.data?.title || "(Tanpa Nama)";
        if (name) {
          setCollegeOptions((prev) => [{ value: id, label: name }, ...prev]);
        }
      } catch {}
    })();
  }, [
    viewModel.collegeId,
    viewModel.locale,
    viewModel.fallback,
    viewModel,
    collegeOptions,
  ]);

  const { shellW, maxW, blue, text } = TOKENS;
  const req = (msg) => [{ required: true, message: msg }];

  /* ========================== CRUD Handlers ========================== */
  const onCreate = async () => {
    if (createLoading) return;
    const v = await formCreate.validateFields().catch(() => null);
    if (!v) return;

    const selectedKotaIds = toKotaArray(v.kota_id);

    setCreateLoading(true);
    try {
      const out = await viewModel.createJurusan({
        college_id: v.college_id,
        name: v.name,
        description: v.description || "",
        // kirim array ID kota; kalau kosong, jangan kirim field ke API
        kota_id: selectedKotaIds.length ? selectedKotaIds : undefined,
        harga: v.harga ?? null,
        autoTranslate: true,
      });
      if (!out.ok) {
        toast.err(
          "Gagal membuat fakultas",
          out.error || "Gagal menyimpan data."
        );
        return;
      }
      toast.ok("Berhasil", `Fakultas "${v.name}" berhasil dibuat.`);
      setCreateOpen(false);
      formCreate.resetFields();
    } finally {
      setCreateLoading(false);
    }
  };

  const openEdit = async (row) => {
    setActiveRow(row);
    setEditOpen(true);
    setDetailLoading(true);
    setDetailData(null);
    const { ok, data, error } = await viewModel.getJurusan(row.id);
    setDetailLoading(false);
    if (!ok) {
      setEditOpen(false);
      toast.err("Gagal memuat detail", error || "Tidak dapat memuat data.");
      return;
    }
    const d = data?.data || data || row;
    setDetailData(d);

    // pastikan kampus terpilih keinject ke options
    const label = viewModel.collegeName?.(d.college_id) || "";
    if (d.college_id && label) {
      setCollegeOptions((prev) => {
        const has = prev.some((x) => x.value === d.college_id);
        return has ? prev : [{ value: d.college_id, label }, ...prev];
      });
    }

    // pastikan kota terpilih keinject ke options (backward compatible: single / multi)
    if (d.kota_id) {
      const ids = Array.isArray(d.kota_id) ? d.kota_id : [d.kota_id];
      setKotaOptions((prev) => {
        const existing = new Set(prev.map((x) => String(x.value)));
        const extra = ids
          .filter((id) => !existing.has(String(id)))
          .map((id) => ({
            value: id,
            label: d.kota_name || `Kota ID ${id}`,
          }));
        return extra.length ? [...extra, ...prev] : prev;
      });
    }

    formEdit.setFieldsValue({
      college_id: d.college_id || undefined,
      // Multiple select selalu butuh array
      kota_id: Array.isArray(d.kota_ids)
        ? d.kota_ids
        : d.kota_id
        ? [d.kota_id]
        : [],
      name: d.name || "",
      description: d.description || "",
      harga: d.harga !== undefined && d.harga !== null ? String(d.harga) : "",
    });
  };

  const onEditSubmit = async () => {
    if (editLoading) return;
    if (!activeRow) return;
    const v = await formEdit.validateFields().catch(() => null);
    if (!v) return;

    const selectedKotaIds = toKotaArray(v.kota_id);

    setEditLoading(true);
    try {
      const res = await viewModel.updateJurusan(activeRow.id, {
        college_id: v.college_id,
        name: v.name,
        description: v.description ?? null,
        // kirim array ID kota; kalau kosong, jangan kirim field ke API
        kota_id: selectedKotaIds.length ? selectedKotaIds : undefined,
        harga: v.harga ?? null,
        autoTranslate: false,
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
        `Fakultas "${v.name || activeRow.name}" telah diperbarui.`
      );
      setEditOpen(false);
      formEdit.resetFields();
    } finally {
      setEditLoading(false);
    }
  };

  const onDelete = async (id) => {
    const res = await viewModel.deleteJurusan(id);
    if (!res.ok) {
      toast.err("Gagal menghapus", res.error || "Tidak bisa menghapus data.");
      return;
    }
    toast.ok("Terhapus", "Fakultas berhasil dihapus.");
  };

  const sortOptions = [
    { value: "created_at:desc", label: T.sNewest },
    { value: "created_at:asc", label: T.sOldest },
    { value: "updated_at:desc", label: T.sUpdatedNewest },
    { value: "updated_at:asc", label: T.sUpdatedOldest },
    { value: "name:asc", label: T.sNameAsc },
    { value: "name:desc", label: T.sNameDesc },
    { value: "harga:asc", label: T.sPriceAsc },
    { value: "harga:desc", label: T.sPriceDesc },
  ];

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
                  placeholder="Filter kampus"
                  value={viewModel.collegeId || undefined}
                  onChange={(v) => viewModel.setCollegeId?.(v || "")}
                  filterOption={false}
                  notFoundContent={fetchingCollege ? "Loading..." : null}
                  onSearch={fetchCollegeOpts}
                  options={collegeOptions}
                  style={styles.filterSelect}
                />

                <Select
                  value={viewModel.sort}
                  onChange={(v) => viewModel.setSort(v)}
                  options={sortOptions}
                  style={styles.filterSort}
                />
              </div>

              {/* Table */}
              <div style={{ overflowX: "auto" }}>
                {/* Header */}
                <div style={styles.tableHeader}>
                  <div style={{ ...styles.thLeft, paddingLeft: 8 }}>
                    {T.majorCol}
                  </div>
                  <div style={styles.thCenter}>{T.collegeCol}</div>
                  <div style={styles.thCenter}>{T.intakeCol}</div>
                  <div style={styles.thRight}>{T.priceCol}</div>
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
                            style={{ width: 240, height: 16, borderRadius: 6 }}
                          />
                        </div>
                        <div style={styles.colCenter}>
                          <Skeleton.Input
                            active
                            size="small"
                            style={{ width: 200, height: 16, borderRadius: 6 }}
                          />
                        </div>
                        <div style={styles.colCenter}>
                          <Skeleton.Input
                            active
                            size="small"
                            style={{ width: 120, height: 16, borderRadius: 6 }}
                          />
                        </div>
                        <div style={styles.colRight}>
                          <Skeleton.Input
                            active
                            size="small"
                            style={{
                              width: 100,
                              height: 16,
                              borderRadius: 6,
                              marginLeft: "auto",
                            }}
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
                      <Empty description="Belum ada data" />
                    </div>
                  ) : (
                    rows.map((r) => {
                      const name = r.name || "(untitled)";
                      const collegeLabel =
                        viewModel.collegeName?.(r.college_id) || "";
                      const kotaLabelArr = Array.isArray(r.kota_names)
                        ? r.kota_names
                        : r.kota_name
                        ? [r.kota_name]
                        : [];
                      const kotaLabel =
                        kotaLabelArr.length > 0
                          ? kotaLabelArr.join(", ")
                          : "—";

                      return (
                        <div key={r.id} style={styles.row}>
                          {/* Nama Fakultas */}
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

                          {/* Nama Kampus */}
                          <div style={styles.colCenter}>
                            {collegeLabel ? (
                              <div
                                style={styles.clampCell}
                                title={collegeLabel}
                              >
                                {collegeLabel}
                              </div>
                            ) : r.college_id ? (
                              <Skeleton.Input
                                active
                                size="small"
                                style={{
                                  width: 180,
                                  height: 16,
                                  borderRadius: 6,
                                  margin: "0 auto",
                                }}
                              />
                            ) : (
                              "—"
                            )}
                          </div>

                          {/* Kota */}
                          <div style={styles.colCenter}>
                            {kotaLabel !== "—" ? (
                              <div style={styles.clampCell}>{kotaLabel}</div>
                            ) : (
                              "—"
                            )}
                          </div>

                          {/* Harga */}
                          <div style={styles.colRight}>{fmtIdr(r.harga)}</div>

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
                                    .getJurusan(r.id)
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
                            <Tooltip title={T.del}>
                              <Popconfirm
                                title="Hapus fakultas ini?"
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
          <Form layout="vertical" form={formCreate}>
            <Form.Item
              label={T.college}
              name="college_id"
              rules={req("Kampus wajib dipilih")}
            >
              <Select
                showSearch
                placeholder="Cari kampus…"
                filterOption={false}
                onSearch={fetchCollegeOpts}
                notFoundContent={fetchingCollege ? "Loading..." : null}
                options={collegeOptions}
              />
            </Form.Item>

            <Form.Item
              label={T.name}
              name="name"
              rules={req("Nama fakultas wajib diisi")}
            >
              <Input placeholder="Contoh: Fakultas Teknik" />
            </Form.Item>

            <Form.Item label={T.desc} name="description">
              <Input.TextArea rows={3} placeholder="Deskripsi (opsional)" />
            </Form.Item>

            {/* Kota (Multiple Select + shortcut) */}
            <Form.Item label={T.intake} name="kota_id">
              <Select
                mode="multiple"
                allowClear
                showSearch
                placeholder="Pilih kota (bisa lebih dari satu / opsional)"
                filterOption={false}
                onSearch={fetchKotaOpts}
                notFoundContent={fetchingKota ? "Loading..." : null}
                options={kotaOptions}
                optionFilterProp="label"
                dropdownRender={(menu) =>
                  renderSelectShortcuts({
                    menu,
                    onSelectAll: () =>
                      formCreate.setFieldsValue({
                        kota_id: kotaOptions.map((o) => o.value),
                      }),
                    onClear: () => formCreate.setFieldsValue({ kota_id: [] }),
                    disabledAll: !kotaOptions.length,
                  })
                }
              />
            </Form.Item>

            <Form.Item label={T.price} name="harga">
              <InputNumber
                stringMode
                min={0}
                step="1000"
                style={{ width: "100%" }}
                formatter={idrFormatter}
                parser={idrParser}
                placeholder="Contoh: Rp 2.500.000"
              />
            </Form.Item>

              <div style={styles.modalFooter}>
                <Button
                  type="primary"
                  size="large"
                  onClick={onCreate}
                  style={styles.saveBtn}
                  loading={createLoading}
                  disabled={createLoading}
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
              <Form.Item
                label={T.college}
                name="college_id"
                rules={req("Kampus wajib dipilih")}
              >
                <Select
                  showSearch
                  placeholder="Pilih kampus"
                  filterOption={false}
                  onSearch={fetchCollegeOpts}
                  notFoundContent={fetchingCollege ? "Loading..." : null}
                  options={collegeOptions}
                />
              </Form.Item>

              <Form.Item label={T.name} name="name">
                <Input placeholder="Nama fakultas" />
              </Form.Item>

              <Form.Item label={T.desc} name="description">
                <Input.TextArea rows={3} placeholder="Deskripsi (opsional)" />
              </Form.Item>

              {/* Kota (Multiple Select + shortcut) */}
              <Form.Item label={T.intake} name="kota_id">
                <Select
                  mode="multiple"
                  allowClear
                  showSearch
                  placeholder="Pilih kota (opsional)"
                  filterOption={false}
                  onSearch={fetchKotaOpts}
                  notFoundContent={fetchingKota ? "Loading..." : null}
                  options={kotaOptions}
                  optionFilterProp="label"
                  dropdownRender={(menu) =>
                    renderSelectShortcuts({
                      menu,
                      onSelectAll: () =>
                        formEdit.setFieldsValue({
                          kota_id: kotaOptions.map((o) => o.value),
                        }),
                      onClear: () => formEdit.setFieldsValue({ kota_id: [] }),
                      disabledAll: !kotaOptions.length,
                    })
                  }
                />
              </Form.Item>

              <Form.Item label={T.price} name="harga">
                <InputNumber
                  stringMode
                  min={0}
                  step="1000"
                  style={{ width: "100%" }}
                  formatter={idrFormatter}
                  parser={idrParser}
                  placeholder="Contoh: Rp 2.500.000"
                />
              </Form.Item>

              <div style={styles.modalFooter}>
                <Button
                  type="primary"
                  size="large"
                  onClick={onEditSubmit}
                  style={styles.saveBtn}
                  loading={editLoading}
                  disabled={editLoading}
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
                <div style={styles.label}>{T.name}</div>
                <div style={styles.value}>
                  {detailData?.name || activeRow?.name || "—"}
                </div>
              </div>
              <div>
                <div style={styles.label}>{T.college}</div>
                <div style={styles.value}>
                  {viewModel.collegeName?.(
                    detailData?.college_id || activeRow?.college_id
                  ) || "—"}
                </div>
              </div>
              <div>
                <div style={styles.label}>{T.intake}</div>
                <div style={styles.value}>
                  {(() => {
                    const names =
                      Array.isArray(detailData?.kota_names) &&
                      detailData.kota_names.length
                        ? detailData.kota_names
                        : Array.isArray(activeRow?.kota_names) &&
                          activeRow.kota_names.length
                        ? activeRow.kota_names
                        : detailData?.kota_name
                        ? [detailData.kota_name]
                        : activeRow?.kota_name
                        ? [activeRow.kota_name]
                        : [];
                    return names.length ? names.join(", ") : "—";
                  })()}
                </div>
              </div>
              <div>
                <div style={styles.label}>{T.price}</div>
                <div style={styles.value}>
                  {fmtIdr(detailData?.harga ?? activeRow?.harga ?? null)}
                </div>
              </div>
              <div>
                <div style={styles.label}>{T.desc}</div>
                <div style={{ ...styles.value, whiteSpace: "pre-wrap" }}>
                  {stripTags(detailData?.description) || "—"}
                </div>
              </div>
              <div>
                <div style={styles.label}>Tanggal dibuat</div>
                <div style={styles.value}>
                  {fmtDateId(pickCreated(detailData) ?? pickCreated(activeRow))}
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
    gridTemplateColumns: "1fr 220px 220px",
    gap: 8,
    marginBottom: 10,
    alignItems: "center",
  },
  searchInput: { height: 36, borderRadius: 10 },
  filterSelect: { width: "100%" },
  filterSort: { width: "100%" },

  tableHeader: {
    display: "grid",
    gridTemplateColumns: GRID_COLS,
    gap: 8,
    marginBottom: 4,
    color: "#0b3e91",
    fontWeight: 700,
    alignItems: "center",
    minWidth: 1140,
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
    minWidth: 1140,
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

  // teks panjang auto-ellipsis (1 baris)
  clampCell: {
    maxWidth: 240,
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
