"use client";

import { useEffect } from "react";
import { Button, Card, Input, Typography, notification } from "antd";

const { Title, Text } = Typography;

/* ===== styles only ===== */
const styles = {
  wrap: { width: "100vw", marginLeft: "calc(50% - 50vw)" },
  hero: {
    background: "linear-gradient(180deg,#d8edff 0%, #e4f0ff 55%, #ffffff 100%)",
    padding: "36px 16px 300px",
    marginTop: "calc(-1 * clamp(48px, 8vw, 84px))",
    overflow: "hidden",
  },
  heroInner: {
    width: "min(980px, 92%)",
    margin: "0 auto",
    position: "relative",
  },
  heroTitle: {
    textAlign: "center",
    fontWeight: 900,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#0B3E91",
    fontSize: "clamp(28px, 4vw, 44px)",
    margin: 0,
  },
  underline: {
    width: 160,
    height: 4,
    background:
      "linear-gradient(90deg, transparent 0%, #5aa6ff 40%, #5aa6ff 60%, transparent 100%)",
    borderRadius: 999,
    margin: "12px auto 0",
  },
  container: { width: "min(980px, 92%)", margin: "-230px auto 80px" },
  card: {
    borderRadius: 16,
    border: "2px solid #cfe0ff",
    boxShadow: "0 18px 40px rgba(8,42,116,0.12)",
    background: "#ffffff",
  },
  cardBody: { padding: 24 },
  label: {
    display: "block",
    fontSize: 12,
    fontWeight: 700,
    color: "#0f2b5a",
    marginBottom: 6,
  },
  req: { color: "#ff4d4f", marginLeft: 4, fontWeight: 900 },
  item: { marginBottom: 16 },
  input: {
    borderRadius: 8,
    background: "#f2f6fd",
    border: "1px solid #d9e6ff",
    height: 40,
  },
  textarea: {
    borderRadius: 8,
    background: "#f2f6fd",
    border: "1px solid #d9e6ff",
  },
  err: { color: "#ff4d4f", fontSize: 12, marginTop: 6 },
  btnWrap: { marginTop: 16, textAlign: "center" },
  btn: {
    minWidth: 240,
    height: 44,
    borderRadius: 10,
    fontWeight: 900,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    background: "#0B3E91",
    color: "#fff",
    border: "none",
  },
};

export default function FormMitraContent({
  // teks dari VM (sudah multilingual)
  ui,

  // form props dari VM
  values,
  errors,
  onChange,
  submit,
  canSubmit,
  loading,
  msg,
}) {
  const status = (k) => (errors?.[k] ? "error" : undefined);
  const [api, contextHolder] = notification.useNotification();

  useEffect(() => {
    if (!msg?.text) return;
    const isSuccess = msg.type === "success";
    api[isSuccess ? "success" : "error"]({
      message: isSuccess ? ui.notif.successTitle : ui.notif.errorTitle,
      description: msg.text,
      placement: "topRight",
      duration: 3.5,
    });
  }, [msg, api, ui.notif]);

  const LabelReq = ({ children }) => (
    <Text style={styles.label}>
      {children} <span style={styles.req}>{ui.reqMark}</span>
    </Text>
  );

  return (
    <div style={styles.wrap}>
      {contextHolder}

      <div style={styles.hero}>
        <div style={styles.heroInner}>
          <Title level={2} style={styles.heroTitle}>
            {ui.title}
          </Title>
          <div style={styles.underline} />
        </div>
      </div>

      <div style={styles.container}>
        <Card style={styles.card} bodyStyle={styles.cardBody}>
          {/* PIC Name */}
          <div style={styles.item}>
            <LabelReq>{ui.labels.contact_name}</LabelReq>
            <Input
              placeholder={ui.placeholders.contact_name}
              style={styles.input}
              value={values.contact_name}
              onChange={(e) => onChange("contact_name", e.target.value)}
              maxLength={191}
              status={status("contact_name")}
              required
              aria-required="true"
              aria-invalid={!!errors?.contact_name}
              allowClear
              autoComplete="name"
            />
            {errors?.contact_name ? (
              <div style={styles.err}>{errors.contact_name}</div>
            ) : null}
          </div>

          {/* Merchant/Organization */}
          <div style={styles.item}>
            <LabelReq>{ui.labels.merchant_name}</LabelReq>
            <Input
              placeholder={ui.placeholders.merchant_name}
              style={styles.input}
              value={values.merchant_name}
              onChange={(e) => onChange("merchant_name", e.target.value)}
              maxLength={191}
              status={status("merchant_name")}
              required
              aria-required="true"
              aria-invalid={!!errors?.merchant_name}
              allowClear
              autoComplete="organization"
            />
            {errors?.merchant_name ? (
              <div style={styles.err}>{errors.merchant_name}</div>
            ) : null}
          </div>

          {/* WhatsApp */}
          <div style={styles.item}>
            <LabelReq>{ui.labels.whatsapp}</LabelReq>
            <Input
              placeholder={ui.placeholders.whatsapp}
              style={styles.input}
              inputMode="tel"
              value={values.whatsapp}
              onChange={(e) => onChange("whatsapp", e.target.value)}
              maxLength={32}
              status={status("whatsapp")}
              required
              aria-required="true"
              aria-invalid={!!errors?.whatsapp}
              allowClear
              autoComplete="tel"
            />
            {errors?.whatsapp ? (
              <div style={styles.err}>{errors.whatsapp}</div>
            ) : null}
          </div>

          {/* Address */}
          <div style={styles.item}>
            <LabelReq>{ui.labels.address}</LabelReq>
            <Input.TextArea
              placeholder={ui.placeholders.address}
              style={styles.textarea}
              rows={3}
              value={values.address}
              onChange={(e) => onChange("address", e.target.value)}
              maxLength={500}
              status={status("address")}
              required
              aria-required="true"
              aria-invalid={!!errors?.address}
              allowClear
              autoComplete="street-address"
            />
            {errors?.address ? (
              <div style={styles.err}>{errors.address}</div>
            ) : null}
          </div>

          {/* Email */}
          <div style={styles.item}>
            <LabelReq>{ui.labels.email}</LabelReq>
            <Input
              placeholder={ui.placeholders.email}
              style={styles.input}
              type="email"
              value={values.email}
              onChange={(e) => onChange("email", e.target.value)}
              maxLength={191}
              status={status("email")}
              required
              aria-required="true"
              aria-invalid={!!errors?.email}
              allowClear
              autoComplete="email"
            />
            {errors?.email ? (
              <div style={styles.err}>{errors.email}</div>
            ) : null}
          </div>

          {/* KTP */}
          <div style={styles.item}>
            <LabelReq>{ui.labels.ktp_number}</LabelReq>
            <Input
              placeholder={ui.placeholders.ktp_number}
              style={styles.input}
              inputMode="numeric"
              value={values.ktp_number}
              onChange={(e) => onChange("ktp_number", e.target.value)}
              maxLength={20}
              status={status("ktp_number")}
              required
              aria-required="true"
              aria-invalid={!!errors?.ktp_number}
              allowClear
              autoComplete="off"
            />
            {errors?.ktp_number ? (
              <div style={styles.err}>{errors.ktp_number}</div>
            ) : null}
          </div>

          {/* Submit */}
          <div style={styles.btnWrap}>
            <Button
              style={styles.btn}
              size="large"
              loading={loading}
              disabled={!canSubmit}
              onClick={submit}
            >
              {ui.labels.submit}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
