"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Button,
  Card,
  Col,
  ConfigProvider,
  Empty,
  Form,
  Image,
  Input,
  Modal,
  notification,
  Pagination,
  Popconfirm,
  Rate,
  Row,
  Select,
  Space,
  Spin,
  Typography,
  Tag,
  theme as antdTheme,
} from "antd";

import {
  PlusOutlined,
  EyeOutlined,
  UploadOutlined,
  YoutubeOutlined,
} from "@ant-design/icons";

import HtmlEditor from "@/../app/components/editor/HtmlEditor";

import { sanitizeHtml } from "@/app/utils/dompurify";

const { Title, Text, Paragraph } = Typography;

const PLACEHOLDER =
  "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=1200&auto=format&fit=crop";

const CARD_BG = "rgba(11, 18, 35, 0.94)";

const darkCardStyle = {
  background: CARD_BG,

  border: "1px solid #2f3f60",

  borderRadius: 16,

  boxShadow: "0 10px 24px rgba(2,6,23,.35)",
};

/* ===== Form Modal ===== */

function TestimonialFormModal({
  open,

  mode,

  initialValues,

  saving,

  onCancel,

  onSubmit,

  categories = [], // NEW
}) {
  const [form] = Form.useForm();

  const isCreate = mode !== "edit";

  const req = (msg) => (isCreate ? [{ required: true, message: msg }] : []);

  const initialPreview = useMemo(
    () => initialValues?.photo_public_url || initialValues?.photo_url || "",

    [initialValues]
  );

  const [previewSrc, setPreviewSrc] = useState(initialPreview);

  const [uploadFile, setUploadFile] = useState(null);

  const fileInputRef = useRef(null);

  const objectUrlRef = useRef(null);

  const resetUpload = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);

      objectUrlRef.current = null;
    }

    setUploadFile(null);

    setPreviewSrc(initialPreview);

    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [initialPreview]);

  useEffect(() => {
    if (!open) return;

    form.resetFields();

    form.setFieldsValue({ ...initialValues });

    resetUpload();
  }, [open, initialValues, form, resetUpload]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  const ctrlStyle = {
    background: "#0e182c",

    borderColor: "#2f3f60",

    color: "#e6eaf2",

    borderRadius: 12,
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      resetUpload();

      form.setFieldsValue({
        photo_url: initialValues?.photo_url || "",
      });

      setTimeout(() => form.validateFields(["photo_url"]).catch(() => null), 0);

      return;
    }

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);

      objectUrlRef.current = null;
    }

    const objectUrl = URL.createObjectURL(file);

    objectUrlRef.current = objectUrl;

    setUploadFile(file);

    setPreviewSrc(objectUrl);

    form.setFieldsValue({ photo_url: "" });

    setTimeout(() => form.validateFields(["photo_url"]).catch(() => null), 0);
  };

  const handleClearUpload = () => {
    resetUpload();

    form.setFieldsValue({
      photo_url: initialValues?.photo_url || "",
    });

    setTimeout(() => form.validateFields(["photo_url"]).catch(() => null), 0);
  };

  const handleFinish = (values) => {
    const trimmedPhoto = values.photo_url?.trim();

    const normalizedPhoto = uploadFile
      ? undefined
      : trimmedPhoto
      ? trimmedPhoto
      : !isCreate && values.photo_url === ""
      ? null
      : undefined;

    onSubmit({
      name: values.name?.trim(),

      photo_url: normalizedPhoto,

      message: values.message?.trim(),

      star: typeof values.star === "number" ? values.star : undefined,

      youtube_url: values.youtube_url?.trim() || undefined,

      kampus_negara_tujuan: values.kampus_negara_tujuan?.trim() ?? undefined,

      category_slug:
        values.category_slug === null
          ? null // explicit unset
          : values.category_slug || undefined, // keep/ignore

      file: uploadFile || undefined,
    });
  };

  return (
    <Modal
      title={mode === "edit" ? "Edit Testimonial" : "Add Testimonial"}
      open={open}
      centered
      width={720}
      onCancel={onCancel}
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
      destroyOnHidden
    >
      <div className="form-scroll">
        <div style={{ padding: 16 }}>
          <Form layout="vertical" form={form} onFinish={handleFinish}>
            <Row gutter={[12, 8]}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="name"
                  label="Name"
                  required={isCreate}
                  rules={req("Name wajib diisi")}
                >
                  <Input maxLength={150} style={ctrlStyle} />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  name="photo_url"
                  label="Photo URL"
                  required={isCreate && !uploadFile}
                  rules={[
                    {
                      validator: (_, value) => {
                        if (uploadFile) return Promise.resolve();

                        if (!isCreate) return Promise.resolve();

                        if (value && String(value).trim()) {
                          return Promise.resolve();
                        }

                        return Promise.reject(
                          new Error("Photo wajib diisi (URL atau upload file).")
                        );
                      },
                    },
                  ]}
                  extra="Isi URL gambar sendiri jika tidak mengunggah file."
                >
                  <Input
                    placeholder="/uploads/xx.jpg atau https://..."
                    style={ctrlStyle}
                  />
                </Form.Item>
              </Col>

              <Col span={24}>
                <Form.Item
                  label="Upload Photo (opsional)"
                  extra="Unggah JPEG/PNG/WebP (maks. 10MB). Jika diisi, foto akan diunggah ke Supabase."
                >
                  <Space align="start" size={12} wrap>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      style={{ display: "none" }}
                      onChange={handleFileChange}
                    />

                    <Button
                      shape="round"
                      icon={<UploadOutlined />}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Pilih File
                    </Button>

                    {uploadFile ? (
                      <Text type="secondary">
                        {uploadFile.name} ({Math.round(uploadFile.size / 1024)}{" "}
                        KB)
                      </Text>
                    ) : (
                      <Text type="secondary">
                        {previewSrc
                          ? "Menggunakan foto tersimpan."
                          : "Belum ada file dipilih."}
                      </Text>
                    )}

                    {uploadFile ? (
                      <Button type="link" danger onClick={handleClearUpload}>
                        Hapus
                      </Button>
                    ) : null}
                  </Space>

                  {previewSrc ? (
                    <div style={{ marginTop: 12 }}>
                      <Image
                        src={previewSrc}
                        alt={form.getFieldValue("name") || "Preview"}
                        style={{
                          width: "100%",

                          maxHeight: 220,

                          objectFit: "cover",

                          borderRadius: 12,

                          border: "1px solid #2f3f60",
                        }}
                        preview={false}
                        onError={(e) => {
                          e.currentTarget.onerror = null;

                          e.currentTarget.src = PLACEHOLDER;
                        }}
                      />
                    </div>
                  ) : null}
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item name="star" label="Rating (1–5)">
                  <Rate allowClear count={5} />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item name="youtube_url" label="YouTube URL (opsional)">
                  <Input placeholder="https://youtu.be/xxxx atau https://www.youtube.com/watch?v=xxxx" />
                </Form.Item>
              </Col>

              {/* NEW: pilih kategori by slug (boleh kosong) */}

              <Col xs={24} md={12}>
                <Form.Item
                  name="category_slug"
                  label="Category (opsional)"
                  tooltip="Pilih kategori untuk mengelompokkan testimonial"
                >
                  <Select
                    allowClear
                    placeholder="Pilih kategori…"
                    options={categories.map((c) => ({
                      value: c.slug,

                      label: c.name || c.slug,
                    }))}
                  />
                </Form.Item>
              </Col>

              <Col span={24}>
                <Form.Item
                  name="kampus_negara_tujuan"
                  label="Kampus & Negara Tujuan (opsional)"
                  tooltip="Contoh: Osaka University — Japan"
                >
                  <Input placeholder="Nama kampus — Negara" />
                </Form.Item>
              </Col>

              <Col span={24}>
                <Form.Item
                  name="message"
                  label="Testimonial"
                  required={isCreate}
                  rules={req("Testimonial wajib diisi")}
                >
                  <HtmlEditor
                    className="editor-dark"
                    variant="mini"
                    minHeight={200}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </div>
      </div>

      <style jsx global>{`
        .form-scroll {
          max-height: 62vh;

          overflow: auto;
        }

        .form-scroll::-webkit-scrollbar {
          width: 8px;
        }

        .form-scroll::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.25);

          border-radius: 9999px;
        }

        .form-scroll:hover::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.35);
        }

        .form-scroll {
          scrollbar-width: thin;

          scrollbar-color: rgba(148, 163, 184, 0.25) transparent;
        }
      `}</style>
    </Modal>
  );
}

