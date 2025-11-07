"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Row, Col, Card, Typography, Form, Input, Button, Alert } from "antd";
import useForgotViewModel from "./useForgotViewModel";

const { Title, Text } = Typography;

/* ---------- Design Tokens (match LoginContent) ---------- */
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
  label: { fontWeight: 700, color: COLORS.blueDark, marginBottom: 6 },
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
  helperRow: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: 12,
  },
  link: {
    color: COLORS.blueDark,
    fontWeight: 700,
    textDecoration: "none",
  },
  responsiveCSS: `
    .forgot-col-left { order: 1 }
    .forgot-col-right { order: 2 }
    @media (max-width: 992px) {
      .forgot-col-left { order: 2; height: 360px }
      .forgot-col-right { order: 1; margin-bottom: 16px }
    }
    .login-input::placeholder { color: #9AA6B2 }
    .forgot-link:hover { text-decoration: underline }
  `,
};

export default function ForgotContent() {
  const { email, setEmail, loading, msg, cooldown, disabled, onSubmit } =
    useForgotViewModel();

  const [focus, setFocus] = useState("email");
  const underlineEmail = useMemo(
    () => styles.underline(focus === "email"),
    [focus]
  );

  const successRegex = /terdaftar|kode telah dikirim|periksa inbox/i;
  const isSuccess = msg && successRegex.test(msg);
  const btnLabel = loading
    ? "MENGIRIM..."
    : cooldown > 0
    ? `KIRIM ULANG (${cooldown}s)`
    : "KIRIM KODE";

  return (
    <div style={styles.page}>
      <style>{styles.responsiveCSS}</style>
      <div style={styles.overlay} />

      <div style={styles.container}>
        <Title level={1} style={styles.title}>
          DASHBOARD ADMIN OSS BALI
        </Title>

        <Row gutter={[28, 28]} align="middle" justify="space-between">
          {/* LEFT: Mascot */}
          <Col xs={24} lg={12} className="forgot-col-left">
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

          {/* RIGHT: Card */}
          <Col xs={24} lg={12} className="forgot-col-right">
            <Card style={styles.glassCard} bodyStyle={{ padding: 28 }}>
              <Title
                level={4}
                style={{
                  marginTop: 0,
                  color: COLORS.blueDark,
                  fontWeight: 800,
                }}
              >
                Lupa Kata Sandi
              </Title>
              <Text style={{ color: COLORS.subtext }}>
                Masukkan email terdaftar. Kami akan mengirimkan kode atau tautan
                reset.
              </Text>

              <Form
                layout="vertical"
                onSubmitCapture={onSubmit}
                requiredMark={false}
                style={{ marginTop: 16 }}
              >
                <Form.Item label={<Text style={styles.label}>Email</Text>}>
                  <Input
                    className="login-input"
                    size="large"
                    bordered={false}
                    style={styles.input}
                    placeholder="nama@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocus("email")}
                    type="email"
                    autoComplete="email"
                  />
                  <div style={underlineEmail} />
                </Form.Item>

                {msg ? (
                  <Alert
                    type={isSuccess ? "success" : "error"}
                    showIcon
                    message={msg}
                    style={{ marginBottom: 12 }}
                  />
                ) : null}

                <Form.Item style={{ marginBottom: 0 }}>
                  <Button
                    type="default"
                    htmlType="submit"
                    loading={loading}
                    disabled={disabled}
                    style={{
                      ...styles.btn,
                      opacity: disabled ? 0.75 : 1,
                      cursor: disabled ? "not-allowed" : "pointer",
                    }}
                  >
                    {btnLabel}
                  </Button>
                </Form.Item>

                <div style={styles.helperRow}>
                  <Link
                    href="/admin/login-page"
                    style={styles.link}
                    className="forgot-link"
                  >
                    Kembali ke Login
                  </Link>
                  <Link
                    href="/admin/forgot-password?email="
                    style={styles.link}
                    className="forgot-link"
                  >
                    Gunakan email lain
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

