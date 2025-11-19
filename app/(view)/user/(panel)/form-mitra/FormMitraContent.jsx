"use client";

import { useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Card, Input, Typography, notification } from "antd";
import useFormMitraViewModel from "./useFormMitraViewModel";

const { Title, Text } = Typography;

/* ===== Locale helper (sinkron dengan EventsUContent / EventsPContent) ===== */
const pickLocaleClient = (lang, ls, fallback = "id") => {
  const v = String(lang || ls || fallback)
    .slice(0, 2)
    .toLowerCase();
  return v === "en" ? "en" : "id";
};

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
  heroSub: {
    marginTop: 12,
    textAlign: "center",
    color: "#475569",
    fontSize: 14,
    lineHeight: 1.7,
    maxWidth: 640,
    marginLeft: "auto",
    marginRight: "auto",
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

export default function FormMitraContent(props) {
  const { initialLocale, locale: localeProp } = props || {};
  const search = useSearchParams();

  /* ===== Locale: ?lang / ?locale -> localStorage(oss.lang) -> baseLocale ===== */
  const baseLocale = initialLocale || localeProp || "id";

  const locale = useMemo(() => {
    const fromQuery = search?.get("lang") ?? search?.get("locale") ?? "";
    const fromLs =
      typeof window !== "undefined"
        ? window.localStorage.getItem("oss.lang") || ""
        : "";
    return pickLocaleClient(fromQuery || baseLocale, fromLs);
  }, [search, baseLocale]);

  // Persist locale supaya halaman lain (header, dsb.) konsisten
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("oss.lang", locale);
    } catch {
      // ignore
    }
  }, [locale]);

  /* ===== View model (multilingual) ===== */
  const vm = useFormMitraViewModel({ locale });
  const { ui, values, errors, onChange, submit, canSubmit, loading, msg } = vm;

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

  const handleSubmit = (e) => {
    e.preventDefault();
    submit();
  };

  const formAriaLabel =
    ui.formAriaLabel || ui.form_aria_label || ui.title || "Partnership form";

  return (
    <main
      className="form-mitra-page"
      style={styles.wrap}
      aria-labelledby="form-mitra-heading"
    >
      {contextHolder}

      {/* ===== HERO SECTION (SEO: H1) ===== */}
      <section style={styles.hero}>
        <div style={styles.heroInner}>
          <Title
            id="form-mitra-heading"
            level={1} // H1 untuk SEO
            style={styles.heroTitle}
          >
            {ui.title}
          </Title>
          <div style={styles.underline} />
          {/* Optional subcopy dari VM kalau ada */}
          {ui.subtitle || ui.description ? (
            <p style={styles.heroSub}>{ui.subtitle || ui.description}</p>
          ) : null}
        </div>
      </section>

      {/* ===== FORM SECTION ===== */}
      <section style={styles.container} aria-label={formAriaLabel}>
        <Card style={styles.card} bodyStyle={styles.cardBody}>
          <form onSubmit={handleSubmit} noValidate>
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
                name="contact_name"
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
                name="merchant_name"
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
                name="whatsapp"
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
                name="address"
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
                name="email"
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
                name="ktp_number"
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
                htmlType="submit"
              >
                {ui.labels.submit}
              </Button>
            </div>
          </form>
        </Card>
      </section>

      {/* Anti horizontal scroll kecil + aksesibilitas */}
      <style jsx global>{`
        .form-mitra-page {
          overflow-x: hidden;
        }
        @supports (overflow: clip) {
          .form-mitra-page {
            overflow-x: clip;
          }
        }
      `}</style>
    </main>
  );
}