/* ===== View Modal ===== */

function TestimonialViewModal({ open, data, onClose }) {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      centered
      width={840}
      title={data?.name || "Detail Testimonial"}
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
      destroyOnHidden
    >
      <div className="view-scroll">
        <div style={{ padding: 16 }}>
          <Image
            src={data?.photo_public_url || data?.photo_url || PLACEHOLDER}
            alt={data?.name}
            style={{
              width: "100%",

              borderRadius: 10,

              marginBottom: 12,

              maxHeight: 420,

              objectFit: "cover",
            }}
            preview={false}
            onError={(e) => {
              e.currentTarget.onerror = null;

              e.currentTarget.src = PLACEHOLDER;
            }}
          />

          <div
            style={{
              display: "flex",

              alignItems: "center",

              gap: 10,

              flexWrap: "wrap",
            }}
          >
            <Title level={4} style={{ marginTop: 0 }}>
              {data?.name || "—"}
            </Title>

            {typeof data?.star === "number" && data.star > 0 ? (
              <Rate disabled value={data.star} />
            ) : null}

            {data?.youtube_url ? (
              <Button
                icon={<YoutubeOutlined />}
                size="small"
                shape="round"
                href={data.youtube_url}
                target="_blank"
                rel="noreferrer"
              >
                Watch
              </Button>
            ) : null}

            {data?.kampus_negara_tujuan ? (
              <Tag color="blue" style={{ borderRadius: 999 }}>
                {data.kampus_negara_tujuan}
              </Tag>
            ) : null}

            {/* ⬇️ NEW: tampilkan kategori */}

            {data?.category ? (
              <Tag color="geekblue" style={{ borderRadius: 999 }}>
                {data.category.name || data.category.slug}
              </Tag>
            ) : null}
          </div>

          {data?.message ? (
            <div
              style={{ marginBottom: 0 }}
              dangerouslySetInnerHTML={{
                __html: sanitizeHtml(data.message ?? ""),
              }}
            />
          ) : (
            <Paragraph style={{ marginBottom: 0 }}>—</Paragraph>
          )}
        </div>
      </div>

      <style jsx global>{`
        .view-scroll {
          max-height: 72vh;

          overflow: auto;
        }

        .view-scroll::-webkit-scrollbar {
          width: 8px;
        }

        .view-scroll::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.25);

          border-radius: 9999px;
        }

        .view-scroll:hover::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.35);
        }

        .view-scroll {
          scrollbar-width: thin;

          scrollbar-color: rgba(148, 163, 184, 0.25) transparent;
        }
      `}</style>
    </Modal>
  );
}

