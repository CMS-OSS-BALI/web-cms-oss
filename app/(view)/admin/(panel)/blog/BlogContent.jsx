"use client";

import { useRef, useEffect, useMemo, useState } from "react";
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
  Row,
  Select,
  Space,
  Tag,
  Typography,
  theme as antdTheme,
} from "antd";
import { EyeOutlined, PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import HtmlEditor from "@/app/components/editor/HtmlEditor";
import { sanitizeHtml } from "@/app/utils/dompurify";

const { Title, Text, Paragraph } = Typography;
const PLACEHOLDER =
  "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=1200&auto=format&fit=crop";

/* ===== Theme ===== */
const CARD_BG = "rgba(11, 18, 35, 0.94)";
const darkCardStyle = {
  background: CARD_BG,
  border: "1px solid #2f3f60",
  borderRadius: 16,
  boxShadow: "0 10px 24px rgba(2,6,23,.35)",
};

/* ===== Form Modal (with file upload) ===== */
function BlogFormModal({
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

  // local state untuk file & preview
  const fileInputRef = useRef(null);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState("");

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue({ ...initialValues });
    // preview dari initial values (edit) → pakai image_src/public/url
    setCoverFile(null);
    setCoverPreview(
      initialValues?.image_src ||
        initialValues?.image_public_url ||
        initialValues?.image_url ||
        ""
    );
  }, [open, initialValues, form]);

  const ctrlStyle = {
    background: "#0e182c",
    borderColor: "#2f3f60",
    color: "#e6eaf2",
    borderRadius: 12,
  };

  const handleFinish = (values) => {
    const payload = {
      file: coverFile || undefined, // kirim file kalau ada
      name_id: values.name_id?.trim(),
      description_id: values.description_id?.trim() || "",
      autoTranslate: true,
    };

    if (isCreate && !coverFile) {
      Modal.warning({
        title: "Cover belum dipilih",
        content: "Silakan unggah cover image untuk blog.",
      });
      return;
    }

    onSubmit(payload);
  };

  function openPicker() {
    if (fileInputRef.current) fileInputRef.current.value = "";
    fileInputRef.current?.click();
  }

  function handleFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(f.type)) {
      Modal.error({
        title: "Format tidak didukung",
        content: "Gunakan JPEG/PNG/WebP.",
      });
      e.target.value = "";
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      Modal.error({
        title: "Ukuran terlalu besar",
        content: "Maksimal 10MB.",
      });
      e.target.value = "";
      return;
    }
    setCoverFile(f);
    setCoverPreview(URL.createObjectURL(f));
  }

  function removeCover() {
    setCoverFile(null);
    setCoverPreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const UploadBox = (
    <div style={{ display: "grid", gap: 8 }}>
      {!coverPreview ? (
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
          onClick={openPicker}
        >
          <Space direction="vertical" align="center" size={4}>
            <EyeOutlined style={{ fontSize: 28, color: "#8fb3ff" }} />
            <Text strong>Ketuk untuk unggah cover</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Disarankan rasio 16:9 • Maks 10MB • JPG/PNG/WebP
            </Text>
          </Space>
        </div>
      ) : (
        <div style={{ position: "relative" }}>
          <img
            src={coverPreview}
            alt="Preview cover"
            style={{
              width: "100%",
              maxHeight: 300,
              objectFit: "cover",
              borderRadius: 12,
              border: "1px solid #2f3f60",
            }}
          />
          <div style={{ marginTop: 8 }}>
            <Button danger shape="round" onClick={removeCover}>
              <DeleteOutlined /> Hapus Cover
            </Button>
            <Button
              shape="round"
              style={{ marginLeft: 8 }}
              onClick={openPicker}
            >
              Ganti Cover
            </Button>
          </div>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
    </div>
  );

  return (
    <Modal
      title={mode === "edit" ? "Edit Blog" : "Add Blog"}
      open={open}
      centered
      width={840}
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
                  name="name_id"
                  label="Judul (Bahasa Indonesia)"
                  required={isCreate}
                  rules={req("Judul (ID) wajib diisi")}
                >
                  <Input maxLength={190} style={ctrlStyle} />
                </Form.Item>
              </Col>

              {/* COVER UPLOAD (replaces image_url field) */}
              <Col xs={24} md={12}>
                <Form.Item label="Cover Image" required={isCreate}>
                  {UploadBox}
                </Form.Item>
              </Col>

              <Col span={24}>
                <Form.Item
                  name="description_id"
                  label="Konten (Bahasa Indonesia)"
                  required={isCreate}
                  rules={req("Konten (ID) wajib diisi")}
                >
                  <HtmlEditor className="editor-dark" minHeight={220} />
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
        .form-scroll::-webkit-scrollbar-track {
          background: transparent;
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
function BlogViewModal({ open, data, onClose }) {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      centered
      width={900}
      title={data?.name || "Detail Blog"}
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
            src={data?.image_public_url || data?.image_url || PLACEHOLDER}
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
          <Title level={4} style={{ marginTop: 0 }}>
            {data?.name || "—"}
          </Title>
          <Space size={8} wrap style={{ marginBottom: 12 }}>
            <Tag>Views: {data?.views_count ?? 0}</Tag>
            <Tag color="blue">Likes: {data?.likes_count ?? 0}</Tag>
            {data?.locale_used ? (
              <Tag color="purple">{data.locale_used.toUpperCase()}</Tag>
            ) : null}
          </Space>
          {data?.description ? (
            <div
              style={{ marginBottom: 0 }}
              dangerouslySetInnerHTML={{
                __html: sanitizeHtml(data.description ?? ""),
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
        .view-scroll::-webkit-scrollbar-track {
          background: transparent;
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
function BlogCard({ b, onView, onEdit, onDelete }) {
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
            alt={b.name}
            src={b.image_src || PLACEHOLDER}
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
          rowGap: 6,
          minHeight: 120,
        }}
      >
        <Text
          strong
          style={{ fontSize: 14, lineHeight: 1.2, margin: 0, display: "block" }}
        >
          {b.name || "(no title)"}
        </Text>

        {b.description ? (
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
            dangerouslySetInnerHTML={{
              __html: sanitizeHtml(b.description || ""),
            }}
          />
        ) : (
          <Paragraph style={{ margin: 0, lineHeight: 1.45 }} type="secondary">
            -
          </Paragraph>
        )}

        <Space size={6} wrap style={{ marginTop: 6 }}>
          <Tag>Views: {b.views_count ?? 0}</Tag>
          <Tag color="blue">Likes: {b.likes_count ?? 0}</Tag>
          {b.locale_used ? (
            <Tag color="purple">{b.locale_used.toUpperCase()}</Tag>
          ) : null}
        </Space>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
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
          title="Hapus blog?"
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
export default function BlogContent(props) {
  const {
    // data + filters
    blogs = [],
    q,
    setQ,
    page,
    setPage,
    perPage,
    setPerPage,
    total = 0,
    sort,
    setSort,
    locale,
    setLocale,
    fallback,
    setFallback,

    // states
    loading,
    opLoading,
    listError,

    // actions
    createBlog,
    updateBlog,
    deleteBlog,
    bumpStat,
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
        key: "blog-error",
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
  const openEdit = (b) => {
    setMode("edit");
    setEditing(b);
    setModalOpen(true);
  };

  const handleSubmit = async (payload) => {
    setSaving(true);
    const res =
      mode === "edit"
        ? await updateBlog(editing.id, payload)
        : await createBlog(payload);
    setSaving(false);

    if (res?.ok) {
      api.success({
        key: "blog-save",
        message: mode === "edit" ? "Blog diperbarui" : "Blog ditambahkan",
        description: "Data telah tersimpan.",
        placement: "topRight",
      });
      setModalOpen(false);
      setEditing(null);
    } else {
      api.error({
        key: "blog-save",
        message: "Gagal menyimpan",
        description: res?.error || "Silakan coba lagi.",
        placement: "topRight",
      });
    }
  };

  const onSearch = () => {
    setPage(1);
  };
  const onReset = () => {
    setQ("");
    setPage(1);
  };
  const onPageChange = (p) => setPage(p);

  const initialValues = useMemo(() => {
    if (!editing) {
      return {
        image_src: "",
        name_id: "",
        description_id: "",
      };
    }
    return {
      image_src:
        editing.image_src ||
        editing.image_public_url ||
        editing.image_url ||
        "",
      name_id: editing.name || "",
      description_id: editing.description || "",
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
                Blog
              </Title>
              <Text type="secondary">
                Kelola artikel blog. Total {total} records.
              </Text>
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              shape="round"
              onClick={openCreate}
            >
              Add Blog
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
            onFinish={onSearch}
            style={{ display: "block" }}
          >
            <Row gutter={[8, 8]} align="middle" wrap>
              {/* Search */}
              <Col flex="1 1 420px" style={{ minWidth: 260 }}>
                <Input.Search
                  allowClear
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Cari judul/konten…"
                  enterButton
                  style={{ width: "100%" }}
                />
              </Col>

              {/* Per Page */}
              <Col
                xs={12}
                sm={8}
                md={6}
                lg={5}
                xl={4}
                xxl={3}
                style={{ minWidth: 160 }}
              >
                <Select
                  value={perPage}
                  onChange={(v) => {
                    setPerPage(v);
                    setPage(1);
                  }}
                  options={[8, 12, 16, 24, 32, 64].map((n) => ({
                    value: n,
                    label: `${n} / page`,
                  }))}
                  style={{ width: "100%" }}
                />
              </Col>

              {/* Sort */}
              <Col
                xs={12}
                sm={8}
                md={6}
                lg={5}
                xl={4}
                xxl={3}
                style={{ minWidth: 180 }}
              >
                <Select
                  value={sort}
                  onChange={(v) => {
                    setSort(v);
                    setPage(1);
                  }}
                  options={[
                    { value: "created_at:desc", label: "Terbaru" },
                    { value: "created_at:asc", label: "Terlama" },
                    { value: "views_count:desc", label: "View terbanyak" },
                    { value: "likes_count:desc", label: "Like terbanyak" },
                  ]}
                  style={{ width: "100%" }}
                />
              </Col>

              {/* Buttons */}
              <Col flex="0 0 200px">
                <Space wrap>
                  <Button shape="round" onClick={onReset}>
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
              Loading…
            </div>
          ) : blogs.length === 0 ? (
            <Empty description="Belum ada data blog" />
          ) : (
            <Row gutter={[16, 16]}>
              {blogs.map((b) => (
                <Col key={b.id} xs={24} sm={12} md={12} lg={8} xl={6}>
                  <BlogCard
                    b={b}
                    onView={async () => {
                      setView(b);
                      await bumpStat(b.id, "view", 1);
                    }}
                    onEdit={() => openEdit(b)}
                    onDelete={async () => {
                      const { ok, error } = await deleteBlog(b.id);
                      if (ok) {
                        notification.success({
                          message: "Blog dihapus",
                          description: "Data berhasil dihapus.",
                          placement: "topRight",
                        });
                      } else {
                        notification.error({
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
              onChange={onPageChange}
            />
          </div>
        </Card>

        {/* Modals */}
        <BlogViewModal
          open={!!view}
          data={view}
          onClose={() => setView(null)}
        />
        <BlogFormModal
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
