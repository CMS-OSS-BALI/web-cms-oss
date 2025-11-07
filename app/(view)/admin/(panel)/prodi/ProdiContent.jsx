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

/* ===== Grid kolom konsisten (header & baris) =====
   Prodi | Jurusan | Intake | Harga | Kampus | Aksi  */
const GRID_COLS =
  "minmax(300px,2fr) minmax(220px,1.2fr) minmax(140px,.9fr) minmax(160px,.9fr) minmax(260px,1.2fr) 120px";

const T = {
  title: "Manajemen Prodi",
  totalLabel: "Total Prodi",
  listTitle: "Data Prodi",
  addNew: "Buat Data Baru",
  searchPh: "Cari nama prodi",
  programCol: "Nama Prodi",
  majorCol: "Nama Jurusan",
  intakeCol: "Intake",
  priceCol: "Harga",
  collegeCol: "Nama Kampus",
  action: "Aksi",
  view: "Lihat",
  edit: "Edit",
  del: "Hapus",
  save: "Simpan",

  // form
  name: "Nama Prodi",
  desc: "Deskripsi",
  jurusan: "Jurusan (opsional)",
  price: "Harga (IDR)",
  intake: "Intake (opsional)", // <<< NEW

  // sorting
  sort: "Urutkan",
  sNewest: "Terbaru",
  sOldest: "Terlama",
  sNameAsc: "Nama Aâ€“Z",
  sNameDesc: "Nama Zâ€“A",
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
// pick created_ts â†’ created_at â†’ updated_ts â†’ updated_at
const pickCreated = (obj) =>
  obj?.created_ts ??
  obj?.created_at ??
  obj?.updated_ts ??
  obj?.updated_at ??
  null;

const stripTags = (s) => (s ? String(s).replace(/<[^>]*>/g, "") : "");

/* ==== currency helpers ==== */
const fmtIdr = (v) => {
  if (v === null || v === undefined || v === "") return "â€”";
  const n = Number(v);
  if (!Number.isFinite(n)) return "â€”";
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

export default function ProdiContent({ vm }) {
  const viewModel = vm ?? require("./useProdiViewModel").default();

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

  // ----- UI state
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [activeRow, setActiveRow] = useState(null);
  const [formCreate] = Form.useForm();
  const [formEdit] = Form.useForm();
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState(null);

  const rows = useMemo(() => viewModel.prodi || [], [viewModel.prodi]);

  // hydrate jurusan & kampus names for this page
  useEffect(() => {
    viewModel.refreshNamesForPage?.(rows);
  }, [rows]); // eslint-disable-line

  // ===== Search & Filter =====
  const [searchValue, setSearchValue] = useState(viewModel.q || "");
  useEffect(() => setSearchValue(viewModel.q || ""), [viewModel.q]);

  // debounce 400ms
  useEffect(() => {
    const v = (searchValue || "").trim();
    const t = setTimeout(() => {
      viewModel.setQ?.(v);
    }, 400);
    return () => clearTimeout(t);
  }, [searchValue, viewModel]); // eslint-disable-line

  // jurusan options untuk filter & form
  const [jurusanOptions, setJurusanOptions] = useState([]);
  const [fetchingJurusan, setFetchingJurusan] = useState(false);
  const fetchJurusanOpts = async (kw = "") => {
    setFetchingJurusan(true);
    const opts = await viewModel.searchJurusanOptions?.(kw).catch(() => []);
    setJurusanOptions(opts || []);
    setFetchingJurusan(false);
  };
  useEffect(() => {
    fetchJurusanOpts("");
  }, []); // eslint-disable-line

  // Pastikan label untuk value terpilih selalu ada di options (UX aman)
  useEffect(() => {
    const id = viewModel.jurusanId;
    if (!id) return;
    const sid = String(id);
    const already = jurusanOptions.some((o) => String(o.value) === sid);
    if (already) return;
    const jName = viewModel.jurusanName?.(sid) || "";
    const label = jName
      ? `${jName}${
          viewModel.collegeName?.(viewModel.collegeIdOfJurusan?.(sid) || "")
            ? " â€” " +
              (viewModel.collegeName?.(viewModel.collegeIdOfJurusan?.(sid)) ||
                "")
            : ""
        }`
      : "";
    if (label) {
      setJurusanOptions((prev) => [{ value: id, label }, ...prev]);
    }
  }, [viewModel.jurusanId]); // eslint-disable-line

  const { shellW, maxW, blue, text } = TOKENS;
  const req = (msg) => [{ required: true, message: msg }];

  const sortOptions = [
    { value: "created_at:desc", label: T.sNewest },
    { value: "created_at:asc", label: T.sOldest },
    { value: "name:asc", label: T.sNameAsc },
    { value: "name:desc", label: T.sNameDesc },
    { value: "harga:asc", label: T.sPriceAsc },
    { value: "harga:desc", label: T.sPriceDesc },
  ];

  /* ========================== CRUD ========================== */
  const onCreate = async () => {
    const v = await formCreate.validateFields().catch(() => null);
    if (!v) return;

    const out = await viewModel.createProdi({
      jurusan_id: v.jurusan_id || "",
      name: v.name,
      description: v.description || "",
      in_take: v.in_take ?? null, // <<< NEW
      harga: v.harga ?? null, // stringMode â†’ string, server normalizes
      autoTranslate: true,
    });
    if (!out.ok) {
      toast.err("Gagal membuat prodi", out.error || "Gagal menyimpan data.");
      return;
    }
    toast.ok("Berhasil", `Prodi â€œ${v.name}â€ berhasil dibuat.`);
    setCreateOpen(false);
    formCreate.resetFields();
  };

  const openEdit = async (row) => {
    setActiveRow(row);
    setEditOpen(true);
    setDetailLoading(true);
    setDetailData(null);
    const { ok, data, error } = await viewModel.getProdi(row.id);
    setDetailLoading(false);
    if (!ok) {
      setEditOpen(false);
      toast.err("Gagal memuat detail", error || "Tidak dapat memuat data.");
      return;
    }
    const d = data?.data || data || row;
    setDetailData(d);
    // ensure jurusan option exists
    const jName = viewModel.jurusanName?.(d.jurusan_id) || "";
    if (d.jurusan_id && jName) {
      setJurusanOptions((prev) => {
        const has = prev.some((x) => x.value === d.jurusan_id);
        const label = `${jName}${
          viewModel.collegeName?.(d.college_id)
            ? " â€” " + viewModel.collegeName(d.college_id)
            : ""
        }`;
        return has ? prev : [{ value: d.jurusan_id, label }, ...prev];
      });
    }
    formEdit.setFieldsValue({
      jurusan_id: d.jurusan_id || undefined,
      name: d.name || "",
      description: d.description || "",
      in_take: d.in_take || "", // <<< NEW
      harga: d.harga !== undefined && d.harga !== null ? String(d.harga) : "", // stringMode
    });
  };

  const onEditSubmit = async () => {
    if (!activeRow) return;
    const v = await formEdit.validateFields().catch(() => null);
    if (!v) return;

    const res = await viewModel.updateProdi(activeRow.id, {
      jurusan_id: v.jurusan_id,
      name: v.name,
      description: v.description ?? null,
      in_take: v.in_take ?? null, // <<< NEW
      harga: v.harga ?? null, // stringMode â†’ server normalize
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
      `Prodi â€œ${v.name || activeRow.name}â€ telah diperbarui.`
    );
    setEditOpen(false);
    formEdit.resetFields();
  };

  const onDelete = async (id) => {
    const res = await viewModel.deleteProdi(id);
    if (!res.ok) {
      toast.err("Gagal menghapus", res.error || "Tidak bisa menghapus data.");
      return;
    }
    toast.ok("Terhapus", "Prodi berhasil dihapus.");
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
                  {viewModel.total ?? rows.length ?? "â€”"}
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
                  onPressEnter={() => {
                    viewModel.setQ?.((searchValue || "").trim());
                  }}
                  placeholder={T.searchPh}
                  prefix={<SearchOutlined />}
                  style={styles.searchInput}
                />

                <Select
                  allowClear
                  showSearch
                  placeholder="Filter jurusan"
                  value={viewModel.jurusanId || undefined}
                  onChange={(v) => viewModel.setJurusanId?.(v || "")}
                  filterOption={false}
                  notFoundContent={fetchingJurusan ? "Loading..." : null}
                  onSearch={fetchJurusanOpts}
                  options={jurusanOptions}
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
                    {T.programCol}
                  </div>
                  <div style={styles.thCenter}>{T.majorCol}</div>
                  <div style={styles.thCenter}>{T.intakeCol}</div>
                  <div style={styles.thRight}>{T.priceCol}</div>
                  <div style={styles.thCenter}>{T.collegeCol}</div>
                  <div style={styles.thCenter}>{T.action}</div>
                </div>

                {/* Rows */}
                <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
                  {viewModel.loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div key={`sk-${i}`} style={styles.row}>
                        <div style={styles.colName}>
                          <Skeleton.Input
                            active
                            size="small"
                            style={{
                              width: 240,
                              height: 16,
                              borderRadius: 6,
                            }}
                          />
                        </div>
                        <div style={styles.colCenter}>
                          <Skeleton.Input
                            active
                            size="small"
                            style={{ width: 180, height: 16, borderRadius: 6 }}
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
                        <div style={styles.colCenter}>
                          <Skeleton.Input
                            active
                            size="small"
                            style={{ width: 200, height: 16, borderRadius: 6 }}
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
                      const jurusanLabel =
                        viewModel.jurusanName?.(r.jurusan_id) || "";
                      const intake = r.in_take || "";
                      const collegeLabel =
                        viewModel.collegeName?.(r.college_id) || "";

                      return (
                        <div key={r.id} style={styles.row}>
                          {/* Nama Prodi */}
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

                          {/* Nama Jurusan */}
                          <div style={styles.colCenter}>
                            {jurusanLabel ? (
                              <div
                                style={styles.clampCell}
                                title={jurusanLabel}
                              >
                                {jurusanLabel}
                              </div>
                            ) : (
                              "â€”"
                            )}
                          </div>

                          {/* Intake */}
                          <div style={styles.colCenter}>
                            {intake ? (
                              <div style={styles.clampCell} title={intake}>
                                {intake}
                              </div>
                            ) : (
                              "â€”"
                            )}
                          </div>

                          {/* Harga */}
                          <div style={styles.colRight}>{fmtIdr(r.harga)}</div>

                          {/* Nama Kampus */}
                          <div style={styles.colCenter}>
                            {collegeLabel ? (
                              <div
                                style={styles.clampCell}
                                title={collegeLabel}
                              >
                                {collegeLabel}
                              </div>
                            ) : (
                              "â€”"
                            )}
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
                                    .getProdi(r.id)
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
                                title="Hapus prodi ini?"
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
            <Form.Item label={T.jurusan} name="jurusan_id">
              <Select
                showSearch
                placeholder="Cari jurusanâ€¦"
                filterOption={false}
                onSearch={fetchJurusanOpts}
                notFoundContent={fetchingJurusan ? "Loading..." : null}
                options={jurusanOptions}
                allowClear
              />
            </Form.Item>

            <Form.Item
              label={T.name}
              name="name"
              rules={req("Nama prodi wajib diisi")}
            >
              <Input placeholder="Contoh: Informatika" />
            </Form.Item>

            <Form.Item label={T.desc} name="description">
              <Input.TextArea rows={3} placeholder="Deskripsi (opsional)" />
            </Form.Item>

            {/* NEW: Intake */}
            <Form.Item label={T.intake} name="in_take">
              <Input placeholder="Contoh: Jan, May, Sep" />
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
              <Form.Item label={T.jurusan} name="jurusan_id">
                <Select
                  showSearch
                  placeholder="Pilih jurusan"
                  filterOption={false}
                  onSearch={fetchJurusanOpts}
                  notFoundContent={fetchingJurusan ? "Loading..." : null}
                  options={jurusanOptions}
                  allowClear
                />
              </Form.Item>

              <Form.Item label={T.name} name="name">
                <Input placeholder="Nama prodi" />
              </Form.Item>

              <Form.Item label={T.desc} name="description">
                <Input.TextArea rows={3} placeholder="Deskripsi (opsional)" />
              </Form.Item>

              {/* NEW: Intake */}
              <Form.Item label={T.intake} name="in_take">
                <Input placeholder="Contoh: Jan, May, Sep" />
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
                  {detailData?.name || activeRow?.name || "â€”"}
                </div>
              </div>
              <div>
                <div style={styles.label}>{T.jurusan}</div>
                <div style={styles.value}>
                  {viewModel.jurusanName?.(
                    detailData?.jurusan_id || activeRow?.jurusan_id
                  ) || "â€”"}
                </div>
              </div>
              <div>
                <div style={styles.label}>{T.intakeCol}</div>
                <div style={styles.value}>
                  {detailData?.in_take ?? activeRow?.in_take ?? "â€”"}
                </div>
              </div>
              <div>
                <div style={styles.label}>{T.collegeCol}</div>
                <div style={styles.value}>
                  {viewModel.collegeName?.(
                    detailData?.college_id || activeRow?.college_id
                  ) || "â€”"}
                </div>
              </div>
              <div>
                <div style={styles.label}>{T.priceCol}</div>
                <div style={styles.value}>
                  {fmtIdr(detailData?.harga ?? activeRow?.harga)}
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
              <div>
                <div style={styles.label}>{T.desc}</div>
                <div style={{ ...styles.value, whiteSpace: "pre-wrap" }}>
                  {stripTags(detailData?.description) || "â€”"}
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
    gridTemplateColumns: "1fr 220px 220px", // search | jurusan | sort
    gap: 8,
    marginBottom: 10,
    alignItems: "center",
  },
  searchInput: { height: 36, borderRadius: 10 },
  filterSelect: { width: "100%" },
  filterSort: { width: "100%" },

  tableHeader: {
    display: "grid",
    gridTemplateColumns: GRID_COLS, // konsisten dengan row
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
    gridTemplateColumns: GRID_COLS, // konsisten dengan header
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

