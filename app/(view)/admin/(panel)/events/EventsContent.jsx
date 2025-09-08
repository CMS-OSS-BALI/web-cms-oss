"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import {
  Button,
  Card,
  Col,
  ConfigProvider,
  Descriptions,
  Divider,
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
  Table,
  Tag,
  Typography,
  theme as antdTheme,
  DatePicker,
} from "antd";
import { PlusOutlined, EyeOutlined } from "@ant-design/icons";

const { Title, Text, Paragraph } = Typography;

/* ===== Helpers ===== */
const clean = (v) => (v === "" || v === undefined ? null : v);
const fmtDate = (d) => (d ? dayjs(d).format("DD/MM/YYYY") : "—");
const fmtTime = (d) => (d ? dayjs(d).format("HH.mm") : "—");
const fmtDT = (d) => (d ? dayjs(d).format("DD/MM/YYYY HH.mm") : "—");
const isHttpUrl = (s = "") => /^https?:\/\//i.test(s);
const simplifyUrl = (u = "") => u.replace(/^https?:\/\//i, "");
const fmtIDR = (n) =>
  `Rp ${new Intl.NumberFormat("id-ID").format(Number(n || 0))}`;
const PLACEHOLDER =
  "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1200&auto=format&fit=crop";

/* normalize is_published */
const normalizePub = (v) => {
  if (v === undefined || v === null || v === "") return "";
  if (v === true || v === "true") return "1";
  if (v === false || v === "false") return "0";
  if (v === "1" || v === "0") return v;
  return "";
};

/* ===== Theme ===== */
const CARD_BG = "rgba(11, 18, 35, 0.94)";
const darkCardStyle = {
  background: CARD_BG,
  border: "1px solid #2f3f60",
  borderRadius: 16,
  boxShadow: "0 10px 24px rgba(2,6,23,.35)",
};

/* =========================================================
   FORM MODAL
========================================================= */
function EventFormModal({
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
      is_published: false,
      capacity: 0,
      pricing_type: "FREE",
      ticket_price: 0,
      ...initialValues,
      start_at: initialValues?.start_at ? dayjs(initialValues.start_at) : null,
      end_at: initialValues?.end_at ? dayjs(initialValues.end_at) : null,
    });
  }, [open, initialValues, form]);

  const pricingType = Form.useWatch("pricing_type", form) || "FREE";

  useEffect(() => {
    if (pricingType === "FREE") form.setFieldsValue({ ticket_price: 0 });
  }, [pricingType, form]);

  const handleFinish = (values) => {
    const start = values.start_at?.toDate ? values.start_at.toDate() : null;
    const end = values.end_at?.toDate ? values.end_at.toDate() : null;

    if (!start || !end) {
      Modal.error({
        title: "Tanggal wajib",
        content: "start_at dan end_at wajib diisi.",
      });
      return;
    }
    if (end < start) {
      Modal.error({
        title: "Tanggal tidak valid",
        content: "end_at harus ≥ start_at.",
      });
      return;
    }

    const payload = {
      title: values.title?.trim(),
      description: clean(values.description),
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      location: clean(values.location),
      banner_url: clean(values.banner_url),
      is_published: values.is_published === true,
      capacity: Number(values.capacity ?? 0),
      pricing_type: values.pricing_type,
      ticket_price:
        values.pricing_type === "PAID" ? Number(values.ticket_price || 0) : 0,
    };

    onSubmit(payload);
  };

  const ctrlStyle = {
    background: "#0e182c",
    borderColor: "#2f3f60",
    color: "#e6eaf2",
    borderRadius: 12,
  };

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
  const reqDate = (label) =>
    isCreate
      ? [
          {
            validator: (_, v) =>
              v && dayjs.isDayjs(v) && v.isValid()
                ? Promise.resolve()
                : Promise.reject(new Error(`${label} wajib diisi`)),
          },
        ]
      : [];
  const priceRules =
    pricingType === "PAID"
      ? [
          { required: true, message: "Ticket Price wajib diisi" },
          { type: "number", min: 1, message: "Ticket Price harus ≥ 1" },
        ]
      : [];

  return (
    <Modal
      title={mode === "edit" ? "Edit Event" : "Add Event"}
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
                <Form.Item name="title" label="Title" rules={reqText("Title")}>
                  <Input maxLength={191} style={ctrlStyle} />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  name="capacity"
                  label="Ticket Supply (Capacity)"
                  rules={reqNumber("Capacity")}
                >
                  <InputNumber
                    min={0}
                    step={1}
                    style={{ width: "100%", ...ctrlStyle }}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  name="start_at"
                  label="Start At"
                  rules={reqDate("Start At")}
                  validateTrigger={["onChange", "onBlur"]}
                >
                  <DatePicker
                    showTime
                    style={{ width: "100%", ...ctrlStyle }}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  name="end_at"
                  label="End At"
                  rules={reqDate("End At")}
                  validateTrigger={["onChange", "onBlur"]}
                >
                  <DatePicker
                    showTime
                    style={{ width: "100%", ...ctrlStyle }}
                  />
                </Form.Item>
              </Col>

              <Col span={24}>
                <Form.Item
                  name="location"
                  label="Location"
                  rules={reqText("Location")}
                >
                  <Input style={ctrlStyle} />
                </Form.Item>
              </Col>

              <Col span={24}>
                <Form.Item
                  name="banner_url"
                  label="Banner URL"
                  rules={reqText("Banner URL")}
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

              <Col xs={24} md={12}>
                <Form.Item
                  name="pricing_type"
                  label="Pricing"
                  rules={reqText("Pricing")}
                >
                  <Select
                    options={[
                      { value: "FREE", label: "Free" },
                      { value: "PAID", label: "Paid" },
                    ]}
                    style={ctrlStyle}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  name="ticket_price"
                  label="Ticket Price"
                  tooltip={
                    pricingType === "FREE"
                      ? "Free event — harga otomatis 0"
                      : "Isi harga tiket (Rp)"
                  }
                  rules={priceRules}
                >
                  <InputNumber
                    min={pricingType === "FREE" ? 0 : 1}
                    step={1000}
                    style={{ width: "100%", ...ctrlStyle }}
                    disabled={pricingType === "FREE"}
                    formatter={(v) =>
                      pricingType === "FREE"
                        ? "FREE"
                        : v === undefined || v === null || v === ""
                        ? ""
                        : new Intl.NumberFormat("id-ID").format(Number(v))
                    }
                    parser={(v) =>
                      pricingType === "FREE"
                        ? "0"
                        : String(v || "")
                            .replace(/\./g, "")
                            .replace(/,/g, "")
                    }
                  />
                </Form.Item>
              </Col>

              <Col span={24}>
                <Form.Item name="is_published" label="Status">
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
    </Modal>
  );
}