/* ===== Card ===== */

function TestimonialCard({ t, onView, onEdit, onDelete }) {
  return (
    <Card
      hoverable
      style={darkCardStyle}
      styles={{ body: { padding: 12 } }}
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
          <img
            alt={t.name}
            src={t.photo_public_url || t.photo_url || PLACEHOLDER}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => {
              e.currentTarget.onerror = null;

              e.currentTarget.src = PLACEHOLDER;
            }}
          />
        </div>
      }
    >
      <div
        style={{
          display: "flex",

          flexDirection: "column",

          rowGap: 4,

          minHeight: 130,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Text strong style={{ fontSize: 14, lineHeight: 1.2, margin: 0 }}>
            {t.name}
          </Text>

          {typeof t.star === "number" && t.star > 0 ? (
            <Rate disabled value={t.star} style={{ fontSize: 14 }} />
          ) : null}
        </div>

        {/* ⬇️ NEW: kategori badge */}

        {t.category ? (
          <Tag
            color="geekblue"
            style={{ borderRadius: 999, width: "fit-content" }}
          >
            {t.category.name || t.category.slug}
          </Tag>
        ) : null}

        {t.kampus_negara_tujuan ? (
          <Tag color="blue" style={{ borderRadius: 999, width: "fit-content" }}>
            {t.kampus_negara_tujuan}
          </Tag>
        ) : null}

        {t.message ? (
          <div
            style={{
              margin: 0,

              lineHeight: 1.45,

              color: "#94a3b8",

              display: "-webkit-box",

              WebkitLineClamp: 4,

              WebkitBoxOrient: "vertical",

              overflow: "hidden",
            }}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(t.message || "") }}
          />
        ) : (
          <Paragraph style={{ margin: 0, lineHeight: 1.45 }} type="secondary">
            -
          </Paragraph>
        )}

        {t.youtube_url ? (
          <div style={{ marginTop: 6 }}>
            <Button
              icon={<YoutubeOutlined />}
              size="small"
              shape="round"
              href={t.youtube_url}
              target="_blank"
              rel="noreferrer"
            >
              Watch
            </Button>
          </div>
        ) : null}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <Button
          type="primary"
          size="small"
          shape="round"
          onClick={onView}
          icon={<EyeOutlined />}
        >
          View
        </Button>

        <Button size="small" shape="round" onClick={onEdit}>
          Edit
        </Button>

        <Popconfirm
          title="Hapus testimonial?"
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

