// ConsultantsContent.jsx
"use client";

import { useMemo, useState } from "react";
import {
  ConfigProvider,
  Button,
  Modal,
  Form,
  Input,
  Upload,
  notification,
  Empty,
  Skeleton,
  Popconfirm,
  Tooltip,
  Spin,
  Tag,
} from "antd";
import {
  PlusOutlined,
  PlusCircleOutlined,
  EyeOutlined,
  DeleteOutlined,
  EditOutlined,
  LeftOutlined,
  RightOutlined,
} from "@ant-design/icons";

export default function ConsultantsContent({ vm }) {
  const { t, tokens } = vm;
  const { shellW, blue, text } = tokens;
  const maxW = tokens.maxW ?? 1140;

  const [notify, contextHolder] = notification.useNotification();
  const ok = (msg, desc) =>
    notify.success({ message: msg, description: desc, placement: "topRight" });
  const err = (msg, desc) =>
    notify.error({ message: msg, description: desc, placement: "topRight" });

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [activeRow, setActiveRow] = useState(null);

  const [formCreate] = Form.useForm();
  const [formEdit] = Form.useForm();

  const [avatarPreviewCreate, setAvatarPreviewCreate] = useState("");
  const [avatarPreviewEdit, setAvatarPreviewEdit] = useState("");

  const [editProgramImages, setEditProgramImages] = useState([]);
  const [editLoading, setEditLoading] = useState(false);

  const [viewLoading, setViewLoading] = useState(false);
  const [viewData, setViewData] = useState(null);
  const [viewAvatar, setViewAvatar] = useState("");
  const [viewProgramImages, setViewProgramImages] = useState([]);

  const rows = useMemo(
    () =>
      (vm.consultants || []).map((c) => ({
        id: c.id,
        name: c.name || "-",
        email: c.email || "-",
        phone: c.whatsapp || c.phone || c.no_whatsapp || "-",
        description: c.description || "",
        // server sudah kirim profile_image_url (public URL)
        avatarUrl: c.profile_image_url || "",
      })),
    [vm.consultants]
  );

  const normList = (e) => (Array.isArray(e) ? e : e?.fileList || []);
  const isImg = (f) =>
    ["image/jpeg", "image/png", "image/webp"].includes(f?.type || "");
  const tooBig = (f, mb = 2) => f.size / 1024 / 1024 >= mb;

  const beforeImg = (file, maxMB = 2) => {
    if (!isImg(file)) {
      err("File tidak didukung", "Harus JPG/PNG/WebP");
      return Upload.LIST_IGNORE;
    }
    if (tooBig(file, maxMB)) {
      err("Ukuran gambar terlalu besar", `Maksimal ${maxMB}MB`);
      return Upload.LIST_IGNORE;
    }
    return false;
  };

  const beforeAvatarCreate = (file) => {
    const blocked = beforeImg(file, 2);
    if (blocked === Upload.LIST_IGNORE) return blocked;
    try {
      setAvatarPreviewCreate(URL.createObjectURL(file));
    } catch {}
    return false;
  };
  const beforeAvatarEdit = (file) => {
    const blocked = beforeImg(file, 2);
    if (blocked === Upload.LIST_IGNORE) return blocked;
    try {
      setAvatarPreviewEdit(URL.createObjectURL(file));
    } catch {}
    return false;
  };

  const onCreate = async () => {
    const v = await formCreate.validateFields().catch(() => null);
    if (!v) return;

    const avatar = v.avatar?.[0]?.originFileObj || null;
    const programFiles = (v.program_files || [])
      .map((it) => it.originFileObj)
      .filter(Boolean);

    const res = await vm.createConsultant({
      name: v.name,
      email: v.email || null,
      no_whatsapp: v.no_whatsapp,
      description: v.description || "",
      profile_file: avatar,
      program_files: programFiles,
      // autoTranslate handled in view model (true for create)
    });

    if (res.ok) {
      ok("Berhasil", "Konsultan berhasil dibuat.");
      setCreateOpen(false);
      setAvatarPreviewCreate("");
      formCreate.resetFields();
    } else {
      err("Gagal membuat data", res.error || "Terjadi kesalahan.");
    }
  };

  const onEditSubmit = async () => {
    if (!activeRow) return;
    const v = await formEdit.validateFields().catch(() => null);
    if (!v) return;

    const avatar = v.avatar?.[0]?.originFileObj || null;
    const programFiles = (v.program_files || [])
      .map((it) => it.originFileObj)
      .filter(Boolean);

    const keptProgramImages = editProgramImages
      .map((pi) => pi.image_url || "")
      .filter(Boolean);

    const res = await vm.updateConsultant(activeRow.id, {
      name: v.name,
      email: v.email || null,
      no_whatsapp: v.no_whatsapp,
      description: v.description || "",
      imagesMode: "replace",
      program_images: keptProgramImages,
      // MATIKAN autoTranslate saat edit agar PATCH cepat
      autoTranslate: false,
      ...(avatar ? { profile_file: avatar } : {}),
      ...(programFiles.length ? { program_files: programFiles } : {}),
    });

    if (res.ok) {
      ok("Berhasil", "Konsultan diperbarui.");
      setEditOpen(false);
      setAvatarPreviewEdit("");
      setEditProgramImages([]);
    } else {
      err("Gagal memperbarui", res.error || "Terjadi kesalahan.");
    }
  };

  const onDelete = async (id) => {
    const res = await vm.deleteConsultant(id);
    if (res.ok) ok("Berhasil", "Konsultan dihapus.");
    else err("Gagal menghapus", res.error || "Terjadi kesalahan.");
  };

  const goPrev = () => vm.setPage(Math.max(1, vm.page - 1));
  const goNext = () => vm.setPage(vm.page + 1);

  const openEdit = async (row) => {
    setActiveRow(row);
    formEdit.setFieldsValue({
      name: row.name || "",
      email: row.email && row.email !== "-" ? row.email : "",
      no_whatsapp: row.phone && row.phone !== "-" ? row.phone : "",
      description: row.description || "",
    });
    setAvatarPreviewEdit(row.avatarUrl || "");
    setEditProgramImages([]);
    setEditOpen(true);

    setEditLoading(true);
    const { ok: okFetch, data, error } = await vm.getConsultant(row.id);
    setEditLoading(false);

    if (!okFetch) {
      err("Gagal memuat detail", error);
      return;
    }
    const d = data || {};
    formEdit.setFieldsValue({
      name: d.name ?? row.name ?? "",
      email: d.email ?? row.email ?? "",
      no_whatsapp: d.whatsapp ?? row.phone ?? "",
      description: d.description ?? row.description ?? "",
    });
    // gunakan profile_image_url (public URL)
    setAvatarPreviewEdit(d.profile_image_url || row.avatarUrl || "");
    setEditProgramImages(d.program_images || []);
  };

  const handleDeleteProgramImage = async (imgObj) => {
    if (!activeRow || !imgObj?.id) return;
    const backup = [...editProgramImages];
    setEditProgramImages((prev) => prev.filter((x) => x.id !== imgObj.id));
    const out = await vm.deleteProgramImage(activeRow.id, imgObj.id);
    if (!out.ok) {
      err("Gagal menghapus foto", out.error);
      setEditProgramImages(backup);
    } else {
      ok("Terhapus", "Foto program dihapus.");
    }
  };

  const openView = async (row) => {
    setActiveRow(row);
    setViewOpen(true);
    setViewLoading(true);
    setViewData(null);
    setViewAvatar(row.avatarUrl || "");
    setViewProgramImages([]);

    const { ok: okFetch, data, error } = await vm.getConsultant(row.id);
    setViewLoading(false);

    if (!okFetch) {
      err("Gagal memuat detail", error);
      setViewOpen(false);
      return;
    }
    setViewData(data);
    setViewAvatar(data.profile_image_url || row.avatarUrl || "");
    setViewProgramImages(data.program_images || []);
  };

  const renderAvatar = (url, name) => {
    if (url) return <img src={url} alt={name} style={styles.avatarSmImg} />;
    const first = (name || "?").trim().charAt(0).toUpperCase();
    return <div style={styles.avatarSmFallback}>{first}</div>;
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: blue,
          colorText: text,
          fontFamily:
            '"Public Sans", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
          borderRadius: 16,
        },
        components: { Button: { borderRadius: 12 } },
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
            paddingTop: 18,
            position: "relative",
            zIndex: 1,
          }}
        >
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

          <div style={{ ...styles.cardOuter, marginTop: 16 }}>
            <div style={{ ...styles.cardInner, paddingTop: 18 }}>
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

              <div style={styles.tableHeader}>
                <div style={styles.thCenter}>{t.name}</div>
                <div style={styles.thCenter}>{t.email}</div>
                <div style={styles.thCenter}>{t.phone}</div>
                <div style={styles.thCenter}>{t.action}</div>
              </div>

              <div style={{ display: "grid", gap: 10, marginTop: 6 }}>
                {vm.loading ? (
                  <div style={{ padding: "10px 4px" }}>
                    <Skeleton active paragraph={{ rows: 2 }} />
                  </div>
                ) : rows.length === 0 ? (
                  <div
                    style={{
                      display: "grid",
                      placeItems: "center",
                      padding: "24px 0",
                    }}
                  >
                    <Empty description="Belum ada data" />
                  </div>
                ) : (
                  rows.map((r) => (
                    <div key={r.id} style={styles.row}>
                      <div style={styles.colName}>
                        <div style={styles.nameCell}>
                          {renderAvatar(r.avatarUrl, r.name)}
                          <div style={styles.nameText} title={r.name}>
                            {r.name}
                          </div>
                        </div>
                      </div>

                      <div style={styles.colCenter}>{r.email || "-"}</div>
                      <div style={styles.colCenter}>{r.phone || "-"}</div>

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
                            title="Hapus konsultan ini?"
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
                  disabled={vm.loading}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Create */}
      <Modal
        open={createOpen}
        onCancel={() => {
          setCreateOpen(false);
          setAvatarPreviewCreate("");
          formCreate.resetFields();
        }}
        footer={null}
        width={840}
        destroyOnClose
        title={null}
      >
        <div style={styles.modalShell}>
          <Form layout="vertical" form={formCreate}>
            <div style={styles.avatarWrap}>
              <Form.Item
                name="avatar"
                valuePropName="fileList"
                getValueFromEvent={normList}
                noStyle
              >
                <Upload
                  accept="image/*"
                  showUploadList={false}
                  beforeUpload={beforeAvatarCreate}
                >
                  <div style={styles.avatarCircle}>
                    {avatarPreviewCreate ? (
                      <img
                        src={avatarPreviewCreate}
                        alt="avatar"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          borderRadius: "inherit",
                        }}
                      />
                    ) : (
                      <span style={styles.avatarPlus}>+</span>
                    )}
                  </div>
                </Upload>
              </Form.Item>
              <div style={styles.avatarHint}>Add Foto</div>
            </div>

            <Form.Item
              label={t.name}
              name="name"
              rules={[{ required: true, message: "Nama wajib diisi" }]}
            >
              <Input placeholder="Nama konsultan" />
            </Form.Item>

            <Form.Item
              label={t.email}
              name="email"
              rules={[{ type: "email", message: "Format email tidak valid" }]}
            >
              <Input placeholder="email@domain.com" />
            </Form.Item>

            <Form.Item
              label={t.phone}
              name="no_whatsapp"
              rules={[
                { required: true, message: "Nomor WA wajib diisi" },
                {
                  pattern: /^[0-9+()\s-]{6,32}$/,
                  message: "Format nomor tidak valid",
                },
              ]}
            >
              <Input placeholder="+62xxxx / 08xxxx" maxLength={32} />
            </Form.Item>

            <Form.Item label={t.desc} name="description">
              <Input.TextArea
                rows={3}
                placeholder="Tuliskan deskripsi singkat..."
              />
            </Form.Item>

            <div style={styles.blockLabel}>{t.programBlock}</div>
            <Form.Item
              name="program_files"
              valuePropName="fileList"
              getValueFromEvent={normList}
              rules={[{ required: true, message: "Minimal 1 foto program" }]}
            >
              <Upload
                accept="image/*"
                listType="picture-card"
                multiple
                beforeUpload={(f) => beforeImg(f, 2)}
              >
                <div style={styles.addBoxInner}>
                  <PlusOutlined />
                </div>
              </Upload>
            </Form.Item>

            <div style={styles.modalFooter}>
              <Button
                type="primary"
                size="large"
                onClick={onCreate}
                loading={vm.opLoading}
                style={styles.saveBtn}
              >
                {t.save}
              </Button>
            </div>
          </Form>
        </div>
      </Modal>

      {/* Edit */}
      <Modal
        open={editOpen}
        onCancel={() => {
          setEditOpen(false);
          setAvatarPreviewEdit("");
          setEditProgramImages([]);
          formEdit.resetFields();
        }}
        footer={null}
        width={900}
        destroyOnClose
        title={null}
      >
        <div style={styles.modalShell}>
          <Spin spinning={editLoading}>
            <Form layout="vertical" form={formEdit}>
              <div style={styles.avatarWrap}>
                <Form.Item
                  name="avatar"
                  valuePropName="fileList"
                  getValueFromEvent={normList}
                  noStyle
                >
                  <Upload
                    accept="image/*"
                    showUploadList={false}
                    beforeUpload={beforeAvatarEdit}
                  >
                    <div style={styles.avatarCircle}>
                      {avatarPreviewEdit ? (
                        <img
                          src={avatarPreviewEdit}
                          alt="avatar"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            borderRadius: "inherit",
                          }}
                        />
                      ) : (
                        <span style={styles.avatarPlus}>+</span>
                      )}
                    </div>
                  </Upload>
                </Form.Item>
                <div style={styles.avatarHint}>Ganti Foto</div>
              </div>

              <Form.Item
                label={t.name}
                name="name"
                rules={[{ required: true, message: "Nama wajib diisi" }]}
              >
                <Input placeholder="Nama konsultan" />
              </Form.Item>

              <Form.Item
                label={t.email}
                name="email"
                rules={[{ type: "email", message: "Format email tidak valid" }]}
              >
                <Input placeholder="email@domain.com" />
              </Form.Item>

              <Form.Item
                label={t.phone}
                name="no_whatsapp"
                rules={[
                  { required: true, message: "Nomor WA wajib diisi" },
                  {
                    pattern: /^[0-9+()\s-]{6,32}$/,
                    message: "Format nomor tidak valid",
                  },
                ]}
              >
                <Input placeholder="+62xxxx / 08xxxx" maxLength={32} />
              </Form.Item>

              <Form.Item label={t.desc} name="description">
                <Input.TextArea rows={3} placeholder="Deskripsi (opsional)" />
              </Form.Item>

              <div style={styles.blockHeaderRow}>
                <div style={styles.blockLabel}>{t.programBlock}</div>
                <Tag color="blue" style={styles.countTag}>
                  {editProgramImages.length} foto
                </Tag>
              </div>

              {editProgramImages.length ? (
                <div style={styles.galleryGrid}>
                  {editProgramImages.map((pi) => {
                    const src = pi.image_url || "";
                    return (
                      <div key={pi.id} style={styles.thumb}>
                        <img src={src} alt="program" style={styles.thumbImg} />
                        <Popconfirm
                          title="Hapus foto ini?"
                          okText="Hapus"
                          cancelText="Batal"
                          onConfirm={() => handleDeleteProgramImage(pi)}
                        >
                          <button type="button" style={styles.delThumbBtn}>
                            <DeleteOutlined />
                          </button>
                        </Popconfirm>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={styles.noImagesHint}>Belum ada foto program.</div>
              )}

              <Form.Item
                name="program_files"
                valuePropName="fileList"
                getValueFromEvent={normList}
              >
                <Upload
                  accept="image/*"
                  listType="picture-card"
                  multiple
                  beforeUpload={(f) => beforeImg(f, 2)}
                >
                  <div style={styles.addBoxInner}>
                    <PlusOutlined />
                  </div>
                </Upload>
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

      {/* View */}
      <Modal
        open={viewOpen}
        onCancel={() => {
          setViewOpen(false);
          setViewData(null);
          setViewAvatar("");
          setViewProgramImages([]);
        }}
        footer={null}
        width={900}
        destroyOnClose
        title={null}
      >
        <div style={styles.modalShell}>
          <Spin spinning={viewLoading}>
            <div style={styles.avatarWrap}>
              <div style={styles.avatarCircle}>
                {viewAvatar ? (
                  <img
                    src={viewAvatar}
                    alt="avatar"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      borderRadius: "inherit",
                    }}
                  />
                ) : (
                  <span style={styles.avatarPlus}>?</span>
                )}
              </div>
              <div style={styles.avatarHint}>Foto Profil</div>
            </div>

            <div style={{ display: "grid", gap: 10, marginTop: 6 }}>
              <div>
                <div style={styles.label}>{t.name}</div>
                <div style={styles.value}>
                  {viewData?.name || activeRow?.name || "-"}
                </div>
              </div>
              <div>
                <div style={styles.label}>{t.email}</div>
                <div style={styles.value}>
                  {viewData?.email || activeRow?.email || "-"}
                </div>
              </div>
              <div>
                <div style={styles.label}>{t.phone}</div>
                <div style={styles.value}>
                  {viewData?.whatsapp ||
                    activeRow?.phone ||
                    activeRow?.no_whatsapp ||
                    "-"}
                </div>
              </div>
              <div>
                <div style={styles.label}>{t.desc}</div>
                <div style={styles.value}>
                  {viewData?.description || activeRow?.description || "-"}
                </div>
              </div>
            </div>

            <div style={styles.blockHeaderRow}>
              <div style={styles.blockLabel}>{t.programBlock}</div>
              <Tag color="blue" style={styles.countTag}>
                {viewProgramImages.length} foto
              </Tag>
            </div>

            {viewProgramImages.length ? (
              <div style={styles.galleryGrid}>
                {viewProgramImages.map((pi) => {
                  const src = pi.image_url || "";
                  return (
                    <div key={pi.id} style={styles.thumb}>
                      <img src={src} alt="program" style={styles.thumbImg} />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={styles.noImagesHint}>Belum ada foto program.</div>
            )}
          </Spin>
        </div>
      </Modal>
    </ConfigProvider>
  );
}

/* ===== Styles (updated avatar 9:16) ===== */
const styles = {
  cardOuter: {
    background: "#ffffff",
    borderRadius: 20,
    border: "1px solid #e6eeff",
    boxShadow:
      "0 14px 68px rgba(11, 86, 201, 0.08), 0 4px 16px rgba(11,86,201,0.06)",
    overflow: "hidden",
  },
  cardHeaderBar: {
    height: 24,
    background:
      "linear-gradient(90deg, #0b56c9 0%, #0b56c9 65%, rgba(11,86,201,0.35) 100%)",
  },
  cardInner: { padding: "16px 18px 18px", position: "relative" },
  cardTitle: {
    fontSize: 20,
    fontWeight: 800,
    color: "#0b3e91",
    marginTop: 10,
    marginBottom: 10,
  },
  totalBadgeWrap: {
    position: "absolute",
    right: 18,
    top: 12,
    display: "grid",
    gap: 4,
    justifyItems: "end",
    background: "#fff",
    border: "1px solid #e6eeff",
    borderRadius: 14,
    padding: "8px 14px",
    boxShadow: "0 8px 24px rgba(11,86,201,0.08)",
  },
  totalBadgeLabel: { fontSize: 13, color: "#0b3e91", fontWeight: 600 },
  totalBadgeValue: {
    fontSize: 18,
    color: "#0b56c9",
    fontWeight: 800,
    lineHeight: 1,
  },

  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 20, fontWeight: 800, color: "#0b3e91" },

  tableHeader: {
    display: "grid",
    gridTemplateColumns: "1.4fr 1fr 1fr 0.8fr",
    gap: 10,
    marginBottom: 6,
    color: "#0b3e91",
    fontWeight: 700,
    alignItems: "center",
  },
  thCenter: { display: "flex", justifyContent: "center", width: "100%" },

  row: {
    display: "grid",
    gridTemplateColumns: "1.4fr 1fr 1fr 0.8fr",
    gap: 10,
    alignItems: "center",
    background: "#f5f8ff",
    borderRadius: 12,
    border: "1px solid #e8eeff",
    padding: "10px 12px",
    boxShadow: "0 8px 16px rgba(11, 86, 201, 0.05)",
  },

  colName: {
    background: "#ffffff",
    borderRadius: 12,
    border: "1px solid #eef3ff",
    padding: "8px 12px",
    boxShadow: "0 4px 10px rgba(0,0,0,0.04) inset",
  },
  nameCell: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    justifyContent: "flex-start",
  },
  nameText: {
    fontWeight: 600,
    color: "#111827",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: 320,
  },

  avatarSmImg: {
    width: 40,
    aspectRatio: "9 / 16",
    height: "auto",
    borderRadius: 10,
    objectFit: "cover",
    border: "2px solid #e6eeff",
    boxShadow: "0 2px 6px rgba(11,86,201,0.12)",
  },
  avatarSmFallback: {
    width: 40,
    aspectRatio: "9 / 16",
    height: "auto",
    borderRadius: 10,
    display: "grid",
    placeItems: "center",
    fontWeight: 700,
    color: "#0b56c9",
    background: "#eef5ff",
    border: "2px solid #e6eeff",
    boxShadow: "0 2px 6px rgba(11,86,201,0.12)",
  },

  colCenter: { textAlign: "center", color: "#0f172a", fontWeight: 600 },
  colActionsCenter: { display: "flex", justifyContent: "center", gap: 8 },
  iconBtn: { borderRadius: 10 },

  pagination: {
    marginTop: 16,
    display: "grid",
    gridTemplateColumns: "40px 1fr 40px",
    alignItems: "center",
    justifyItems: "center",
    gap: 12,
  },
  pageText: { fontSize: 12, color: "#475569" },

  label: { fontSize: 12, color: "#64748b" },
  value: {
    fontWeight: 600,
    color: "#0f172a",
    background: "#f8fafc",
    border: "1px solid #e8eeff",
    borderRadius: 10,
    padding: "10px 12px",
    boxShadow: "inset 0 2px 6px rgba(11,86,201,0.05)",
  },

  modalShell: {
    position: "relative",
    background: "#fff",
    borderRadius: 18,
    padding: "18px 18px 10px",
    boxShadow: "0 10px 40px rgba(11,86,201,0.08)",
  },
  avatarWrap: {
    display: "grid",
    justifyContent: "center",
    justifyItems: "center",
    marginTop: 8,
    marginBottom: 12,
  },
  avatarCircle: {
    width: 220,
    aspectRatio: "9 / 16",
    height: "auto",
    borderRadius: 24,
    border: "2px dashed #c0c8d8",
    background: "transparent",
    display: "grid",
    placeItems: "center",
    cursor: "default",
    overflow: "hidden",
    boxShadow: "0 10px 24px rgba(11,86,201,0.08)",
  },
  avatarPlus: {
    fontSize: 96,
    lineHeight: 1,
    color: "#0b56c9",
    userSelect: "none",
  },
  avatarHint: { marginTop: 6, fontSize: 13, color: "#0b56c9", fontWeight: 600 },

  blockLabel: { fontWeight: 700, color: "#0b3e91", margin: "2px 0 8px" },
  blockHeaderRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    marginBottom: 6,
  },
  countTag: { borderRadius: 10 },

  galleryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
    gap: 10,
    marginBottom: 8,
  },
  thumb: {
    width: "100%",
    aspectRatio: "4 / 3",
    background: "#fff",
    border: "1px solid #e8eeff",
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    boxShadow: "0 4px 10px rgba(0,0,0,0.04)",
  },
  thumbImg: { width: "100%", height: "100%", objectFit: "cover" },
  delThumbBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 8,
    border: "1px solid #ef4444",
    color: "#ef4444",
    background: "#fff",
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
    boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
  },
  noImagesHint: { fontSize: 13, color: "#64748b", marginBottom: 8 },

  addBoxInner: {
    width: 110,
    height: 110,
    display: "grid",
    placeItems: "center",
  },

  modalFooter: { marginTop: 10, display: "grid", placeItems: "center" },
  saveBtn: { minWidth: 220, height: 44, borderRadius: 14 },
};
