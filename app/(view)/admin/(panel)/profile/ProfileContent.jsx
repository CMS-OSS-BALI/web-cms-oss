"use client";

import { useEffect } from "react";
import {
  Card,
  Col,
  Row,
  Typography,
  ConfigProvider,
  theme as antdTheme,
  Form,
  Input,
  Button,
  Avatar,
  Space,
  Divider,
  notification,
} from "antd";

const { Title, Text } = Typography;

const CARD_BG = "rgba(11, 18, 35, 0.94)"; // disamakan dengan panel lain
const darkCardStyle = {
  background: CARD_BG,
  border: "1px solid #2f3f60",
  borderRadius: 16,
  boxShadow: "0 10px 24px rgba(2, 6, 23, .35)",
};

export default function ProfileContent(props) {
  const {
    loading,
    savingProfile,
    savingPassword,
    profile,
    name,
    email,
    message,
    error,
    setName,
    updateProfile,
    changePassword,
  } = props;

  const [api, contextHolder] = notification.useNotification();
  const [pwdForm] = Form.useForm();

  useEffect(() => {
    if (message)
      api.success({
        message: "Berhasil",
        description: message,
        placement: "topRight",
      });
  }, [message, api]);
  useEffect(() => {
    if (error)
      api.error({
        message: "Terjadi kesalahan",
        description: error,
        placement: "topRight",
      });
  }, [error, api]);

  const pageWrapStyle = {
    maxWidth: 1280, // lebih ramping
    margin: "0 auto",
    padding: "16px 32px 8px", // padding diperkecil
  };

  const itemMb8 = { marginBottom: 10 }; // jarak tiap field dipadatkan

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
        },
      }}
    >
      {contextHolder}
      <div style={pageWrapStyle}>
        {/* Header */}
        <Card
          styles={{ body: { padding: 12 } }}
          style={{ ...darkCardStyle, marginBottom: 10 }}
        >
          <Space
            align="baseline"
            style={{ justifyContent: "space-between", width: "100%" }}
          >
            <div>
              <Title level={4} style={{ margin: 0 }}>
                Profile
              </Title>
              <Text type="secondary">Kelola data akun admin.</Text>
            </div>
          </Space>
        </Card>

        {/* Content */}
        <Row gutter={[12, 12]}>
          {/* Info */}
          <Col xs={24} md={12}>
            <Card
              styles={{ body: { padding: 14 } }}
              style={darkCardStyle}
              loading={loading}
            >
              <Title level={5} style={{ marginTop: 0, marginBottom: 8 }}>
                Informasi Akun
              </Title>

              <Space size={12} align="center" style={{ marginBottom: 10 }}>
                <Avatar
                  size={56} // sedikit lebih kecil
                  style={{
                    background: "rgba(255,255,255,.15)",
                    fontWeight: 700,
                    color: "#0b1223",
                  }}
                >
                  {profile.initials}
                </Avatar>
                <div>
                  <Text strong style={{ display: "block" }}>
                    {name || "Admin User"}
                  </Text>
                  <Text type="secondary" style={{ display: "block" }}>
                    {email || "—"}
                  </Text>
                </div>
              </Space>

              <Divider
                style={{ borderColor: "#2f3f60", margin: "8px 0 12px" }}
              />

              <Form
                layout="vertical"
                size="middle"
                onFinish={updateProfile}
                initialValues={{ name }}
              >
                <Form.Item
                  label="Nama"
                  name="name"
                  style={itemMb8}
                  rules={[{ required: true, message: "Nama wajib diisi" }]}
                >
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nama lengkap"
                  />
                </Form.Item>

                <Form.Item label="Email" style={itemMb8}>
                  <Input value={email} disabled />
                </Form.Item>

                <Space
                  style={{ width: "100%", justifyContent: "flex-end", gap: 8 }}
                >
                  <Button
                    size="middle"
                    onClick={() => {
                      setName(profile.name || "");
                    }}
                  >
                    Reset
                  </Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={savingProfile}
                    size="middle"
                  >
                    Simpan Profil
                  </Button>
                </Space>
              </Form>
            </Card>
          </Col>

          {/* Security */}
          <Col xs={24} md={12}>
            <Card
              styles={{ body: { padding: 14 } }}
              style={darkCardStyle}
              loading={loading}
            >
              <Title level={5} style={{ marginTop: 0, marginBottom: 8 }}>
                Keamanan
              </Title>
              <Form
                layout="vertical"
                size="middle"
                form={pwdForm}
                onFinish={({
                  current_password,
                  new_password,
                  confirm_password,
                }) => {
                  if (!new_password || new_password.length < 6) {
                    return api.error({
                      message: "Password minimal 6 karakter",
                    });
                  }
                  if (new_password !== confirm_password) {
                    return api.error({
                      message: "Konfirmasi password tidak cocok",
                    });
                  }
                  changePassword({ current_password, new_password });
                  pwdForm.resetFields([
                    "current_password",
                    "new_password",
                    "confirm_password",
                  ]);
                }}
              >
                <Form.Item
                  name="current_password"
                  label="Password Saat Ini"
                  style={itemMb8}
                  rules={[
                    { required: true, message: "Password saat ini wajib" },
                  ]}
                >
                  <Input.Password placeholder="••••••••" />
                </Form.Item>

                <Form.Item
                  name="new_password"
                  label="Password Baru"
                  style={itemMb8}
                  rules={[{ required: true, message: "Password baru wajib" }]}
                >
                  <Input.Password placeholder="min. 6 karakter" />
                </Form.Item>

                <Form.Item
                  name="confirm_password"
                  label="Ulangi Password Baru"
                  style={{ marginBottom: 12 }}
                  dependencies={["new_password"]}
                  rules={[
                    { required: true, message: "Konfirmasi password wajib" },
                  ]}
                >
                  <Input.Password placeholder="ulang password" />
                </Form.Item>

                <Space style={{ width: "100%", justifyContent: "flex-end" }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={savingPassword}
                    size="middle"
                  >
                    Ubah Password
                  </Button>
                </Space>
              </Form>
            </Card>
          </Col>
        </Row>
      </div>
    </ConfigProvider>
  );
}