/* ===== Main ===== */

export default function TestimonialsContent(props) {
  const {
    loading,

    testimonials = [],

    categories = [], // ⬅️ NEW

    categorySlug, // ⬅️ NEW

    setCategorySlug, // ⬅️ NEW

    q,

    setQ,

    page,

    setPage,

    perPage,

    setPerPage,

    total = 0,

    error,

    fetchTestimonials,

    createTestimonial,

    updateTestimonial,

    deleteTestimonial,
  } = props;

  const [api, contextHolder] = notification.useNotification();

  const [modalOpen, setModalOpen] = useState(false);

  const [mode, setMode] = useState("create");

  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState(null);

  const [view, setView] = useState(null);

  useEffect(() => {
    if (error) {
      api.error({
        key: "testimonial-error",

        message: "Terjadi kesalahan",

        description: error,

        placement: "topRight",
      });
    }
  }, [error, api]);

  const openCreate = () => {
    setMode("create");

    setEditing(null);

    setModalOpen(true);
  };

  const openEdit = (t) => {
    setMode("edit");

    setEditing(t);

    setModalOpen(true);
  };

  const handleSubmit = async (payload) => {
    setSaving(true);

    const res =
      mode === "edit"
        ? await updateTestimonial(editing.id, payload)
        : await createTestimonial(payload);

    setSaving(false);

    if (res?.ok) {
      api.success({
        key: "testimonial-save",

        message:
          mode === "edit"
            ? "Testimonial diperbarui"
            : "Testimonial ditambahkan",

        description: "Data telah tersimpan.",

        placement: "topRight",
      });

      setModalOpen(false);

      setEditing(null);
    } else {
      api.error({
        key: "testimonial-save",

        message: "Gagal menyimpan",

        description: res?.error || "Silakan coba lagi.",

        placement: "topRight",
      });
    }
  };

  const onSearch = () =>
    fetchTestimonials({ page: 1, q, perPage, categorySlug });

  const onReset = () => {
    setQ("");

    setCategorySlug("");

    fetchTestimonials({ page: 1, q: "", perPage, categorySlug: "" });
  };

  const onPageChange = (p) => {
    setPage(p);

    fetchTestimonials({ page: p, perPage, q, categorySlug });
  };

  const initialValues = useMemo(() => {
    if (!editing)
      return {
        photo_url: "",

        photo_public_url: "",

        star: undefined,

        youtube_url: "",

        kampus_negara_tujuan: "",

        category_slug: undefined,
      };

    return {
      name: editing.name || "",

      photo_url: editing.photo_url || "",

      photo_public_url: editing.photo_public_url || editing.photo_url || "",

      message: editing.message || "",

      star: typeof editing.star === "number" ? editing.star : undefined,

      youtube_url: editing.youtube_url || "",

      kampus_negara_tujuan: editing.kampus_negara_tujuan || "",

      category_slug: editing.category?.slug || undefined, // NEW
    };
  }, [editing]);

  const pageWrapStyle = {
    maxWidth: 1320,

    margin: "0 auto",

    padding: "24px 32px 12px",
  };

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
                Testimonials
              </Title>

              <Text type="secondary">
                Kelola testimoni dari klien/pengguna. Total {total} records.
              </Text>
            </div>

            <Button
              type="primary"
              icon={<PlusOutlined />}
              shape="round"
              onClick={openCreate}
            >
              Add Testimonial
            </Button>
          </Space>
        </Card>

        <Card
          style={{ ...darkCardStyle, marginBottom: 12 }}
          styles={{ body: { padding: 12 } }}
        >
          <Form
            layout="inline"
            onFinish={onSearch}
            style={{ display: "block" }}
          >
            <Row gutter={[8, 8]} align="middle" wrap>
              <Col xs={24} md={10} style={{ flex: "1 1 auto" }}>
                <Input.Search
                  allowClear
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Cari nama/isi testimoni/tujuan kampus/kategori…"
                  enterButton
                />
              </Col>

              {/* ⬇️ NEW: filter kategori (slug) */}

              <Col xs={24} sm={12} md={8} lg={6} xl={5}>
                <Select
                  allowClear
                  value={categorySlug || undefined}
                  onChange={(v) => setCategorySlug(v || "")}
                  placeholder="Filter kategori"
                  options={categories.map((c) => ({
                    value: c.slug,

                    label: c.name || c.slug,
                  }))}
                  style={{ width: "100%" }}
                />
              </Col>

              <Col xs={24} sm={12} md={6} lg={4} xl={3}>
                <SelectPerPage
                  perPage={perPage}
                  setPerPage={setPerPage}
                  fetch={fetchTestimonials}
                  q={q}
                />
              </Col>

              <Col xs="auto">
                <Space>
                  <Button shape="round" onClick={onReset}>
                    Reset
                  </Button>

                  <Button shape="round" type="primary" htmlType="submit">
                    Search
                  </Button>
                </Space>
              </Col>
            </Row>
          </Form>
        </Card>

        <Card style={{ ...darkCardStyle }} styles={{ body: { padding: 16 } }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <Spin />
            </div>
          ) : testimonials.length === 0 ? (
            <Empty description="Belum ada data testimonial" />
          ) : (
            <Row gutter={[16, 16]}>
              {testimonials.map((t) => (
                <Col key={t.id} xs={24} sm={12} md={12} lg={8} xl={6}>
                  <TestimonialCard
                    t={t}
                    onView={() => setView(t)}
                    onEdit={() => openEdit(t)}
                    onDelete={async () => {
                      const { ok, error: err } = await deleteTestimonial(t.id);

                      if (ok) {
                        notification.success({
                          message: "Testimonial dihapus",

                          description: "Data berhasil dihapus.",

                          placement: "topRight",
                        });
                      } else {
                        notification.error({
                          message: "Gagal menghapus",

                          description: err || "Silakan coba lagi.",

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

        <Card
          style={{ ...darkCardStyle, marginTop: 12, marginBottom: 0 }}
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
              onChange={onPageChange}
            />
          </div>
        </Card>

        <TestimonialViewModal
          open={!!view}
          data={view}
          onClose={() => setView(null)}
        />

        <TestimonialFormModal
          open={modalOpen}
          mode={mode}
          initialValues={initialValues}
          saving={saving}
          onCancel={() => {
            setModalOpen(false);

            setEditing(null);
          }}
          onSubmit={handleSubmit}
          categories={categories} // ⬅️ NEW
        />
      </div>
    </ConfigProvider>
  );
}

/* ===== Small helper component ===== */

function SelectPerPage({ perPage, setPerPage, fetch, q }) {
  return (
    <Select
      value={perPage}
      onChange={(v) => {
        setPerPage(v);

        fetch({ page: 1, perPage: v, q });
      }}
      options={[8, 12, 16, 24, 32, 64].map((n) => ({ value: n, label: n }))}
      style={{ width: "100%" }}
      placeholder="Per page"
    />
  );
}
