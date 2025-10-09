"use client";

import { Button, Card, Input, Typography, Alert } from "antd";

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
    background: "linear-gradient(180deg,#d8edff 0%, #e4f0ff 55%, #ffffff 100%)",
    padding: "36px 16px 300px",
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
  help: { color: "#6b7da3", fontSize: 12, marginTop: 6 },
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

  return (
    <div style={styles.wrap}>
      {/* Header / Title */}
      <div style={styles.hero}>
        <div style={styles.heroInner}>
          <Title level={2} style={styles.heroTitle}>
            {U.title}
          </Title>
          <div style={styles.underline} />
        </div>
      </div>

      {/* Form card */}
      <div style={styles.container}>
        {msg?.text ? (
          <Alert
            type={msg.type === "success" ? "success" : "error"}
            message={msg.text}
            showIcon
            style={{ marginBottom: 16 }}
          />
        ) : null}

        <Card style={styles.card} bodyStyle={styles.cardBody}>
          {/* Full Name */}
          <div style={styles.item}>
            <Text style={styles.label}>
              {U.labels.full_name} <span style={styles.req}>{U.reqMark}</span>
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
              allowClear
            />
          </div>

          {/* Domicile */}
          <div style={styles.item}>
            <Text style={styles.label}>
              {U.labels.domicile} <span style={styles.req}>{U.reqMark}</span>
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
              allowClear
            />
          </div>

          {/* Whatsapp */}
          <div style={styles.item}>
            <Text style={styles.label}>
              {U.labels.whatsapp} <span style={styles.req}>{U.reqMark}</span>
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
              allowClear
            />
          </div>

          {/* Email */}
          <div style={styles.item}>
            <Text style={styles.label}>
              {U.labels.email} <span style={styles.req}>{U.reqMark}</span>
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
              allowClear
            />
          </div>

          {/* Last Education */}
          <div style={styles.item}>
            <Text style={styles.label}>
              {U.labels.education_last}{" "}
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
              allowClear
            />
          </div>

          {/* Referral Code (optional) */}
          <div style={styles.item}>
            <Text style={styles.label}>{U.labels.referral_code}</Text>
            <Input
              placeholder={U.placeholders.referral_code}
              style={styles.input}
              value={values.referral_code}
              onChange={(e) => onChange("referral_code", e.target.value)}
              maxLength={64}
              allowClear
            />
            <div style={styles.help}>{U.help.referral}</div>
          </div>

          <div style={styles.btnWrap}>
            <Button
              style={styles.btn}
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
    </div>
  );
}
