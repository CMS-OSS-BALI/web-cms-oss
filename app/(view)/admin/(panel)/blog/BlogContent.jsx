"use client";

import { useEffect, useMemo, useState } from "react";
import useBlogViewModel from "./useBlogViewModel";
import {
  ConfigProvider,
  Button,
  Modal,
  Form,
  Input,
  Upload,
  Select,
  Empty,
  Skeleton,
  Popconfirm,
  Tooltip,
  Spin,
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
  headerH: 84,
  blue: "#0b56c9",
  text: "#0f172a",
};

const T_ID = {
  title: "Manajemen Berita",
  totalLabel: "Berita",
  listTitle: "Data Berita",
  addNew: "Buat Data Baru",
  searchPh: "Search",
  status: "Status",
  filter: "Filter",
  name: "Berita",
  category: "Kategori",
  views: "Melihat",
  likes: "Suka",
  action: "Aksi",
  cover: "Sampul",
  blogTitle: "Judul",
  blogCategory: "Kategori",
  blogDesc: "Deskripsi",
  save: "Simpan",
  edit: "Edit",
  del: "Hapus",
  view: "Lihat",
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
const abbr = (n) => {
  const v = Number(n || 0);
  if (v >= 1_000_000_000)
    return `${(v / 1_000_000_000).toFixed(1).replace(".", ",")}B`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
};

export default function BlogContent(props) {
  const vm =
    props && Object.prototype.hasOwnProperty.call(props, "blogs")
      ? props
      : useBlogViewModel();

  const locale = props?.locale || "id";
  useEffect(() => {
    vm.setLocale?.(locale);
  }, [locale]); // eslint-disable-line

  // ----- state ui -----
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [activeRow, setActiveRow] = useState(null);
  const [formCreate] = Form.useForm();
  const [formEdit] = Form.useForm();
  const [coverPrevCreate, setCoverPrevCreate] = useState("");
  const [coverPrevEdit, setCoverPrevEdit] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState(null);

  const rows = useMemo(() => vm.blogs || [], [vm.blogs]);

  const normList = (e) => (Array.isArray(e) ? e : e?.fileList || []);
  const isImg = (f) =>
    ["image/jpeg", "image/png", "image/webp"].includes(f?.type || "");
  const tooBig = (f, mb = 3) => f.size / 1024 / 1024 >= mb;
  const beforeCoverCreate = (file) => {
    if (!isImg(file) || tooBig(file, 3)) return Upload.LIST_IGNORE;
    try {
      setCoverPrevCreate(URL.createObjectURL(file));
    } catch {}
    return false;
  };
  const beforeCoverEdit = (file) => {
    if (!isImg(file) || tooBig(file, 3)) return Upload.LIST_IGNORE;
    try {
      setCoverPrevEdit(URL.createObjectURL(file));
    } catch {}
    return false;
  };

  // Fallback getBlog jika VM tidak menyediakan
  const getBlogDetail = async (id) => {
    if (typeof vm.getBlog === "function") return vm.getBlog(id);
    try {
      const res = await fetch(
        `/api/blog/${encodeURIComponent(id)}?include_category=1`
      );
      if (!res.ok) throw new Error("Gagal memuat detail");
      const json = await res.json();
      return { ok: true, data: json?.data };
    } catch (e) {
      return { ok: false, error: e?.message || "Gagal memuat detail" };
    }
  };

  const onCreate = async () => {
    const v = await formCreate.validateFields().catch(() => null);
    if (!v) return;
    const cover = v.cover?.[0]?.originFileObj || null;

    const out = await vm.createBlog({
      file: cover,
      name_id: v.title,
      category_slug: v.category || null, // NOTE: Select pakai slug
      description_id: v.description || "",
      autoTranslate: true,
    });

    if (out.ok) {
      setCreateOpen(false);
      formCreate.resetFields();
      setCoverPrevCreate("");
    } else {
      Modal.error({
        title: "Gagal",
        content: out.error || "Gagal membuat blog",
      });
    }
  };

  const openEdit = async (row) => {
    setActiveRow(row);
    setEditOpen(true);
    setDetailLoading(true);
    setDetailData(null);
    const { ok, data, error } = await getBlogDetail(row.id);
    setDetailLoading(false);
    if (!ok) {
      setEditOpen(false);
      return Modal.error({ title: "Gagal memuat", content: error });
    }
    const d = data || row;
    setDetailData(d);
    formEdit.setFieldsValue({
      title: d.name || d.title || row.title || "",
      category: d.category_slug || "", // NOTE: value slug agar cocok dengan options form
      description: d.description || d.description_id || "",
    });
    setCoverPrevEdit(d.image_url || d.image_public_url || row.image_src || "");
  };

  const onEditSubmit = async () => {
    if (!activeRow) return;
    const v = await formEdit.validateFields().catch(() => null);
    if (!v) return;
    const cover = v.cover?.[0]?.originFileObj || null;

    const res = await vm.updateBlog(activeRow.id, {
      ...(cover ? { file: cover } : {}),
      name_id: v.title,
      category_slug: v.category || null, // NOTE: Select pakai slug
      description_id: v.description || "",
      autoTranslate: false,
    });

    if (res.ok) {
      setEditOpen(false);
      formEdit.resetFields();
      setCoverPrevEdit("");
    } else {
      Modal.error({ title: "Gagal", content: res.error || "Gagal menyimpan" });
    }
  };

  const onDelete = async (id) => {
    const res = await vm.deleteBlog(id);
    if (!res.ok) {
      Modal.error({
        title: "Gagal",
        content: res.error || "Tidak bisa menghapus",
      });
    }
  };

  const openView = async (row) => {
    setActiveRow(row);
    setViewOpen(true);
    setDetailLoading(true);
    setDetailData(null);
    const { ok, data, error } = await getBlogDetail(row.id);
    setDetailLoading(false);
    if (!ok) {
      setViewOpen(false);
      return Modal.error({ title: "Gagal memuat", content: error });
    }
    setDetailData(data);
  };

  const goPrev = () => vm.setPage(Math.max(1, vm.page - 1));
  const goNext = () => vm.setPage(vm.page + 1); // aman saat totalPages undefined

  const [searchValue, setSearchValue] = useState(vm.q || "");
  useEffect(() => setSearchValue(vm.q || ""), [vm.q]);
  const triggerSearch = () => {
    vm.setQ?.(searchValue || "");
    vm.setPage?.(1);
  };

  const onChangeStatus = (v) => {
    vm.setStatus?.(v);
    if (v === "deleted") {
      vm.setOnlyDeleted?.(true);
      vm.setWithDeleted?.(false);
    } else {
      vm.setOnlyDeleted?.(false);
      vm.setWithDeleted?.(false);
    }
    vm.setPage?.(1);
  };

  // FILTER kategori by ID (untuk list)
  const onChangeCategory = (v) => {
    vm.setCategoryId?.(v || "");
    vm.setPage?.(1);
  };

  const t = T_ID;
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
        {/* background layer */}
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
          {/* ===== Header Card ===== */}
          <div style={styles.cardOuter}>
            <div style={styles.cardHeaderBar} />
            <div style={styles.cardInner}>
              <div style={styles.cardTitle}>{t.title}</div>
              <div style={styles.totalBadgeWrap}>
                <div style={styles.totalBadgeLabel}>{t.totalLabel}</div>
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
                <div style={styles.sectionTitle}>{t.listTitle}</div>
                <Button
                  type="primary"
                  icon={<PlusCircleOutlined />}
                  onClick={() => setCreateOpen(true)}
                >
                  {t.addNew}
                </Button>
              </div>

              {/* Filters */}
              <div style={styles.filtersRow}>
                <Input
                  allowClear
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onPressEnter={triggerSearch}
                  placeholder={t.searchPh}
                  prefix={<SearchOutlined />}
                  style={styles.searchInput}
                />

                <Select
                  value={vm.status || "all"}
                  onChange={onChangeStatus}
                  options={[
                    { value: "all", label: "Semua" },
                    { value: "published", label: "Publish" },
                    { value: "draft", label: "Draft" },
                    { value: "deleted", label: "Terhapus" },
                  ]}
                  style={styles.filterSelect}
                  suffixIcon={<FilterOutlined />}
                />

                {/* Kategori dari /api/blog-categories → filter by ID */}
                <Select
                  allowClear
                  placeholder="Kategori"
                  value={vm.categoryId || undefined}
                  onChange={onChangeCategory}
                  options={vm.blogCategoryFilterOptions || []}
                  style={styles.filterSelect}
                />
              </div>

              {/* Table header */}
              <div style={styles.tableHeader}>
                <div style={{ ...styles.thLeft, paddingLeft: 8 }}>{t.name}</div>
                <div style={styles.thCenter}>{t.category}</div>
                <div style={styles.thCenter}>{t.views}</div>
                <div style={styles.thCenter}>{t.likes}</div>
                <div style={styles.thCenter}>{t.action}</div>
              </div>

              {/* Rows */}
              <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
                {vm.loading ? (
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
                        <div style={styles.blogTitleWrap}>
                          <div style={styles.blogTitle} title={r.title}>
                            {r.title}
                          </div>
                          <div style={styles.blogSubDate}>
                            {fmtDateId(r.created_ts || r.created_at)}
                          </div>
                        </div>
                      </div>
                      <div style={styles.colCenter}>
                        {r.category_name || "-"}
                      </div>
                      <div style={styles.colCenter}>{abbr(r.views_count)}</div>
                      <div style={styles.colCenter}>{abbr(r.likes_count)}</div>
                      <div style={styles.colActionsCenter}>
                        <Tooltip title={t.view}>
                          <Button
                            size="small"
                            icon={<EyeOutlined />}
                            onClick={() => openView(r)}
                            style={styles.iconBtn}
                          />
                        </Tooltip>
                        <Tooltip title={t.del}>
                          <Popconfirm
                            title="Hapus berita ini?"
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
                        <Tooltip title={t.edit}>
                          <Button
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => openEdit(r)}
                            style={styles.iconBtn}
                          />
                        </Tooltip>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Pagination */}
              <div style={styles.pagination}>
                <Button
                  icon={<LeftOutlined />}
                  onClick={goPrev}
                  disabled={vm.page <= 1 || vm.loading}
                />
                <div style={styles.pageText}>
                  Page {vm.page}
                  {vm.totalPages ? ` of ${vm.totalPages}` : ""}
                </div>
                <Button
                  icon={<RightOutlined />}
                  onClick={goNext}
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

      {/* ===== Modals ===== */}
      <Modal
        open={createOpen}
        onCancel={() => {
          setCreateOpen(false);
          setCoverPrevCreate("");
          formCreate.resetFields();
        }}
        footer={null}
        width={760}
        destroyOnClose
        title={null}
      >
        <div style={styles.modalShell}>
          <Form layout="vertical" form={formCreate}>
            <div style={styles.coverWrap}>
              <Form.Item
                name="cover"
                valuePropName="fileList"
                getValueFromEvent={(e) =>
                  Array.isArray(e) ? e : e?.fileList || []
                }
                noStyle
                rules={[{ required: true, message: "Sampul wajib diisi" }]}
              >
                <Upload
                  accept="image/*"
                  listType="picture-card"
                  showUploadList={false}
                  beforeUpload={beforeCoverCreate}
                >
                  <div style={styles.coverBox}>
                    {coverPrevCreate ? (
                      <img
                        src={coverPrevCreate}
                        alt="cover"
                        style={styles.coverImg}
                      />
                    ) : (
                      <div style={styles.coverPlaceholder}>+ {T_ID.cover}</div>
                    )}
                  </div>
                </Upload>
              </Form.Item>
            </div>
            <Form.Item
              label={T_ID.blogTitle}
              name="title"
              rules={[{ required: true, message: "Judul wajib diisi" }]}
            >
              <Input placeholder="Contoh: Beasiswa Kanada" />
            </Form.Item>
            {/* NEW: kategori pakai Select (value = slug) */}
            <Form.Item label={T_ID.blogCategory} name="category">
              <Select
                allowClear
                showSearch
                placeholder="Pilih kategori"
                options={vm.blogCategoryFormOptions || []}
                optionFilterProp="label"
              />
            </Form.Item>
            <Form.Item label={T_ID.blogDesc} name="description">
              <Input.TextArea rows={4} placeholder="Deskripsi singkat..." />
            </Form.Item>
            <div style={styles.modalFooter}>
              <Button
                type="primary"
                size="large"
                onClick={onCreate}
                loading={vm.opLoading}
                style={styles.saveBtn}
              >
                {T_ID.save}
              </Button>
            </div>
          </Form>
        </div>
      </Modal>

      <Modal
        open={editOpen}
        onCancel={() => {
          setEditOpen(false);
          setCoverPrevEdit("");
          formEdit.resetFields();
        }}
        footer={null}
        width={820}
        destroyOnClose
        title={null}
      >
        <div style={styles.modalShell}>
          <Spin spinning={detailLoading}>
            <Form layout="vertical" form={formEdit}>
              <div style={styles.coverWrap}>
                <Form.Item
                  name="cover"
                  valuePropName="fileList"
                  getValueFromEvent={(e) =>
                    Array.isArray(e) ? e : e?.fileList || []
                  }
                  noStyle
                >
                  <Upload
                    accept="image/*"
                    listType="picture-card"
                    showUploadList={false}
                    beforeUpload={beforeCoverEdit}
                  >
                    <div style={styles.coverBox}>
                      {coverPrevEdit ? (
                        <img
                          src={coverPrevEdit}
                          alt="cover"
                          style={styles.coverImg}
                        />
                      ) : (
                        <div style={styles.coverPlaceholder}>
                          + {T_ID.cover}
                        </div>
                      )}
                    </div>
                  </Upload>
                </Form.Item>
              </div>
              <Form.Item
                label={T_ID.blogTitle}
                name="title"
                rules={[{ required: true, message: "Judul wajib diisi" }]}
              >
                <Input placeholder="Judul berita" />
              </Form.Item>
              {/* NEW: kategori pakai Select (value = slug) */}
              <Form.Item label={T_ID.blogCategory} name="category">
                <Select
                  allowClear
                  showSearch
                  placeholder="Pilih kategori"
                  options={vm.blogCategoryFormOptions || []}
                  optionFilterProp="label"
                />
              </Form.Item>
              <Form.Item label={T_ID.blogDesc} name="description">
                <Input.TextArea rows={4} placeholder="Deskripsi (opsional)" />
              </Form.Item>
              <div style={styles.modalFooter}>
                <Button
                  type="primary"
                  size="large"
                  onClick={onEditSubmit}
                  loading={vm.opLoading}
                  style={styles.saveBtn}
                >
                  Simpan Perubahan
                </Button>
              </div>
            </Form>
          </Spin>
        </div>
      </Modal>

      <Modal
        open={viewOpen}
        onCancel={() => {
          setViewOpen(false);
          setDetailData(null);
        }}
        footer={null}
        width={820}
        destroyOnClose
        title={null}
      >
        <div style={styles.modalShell}>
          <Spin spinning={detailLoading}>
            <div style={styles.coverBoxRead}>
              <img
                src={
                  detailData?.image_url ||
                  detailData?.image_public_url ||
                  activeRow?.image_src ||
                  ""
                }
                alt="cover"
                style={styles.coverImgRead}
              />
            </div>
            <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
              <div>
                <div style={styles.label}>{T_ID.blogTitle}</div>
                <div style={styles.value}>
                  {detailData?.name ||
                    detailData?.title ||
                    activeRow?.title ||
                    "-"}
                </div>
              </div>
              <div>
                <div style={styles.label}>{T_ID.blogCategory}</div>
                <div style={styles.value}>
                  {detailData?.category_name ||
                    detailData?.category_slug ||
                    activeRow?.category_name ||
                    "-"}
                </div>
              </div>
              <div>
                <div style={styles.label}>Tanggal</div>
                <div style={styles.value}>
                  {fmtDateId(
                    detailData?.created_ts ||
                      detailData?.created_at ||
                      activeRow?.created_ts ||
                      activeRow?.created_at
                  )}
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
                  <div style={styles.label}>{T_ID.views}</div>
                  <div style={styles.value}>
                    {abbr(detailData?.views_count ?? activeRow?.views_count)}
                  </div>
                </div>
                <div>
                  <div style={styles.label}>{T_ID.likes}</div>
                  <div style={styles.value}>
                    {abbr(detailData?.likes_count ?? activeRow?.likes_count)}
                  </div>
                </div>
              </div>
              <div>
                <div style={styles.label}>{T_ID.blogDesc}</div>
                <div style={styles.value}>
                  {detailData?.description || detailData?.description_id || "-"}
                </div>
              </div>
            </div>
          </Spin>
        </div>
      </Modal>
    </ConfigProvider>
  );
}

