"use client";

import { useEffect, useMemo, useState } from "react";
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
} from "antd";
import {
  EyeOutlined,
  MailOutlined,
  PhoneOutlined,
  PlusOutlined,
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

const normalizeOptional = (value) => {
  if (value === undefined || value === null) return undefined;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : undefined;
};

const normalizeUrl512 = (value) => {
  const cleaned = normalizeOptional(value);
  return cleaned ? cleaned.slice(0, 512) : undefined;
};

/* ===== Form Modal ===== */
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

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue({ ...initialValues });
  }, [open, initialValues, form]);

  const handleFinish = (values) => {
    const payload = {
      name_id: values.name_id?.trim() || undefined,
      email: normalizeOptional(values.email),
      whatsapp: normalizeOptional(values.whatsapp),
      profile_image_url: normalizeUrl512(values.profile_image_url),
      program_consultant_image_url: normalizeUrl512(
        values.program_consultant_image_url
      ),
      description_id: values.description_id ?? "",
      autoTranslate: true,
    };

    onSubmit(payload);
  };

  const ctrlStyle = {
    background: "#0e182c",
    borderColor: "#2f3f60",
    color: "#e6eaf2",
    borderRadius: 12,
  };

  return (
    <Modal
      title={mode === "edit" ? "Edit Consultant" : "Add Consultant"}
      open={open}
      centered
      width={880}
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
                  <Input style={ctrlStyle} maxLength={150} />
                </Form.Item>
              </Col>

              <Col span={24}>
                <Form.Item
                  name="email"
                  label="Email"
                  rules={[{ type: "email", message: "Email tidak valid" }]}
                >
                  <Input
                    style={ctrlStyle}
                    maxLength={150}
                    placeholder="email@contoh.com"
                  />
                </Form.Item>
              </Col>

              <Col span={24}>
                <Form.Item name="whatsapp" label="WhatsApp">
                  <Input
                    style={ctrlStyle}
                    maxLength={30}
                    placeholder="0812xxxxxxx"
                  />
                </Form.Item>
              </Col>

              <Col span={24}>
                <Form.Item
                  name="profile_image_url"
                  label="Profile Image URL"
                  rules={[
                    {
                      validator(_, value) {
                        const normalized = normalizeUrl512(value);
                        if (!value || normalized === value) return Promise.resolve();
                        return Promise.reject(new Error("Maksimal 512 karakter"));
                      },
                    },
                  ]}
                >
                  <Input style={ctrlStyle} placeholder="https://..." maxLength={512} />
                </Form.Item>
              </Col>

              <Col span={24}>
                <Form.Item
                  name="program_consultant_image_url"
                  label="Program Consultant Image URL"
                  rules={[
                    {
                      validator(_, value) {
                        const normalized = normalizeUrl512(value);
                        if (!value || normalized === value) return Promise.resolve();
                        return Promise.reject(new Error("Maksimal 512 karakter"));
                      },
                    },
                  ]}
                >
                  <Input style={ctrlStyle} placeholder="https://..." maxLength={512} />
                </Form.Item>
              </Col>

              <Col span={24}>
                <Form.Item
                  name="description_id"
                  label="Deskripsi (Bahasa Indonesia)"
                >
                  <HtmlEditor className="editor-dark" minHeight={200} />
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

  const coverUrl =
    data.program_consultant_image_url ||
    data.profile_image_url ||
    IMAGE_PLACEHOLDER;
  const profileUrl = data.profile_image_url || IMAGE_PLACEHOLDER;

  const tags = [
    data.email
      ? {
          key: "email",
          color: "blue",
          label: (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
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
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
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
      ? { label: "Created", content: new Date(data.created_at).toLocaleString() }
      : null,
    data.updated_at
      ? { label: "Updated", content: new Date(data.updated_at).toLocaleString() }
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

  return (
    <Modal
      open={open}
      onCancel={onClose}
      centered
      width={840}
      title={data.name || "Detail Konsultan"}
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
      <div className="consultant-view-scroll">
        <div style={{ padding: 16 }}>
          <Image
            src={coverUrl}
            alt={data.name || "Consultant cover"}
            width="100%"
            style={{
              borderRadius: 12,
              marginBottom: 16,
              maxHeight: 300,
              objectFit: "cover",
              border: "1px solid rgba(148, 163, 184, 0.25)",
            }}
            fallback={IMAGE_PLACEHOLDER}
            preview={false}
          />

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

          <Space size={[8, 8]} wrap style={{ marginBottom: 16 }}>
            {tags.map((tag) => (
              <Tag key={tag.key} color={tag.color} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
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
  const coverUrl =
    item.program_consultant_image_url ||
    item.profile_image_url ||
    IMAGE_PLACEHOLDER;

  const safeDesc = sanitizeHtml(item.description || "");
  const plainDesc = safeDesc.replace(/<[^>]*>/g, "").trim();
  const hasDesc = plainDesc.length > 0;

  const tags = [
    item.email
      ? {
          key: `email-${item.id}`,
          color: "blue",
          label: (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
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
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
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
            width="100%"
            height={180}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
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

        {hasDesc ? (
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
            dangerouslySetInnerHTML={{ __html: safeDesc }}
          />
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

      <div
        style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}
      >
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
          mode === "edit"
            ? "Konsultan diperbarui"
            : "Konsultan ditambahkan",
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
        profile_image_url: "",
        program_consultant_image_url: "",
        description_id: "",
      };
    }
    return {
      name_id: editing.name_id || editing.name || "",
      email: editing.email || "",
      whatsapp: editing.whatsapp || "",
      profile_image_url: editing.profile_image_url || "",
      program_consultant_image_url:
        editing.program_consultant_image_url || "",
      description_id: editing.description_id || editing.description || "",
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
                Kelola daftar konsultan dengan data kontak dan deskripsi.
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
                      setFallback?.("id");
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
        <ConsultantViewModal open={!!view} data={view} onClose={() => setView(null)} />
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





