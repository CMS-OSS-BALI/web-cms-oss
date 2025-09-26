// app/(admin)/admin/jurusan/JurusanContent.jsx
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
  InputNumber,
  Modal,
  notification,
  Popconfirm,
  Row,
  Col,
  Select,
  Space,
  Tag,
  Typography,
  Pagination,
  theme as antdTheme,
} from "antd";
import { EyeOutlined, PlusOutlined } from "@ant-design/icons";
import { sanitizeHtml } from "@/app/utils/dompurify";
import HtmlEditor from "@/app/components/editor/HtmlEditor";

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

/* ===== Number helpers ===== */
const fmtThousands = (value) => {
  if (value === undefined || value === null || value === "") return "";
  const [int, dec] = String(value).split(".");
  const withDots = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return dec ? `${withDots},${dec}` : withDots;
};

const normalizeNumericInput = (raw = "") => {
  const cleaned = String(raw)
    .trim()
    .replace(/[^0-9.,-]/g, "");
  if (!cleaned) return "";
  if (cleaned.includes(".") && cleaned.includes(",")) {
    return cleaned.replace(/\./g, "").replace(/,/g, ".");
  }
  if (cleaned.includes(",")) return cleaned.replace(/,/g, ".");
  if (cleaned.includes(".")) {
    const parts = cleaned.split(".");
    if (parts.length === 2 && parts[1].length <= 2) return cleaned;
    return cleaned.replace(/\./g, "");
  }
  return cleaned;
};

const parseThousands = (value = "") => normalizeNumericInput(value);

const toNumber = (value) => {
  if (value === undefined || value === null) return null;
  const normalized = normalizeNumericInput(value || "");
  if (!normalized) return null;
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
};

const formatRegisterPriceDisplay = (value, currency = "IDR") => {
  const num = toNumber(value);
  if (num === null) return "-";
  return `${currency.toUpperCase()} ${new Intl.NumberFormat("id-ID").format(
    num
  )}`;
};

// Keep URL <= 255 chars to match @db.VarChar(255)
const normalizeUrl255 = (v) =>
  String(v || "")
    .trim()
    .slice(0, 255);

/* ===== Form Modal ===== */
function JurusanFormModal({
  open,
  mode,
  initialValues,
  saving,
  partnerOptions,
  partnersLoading,
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
    const imageUrl = normalizeUrl255(values.image_url);
    const payload = {
      partner_id: values.partner_id,
      register_price:
        values.register_price === null ||
        values.register_price === undefined ||
        values.register_price === ""
          ? undefined
          : String(parseThousands(String(values.register_price))),
      image_url: imageUrl,
      name_id: values.name_id?.trim(),
      description_id: values.description_id || "",
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
      title={mode === "edit" ? "Edit Jurusan" : "Add Jurusan"}
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
      <div className="form-scroll">
        <div style={{ padding: 16 }}>
          <Form form={form} layout="vertical" onFinish={handleFinish}>
            <Row gutter={[12, 8]}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="partner_id"
                  label="Partner"
                  required={isCreate}
                  rules={req("Partner wajib dipilih")}
                >
                  <Select
                    options={partnerOptions}
                    loading={partnersLoading}
                    placeholder="Pilih partner"
                    style={{ width: "100%" }}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="register_price"
                  label="Harga Pendaftaran"
                  required={isCreate}
                  rules={req("Harga pendaftaran wajib diisi")}
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
                  name="image_url"
                  label="Image URL"
                  rules={[
                    { required: true, message: "Image URL wajib diisi" },
                    { type: "url", message: "URL gambar tidak valid" },
                    () => ({
                      validator(_, value) {
                        if (!value || normalizeUrl255(value) === value)
                          return Promise.resolve();
                        return Promise.reject(
                          new Error("Maksimal 255 karakter")
                        );
                      },
                    }),
                  ]}
                >
                  <Input
                    placeholder="https://..."
                    style={ctrlStyle}
                    maxLength={255}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  name="name_id"
                  label="Nama (Bahasa Indonesia)"
                  required={isCreate}
                  rules={req("Nama (ID) wajib diisi")}
                >
                  <Input style={ctrlStyle} maxLength={191} />
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
      `}</style>
    </Modal>
  );
}

/* ===== View Modal ===== */
function JurusanViewModal({ open, data, onClose, resolvePartnerMeta }) {
  const partnerMeta =
    data?.partner_id != null ? resolvePartnerMeta?.(data.partner_id) : null;
  const partnerLabel = partnerMeta?.label ?? data?.partner_id ?? null;
  const currency = partnerMeta?.currency || "IDR";
  const tags = [
    partnerLabel
      ? { key: "partner", color: "gold", label: `Partner: ${partnerLabel}` }
      : null,
    {
      key: "price",
      color: "green",
      label: formatRegisterPriceDisplay(data?.register_price, currency),
    },
    data?.locale_used
      ? {
          key: "locale",
          color: "purple",
          label: String(data.locale_used).toUpperCase(),
        }
      : null,
  ].filter(Boolean);

  const rows = [
    {
      label: "Partner",
      content: partnerLabel || "-",
    },
    {
      label: "Register Price",
      content: formatRegisterPriceDisplay(data?.register_price, currency),
    },
    {
      label: "Locale",
      content: data?.locale_used ? data.locale_used.toUpperCase() : "-",
    },
    data?.created_at
      ? {
          label: "Created",
          content: new Date(data.created_at).toLocaleString(),
        }
      : null,
    data?.updated_at
      ? {
          label: "Updated",
          content: new Date(data.updated_at).toLocaleString(),
        }
      : null,
    {
      label: "Description",
      content: data?.description ? (
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
      title={data?.name || "Detail Jurusan"}
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
            src={data?.image_url || IMAGE_PLACEHOLDER}
            alt={data?.name || "Jurusan image"}
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

          <Space size={[8, 8]} wrap style={{ marginBottom: 16 }}>
            {tags.map((tag) => (
              <Tag key={tag.key} color={tag.color}>
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
      `}</style>
    </Modal>
  );
}

