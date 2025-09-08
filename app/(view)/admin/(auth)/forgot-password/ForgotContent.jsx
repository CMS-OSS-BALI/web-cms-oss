"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  Card,
  Form,
  Input,
  Button,
  Typography,
  Alert,
  Space,
  Tooltip,
  Tag,
} from "antd";
import {
  MailOutlined,
  SendOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";

export default function ForgotContent({
  email,
  setEmail,
  loading,
  msg,
  cooldown,
  disabled,
  onSubmit,
}) {
  const loginHref = useMemo(() => {
    const q = email?.trim()?.toLowerCase();
    return "/admin/login-page" + (q ? `?email=${encodeURIComponent(q)}` : "");
  }, [email]);

  const isSuccess = /kirim|terkirim|periksa|cek inbox|kode/i.test(msg || "");
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || "").trim());

  const disabledReason = loading
    ? "Sedang mengirim…"
    : cooldown > 0
    ? `Tunggu ${cooldown}s untuk kirim ulang`
    : !isEmailValid
    ? "Masukkan email yang valid"
    : "";

  return (
    <div className="auth-wrap">
      <Card className="auth-card" variant="outlined">
        <Space direction="vertical" size={16} style={{ display: "flex" }}>
          <div>
            <Typography.Title level={3} style={{ margin: 0 }}>
              Lupa Password
            </Typography.Title>
            <Typography.Text type="secondary">
              Masukkan email yang terdaftar untuk menerima kode reset.
            </Typography.Text>
          </div>

          {msg ? (
            <Alert
              message={msg}
              type={isSuccess ? "success" : "error"}
              showIcon
              closable
            />
          ) : null}

          <Form
            layout="vertical"
            initialValues={{ email }}
            onFinish={() => onSubmit?.()} // panggil VM tanpa event
            onValuesChange={(changed, all) => {
              if ("email" in changed) setEmail?.(all.email ?? "");
            }}
            disabled={loading}
            autoComplete="on"
            size="large"
            validateTrigger={["onBlur"]} // tampilkan pesan saat blur saja
          >
            <Form.Item
              label="Email"
              name="email"
              // ❌ hasFeedback dihapus agar ikon validasi (✓/✕) tidak muncul
              rules={[
                { required: true, message: "Masukkan email" },
                { type: "email", message: "Format email tidak valid" },
              ]}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder="you@example.com"
                // ❌ allowClear dihapus agar ikon X tidak muncul
                autoComplete="email"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 8 }}>
              <Tooltip title={disabled ? disabledReason : ""}>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SendOutlined />}
                  block
                  loading={loading}
                  disabled={disabled}
                >
                  {loading
                    ? "Mengirim..."
                    : cooldown > 0
                    ? `Kirim lagi (${cooldown}s)`
                    : "Kirim Kode"}
                </Button>
              </Tooltip>
            </Form.Item>

            {cooldown > 0 ? (
              <div style={{ textAlign: "center", marginTop: -4 }}>
                <Tag color="blue" style={{ borderRadius: 9999 }}>
                  Menunggu {cooldown}s sebelum kirim ulang
                </Tag>
              </div>
            ) : null}

            <div style={{ textAlign: "center", fontSize: 12 }}>
              <Button
                type="link"
                href={loginHref}
                icon={<ArrowLeftOutlined />}
                style={{ padding: 0 }}
              >
                Kembali ke login
              </Button>
            </div>
          </Form>
        </Space>
      </Card>
    </div>
  );
}
