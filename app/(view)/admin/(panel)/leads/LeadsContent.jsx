"use client";

import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  Button,
  Card,
  ConfigProvider,
  Form,
  Input,
  Modal,
  notification,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  Row,
  Col,
  theme as antdTheme,
} from "antd";
import { EyeOutlined, PlusOutlined } from "@ant-design/icons";
import { ASSIGNED_FILTER } from "./useLeadsViewModel";

const { Title, Text } = Typography;

const CARD_BG = "rgba(11, 18, 35, 0.94)";
const darkCardStyle = {
  background: CARD_BG,
  border: "1px solid #2f3f60",
  borderRadius: 16,
  boxShadow: "0 12px 32px rgba(8, 12, 24, 0.45)",
};

function formatDate(value) {
  if (!value) return "-";
  return dayjs(value).format("DD MMM YYYY HH:mm");
}

function buildPayload(values) {
  return {
    full_name: values.full_name?.trim?.() || "",
    domicile: values.domicile?.trim?.() || null,
    whatsapp: values.whatsapp?.trim?.() || null,
    email: values.email?.trim?.() || null,
    education_last: values.education_last?.trim?.() || null,
    // kirim apa adanya; backend yang parse BigInt / null
    assigned_to: values.assigned_to ?? null,
  };
}

function LeadFormModal({
  open,
  mode,
  initialValues,
  saving,
  consultantOptions,
  consultantsLoading,
  onCancel,
  onSubmit,
}) {
  const [form] = Form.useForm();
  const isCreate = mode !== "edit";
  const req = (message) => (isCreate ? [{ required: true, message }] : []);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue(initialValues);
  }, [open, initialValues, form]);

  const handleFinish = (values) => {
    onSubmit(buildPayload(values));
  };

  return (
    <Modal
      title={mode === "edit" ? "Edit Lead" : "Add Lead"}
      open={open}
      centered
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
      <div className="lead-form-scroll">
        <div style={{ padding: 16 }}>
          <Form layout="vertical" form={form} onFinish={handleFinish}>
            <Form.Item
              label="Lead Name"
              name="full_name"
              required={isCreate}
              rules={req("Lead name is required")}
            >
              <Input placeholder="Full name" maxLength={150} />
            </Form.Item>

            <Form.Item
              label="Domicile"
              name="domicile"
              required={isCreate}
              rules={req("Domicile is required")}
            >
              <Input placeholder="Domicile" maxLength={100} />
            </Form.Item>

            <Form.Item
              label="WhatsApp"
              name="whatsapp"
              required={isCreate}
              rules={req("WhatsApp number is required")}
            >
              <Input placeholder="WhatsApp number" maxLength={30} />
            </Form.Item>

            <Form.Item
              label="Email"
              name="email"
              required={isCreate}
              rules={[
                ...req("Email is required"),
                { type: "email", message: "Email is not valid" },
              ]}
            >
              <Input placeholder="Email" type="email" />
            </Form.Item>

            <Form.Item
              label="Last Education"
              name="education_last"
              required={isCreate}
              rules={req("Last education is required")}
            >
              <Input
                placeholder="High School / Diploma / Bachelor"
                maxLength={50}
              />
            </Form.Item>

            <Form.Item
              label="Consultant"
              name="assigned_to"
              required={isCreate}
              rules={req("Consultant is required")}
            >
              <Select
                allowClear
                placeholder="Select consultant"
                options={consultantOptions}
                loading={consultantsLoading}
              />
            </Form.Item>
          </Form>
        </div>
      </div>
    </Modal>
  );
}

const pageWrapStyle = {
  maxWidth: 1320,
  margin: "0 auto",
  padding: "24px 32px 12px",
};

