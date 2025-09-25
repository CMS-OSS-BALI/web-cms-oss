"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  ConfigProvider,
  Form,
  Input,
  Modal,
  notification,
  Popconfirm,
  Space,
  Table,
  Tag,
  Row,
  Col,
  Typography,
  theme as antdTheme,
} from "antd";
import {
  MailOutlined,
  PhoneOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

const CARD_BG = "rgba(11, 18, 35, 0.94)";
const darkCardStyle = {
  background: CARD_BG,
  border: "1px solid #2f3f60",
  borderRadius: 16,
  boxShadow: "0 12px 32px rgba(8, 12, 24, 0.45)",
};

const pageWrapStyle = {
  maxWidth: 1320,
  margin: "0 auto",
  padding: "24px 32px 12px",
};

export default function ConsultantsContent(props) {
  const {
    consultants,
    total,
    totalPages,
    page,
    perPage,
    setPage,
    setPerPage,
    q,
    setQ,
    loading,
    opLoading,
    listError,
    createConsultant,
    updateConsultant,
    deleteConsultant,
    refresh,
  } = props;

  const [searchValue, setSearchValue] = useState(q);
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [activeConsultant, setActiveConsultant] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (listError) {
      notification.error({
        message: "Gagal memuat data konsultan",
        description: listError,
      });
    }
  }, [listError]);

  useEffect(() => {
    setSearchValue(q);
  }, [q]);

  const columns = useMemo(
    () => [
      {
        title: "Nama Konsultan",
        dataIndex: "name",
        key: "name",
        render: (value) => <span style={{ fontWeight: 600 }}>{value}</span>,
      },
      {
        title: "Email",
        dataIndex: "email",
        key: "email",
        render: (value) =>
          value ? (
            <Space size={4}>
              <MailOutlined />
              <span>{value}</span>
            </Space>
          ) : (
            <Tag color="default">Belum ada</Tag>
          ),
      },
      {
        title: "No. WhatsApp",
        dataIndex: "whatsapp",
        key: "whatsapp",
        render: (value) =>
          value ? (
            <Space size={4}>
              <PhoneOutlined />
              <span>{value}</span>
            </Space>
          ) : (
            <Tag color="default">Belum ada</Tag>
          ),
      },
      {
        title: "Aksi",
        key: "actions",
        render: (_, record) => (
          <Space size={4}>
            <Button
              size="small"
              shape="round"
              onClick={() => handleOpenEdit(record)}
            >
              Edit
            </Button>
            <Popconfirm
              placement="topRight"
              title="Hapus konsultan?"
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
    [deletingId]
  );

  function handleOpenCreate() {
    setModalMode("create");
    setActiveConsultant(null);
    form.resetFields();
    setModalOpen(true);
  }

  function handleOpenEdit(record) {
    setModalMode("edit");
    setActiveConsultant(record);
    form.setFieldsValue({
      name: record.name,
      email: record.email,
      whatsapp: record.whatsapp,
    });
    setModalOpen(true);
  }

  function handleCloseModal() {
    setModalOpen(false);
    setActiveConsultant(null);
  }

  const isCreate = modalMode !== "edit";
  const req = (message) => (isCreate ? [{ required: true, message }] : []);

  async function handleSubmit() {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const action =
        modalMode === "create"
          ? await createConsultant(values)
          : await updateConsultant(activeConsultant.id, values);

      if (action.ok) {
        notification.success({
          message:
            modalMode === "create"
              ? "Konsultan berhasil ditambahkan"
              : "Konsultan berhasil diperbarui",
        });
        setModalOpen(false);
        setActiveConsultant(null);
        form.resetFields();
      } else {
        notification.error({
          message: "Gagal menyimpan konsultan",
          description: action.error,
        });
      }
    } catch (err) {
      if (err?.errorFields) return;
      notification.error({
        message: "Gagal menyimpan konsultan",
        description: err?.message,
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(record) {
    setDeletingId(record.id);
    try {
      const result = await deleteConsultant(record.id);
      if (result.ok) {
        notification.success({ message: "Konsultan dihapus" });
      } else {
        notification.error({
          message: "Gagal menghapus konsultan",
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
    setPage(1);
  }

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
          Table: {
            headerBg: "#121b32",
            colorBorderSecondary: "#2f3f60",
          },
          Modal: { borderRadiusLG: 16 },
        },
      }}
    >
      <div style={pageWrapStyle}>
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Card styles={{ body: { padding: 16 } }} style={darkCardStyle}>
            <Space
              align="center"
              style={{ width: "100%", justifyContent: "space-between" }}
            >
              <div>
                <Title level={3} style={{ margin: 0 }}>
                  Konsultan
                </Title>
                <Text type="secondary">
                  Kelola daftar konsultan yang menerima siswa konsultasi.
                </Text>
              </div>
              <Space>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleOpenCreate}
                >
                  Tambah Konsultan
                </Button>
              </Space>
            </Space>
          </Card>

          <Card styles={{ body: { padding: 16 } }} style={darkCardStyle}>
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
                    placeholder="Cari nama, email, atau nomor"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    onSearch={handleSearch}
                    enterButton
                    style={{ width: "100%" }}
                  />
                </Col>

                {/* Tombol — lebar tetap biar rapi */}
                <Col
                  flex="0 0 100px"
                  style={{ display: "flex", justifyContent: "flex-end" }}
                >
                  <Space wrap>
                    <Button onClick={handleResetFilters}>Reset</Button>
                  </Space>
                </Col>
              </Row>
            </Form>
          </Card>

          <Card styles={{ body: { padding: 0 } }} style={darkCardStyle}>
            <Table
              rowKey={(record) => String(record.id)}
              columns={columns}
              dataSource={consultants}
              loading={loading}
              pagination={{
                current: page,
                pageSize: perPage,
                total,
                showSizeChanger: true,
                pageSizeOptions: ["10", "20", "50", "100"],
                showTotal: (count) => `${count} konsultan`,
              }}
              onChange={(pagination) => {
                if (pagination.current && pagination.current !== page) {
                  setPage(pagination.current);
                }
                if (pagination.pageSize && pagination.pageSize !== perPage) {
                  setPerPage(pagination.pageSize);
                  setPage(1);
                }
              }}
            />
          </Card>
        </Space>

        <Modal
          title={modalMode === "edit" ? "Edit Consultant" : "Add Consultant"}
          open={modalOpen}
          centered
          onCancel={handleCloseModal}
          footer={
            <Space style={{ width: "100%", justifyContent: "flex-end" }}>
              <Button shape="round" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button
                shape="round"
                type="primary"
                loading={saving || opLoading}
                onClick={handleSubmit}
              >
                {modalMode === "edit" ? "Update" : "Save"}
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
          <div className="consultant-form-scroll">
            <div style={{ padding: 16 }}>
              <Form layout="vertical" form={form} preserve={false}>
                <Form.Item
                  label="Consultant Name"
                  name="name"
                  required={isCreate}
                  rules={req("Consultant name is required")}
                >
                  <Input placeholder="Name" maxLength={150} />
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
                  <Input placeholder="Email" type="email" maxLength={150} />
                </Form.Item>

                <Form.Item
                  label="WhatsApp"
                  name="whatsapp"
                  required={isCreate}
                  rules={req("WhatsApp number is required")}
                >
                  <Input placeholder="WhatsApp number" maxLength={30} />
                </Form.Item>
              </Form>
            </div>
          </div>
        </Modal>

        <style jsx global>{`
          .consultant-form-scroll {
            max-height: 62vh;
            overflow: auto;
          }
          .consultant-form-scroll::-webkit-scrollbar {
            width: 8px;
          }
          .consultant-form-scroll::-webkit-scrollbar-track {
            background: transparent;
          }
          .consultant-form-scroll::-webkit-scrollbar-thumb {
            background: rgba(148, 163, 184, 0.25);
            border-radius: 9999px;
          }
          .consultant-form-scroll:hover::-webkit-scrollbar-thumb {
            background: rgba(148, 163, 184, 0.35);
          }
          .consultant-form-scroll {
            scrollbar-width: thin;
            scrollbar-color: rgba(148, 163, 184, 0.25) transparent;
          }
        `}</style>
      </div>
    </ConfigProvider>
  );
}
