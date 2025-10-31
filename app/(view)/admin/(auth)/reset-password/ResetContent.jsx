"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Row, Col, Card, Typography, Form, Input, Button, Alert } from "antd";
import useResetViewModel from "./useResetViewModel";

const { Title, Text } = Typography;

/* ---------- Design Tokens (match Login/Forgot) ---------- */
const FONT_FAMILY = '"Poppins", sans-serif';
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
    .reset-col-left { order: 1 }
    .reset-col-right { order: 2 }
    @media (max-width: 992px) {
      .reset-col-left { order: 2; height: 360px }
      .reset-col-right { order: 1; margin-bottom: 16px }
    }
    .login-input::placeholder { color: #9AA6B2 }
    .reset-link:hover { text-decoration: underline }
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

  // Optional: deteksi sukses (tidak mengubah logic inti)
  const successRegex = /berhasil|success|updated/i;
  const isSuccess = msg && successRegex.test(msg);

  return (
    <div style={styles.page}>
      <style>{styles.responsiveCSS}</style>
      <div style={styles.overlay} />

      <div style={styles.container}>
        <Title level={1} style={styles.title}>
          DASHBOARD ADMIN OSS BALI
        </Title>
        <Text style={styles.subtitle}>Buat kata sandi baru untuk akunmu</Text>

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
              <Text style={{ color: COLORS.subtext }}>
                Masukkan kode 4 digit yang dikirim ke email, lalu buat kata
                sandi baru.
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

                {/* Error / Info */}
                {msg ? (
                  <Alert
                    type={isSuccess ? "success" : "error"}
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
                    RESET PASSWORD
                  </Button>
                </Form.Item>

                {/* Links */}
                <div style={styles.helperRow}>
                  <Link
                    href={resendHref}
                    style={styles.link}
                    className="reset-link"
                  >
                    Kirim ulang kode
                  </Link>
                  <Link
                    href="/admin/login-page"
                    style={styles.link}
                    className="reset-link"
                  >
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