/* =========================================================
   VIEW MODAL (Detail + Registrations)
========================================================= */
function EventViewModal({ open, data, onClose }) {
  // Detail
  const rows = [];
  if (data?.description)
    rows.push({ label: "Description", content: data.description });
  rows.push({
    label: "Schedule",
    content:
      data?.start_at || data?.end_at ? (
        <div style={{ display: "grid" }}>
          <span>
            Date: {fmtDate(data.start_at)} – {fmtDate(data.end_at)}
          </span>
          <span>
            Time: {fmtTime(data.start_at)} – {fmtTime(data.end_at)}
          </span>
        </div>
      ) : (
        "—"
      ),
  });
  if (data?.location) rows.push({ label: "Location", content: data.location });

  const sold = Number(data?.sold ?? data?.tickets_sold ?? 0);
  const remaining =
    data?.remaining != null
      ? Number(data.remaining)
      : Math.max(0, Number(data?.capacity ?? 0) - sold);

  rows.push({
    label: "Ticket Price",
    content:
      data?.pricing_type === "PAID" ? fmtIDR(data?.ticket_price) : "FREE",
  });
  if (data?.capacity != null)
    rows.push({ label: "Capacity", content: data.capacity });
  rows.push({ label: "Sold", content: sold });
  rows.push({ label: "Remaining", content: remaining });

  // Registrations
  const [tLoading, setTLoading] = useState(false);
  const [tRows, setTRows] = useState([]);
  const [tPage, setTPage] = useState(1);
  const [tPerPage, setTPerPage] = useState(10);
  const [tTotal, setTTotal] = useState(0);
  const [tQ, setTQ] = useState("");
  const [tStatus, setTStatus] = useState(""); // PENDING|CONFIRMED|CANCELLED
  const [tCheckin, setTCheckin] = useState(""); // CHECKED_IN|NOT_CHECKED_IN
  const [api, contextHolder] = notification.useNotification();

  const statusColor = (s) =>
    s === "CONFIRMED" ? "success" : s === "PENDING" ? "warning" : "error";
  const checkinColor = (c) => (c === "CHECKED_IN" ? "success" : "default");

  async function fetchTickets() {
    if (!open || !data?.id) return;
    setTLoading(true);
    try {
      const params = new URLSearchParams({
        event_id: data.id,
        page: String(tPage),
        perPage: String(tPerPage),
      });
      if (tQ) params.set("q", tQ);
      if (tStatus) params.set("status", tStatus);
      if (tCheckin) params.set("checkin_status", tCheckin);

      const res = await fetch(`/api/tickets?${params.toString()}`, {
        cache: "no-store",
      });
      const json = await res.json();
      setTRows(json?.data || []);
      setTTotal(Number(json?.total || 0));
    } catch (e) {
      api.error({
        message: "Gagal memuat registrations",
        description: e?.message || "Coba lagi.",
        placement: "topRight",
      });
    } finally {
      setTLoading(false);
    }
  }

  // Load awal saat modal dibuka
  useEffect(() => {
    if (!open || !data?.id) return;
    setTPage(1);
    fetchTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, data?.id]);

  // Re-fetch ketika filter/pagination berubah
  useEffect(() => {
    fetchTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tPage, tPerPage, tStatus, tCheckin]);

  const columns = [
    {
      title: "Name",
      dataIndex: "full_name",
      key: "full_name",
      render: (v) => v || "—",
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      render: (v) => v || "—",
    },
    {
      title: "WA",
      dataIndex: "whatsapp",
      key: "whatsapp",
      render: (v) =>
        v ? (
          <a href={`https://wa.me/${v}`} target="_blank" rel="noreferrer">
            {v}
          </a>
        ) : (
          "—"
        ),
    },
    { title: "Code", dataIndex: "ticket_code", key: "ticket_code" },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (v) => <Tag color={statusColor(v)}>{v || "—"}</Tag>,
    },
    {
      title: "Check-in",
      dataIndex: "checkin_status",
      key: "checkin_status",
      render: (v, r) => (
        <Space size={4}>
          <Tag color={checkinColor(v)}>{v || "—"}</Tag>
          {r?.checked_in_at && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {fmtDT(r.checked_in_at)}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: "Created",
      dataIndex: "created_at",
      key: "created_at",
      render: (v) => fmtDT(v),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, row) => (
        <Space>
          <Button
            size="small"
            onClick={async () => {
              try {
                const res = await fetch(`/api/tickets?id=${row.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "resend" }),
                });
                if (!res.ok) throw new Error("Gagal mengirim ulang email");
                api.success({
                  key: "ticket-resend",
                  message: "Email terkirim",
                  description: "Ticket email telah dikirim ulang.",
                  placement: "topRight",
                });
              } catch (e) {
                api.error({
                  key: "ticket-resend",
                  message: "Resend gagal",
                  description: e?.message || "Silakan coba lagi.",
                  placement: "topRight",
                });
              }
            }}
          >
            Resend
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      centered
      width={960}
      title={data?.title || "Detail Event"}
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
      {contextHolder}
      <div className="view-scroll">
        <div style={{ padding: 16 }}>
          <Image
            src={data?.banner_url || PLACEHOLDER}
            alt={data?.title}
            width="100%"
            style={{
              borderRadius: 10,
              marginBottom: 12,
              maxHeight: 320,
              objectFit: "cover",
            }}
          />

          <Space size={[8, 8]} wrap style={{ marginBottom: 16 }}>
            <Tag color={data?.is_published ? "success" : "default"}>
              {data?.is_published ? "Published" : "Draft"}
            </Tag>
            {data?.pricing_type && (
              <Tag color={data.pricing_type === "PAID" ? "blue" : "default"}>
                {data.pricing_type === "PAID"
                  ? fmtIDR(data.ticket_price)
                  : "FREE"}
              </Tag>
            )}
            {data?.capacity != null && <Tag>Capacity: {data.capacity}</Tag>}
            <Tag color="processing">Sold: {sold}</Tag>
            <Tag color="warning">Remaining: {remaining}</Tag>
          </Space>

          <Descriptions size="small" bordered column={1}>
            {rows.map((r, i) => (
              <Descriptions.Item key={i} label={r.label}>
                {r.content}
              </Descriptions.Item>
            ))}
          </Descriptions>

          <Divider style={{ borderColor: "#2f3f60" }} />
          <Space
            align="center"
            style={{
              width: "100%",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <Title level={5} style={{ margin: 0 }}>
              Registrations
            </Title>
            <Space wrap>
              <Input.Search
                allowClear
                placeholder="Cari nama/email/WA/kode…"
                onSearch={(v) => {
                  setTQ((v || "").trim());
                  setTPage(1);
                  setTimeout(() => fetchTickets(), 0);
                }}
              />
              <Select
                placeholder="Status"
                allowClear
                style={{ minWidth: 150 }}
                options={[
                  { value: "CONFIRMED", label: "CONFIRMED" },
                  { value: "PENDING", label: "PENDING" },
                  { value: "CANCELLED", label: "CANCELLED" },
                ]}
                value={tStatus || undefined}
                onChange={(v) => {
                  setTStatus(v || "");
                  setTPage(1);
                }}
              />
              <Select
                placeholder="Check-in"
                allowClear
                style={{ minWidth: 170 }}
                options={[
                  { value: "CHECKED_IN", label: "CHECKED_IN" },
                  { value: "NOT_CHECKED_IN", label: "NOT_CHECKED_IN" },
                ]}
                value={tCheckin || undefined}
                onChange={(v) => {
                  setTCheckin(v || "");
                  setTPage(1);
                }}
              />
              <Select
                style={{ minWidth: 110 }}
                value={tPerPage}
                onChange={(v) => {
                  setTPerPage(v);
                  setTPage(1);
                }}
                options={[10, 20, 50, 100].map((n) => ({
                  value: n,
                  label: `${n}/page`,
                }))}
              />
            </Space>
          </Space>

          <Table
            rowKey="id"
            size="small"
            bordered
            loading={tLoading}
            dataSource={tRows}
            columns={columns}
            pagination={false}
            style={{ borderColor: "#2f3f60" }}
          />

          <div
            style={{ display: "flex", justifyContent: "center", marginTop: 12 }}
          >
            <Pagination
              size="small"
              current={tPage}
              total={tTotal}
              pageSize={tPerPage}
              showSizeChanger={false}
              onChange={(p) => setTPage(p)}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ===== Chip ===== */
function Pill({ children }) {
  return (
    <div
      style={{
        border: "1px solid #2f3f60",
        background: "rgba(255,255,255,0.06)",
        borderRadius: 999,
        padding: "2px 8px",
        fontSize: 12,
        textAlign: "center",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
      title={typeof children === "string" ? children : undefined}
    >
      {children}
    </div>
  );
}

/* =========================================================
   CARD
========================================================= */
function EventCard({ e, onView, onEdit, onDelete }) {
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
    (e.description || "").replace(/^["“”']+|["“”']+$/g, "").trim() || "—";
  const dateRange =
    e.start_at && e.end_at
      ? `${fmtDate(e.start_at)} – ${fmtDate(e.end_at)}`
      : "—";
  const timeRange =
    e.start_at && e.end_at
      ? `${fmtTime(e.start_at)} – ${fmtTime(e.end_at)}`
      : "—";

  const sold = Number(e?.sold ?? e?.tickets_sold ?? 0);
  const remaining =
    e?.remaining != null
      ? Number(e.remaining)
      : Math.max(0, Number(e?.capacity ?? 0) - sold);

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
            alt={e.title}
            src={e.banner_url || PLACEHOLDER}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(ev) => {
              ev.currentTarget.onerror = null;
              ev.currentTarget.src = PLACEHOLDER;
            }}
          />
          <span style={badgeStyle}>
            {e.is_published ? "Published" : "Draft"}
          </span>
        </div>
      }
    >
      <div
        style={{ display: "grid", gap: 6, gridTemplateRows: "auto auto auto" }}
      >
        <Text
          strong
          ellipsis={{ tooltip: e.title }}
          style={{ fontSize: 14, display: "block", lineHeight: 1.35 }}
        >
          {e.title}
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

        <div style={{ display: "grid", gap: 6 }}>
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "baseline",
              flexWrap: "wrap",
            }}
          >
            <Text strong style={{ fontSize: 12 }}>
              Schedule:
            </Text>
            <div style={{ display: "grid" }}>
              <Text style={{ fontSize: 12 }}>Date: {dateRange}</Text>
              <Text style={{ fontSize: 12 }}>Time: {timeRange}</Text>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 8,
              alignItems: "center",
            }}
          >
            <Pill>
              {e.pricing_type === "PAID" ? fmtIDR(e.ticket_price) : "FREE"}
            </Pill>
            <Pill>{e.capacity != null ? `Cap: ${e.capacity}` : "Cap: —"}</Pill>
            <Pill>{`Sold: ${sold}`}</Pill>
            <Pill>{`Left: ${remaining}`}</Pill>
          </div>

          {e.location &&
            (() => {
              const href = isHttpUrl(e.location) ? e.location : null;
              const label = href ? simplifyUrl(e.location) : e.location;
              const ellipsisStyle = {
                fontSize: 12,
                flex: 1,
                minWidth: 0,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              };
              return (
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "baseline",
                    flexWrap: "nowrap",
                  }}
                >
                  <Text strong style={{ fontSize: 12 }}>
                    Location:
                  </Text>
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      style={ellipsisStyle}
                    >
                      {label}
                    </a>
                  ) : (
                    <Text style={ellipsisStyle}>{label}</Text>
                  )}
                </div>
              );
            })()}
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
            title="Hapus event?"
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

/* =========================================================
   MAIN
========================================================= */
export default function EventsContent(props) {
  const {
    loading,
    events = [],
    q,
    setQ,
    isPublished,
    setIsPublished, // "", "1", "0"
    page,
    setPage,
    perPage,
    setPerPage,
    total = 0,
    error,
    // message,  // <-- tidak dipakai lagi agar tidak dobel notif
    fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
  } = props;

  const [api, contextHolder] = notification.useNotification();
  const [filterForm] = Form.useForm();
  const mounted = useRef(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState("create");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [view, setView] = useState(null);

  // Prefill form
  useEffect(() => {
    filterForm.setFieldsValue({
      q,
      is_published: isPublished || undefined,
      perPage,
    });
  }, [q, isPublished, perPage, filterForm]);

  // Initial fetch only
  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    fetchEvents({
      page,
      perPage,
      q,
      is_published: isPublished,
      _ts: Date.now(),
    });
  }, []); // eslint-disable-line

  // Hanya tampilkan error global (message sukses dihilangkan agar tidak dobel)
  useEffect(() => {
    if (error)
      api.error({
        key: "event-error",
        message: "Terjadi kesalahan",
        description: error,
        placement: "topRight",
      });
  }, [error, api]);

  const openCreate = () => {
    setMode("create");
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (e) => {
    setMode("edit");
    setEditing(e);
    setModalOpen(true);
  };

  const handleSubmit = async (payload) => {
    setSaving(true);
    try {
      if (mode === "edit") {
        await updateEvent(editing.id, payload);
        api.success({
          key: "event-save",
          message: "Event diperbarui",
          description: "Data telah tersimpan.",
          placement: "topRight",
        });
      } else {
        await createEvent(payload);
        api.success({
          key: "event-save",
          message: "Event ditambahkan",
          description: "Data telah tersimpan.",
          placement: "topRight",
        });
      }
      setModalOpen(false);
      setEditing(null);
      fetchEvents({
        page,
        q,
        is_published: isPublished,
        perPage,
        _ts: Date.now(),
      });
    } catch (e) {
      api.error({
        key: "event-save",
        message: "Gagal menyimpan",
        description: e?.message || "Silakan coba lagi.",
        placement: "topRight",
      });
    } finally {
      setSaving(false);
    }
  };

  // Filters
  const onSearch = (vals) => {
    const nextQ = (vals?.q || "").trim();
    const nextPub = normalizePub(vals?.is_published);
    const nextPer = vals?.perPage || perPage;

    setQ(nextQ);
    setIsPublished(nextPub);
    setPerPage(nextPer);
    setPage(1);

    fetchEvents({
      page: 1,
      q: nextQ,
      is_published: nextPub,
      perPage: nextPer,
      _ts: Date.now(),
    });
  };

  const onReset = () => {
    filterForm.resetFields();
    setQ("");
    setIsPublished("");
    setPage(1);
    fetchEvents({ page: 1, q: "", is_published: "", perPage, _ts: Date.now() });
  };

  const onPageChange = (p) => {
    setPage(p);
    fetchEvents({
      page: p,
      perPage,
      q,
      is_published: isPublished,
      _ts: Date.now(),
    });
  };

  const initialValues = useMemo(() => {
    if (!editing)
      return {
        is_published: false,
        capacity: 0,
        pricing_type: "FREE",
        ticket_price: 0,
      };
    return {
      title: editing.title || "",
      description: editing.description || "",
      start_at: editing.start_at || null,
      end_at: editing.end_at || null,
      location: editing.location || "",
      banner_url: editing.banner_url || "",
      capacity: editing.capacity ?? 0,
      is_published: !!editing.is_published,
      pricing_type: editing.pricing_type || "FREE",
      ticket_price: editing.ticket_price ?? 0,
    };
  }, [editing]);

  // Sinkronkan isi modal view dengan events terbaru (kalau ada aksi manual yg memicu fetchEvents)
  useEffect(() => {
    if (!view) return;
    const updated = events.find((x) => x.id === view.id);
    if (updated) setView(updated);
  }, [events, view]);

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
          DatePicker: { colorBgContainer: "#0e182c" },
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
                Events
              </Title>
              <Text type="secondary">
                Kelola data event. Total {total} records.
              </Text>
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              shape="round"
              onClick={openCreate}
            >
              Add Event
            </Button>
          </Space>
        </Card>

        {/* Filters */}
        <Card
          styles={{ body: { padding: 12 } }}
          style={{ ...darkCardStyle, marginBottom: 12 }}
        >
          <Form
            form={filterForm}
            layout="inline"
            onFinish={onSearch}
            style={{ display: "block" }}
            initialValues={{
              q,
              is_published: isPublished || undefined,
              perPage,
            }}
          >
            <Row gutter={[8, 8]} align="middle" wrap>
              <Col xs={24} md={12} style={{ flex: "1 1 auto" }}>
                <Form.Item name="q" style={{ width: "100%" }}>
                  <Input.Search
                    allowClear
                    placeholder="Cari judul/deskripsi/lokasi…"
                    enterButton
                  />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} md={8} lg={6} xl={5}>
                <Form.Item name="is_published" style={{ width: "100%" }}>
                  <Select
                    allowClear
                    placeholder="Published"
                    options={[
                      { value: "1", label: "Published" },
                      { value: "0", label: "Draft" },
                    ]}
                    onChange={() => filterForm.submit()}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} sm={8} md={6} lg={4} xl={3}>
                <Form.Item name="perPage" style={{ width: "100%" }}>
                  <Select
                    options={[8, 16, 32, 64, 128].map((n) => ({
                      value: n,
                      label: n,
                    }))}
                    placeholder="Per page"
                    onChange={() => filterForm.submit()}
                  />
                </Form.Item>
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
        <Card styles={{ body: { padding: 16 } }} style={{ ...darkCardStyle }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <Spin />
            </div>
          ) : events.length === 0 ? (
            <Empty description="Belum ada data event" />
          ) : (
            <Row gutter={[16, 16]}>
              {events.map((e) => (
                <Col key={e.id} xs={24} sm={12} md={12} lg={8} xl={6}>
                  <EventCard
                    e={e}
                    onView={() => setView(e)}
                    onEdit={() => openEdit(e)}
                    onDelete={async () => {
                      try {
                        await deleteEvent(e.id);
                        api.success({
                          key: "event-delete",
                          message: "Event dihapus",
                          description: "Data berhasil dihapus.",
                          placement: "topRight",
                        });
                        fetchEvents({
                          page,
                          perPage,
                          q,
                          is_published: isPublished,
                          _ts: Date.now(),
                        });
                      } catch (err) {
                        api.error({
                          key: "event-delete",
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

        {/* Modals */}
        <EventViewModal
          open={!!view}
          data={view}
          onClose={() => setView(null)}
        />
        <EventFormModal
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
