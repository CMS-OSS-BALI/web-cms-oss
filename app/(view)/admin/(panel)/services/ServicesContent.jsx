"use client";

import { useEffect, useMemo, useState } from "react";
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
import useServicesViewModel from "./useServicesViewModel";

/* ===== compact tokens ===== */
const TOKENS = {
  shellW: "94%",
  maxW: 1140,
  blue: "#0b56c9",
  text: "#0f172a",
};

const T = {
  title: "Manajemen Layanan",
  totalLabel: "Layanan Terdaftar",
  listTitle: "Data Layanan",
  addNew: "Buat Data Baru",
  searchPh: "Cari nama layanan",
  nameCol: "Nama Layanan",
  typeCol: "Tipe",
  catCol: "Kategori",
  priceCol: "Harga",
  pubCol: "Status",
  action: "Aksi",
  view: "Lihat",
  edit: "Edit",
  del: "Hapus",
  save: "Simpan",

  // form fields
  image: "Gambar (16:9)",
  nameId: "Nama (Bahasa Indonesia)",
  descId: "Deskripsi (Bahasa Indonesia)",
  serviceType: "Tipe Layanan",
  category: "Kategori",
  price: "Harga",
  phone: "No. Telp (Kontak)",
  published: "Published",
  publishedYes: "Published",
  publishedNo: "Draft",
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

const isImg = (f) =>
  ["image/jpeg", "image/png", "image/webp"].includes(f?.type || "");
const tooBig = (f, mb = 10) => f.size / 1024 / 1024 > mb;

// rupiah-like: titik ribuan
const numFormatter = (val) => {
  if (val == null || val === "") return "";
  const s = String(val).replace(/\D/g, "");
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};
const numParser = (val) => (!val ? "" : val.replace(/\./g, ""));
const numOrNull = (v) => (v == null || v === "" ? null : Number(v));

const stripTags = (s) => (s ? String(s).replace(/<[^>]*>/g, "") : "");

export default function ServicesContent({ locale = "id" }) {
  const vm = useServicesViewModel({ locale });

  // ===== notifications
  const [notify, contextHolder] = notification.useNotification();
  const ok = (message, description) =>
    notify.success({ message, description, placement: "topRight" });
  const err = (message, description) =>
    notify.error({ message, description, placement: "topRight" });

  // ----- UI state
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [activeRow, setActiveRow] = useState(null);
  const [formCreate] = Form.useForm();
  const [formEdit] = Form.useForm();
  const [imgPrevCreate, setImgPrevCreate] = useState("");
  const [imgPrevEdit, setImgPrevEdit] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState(null);

  // Lebar modal view dinamis
  const [viewImgMeta, setViewImgMeta] = useState({ w: 0, h: 0 });
  const viewModalWidth =
    (viewImgMeta.h || 0) >= (viewImgMeta.w || 0) ? 560 : 900;

  const rows = useMemo(() => vm.services || [], [vm.services]);

  // === Pencarian (client-side fallback hanya nama) ===
  const [searchValue, setSearchValue] = useState(vm.q || "");
  useEffect(() => setSearchValue(vm.q || ""), [vm.q]);

  const filteredRows = useMemo(() => {
    const s = (searchValue || "").trim().toLowerCase();
    return rows.filter((r) => {
      const okName = !s || (r?.name || "").toLowerCase().includes(s);
      const okType =
        !vm.serviceType || (r?.service_type || "") === vm.serviceType;
      const okPub =
        vm.published === undefined
          ? true
          : !!r?.is_published === (vm.published === true);
      const okCat =
        !vm.categoryId ||
        vm.categoryId === (r?.category?.id || r?.category_id || "");
      return okName && okType && okPub && okCat;
    });
  }, [rows, searchValue, vm.serviceType, vm.published, vm.categoryId]);

  // category live search (debounced)
  const [catSearchQ, setCatSearchQ] = useState("");
  useEffect(() => {
    const t = setTimeout(
      () => vm.searchCategories(catSearchQ || "", { force: false }),
      300
    );
    return () => clearTimeout(t);
  }, [catSearchQ, vm]);

  // Upload helpers
  const normList = (e) => (Array.isArray(e) ? e : e?.fileList || []);
  const beforeImgCreate = (file) => {
    if (!isImg(file) || tooBig(file, 10)) return Upload.LIST_IGNORE;
    try {
      setImgPrevCreate(URL.createObjectURL(file));
    } catch {}
    return false;
  };
  const beforeImgEdit = (file) => {
    if (!isImg(file) || tooBig(file, 10)) return Upload.LIST_IGNORE;
    try {
      setImgPrevEdit(URL.createObjectURL(file));
    } catch {}
    return false;
  };

  /* ================= CREATE ================= */
  const onCreate = async () => {
    const v = await formCreate.validateFields().catch(() => null);
    if (!v) return;
    const file = v.image?.[0]?.originFileObj || null;

    const out = await vm.createService({
      file,
      name_id: v.name_id,
      description_id: v.description_id || "",
      service_type: v.service_type,
      category_id: v.category_id || null,
      price: numOrNull(v.price),
      phone: v.phone || "",
      is_published: v.is_published === true,
    });

    if (!out?.ok) {
      err("Gagal membuat layanan", out?.error || "Gagal menyimpan");
      return;
    }
    ok("Berhasil", "Layanan berhasil dibuat");
    setCreateOpen(false);
    formCreate.resetFields();
    setImgPrevCreate("");
  };

  /* ================= EDIT (load) ================= */
  const openEdit = async (row) => {
    setActiveRow(row);
    setEditOpen(true);
    setDetailLoading(true);
    setDetailData(null);
    const { ok: okLoad, data, error } = await vm.getService(row.id);
    setDetailLoading(false);
    if (!okLoad) {
      setEditOpen(false);
      err("Gagal memuat data layanan", error || "Terjadi kesalahan");
      return;
    }
    const d = data || row;
    setDetailData(d);
    formEdit.setFieldsValue({
      name_id: d.name || "",
      description_id: d.description || "",
      service_type: d.service_type || undefined,
      category_id: d.category?.id || undefined,
      price: d.price != null ? numFormatter(String(d.price)) : "",
      phone: d.phone || "",
      is_published: !!d.is_published,
    });
    setImgPrevEdit(d.image_public_url || d.image_url || "");
    // paksa refresh opsi kategori saat modal dibuka
    vm.searchCategories("", { force: true });
  };

  /* ================= EDIT (submit) ================= */
  const onEditSubmit = async () => {
    if (!activeRow) return;
    const v = await formEdit.validateFields().catch(() => null);
    if (!v) return;
    const file = v.image?.[0]?.originFileObj || null;

    const res = await vm.updateService(activeRow.id, {
      file,
      name_id: v.name_id,
      description_id: v.description_id || "",
      service_type: v.service_type,
      category_id: v.category_id || null,
      price: numOrNull(v.price),
      phone: v.phone || "",
      is_published: v.is_published === true,
    });

    if (!res?.ok) {
      err("Gagal memperbarui layanan", res?.error || "Gagal menyimpan");
      return;
    }
    ok("Berhasil", "Perubahan berhasil disimpan");
    setEditOpen(false);
    formEdit.resetFields();
    setImgPrevEdit("");
  };

  const onDelete = async (id) => {
    const res = await vm.deleteService(id);
    if (!res?.ok) {
      err("Gagal menghapus layanan", res?.error || "Tidak bisa menghapus");
    } else {
      ok("Berhasil", "Layanan telah dihapus");
    }
  };

  // ===== Search (kirim ke backend, debounce 400ms)
  useEffect(() => {
    const v = (searchValue || "").trim();
    const t = setTimeout(() => {
      vm.setQ?.(v);
      vm.setPage?.(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchValue]); // eslint-disable-line

  const { shellW, maxW, blue, text } = TOKENS;
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

      <style jsx global>{`
        .landscape-uploader.ant-upload.ant-upload-select-picture-card {
          width: 320px !important;
          height: 180px !important;
          padding: 0 !important;
        }
        .landscape-uploader .ant-upload {
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
                  onClick={() => {
                    setCreateOpen(true);
                    // paksa refresh opsi saat modal create dibuka
                    vm.searchCategories("", { force: true });
                  }}
                >
                  {T.addNew}
                </Button>
              </div>

              {/* Filters */}
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
                  allowClear
                  placeholder="Filter tipe"
                  value={vm.serviceType || undefined}
                  onChange={(v) => {
                    vm.setServiceType?.(v || "");
                    vm.setPage?.(1);
                  }}
                  options={[
                    { value: "B2B", label: "B2B" },
                    { value: "B2C", label: "B2C" },
                  ]}
                  style={styles.filterSelect}
                />
                <Select
                  allowClear
                  showSearch
                  placeholder="Filter kategori"
                  value={vm.categoryId || undefined}
                  onChange={(v) => {
                    vm.setCategoryId?.(v || "");
                    vm.setPage?.(1);
                  }}
                  onSearch={setCatSearchQ}
                  onDropdownVisibleChange={(open) => {
                    if (open) vm.searchCategories("", { force: true });
                  }}
                  filterOption={false}
                  options={vm.categoryOptions}
                  style={styles.filterSelect}
                  notFoundContent="Tidak ada kategori"
                />
                <Select
                  allowClear
                  placeholder="Filter status"
                  value={vm.published === undefined ? undefined : vm.published}
                  onChange={(v) => {
                    vm.setPublished?.(v === undefined ? undefined : v);
                    vm.setPage?.(1);
                  }}
                  options={[
                    { value: true, label: T.publishedYes },
                    { value: false, label: T.publishedNo },
                  ]}
                  style={styles.filterSelect}
                />
              </div>

              {/* Table header */}
              <div style={{ overflowX: "auto" }}>
                <div style={styles.tableHeader}>
                  <div style={{ ...styles.thLeft, paddingLeft: 8 }}>
                    {T.nameCol}
                  </div>
                  <div style={styles.thCenter}>{T.typeCol}</div>
                  <div style={styles.thCenter}>{T.catCol}</div>
                  <div style={styles.thCenter}>{T.priceCol}</div>
                  <div style={styles.thCenter}>{T.pubCol}</div>
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
                      const price =
                        r.price != null ? vm.money(r.price, "IDR") : "—";
                      const pub = r.is_published
                        ? T.publishedYes
                        : T.publishedNo;

                      return (
                        <div key={r.id} style={styles.rowServices}>
                          <div style={styles.colName}>
                            <div style={styles.thumbBox}>
                              {r.image_public_url ? (
                                <img
                                  src={r.image_public_url}
                                  alt=""
                                  style={styles.thumbImg}
                                />
                              ) : (
                                <div style={styles.thumbFallback}>🎯</div>
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

                          <div style={styles.colCenter}>
                            {r.service_type || "-"}
                          </div>
                          <div style={styles.colCenter}>
                            {r.category?.name || "—"}
                          </div>
                          <div style={styles.colCenter}>{price}</div>
                          <div style={styles.colCenter}>{pub}</div>

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
                                  vm.getService(r.id).then(
                                    ({ ok: okView, data, error }) => {
                                      setDetailLoading(false);
                                      if (!okView) {
                                        setViewOpen(false);
                                        err(
                                          "Gagal memuat detail",
                                          error || "Terjadi kesalahan"
                                        );
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
                                title="Hapus layanan ini?"
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
          setImgPrevCreate("");
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
                name="image"
                valuePropName="fileList"
                getValueFromEvent={normList}
                noStyle
              >
                <Upload
                  accept="image/*"
                  listType="picture-card"
                  showUploadList={false}
                  beforeUpload={beforeImgCreate}
                  className="landscape-uploader"
                >
                  <div style={styles.coverBox}>
                    {imgPrevCreate ? (
                      <img
                        src={imgPrevCreate}
                        alt="cover"
                        style={styles.coverImg}
                      />
                    ) : (
                      <div style={styles.coverPlaceholder}>+ {T.image}</div>
                    )}
                  </div>
                </Upload>
              </Form.Item>
            </div>

            <Form.Item
              label={T.nameId}
              name="name_id"
              rules={req("Nama layanan (ID) wajib diisi")}
            >
              <Input placeholder="Contoh: Pembuatan Visa Pelajar" />
            </Form.Item>

            <Form.Item label={T.descId} name="description_id">
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
                label={T.serviceType}
                name="service_type"
                rules={req("Tipe layanan wajib dipilih")}
              >
                <Select
                  placeholder="Pilih tipe"
                  options={[
                    { value: "B2B", label: "B2B" },
                    { value: "B2C", label: "B2C" },
                  ]}
                />
              </Form.Item>

              <Form.Item label={T.category} name="category_id">
                <Select
                  allowClear
                  showSearch
                  placeholder="Pilih kategori"
                  onSearch={setCatSearchQ}
                  onDropdownVisibleChange={(open) => {
                    if (open) vm.searchCategories("", { force: true });
                  }}
                  filterOption={false}
                  options={vm.categoryOptions}
                />
              </Form.Item>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              <Form.Item label={T.price} name="price">
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  controls={false}
                  formatter={numFormatter}
                  parser={numParser}
                  placeholder="cth: 1.500.000"
                />
              </Form.Item>
              <Form.Item label={T.phone} name="phone">
                <Input placeholder="cth: 0812-xxxx-xxxx" />
              </Form.Item>
            </div>

            <Form.Item
              label={T.published}
              name="is_published"
              initialValue={false}
            >
              <Select
                options={[
                  { value: true, label: T.publishedYes },
                  { value: false, label: T.publishedNo },
                ]}
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
          setImgPrevEdit("");
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
                  name="image"
                  valuePropName="fileList"
                  getValueFromEvent={normList}
                  noStyle
                >
                  <Upload
                    accept="image/*"
                    listType="picture-card"
                    showUploadList={false}
                    beforeUpload={beforeImgEdit}
                    className="landscape-uploader"
                  >
                    <div style={styles.coverBox}>
                      {imgPrevEdit ? (
                        <img
                          src={imgPrevEdit}
                          alt="cover"
                          style={styles.coverImg}
                        />
                      ) : (
                        <div style={styles.coverPlaceholder}>+ {T.image}</div>
                      )}
                    </div>
                  </Upload>
                </Form.Item>
              </div>

              <Form.Item label={T.nameId} name="name_id">
                <Input placeholder="Nama layanan (ID)" />
              </Form.Item>

              <Form.Item label={T.descId} name="description_id">
                <Input.TextArea rows={3} placeholder="Deskripsi" />
              </Form.Item>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                <Form.Item label={T.serviceType} name="service_type">
                  <Select
                    placeholder="Pilih tipe"
                    options={[
                      { value: "B2B", label: "B2B" },
                      { value: "B2C", label: "B2C" },
                    ]}
                  />
                </Form.Item>
                <Form.Item label={T.category} name="category_id">
                  <Select
                    allowClear
                    showSearch
                    placeholder="Pilih kategori"
                    onSearch={setCatSearchQ}
                    onDropdownVisibleChange={(open) => {
                      if (open) vm.searchCategories("", { force: true });
                    }}
                    filterOption={false}
                    options={vm.categoryOptions}
                  />
                </Form.Item>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                <Form.Item label={T.price} name="price">
                  <InputNumber
                    style={{ width: "100%" }}
                    min={0}
                    controls={false}
                    formatter={numFormatter}
                    parser={numParser}
                  />
                </Form.Item>
                <Form.Item label={T.phone} name="phone">
                  <Input />
                </Form.Item>
              </div>

              <Form.Item label={T.published} name="is_published">
                <Select
                  options={[
                    { value: true, label: T.publishedYes },
                    { value: false, label: T.publishedNo },
                  ]}
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
                {detailData?.image_public_url ? (
                  <img
                    src={detailData.image_public_url}
                    alt="cover"
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
                    Tidak ada gambar
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
              <div>
                <div style={styles.label}>{T.nameId}</div>
                <div style={styles.value}>
                  {detailData?.name || activeRow?.name || "-"}
                </div>
              </div>

              <div>
                <div style={styles.label}>{T.descId}</div>
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
                  <div style={styles.label}>{T.serviceType}</div>
                  <div style={styles.value}>
                    {detailData?.service_type || "—"}
                  </div>
                </div>
                <div>
                  <div style={styles.label}>{T.category}</div>
                  <div style={styles.value}>
                    {detailData?.category?.name || "—"}
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
                  <div style={styles.label}>{T.price}</div>
                  <div style={styles.value}>
                    {detailData?.price != null
                      ? vm.money(detailData?.price, "IDR")
                      : "—"}
                  </div>
                </div>
                <div>
                  <div style={styles.label}>{T.phone}</div>
                  <div style={styles.value}>{detailData?.phone || "—"}</div>
                </div>
              </div>

              <div>
                <div style={styles.label}>{T.published}</div>
                <div style={styles.value}>
                  {detailData?.is_published ? T.publishedYes : T.publishedNo}
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

  filtersRow3: {
    display: "grid",
    gridTemplateColumns: "1fr 160px 220px 180px",
    gap: 8,
    marginBottom: 10,
    alignItems: "center",
  },
  searchInput: { height: 36, borderRadius: 10 },
  filterSelect: { width: "100%" },

  tableHeader: {
    display: "grid",
    gridTemplateColumns: "2.4fr .8fr 1.1fr 1fr .9fr .8fr",
    gap: 8,
    marginBottom: 4,
    color: "#0b3e91",
    fontWeight: 700,
    alignItems: "center",
    minWidth: 980,
  },
  thLeft: { display: "flex", justifyContent: "flex-start", width: "100%" },
  thCenter: { display: "flex", justifyContent: "center", width: "100%" },

  rowServices: {
    display: "grid",
    gridTemplateColumns: "2.4fr .8fr 1.1fr 1fr .9fr .8fr",
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
  thumbBox: {
    width: 56,
    height: 40,
    borderRadius: 8,
    background: "#fff",
    border: "1px solid #e5edff",
    display: "grid",
    placeItems: "center",
    overflow: "hidden",
    boxShadow: "0 2px 6px rgba(0,0,0,.04) inset",
  },
  thumbImg: { width: "100%", height: "100%", objectFit: "cover" },
  thumbFallback: { fontSize: 18 },
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
    wordBreak: "word-break",
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
