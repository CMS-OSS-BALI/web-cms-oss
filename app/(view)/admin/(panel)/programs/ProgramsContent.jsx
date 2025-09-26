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
import { PlusOutlined, EyeOutlined } from "@ant-design/icons";
import HtmlEditor from "@/app/components/editor/HtmlEditor";
import { sanitizeHtml } from "@/app/utils/dompurify";

const { Title, Text, Paragraph } = Typography;

/** Enums */
const PROGRAM_TYPES = ["B2B", "B2C"];
const PROGRAM_CATEGORIES = [
  "STUDY_ABROAD",
  "WORK_ABROAD",
  "LANGUAGE_COURSE",
  "CONSULTANT_VISA",
];
const CATEGORY_LABEL = {
  STUDY_ABROAD: "Study Abroad",
  WORK_ABROAD: "Work Abroad",
  LANGUAGE_COURSE: "Language Course",
  CONSULTANT_VISA: "Consultant Visa",
};

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

/* ===== Theme constants ===== */
const CARD_BG = "rgba(11, 18, 35, 0.94)";
const darkCardStyle = {
  background: CARD_BG,
  border: "1px solid #2f3f60",
  borderRadius: 16,
  boxShadow: "0 10px 24px rgba(2,6,23,.35)",
};

/* ===== Form Modal ===== */
function ProgramFormModal({
  open,
  mode,
  initialValues,
  saving,
  onCancel,
  onSubmit,
}) {
  const [form] = Form.useForm();
  const isCreate = mode === "create";

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue({
      is_published: true,
      program_type: "B2B",
      program_category: "STUDY_ABROAD",
      price: 0,
      ...initialValues,
    });
  }, [open, initialValues, form]);

  const handleFinish = (values) => {
    const payload = {
      // kolom utama
      image_url: values.image_url?.trim() || null,
      program_type: values.program_type, // "B2B" | "B2C"
      program_category: values.program_category, // enum kategori
      price:
        values.price === "" ||
        values.price === null ||
        values.price === undefined
          ? null
          : Number(parseThousands(String(values.price))),
      phone: values.phone?.trim() || null,
      is_published: !!values.is_published,
      // trans indonesia (API: name_id & description_id)
      name_id: values.name_id?.trim(),
      description_id: values.description_id || "",
      // biar auto EN aktif default (server: autoTranslate default true saat POST)
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

  // Rules helpers
  const reqText = (label) =>
    isCreate
      ? [{ required: true, whitespace: true, message: `${label} wajib diisi` }]
      : [];
  const reqNumber = (label) =>
    isCreate
      ? [
          { required: true, message: `${label} wajib diisi` },
          { type: "number", min: 0, message: `${label} harus ≥ 0` },
        ]
      : [];
  const reqSelect = (label, list) =>
    isCreate
      ? [
          { required: true, message: `${label} wajib diisi` },
          {
            validator: (_, v) =>
              typeof v === "string" && list.includes(v)
                ? Promise.resolve()
                : Promise.reject(new Error(`${label} tidak valid`)),
          },
        ]
      : [];
  const reqStatus = (label) =>
    isCreate
      ? [
          {
            validator: (_, v) =>
              v === true || v === false
                ? Promise.resolve()
                : Promise.reject(new Error(`${label} wajib diisi`)),
          },
        ]
      : [];

  return (
    <Modal
      title={mode === "edit" ? "Edit Program" : "Add Program"}
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
              {/* Name (ID) */}
              <Col xs={24} md={12}>
                <Form.Item
                  name="name_id"
                  label="Name (Bahasa Indonesia)"
                  rules={reqText("Name (ID)")}
                >
                  <Input maxLength={191} style={ctrlStyle} />
                </Form.Item>
              </Col>

              {/* Program Type */}
              <Col xs={24} md={12}>
                <Form.Item
                  name="program_type"
                  label="Program Type"
                  rules={reqSelect("Program Type", PROGRAM_TYPES)}
                >
                  <Select
                    placeholder="—"
                    options={PROGRAM_TYPES.map((t) => ({ value: t, label: t }))}
                    style={ctrlStyle}
                  />
                </Form.Item>
              </Col>

              {/* Program Category */}
              <Col xs={24} md={12}>
                <Form.Item
                  name="program_category"
                  label="Program Category"
                  rules={reqSelect("Program Category", PROGRAM_CATEGORIES)}
                >
                  <Select
                    placeholder="—"
                    options={PROGRAM_CATEGORIES.map((c) => ({
                      value: c,
                      label: CATEGORY_LABEL[c],
                    }))}
                    style={ctrlStyle}
                  />
                </Form.Item>
              </Col>

              {/* Price */}
              <Col xs={24} md={12}>
                <Form.Item
                  name="price"
                  label="Price (Rp)"
                  rules={reqNumber("Price")}
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

              {/* Phone */}
              <Col xs={24} md={12}>
                <Form.Item name="phone" label="Phone" rules={reqText("Phone")}>
                  <Input placeholder="0812xxxxxxx" style={ctrlStyle} />
                </Form.Item>
              </Col>

              {/* Image URL */}
              <Col xs={24} md={12}>
                <Form.Item
                  name="image_url"
                  label="Image URL"
                  rules={reqText("Image URL")}
                >
                  <Input placeholder="https://..." style={ctrlStyle} />
                </Form.Item>
              </Col>

              {/* Description (ID) */}
              <Col span={24}>
                <Form.Item
                  name="description_id"
                  label="Description (Bahasa Indonesia)"
                  rules={reqText("Description (ID)")}
                  valuePropName="value"
                  getValueFromEvent={(val) => val}
                >
                  <HtmlEditor
                    className="editor-dark"
                    variant="mini"
                    minHeight={200}
                  />
                </Form.Item>
              </Col>

              {/* Status */}
              <Col span={24}>
                <Form.Item
                  name="is_published"
                  label="Status"
                  rules={reqStatus("Status")}
                >
                  <Select
                    options={[
                      { value: true, label: "Published" },
                      { value: false, label: "Draft" },
                    ]}
                    style={ctrlStyle}
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
function ProgramViewModal({ open, data, onClose }) {
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
          dangerouslySetInnerHTML={{
            __html: sanitizeHtml(data.description ?? ""),
          }}
        />
      ),
    });
  if (data?.phone) rows.push({ label: "Phone", content: data.phone });
  rows.push({
    label: "Status",
    content: data?.is_published ? "Published" : "Draft",
  });
  rows.push({
    label: "Price",
    content:
      data?.price == null
        ? "—"
        : `Rp ${new Intl.NumberFormat("id-ID").format(Number(data.price))}`,
  });
  rows.push({
    label: "Created At",
    content: data?.created_at
      ? new Date(data.created_at).toLocaleString()
      : "—",
  });

  return (
    <Modal
      open={open}
      onCancel={onClose}
      centered
      width={960}
      title={data?.name || "Detail Program"}
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
            src={data?.image_url || PLACEHOLDER}
            alt={data?.name}
            width="100%"
            style={{
              borderRadius: 10,
              marginBottom: 12,
              maxHeight: 320,
              objectFit: "cover",
            }}
            fallback={PLACEHOLDER}
            preview={!!data?.image_url}
          />

          <Space size={[8, 8]} wrap style={{ marginBottom: 16 }}>
            {data?.program_type && <Tag style={chip}>{data.program_type}</Tag>}
            {data?.program_category && (
              <Tag style={chip}>
                {CATEGORY_LABEL[data.program_category] || data.program_category}
              </Tag>
            )}
            <Tag style={chip}>{data?.is_published ? "Published" : "Draft"}</Tag>
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

/* ===== Program Card ===== */
function ProgramCard({ p, onView, onEdit, onDelete }) {
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

  const desc =
    (p.description || "").replace(/^["“”']+|["“”']+$/g, "").trim() || "—";

  return (
    <Card
      hoverable
      style={{ ...darkCardStyle, overflow: "hidden" }}
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
            src={p.image_url || PLACEHOLDER}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = PLACEHOLDER;
            }}
          />
          {p.program_type && (
            <span style={{ ...badgeStyle, right: 8 }}>{p.program_type}</span>
          )}
          {p.program_category && (
            <span style={{ ...badgeStyle, right: 8, top: 36 }}>
              {CATEGORY_LABEL[p.program_category] || p.program_category}
            </span>
          )}
        </div>
      }
    >
      <div
        style={{ display: "grid", gap: 6, gridTemplateRows: "auto auto auto" }}
      >
        <Text
          strong
          ellipsis={{ tooltip: p.name }}
          style={{ fontSize: 14, display: "block", lineHeight: 1.35 }}
        >
          {p.name}
        </Text>

        <div style={{ minHeight: "calc(1.45em * 3)" }}>
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
              __html: sanitizeHtml(desc),
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {p.price != null && (
            <>
              <Text strong style={{ fontSize: 12 }}>
                Price:
              </Text>
              <Text style={{ fontSize: 12 }}>
                Rp {new Intl.NumberFormat("id-ID").format(Number(p.price))}
              </Text>
            </>
          )}
          <Tag
            color={p.is_published ? "success" : "default"}
            style={{ marginLeft: "auto" }}
          >
            {p.is_published ? "Published" : "Draft"}
          </Tag>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          marginTop: 12,
          flexWrap: "nowrap",
          paddingBottom: 2,
        }}
      >
        <div style={{ flex: 1 }}>
          <Button
            type="primary"
            size="small"
            shape="round"
            block
            onClick={onView}
            icon={<EyeOutlined />}
          >
            View
          </Button>
        </div>
        <div style={{ flex: 1 }}>
          <Button size="small" shape="round" block onClick={onEdit}>
            Edit
          </Button>
        </div>
        <div style={{ flex: 1 }}>
          <Popconfirm
            title="Hapus program?"
            description="Tindakan ini tidak dapat dibatalkan."
            okText="Hapus"
            okButtonProps={{ danger: true }}
            placement="topRight"
            onConfirm={onDelete}
          >
            <Button danger size="small" shape="round" block>
              Delete
            </Button>
          </Popconfirm>
        </div>
      </div>
    </Card>
  );
}

