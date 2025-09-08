"use client";

import { useMemo } from "react";
import { Card, Form, Input, Button, Typography, Alert, Space } from "antd";
import {
  MailOutlined,
  NumberOutlined,
  LockOutlined,
  ReloadOutlined,
  ArrowLeftOutlined, // <-- import ikon back
} from "@ant-design/icons";

export default function ResetContent({
  email,
  setEmail,
  code,
  onChangeCode,
  pwd,
  setPwd,
  pwd2,
  setPwd2,
  loading,
  msg,
  onSubmit,
  resendHref,
}) {
  // href ke login (prefill email kalau ada)
  const loginHref = useMemo(() => {
    const q = email?.trim()?.toLowerCase();
    return "/admin/login-page" + (q ? `?email=${encodeURIComponent(q)}` : "");
  }, [email]);

  return (
    <div className="auth-wrap">
      <Card className="auth-card" variant="outlined">
        <Space direction="vertical" size={16} style={{ display: "flex" }}>
          <div>
            <Typography.Title level={3} style={{ margin: 0 }}>
              Reset Password
            </Typography.Title>
            <Typography.Text type="secondary">
              Masukkan email, kode 4 digit, dan password baru.
            </Typography.Text>
          </div>

          {msg ? <Alert message={msg} type="error" showIcon closable /> : null}

          <Form
            layout="vertical"
            initialValues={{ email, code, password: pwd, confirm: pwd2 }}
            onFinish={() => onSubmit?.()}
            onValuesChange={(changed, all) => {
              if ("email" in changed) setEmail?.(all.email ?? "");
              if ("code" in changed)
                onChangeCode?.({ target: { value: all.code ?? "" } });
              if ("password" in changed) setPwd?.(all.password ?? "");
              if ("confirm" in changed) setPwd2?.(all.confirm ?? "");
            }}
            disabled={loading}
            autoComplete="on"
            size="large"
            validateTrigger={["onBlur"]}
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
                autoComplete="email"
              />
            </Form.Item>

            <Form.Item
              label="Kode 4 digit"
              name="code"
              rules={[
                { required: true, message: "Masukkan kode 4 digit" },
                { pattern: /^\d{4}$/, message: "Kode harus 4 angka" },
              ]}
              tooltip="Kode verifikasi yang dikirim ke email"
            >
              <Input
                prefix={<NumberOutlined />}
                inputMode="numeric"
                maxLength={4}
                placeholder="1234"
              />
            </Form.Item>

            <Form.Item
              label="Password baru"
              name="password"
              rules={[
                { required: true, message: "Masukkan password baru" },
                { min: 8, message: "Minimal 8 karakter" },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Minimal 8 karakter"
                autoComplete="new-password"
              />
            </Form.Item>

            <Form.Item
              label="Ulangi password baru"
              name="confirm"
              dependencies={["password"]}
              rules={[
                { required: true, message: "Ulangi password baru" },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    return !value || getFieldValue("password") === value
                      ? Promise.resolve()
                      : Promise.reject(new Error("Password tidak sama"));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                autoComplete="new-password"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 8 }}>
              <Button type="primary" htmlType="submit" block loading={loading}>
                {loading ? "Menyimpan..." : "Ubah Password"}
              </Button>
            </Form.Item>

            <div style={{ textAlign: "center", fontSize: 12 }}>
              <span style={{ color: "#fff" }}>Tidak mendapat kode?</span>{" "}
              <Button
                type="link"
                href={resendHref}
                icon={<ReloadOutlined />}
                style={{ padding: 0 }}
              >
                Kirim ulang
              </Button>
            </div>

            <div style={{ textAlign: "center", fontSize: 12, marginTop: 4 }}>
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
