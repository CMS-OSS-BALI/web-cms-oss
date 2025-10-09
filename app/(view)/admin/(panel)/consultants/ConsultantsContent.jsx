"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Card,
  ConfigProvider,
  Descriptions,
  Empty,
  Form,
  Image,
  Input,
  Modal,
  notification,
  Pagination,
  Popconfirm,
  Row,
  Col,
  Select,
  Space,
  Tag,
  Typography,
  theme as antdTheme,
  Checkbox,
} from "antd";
import {
  EyeOutlined,
  MailOutlined,
  PhoneOutlined,
  PlusOutlined,
  DeleteOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import HtmlEditor from "@/app/components/editor/HtmlEditor";
import { sanitizeHtml } from "@/app/utils/dompurify";

const { Title, Text, Paragraph } = Typography;

const CARD_BG = "rgba(11, 18, 35, 0.94)";
const IMAGE_PLACEHOLDER =
  "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=1200&auto=format&fit=crop";

const darkCardStyle = {
  background: CARD_BG,
  border: "1px solid #2f3f60",
  borderRadius: 16,
  boxShadow: "0 10px 24px rgba(2,6,23,.35)",
};

const pageWrapStyle = {
  maxWidth: 1320,
  margin: "0 auto",
  padding: "24px 32px 12px",
};

/* ===== util ===== */
function fileOk(file) {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) {
    return { ok: false, msg: "Format tidak didukung (JPG/PNG/WebP)" };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { ok: false, msg: "Maksimal 10MB" };
  }
  return { ok: true };
}