/* ===== Card item ===== */
function JurusanCard({ item, onView, onEdit, onDelete, resolvePartnerMeta }) {
  const partnerMeta =
    item.partner_id != null ? resolvePartnerMeta?.(item.partner_id) : null;
  const partnerLabel = partnerMeta?.label ?? item.partner_id ?? null;
  const currency = partnerMeta?.currency || "IDR";

  const badgeStyle = {
    position: "absolute",
    top: 12,
    left: 12,
    padding: "2px 12px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 600,
    color: "#fff",
    background: "rgba(15,23,42,.65)",
    border: "1px solid rgba(148,163,184,.35)",
    backdropFilter: "blur(2px)",
    maxWidth: "85%",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };

  const safeDesc = sanitizeHtml(item.description || "");
  const plainDesc = safeDesc.replace(/<[^>]*>/g, "").trim();
  const hasDesc = plainDesc.length > 0;

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
            src={item.image_url || IMAGE_PLACEHOLDER}
            alt={item.name || "Jurusan image"}
            width="100%"
            height={180}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            fallback={IMAGE_PLACEHOLDER}
            preview={false}
          />
          {partnerLabel ? (
            <span style={badgeStyle} title={partnerLabel}>
              {partnerLabel}
            </span>
          ) : null}
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
          <Tag color="green">
            {formatRegisterPriceDisplay(item.register_price, currency)}
          </Tag>
          {partnerLabel ? <Tag color="gold">{partnerLabel}</Tag> : null}
          {item.locale_used ? (
            <Tag color="purple">{String(item.locale_used).toUpperCase()}</Tag>
          ) : null}
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
          title="Hapus jurusan?"
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
export default function JurusanContent(props) {
  const {
    jurusan = [],
    q,
    setQ,
    partnerId,
    setPartnerId,
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
    withDeleted,
    setWithDeleted,
    onlyDeleted,
    setOnlyDeleted,
    loading,
    opLoading,
    listError,
    partnerOptions,
    partnerMetaById,
    partnersLoading,
    createJurusan,
    updateJurusan,
    deleteJurusan,
  } = props;

  const [api, contextHolder] = notification.useNotification();
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState("create");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [view, setView] = useState(null);

  const resolvePartnerMeta = useMemo(() => {
    if (!partnerMetaById) return () => null;
    return (id) => {
      if (id === undefined || id === null || id === "") return null;
      return partnerMetaById.get(String(id)) || null;
    };
  }, [partnerMetaById]);

  useEffect(() => {
    if (listError) {
      api.error({
        key: "jurusan-error",
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
        ? await updateJurusan(editing.id, payload)
        : await createJurusan(payload);
    setSaving(false);

    if (res?.ok) {
      api.success({
        key: "jurusan-save",
        message: mode === "edit" ? "Jurusan diperbarui" : "Jurusan ditambahkan",
        description: "Data telah tersimpan.",
        placement: "topRight",
      });
      setModalOpen(false);
      setEditing(null);
    } else {
      api.error({
        key: "jurusan-save",
        message: "Gagal menyimpan",
        description: res?.error || "Silakan coba lagi.",
        placement: "topRight",
      });
    }
  };

  const initialValues = useMemo(() => {
    if (!editing) {
      return {
        partner_id: "",
        register_price: null,
        image_url: "",
        name_id: "",
        description_id: "",
      };
    }
    return {
      partner_id: editing.partner_id || "",
      register_price:
        editing.register_price === null || editing.register_price === undefined
          ? null
          : Number(editing.register_price),
      image_url: editing.image_url || "",
      name_id: editing.name || "",
      description_id: editing.description || "",
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
                Jurusan
              </Title>
              <Text type="secondary">
                Kelola daftar jurusan. Total {total} records.
              </Text>
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              shape="round"
              onClick={openCreate}
            >
              Add Jurusan
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
              {/* Search */}
              <Col flex="1 1 420px" style={{ minWidth: 260 }}>
                <Input.Search
                  allowClear
                  value={q}
                  onChange={(e) => props.setQ(e.target.value)}
                  placeholder="Cari nama/desk…"
                  enterButton
                  style={{ width: "100%" }}
                />
              </Col>

              {/* Partner filter */}
              <Col
                xs={12}
                sm={8}
                md={6}
                lg={5}
                xl={4}
                xxl={3}
                style={{ minWidth: 200 }}
              >
                <Select
                  value={partnerId || undefined}
                  onChange={(v) => {
                    setPartnerId(v || "");
                    setPage(1);
                  }}
                  allowClear
                  placeholder="Filter partner"
                  options={partnerOptions}
                  loading={partnersLoading}
                  style={{ width: "100%" }}
                />
              </Col>

              {/* Per Page */}
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
                  options={[8, 12, 16, 24, 32, 64].map((n) => ({
                    value: n,
                    label: `${n} / page`,
                  }))}
                  style={{ width: "100%" }}
                />
              </Col>

              {/* Buttons */}
              <Col
                flex="0 0 220px"
                style={{ display: "flex", justifyContent: "flex-end" }}
              >
                <Space wrap>
                  <Button
                    shape="round"
                    onClick={() => {
                      setQ("");
                      setPartnerId("");
                      setSort("created_at:desc");
                      setPage(1);
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
              Loading…
            </div>
          ) : jurusan.length === 0 ? (
            <Empty description="Belum ada data jurusan" />
          ) : (
            <Row gutter={[16, 16]}>
              {jurusan.map((it) => (
                <Col key={it.id} xs={24} sm={12} md={12} lg={8} xl={6}>
                  <JurusanCard
                    item={it}
                    onView={() => setView(it)}
                    onEdit={() => openEdit(it)}
                    onDelete={async () => {
                      const { ok, error } = await deleteJurusan(it.id);
                      if (ok) {
                        notification.success({
                          message: "Jurusan dihapus",
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
                    resolvePartnerMeta={resolvePartnerMeta}
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
        <JurusanViewModal
          open={!!view}
          data={view}
          resolvePartnerMeta={resolvePartnerMeta}
          onClose={() => setView(null)}
        />
        <JurusanFormModal
          open={modalOpen}
          mode={mode}
          initialValues={initialValues}
          saving={saving || opLoading}
          partnerOptions={partnerOptions}
          partnersLoading={partnersLoading}
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
