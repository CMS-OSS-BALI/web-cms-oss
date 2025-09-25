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
  InputNumber,
  Modal,
  notification,
  Pagination,
  Popconfirm,
  Row,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  theme as antdTheme,
} from "antd";
import { PlusOutlined, EyeOutlined, LinkOutlined } from "@ant-design/icons";
import HtmlEditor from "@/../app/components/editor/HtmlEditor";
import { sanitizeHtml } from "@/app/utils/dompurify";

const { Title, Text, Paragraph } = Typography;

const TYPES = ["DOMESTIC", "FOREIGN"];
const PLACEHOLDER =
  "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=1200&auto=format&fit=crop";

/* ===== Helpers ===== */
const fmtThousands = (value) => {
  if (value === undefined || value === null || value === "") return "";
  const [int, dec] = String(value).split(".");
  const withDots = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return dec ? `${withDots},${dec}` : withDots;
};
const parseThousands = (value = "") =>
  value.replace(/\./g, "").replace(/,/g, ".");
const clean = (v) => (v === "" || v === undefined ? null : v);
const toNum = (v) =>
  v === "" || v === undefined || v === null ? null : Number(v);

/* ===== Theme ===== */
const CARD_BG = "rgba(11, 18, 35, 0.94)";
const darkCardStyle = {
  background: CARD_BG,
  border: "1px solid #2f3f60",
  borderRadius: 16,
  boxShadow: "0 10px 24px rgba(2,6,23,.35)",
};

