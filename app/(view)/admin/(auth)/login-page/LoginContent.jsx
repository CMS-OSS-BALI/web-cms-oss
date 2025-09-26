"use client";

import Link from "next/link";
import {
  Row,
  Col,
  Card,
  Form,
  Input,
  Button,
  Typography,
  Alert,
  Space,
} from "antd";
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
    <>
      {/* NOTE: pakai class 'login-wrap' agar tidak bentrok dengan global .auth-wrap */}
      <div className="login-wrap">
        {/* wrap={false} biar dua kolom tidak membungkus ke bawah */}
        <Row className="login-row" gutter={[0, 0]} align="middle" wrap={false}>
          {/* KIRI: gambar */}
          <Col xs={0} md={12} className="login-left">
            <img src="/images/loading.png" alt="Maskot" className="login-img" />
          </Col>

          {/* KANAN: card */}
          <Col xs={24} md={12} className="login-right">
            <Card className="auth-card" variant="outlined">
              <Space direction="vertical" size={16} style={{ display: "flex" }}>
                <div>
                  <Typography.Title
                    level={3}
                    style={{ margin: 0, color: "#E6EAF2" }}
                  >
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
                  onFinish={() => onSubmit?.()}
                  onValuesChange={(changed, all) => {
                    if ("email" in changed) setEmail?.(all.email ?? "");
                    if ("password" in changed)
                      setPassword?.(all.password ?? "");
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
                    <Button
                      type="primary"
                      htmlType="submit"
                      block
                      loading={loading}
                    >
                      Masuk
                    </Button>
                  </Form.Item>

                  <div style={{ textAlign: "center", marginTop: 12 }}>
                    <Link
                      href={forgotHref}
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#93c5fd",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <QuestionCircleOutlined style={{ fontSize: 16 }} /> Lupa
                      password?
                    </Link>
                  </div>
                </Form>
              </Space>
            </Card>
          </Col>
        </Row>
      </div>

      <style jsx>{`
        .login-wrap {
          --pull: clamp(28px, 6vw, 100px);
        }
        .login-wrap {
          min-height: 100dvh;
          display: flex;
          align-items: center;
          /* geser naik: kecilkan padding atas, besarkan padding bawah */
          padding-block-start: clamp(
            0px,
            0vh,
            0px
          ); /* ↑ lebih kecil dari sebelumnya */
          padding-block-end: clamp(
            84px,
            16vh,
            160px
          ); /* ↑ sedikit lebih besar */
          padding-inline: clamp(24px, 5vw, 64px);
          background: radial-gradient(
            1200px 600px at 80% 20%,
            #0f172a 0%,
            #0b1223 60%,
            #0a0f1e 100%
          );
        }

        .login-row {
          width: 100%;
        }

        .login-left {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          overflow: visible;
        }
        .login-img {
          width: clamp(320px, 52%, 560px);
          height: auto;
          object-fit: contain;
          transform: translateX(var(--pull));
          user-select: none;
          -webkit-user-drag: none;
        }

        .login-right {
          display: flex;
          align-items: center;
          justify-content: flex-start;
        }
        .auth-card {
          width: 100%;
          max-width: 420px;
          margin-left: calc(var(--pull) * -0.55);
          border-radius: 16px;
          background: rgba(13, 18, 35, 0.85);
          border: 1px solid #1f2a44;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
          backdrop-filter: blur(10px);
        }

        /* Mobile: jangan terlalu dekat atas */
        @media (max-width: 767px) {
          .login-wrap {
            padding-block: clamp(40px, 12vh, 96px);
          }
          .login-img {
            transform: none;
          }
          .auth-card {
            margin-left: 0;
            max-width: 94%;
            margin-inline: auto;
          }
        }
      `}</style>
    </>
  );
}
