"use client";

import { Button, Card, Input, Typography, Alert } from "antd";

const { Title, Text } = Typography;

const styles = {
  wrap: {
    width: "100vw",
    marginLeft: "calc(50% - 50vw)",
  },

  hero: {
    background: "linear-gradient(180deg,#d8edff 0%, #e4f0ff 55%, #ffffff 100%)",
    padding: "36px 16px 300px", // ⬅️ panjangkan birunya ke bawah
    marginTop: "calc(-1 * clamp(48px, 8vw, 84px))",
    overflow: "hidden",
  },
  heroInner: {
    width: "min(980px, 92%)",
    margin: "0 auto",
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

  container: {
    width: "min(980px, 92%)",
    margin: "-230px auto 80px",
  },

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
  item: { marginBottom: 16 },

  input: {
    borderRadius: 8,
    background: "#f2f6fd",
    border: "1px solid #d9e6ff",
    height: 40,
  },

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
  values,
  onChange,
  submit,
  canSubmit,
  loading,
  msg,
}) {
  return (
    <div style={styles.wrap}>
      {/* Header / Title */}
      <div style={styles.hero}>
        <div style={styles.heroInner}>
          <Title level={2} style={styles.heroTitle}>
            FORM LEADS
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
          <div style={styles.item}>
            <Text style={styles.label}>Nama Lengkap</Text>
            <Input
              placeholder='"Ni Komang Putri Indah Puspita Sari"'
              style={styles.input}
              value={values.full_name}
              onChange={(e) => onChange("full_name", e.target.value)}
              maxLength={191}
            />
          </div>

          <div style={styles.item}>
            <Text style={styles.label}>Domisili</Text>
            <Input
              placeholder='"Denpasar"'
              style={styles.input}
              value={values.domicile}
              onChange={(e) => onChange("domicile", e.target.value)}
              maxLength={191}
            />
          </div>

          <div style={styles.item}>
            <Text style={styles.label}>Whatsapp</Text>
            <Input
              placeholder='"08xxxxxxxxxx"'
              style={styles.input}
              inputMode="tel"
              value={values.whatsapp}
              onChange={(e) => onChange("whatsapp", e.target.value)}
              maxLength={32}
            />
          </div>

          <div style={styles.item}>
            <Text style={styles.label}>Email</Text>
            <Input
              placeholder='"putri@gmail.com"'
              style={styles.input}
              type="email"
              value={values.email}
              onChange={(e) => onChange("email", e.target.value)}
              maxLength={191}
            />
          </div>

          <div style={styles.item}>
            <Text style={styles.label}>Last Education</Text>
            <Input
              placeholder='"Sarjana Komputer"'
              style={styles.input}
              value={values.education_last}
              onChange={(e) => onChange("education_last", e.target.value)}
              maxLength={191}
            />
          </div>

          <div style={styles.btnWrap}>
            <Button
              style={styles.btn}
              size="large"
              loading={loading}
              disabled={!canSubmit}
              onClick={submit}
            >
              SUBMIT
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
