"use client";

import { useEffect } from "react";
import { Button, Card, Input, Typography, notification } from "antd";
import {
  UserOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  MailOutlined,
  ReadOutlined,
  TagOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

const UI = {
  id: {
    title: "FORM LEADS",
    labels: {
      full_name: "Nama Lengkap",
      domicile: "Domisili",
      whatsapp: "Whatsapp",
      email: "Email",
      education_last: "Pendidikan Terakhir",
      referral_code: "Kode Referral (opsional)",
      submit: "SUBMIT",
    },
    placeholders: {
      full_name:
        "Masukkan nama lengkap sesuai KTP (contoh: Ni Komang Putri Indah Puspita Sari)",
      domicile: "Kota/Kabupaten, Provinsi (contoh: Denpasar, Bali)",
      whatsapp: "Gunakan format 08… atau +62… (contoh: +6281234567890)",
      email: "Alamat email aktif (contoh: putri@example.com)",
      education_last:
        "Pendidikan terakhir (contoh: SMA/SMK, D3, S1 Teknik Informatika)",
      referral_code:
        "Jika ada, masukkan kode referral (contoh: OSSBALI/2025/REFERRAL-66B123)",
    },
    help: {
      referral: "Kode ini menghubungkan data Anda ke referral terkait.",
    },
    reqMark: "*",
  },
  en: {
    title: "LEADS FORM",
    labels: {
      full_name: "Full Name",
      domicile: "Domicile",
      whatsapp: "Whatsapp",
      email: "Email",
      education_last: "Last Education",
      referral_code: "Referral Code (optional)",
      submit: "SUBMIT",
    },
    placeholders: {
      full_name:
        "Enter your full legal name (e.g., Ni Komang Putri Indah Puspita Sari)",
      domicile: "City/Regency, Province (e.g., Denpasar, Bali)",
      whatsapp: "Use 08… or +62… format (e.g., +6281234567890)",
      email: "Active email address (e.g., putri@example.com)",
      education_last:
        "Highest education (e.g., High School, Diploma, B.Sc. in Informatics)",
      referral_code:
        "If any, enter referral code (e.g., OSSBALI/2025/REFERRAL-66B123)",
    },
    help: {
      referral: "This code links your data to the corresponding referral.",
    },
    reqMark: "*",
  },
};

const styles = {
  wrap: { width: "100vw", marginLeft: "calc(50% - 50vw)" },
  hero: {
    position: "relative",
    background: "linear-gradient(180deg,#d8edff 0%, #e4f0ff 55%, #ffffff 100%)",
    padding: "42px 16px 300px",
    marginTop: "calc(-1 * clamp(48px, 8vw, 84px))",
    overflow: "hidden",
  },
  heroInner: { width: "min(980px, 92%)", margin: "0 auto" },
  heroTitle: {
    textAlign: "center",
    fontWeight: 900,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#0B3E91",
    fontSize: "clamp(28px, 4vw, 46px)",
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
  container: { width: "min(720px, 92%)", margin: "-240px auto 80px" }, // sedikit lebih ramping agar nyaman di desktop 1 kolom
  card: {
    borderRadius: 18,
    border: "1px solid #cfe0ff",
    boxShadow: "0 18px 42px rgba(8,42,116,0.12)",
    background: "#ffffff",
    overflow: "hidden",
  },
  cardBody: { padding: "22px 18px 24px" },
  label: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    fontWeight: 800,
    color: "#0f2b5a",
    letterSpacing: ".02em",
    marginBottom: 6,
  },
  req: { color: "#ff4d4f", marginLeft: 2, fontWeight: 900 },
  item: { marginBottom: 16 },
  input: {
    borderRadius: 10,
    background: "#f5f8ff",
    border: "1px solid #d9e6ff",
    height: 44,
  },
  help: { color: "#6b7da3", fontSize: 12, marginTop: 6 },
  btnWrap: { marginTop: 12, textAlign: "center" },
  btn: {
    minWidth: 240,
    height: 46,
    borderRadius: 12,
    fontWeight: 900,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    background: "linear-gradient(135deg,#0B56C9 0%, #0B3E91 100%)",
    color: "#fff",
    border: "none",
  },
};

export default function LeadsUContent({
  locale = "id",
  values,
  errors,
  onChange,
  submit,
  canSubmit,
  loading,
  msg,
}) {
  const lang = locale === "en" ? "en" : "id";
  const U = UI[lang];
  const status = (k) => (errors?.[k] ? "error" : undefined);

  const [api, contextHolder] = notification.useNotification();

  useEffect(() => {
    if (!msg?.text) return;
    const isSuccess = msg.type === "success";
    api[isSuccess ? "success" : "error"]({
      message: isSuccess
        ? lang === "en"
          ? "Success"
          : "Berhasil"
        : lang === "en"
        ? "Error"
        : "Gagal",
      description: msg.text,
      placement: "topRight",
      duration: 3.5,
    });
  }, [msg, api, lang]);

  const enterToSubmit = () => {
    if (canSubmit && !loading) submit();
  };

  return (
    <div style={styles.wrap} className="leads-form">
      {contextHolder}

      {/* Header */}
      <div style={styles.hero} className="leads-hero">
        <div style={styles.heroInner}>
          <Title level={2} style={styles.heroTitle}>
            {U.title}
          </Title>
          <div style={styles.underline} />
        </div>
      </div>

      {/* Form */}
      <div style={styles.container}>
        <Card style={styles.card} bodyStyle={styles.cardBody}>
          <div className="form-grid">
            {/* Full Name */}
            <div className={`form-item ${errors?.full_name ? "error" : ""}`}>
              <Text style={styles.label}>
                {U.labels.full_name}
                <span style={styles.req}>{U.reqMark}</span>
              </Text>
              <Input
                placeholder={U.placeholders.full_name}
                style={styles.input}
                value={values.full_name}
                onChange={(e) => onChange("full_name", e.target.value)}
                maxLength={191}
                status={status("full_name")}
                required
                aria-required="true"
                aria-invalid={!!errors?.full_name}
                aria-describedby="err-full_name"
                allowClear
                prefix={<UserOutlined />}
                onPressEnter={enterToSubmit}
                autoComplete="name"
              />
              {errors?.full_name ? (
                <div id="err-full_name" className="err">
                  {errors.full_name}
                </div>
              ) : null}
            </div>

            {/* Domicile */}
            <div className={`form-item ${errors?.domicile ? "error" : ""}`}>
              <Text style={styles.label}>
                {U.labels.domicile}
                <span style={styles.req}>{U.reqMark}</span>
              </Text>
              <Input
                placeholder={U.placeholders.domicile}
                style={styles.input}
                value={values.domicile}
                onChange={(e) => onChange("domicile", e.target.value)}
                maxLength={191}
                status={status("domicile")}
                required
                aria-required="true"
                aria-invalid={!!errors?.domicile}
                aria-describedby="err-domicile"
                allowClear
                prefix={<EnvironmentOutlined />}
                onPressEnter={enterToSubmit}
                autoComplete="address-level2"
              />
              {errors?.domicile ? (
                <div id="err-domicile" className="err">
                  {errors.domicile}
                </div>
              ) : null}
            </div>

            {/* Whatsapp */}
            <div className={`form-item ${errors?.whatsapp ? "error" : ""}`}>
              <Text style={styles.label}>
                {U.labels.whatsapp}
                <span style={styles.req}>{U.reqMark}</span>
              </Text>
              <Input
                placeholder={U.placeholders.whatsapp}
                style={styles.input}
                inputMode="tel"
                value={values.whatsapp}
                onChange={(e) => onChange("whatsapp", e.target.value)}
                maxLength={32}
                status={status("whatsapp")}
                required
                aria-required="true"
                aria-invalid={!!errors?.whatsapp}
                aria-describedby="err-whatsapp"
                allowClear
                prefix={<PhoneOutlined />}
                onPressEnter={enterToSubmit}
                autoComplete="tel"
              />
              {errors?.whatsapp ? (
                <div id="err-whatsapp" className="err">
                  {errors.whatsapp}
                </div>
              ) : null}
            </div>

            {/* Email */}
            <div className={`form-item ${errors?.email ? "error" : ""}`}>
              <Text style={styles.label}>
                {U.labels.email}
                <span style={styles.req}>{U.reqMark}</span>
              </Text>
              <Input
                placeholder={U.placeholders.email}
                style={styles.input}
                type="email"
                value={values.email}
                onChange={(e) => onChange("email", e.target.value)}
                maxLength={191}
                status={status("email")}
                required
                aria-required="true"
                aria-invalid={!!errors?.email}
                aria-describedby="err-email"
                allowClear
                prefix={<MailOutlined />}
                onPressEnter={enterToSubmit}
                autoComplete="email"
              />
              {errors?.email ? (
                <div id="err-email" className="err">
                  {errors.email}
                </div>
              ) : null}
            </div>

            {/* Last Education */}
            <div
              className={`form-item ${errors?.education_last ? "error" : ""}`}
            >
              <Text style={styles.label}>
                {U.labels.education_last}
                <span style={styles.req}>{U.reqMark}</span>
              </Text>
              <Input
                placeholder={U.placeholders.education_last}
                style={styles.input}
                value={values.education_last}
                onChange={(e) => onChange("education_last", e.target.value)}
                maxLength={191}
                status={status("education_last")}
                required
                aria-required="true"
                aria-invalid={!!errors?.education_last}
                aria-describedby="err-education_last"
                allowClear
                prefix={<ReadOutlined />}
                onPressEnter={enterToSubmit}
                autoComplete="organization-title"
              />
              {errors?.education_last ? (
                <div id="err-education_last" className="err">
                  {errors.education_last}
                </div>
              ) : null}
            </div>

            {/* Referral Code (optional) */}
            <div className="form-item">
              <Text style={styles.label}>{U.labels.referral_code}</Text>
              <Input
                placeholder={U.placeholders.referral_code}
                style={styles.input}
                value={values.referral_code}
                onChange={(e) => onChange("referral_code", e.target.value)}
                maxLength={64}
                allowClear
                prefix={<TagOutlined />}
                onPressEnter={enterToSubmit}
                aria-describedby="help-ref"
                autoComplete="off"
              />
              <div style={styles.help} id="help-ref">
                {U.help.referral}
              </div>
            </div>
          </div>

          <div style={styles.btnWrap}>
            <Button
              style={styles.btn}
              className="btn-primary"
              size="large"
              loading={loading}
              disabled={!canSubmit}
              onClick={submit}
            >
              {U.labels.submit}
            </Button>
          </div>
        </Card>
      </div>

      <style jsx global>{`
        .leads-hero::before {
          content: "";
          position: absolute;
          inset: -30% -10% auto -10%;
          height: 320px;
          background: radial-gradient(
            60% 70% at 50% 20%,
            rgba(90, 166, 255, 0.35) 0%,
            rgba(90, 166, 255, 0.12) 45%,
            transparent 70%
          );
          pointer-events: none;
          filter: blur(12px);
        }

        /* Fixed one-column grid everywhere */
        .leads-form .form-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: clamp(12px, 2.4vw, 18px);
        }

        .leads-form .ant-input {
          transition: box-shadow 160ms ease, border-color 160ms ease,
            background-color 160ms ease;
        }
        .leads-form .ant-input:focus,
        .leads-form .ant-input:focus-within {
          background: #ffffff;
          border-color: #5aa6ff !important;
          box-shadow: 0 0 0 3px rgba(90, 166, 255, 0.25);
        }
        .leads-form .ant-input-status-error:not(.ant-input-disabled) {
          background: #fff7f7 !important;
        }
        .leads-form .ant-input-affix-wrapper .anticon {
          color: #5a7bbd;
        }
        .leads-form .err {
          margin-top: 6px;
          color: #d4380d;
          font-size: 12px;
          line-height: 1.4;
          font-weight: 600;
        }
        .leads-form .form-item.error .ant-input {
          border-color: #ff7875 !important;
        }
        .leads-form .btn-primary {
          box-shadow: 0 16px 32px rgba(11, 86, 201, 0.22);
          transition: transform 140ms ease, box-shadow 140ms ease,
            filter 140ms ease;
        }
        @media (hover: hover) {
          .leads-form .btn-primary:hover:not([disabled]) {
            transform: translateY(-1px);
            box-shadow: 0 20px 38px rgba(11, 86, 201, 0.28);
            filter: saturate(1.05);
          }
        }
        .leads-form .btn-primary:focus-visible {
          outline: 3px solid #5aa6ff;
          outline-offset: 2px;
        }
        .leads-form .btn-primary[disabled] {
          filter: grayscale(0.2) brightness(0.92);
          box-shadow: 0 10px 22px rgba(11, 86, 201, 0.16);
        }
        .leads-form input::placeholder {
          color: #8aa0c6 !important;
        }
        .leads-form .ant-card > .ant-card-body {
          position: relative;
        }
        .leads-form .ant-card > .ant-card-body::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 6px;
          background: linear-gradient(90deg, #0b56c9, #5aa6ff 60%, #0b3e91);
          border-top-left-radius: 18px;
          border-top-right-radius: 18px;
        }
      `}</style>
    </div>
  );
}