/* ===== Form Modal (dengan upload file) ===== */
function ConsultantFormModal({
  open,
  mode,
  initialValues,
  saving,
  onCancel,
  onSubmit,
}) {
  const [form] = Form.useForm();
  const isCreate = mode !== "edit";
  const req = (msg) => (isCreate ? [{ required: true, message: msg }] : []);

  // refs input file
  const refProfile = useRef(null);
  const refCover = useRef(null);
  const refGallery = useRef(null);

  // state file + preview
  const [profileFile, setProfileFile] = useState(null);
  const [profilePreview, setProfilePreview] = useState("");

  const [coverFile, setCoverFile] = useState(null); // program consultant
  const [coverPreview, setCoverPreview] = useState("");

  const [galleryFiles, setGalleryFiles] = useState([]); // File[]
  const [galleryPreviews, setGalleryPreviews] = useState([]); // string[]

  // mode replace/append galeri (PATCH)
  const [replaceGallery, setReplaceGallery] = useState(false);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue({ ...initialValues });

    // reset file states
    setProfileFile(null);
    setCoverFile(null);
    setGalleryFiles([]);
    setGalleryPreviews([]);
    setReplaceGallery(false);

    // preview default dari existing data
    setProfilePreview(
      initialValues?.profile_image_public_url ||
        initialValues?.profile_image_url ||
        ""
    );
    setCoverPreview(
      initialValues?.program_consultant_image_public_url ||
        initialValues?.program_consultant_image_url ||
        ""
    );

    // existing gallery (hanya untuk pratinjau)
    const existingGallery = Array.isArray(initialValues?.program_images)
      ? initialValues.program_images
      : [];
    setGalleryPreviews(
      existingGallery.map((g) => g.image_public_url || g.image_url || "")
    );
  }, [open, initialValues, form]);

  const onPickProfile = () => {
    if (refProfile.current) refProfile.current.value = "";
    refProfile.current?.click();
  };
  const onPickCover = () => {
    if (refCover.current) refCover.current.value = "";
    refCover.current?.click();
  };
  const onPickGallery = () => {
    if (refGallery.current) refGallery.current.value = "";
    refGallery.current?.click();
  };

  const onProfileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const val = fileOk(f);
    if (!val.ok) {
      Modal.error({ title: "Upload gagal", content: val.msg });
      e.target.value = "";
      return;
    }
    setProfileFile(f);
    setProfilePreview(URL.createObjectURL(f));
  };
  const onCoverChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const val = fileOk(f);
    if (!val.ok) {
      Modal.error({ title: "Upload gagal", content: val.msg });
      e.target.value = "";
      return;
    }
    setCoverFile(f);
    setCoverPreview(URL.createObjectURL(f));
  };
  const onGalleryChange = (e) => {
    const files = [...(e.target.files || [])];
    if (!files.length) return;
    const oks = [];
    const previews = [];
    for (const f of files) {
      const val = fileOk(f);
      if (!val.ok) {
        Modal.error({ title: "Upload gagal", content: val.msg });
        continue;
      }
      oks.push(f);
      previews.push(URL.createObjectURL(f));
    }
    setGalleryFiles((prev) => prev.concat(oks));
    setGalleryPreviews((prev) => prev.concat(previews));
  };

  const removeGalleryItem = (idx) => {
    setGalleryFiles((prev) => prev.filter((_, i) => i !== idx));
    setGalleryPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const removeProfile = () => {
    setProfileFile(null);
    setProfilePreview("");
    if (refProfile.current) refProfile.current.value = "";
  };
  const removeCover = () => {
    setCoverFile(null);
    setCoverPreview("");
    if (refCover.current) refCover.current.value = "";
  };
  const clearNewGallery = () => {
    setGalleryFiles([]);
    setGalleryPreviews([]);
    if (refGallery.current) refGallery.current.value = "";
  };

  const handleFinish = (values) => {
    // payload multipart untuk VM
    const payload = {
      name_id: values.name_id?.trim() || undefined,
      description_id:
        values.description_id == null
          ? ""
          : typeof values.description_id === "string"
          ? values.description_id
          : String(values.description_id),
      email: values.email?.trim() || undefined,
      whatsapp: values.whatsapp?.trim() || undefined,
      autoTranslate: true,
    };

    // NB: API MENERIMA "files[]" untuk galeri program
    if (galleryFiles.length) payload.files = galleryFiles;

    // (Opsional ke depan) bila kamu punya endpoint upload profile/cover terpisah,
    // set "profile_image_url" / "program_consultant_image_url" di payload dengan path publik.
    // Di sini, kita hanya simpan file untuk preview lokal.
    if (profileFile) payload.profile_file = profileFile;
    if (coverFile) payload.program_consultant_file = coverFile;

    if (mode === "edit" && (galleryFiles.length || replaceGallery)) {
      payload.program_images_mode = replaceGallery ? "replace" : "append";
    }

    if (isCreate && !values.name_id?.trim()) {
      Modal.warning({ title: "Nama belum diisi", content: "Nama (ID) wajib." });
      return;
    }

    onSubmit(payload);
  };

  const UploadBox = ({
    label,
    preview,
    onPick,
    onRemove,
    inputRef,
    onChange,
    multiple = false,
  }) => (
    <div style={{ display: "grid", gap: 8 }}>
      {!preview ? (
        <div
          style={{
            border: "2px dashed #3a5794",
            borderRadius: 12,
            padding: 18,
            display: "grid",
            placeItems: "center",
            cursor: "pointer",
            background:
              "repeating-linear-gradient(-45deg,rgba(17,24,39,.3),rgba(17,24,39,.3) 10px,rgba(17,24,39,.24) 10px,rgba(17,24,39,.24) 20px)",
          }}
          onClick={onPick}
        >
          <Space direction="vertical" align="center" size={4}>
            <UploadOutlined style={{ fontSize: 26, color: "#8fb3ff" }} />
            <Text strong>Ketuk untuk unggah {label}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              JPG/PNG/WebP • Maks 10MB
            </Text>
          </Space>
        </div>
      ) : typeof preview === "string" ? (
        <div style={{ position: "relative" }}>
          <img
            src={preview}
            alt={label}
            style={{
              width: "100%",
              maxHeight: 260,
              objectFit: "cover",
              borderRadius: 12,
              border: "1px solid #2f3f60",
            }}
          />
          <div style={{ marginTop: 8 }}>
            <Button danger shape="round" onClick={onRemove}>
              <DeleteOutlined /> Hapus
            </Button>
            <Button shape="round" style={{ marginLeft: 8 }} onClick={onPick}>
              Ganti
            </Button>
          </div>
        </div>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        style={{ display: "none" }}
        onChange={onChange}
        multiple={multiple}
      />
    </div>
  );

  return (
    <Modal
      title={mode === "edit" ? "Edit Consultant" : "Add Consultant"}
      open={open}
      centered
      width={980}
      onCancel={onCancel}
      destroyOnClose
      footer={
        <Space style={{ width: "100%", justifyContent: "flex-end" }}>
          <Button shape="round" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            shape="round"
            type="primary"
            loading={saving}
            onClick={() => form.submit()}
          >
            {mode === "edit" ? "Update" : "Save"}
          </Button>
        </Space>
      }
      styles={{
        content: { ...darkCardStyle, borderRadius: 16 },
        header: {
          background: "transparent",
          borderBottom: "1px solid #2f3f60",
        },
        body: { padding: 0 },
        mask: { backgroundColor: "rgba(0,0,0,.6)" },
      }}
    >
      <div className="consultant-form-scroll">
        <div style={{ padding: 16 }}>
          <Form form={form} layout="vertical" onFinish={handleFinish}>
            <Row gutter={[12, 8]}>
              <Col span={24}>
                <Form.Item
                  name="name_id"
                  label="Nama (Bahasa Indonesia)"
                  required={isCreate}
                  rules={req("Nama (ID) wajib diisi")}
                >
                  <Input
                    style={{
                      background: "#0e182c",
                      borderColor: "#2f3f60",
                      color: "#e6eaf2",
                      borderRadius: 12,
                    }}
                    maxLength={150}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item name="email" label="Email">
                  <Input
                    style={{
                      background: "#0e182c",
                      borderColor: "#2f3f60",
                      color: "#e6eaf2",
                      borderRadius: 12,
                    }}
                    maxLength={150}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="whatsapp" label="WhatsApp">
                  <Input
                    style={{
                      background: "#0e182c",
                      borderColor: "#2f3f60",
                      color: "#e6eaf2",
                      borderRadius: 12,
                    }}
                    maxLength={30}
                  />
                </Form.Item>
              </Col>

              {/* Profile image (preview-only) */}
              <Col xs={24} md={12}>
                <Form.Item label="Profile Image">
                  <UploadBox
                    label="profile image"
                    preview={profilePreview}
                    onPick={onPickProfile}
                    onRemove={removeProfile}
                    inputRef={refProfile}
                    onChange={onProfileChange}
                  />
                </Form.Item>
              </Col>

              {/* Program consultant cover (preview-only) */}
              <Col xs={24} md={12}>
                <Form.Item label="Program Cover">
                  <UploadBox
                    label="program cover"
                    preview={coverPreview}
                    onPick={onPickCover}
                    onRemove={removeCover}
                    inputRef={refCover}
                    onChange={onCoverChange}
                  />
                </Form.Item>
              </Col>

              {/* Description */}
              <Col span={24}>
                <Form.Item
                  name="description_id"
                  label="Deskripsi (Bahasa Indonesia)"
                >
                  <HtmlEditor className="editor-dark" minHeight={200} />
                </Form.Item>
              </Col>

              {/* Gallery program */}
              <Col span={24}>
                <Form.Item label="Program Gallery">
                  <div style={{ display: "grid", gap: 12 }}>
                    <div>
                      <Button
                        shape="round"
                        icon={<UploadOutlined />}
                        onClick={onPickGallery}
                      >
                        Tambah Gambar
                      </Button>
                      {mode === "edit" && (
                        <Checkbox
                          style={{ marginLeft: 12 }}
                          checked={replaceGallery}
                          onChange={(e) => setReplaceGallery(e.target.checked)}
                        >
                          Replace semua galeri (bukan append)
                        </Checkbox>
                      )}
                    </div>

                    {/* existing + new previews */}
                    <Row gutter={[8, 8]}>
                      {/* existing previews (tampil jika tidak replace) */}
                      {Array.isArray(initialValues?.program_images) &&
                        initialValues.program_images.length > 0 &&
                        !replaceGallery &&
                        initialValues.program_images.map((g) => {
                          const src =
                            g.image_public_url ||
                            g.image_url ||
                            IMAGE_PLACEHOLDER;
                          return (
                            <Col
                              key={`ex-${g.id}`}
                              xs={12}
                              sm={8}
                              md={6}
                              lg={6}
                            >
                              <Image
                                src={src}
                                alt="existing"
                                style={{
                                  width: "100%",
                                  height: 110,
                                  objectFit: "cover",
                                  borderRadius: 8,
                                  border: "1px solid rgba(148,163,184,.25)",
                                }}
                                fallback={IMAGE_PLACEHOLDER}
                                preview={false}
                              />
                            </Col>
                          );
                        })}

                      {/* new previews */}
                      {galleryPreviews.map((src, idx) => (
                        <Col key={`new-${idx}`} xs={12} sm={8} md={6} lg={6}>
                          <div style={{ position: "relative" }}>
                            <Image
                              src={src}
                              alt="preview"
                              style={{
                                width: "100%",
                                height: 110,
                                objectFit: "cover",
                                borderRadius: 8,
                                border: "1px solid rgba(148,163,184,.25)",
                              }}
                              fallback={IMAGE_PLACEHOLDER}
                              preview={false}
                            />
                            <Button
                              danger
                              size="small"
                              shape="round"
                              style={{ position: "absolute", right: 6, top: 6 }}
                              onClick={() => removeGalleryItem(idx)}
                            >
                              Hapus
                            </Button>
                          </div>
                        </Col>
                      ))}
                    </Row>

                    {galleryPreviews.length > 0 && (
                      <div>
                        <Button danger shape="round" onClick={clearNewGallery}>
                          <DeleteOutlined /> Hapus semua gambar baru
                        </Button>
                      </div>
                    )}

                    <input
                      ref={refGallery}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      multiple
                      style={{ display: "none" }}
                      onChange={onGalleryChange}
                    />
                  </div>
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </div>
      </div>

      <style jsx global>{`
        .consultant-form-scroll {
          max-height: 62vh;
          overflow: auto;
        }
        .consultant-form-scroll::-webkit-scrollbar {
          width: 8px;
        }
        .consultant-form-scroll::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.25);
          border-radius: 9999px;
        }
      `}</style>
    </Modal>
  );
}

/* ===== View Modal ===== */
function ConsultantViewModal({ open, data, onClose }) {
  if (!data) return null;

  const firstProgramImage =
    data.program_images?.[0]?.image_public_url ||
    data.program_images?.[0]?.image_url ||
    null;

  const coverUrl =
    firstProgramImage ||
    data.program_consultant_image_public_url ||
    data.program_consultant_image_url ||
    data.profile_image_public_url ||
    data.profile_image_url ||
    IMAGE_PLACEHOLDER;

  const profileUrl =
    data.profile_image_public_url ||
    data.profile_image_url ||
    IMAGE_PLACEHOLDER;

  const tags = [
    data.email
      ? {
          key: "email",
          color: "blue",
          label: (
            <span
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <MailOutlined /> {data.email}
            </span>
          ),
        }
      : null,
    data.whatsapp
      ? {
          key: "wa",
          color: "green",
          label: (
            <span
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <PhoneOutlined /> {data.whatsapp}
            </span>
          ),
        }
      : null,
    data.locale_used
      ? {
          key: "locale",
          color: "purple",
          label: `Locale: ${String(data.locale_used).toUpperCase()}`,
        }
      : null,
  ].filter(Boolean);

  const rows = [
    data.email ? { label: "Email", content: data.email } : null,
    data.whatsapp ? { label: "WhatsApp", content: data.whatsapp } : null,
    data.locale_used
      ? { label: "Locale", content: String(data.locale_used).toUpperCase() }
      : null,
    data.created_at
      ? {
          label: "Created",
          content: new Date(data.created_at).toLocaleString(),
        }
      : null,
    data.updated_at
      ? {
          label: "Updated",
          content: new Date(data.updated_at).toLocaleString(),
        }
      : null,
    {
      label: "Description",
      content: data.description ? (
        <div
          dangerouslySetInnerHTML={{
            __html: sanitizeHtml(data.description || ""),
          }}
        />
      ) : (
        "-"
      ),
    },
  ].filter(Boolean);

  const gallery = Array.isArray(data.program_images) ? data.program_images : [];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      centered
      width={900}
      title={data.name || "Detail Konsultan"}
      destroyOnClose
      footer={
        <Button shape="round" type="primary" onClick={onClose}>
          Close
        </Button>
      }
      styles={{
        content: { ...darkCardStyle },
        header: {
          background: "transparent",
          borderBottom: "1px solid #2f3f60",
        },
        body: { padding: 0 },
        mask: { backgroundColor: "rgba(0,0,0,.6)" },
      }}
    >
      <div className="consultant-view-scroll">
        <div style={{ padding: 16 }}>
          <div
            style={{
              borderRadius: 12,
              marginBottom: 16,
              maxHeight: 300,
              overflow: "hidden",
              border: "1px solid rgba(148, 163, 184, 0.25)",
            }}
          >
            <Image
              src={coverUrl}
              alt={data.name || "Consultant cover"}
              style={{
                display: "block",
                width: "100%",
                height: 300,
                objectFit: "cover",
              }}
              fallback={IMAGE_PLACEHOLDER}
              preview={false}
            />
          </div>

          <Space align="center" size={12} style={{ marginBottom: 16 }}>
            <Image
              src={profileUrl}
              alt={data.name || "Profile"}
              width={72}
              height={72}
              style={{
                borderRadius: "50%",
                objectFit: "cover",
                border: "1px solid rgba(148, 163, 184, 0.25)",
              }}
              fallback={IMAGE_PLACEHOLDER}
              preview={false}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <Text strong style={{ fontSize: 18 }}>
                {data.name || "-"}
              </Text>
              <Text type="secondary">ID: {data.id}</Text>
            </div>
          </Space>

          {gallery.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ display: "block", marginBottom: 8 }}>
                Program Images
              </Text>
              <Image.PreviewGroup>
                <Row gutter={[8, 8]}>
                  {gallery.map((g) => {
                    const src =
                      g.image_public_url || g.image_url || IMAGE_PLACEHOLDER;
                    return (
                      <Col key={g.id} xs={12} sm={8} md={6}>
                        <Image
                          src={src}
                          alt="program"
                          style={{
                            width: "100%",
                            height: 110,
                            objectFit: "cover",
                            borderRadius: 8,
                            border: "1px solid rgba(148,163,184,.25)",
                          }}
                          fallback={IMAGE_PLACEHOLDER}
                        />
                      </Col>
                    );
                  })}
                </Row>
              </Image.PreviewGroup>
            </div>
          )}

          <Space size={[8, 8]} wrap style={{ marginBottom: 16 }}>
            {tags.map((tag) => (
              <Tag
                key={tag.key}
                color={tag.color}
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                {tag.label}
              </Tag>
            ))}
          </Space>

          <Descriptions size="small" bordered column={1}>
            {rows.map((row) => (
              <Descriptions.Item key={row.label} label={row.label}>
                {row.content}
              </Descriptions.Item>
            ))}
          </Descriptions>
        </div>
      </div>

      <style jsx global>{`
        .consultant-view-scroll {
          max-height: 72vh;
          overflow: auto;
        }
        .consultant-view-scroll::-webkit-scrollbar {
          width: 8px;
        }
        .consultant-view-scroll::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.25);
          border-radius: 9999px;
        }
      `}</style>
    </Modal>
  );
}

