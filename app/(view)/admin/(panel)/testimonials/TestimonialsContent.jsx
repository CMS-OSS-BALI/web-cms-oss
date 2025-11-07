// app/(view)/admin/testimonials/TestimonialsContent.jsx
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
  Tag,
  Rate,
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
  YoutubeOutlined,
} from "@ant-design/icons";
import useTestimonialsViewModel from "./useTestimonialsViewModel";

/* ================= TOKENS ================= */
const TOKENS = {
  shellW: "94%",
  maxW: 1140,
  blue: "#0b56c9",
  text: "#0f172a",
};

/* ================= COPY ================= */
const T = {
  title: "Data Testimoni",
  listTitle: "Daftar Testimoni",
  totalLabel: "Total Testimoni",
  addNew: "Buat Data Baru",
  searchPh: "Cari nama/pesan",
  nameCol: "Nama",
  msgCol: "Pesan",
  ratingCol: "Rating",
  catCol: "Kategori",
  ytCol: "YouTube",
  campusCol: "Kampus/Negara",
  action: "Aksi",
  view: "Lihat",
  edit: "Edit",
  del: "Hapus",
  save: "Simpan",

  image: "Foto (9:16)",
  nameId: "Nama",
  msgId: "Pesan",
  star: "Rating (1-5)",
  category: "Kategori",
  youtube: "YouTube (opsional)",
  campus: "Kampus/Negara (opsional)",

  filterCat: "Filter kategori",
  filterRating: "Filter rating",
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
const stripTags = (s) => (s ? String(s).replace(/<[^>]*>/g, "") : "");

// Grid kolom (header & row HARUS sama persis)
const GRID_COLS = "1.6fr 2.4fr 0.9fr 1fr 0.8fr 1.1fr 0.9fr";
//  Nama | Pesan | Rating | Kategori | YouTube | Kampus | Aksi

// helper cache-buster
const bust = (url, ver) => {
  if (!url) return "";
  const v = ver ? new Date(ver).getTime?.() || ver : Date.now();
  return url.includes("?") ? `${url}&v=${v}` : `${url}?v=${v}`;
};

export default function TestimonialsContent({ locale = "id" }) {
  const vm = useTestimonialsViewModel({ locale });

  // notifications
  const [notify, contextHolder] = notification.useNotification();
  const ok = (message, description) =>
    notify.success({ message, description, placement: "topRight" });
  const err = (message, description) =>
    notify.error({ message, description, placement: "topRight" });

  // UI state
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

  const rows = useMemo(() => vm.testimonials || [], [vm.testimonials]);

  // Search (debounced)
  const [searchValue, setSearchValue] = useState(vm.q || "");
  useEffect(() => setSearchValue(vm.q || ""), [vm.q]);
  useEffect(() => {
    const v = (searchValue || "").trim();
    const t = setTimeout(() => {
      vm.setQ?.(v);
      vm.setPage?.(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchValue]); // eslint-disable-line

  // category live search (debounced)
  const [catSearchQ, setCatSearchQ] = useState("");
  useEffect(() => {
    vm.searchCategories?.("");
  }, []); // eslint-disable-line
  useEffect(() => {
    const t = setTimeout(() => vm.searchCategories?.(catSearchQ || ""), 300);
    return () => clearTimeout(t);
  }, [catSearchQ, vm]);

  // Upload helpers (preview saja; crop dilakukan saat submit di VM)
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

    const out = await vm.createTestimonial?.({
      file,
      name: v.name_id,
      message: v.message_id || "",
      star: v.star ?? null,
      category_id: v.category_id || null,
      youtube_url: v.youtube_url || null,
      kampus_negara_tujuan: v.kampus || null,
    });

    if (!out?.ok)
      return err("Gagal membuat testimoni", out?.error || "Gagal menyimpan");

    // refresh agar data + URL public sinkron
    await vm.refresh?.();
    ok("Berhasil", "Testimoni berhasil dibuat");
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
    const {
      ok: okLoad,
      data,
      error,
    } = (await vm.getTestimonial?.(row.id)) || {};
    setDetailLoading(false);
    if (!okLoad) {
      setEditOpen(false);
      return err("Gagal memuat data", error || "Terjadi kesalahan saat memuat");
    }
    const d = data || row;
    setDetailData(d);
    formEdit.setFieldsValue({
      name_id: d.name || "",
      message_id: d.message || "",
      star: d.star ?? null,
      category_id: d.category?.id || undefined,
      youtube_url: d.youtube_url || "",
      kampus: d.kampus_negara_tujuan || "",
    });
    setImgPrevEdit(
      d.image_public_url || d.photo_public_url || d.photo_url || ""
    );
    vm.searchCategories?.("");
  };

  /* ================= EDIT (submit) ================= */
  const onEditSubmit = async () => {
    if (!activeRow) return;
    const v = await formEdit.validateFields().catch(() => null);
    if (!v) return;
    const file = v.image?.[0]?.originFileObj || null;

    const res = await vm.updateTestimonial?.(activeRow.id, {
      file,
      name: v.name_id,
      message: v.message_id || "",
      star: v.star ?? null,
      category_id: v.category_id || null,
      youtube_url: v.youtube_url || null,
      kampus_negara_tujuan: v.kampus || null,
    });

    if (!res?.ok)
      return err("Gagal memperbarui", res?.error || "Gagal menyimpan");

    // refresh agar URL gambar baru terbaca & bust cache
    await vm.refresh?.();

    ok("Berhasil", "Perubahan berhasil disimpan");
    setEditOpen(false);
    formEdit.resetFields();
    setImgPrevEdit("");
  };

  const onDelete = async (id) => {
    const res = await vm.deleteTestimonial?.(id);
    if (!res?.ok) err("Gagal menghapus", res?.error || "Tidak bisa menghapus");
    else {
      await vm.refresh?.();
      ok("Berhasil", "Testimoni telah dihapus");
    }
  };

  const ratingValue = vm.rating ?? vm.starFilter ?? "";
  const setRating = (v) => {
    if (vm.setRating) vm.setRating(v || "");
    else vm.setStarFilter?.(v ? String(v) : "");
    vm.setPage?.(1);
  };

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
            '"Public Sans", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
          borderRadius: 12,
          fontSize: 13,
          controlHeight: 36,
        },
        components: { Button: { borderRadius: 10 } },
      }}
    >
      {contextHolder}

      {/* Global styles */}
      <style jsx global>{`
        /* Uploader 9:16 */
        .rect916-uploader.ant-upload.ant-upload-select-picture-card {
          width: 180px !important;
          height: 320px !important; /* 9:16 */
          padding: 0 !important;
        }
        .rect916-uploader .ant-upload {
          width: 100% !important;
          height: 100% !important;
        }
        /* Pesan clamp halus */
        .t-msg {
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 3;
          overflow: hidden;
          white-space: normal;
          line-height: 1.45;
          word-break: break-word;
          overflow-wrap: anywhere;
        }
        @media (max-width: 1200px) {
          .t-msg {
            -webkit-line-clamp: 2;
          }
        }
        /* BAR: search + kategori + rating sebaris */
        .filtersRow {
          display: grid;
          grid-template-columns: 1fr 220px 160px;
          gap: 8px;
          margin-bottom: 10px;
          align-items: center;
        }
        @media (max-width: 1050px) {
          .filtersRow {
            grid-template-columns: 1fr;
          }
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
                  {vm.total ?? rows.length ?? "â€”"}
                </div>
              </div>
            </div>
          </div>

          {/* ===== Data Card ===== */}
          <div style={{ ...styles.cardOuter, marginTop: 12 }}>
            <div style={{ ...styles.cardInner, paddingTop: 14 }}>
              {/* Header: title + add new */}
              <div style={styles.sectionHeader}>
                <div style={styles.sectionTitle}>{T.listTitle}</div>
                <Button
                  type="primary"
                  icon={<PlusCircleOutlined />}
                  onClick={() => {
                    setCreateOpen(true);
                    vm.searchCategories?.("");
                  }}
                >
                  {T.addNew}
                </Button>
              </div>

              {/* BAR: Search + Kategori + Rating */}
              <div className="filtersRow">
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
                  placeholder={T.filterCat}
                  value={vm.categoryId || undefined}
                  onChange={(v) => {
                    vm.setCategoryId?.(v || "");
                    vm.setPage?.(1);
                  }}
                  onSearch={setCatSearchQ}
                  showSearch
                  filterOption={false}
                  options={vm.categoryOptions}
                />
                <Select
                  allowClear
                  placeholder={T.filterRating}
                  value={ratingValue || undefined}
                  onChange={setRating}
                  options={[
                    { value: 5, label: "â˜…â˜…â˜…â˜…â˜…" },
                    { value: 4, label: "â˜…â˜…â˜…â˜…â˜†" },
                    { value: 3, label: "â˜…â˜…â˜…â˜†â˜†" },
                    { value: 2, label: "â˜…â˜…â˜†â˜†â˜†" },
                    { value: 1, label: "â˜…â˜†â˜†â˜†â˜†" },
                  ]}
                />
              </div>

              {/* Tabel */}
              <div style={{ overflowX: "auto" }}>
                <div style={styles.tableHeader}>
                  <div style={{ ...styles.thLeft, paddingLeft: 8 }}>
                    {T.nameCol}
                  </div>
                  <div style={styles.thCenter}>{T.msgCol}</div>
                  <div style={styles.thCenter}>{T.ratingCol}</div>
                  <div style={styles.thCenter}>{T.catCol}</div>
                  <div style={styles.thCenter}>{T.ytCol}</div>
                  <div style={styles.thCenter}>{T.campusCol}</div>
                  <div style={styles.thCenter}>{T.action}</div>
                </div>

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
                    rows.map((r) => {
                      const name = r.name || "(tanpa nama)";
                      const yt = r.youtube_url;
                      const campus = r.kampus_negara_tujuan || "â€”";
                      const baseImg =
                        r.image_public_url || r.photo_public_url || r.photo_url;
                      const image = bust(baseImg, r.updated_at || r._v);

                      return (
                        <div key={r.id} style={styles.row}>
                          {/* Nama */}
                          <div style={styles.colName}>
                            <div style={styles.thumbBox}>
                              {image ? (
                                <img
                                  src={image}
                                  alt=""
                                  style={styles.thumbImg}
                                />
                              ) : (
                                <div style={styles.thumbFallback}>ðŸ™‚</div>
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

                          {/* Pesan */}
                          <Tooltip
                            title={stripTags(r.message)}
                            placement="topLeft"
                          >
                            <div style={styles.colMsg}>
                              <div className="t-msg">
                                {stripTags(r.message) || "â€”"}
                              </div>
                            </div>
                          </Tooltip>

                          {/* Rating */}
                          <div style={styles.colCenter}>
                            <div style={styles.rateBox}>
                              {r.star != null ? (
                                <Rate disabled value={Number(r.star)} />
                              ) : (
                                "â€”"
                              )}
                            </div>
                          </div>

                          {/* Kategori */}
                          <div style={styles.colCenter}>
                            {r.category?.name || "â€”"}
                          </div>

                          {/* YouTube */}
                          <div style={styles.colCenter}>
                            {yt ? (
                              <a
                                href={yt}
                                target="_blank"
                                rel="noreferrer"
                                title={yt}
                                style={{ textDecoration: "none" }}
                              >
                                <Tag style={styles.ytTag}>
                                  <YoutubeOutlined /> &nbsp;Link
                                </Tag>
                              </a>
                            ) : (
                              <Tag style={styles.ytTagMuted}>â€”</Tag>
                            )}
                          </div>

                          {/* Kampus/Negara */}
                          <div style={styles.colCenter}>
                            <span
                              style={{
                                display: "inline-block",
                                maxWidth: "100%",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                verticalAlign: "bottom",
                              }}
                              title={campus}
                            >
                              {campus}
                            </span>
                          </div>

                          {/* Actions */}
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
                                  vm.getTestimonial?.(r.id).then(
                                    ({ ok: okView, data, error }) => {
                                      setDetailLoading(false);
                                      if (!okView) {
                                        setViewOpen(false);
                                        return err(
                                          "Gagal memuat detail",
                                          error || "Terjadi kesalahan"
                                        );
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
                                title="Hapus testimoni ini?"
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
                  onClick={() => vm.setPage?.(Math.max(1, vm.page - 1))}
                  disabled={vm.page <= 1 || vm.loading}
                />
                <div style={styles.pageText}>
                  Page {vm.page}
                  {vm.totalPages ? ` of ${vm.totalPages}` : ""}
                </div>
                <Button
                  icon={<RightOutlined />}
                  onClick={() => vm.setPage?.(vm.page + 1)}
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
                getValueFromEvent={(e) =>
                  Array.isArray(e) ? e : e?.fileList || []
                }
                noStyle
              >
                <Upload
                  accept="image/*"
                  listType="picture-card"
                  showUploadList={false}
                  beforeUpload={beforeImgCreate}
                  className="rect916-uploader"
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
              rules={req("Nama wajib diisi")}
            >
              <Input placeholder="Contoh: Nadya Kirana" />
            </Form.Item>

            <Form.Item
              label={T.msgId}
              name="message_id"
              rules={req("Pesan wajib diisi")}
            >
              <Input.TextArea rows={4} placeholder="Tulis testimoni..." />
            </Form.Item>

            <div style={styles.grid2}>
              <Form.Item label={T.star} name="star">
                <Rate allowClear allowHalf={false} />
              </Form.Item>
              <Form.Item label={T.category} name="category_id">
                <Select
                  allowClear
                  showSearch
                  placeholder="Pilih kategori"
                  onSearch={setCatSearchQ}
                  filterOption={false}
                  options={vm.categoryOptions}
                />
              </Form.Item>
            </div>

            <div style={styles.grid2}>
              <Form.Item label={T.youtube} name="youtube_url">
                <Input placeholder="https://youtube.com/..." />
              </Form.Item>
              <Form.Item label={T.campus} name="kampus">
                <Input placeholder="cth: Monash University, Australia" />
              </Form.Item>
            </div>

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
                  getValueFromEvent={(e) =>
                    Array.isArray(e) ? e : e?.fileList || []
                  }
                  noStyle
                >
                  <Upload
                    accept="image/*"
                    listType="picture-card"
                    showUploadList={false}
                    beforeUpload={beforeImgEdit}
                    className="rect916-uploader"
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
                <Input placeholder="Nama" />
              </Form.Item>
              <Form.Item label={T.msgId} name="message_id">
                <Input.TextArea rows={4} placeholder="Pesan" />
              </Form.Item>

              <div style={styles.grid2}>
                <Form.Item label={T.star} name="star">
                  <Rate allowHalf={false} />
                </Form.Item>
                <Form.Item label={T.category} name="category_id">
                  <Select
                    allowClear
                    showSearch
                    placeholder="Pilih kategori"
                    onSearch={setCatSearchQ}
                    filterOption={false}
                    options={vm.categoryOptions}
                  />
                </Form.Item>
              </div>

              <div style={styles.grid2}>
                <Form.Item label={T.youtube} name="youtube_url">
                  <Input placeholder="https://youtube.com/..." />
                </Form.Item>
                <Form.Item label={T.campus} name="kampus">
                  <Input placeholder="cth: Monash University, Australia" />
                </Form.Item>
              </div>

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
        width={780}
        destroyOnClose
        title={null}
      >
        <div style={styles.modalShell}>
          <Spin spinning={detailLoading}>
            <div style={styles.viewGrid}>
              <div style={{ gridColumn: "1 / span 2" }}>
                <div style={styles.coverBoxRead}>
                  {detailData?.image_public_url ||
                  detailData?.photo_public_url ||
                  detailData?.photo_url ? (
                    <img
                      src={bust(
                        detailData.image_public_url ||
                          detailData.photo_public_url ||
                          detailData.photo_url,
                        detailData.updated_at
                      )}
                      alt="cover"
                      style={styles.coverImgRead}
                    />
                  ) : (
                    <div style={{ padding: 24, textAlign: "center" }}>
                      Tidak ada foto
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div style={styles.label}>{T.nameId}</div>
                <div style={styles.value}>
                  {detailData?.name || activeRow?.name || "-"}
                </div>
              </div>

              <div>
                <div style={styles.label}>{T.msgId}</div>
                <div style={{ ...styles.value, whiteSpace: "pre-wrap" }}>
                  {stripTags(detailData?.message) || "â€”"}
                </div>
              </div>

              <div>
                <div style={styles.label}>{T.star}</div>
                <div style={styles.value}>
                  <div style={styles.rateBox}>
                    {detailData?.star != null ? (
                      <Rate disabled value={Number(detailData?.star)} />
                    ) : (
                      "â€”"
                    )}
                  </div>
                </div>
              </div>

              <div>
                <div style={styles.label}>{T.category}</div>
                <div style={styles.value}>
                  {detailData?.category?.name || "â€”"}
                </div>
              </div>

              <div>
                <div style={styles.label}>{T.youtube}</div>
                <div style={styles.value}>
                  {detailData?.youtube_url ? "Ada" : "â€”"}
                </div>
              </div>

              <div>
                <div style={styles.label}>{T.campus}</div>
                <div style={styles.value}>
                  {detailData?.kampus_negara_tujuan || "â€”"}
                </div>
              </div>
            </div>
          </Spin>
        </div>
      </Modal>
    </ConfigProvider>
  );
}

/* ================= STYLES ================= */
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

  searchInput: { height: 36, borderRadius: 10 },

  tableHeader: {
    display: "grid",
    gridTemplateColumns: GRID_COLS,
    gap: 8,
    marginBottom: 4,
    color: "#0b3e91",
    fontWeight: 700,
    alignItems: "center",
    minWidth: 1080,
  },

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
    minWidth: 1080,
  },

  thLeft: { display: "flex", justifyContent: "flex-start", width: "100%" },
  thCenter: { display: "flex", justifyContent: "center", width: "100%" },

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
  thumbBox: {
    width: 48,
    height: 48,
    borderRadius: 8,
    background: "#fff",
    border: "1px solid #e5edff",
    display: "grid",
    placeItems: "center",
    overflow: "hidden",
    boxShadow: "0 2px 6px rgba(0,0,0,.04) inset",
    flex: "0 0 48px",
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

  colMsg: {
    background: "#ffffff",
    borderRadius: 10,
    border: "1px solid #eef3ff",
    padding: "8px 12px",
    color: "#0f172a",
    minWidth: 0,
  },

  colCenter: {
    textAlign: "center",
    color: "#0f172a",
    fontWeight: 600,
    minWidth: 0,
  },

  colActionsCenter: {
    display: "flex",
    justifyContent: "center",
    gap: 6,
    flexWrap: "nowrap",
    minWidth: 0,
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

  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },

  rateBox: { display: "inline-block", width: 112, textAlign: "center" },

  ytTag: {
    borderRadius: 12,
    padding: "2px 8px",
    fontSize: 12,
    lineHeight: "18px",
    whiteSpace: "nowrap",
  },
  ytTagMuted: {
    borderRadius: 12,
    padding: "2px 8px",
    fontSize: 12,
    lineHeight: "18px",
    background: "#f1f5f9",
    borderColor: "#e2e8f0",
    color: "#64748b",
    whiteSpace: "nowrap",
  },

  viewGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
};

