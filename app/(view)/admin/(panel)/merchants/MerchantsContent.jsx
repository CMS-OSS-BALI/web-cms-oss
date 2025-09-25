"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
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
  Select,
  Space,
  Spin,
  Typography,
  theme as antdTheme,
} from "antd";
import {
  PlusOutlined,
  EyeOutlined,
  MailOutlined,
  PhoneOutlined,
  InstagramOutlined,
  TwitterOutlined,
  LinkOutlined,
} from "@ant-design/icons";
import HtmlEditor from "@/../app/components/editor/HtmlEditor";
import { sanitizeHtml } from "@/app/utils/dompurify";

const { Title, Text, Paragraph } = Typography;

const PLACEHOLDER =
  "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=1200&auto=format&fit=crop";

const clean = (v) => (v === "" || v === undefined ? null : v);

const CARD_BG = "rgba(11, 18, 35, 0.94)";
const darkCardStyle = {
  background: CARD_BG,
  border: "1px solid #2f3f60",
  borderRadius: 16,
  boxShadow: "0 10px 24px rgba(2,6,23,.35)",
};

/* ===== Form Modal ===== */
/* ===== Form Modal (ALL FIELDS REQUIRED) ===== */
function MerchantFormModal({
  open,
  mode,
  initialValues,
  saving,
  onCancel,
  onSubmit,
}) {
  const [form] = Form.useForm();
  const isEdit = mode === "edit";

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue({
      merchant_name: "",
      email: "",
      phone: "",
      instagram: "",
      twitter: "",
      website: "",
      image_url: "",
      mou_url: "",
      about: "",
      address: "",
      ...initialValues,
    });
  }, [open, initialValues, form]);

  const ctrlStyle = {
    background: "#0e182c",
    borderColor: "#2f3f60",
    color: "#e6eaf2",
    borderRadius: 12,
  };

  const handleFinish = (v) => {
    // payload langsung sesuai API / DB
    const payload = {
      merchant_name: v.merchant_name.trim(),
      email: v.email.trim(),
      phone: v.phone.trim(),
      instagram: v.instagram.trim(),
      twitter: v.twitter.trim(),
      website: v.website.trim(),
      image_url: v.image_url.trim(),
      mou_url: v.mou_url.trim(),
      about: v.about.trim(),
      address: v.address.trim(),
    };
    onSubmit(payload);
  };

  return (
    <Modal
      title={mode === "edit" ? "Edit Mitra Dalam Negeri" : "Add Mitra Dalam Negeri"}
      open={open}
      centered
      width={900}
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
              {/* Name */}
              <Col xs={24} md={12}>
                <Form.Item
                  name="merchant_name"
                  label="Name"
                  rules={
                    isEdit
                      ? []
                      : [
                          {
                            required: true,
                            whitespace: true,
                            message: "Name wajib diisi",
                          },
                        ]
                  }
                >
                  <Input maxLength={191} style={ctrlStyle} />
                </Form.Item>
              </Col>

              {/* Email */}
              <Col xs={24} md={12}>
                <Form.Item
                  name="email"
                  label="Email"
                  rules={[
                    ...(!isEdit
                      ? [{ required: true, message: "Email wajib diisi" }]
                      : []),
                    { type: "email", message: "Email tidak valid" },
                  ]}
                >
                  <Input style={ctrlStyle} />
                </Form.Item>
              </Col>

              {/* Phone */}
              <Col xs={24} md={12}>
                <Form.Item
                  name="phone"
                  label="Phone"
                  rules={
                    isEdit
                      ? []
                      : [
                          {
                            required: true,
                            whitespace: true,
                            message: "Phone wajib diisi",
                          },
                        ]
                  }
                >
                  <Input placeholder="+62..." style={ctrlStyle} />
                </Form.Item>
              </Col>

              {/* Instagram */}
              <Col xs={24} md={12}>
                <Form.Item
                  name="instagram"
                  label="Instagram (handle atau URL)"
                  rules={
                    isEdit
                      ? []
                      : [
                          {
                            required: true,
                            whitespace: true,
                            message: "Instagram wajib diisi",
                          },
                        ]
                  }
                >
                  <Input
                    placeholder="@brand atau https://instagram.com/brand"
                    style={ctrlStyle}
                  />
                </Form.Item>
              </Col>

              {/* Twitter/X */}
              <Col xs={24} md={12}>
                <Form.Item
                  name="twitter"
                  label="Twitter/X (handle atau URL)"
                  rules={
                    isEdit
                      ? []
                      : [
                          {
                            required: true,
                            whitespace: true,
                            message: "Twitter/X wajib diisi",
                          },
                        ]
                  }
                >
                  <Input
                    placeholder="@brand atau https://twitter.com/brand"
                    style={ctrlStyle}
                  />
                </Form.Item>
              </Col>

              {/* Website */}
              <Col xs={24} md={12}>
                <Form.Item
                  name="website"
                  label="Website"
                  rules={[
                    ...(!isEdit
                      ? [{ required: true, message: "Website wajib diisi" }]
                      : []),
                    {
                      type: "url",
                      message:
                        "URL website tidak valid (awali dengan http/https)",
                    },
                  ]}
                >
                  <Input placeholder="https://example.com" style={ctrlStyle} />
                </Form.Item>
              </Col>

              {/* Image URL */}
              <Col xs={24} md={12}>
                <Form.Item
                  name="image_url"
                  label="Image URL"
                  rules={[
                    ...(!isEdit
                      ? [{ required: true, message: "Image URL wajib diisi" }]
                      : []),
                    { type: "url", message: "URL gambar tidak valid" },
                  ]}
                >
                  <Input placeholder="https://..." style={ctrlStyle} />
                </Form.Item>
              </Col>

              {/* MOU URL */}
              <Col xs={24} md={12}>
                <Form.Item
                  name="mou_url"
                  label="MOU URL"
                  rules={[
                    ...(!isEdit
                      ? [{ required: true, message: "MOU URL wajib diisi" }]
                      : []),
                    { type: "url", message: "URL MOU tidak valid" },
                  ]}
                >
                  <Input placeholder="https://..." style={ctrlStyle} />
                </Form.Item>
              </Col>

              {/* About (WYSIWYG) */}
              <Col span={24}>
                <Form.Item
                  name="about"
                  label="About"
                  rules={
                    isEdit
                      ? []
                      : [
                          {
                            required: true,
                            whitespace: true,
                            message: "About wajib diisi",
                          },
                        ]
                  }
                >
                  <HtmlEditor
                    className="editor-dark"
                    variant="mini"
                    minHeight={200}
                  />
                </Form.Item>
              </Col>

              {/* Address */}
              <Col span={24}>
                <Form.Item
                  name="address"
                  label="Address"
                  rules={
                    isEdit
                      ? []
                      : [
                          {
                            required: true,
                            whitespace: true,
                            message: "Address wajib diisi",
                          },
                        ]
                  }
                >
                  <Input.TextArea
                    rows={3}
                    style={{ ...ctrlStyle, resize: "vertical" }}
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
function MerchantViewModal({ open, data, onClose }) {
  const rows = [];
  if (data?.about)
    rows.push({
      label: "About",
      content: (
        <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(data.about ?? "") }} />
      ),
    });
  if (data?.address) rows.push({ label: "Address", content: data.address });
  if (data?.email)
    rows.push({
      label: "Email",
      content: <a href={`mailto:${data.email}`}>{data.email}</a>,
    });
  if (data?.phone)
    rows.push({
      label: "Phone",
      content: <a href={`tel:${data.phone}`}>{data.phone}</a>,
    });
  if (data?.instagram)
    rows.push({
      label: "Instagram",
      content: (
        <a
          href={
            /^https?:\/\//i.test(data.instagram)
              ? data.instagram
              : `https://instagram.com/${data.instagram.replace(/^@/, "")}`
          }
          target="_blank"
          rel="noreferrer"
        >
          {data.instagram}
        </a>
      ),
    });
  if (data?.twitter)
    rows.push({
      label: "Twitter/X",
      content: (
        <a
          href={
            /^https?:\/\//i.test(data.twitter)
              ? data.twitter
              : `https://twitter.com/${data.twitter.replace(/^@/, "")}`
          }
          target="_blank"
          rel="noreferrer"
        >
          {data.twitter}
        </a>
      ),
    });
  if (data?.website)
    rows.push({
      label: "Website",
      content: (
        <a
          href={
            /^https?:\/\//i.test(data.website)
              ? data.website
              : `https://${data.website}`
          }
          target="_blank"
          rel="noreferrer"
        >
          {data.website}
        </a>
      ),
    });
  if (data?.mou_url)
    rows.push({
      label: "MOU",
      content: (
        <a href={data.mou_url} target="_blank" rel="noreferrer">
          {data.mou_url}
        </a>
      ),
    });
  if (data?.created_at)
    rows.push({
      label: "Created At",
      content: new Date(data.created_at).toLocaleString(),
    });

  return (
    <Modal
      open={open}
      onCancel={onClose}
      centered
      width={900}
      title={data?.merchant_name || "Detail Mitra Dalam Negeri"}
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
          {/* Image preview */}
          <Image
            src={data?.image_url || PLACEHOLDER}
            alt={data?.merchant_name}
            width="100%"
            style={{
              borderRadius: 10,
              marginBottom: 12,
              maxHeight: 320,
              objectFit: "cover",
            }}
          />

          <Descriptions size="small" bordered column={1}>
            {rows.map((r, i) => (
              <Descriptions.Item key={i} label={r.label}>
                {r.content}
              </Descriptions.Item>
            ))}
          </Descriptions>
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

function MerchantCard({ m, onView, onEdit, onDelete }) {
  // Build URL untuk sosial/website (boleh handle atau full URL)
  const igUrl = m.instagram
    ? /^https?:\/\//i.test(m.instagram)
      ? m.instagram
      : `https://instagram.com/${String(m.instagram).replace(/^@/, "")}`
    : null;

  const twUrl = m.twitter
    ? /^https?:\/\//i.test(m.twitter)
      ? m.twitter
      : `https://twitter.com/${String(m.twitter).replace(/^@/, "")}`
    : null;

  const webUrl = m.website
    ? /^https?:\/\//i.test(m.website)
      ? m.website
      : `https://${m.website}`
    : null;

  const websiteLabel = (() => {
    if (!webUrl) return "";
    const fallbackLabel = webUrl.replace(/^https?:\/\//i, "");
    try {
      const urlObj = new URL(webUrl);
      const base = urlObj.hostname.replace(/^www\./, "");
      const path = urlObj.pathname && urlObj.pathname !== "/" ? urlObj.pathname : "";
      const label = `${base}${path}`.replace(/\/$/, "");
      return label.length > 28 ? `${label.slice(0, 25)}...` : label;
    } catch (_err) {
      return fallbackLabel.length > 28 ? `${fallbackLabel.slice(0, 25)}...` : fallbackLabel;
    }
  })();

  const cleanedDesc = (m.about || m.address || "").replace(/^[`"'\s]+|[`"'\s]+$/g, "").trim();
  const safeDesc = sanitizeHtml(cleanedDesc || "");
  const plainDesc = safeDesc.replace(/<[^>]*>/g, "").trim();
  const hasDesc = plainDesc.length > 0;

  return (
    <Card
      hoverable
      style={darkCardStyle}
      bodyStyle={{ padding: 12 }}
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
            alt={m.merchant_name}
            src={m.image_url || PLACEHOLDER}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = PLACEHOLDER;
            }}
          />
        </div>
      }
    >
      {/* Nama */}
      <Text strong style={{ fontSize: 14, display: "block" }}>
        {m.merchant_name}
      </Text>

      {/* Email & Phone */}
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
          marginTop: 4,
        }}
      >
        {m.email && (
          <a
            href={`mailto:${m.email}`}
            style={{ fontSize: 12, color: "rgba(226,232,240,0.9)" }}
          >
            <MailOutlined style={{ marginRight: 6 }} />
            {m.email}
          </a>
        )}
        {m.phone && (
          <a
            href={`tel:${m.phone}`}
            style={{ fontSize: 12, color: "rgba(226,232,240,0.9)" }}
          >
            <PhoneOutlined style={{ marginRight: 6 }} />
            {m.phone}
          </a>
        )}
      </div>

      {/* Sosial */}
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginTop: 8,
        }}
      >
        {igUrl && (
          <Button
            size="small"
            shape="round"
            icon={<InstagramOutlined />}
            href={igUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              borderColor: "#2f3f60",
              background: "rgba(255,255,255,.04)",
            }}
          >
            Instagram
          </Button>
        )}
        {twUrl && (
          <Button
            size="small"
            shape="round"
            icon={<TwitterOutlined />}
            href={twUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              borderColor: "#2f3f60",
              background: "rgba(255,255,255,.04)",
            }}
          >
            Twitter
          </Button>
        )}
        {webUrl && (
          <Button
            size="small"
            shape="round"
            icon={<LinkOutlined />}
            href={webUrl}
            target="_blank"
            rel="noreferrer"
            title={webUrl}
            style={{
              borderColor: "#2f3f60",
              background: "rgba(255,255,255,.04)",
              maxWidth: 220,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {websiteLabel}
          </Button>
        )}
      </div>

      {/* Deskripsi */}
      <div style={{ minHeight: "calc(1.3em * 2)", margin: "10px 0 0" }}>
        {hasDesc ? (
          <div
            title={plainDesc || undefined}
            style={{
              lineHeight: 1.3,
              color: "#94a3b8",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
            dangerouslySetInnerHTML={{ __html: safeDesc }}
          />
        ) : (
          <Paragraph style={{ margin: 0, lineHeight: 1.3 }} type="secondary">
            -
          </Paragraph>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
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
          title="Hapus Mitra Dalam Negeri?"
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
export default function MerchantsContent(props) {
  const {
    loading,
    merchants = [],
    q,
    setQ,
    page,
    setPage,
    perPage,
    setPerPage,
    total = 0,
    error,
    fetchMerchants,
    createMerchant,
    updateMerchant,
    deleteMerchant,
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
        key: "merchant-error",
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
  const openEdit = (m) => {
    setMode("edit");
    setEditing(m);
    setModalOpen(true);
  };

  const handleSubmit = async (payload) => {
    setSaving(true);
    const res =
      mode === "edit"
        ? await updateMerchant(editing.id, payload, editing?.locale_used ?? undefined)
        : await createMerchant(payload);
    setSaving(false);

    if (res?.ok) {
      api.success({
        key: "merchant-save",
        message:
          mode === "edit" ? "Mitra Dalam Negeri diperbarui" : "Mitra Dalam Negeri ditambahkan",
        description: "Data telah tersimpan.",
        placement: "topRight",
      });
      setModalOpen(false);
      setEditing(null);
    } else {
      api.error({
        key: "merchant-save",
        message: "Gagal menyimpan",
        description: res?.error || "Silakan coba lagi.",
        placement: "topRight",
      });
    }
  };

  const onSearch = () => fetchMerchants({ page: 1, q, perPage });
  const onReset = () => {
    setQ("");
    fetchMerchants({ page: 1, q: "", perPage });
  };

  const onPageChange = (p) => {
    setPage(p);
    fetchMerchants({ page: p, perPage, q });
  };

  const initialValues = useMemo(
    () =>
      !editing
        ? {}
        : {
            merchant_name: editing.merchant_name || "",
            email: editing.email || "",
            phone: editing.phone || "",
            instagram: editing.instagram || "",
            twitter: editing.twitter || "",
            website: editing.website || "",
            image_url: editing.image_url || "",
            mou_url: editing.mou_url || "",
            about: editing.about || "",
            address: editing.address || "",
          },
    [editing]
  );

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
          bodyStyle={{ padding: 16 }}
          style={{ ...darkCardStyle, marginBottom: 12 }}
        >
          <Space
            align="center"
            style={{ width: "100%", justifyContent: "space-between" }}
          >
            <div>
              <Title level={3} style={{ margin: 0 }}>
                Mitra Dalam Negeri
              </Title>
              <Text type="secondary">
                Kelola data Mitra Dalam Negeri. Total {total} records.
              </Text>
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              shape="round"
              onClick={() => {
                setMode("create");
                setEditing(null);
                setModalOpen(true);
              }}
            >
              Add Mitra Dalam Negeri
            </Button>
          </Space>
        </Card>

        {/* Filters */}
        <Card
          bodyStyle={{ padding: 12 }}
          style={{ ...darkCardStyle, marginBottom: 12 }}
        >
          <Form
            layout="inline"
            onFinish={() => onSearch()}
            style={{ display: "block" }}
          >
            <Row gutter={[8, 8]} align="middle" wrap>
              <Col xs={24} md={12} style={{ flex: "1 1 auto" }}>
                <Input.Search
                  allowClear
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Cari nama/email/phone/alamat…"
                  enterButton
                />
              </Col>

              {/* Per page */}
              <Col xs={24} sm={8} md={6} lg={4} xl={3}>
                <Select
                  value={perPage}
                  onChange={(v) => {
                    setPerPage(v);
                    setPage(1);
                    fetchMerchants({ page: 1, perPage: v, q });
                  }}
                  options={[8, 16, 32, 64, 128].map((n) => ({
                    value: n,
                    label: n,
                  }))}
                  style={{ width: "100%" }}
                  placeholder="Per page"
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

        {/* Cards */}
        <Card bodyStyle={{ padding: 16 }} style={{ ...darkCardStyle }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <Spin />
            </div>
          ) : merchants.length === 0 ? (
            <Empty description="Belum ada data Mitra Dalam Negeri" />
          ) : (
            <Row gutter={[16, 16]}>
              {merchants.map((m) => (
                <Col key={m.id} xs={24} sm={12} md={12} lg={8} xl={6}>
                  <MerchantCard
                    m={m}
                    onView={() => setView(m)}
                    onEdit={() => {
                      setMode("edit");
                      setEditing(m);
                      setModalOpen(true);
                    }}
                    onDelete={async () => {
                      const { ok, error: err } = await deleteMerchant(m.id);
                      if (ok) {
                        notification.success({
                          message: "Mitra Dalam Negeri dihapus",
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

        {/* Pagination */}
        <Card
          bodyStyle={{ padding: 12 }}
          style={{ ...darkCardStyle, marginTop: 12, marginBottom: 0 }}
        >
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Pagination
              current={page}
              total={total}
              pageSize={perPage}
              showSizeChanger={false}
              onChange={(p) => {
                setPage(p);
                fetchMerchants({ page: p, perPage, q });
              }}
            />
          </div>
        </Card>

        {/* Modals */}
        <MerchantViewModal
          open={!!view}
          data={view}
          onClose={() => setView(null)}
        />
        <MerchantFormModal
          open={modalOpen}
          mode={mode}
          initialValues={useMemo(() => {
            if (!editing) return {};
            return {
              merchant_name: editing.merchant_name || "",
              about: editing.about || "",
              address: editing.address || "",
              email: editing.email || "",
              phone: editing.phone || "",
              instagram: editing.instagram || "",
              twitter: editing.twitter || "",
              website: editing.website || "",
              mou_url: editing.mou_url || "",
              image_url: editing.image_url || "",
            };
          }, [editing])}
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














