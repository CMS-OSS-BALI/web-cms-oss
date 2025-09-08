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

const { Title, Text, Paragraph } = Typography;

const CATEGORIES = ["B2B", "B2C"];
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
      program_category: "B2B",
      price: 0,
      ...initialValues,
    });
  }, [open, initialValues, form]);

  const handleFinish = (values) => {
    const payload = {
      name: values.name?.trim(),
      description: values.description?.trim(),
      image_url: values.image_url?.trim(),
      program_category: values.program_category,
      price: Number(values.price),
      phone: values.phone?.trim(),
      is_published: !!values.is_published,
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
  const reqCategory = (label) =>
    isCreate
      ? [
          { required: true, message: `${label} wajib diisi` },
          {
            validator: (_, v) =>
              typeof v === "string" && CATEGORIES.includes(v)
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
      destroyOnClose
    >
      <div className="form-scroll">
        <div style={{ padding: 16 }}>
          <Form layout="vertical" form={form} onFinish={handleFinish}>
            <Row gutter={[12, 8]}>
              <Col xs={24} md={12}>
                <Form.Item name="name" label="Name" rules={reqText("Name")}>
                  <Input maxLength={191} style={ctrlStyle} />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  name="program_category"
                  label="Category"
                  rules={reqCategory("Category")}
                >
                  <Select
                    placeholder="—"
                    options={CATEGORIES.map((t) => ({ value: t, label: t }))}
                    style={ctrlStyle}
                  />
                </Form.Item>
              </Col>

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

              <Col xs={24} md={12}>
                <Form.Item name="phone" label="Phone" rules={reqText("Phone")}>
                  <Input placeholder="0812xxxxxxx" style={ctrlStyle} />
                </Form.Item>
              </Col>

              <Col span={24}>
                <Form.Item
                  name="image_url"
                  label="Image URL"
                  rules={reqText("Image URL")}
                >
                  <Input placeholder="https://..." style={ctrlStyle} />
                </Form.Item>
              </Col>

              <Col span={24}>
                <Form.Item
                  name="description"
                  label="Description"
                  rules={reqText("Description")}
                >
                  <Input.TextArea
                    rows={4}
                    style={{ ...ctrlStyle, resize: "vertical" }}
                  />
                </Form.Item>
              </Col>

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
    rows.push({ label: "Description", content: data.description });
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
      destroyOnClose
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
          />

          <Space size={[8, 8]} wrap style={{ marginBottom: 16 }}>
            {data?.program_category && (
              <Tag style={chip}>{data.program_category}</Tag>
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
            alt={p.name}
            src={p.image_url || PLACEHOLDER}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = PLACEHOLDER;
            }}
          />
          {p.program_category && (
            <span style={badgeStyle}>{p.program_category}</span>
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
          <Paragraph
            type="secondary"
            ellipsis={{ rows: 3, tooltip: desc }}
            style={{ margin: 0, lineHeight: 1.45 }}
          >
            {desc}
          </Paragraph>
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
    category,
    setCategory,
    published,
    setPublished,
    page,
    setPage,
    perPage,
    setPerPage,
    total = 0,
    error,
    // message,  // ← tidak dipakai agar tidak dobel notif
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

  // hanya tampilkan error global (sukses ditangani lokal di handler)
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
      // tidak perlu fetchPrograms di sini; view model sudah re-fetch
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

  const onSearch = () =>
    fetchPrograms({
      page: 1,
      q,
      category,
      published,
      perPage,
    });
  const onReset = () => {
    setQ("");
    setCategory(undefined);
    setPublished(undefined);
    fetchPrograms({
      page: 1,
      q: "",
      category: undefined,
      published: undefined,
      perPage,
    });
  };

  const onPageChange = (p) => {
    setPage(p);
    fetchPrograms({ page: p, perPage, q, category, published });
  };

  const initialValues = useMemo(() => {
    if (!editing)
      return { is_published: true, program_category: "B2B", price: 0 };
    return {
      name: editing.name || "",
      program_category: editing.program_category || "B2B",
      price: editing.price == null ? null : Number(editing.price),
      phone: editing.phone || "",
      image_url: editing.image_url || "",
      description: editing.description || "",
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
          bodyStyle={{ padding: 16 }}
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
          bodyStyle={{ padding: 12 }}
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
                  placeholder="Cari nama/desc/phone…"
                  enterButton
                />
              </Col>
              <Col xs={24} sm={12} md={8} lg={6} xl={5}>
                <Select
                  allowClear
                  placeholder="Category"
                  value={category}
                  onChange={(v) => setCategory(v)}
                  options={CATEGORIES.map((t) => ({ value: t, label: t }))}
                  style={{ width: "100%" }}
                />
              </Col>
              <Col xs={24} sm={12} md={8} lg={6} xl={5}>
                <Select
                  allowClear
                  placeholder="Published"
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

              {/* Per page selector */}
              <Col xs={24} sm={8} md={6} lg={4} xl={3}>
                <Select
                  value={perPage}
                  onChange={(v) => {
                    setPerPage(v);
                    setPage(1);
                    fetchPrograms({
                      page: 1,
                      perPage: v,
                      q,
                      category,
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
          bodyStyle={{ padding: 12 }}
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