/* ===== Form Modal ===== */
function PartnerFormModal({
  open,
  mode,
  initialValues,
  saving,
  onCancel,
  onSubmit,
}) {
  const [form] = Form.useForm();
  const isCreate = mode !== "edit"; // saat create semua field dianggap wajib

  const req = (msg) => (isCreate ? [{ required: true, message: msg }] : []);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue({ currency: "USD", ...initialValues });
  }, [open, initialValues, form]);

  const handleFinish = (values) => {
    const payload = {
      name: values.name,
      type: clean(values.type)?.toUpperCase(),
      country: clean(values.country),
      city: clean(values.city),
      state: clean(values.state),
      address: clean(values.address),
      postal_code: clean(values.postal_code),
      website: clean(values.website),
      logo_url: clean(values.logo_url),
      mou_url: clean(values.mou_url),
      currency: (clean(values.currency) || "USD").toUpperCase().slice(0, 3),
      tuition_min: toNum(values.tuition_min),
      tuition_max: toNum(values.tuition_max),
      living_cost_estimate: toNum(values.living_cost_estimate),
      description: clean(values.description),
      contact:
        values.contact_person || values.contact_email || values.contact_phone
          ? {
              person: clean(values.contact_person),
              email: clean(values.contact_email),
              phone: clean(values.contact_phone),
            }
          : null,
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
      title={mode === "edit" ? "Edit Partner" : "Add Partner"}
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
              <Col xs={24} md={12}>
                <Form.Item
                  name="name"
                  label="Name"
                  required={isCreate}
                  rules={req("Nama wajib diisi")}
                >
                  <Input maxLength={191} style={ctrlStyle} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="type"
                  label="Type"
                  required={isCreate}
                  rules={req("Type wajib diisi")}
                >
                  <Select
                    placeholder="—"
                    options={TYPES.map((t) => ({ value: t, label: t }))}
                    style={ctrlStyle}
                  />
                </Form.Item>
              </Col>

              <Col span={24}>
                <Form.Item
                  name="description"
                  label="Description"
                  required={isCreate}
                  rules={req("Description wajib diisi")}
                >
                  <HtmlEditor
                    className="editor-dark"
                    variant="mini"
                    minHeight={200}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  name="country"
                  label="Country"
                  required={isCreate}
                  rules={req("Country wajib diisi")}
                >
                  <Input maxLength={128} style={ctrlStyle} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="state"
                  label="State/Province"
                  required={isCreate}
                  rules={req("State/Province wajib diisi")}
                >
                  <Input maxLength={100} style={ctrlStyle} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="city"
                  label="City"
                  required={isCreate}
                  rules={req("City wajib diisi")}
                >
                  <Input maxLength={100} style={ctrlStyle} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="postal_code"
                  label="Postal Code"
                  required={isCreate}
                  rules={req("Postal Code wajib diisi")}
                >
                  <Input maxLength={20} style={ctrlStyle} />
                </Form.Item>
              </Col>

              <Col span={24}>
                <Form.Item
                  name="address"
                  label="Address"
                  required={isCreate}
                  rules={req("Address wajib diisi")}
                >
                  <Input.TextArea
                    rows={4}
                    style={{ ...ctrlStyle, resize: "vertical" }}
                  />
                </Form.Item>
              </Col>

              <Col span={24}>
                <Form.Item
                  name="website"
                  label="Website"
                  required={isCreate}
                  rules={req("Website wajib diisi")}
                >
                  <Input placeholder="https://example.com" style={ctrlStyle} />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item
                  name="logo_url"
                  label="Logo URL"
                  required={isCreate}
                  rules={req("Logo URL wajib diisi")}
                >
                  <Input placeholder="https://..." style={ctrlStyle} />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item
                  name="mou_url"
                  label="MOU URL"
                  required={isCreate}
                  rules={req("MOU URL wajib diisi")}
                >
                  <Input placeholder="https://..." style={ctrlStyle} />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  name="currency"
                  label="Currency (3 letters)"
                  required={isCreate}
                  rules={req("Currency wajib diisi")}
                >
                  <Input
                    maxLength={3}
                    placeholder="USD"
                    style={ctrlStyle}
                    onChange={(e) =>
                      form.setFieldsValue({
                        currency: e.target.value.toUpperCase().slice(0, 3),
                      })
                    }
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="tuition_min"
                  label="Tuition Min"
                  required={isCreate}
                  rules={req("Tuition Min wajib diisi")}
                >
                  <InputNumber
                    min={0}
                    step={1}
                    style={{ width: "100%", ...ctrlStyle }}
                    formatter={fmtThousands}
                    parser={parseThousands}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="tuition_max"
                  label="Tuition Max"
                  required={isCreate}
                  rules={req("Tuition Max wajib diisi")}
                >
                  <InputNumber
                    min={0}
                    step={1}
                    style={{ width: "100%", ...ctrlStyle }}
                    formatter={fmtThousands}
                    parser={parseThousands}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="living_cost_estimate"
                  label="Living Cost Estimate"
                  required={isCreate}
                  rules={req("Living Cost Estimate wajib diisi")}
                >
                  <InputNumber
                    min={0}
                    step={1}
                    style={{ width: "100%", ...ctrlStyle }}
                    formatter={fmtThousands}
                    parser={parseThousands}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  name="contact_person"
                  label="Contact Person"
                  required={isCreate}
                  rules={req("Contact Person wajib diisi")}
                >
                  <Input style={ctrlStyle} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="contact_email"
                  label="Contact Email"
                  required={isCreate}
                  rules={[
                    ...req("Contact Email wajib diisi"),
                    { type: "email", message: "Email tidak valid" },
                  ]}
                >
                  <Input style={ctrlStyle} />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item
                  name="contact_phone"
                  label="Contact Phone"
                  required={isCreate}
                  rules={req("Contact Phone wajib diisi")}
                >
                  <Input placeholder="+62..." style={ctrlStyle} />
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
function PartnerViewModal({ open, data, onClose }) {
  const websiteUrl = data?.website
    ? /^https?:\/\//i.test(data.website)
      ? data.website
      : `https://${data.website}`
    : null;
  const mouUrl = data?.mou_url
    ? /^https?:\/\//i.test(data.mou_url)
      ? data.mou_url
      : `https://${data.mou_url}`
    : null;

  const chip = {
    borderColor: "#2f3f60",
    background: "rgba(255,255,255,0.06)",
    color: "#cfe3ff",
    borderRadius: 9999,
    padding: "2px 8px",
    fontSize: 11,
  };

  const rows = [];
  if (data?.description)
    rows.push({
      label: "Description",
      content: (
        <div
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(data.description ?? "") }}
        />
      ),
    });
  const locParts = [data?.city, data?.state, data?.country].filter(Boolean);
  if (locParts.length)
    rows.push({ label: "Location", content: locParts.join(", ") });
  if (data?.address) rows.push({ label: "Address", content: data.address });
  if (data?.postal_code)
    rows.push({ label: "Postal Code", content: data.postal_code });
  if (websiteUrl)
    rows.push({
      label: "Website",
      content: (
        <a href={websiteUrl} target="_blank" rel="noreferrer">
          {websiteUrl} <LinkOutlined />
        </a>
      ),
    });
  if (mouUrl)
    rows.push({
      label: "MOU",
      content: (
        <a href={mouUrl} target="_blank" rel="noreferrer">
          {mouUrl} <LinkOutlined />
        </a>
      ),
    });
  if (data?.tuition_min != null || data?.tuition_max != null) {
    rows.push({
      label: "Tuition",
      content: `${(
        data?.currency || "USD"
      ).toUpperCase()} ${new Intl.NumberFormat("id-ID").format(
        data?.tuition_min ?? 0
      )} – ${new Intl.NumberFormat("id-ID").format(data?.tuition_max ?? 0)}`,
    });
  }
  if (data?.living_cost_estimate != null) {
    rows.push({
      label: "Living Cost Estimate",
      content: `${(
        data?.currency || "USD"
      ).toUpperCase()} ${new Intl.NumberFormat("id-ID").format(
        data?.living_cost_estimate ?? 0
      )}`,
    });
  }
  if (data?.contact?.person || data?.contact?.email || data?.contact?.phone) {
    rows.push({
      label: "Contact",
      content: (
        <>
          {data?.contact?.person && <span>{data.contact.person}</span>}
          {data?.contact?.email && (
            <>
              {data?.contact?.person ? " · " : ""}
              <a href={`mailto:${data.contact.email}`}>{data.contact.email}</a>
            </>
          )}
          {data?.contact?.phone && (
            <>
              {data?.contact?.person || data?.contact?.email ? " · " : ""}
              <a href={`tel:${data.contact.phone}`}>{data.contact.phone}</a>
            </>
          )}
        </>
      ),
    });
  }

  return (
    <Modal
      open={open}
      onCancel={onClose}
      centered
      width={960}
      title={data?.name || "Detail Partner"}
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
            src={data?.logo_url || PLACEHOLDER}
            alt={data?.name}
            width="100%"
            style={{
              borderRadius: 10,
              marginBottom: 12,
              maxHeight: 320,
              objectFit: "cover",
            }}
          />
          <Space size={[8, 8]} wrap style={{ marginBottom: 16 }}>
            {data?.type && <Tag style={chip}>{data.type}</Tag>}
            {data?.country && <Tag style={chip}>{data.country}</Tag>}
          </Space>
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

/* ===== Card ===== */
function PartnerCard({ p, onView, onEdit, onDelete }) {
  const websiteUrl = p.website
    ? /^https?:\/\//i.test(p.website)
      ? p.website
      : `https://${p.website}`
    : null;

  const badgeStyle = {
    position: "absolute",
    top: 8,
    right: 8,
    padding: "2px 10px",
    borderRadius: 9999,
    fontSize: 11,
    fontWeight: 700,
    color: "#fff",
    background: "rgba(15,23,42,.7)",
    border: "1px solid rgba(255,255,255,.35)",
    boxShadow: "0 6px 14px rgba(0,0,0,.25)",
  };
  const locationLabel = [p.city, p.state, p.country]
    .filter(Boolean)
    .join(", ") || "-";
  const cleanedDesc = (p.description || "")
    .replace(/^[`"'\s]+|[`"'\s]+$/g, "")
    .trim();
  const safeDesc = sanitizeHtml(cleanedDesc || "");
  const plainDesc = safeDesc.replace(/<[^>]*>/g, "").trim();
  const hasDesc = plainDesc.length > 0;


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
            alt={p.name}
            src={p.logo_url || PLACEHOLDER}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = PLACEHOLDER;
            }}
          />
          {p.type && <span style={badgeStyle}>{p.type}</span>}
        </div>
      }
    >
      <div
        style={{
          display: "grid",
          gridTemplateRows: "auto auto auto auto",
          gap: 6,
          minHeight: 160,
        }}
      >
        <Text strong style={{ fontSize: 14 }}>
          {p.name}
        </Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {locationLabel}
        </Text>
        <div style={{ minHeight: "calc(1.3em * 2)" }}>
          {hasDesc ? (
            <div
              title={plainDesc || undefined}
              style={{
                margin: 0,
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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <Text strong style={{ fontSize: 12 }}>
            Tuition:
          </Text>
          <Text style={{ fontSize: 12 }}>
            {p.tuition_min != null || p.tuition_max != null
              ? `${(p.currency || "USD").toUpperCase()} ${new Intl.NumberFormat(
                  "id-ID"
                ).format(p.tuition_min ?? 0)} – ${new Intl.NumberFormat(
                  "id-ID"
                ).format(p.tuition_max ?? 0)}`
              : "—"}
          </Text>
          {websiteUrl && (
            <Button
              icon={<LinkOutlined />}
              size="small"
              shape="round"
              href={websiteUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                borderColor: "#2f3f60",
                background: "rgba(255,255,255,.04)",
              }}
            >
              {p.website.replace(/^https?:\/\//i, "")}
            </Button>
          )}
        </div>
      </div>

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
          title="Hapus partner?"
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
export default function PartnersContent(props) {
  const {
    loading,
    partners = [],
    q,
    setQ,
    country,
    setCountry,
    type,
    setType,
    page,
    setPage,
    perPage,
    setPerPage,
    total = 0,
    error,
    // message — sengaja tidak dipakai agar tidak dobel notifikasi
    fetchPartners,
    createPartner,
    updatePartner,
    deletePartner: deletePartnerVm,
  } = props;

  const [api, contextHolder] = notification.useNotification();

  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState("create");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [view, setView] = useState(null);

  // hanya tampilkan error global
  useEffect(() => {
    if (error) {
      api.error({
        key: "partner-error",
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
  const openEdit = (p) => {
    setMode("edit");
    setEditing(p);
    setModalOpen(true);
  };

  const handleSubmit = async (payload) => {
    setSaving(true);
    const res =
      mode === "edit"
        ? await updatePartner(editing.id, payload)
        : await createPartner(payload);
    setSaving(false);

    if (res?.ok) {
      api.success({
        key: "partner-save",
        message: mode === "edit" ? "Partner diperbarui" : "Partner ditambahkan",
        description: "Data telah tersimpan.",
        placement: "topRight",
      });
      setModalOpen(false);
      setEditing(null);
    } else {
      api.error({
        key: "partner-save",
        message: "Gagal menyimpan",
        description: res?.error || "Silakan coba lagi.",
        placement: "topRight",
      });
    }
  };

  const onSearch = () => fetchPartners({ page: 1, q, country, type, perPage });
  const onReset = () => {
    setQ("");
    setCountry("");
    setType("");
    fetchPartners({ page: 1, q: "", country: "", type: "", perPage });
  };

  const onPageChange = (p) => {
    setPage(p);
    fetchPartners({ page: p, perPage, q, country, type });
  };

  const initialValues = useMemo(() => {
    if (!editing) return { currency: "USD" };
    return {
      name: editing.name || "",
      type: editing.type || undefined,
      country: editing.country || "",
      city: editing.city || "",
      state: editing.state || "",
      address: editing.address || "",
      postal_code: editing.postal_code || "",
      website: editing.website || "",
      logo_url: editing.logo_url || "",
      mou_url: editing.mou_url || "",
      currency: (editing.currency || "USD").toUpperCase(),
      tuition_min:
        editing.tuition_min == null ? null : Number(editing.tuition_min),
      tuition_max:
        editing.tuition_max == null ? null : Number(editing.tuition_max),
      living_cost_estimate:
        editing.living_cost_estimate == null
          ? null
          : Number(editing.living_cost_estimate),
      description: editing.description || "",
      contact_person: editing.contact?.person || "",
      contact_email: editing.contact?.email || "",
      contact_phone: editing.contact?.phone || "",
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
          styles={{ body: { padding: 16 } }}
          style={{ ...darkCardStyle, marginBottom: 12 }}
        >
          <Space
            align="center"
            style={{ width: "100%", justifyContent: "space-between" }}
          >
            <div>
              <Title level={3} style={{ margin: 0 }}>
                Partners
              </Title>
              <Text type="secondary">
                Kelola data partner. Total {total} records.
              </Text>
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              shape="round"
              onClick={openCreate}
            >
              Add Partner
            </Button>
          </Space>
        </Card>

        <Card
          styles={{ body: { padding: 12 } }}
          style={{ ...darkCardStyle, marginBottom: 12 }}
        >
          <Form
            layout="inline"
            onFinish={onSearch}
            style={{ display: "block" }}
          >
            <Row gutter={[8, 8]} align="middle" wrap>
              <Col xs={24} md={12} style={{ flex: "1 1 auto" }}>
                <Input.Search
                  allowClear
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Cari nama/kota/negara…"
                  enterButton
                />
              </Col>
              <Col xs={24} sm={12} md={8} lg={6} xl={5}>
                <Input
                  allowClear
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="ID / US / SG"
                />
              </Col>
              <Col xs={24} sm={12} md={8} lg={6} xl={5}>
                <Select
                  allowClear
                  placeholder="Type"
                  value={type || undefined}
                  onChange={(v) => {
                    setType(v ?? "");
                    setPage(1);
                    fetchPartners({
                      page: 1,
                      type: v ?? "",
                      q,
                      country,
                      perPage,
                    });
                  }}
                  options={TYPES.map((t) => ({ value: t, label: t }))}
                  style={{ width: "100%" }}
                />
              </Col>
              <Col xs={24} sm={8} md={6} lg={4} xl={3}>
                <Select
                  value={perPage}
                  onChange={(v) => {
                    setPerPage(v);
                    setPage(1);
                    fetchPartners({ page: 1, perPage: v, q, country, type });
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

        <Card styles={{ body: { padding: 16 } }} style={{ ...darkCardStyle }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <Spin />
            </div>
          ) : partners.length === 0 ? (
            <Empty description="Belum ada data partner" />
          ) : (
            <Row gutter={[16, 16]}>
              {partners.map((p) => (
                <Col key={p.id} xs={24} sm={12} md={12} lg={8} xl={6}>
                  <PartnerCard
                    p={p}
                    onView={() => setView(p)}
                    onEdit={() => openEdit(p)}
                    onDelete={async () => {
                      const { ok, error: err } = await deletePartnerVm(p.id);
                      if (ok) {
                        notification.success({
                          message: "Partner dihapus",
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
          styles={{ body: { padding: 12 } }}
          style={{ ...darkCardStyle, marginTop: 12, marginBottom: 0 }}
        >
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Pagination
              current={page}
              total={total}
              pageSize={perPage}
              showSizeChanger={false}
              onChange={onPageChange}
            />
          </div>
        </Card>

        <PartnerViewModal
          open={!!view}
          data={view}
          onClose={() => setView(null)}
        />
        <PartnerFormModal
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
