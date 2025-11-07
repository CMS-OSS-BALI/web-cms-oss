"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Row, Col, Card, Typography, Form, Input, Button, Alert } from "antd";
import useLoginViewModel from "./useLoginViewModel";

const { Title, Text } = Typography;

/* ---------- Design Tokens ---------- */
const FONT_FAMILY = '"Public Sans", sans-serif';
const COLORS = {
  blue: "#0B56C9",
  blueDark: "#0B3E91",
  blueSoft: "#4DA3FF",
  text: "#0f172a",
  subtext: "#73839b",
  white: "#ffffff",
  border: "rgba(12,42,97,.08)",
};
const ASSETS = {
  bg: "/images/login-bg.svg",
  mascot: "/images/oss-bird.svg",
};

/* ---------- Styles ---------- */
const styles = {
  page: {
    minHeight: "100vh",
    position: "relative",
    backgroundImage: `url(${ASSETS.bg})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    fontFamily: FONT_FAMILY,
    display: "flex",
    flexDirection: "column",
  },
  overlay: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(180deg, rgba(255,255,255,.85) 0%, rgba(255,255,255,.65) 40%, rgba(255,255,255,.75) 100%)",
    pointerEvents: "none",
  },
  container: {
    width: "min(1360px, 96%)",
    margin: "0 auto",
    padding: "28px 0 44px",
    position: "relative",
    zIndex: 1,
    flex: 1,
  },
  title: {
    textAlign: "center",
    color: COLORS.blueDark,
    fontWeight: 800,
    letterSpacing: ".4px",
    marginBottom: 18,
  },
  subtitle: {
    textAlign: "center",
    color: COLORS.subtext,
    marginBottom: 24,
    fontWeight: 500,
  },
  mascotWrap: {
    position: "relative",
    height: "min(72vh, 700px)",
    minHeight: 420,
  },
  glassCard: {
    borderRadius: 20,
    background: "rgba(255,255,255,.68)",
    border: `1px solid ${COLORS.border}`,
    boxShadow: "0 20px 40px rgba(11, 38, 86, .12)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
  },
  label: {
    fontWeight: 700,
    color: COLORS.blueDark,
    marginBottom: 6,
  },
  input: {
    background: "transparent",
    border: "none",
    color: COLORS.text,
    padding: "10px 0 8px",
  },
  underline: (active) => ({
    width: "100%",
    height: 2,
    background: active
      ? "linear-gradient(90deg, #0B56C9 0%, #4DA3FF 100%)"
      : "rgba(11, 86, 201, .18)",
    borderRadius: 2,
    marginBottom: 14,
    transition: "background .2s ease",
  }),
  btn: {
    width: "100%",
    fontWeight: 800,
    letterSpacing: ".6px",
    height: 44,
    borderRadius: 12,
    border: "none",
    background: "linear-gradient(90deg, #0B56C9 0%, #4DA3FF 100%)",
    color: "#fff",
    boxShadow: "0 10px 24px rgba(11, 86, 201, .28)",
  },
  forgotRow: { textAlign: "right", marginTop: 12 },
  link: {
    color: COLORS.blueDark,
    fontWeight: 700,
    textDecoration: "none",
  },
  responsiveCSS: `
    .login-col-left { order: 1 }
    .login-col-right { order: 2 }
    @media (max-width: 992px) {
      .login-col-left { order: 2; height: 360px }
      .login-col-right { order: 1; margin-bottom: 16px }
    }
    .login-input::placeholder { color: #9AA6B2 }
    .login-forgot:hover { text-decoration: underline }
  `,
};

export default function LoginContent() {
  const { email, setEmail, password, setPassword, loading, msg, onSubmit } =
    useLoginViewModel();

  const [focus, setFocus] = useState("email");
  const underlineEmail = useMemo(
    () => styles.underline(focus === "email"),
    [focus]
  );
  const underlinePwd = useMemo(
    () => styles.underline(focus === "password"),
    [focus]
  );

  return (
    <div style={styles.page}>
      <style>{styles.responsiveCSS}</style>
      <div style={styles.overlay} />

      <div style={styles.container}>
        <Title level={1} style={styles.title}>
          DASHBOARD ADMIN OSS BALI
        </Title>

        <Row gutter={[28, 28]} align="middle" justify="space-between">
          {/* Left: Mascot Illustration */}
          <Col xs={24} lg={12} className="login-col-left">
            <div style={styles.mascotWrap}>
              <Image
                src={ASSETS.mascot}
                alt="OSS Bali Mascot"
                fill
                priority
                style={{ objectFit: "contain", objectPosition: "left bottom" }}
              />
            </div>
          </Col>

          {/* Right: Login Card */}
          <Col xs={24} lg={12} className="login-col-right">
            <Card style={styles.glassCard} bodyStyle={{ padding: 28 }}>
              <Form
                layout="vertical"
                onSubmitCapture={onSubmit}
                requiredMark={false}
              >
                {/* Username */}
                <Form.Item label={<Text style={styles.label}>Username</Text>}>
                  <Input
                    className="login-input"
                    size="large"
                    bordered={false}
                    style={styles.input}
                    placeholder="Masukkan email/username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocus("email")}
                    autoComplete="username"
                  />
                  <div style={underlineEmail} />
                </Form.Item>

                {/* Password */}
                <Form.Item label={<Text style={styles.label}>Password</Text>}>
                  <Input.Password
                    className="login-input"
                    size="large"
                    bordered={false}
                    style={styles.input}
                    placeholder="Masukkan password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocus("password")}
                    autoComplete="current-password"
                  />
                  <div style={underlinePwd} />
                </Form.Item>

                {/* Error / Info */}
                {msg ? (
                  <Alert
                    type="error"
                    showIcon
                    message={msg}
                    style={{ marginBottom: 12 }}
                  />
                ) : null}

                {/* Submit */}
                <Form.Item style={{ marginBottom: 0 }}>
                  <Button
                    type="default"
                    htmlType="submit"
                    loading={loading}
                    style={styles.btn}
                  >
                    MASUK
                  </Button>
                </Form.Item>

                {/* Forgot Password */}
                <div style={styles.forgotRow}>
                  <Link
                    href="/admin/forgot-password"
                    style={{ ...styles.link }}
                    className="login-forgot"
                  >
                    Lupa Kata Sandi?
                  </Link>
                </div>
              </Form>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
}