export default function LeadsContent(props) {
  const {
    leads,
    total,
    totalPages,
    page,
    perPage,
    setPage,
    setPerPage,
    q,
    setQ,
    assignedFilter,
    setAssignedFilter,
    includeDeleted,
    setIncludeDeleted,
    loading,
    opLoading,
    listError,
    consultantOptions,
    consultants,
    consultantsLoading,
    createLead,
    updateLead,
    deleteLead,
  } = props;

  const [searchValue, setSearchValue] = useState(q);
  const [modalMode, setModalMode] = useState("create");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [viewLead, setViewLead] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (listError) {
      notification.error({
        message: "Gagal memuat data leads",
        description: listError,
      });
    }
  }, [listError]);

  useEffect(() => {
    setSearchValue(q);
  }, [q]);

  const consultantMap = useMemo(() => {
    const map = new Map();
    for (const item of consultants || []) {
      map.set(String(item.id), item.name);
    }
    return map;
  }, [consultants]);

  // ⬇️ OPTIONS FILTER: "Semua", "Belum Ditugaskan", lalu daftar konsultan
  const assignedOptions = useMemo(() => {
    return [
      { label: "Semua", value: ASSIGNED_FILTER.ALL },
      { label: "Belum Ada Konsultan", value: ASSIGNED_FILTER.UNASSIGNED },
      ...(consultants || []).map((c) => ({
        label: c.name,
        value: String(c.id), // viewModel menangani ini sebagai filter by consultant
      })),
    ];
  }, [consultants]);

  const columns = useMemo(
    () => [
      {
        title: "Nama Leads",
        dataIndex: "full_name",
        key: "full_name",
        render: (text, record) => (
          <Space direction="vertical" size={2}>
            <span style={{ fontWeight: 600 }}>{text}</span>
            {record.deleted_at ? <Tag color="red">Dihapus</Tag> : null}
          </Space>
        ),
      },
      {
        title: "Email",
        dataIndex: "email",
        key: "email",
        render: (value) => value || "-",
      },
      {
        title: "No. WhatsApp",
        dataIndex: "whatsapp",
        key: "whatsapp",
        render: (value) => value || "-",
      },
      {
        title: "Pendidikan Terakhir",
        dataIndex: "education_last",
        key: "education_last",
        render: (value) => value || "-",
      },
      {
        title: "Konsultan",
        dataIndex: "assigned_to",
        key: "assigned_to",
        render: (value) => {
          if (!value) return <Tag color="default">Belum Ada</Tag>;
          const name = consultantMap.get(String(value)) || `ID ${value}`;
          return <Tag color="green">{name}</Tag>;
        },
      },
      {
        title: "Aksi",
        key: "actions",
        render: (_, record) => (
          <Space size={4}>
            <Button
              size="small"
              shape="round"
              icon={<EyeOutlined />}
              onClick={() => setViewLead(record)}
            >
              View
            </Button>
            <Button
              size="small"
              shape="round"
              onClick={() => handleOpenEdit(record)}
            >
              Edit
            </Button>
            <Popconfirm
              placement="topRight"
              title="Hapus lead?"
              description="Tindakan ini tidak dapat dibatalkan."
              okText="Delete"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
              onConfirm={() => handleDelete(record)}
            >
              <Button
                danger
                size="small"
                loading={deletingId === record.id}
                shape="round"
              >
                Delete
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [consultantMap, deletingId]
  );

  function handleOpenCreate() {
    setModalMode("create");
    setEditingLead(null);
    setModalOpen(true);
  }

  function handleOpenEdit(record) {
    setModalMode("edit");
    setEditingLead(record);
    setModalOpen(true);
  }

  function handleCloseModal() {
    setModalOpen(false);
    setEditingLead(null);
  }

  async function handleSubmit(payload) {
    try {
      setSaving(true);

      const action =
        modalMode === "create"
          ? await createLead(payload)
          : await updateLead(editingLead?.id, payload);

      if (action.ok) {
        notification.success({
          message:
            modalMode === "create"
              ? "Lead berhasil ditambahkan"
              : "Lead berhasil diperbarui",
        });
        setModalOpen(false);
        setEditingLead(null);
        if (modalMode === "create") {
          setPage(1);
        }
      } else {
        notification.error({
          message: "Gagal menyimpan lead",
          description: action.error,
        });
      }
    } catch (err) {
      notification.error({
        message: "Gagal menyimpan lead",
        description: err?.message,
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(record) {
    setDeletingId(record.id);
    try {
      const result = await deleteLead(record.id);
      if (result.ok) {
        notification.success({ message: "Lead dihapus" });
      } else {
        notification.error({
          message: "Gagal menghapus lead",
          description: result.error,
        });
      }
    } finally {
      setDeletingId(null);
    }
  }

  function handleSearch() {
    setPage(1);
    setQ(searchValue);
  }

  function handleResetFilters() {
    setSearchValue("");
    setQ("");
    setAssignedFilter(ASSIGNED_FILTER.UNASSIGNED);
    setIncludeDeleted(false);
    setPage(1);
  }

  const initialValues = useMemo(() => {
    if (!editingLead) {
      return {
        full_name: "",
        domicile: "",
        whatsapp: "",
        email: "",
        education_last: "",
        assigned_to: null,
      };
    }
    return {
      full_name: editingLead.full_name || "",
      domicile: editingLead.domicile || "",
      whatsapp: editingLead.whatsapp || "",
      email: editingLead.email || "",
      education_last: editingLead.education_last || "",
      assigned_to: editingLead.assigned_to
        ? String(editingLead.assigned_to)
        : null,
    };
  }, [editingLead]);

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
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Card bodyStyle={{ padding: 16 }} style={darkCardStyle}>
            <Space
              align="center"
              style={{ width: "100%", justifyContent: "space-between" }}
            >
              <div>
                <Title level={3} style={{ margin: 0 }}>
                  Leads Konsultasi
                </Title>
                <Text type="secondary">
                  Daftar Leads yang mendaftar untuk konsultasi dengan konsultan.
                </Text>
              </div>
              <Space>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleOpenCreate}
                >
                  Tambah Leads
                </Button>
              </Space>
            </Space>
          </Card>

          <Card bodyStyle={{ padding: 16 }} style={darkCardStyle}>
            <Form
              layout="inline"
              onFinish={handleSearch}
              style={{ display: "block" }}
            >
              <Row gutter={[8, 8]} align="middle" wrap>
                {/* Search — fleksibel, jadi porsi terbesar */}
                <Col flex="1 1 420px" style={{ minWidth: 260 }}>
                  <Input.Search
                    allowClear
                    placeholder="Cari nama leads, email, nomor, atau domisili"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    onSearch={handleSearch}
                    style={{ width: "100%" }}
                    enterButton
                  />
                </Col>

                {/* Filter Penugasan — ukuran nyaman & responsif */}
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
                    value={assignedFilter}
                    options={assignedOptions}
                    onChange={(value) => {
                      setAssignedFilter(value);
                      setPage(1);
                    }}
                    style={{ width: "100%" }}
                    loading={consultantsLoading}
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
                    onChange={(val) => {
                      setPerPage(val);
                      setPage(1);
                    }}
                    options={[
                      { value: 10, label: "10 / page" },
                      { value: 20, label: "20 / page" },
                      { value: 50, label: "50 / page" },
                      { value: 100, label: "100 / page" },
                    ]}
                    style={{ width: "100%" }}
                  />
                </Col>

                {/* Tombol — lebar tetap biar rapi */}
                <Col
                  flex="0 0 180px"
                  style={{ display: "flex", justifyContent: "flex-end" }}
                >
                  <Space wrap>
                    <Button onClick={handleResetFilters}>Reset</Button>
                    <Button type="primary" htmlType="submit">
                      Search
                    </Button>
                  </Space>
                </Col>
              </Row>
            </Form>
          </Card>

          <Card bodyStyle={{ padding: 0 }} style={darkCardStyle}>
            <Table
              rowKey={(record) => String(record.id)}
              columns={columns}
              dataSource={leads}
              loading={loading}
              pagination={{
                position: ["bottomCenter"],
                current: page,
                pageSize: perPage,
                total,
                showSizeChanger: false,
                onChange: (p) => setPage(p),
                showTotal: (t, range) =>
                  `${range[0]}–${range[1]} dari ${t} data`,
              }}
            />
          </Card>
        </Space>

        <LeadFormModal
          open={modalOpen}
          mode={modalMode}
          initialValues={initialValues}
          saving={saving || opLoading}
          consultantOptions={consultantOptions}
          consultantsLoading={consultantsLoading}
          onCancel={handleCloseModal}
          onSubmit={handleSubmit}
        />

        <Modal
          title={viewLead?.full_name || "Lead Details"}
          open={!!viewLead}
          centered
          onCancel={() => setViewLead(null)}
          footer={
            <Button
              shape="round"
              type="primary"
              onClick={() => setViewLead(null)}
            >
              Close
            </Button>
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
          <div className="lead-view-scroll">
            <div style={{ padding: 16 }}>
              {viewLead ? (
                <Space direction="vertical" size={12} style={{ width: "100%" }}>
                  <div>
                    <Text type="secondary">Lead Name</Text>
                    <div style={{ fontWeight: 600 }}>{viewLead.full_name}</div>
                  </div>
                  <div>
                    <Text type="secondary">Email</Text>
                    <div>{viewLead.email || "-"}</div>
                  </div>
                  <div>
                    <Text type="secondary">WhatsApp</Text>
                    <div>{viewLead.whatsapp || "-"}</div>
                  </div>
                  <div>
                    <Text type="secondary">Domicile</Text>
                    <div>{viewLead.domicile || "-"}</div>
                  </div>
                  <div>
                    <Text type="secondary">Last Education</Text>
                    <div>{viewLead.education_last || "-"}</div>
                  </div>
                  <div>
                    <Text type="secondary">Consultant</Text>
                    <div>
                      {viewLead.assigned_to
                        ? consultantMap.get(String(viewLead.assigned_to)) ||
                          `ID ${viewLead.assigned_to}`
                        : "Not set"}
                    </div>
                  </div>
                  {viewLead.assigned_at ? (
                    <div>
                      <Text type="secondary">Assigned At</Text>
                      <div>{formatDate(viewLead.assigned_at)}</div>
                    </div>
                  ) : null}
                  <div>
                    <Text type="secondary">Created At</Text>
                    <div>{formatDate(viewLead.created_at)}</div>
                  </div>
                  <div>
                    <Text type="secondary">Updated At</Text>
                    <div>{formatDate(viewLead.updated_at)}</div>
                  </div>
                </Space>
              ) : null}
            </div>
          </div>
        </Modal>

        <style jsx global>{`
          .lead-form-scroll {
            max-height: 62vh;
            overflow: auto;
          }
          .lead-form-scroll::-webkit-scrollbar {
            width: 8px;
          }
          .lead-form-scroll::-webkit-scrollbar-track {
            background: transparent;
          }
          .lead-form-scroll::-webkit-scrollbar-thumb {
            background: rgba(148, 163, 184, 0.25);
            border-radius: 9999px;
          }
          .lead-form-scroll:hover::-webkit-scrollbar-thumb {
            background: rgba(148, 163, 184, 0.35);
          }
          .lead-form-scroll {
            scrollbar-width: thin;
            scrollbar-color: rgba(148, 163, 184, 0.25) transparent;
          }
          .lead-view-scroll {
            max-height: 72vh;
            overflow: auto;
          }
          .lead-view-scroll::-webkit-scrollbar {
            width: 8px;
          }
          .lead-view-scroll::-webkit-scrollbar-track {
            background: transparent;
          }
          .lead-view-scroll::-webkit-scrollbar-thumb {
            background: rgba(148, 163, 184, 0.25);
            border-radius: 9999px;
          }
          .lead-view-scroll:hover::-webkit-scrollbar-thumb {
            background: rgba(148, 163, 184, 0.35);
          }
          .lead-view-scroll {
            scrollbar-width: thin;
            scrollbar-color: rgba(148, 163, 184, 0.25) transparent;
          }
        `}</style>
      </div>
    </ConfigProvider>
  );
}
