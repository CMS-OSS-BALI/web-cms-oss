// app/(view)/admin/college/CollegeAContent.jsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useCollegeAViewModel from "./useCollegeAViewModel";
import {
  ConfigProvider,
  Button,
  Modal,
  Form,
  Input,
  Upload,
  Empty,
  Skeleton,
  Popconfirm,
  Tooltip,
  Spin,
  Select,
  InputNumber,
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

const T = {
  title: "Manajemen Kampus",
  totalLabel: "Kampus Terdaftar",
  listTitle: "Data Kampus",
  addNew: "Buat Data Baru",
  searchPh: "Cari nama kampus",
  nameCol: "Nama Kampus",
  priceCol: "Price",
  livingCol: "Living Cost",
  countryCol: "Negara",
  action: "Aksi",
  view: "Lihat",
  edit: "Edit",
  del: "Hapus",
  save: "Simpan",

  // form fields
  logo: "Foto (9:16)",
  name: "Nama Kampus",
  desc: "Deskripsi",
  country: "Negara",
  city: "Kota",
  state: "State/Provinsi",
  postal: "Kode Pos",
  website: "Website",
  address: "Alamat",
  tuitionMin: "Biaya Kuliah Minimum",
  tuitionMax: "Biaya Kuliah Maksimum",
  living: "Estimasi Living Cost",
  contact: "Nama Kontak",
  phone: "No. Telp",
  email: "Email",
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

const isImg = (f) =>
  ["image/jpeg", "image/png", "image/webp", "image/svg+xml"].includes(
    f?.type || ""
  );
const tooBig = (f, mb = 10) => f.size / 1024 / 1024 > mb;

// biaya: titik ribuan
const numFormatter = (val) => {
  if (val === undefined || val === null || val === "") return "";
  const s = String(val).replace(/\D/g, "");
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};
const numParser = (val) => (!val ? "" : val.replace(/\./g, ""));
const numOrNull = (v) =>
  v === undefined || v === null || v === "" ? null : Number(v);

const stripTags = (s) => (s ? String(s).replace(/<[^>]*>/g, "") : "");

export default function CollegeAContent(props) {
  // gunakan VM yang dipassing dari page; fallback buat sendiri jika tidak ada
  const vm =
    props && Object.prototype.hasOwnProperty.call(props, "colleges")
      ? props
      : useCollegeAViewModel({ locale: props?.locale || "id" });

  // ----- notification (top-right)
  const [notify, contextHolder] = notification.useNotification();
  const ok = useCallback(
    (message, description) =>
      notify.success({ message, description, placement: "topRight" }),
    [notify]
  );
  const err = useCallback(
    (message, description) =>
      notify.error({ message, description, placement: "topRight" }),
    [notify]
  );

  // ----- UI state
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [activeRow, setActiveRow] = useState(null);
  const [formCreate] = Form.useForm();
  const [formEdit] = Form.useForm();
  const [logoPrevCreate, setLogoPrevCreate] = useState("");
  const [logoPrevEdit, setLogoPrevEdit] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState(null);

  // cleanup objectURL
  useEffect(() => {
    return () => {
      if (logoPrevCreate) URL.revokeObjectURL(logoPrevCreate);
      if (logoPrevEdit) URL.revokeObjectURL(logoPrevEdit);
    };
  }, [logoPrevCreate, logoPrevEdit]);

  // Ukuran gambar untuk lebar modal view dinamis
  const [viewImgMeta, setViewImgMeta] = useState({ w: 0, h: 0 });
  const viewModalWidth =
    (viewImgMeta.h || 0) >= (viewImgMeta.w || 0) ? 560 : 900;

  const rows = useMemo(() => vm.colleges || [], [vm.colleges]);

  // === Fallback filter client-side: hanya nama + negara ===
  const [searchValue, setSearchValue] = useState(vm.q || "");
  useEffect(() => setSearchValue(vm.q || ""), [vm.q]);
  const filteredRows = useMemo(() => {
    const s = (searchValue || "").trim().toLowerCase();
    return rows.filter((r) => {
      const okName = !s || (r?.name || "").toLowerCase().includes(s);
      const okCountry = !vm.country || (r?.country || "") === vm.country;
      return okName && okCountry;
    });
  }, [rows, searchValue, vm.country]);

  const normList = (e) => (Array.isArray(e) ? e : e?.fileList || []);
  const beforeLogoCreate = (file) => {
    if (!isImg(file) || tooBig(file, 10)) return Upload.LIST_IGNORE;
    try {
      const url = URL.createObjectURL(file);
      if (logoPrevCreate) URL.revokeObjectURL(logoPrevCreate);
      setLogoPrevCreate(url);
    } catch {}
    return false;
  };
  const beforeLogoEdit = (file) => {
    if (!isImg(file) || tooBig(file, 10)) return Upload.LIST_IGNORE;
    try {
      const url = URL.createObjectURL(file);
      if (logoPrevEdit) URL.revokeObjectURL(logoPrevEdit);
      setLogoPrevEdit(url);
    } catch {}
    return false;
  };

  // ===== create
  const onCreate = async () => {
    const v = await formCreate.validateFields().catch(() => null);
    if (!v) return;
    const file = v.logo?.[0]?.originFileObj || null;

    const out = await vm.createCollege({
      file,
      name: v.name,
      description: v.description || "",
      country: v.country || "",
      city: v.city || "",
      state: v.state || "",
      postal_code: v.postal || "",
      website: v.website || "",
      address: v.address || "",
      tuition_min: numOrNull(v.tuition_min),
      tuition_max: numOrNull(v.tuition_max),
      living_cost_estimate: numOrNull(v.living),
      contact_name: v.contact || "",
      no_telp: v.phone || "",
      email: v.email || "",
      autoTranslate: true,
    });

    if (!out.ok) {
      err("Gagal membuat kampus", out.error || "Gagal menyimpan");
      return;
    }
    ok("Berhasil", `Kampus “${v.name}” berhasil dibuat.`);
    setCreateOpen(false);
    formCreate.resetFields();
    if (logoPrevCreate) URL.revokeObjectURL(logoPrevCreate);
    setLogoPrevCreate("");
  };

  // ===== edit (load)
  const openEdit = async (row) => {
    setActiveRow(row);
    setEditOpen(true);
    setDetailLoading(true);
    setDetailData(null);
    const { ok: okDetail, data, error } = await vm.getCollege(row.id);
    setDetailLoading(false);
    if (!okDetail) {
      setEditOpen(false);
      err("Gagal memuat detail", error);
      return;
    }
    const d = data || row;
    setDetailData(d);
    formEdit.setFieldsValue({
      name: d.name || "",
      description: d.description || "",
      country: d.country || "",
      city: d.city || "",
      state: d.state || "",
      postal: d.postal_code || "",
      website: d.website || "",
      address: d.address || "",
      tuition_min:
        d.tuition_min != null ? numFormatter(String(d.tuition_min)) : "",
      tuition_max:
        d.tuition_max != null ? numFormatter(String(d.tuition_max)) : "",
      living:
        d.living_cost_estimate != null
          ? numFormatter(String(d.living_cost_estimate))
          : "",
      contact: d.contact_name || "",
      phone: d.no_telp || "",
      email: d.email || "",
    });
    setLogoPrevEdit(d.logo_url || "");
  };

  // ===== edit (submit)
  const onEditSubmit = async () => {
    if (!activeRow) return;
    const v = await formEdit.validateFields().catch(() => null);
    if (!v) return;
    const file = v.logo?.[0]?.originFileObj || null;

    const res = await vm.updateCollege(activeRow.id, {
      file,
      name: v.name,
      description: v.description || "",
      country: v.country || "",
      city: v.city || "",
      state: v.state || "",
      postal_code: v.postal || "",
      website: v.website || "",
      address: v.address || "",
      tuition_min: numOrNull(v.tuition_min),
      tuition_max: numOrNull(v.tuition_max),
      living_cost_estimate: numOrNull(v.living),
      contact_name: v.contact || "",
      no_telp: v.phone || "",
      email: v.email || "",
      autoTranslate: false,
    });

    if (!res.ok) {
      err("Gagal menyimpan perubahan", res.error || "Gagal menyimpan");
      return;
    }
    ok(
      "Perubahan tersimpan",
      `Data kampus “${v.name || activeRow.name}” diperbarui.`
    );
    setEditOpen(false);
    formEdit.resetFields();
    if (logoPrevEdit) URL.revokeObjectURL(logoPrevEdit);
    setLogoPrevEdit("");
  };

  const onDelete = async (id) => {
    const res = await vm.deleteCollege(id);
    if (!res.ok) {
      err("Gagal menghapus", res.error || "Tidak bisa menghapus");
      return;
    }
    ok("Terhapus", "Kampus berhasil dihapus.");
  };

  // ===== Search (nama) & Filter (negara) =====
  // kirim ke backend (debounce 400ms)
  useEffect(() => {
    const v = (searchValue || "").trim();
    const t = setTimeout(() => {
      vm.setQ?.(v); // di VM: ?name=/q_name=
      vm.setPage?.(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchValue]); // eslint-disable-line

  const { shellW, maxW, blue, text } = TOKENS;

  // required rules ONLY for Create
  const req = (msg) => [{ required: true, message: msg }];

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

      {/* paksa rasio 9:16 untuk Upload */}
      <style jsx global>{`
        .portrait-uploader.ant-upload.ant-upload-select-picture-card {
          width: 180px !important;
          height: 320px !important;
          padding: 0 !important;
        }
        .portrait-uploader .ant-upload {
          width: 100% !important;
          height: 100% !important;
        }
      `}</style>

      {/* ===== Page wrapper ===== */}
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
                  {vm.total ?? rows.length ?? "—"}
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

              {/* Filters (tanpa tombol) */}
              <div style={styles.filtersRow}>
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
                  allowClear
                  placeholder="Filter negara"
                  value={vm.country || undefined}
                  onChange={(v) => {
                    vm.setCountry?.(v || "");
                    vm.setPage?.(1);
                  }}
                  options={Array.from(
                    new Set(rows.map((r) => r.country).filter(Boolean))
                  ).map((c) => ({ value: c, label: c }))}
                  style={styles.filterSelect}
                />
              </div>

              {/* Table header */}
              <div style={{ overflowX: "auto" }}>
                <div style={styles.tableHeader}>
                  <div style={{ ...styles.thLeft, paddingLeft: 8 }}>
                    {T.nameCol}
                  </div>
                  <div style={styles.thCenter}>{T.priceCol}</div>
                  <div style={styles.thCenter}>{T.livingCol}</div>
                  <div style={styles.thCenter}>{T.countryCol}</div>
                  <div style={styles.thCenter}>{T.action}</div>
                </div>

                {/* Rows */}
                <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
                  {vm.loading ? (
                    <div style={{ padding: "8px 4px" }}>
                      <Skeleton active paragraph={{ rows: 2 }} />
                    </div>
                  ) : filteredRows.length === 0 ? (
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
                    filteredRows.map((r) => {
                      const name = r.name || "(untitled)";
                      const priceMin =
                        r.tuition_min != null
                          ? vm.money(r.tuition_min, r.currency || "IDR")
                          : null;
                      const priceMax =
                        r.tuition_max != null
                          ? vm.money(r.tuition_max, r.currency || "IDR")
                          : null;
                      const price =
                        priceMin && priceMax
                          ? `${priceMin} - ${priceMax}`
                          : priceMin || priceMax || "—";

                      const living =
                        r.living_cost_estimate != null
                          ? vm.money(
                              r.living_cost_estimate,
                              r.currency || "IDR"
                            )
                          : "—";

                      return (
                        <div key={r.id} style={styles.row}>
                          <div style={styles.colName}>
                            <div style={styles.logoBox}>
                              {r.logo_url ? (
                                <img
                                  src={r.logo_url}
                                  alt=""
                                  style={styles.logoImg}
                                />
                              ) : (
                                <div style={styles.logoFallback}>🏫</div>
                              )}
                            </div>
                            <div style={styles.nameWrap}>
                              <div style={styles.nameText} title={name}>
                                {name}
                              </div>
                              <div style={styles.subDate}>
                                {fmtDateId(r.created_at)}
                              </div>
                            </div>
                          </div>

                          <div style={styles.colCenter}>{price}</div>
                          <div style={styles.colCenter}>{living}</div>
                          <div style={styles.colCenter}>{r.country || "-"}</div>

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
                                  setViewImgMeta({ w: 0, h: 0 });
                                  vm.getCollege(r.id).then(
                                    ({ ok, data, error }) => {
                                      setDetailLoading(false);
                                      if (!ok) {
                                        setViewOpen(false);
                                        err("Gagal memuat detail", error);
                                        return;
                                      }
                                      setDetailData(data);
                                    }
                                  );
                                }}
                                style={styles.iconBtn}
                              />
                            </Tooltip>
                            <Tooltip title={T.del}>
                              <Popconfirm
                                title="Hapus kampus ini?"
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

      {/* ===== Create Modal ===== */}
      <Modal
        open={createOpen}
        onCancel={() => {
          setCreateOpen(false);
          if (logoPrevCreate) URL.revokeObjectURL(logoPrevCreate);
          setLogoPrevCreate("");
          formCreate.resetFields();
        }}
        footer={null}
        width={860}
        destroyOnClose
        title={null}
      >
        <div style={styles.modalShell}>
          <Form layout="vertical" form={formCreate}>
            <div style={styles.coverWrap}>
              <Form.Item
                name="logo"
                valuePropName="fileList"
                getValueFromEvent={normList}
                noStyle
              >
                <Upload
                  accept="image/*"
                  listType="picture-card"
                  showUploadList={false}
                  beforeUpload={beforeLogoCreate}
                  className="portrait-uploader"
                >
                  <div style={styles.coverBox}>
                    {logoPrevCreate ? (
                      <img
                        src={logoPrevCreate}
                        alt="logo"
                        style={styles.coverImg}
                      />
                    ) : (
                      <div style={styles.coverPlaceholder}>+ {T.logo}</div>
                    )}
                  </div>
                </Upload>
              </Form.Item>
            </div>

            <Form.Item
              label={T.name}
              name="name"
              rules={req("Nama kampus wajib diisi")}
            >
              <Input placeholder="Contoh: Skyline College" />
            </Form.Item>

            <Form.Item
              label={T.desc}
              name="description"
              rules={req("Deskripsi wajib diisi")}
            >
              <Input.TextArea rows={3} placeholder="Deskripsi singkat..." />
            </Form.Item>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              <Form.Item
                label={T.country}
                name="country"
                rules={req("Negara wajib diisi")}
              >
                <Input placeholder="Contoh: Australia" />
              </Form.Item>
              <Form.Item
                label={T.city}
                name="city"
                rules={req("Kota wajib diisi")}
              >
                <Input placeholder="Kota" />
              </Form.Item>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              <Form.Item
                label={T.state}
                name="state"
                rules={req("Provinsi/State wajib diisi")}
              >
                <Input placeholder="Provinsi/State" />
              </Form.Item>
              <Form.Item
                label={T.postal}
                name="postal"
                rules={req("Kode Pos wajib diisi")}
              >
                <Input placeholder="Kode Pos" />
              </Form.Item>
            </div>

            <Form.Item
              label={T.website}
              name="website"
              rules={req("Website wajib diisi")}
            >
              <Input placeholder="https://example.edu" />
            </Form.Item>

            <Form.Item
              label={T.address}
              name="address"
              rules={req("Alamat wajib diisi")}
            >
              <Input.TextArea rows={2} placeholder="Alamat lengkap" />
            </Form.Item>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              <Form.Item label={T.tuitionMin} name="tuition_min">
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  controls={false}
                  formatter={numFormatter}
                  parser={numParser}
                  placeholder="cth: 1.272"
                />
              </Form.Item>
              <Form.Item label={T.tuitionMax} name="tuition_max">
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  controls={false}
                  formatter={numFormatter}
                  parser={numParser}
                  placeholder="cth: 9.725"
                />
              </Form.Item>
            </div>

            <Form.Item label={T.living} name="living">
              <InputNumber
                style={{ width: "100%" }}
                min={0}
                controls={false}
                formatter={numFormatter}
                parser={numParser}
                placeholder="cth: 15.000"
              />
            </Form.Item>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              <Form.Item label={T.contact} name="contact">
                <Input />
              </Form.Item>
              <Form.Item label={T.phone} name="phone">
                <Input />
              </Form.Item>
            </div>

            <Form.Item
              label={T.email}
              name="email"
              rules={[{ type: "email", message: "Format email tidak valid" }]}
            >
              <Input type="email" />
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
          if (logoPrevEdit) URL.revokeObjectURL(logoPrevEdit);
          setLogoPrevEdit("");
          formEdit.resetFields();
        }}
        footer={null}
        width={900}
        destroyOnClose
        title={null}
      >
        <div style={styles.modalShell}>
          <Spin spinning={detailLoading}>
            <Form layout="vertical" form={formEdit}>
              <div style={styles.coverWrap}>
                <Form.Item
                  name="logo"
                  valuePropName="fileList"
                  getValueFromEvent={normList}
                  noStyle
                >
                  <Upload
                    accept="image/*"
                    listType="picture-card"
                    showUploadList={false}
                    beforeUpload={beforeLogoEdit}
                    className="portrait-uploader"
                  >
                    <div style={styles.coverBox}>
                      {logoPrevEdit ? (
                        <img
                          src={logoPrevEdit}
                          alt="logo"
                          style={styles.coverImg}
                        />
                      ) : (
                        <div style={styles.coverPlaceholder}>+ {T.logo}</div>
                      )}
                    </div>
                  </Upload>
                </Form.Item>
              </div>

              {/* Edit tidak required */}
              <Form.Item label={T.name} name="name">
                <Input placeholder="Nama kampus" />
              </Form.Item>

              <Form.Item label={T.desc} name="description">
                <Input.TextArea rows={3} placeholder="Deskripsi" />
              </Form.Item>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                <Form.Item label={T.country} name="country">
                  <Input />
                </Form.Item>
                <Form.Item label={T.city} name="city">
                  <Input />
                </Form.Item>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                <Form.Item label={T.state} name="state">
                  <Input />
                </Form.Item>
                <Form.Item label={T.postal} name="postal">
                  <Input />
                </Form.Item>
              </div>

              <Form.Item label={T.website} name="website">
                <Input />
              </Form.Item>

              <Form.Item label={T.address} name="address">
                <Input.TextArea rows={2} />
              </Form.Item>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                <Form.Item label={T.tuitionMin} name="tuition_min">
                  <InputNumber
                    style={{ width: "100%" }}
                    min={0}
                    controls={false}
                    formatter={numFormatter}
                    parser={numParser}
                  />
                </Form.Item>
                <Form.Item label={T.tuitionMax} name="tuition_max">
                  <InputNumber
                    style={{ width: "100%" }}
                    min={0}
                    controls={false}
                    formatter={numFormatter}
                    parser={numParser}
                  />
                </Form.Item>
              </div>

              <Form.Item label={T.living} name="living">
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  controls={false}
                  formatter={numFormatter}
                  parser={numParser}
                />
              </Form.Item>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                <Form.Item label={T.contact} name="contact">
                  <Input />
                </Form.Item>
                <Form.Item label={T.phone} name="phone">
                  <Input />
                </Form.Item>
              </div>

              <Form.Item
                label={T.email}
                name="email"
                rules={[{ type: "email", message: "Format email tidak valid" }]}
              >
                <Input type="email" />
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

      {/* ===== View Modal (lengkap) ===== */}
      <Modal
        open={viewOpen}
        onCancel={() => {
          setViewOpen(false);
          setDetailData(null);
          setViewImgMeta({ w: 0, h: 0 });
        }}
        footer={null}
        width={viewModalWidth}
        destroyOnClose
        title={null}
      >
        <div style={styles.modalShell}>
          <Spin spinning={detailLoading}>
            <div style={styles.coverWrap}>
              <div style={styles.coverBoxRead}>
                {detailData?.logo_url ? (
                  <img
                    src={detailData.logo_url}
                    alt="logo"
                    style={styles.coverImgRead}
                    onLoad={(e) =>
                      setViewImgMeta({
                        w: e.currentTarget.naturalWidth,
                        h: e.currentTarget.naturalHeight,
                      })
                    }
                  />
                ) : (
                  <div style={{ padding: 24, textAlign: "center" }}>
                    Tidak ada foto
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
              <div>
                <div style={styles.label}>{T.name}</div>
                <div style={styles.value}>
                  {detailData?.name || activeRow?.name || "-"}
                </div>
              </div>

              <div>
                <div style={styles.label}>{T.desc}</div>
                <div style={{ ...styles.value, whiteSpace: "pre-wrap" }}>
                  {stripTags(detailData?.description) || "—"}
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
                  <div style={styles.label}>{T.country}</div>
                  <div style={styles.value}>{detailData?.country || "—"}</div>
                </div>
                <div>
                  <div style={styles.label}>{T.city}</div>
                  <div style={styles.value}>{detailData?.city || "—"}</div>
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
                  <div style={styles.label}>{T.state}</div>
                  <div style={styles.value}>{detailData?.state || "—"}</div>
                </div>
                <div>
                  <div style={styles.label}>{T.postal}</div>
                  <div style={styles.value}>
                    {detailData?.postal_code || "—"}
                  </div>
                </div>
              </div>

              <div>
                <div style={styles.label}>{T.website}</div>
                <div style={styles.value}>
                  {detailData?.website ? (
                    <a
                      href={detailData.website}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {detailData.website}
                    </a>
                  ) : (
                    "—"
                  )}
                </div>
              </div>

              <div>
                <div style={styles.label}>{T.address}</div>
                <div style={styles.value}>{detailData?.address || "—"}</div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                <div>
                  <div style={styles.label}>{T.tuitionMin}</div>
                  <div style={styles.value}>
                    {detailData?.tuition_min != null
                      ? vm.money(
                          detailData?.tuition_min,
                          detailData?.currency || "IDR"
                        )
                      : "—"}
                  </div>
                </div>
                <div>
                  <div style={styles.label}>{T.tuitionMax}</div>
                  <div style={styles.value}>
                    {detailData?.tuition_max != null
                      ? vm.money(
                          detailData?.tuition_max,
                          detailData?.currency || "IDR"
                        )
                      : "—"}
                  </div>
                </div>
              </div>

              <div>
                <div style={styles.label}>{T.living}</div>
                <div style={styles.value}>
                  {detailData?.living_cost_estimate != null
                    ? vm.money(
                        detailData?.living_cost_estimate,
                        detailData?.currency || "IDR"
                      )
                    : "—"}
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
                  <div style={styles.label}>{T.contact}</div>
                  <div style={styles.value}>
                    {detailData?.contact_name || "—"}
                  </div>
                </div>
                <div>
                  <div style={styles.label}>{T.phone}</div>
                  <div style={styles.value}>{detailData?.no_telp || "—"}</div>
                </div>
              </div>

              <div>
                <div style={styles.label}>{T.email}</div>
                <div style={styles.value}>{detailData?.email || "—"}</div>
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
    gridTemplateColumns: "1fr 220px",
    gap: 8,
    marginBottom: 10,
    alignItems: "center",
  },
  searchInput: { height: 36, borderRadius: 10 },
  filterSelect: { width: "100%" },

  tableHeader: {
    display: "grid",
    gridTemplateColumns: "2.2fr 1fr 1.1fr .8fr .7fr",
    gap: 8,
    marginBottom: 4,
    color: "#0b3e91",
    fontWeight: 700,
    alignItems: "center",
    minWidth: 880,
  },
  thLeft: { display: "flex", justifyContent: "flex-start", width: "100%" },
  thCenter: { display: "flex", justifyContent: "center", width: "100%" },

  row: {
    display: "grid",
    gridTemplateColumns: "2.2fr 1fr 1.1fr .8fr .7fr",
    gap: 8,
    alignItems: "center",
    background: "#f5f8ff",
    borderRadius: 10,
    border: "1px solid #e8eeff",
    padding: "8px 10px",
    boxShadow: "0 6px 12px rgba(11, 86, 201, 0.05)",
    minWidth: 880,
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
  logoBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    background: "#fff",
    border: "1px solid #e5edff",
    display: "grid",
    placeItems: "center",
    overflow: "hidden",
    boxShadow: "0 2px 6px rgba(0,0,0,.04) inset",
  },
  logoImg: { width: "100%", height: "100%", objectFit: "contain" },
  logoFallback: { fontSize: 18 },
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

  coverWrap: {
    display: "grid",
    justifyContent: "center",
    justifyItems: "center",
    marginTop: 6,
    marginBottom: 10,
  },

  coverBox: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
    border: "2px dashed #c0c8d8",
    background: "#f8fbff",
    display: "grid",
    placeItems: "center",
    overflow: "hidden",
  },
  coverImg: { width: "100%", height: "100%", objectFit: "cover" },
  coverPlaceholder: { fontWeight: 700, color: "#0b56c9", userSelect: "none" },

  coverBoxRead: {
    width: "100%",
    borderRadius: 12,
    border: "1px solid #e6eeff",
    overflow: "hidden",
    background: "#f8fbff",
    display: "grid",
    placeItems: "center",
  },
  coverImgRead: {
    maxWidth: "100%",
    maxHeight: "72vh",
    width: "auto",
    height: "auto",
    display: "block",
  },

  modalFooter: { marginTop: 8, display: "grid", placeItems: "center" },
  saveBtn: { minWidth: 200, height: 40, borderRadius: 12 },
};