/* ===== Main ===== */
export default function ProgramsContent(props) {
  const {
    loading,
    programs = [],
    q,
    setQ,
    programType,
    setProgramType,
    programCategory,
    setProgramCategory,
    published,
    setPublished,
    page,
    setPage,
    perPage,
    setPerPage,
    total = 0,
    error,
    fetchPrograms,
    createProgram,
    updateProgram,
    deleteProgram,
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
        key: "program-error",
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
    try {
      if (mode === "edit") {
        await updateProgram(editing.id, payload);
        api.success({
          key: "program-save",
          message: "Program diperbarui",
          description: "Data telah tersimpan.",
          placement: "topRight",
        });
      } else {
        await createProgram(payload);
        api.success({
          key: "program-save",
          message: "Program ditambahkan",
          description: "Data telah tersimpan.",
          placement: "topRight",
        });
      }
      setModalOpen(false);
      setEditing(null);
    } catch (e) {
      api.error({
        key: "program-save",
        message: "Gagal menyimpan",
        description: e?.message || "Silakan coba lagi.",
        placement: "topRight",
      });
    } finally {
      setSaving(false);
    }
  };

  const triggerSearch = (nextQ = q) => {
    const normalized = (nextQ ?? "").trim();
    if (normalized !== q) setQ(normalized);
    fetchPrograms({
      page: 1,
      q: normalized,
      programType,
      programCategory,
      published,
      perPage,
    });
  };

  const onSearch = () => triggerSearch();

  const onReset = () => {
    setQ("");
    setProgramType(undefined);
    setProgramCategory(undefined);
    setPublished(undefined);
    triggerSearch("");
  };

  const onPageChange = (p) => {
    setPage(p);
    fetchPrograms({
      page: p,
      perPage,
      q,
      programType,
      programCategory,
      published,
    });
  };

  const initialValues = useMemo(() => {
    if (!editing)
      return {
        is_published: true,
        program_type: "B2B",
        program_category: "STUDY_ABROAD",
        price: 0,
      };
    return {
      // indonesia (untuk edit, ambil dari name/description terpilih di list)
      name_id: editing.name || "",
      description_id: editing.description || "",
      // utama
      program_type: editing.program_type || "B2B",
      program_category: editing.program_category || "STUDY_ABROAD",
      price: editing.price == null ? null : Number(editing.price),
      phone: editing.phone || "",
      image_url: editing.image_url || "",
      is_published: !!editing.is_published,
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
          styles={{ body: { padding: 16 } }}
          style={{ ...darkCardStyle, marginBottom: 12 }}
        >
          <Space
            align="center"
            style={{ width: "100%", justifyContent: "space-between" }}
          >
            <div>
              <Title level={3} style={{ margin: 0 }}>
                Programs
              </Title>
              <Text type="secondary">
                Kelola data program. Total {total} records.
              </Text>
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              shape="round"
              onClick={openCreate}
            >
              Add Program
            </Button>
          </Space>
        </Card>

        {/* Filters */}
        <Card
          styles={{ body: { padding: 10 } }}
          style={{ ...darkCardStyle, marginBottom: 12 }}
        >
          <Form
            layout="inline"
            size="small"
            onFinish={onSearch}
            style={{ display: "block" }}
          >
            <Row
              gutter={[8, 8]}
              align="middle"
              wrap={false} // ⬅ penting: jangan bungkus ke baris baru
              style={{ overflowX: "auto", paddingBottom: 2 }} // ⬅ kalau layar sempit: bisa geser horizontal
            >
              {/* Search */}
              <Col flex="1 1 360px" style={{ minWidth: 260 }}>
                <Input.Search
                  allowClear
                  size="small"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onSearch={triggerSearch}
                  placeholder="Cari nama/desc/phone…"
                  enterButton
                />
              </Col>

              {/* Program Type */}
              <Col flex="0 0 160px">
                <Select
                  allowClear
                  size="small"
                  placeholder="Type"
                  value={programType}
                  onChange={(v) => setProgramType(v)}
                  options={PROGRAM_TYPES.map((t) => ({ value: t, label: t }))}
                  style={{ width: "100%" }}
                />
              </Col>

              {/* Program Category */}
              <Col flex="0 0 200px">
                <Select
                  allowClear
                  size="small"
                  placeholder="Category"
                  value={programCategory}
                  onChange={(v) => setProgramCategory(v)}
                  options={PROGRAM_CATEGORIES.map((c) => ({
                    value: c,
                    label: CATEGORY_LABEL[c],
                  }))}
                  style={{ width: "100%" }}
                />
              </Col>

              {/* Published */}
              <Col flex="0 0 140px">
                <Select
                  allowClear
                  size="small"
                  placeholder="Status"
                  value={
                    published === undefined ? undefined : published ? "1" : "0"
                  }
                  onChange={(v) =>
                    setPublished(v === undefined ? undefined : v === "1")
                  }
                  options={[
                    { value: "1", label: "Published" },
                    { value: "0", label: "Draft" },
                  ]}
                  style={{ width: "100%" }}
                />
              </Col>

              {/* Per page */}
              <Col flex="0 0 110px">
                <Select
                  size="small"
                  value={perPage}
                  onChange={(v) => {
                    setPerPage(v);
                    setPage(1);
                    fetchPrograms({
                      page: 1,
                      perPage: v,
                      q,
                      programType,
                      programCategory,
                      published,
                    });
                  }}
                  options={[8, 16, 32, 64, 128].map((n) => ({
                    value: n,
                    label: n,
                  }))}
                  style={{ width: "100%" }}
                  placeholder="Per page"
                />
              </Col>

              {/* Actions */}
              <Col flex="0 0 auto">
                <Space>
                  <Button size="small" shape="round" onClick={onReset}>
                    Reset
                  </Button>
                  <Button
                    size="small"
                    shape="round"
                    type="primary"
                    htmlType="submit"
                  >
                    Search
                  </Button>
                </Space>
              </Col>
            </Row>
          </Form>
        </Card>

        {/* Cards */}
        <Card styles={{ body: { padding: 16 } }} style={{ ...darkCardStyle }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <Spin />
            </div>
          ) : programs.length === 0 ? (
            <Empty description="Belum ada data program" />
          ) : (
            <Row gutter={[16, 16]}>
              {programs.map((p) => (
                <Col key={p.id} xs={24} sm={12} md={12} lg={8} xl={6}>
                  <ProgramCard
                    p={p}
                    onView={() => setView(p)}
                    onEdit={() => openEdit(p)}
                    onDelete={async () => {
                      try {
                        await deleteProgram(p.id);
                        api.success({
                          key: "program-delete",
                          message: "Program dihapus",
                          description: "Data berhasil dihapus.",
                          placement: "topRight",
                        });
                      } catch (err) {
                        api.error({
                          key: "program-delete",
                          message: "Gagal menghapus",
                          description: err?.message || "Silakan coba lagi.",
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

        {/* View & Form Modals */}
        <ProgramViewModal
          open={!!view}
          data={view}
          onClose={() => setView(null)}
        />
        <ProgramFormModal
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
