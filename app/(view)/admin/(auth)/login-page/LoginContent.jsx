"use client";

import Link from "next/link";
import { Card, Form, Input, Button, Typography, Alert, Space } from "antd";
import {
  MailOutlined,
  LockOutlined,
  QuestionCircleOutlined,
} from "@ant-design/icons";

export default function LoginContent({
  email,
  setEmail,
  password,
  setPassword,
  loading,
  msg,
  onSubmit,
}) {
  const forgotHref =
    "/admin/forgot-password" +
    (email ? `?email=${encodeURIComponent(email.trim().toLowerCase())}` : "");

  return (
    <div className="auth-wrap">
      <Card className="auth-card" variant="outlined">
        <Space direction="vertical" size={16} style={{ display: "flex" }}>
          <div>
            <Typography.Title level={3} style={{ margin: 0, color: "#E6EAF2" }}>
              Admin Login
            </Typography.Title>
            <Typography.Text type="secondary">
              Masuk untuk mengelola dashboard.
            </Typography.Text>
          </div>

          {msg ? <Alert message={msg} type="error" showIcon /> : null}

          <Form
            layout="vertical"
            initialValues={{ email, password }}
            onFinish={() => onSubmit?.()} // panggil VM tanpa event
            onValuesChange={(changed, all) => {
              // sinkron ke VM
              if ("email" in changed) setEmail?.(all.email ?? "");
              if ("password" in changed) setPassword?.(all.password ?? "");
            }}
            disabled={loading}
            autoComplete="on"
            size="large"
          >
            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: "Masukkan email" },
                { type: "email", message: "Format email tidak valid" },
              ]}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder="you@example.com"
                allowClear
                autoComplete="email"
              />
            </Form.Item>

            <Form.Item
              label="Password"
              name="password"
              rules={[{ required: true, message: "Masukkan password" }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Minimal 8 karakter"
                autoComplete="current-password"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 8 }}>
              <Button type="primary" htmlType="submit" block loading={loading}>
                Masuk
              </Button>
            </Form.Item>

            <div style={{ textAlign: "center", marginTop: 12 }}>
              <Link
                href={forgotHref}
                style={{
                  fontSize: 14, // <- lebih besar dari 12
                  fontWeight: 600, // <- sedikit tebal
                  color: "#93c5fd",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <QuestionCircleOutlined style={{ fontSize: 16 }} />
                Lupa password?
              </Link>
            </div>
          </Form>
        </Space>
      </Card>
    </div>
  );
}