/* ===== Card item ===== */
function ConsultantCard({ item, onView, onEdit, onDelete }) {
  const firstProgramImage =
    item.program_images?.[0]?.image_public_url ||
    item.program_images?.[0]?.image_url ||
    null;

  const coverUrl =
    firstProgramImage ||
    item.program_consultant_image_public_url ||
    item.program_consultant_image_url ||
    item.profile_image_public_url ||
    item.profile_image_url ||
    IMAGE_PLACEHOLDER;

  const rawHtml = String(item.description || "");
  const safeHtml = sanitizeHtml(rawHtml);
  const textFromSafe = safeHtml
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const fallbackText = rawHtml
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const hasRenderableHtml = textFromSafe.length > 0;

  const tags = [
    item.email
      ? {
          key: `email-${item.id}`,
          color: "blue",
          label: (
            <span
              style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
            >
              <MailOutlined /> {item.email}
            </span>
          ),
        }
      : null,
    item.whatsapp
      ? {
          key: `wa-${item.id}`,
          color: "green",
          label: (
            <span
              style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
            >
              <PhoneOutlined /> {item.whatsapp}
            </span>
          ),
        }
      : null,
    item.locale_used
      ? {
          key: `locale-${item.id}`,
          color: "purple",
          label: String(item.locale_used).toUpperCase(),
        }
      : null,
  ].filter(Boolean);

  return (
    <Card
      hoverable
      style={{ ...darkCardStyle, overflow: "hidden" }}
      styles={{ body: { padding: 14 } }}
      cover={
        <div
          style={{
            position: "relative",
            aspectRatio: "16 / 9",
            borderBottom: "1px solid #2f3f60",
            overflow: "hidden",
            cursor: "pointer",
          }}
          onClick={onView}
        >
          <Image
            src={coverUrl}
            alt={item.name || "Consultant image"}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
            fallback={IMAGE_PLACEHOLDER}
            preview={false}
          />
        </div>
      }
    >
      <div style={{ display: "grid", gap: 8 }}>
        <Text
          strong
          ellipsis={{ tooltip: item.name || "(no name)" }}
          style={{ fontSize: 14, lineHeight: 1.35 }}
        >
          {item.name || "(no name)"}
        </Text>

        {hasRenderableHtml ? (
          <div
            style={{
              margin: 0,
              lineHeight: 1.45,
              color: "#94a3b8",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
            dangerouslySetInnerHTML={{ __html: safeHtml }}
          />
        ) : fallbackText ? (
          <Paragraph style={{ margin: 0, color: "#94a3b8" }}>
            {fallbackText.length > 220
              ? `${fallbackText.slice(0, 220)}…`
              : fallbackText}
          </Paragraph>
        ) : (
          <Paragraph style={{ margin: 0 }} type="secondary">
            -
          </Paragraph>
        )}

        <Space size={[8, 8]} wrap>
          {tags.map((tag) => (
            <Tag
              key={tag.key}
              color={tag.color}
              style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
            >
              {tag.label}
            </Tag>
          ))}
        </Space>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
        <Button
          type="primary"
          size="small"
          shape="round"
          icon={<EyeOutlined />}
          onClick={onView}
        >
          View
        </Button>
        <Button size="small" shape="round" onClick={onEdit}>
          Edit
        </Button>
        <Popconfirm
          title="Hapus konsultan?"
          description="Tindakan ini tidak dapat dibatalkan."
          okText="Hapus"
          okButtonProps={{ danger: true }}
          placement="topRight"
          onConfirm={onDelete}
        >
          <Button danger size="small" shape="round">
            Delete
          </Button>
        </Popconfirm>
      </div>
    </Card>
  );
}

/* ===== Main Content ===== */
export default function ConsultantsContent(props) {
  const {
    consultants = [],
    q,
    setQ,
    page,
    setPage,
    perPage,
    setPerPage,
    total = 0,
    setSort,
    setLocale,
    setFallback,
    loading,
    opLoading,
    listError,
    createConsultant,
    updateConsultant,
    deleteConsultant,
  } = props;

  const [api, contextHolder] = notification.useNotification();
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState("create");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [view, setView] = useState(null);

  useEffect(() => {
    if (listError) {
      api.error({
        key: "consultants-error",
        message: "Terjadi kesalahan",
        description: listError,
        placement: "topRight",
      });
    }
  }, [listError, api]);

  const openCreate = () => {
    setMode("create");
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setMode("edit");
    setEditing(item);
    setModalOpen(true);
  };

  const handleSubmit = async (payload) => {
    setSaving(true);
    const res =
      mode === "edit"
        ? await updateConsultant(editing.id, payload)
        : await createConsultant(payload);
    setSaving(false);

    if (res?.ok) {
      api.success({
        key: "consultants-save",
        message:
          mode === "edit" ? "Konsultan diperbarui" : "Konsultan ditambahkan",
        description: "Data telah tersimpan.",
        placement: "topRight",
      });
      setModalOpen(false);
      setEditing(null);
    } else {
      api.error({
        key: "consultants-save",
        message: "Gagal menyimpan",
        description: res?.error || "Silakan coba lagi.",
        placement: "topRight",
      });
    }
  };

  const initialValues = useMemo(() => {
    if (!editing) {
      return {
        name_id: "",
        email: "",
        whatsapp: "",
        description_id: "",
        profile_image_url: "",
        program_consultant_image_url: "",
        program_images: [],
      };
    }
    return {
      name_id: editing.name_id || editing.name || "",
      email: editing.email || "",
      whatsapp: editing.whatsapp || "",
      description_id: editing.description_id ?? editing.description ?? "",
      profile_image_url:
        editing.profile_image_public_url || editing.profile_image_url || "",
      program_consultant_image_url:
        editing.program_consultant_image_public_url ||
        editing.program_consultant_image_url ||
        "",
      program_images: editing.program_images || [],
    };
  }, [editing]);

  return (
    <ConfigProvider
      theme={{
        algorithm: antdTheme.darkAlgorithm,
        token: {
          colorPrimary: "#3b82f6",
          colorBorder: "#2f3f60",
          colorText: "#e6eaf2",
          colorBgContainer: CARD_BG,
          borderRadius: 12,
          controlHeight: 36,
        },
        components: {
          Card: {
            headerBg: "transparent",
            colorBorderSecondary: "#2f3f60",
            borderRadiusLG: 16,
          },
          Button: { borderRadius: 999 },
          Input: { colorBgContainer: "#0e182c" },
          Select: { colorBgContainer: "#0e182c" },
          Pagination: { borderRadius: 999 },
          Modal: { borderRadiusLG: 16 },
        },
      }}
    >
      <div style={pageWrapStyle}>
        {contextHolder}

        {/* Header */}
        <Card
          style={{ ...darkCardStyle, marginBottom: 12 }}
          styles={{ body: { padding: 16 } }}
        >
          <Space
            align="center"
            style={{ width: "100%", justifyContent: "space-between" }}
          >
            <div>
              <Title level={3} style={{ margin: 0 }}>
                Konsultan
              </Title>
              <Text type="secondary">
                Kelola daftar konsultan dengan kontak, deskripsi, dan gambar.
              </Text>
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              shape="round"
              onClick={openCreate}
            >
              Add Consultant
            </Button>
          </Space>
        </Card>

        {/* Filters */}
        <Card
          style={{ ...darkCardStyle, marginBottom: 12 }}
          styles={{ body: { padding: 12 } }}
        >
          <Form
            layout="inline"
            onFinish={() => setPage(1)}
            style={{ display: "block" }}
          >
            <Row gutter={[8, 8]} align="middle" wrap>
              <Col flex="1 1 420px" style={{ minWidth: 260 }}>
                <Input.Search
                  allowClear
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Cari nama, email, atau nomor WhatsApp"
                  enterButton
                  style={{ width: "100%" }}
                />
              </Col>

              <Col
                xs={12}
                sm={8}
                md={6}
                lg={4}
                xl={3}
                xxl={2}
                style={{ minWidth: 140 }}
              >
                <Select
                  value={perPage}
                  onChange={(v) => {
                    setPerPage(v);
                    setPage(1);
                  }}
                  options={[8, 10, 12, 16, 24, 32, 64].map((n) => ({
                    value: n,
                    label: `${n} / page`,
                  }))}
                  style={{ width: "100%" }}
                />
              </Col>

              <Col
                flex="0 0 220px"
                style={{ display: "flex", justifyContent: "flex-end" }}
              >
                <Space wrap>
                  <Button
                    shape="round"
                    onClick={() => {
                      setQ("");
                      setPage(1);
                      setPerPage(10);
                      setSort?.("created_at:desc");
                      setLocale?.("id");
                      setFallback?.("en");
                    }}
                  >
                    Reset
                  </Button>
                  <Button
                    shape="round"
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                  >
                    Search
                  </Button>
                </Space>
              </Col>
            </Row>
          </Form>
        </Card>

        {/* List */}
        <Card style={{ ...darkCardStyle }} styles={{ body: { padding: 16 } }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              Loading...
            </div>
          ) : consultants.length === 0 ? (
            <Empty description="Belum ada konsultan" />
          ) : (
            <Row gutter={[16, 16]}>
              {consultants.map((item) => (
                <Col key={item.id} xs={24} sm={12} md={12} lg={8} xl={6}>
                  <ConsultantCard
                    item={item}
                    onView={() => setView(item)}
                    onEdit={() => openEdit(item)}
                    onDelete={async () => {
                      const { ok, error } = await deleteConsultant(item.id);
                      if (ok) {
                        api.success({
                          key: `consultant-delete-${item.id}`,
                          message: "Konsultan dihapus",
                          description: "Data berhasil dihapus.",
                          placement: "topRight",
                        });
                      } else {
                        api.error({
                          key: `consultant-delete-${item.id}`,
                          message: "Gagal menghapus",
                          description: error || "Silakan coba lagi.",
                          placement: "topRight",
                        });
                      }
                    }}
                  />
                </Col>
              ))}
            </Row>
          )}
        </Card>

        {/* Pagination */}
        <Card
          style={{ ...darkCardStyle, marginTop: 12 }}
          styles={{ body: { padding: 12 } }}
        >
          <div
            style={{ width: "100%", display: "flex", justifyContent: "center" }}
          >
            <Pagination
              current={page}
              total={total}
              pageSize={perPage}
              showSizeChanger={false}
              onChange={(p) => setPage(p)}
            />
          </div>
        </Card>

        {/* Modals */}
        <ConsultantViewModal
          open={!!view}
          data={view}
          onClose={() => setView(null)}
        />
        <ConsultantFormModal
          open={modalOpen}
          mode={mode}
          initialValues={initialValues}
          saving={saving || opLoading}
          onCancel={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onSubmit={handleSubmit}
        />
      </div>
    </ConfigProvider>
  );
}