/* ===== compact styles ===== */
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
    gridTemplateColumns: "1fr 180px 180px", // sebelumnya ada 4 kolom
    gap: 8,
    marginBottom: 10,
    alignItems: "center",
  },

  searchInput: { height: 36, borderRadius: 10 },
  filterSelect: { width: "100%" },

  tableHeader: {
    display: "grid",
    gridTemplateColumns: "2fr 0.9fr 0.7fr 0.7fr 0.6fr",
    gap: 8,
    marginBottom: 4,
    color: "#0b3e91",
    fontWeight: 700,
    alignItems: "center",
  },
  thLeft: { display: "flex", justifyContent: "flex-start", width: "100%" },
  thCenter: { display: "flex", justifyContent: "center", width: "100%" },

  row: {
    display: "grid",
    gridTemplateColumns: "2fr 0.9fr 0.7fr 0.7fr 0.6fr",
    gap: 8,
    alignItems: "center",
    background: "#f5f8ff",
    borderRadius: 10,
    border: "1px solid #e8eeff",
    padding: "8px 10px",
    boxShadow: "0 6px 12px rgba(11, 86, 201, 0.05)",
  },

  colName: {
    background: "#ffffff",
    borderRadius: 10,
    border: "1px solid #eef3ff",
    padding: "6px 10px",
    boxShadow: "0 3px 8px rgba(0,0,0,0.04) inset",
    display: "flex",
    alignItems: "center",
  },
  blogTitleWrap: { display: "grid", gap: 2 },
  blogTitle: {
    fontWeight: 600,
    color: "#111827",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  blogSubDate: { fontSize: 11.5, color: "#6b7280" },

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
    width: 260,
    height: 156,
    borderRadius: 12,
    border: "2px dashed #c0c8d8",
    background: "#f8fbff",
    display: "grid",
    placeItems: "center",
    overflow: "hidden",
  },
  coverImg: { width: "100%", height: "100%", objectFit: "cover" },

  coverBoxRead: {
    width: "100%",
    borderRadius: 12,
    border: "1px solid #e6eeff",
    overflow: "hidden",
    background: "#f8fbff",
  },
  coverImgRead: { width: "100%", height: "auto", display: "block" },

  coverPlaceholder: { fontWeight: 700, color: "#0b56c9", userSelect: "none" },

  modalFooter: { marginTop: 8, display: "grid", placeItems: "center" },
  saveBtn: { minWidth: 200, height: 40, borderRadius: 12 },
};
