"use client";

import { useEffect, useMemo, useState } from "react";
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
  Spin,
  Typography,
  theme as antdTheme,
} from "antd";
import { PlusOutlined, EyeOutlined } from "@ant-design/icons";
import HtmlEditor from "@/../app/components/editor/HtmlEditor";
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

/* ===== Form Modal ===== */
function TestimonialFormModal({
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

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue({ ...initialValues });
  }, [open, initialValues, form]);

  const ctrlStyle = {
    background: "#0e182c",
    borderColor: "#2f3f60",
    color: "#e6eaf2",
    borderRadius: 12,
  };

  const handleFinish = (values) => {
    const payload = {
      name: values.name?.trim(),
      photo_url: values.photo_url?.trim(),
      message: values.message?.trim(),
    };
    onSubmit(payload);
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
                  required={isCreate}
                  rules={req("Photo URL wajib diisi")}
                >
                  <Input
                    placeholder="/uploads/xx.jpg atau https://..."
                    style={ctrlStyle}
                  />
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
            src={data?.photo_url || PLACEHOLDER}
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
          {data?.message ? (
            <div
              style={{ marginBottom: 0 }}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(data.message ?? "") }}
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
            src={t.photo_url || PLACEHOLDER}
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
          minHeight: 110,
        }}
      >
        <Text
          strong
          style={{ fontSize: 14, lineHeight: 1.2, margin: 0, display: "block" }}
        >
          {t.name}
        </Text>
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
            dangerouslySetInnerHTML={{
              __html: sanitizeHtml(t.message || ""),
            }}
          />
        ) : (
          <Paragraph style={{ margin: 0, lineHeight: 1.45 }} type="secondary">
            -
          </Paragraph>
        )}
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

  // tampilkan error global
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

  const onSearch = () => fetchTestimonials({ page: 1, q, perPage });
  const onReset = () => {
    setQ("");
    fetchTestimonials({ page: 1, q: "", perPage });
  };
  const onPageChange = (p) => {
    setPage(p);
    fetchTestimonials({ page: p, perPage, q });
  };

  const initialValues = useMemo(() => {
    if (!editing) return {};
    return {
      name: editing.name || "",
      photo_url: editing.photo_url || "",
      message: editing.message || "",
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
              <Col xs={24} md={16} style={{ flex: "1 1 auto" }}>
                <Input.Search
                  allowClear
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Cari nama/isi testimoni…"
                  enterButton
                />
              </Col>
              <Col xs={24} sm={12} md={8} lg={6} xl={4}>
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
                        api.success({
                          message: "Testimonial dihapus",
                          description: "Data berhasil dihapus.",
                          placement: "topRight",
                        });
                      } else {
                        api.error({
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
