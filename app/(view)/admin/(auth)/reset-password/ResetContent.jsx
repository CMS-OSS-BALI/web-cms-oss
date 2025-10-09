"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Row, Col, Card, Typography, Form, Input, Button, Alert } from "antd";
import useResetViewModel from "./useResetViewModel";

const { Title, Text } = Typography;

/* ---------- Tokens (samakan dengan LoginContent.jsx) ---------- */
const FONT_FAMILY = '"Poppins", sans-serif';
const COLORS = {
  blue: "#0b56c9",
  blueDark: "#0a469f",
  yellow: "#ffd21e",
  white: "#ffffff",
};
const ASSETS = {
  bg: "/images/login-bg.svg", // <- ganti sesuai asetmu
  mascot: "/images/oss-bird.svg", // <- ganti sesuai asetmu
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
      "linear-gradient(90deg, rgba(255,255,255,.65) 0%, rgba(255,255,255,.35) 45%, rgba(255,255,255,.65) 100%)",
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
    letterSpacing: ".6px",
    marginBottom: 24,
  },
  mascotWrap: {
    position: "relative",
    height: "min(72vh, 720px)",
    minHeight: 420,
  },
  glassCard: {
    borderRadius: 24,
    background: "rgba(255,255,255,.35)",
    border: "1px solid rgba(255,255,255,.5)",
    boxShadow: "0 16px 36px rgba(10,20,40,.16)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
  },
  label: {
    fontWeight: 700,
    color: COLORS.blueDark,
    marginBottom: 6,
  },
  input: {
    background: "transparent",
    border: "none",
    color: COLORS.white,
    padding: "8px 0 10px",
  },
  underline: (active) => ({
    width: "100%",
    height: 3,
    background: active ? COLORS.yellow : "rgba(255,255,255,.9)",
    borderRadius: 2,
    marginBottom: 14,
  }),
  btn: { width: "100%", fontWeight: 800, letterSpacing: ".6px", height: 44 },
  helperRow: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: 12,
  },
  link: {
    color: COLORS.blueDark,
    fontWeight: 700,
    textDecoration: "underline",
  },
  responsiveCSS: `
    .reset-col-left { order: 1 }
    .reset-col-right { order: 2 }
    @media (max-width: 992px) {
      .reset-col-left { order: 2; height: 360px }
      .reset-col-right { order: 1; margin-bottom: 20px }
    }
    .login-input::placeholder { color: rgba(255,255,255,.85) }
  `,
};

export default function ResetContent() {
  const {
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
  } = useResetViewModel();

  const [focus, setFocus] = useState("email");
  const underlineEmail = useMemo(
    () => styles.underline(focus === "email"),
    [focus]
  );
  const underlineCode = useMemo(
    () => styles.underline(focus === "code"),
    [focus]
  );
  const underlinePwd = useMemo(
    () => styles.underline(focus === "pwd"),
    [focus]
  );
  const underlinePwd2 = useMemo(
    () => styles.underline(focus === "pwd2"),
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
          {/* Left: Mascot */}
          <Col xs={24} lg={12} className="reset-col-left">
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

          {/* Right: Reset Card */}
          <Col xs={24} lg={12} className="reset-col-right">
            <Card style={styles.glassCard} bodyStyle={{ padding: 28 }}>
              <Title
                level={4}
                style={{
                  marginTop: 0,
                  color: COLORS.blueDark,
                  fontWeight: 800,
                }}
              >
                Reset Kata Sandi
              </Title>
              <Text style={{ color: COLORS.blueDark }}>
                Masukkan kode 4 digit yang dikirim ke email, lalu buat password
                baru.
              </Text>

              <Form
                layout="vertical"
                onSubmitCapture={onSubmit}
                requiredMark={false}
                style={{ marginTop: 16 }}
              >
                {/* Email */}
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

                {/* Kode 4 Digit */}
                <Form.Item
                  label={<Text style={styles.label}>Kode 4 Digit</Text>}
                >
                  <Input
                    className="login-input"
                    size="large"
                    bordered={false}
                    style={styles.input}
                    placeholder="1234"
                    value={code}
                    onChange={onChangeCode}
                    onFocus={() => setFocus("code")}
                    inputMode="numeric"
                    pattern="\d*"
                    maxLength={4}
                  />
                  <div style={underlineCode} />
                </Form.Item>

                {/* Password Baru */}
                <Form.Item
                  label={<Text style={styles.label}>Password Baru</Text>}
                >
                  <Input.Password
                    className="login-input"
                    size="large"
                    bordered={false}
                    style={styles.input}
                    placeholder="Minimal 8 karakter"
                    value={pwd}
                    onChange={(e) => setPwd(e.target.value)}
                    onFocus={() => setFocus("pwd")}
                    autoComplete="new-password"
                  />
                  <div style={underlinePwd} />
                </Form.Item>

                {/* Konfirmasi Password */}
                <Form.Item
                  label={<Text style={styles.label}>Konfirmasi Password</Text>}
                >
                  <Input.Password
                    className="login-input"
                    size="large"
                    bordered={false}
                    style={styles.input}
                    placeholder="Ulangi password baru"
                    value={pwd2}
                    onChange={(e) => setPwd2(e.target.value)}
                    onFocus={() => setFocus("pwd2")}
                    autoComplete="new-password"
                  />
                  <div style={underlinePwd2} />
                </Form.Item>

                {/* Error/Info */}
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
                    style={{
                      ...styles.btn,
                      background: COLORS.yellow,
                      color: COLORS.blueDark,
                      boxShadow: "0 8px 16px rgba(255,210,30,.35)",
                      border: "none",
                      borderRadius: 12,
                    }}
                  >
                    RESET PASSWORD
                  </Button>
                </Form.Item>

                {/* Links */}
                <div style={styles.helperRow}>
                  <Link href={resendHref} style={styles.link}>
                    Kirim ulang kode
                  </Link>
                  <Link href="/admin/login-page" style={styles.link}>
                    Kembali ke Login
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
