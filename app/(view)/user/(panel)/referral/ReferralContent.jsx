"use client";

import React, { useRef, useEffect, useState } from "react";
import {
  Button,
  Card,
  Input,
  Typography,
  notification,
  DatePicker,
  Select,
  Row,
  Col,
  message,
} from "antd";
import { DeleteOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;
const { TextArea } = Input;

/* ========= responsive hook ========= */
function useIsNarrow(bp = 900) {
  const [n, setN] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const m = window.matchMedia(`(max-width:${bp}px)`);
    const apply = () => setN(m.matches);
    apply();
    m.addEventListener?.("change", apply);
    return () => m.removeEventListener?.("change", apply);
  }, [bp]);
  return n;
}

/* ========= base styles ========= */
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

  sectionTitle: {
    fontSize: 14,
    fontWeight: 900,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#0B3E91",
    margin: "4px 0 10px",
  },
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
  textArea: {
    borderRadius: 8,
    background: "#f2f6fd",
    border: "1px solid #d9e6ff",
  },

  ktpDrop: {
    border: "2px dashed #7fb0ff",
    borderRadius: 12,
    background:
      "repeating-linear-gradient(-45deg,#f3f8ff,#f3f8ff 10px,#f7fbff 10px,#f7fbff 20px)",
    padding: 18,
    cursor: "pointer",
    display: "grid",
    placeItems: "center",
    textAlign: "center",
    minHeight: 120,
  },
  ktpInner: { display: "grid", placeItems: "center", gap: 8 },
  ktpHint: { color: "#4466aa", fontWeight: 700 },
  ktpSub: { color: "#6e87b8", fontSize: 12 },

  previewBox: {
    position: "relative",
    border: "1px solid #d9e6ff",
    borderRadius: 12,
    padding: 12,
    background: "#fff",
  },
  previewImg: {
    width: "100%",
    maxHeight: 380,
    objectFit: "contain",
    borderRadius: 10,
    display: "block",
  },
  deleteOverlay: {
    position: "absolute",
    inset: 0,
    display: "grid",
    placeItems: "center",
    background: "rgba(11,62,145,0.12)",
    opacity: 0,
    transition: "opacity .2s ease",
    borderRadius: 12,
  },
  deleteBtn: {
    width: 54,
    height: 54,
    borderRadius: 999,
    border: "2px solid #fff",
    display: "grid",
    placeItems: "center",
    background: "#ff4d4f",
    color: "#fff",
    boxShadow: "0 10px 24px rgba(255,77,79,.35)",
    cursor: "pointer",
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

  errText: { color: "#ff4d4f", fontSize: 12, marginTop: 6 },
};

/* ========= icon ========= */
function CameraIcon({ size = 40 }) {
  return (
    <svg
      width={size}
      height={(size * 3) / 4}
      viewBox="0 0 64 48"
      fill="none"
      aria-hidden
    >
      <rect
        x="2"
        y="10"
        width="60"
        height="36"
        rx="6"
        stroke="#2b64b8"
        strokeDasharray="6 6"
        strokeWidth="2"
      />
      <path d="M22 12l4-6h12l4 6" stroke="#2b64b8" strokeWidth="2" />
      <circle cx="32" cy="30" r="10" stroke="#2b64b8" strokeWidth="2" />
      <circle cx="32" cy="30" r="4" fill="#2b64b8" />
    </svg>
  );
}

/* ========= component ========= */
export default function ReferralContent({
  values,
  errors,
  onChange,
  onPickFront,
  submit,
  canSubmit,
  loading,
  msg,

  // from ViewModel
  consultants,
  consultantsLoading,
  loadConsultants,
}) {
  const isNarrow = useIsNarrow(900);
  const fileInputRef = useRef(null);

  // AntD notification hook
  const [api, contextHolder] = notification.useNotification();

  // Toast when `msg` changes
  useEffect(() => {
    if (!msg?.text) return;
    const type = msg.type === "success" ? "success" : "error";
    api[type]({
      message: msg.type === "success" ? "Berhasil" : "Gagal",
      description: msg.text,
      placement: "topRight",
      duration: 4,
    });
  }, [msg, api]);

  // Scroll to first error on change
  useEffect(() => {
    if (!errors) return;
    const keys = Object.keys(errors);
    if (!keys.length) return;
    const first = keys[0];
    const el = document.querySelector(`[data-field="${first}"]`);
    if (el?.scrollIntoView) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [errors]);

  // Load list konsultan saat mount
  useEffect(() => {
    loadConsultants?.();
  }, [loadConsultants]);

  const getStatus = (k) => (errors?.[k] ? "error" : undefined);

  function openPicker() {
    if (fileInputRef.current) fileInputRef.current.value = "";
    fileInputRef.current?.click();
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      message.error("Gunakan file JPEG/PNG/WebP.");
      e.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      message.error("Maks 5MB.");
      e.target.value = "";
      return;
    }
    onPickFront?.(file);
  }

  function handleRemoveFront() {
    onChange("document.front_file", null);
    onChange("document.front_preview", "");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div style={styles.wrap}>
      {contextHolder}

      {/* HERO */}
      <div
        style={{
          ...styles.hero,
          padding: isNarrow ? "28px 12px 200px" : styles.hero.padding,
        }}
      >
        <div style={styles.heroInner}>
          <Title level={2} style={styles.heroTitle}>
            FORM REFERRAL
          </Title>
        </div>
        <div style={styles.underline} />
      </div>

      {/* BODY */}
      <div
        style={{
          ...styles.container,
          margin: isNarrow ? "-170px auto 64px" : styles.container.margin,
        }}
      >
        <Card
          className="referral-card"
          style={styles.card}
          bodyStyle={{
            ...styles.cardBody,
            padding: isNarrow ? 16 : styles.cardBody.padding,
          }}
        >
          {/* ===== Foto Kartu Identitas ===== */}
          <div style={styles.item} data-field="front">
            <div style={styles.sectionTitle}>
              Foto Kartu Identitas (JPG/PNG/WebP){" "}
              <span style={styles.req}>*</span>
            </div>

            {!values?.document?.front_preview ? (
              <div
                style={{
                  ...styles.ktpDrop,
                  padding: isNarrow ? 14 : styles.ktpDrop.padding,
                  minHeight: isNarrow ? 110 : styles.ktpDrop.minHeight,
                  borderColor: errors?.front
                    ? "#ff4d4f"
                    : styles.ktpDrop.borderColor,
                }}
                onClick={openPicker}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") openPicker();
                }}
                aria-invalid={!!errors?.front}
                aria-describedby={errors?.front ? "err-front" : undefined}
              >
                <div style={styles.ktpInner}>
                  <CameraIcon size={isNarrow ? 34 : 40} />
                  <div style={styles.ktpHint}>
                    Ketuk untuk ambil foto / pilih dari galeri
                  </div>
                  <div style={styles.ktpSub}>
                    Disarankan posisi landscape • Maks 5MB
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={styles.previewBox}
                onMouseEnter={(e) => {
                  const ov = e.currentTarget.querySelector(
                    "[data-role='delov']"
                  );
                  if (ov) ov.style.opacity = 1;
                }}
                onMouseLeave={(e) => {
                  const ov = e.currentTarget.querySelector(
                    "[data-role='delov']"
                  );
                  if (ov) ov.style.opacity = 0;
                }}
              >
                <img
                  src={values.document.front_preview}
                  alt="Preview Kartu Identitas"
                  style={styles.previewImg}
                />
                <div style={styles.deleteOverlay} data-role="delov">
                  <div style={styles.deleteBtn} onClick={handleRemoveFront}>
                    <DeleteOutlined style={{ fontSize: 22 }} />
                  </div>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              capture="environment"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />

            {errors?.front ? (
              <div id="err-front" style={styles.errText}>
                {errors.front}
              </div>
            ) : null}
          </div>

          {/* ===== Identitas ===== */}
          <div style={styles.item} data-field="full_name">
            <Text style={styles.label}>
              Nama Lengkap (sesuai Kartu Identitas){" "}
              <span style={styles.req}>*</span>
            </Text>
            <Input
              placeholder="Contoh: Ni Komang Putri Indah Puspita Sari"
              style={styles.input}
              status={getStatus("full_name")}
              value={values.full_name || ""}
              onChange={(e) => onChange("full_name", e.target.value)}
              maxLength={150}
              required
              aria-required="true"
              aria-invalid={!!errors?.full_name}
              aria-describedby={errors?.full_name ? "err-full_name" : undefined}
            />
            {errors?.full_name ? (
              <div id="err-full_name" style={styles.errText}>
                {errors.full_name}
              </div>
            ) : null}
          </div>

          <div style={styles.item} data-field="nik">
            <Text style={styles.label}>
              NIK (16 digit) <span style={styles.req}>*</span>
            </Text>
            <Input
              placeholder="Masukkan 16 digit NIK"
              style={styles.input}
              status={getStatus("nik")}
              value={values.nik || ""}
              onChange={(e) =>
                onChange(
                  "nik",
                  e.target.value.replace(/[^\d]/g, "").slice(0, 16)
                )
              }
              maxLength={16}
              inputMode="numeric"
              pattern="[0-9]*"
              required
              aria-required="true"
              aria-invalid={!!errors?.nik}
              aria-describedby={errors?.nik ? "err-nik" : undefined}
            />
            {errors?.nik ? (
              <div id="err-nik" style={styles.errText}>
                {errors.nik}
              </div>
            ) : null}
          </div>

          <Row gutter={[12, 12]} style={styles.item}>
            <Col xs={24} md={12} data-field="date_of_birth">
              <Text style={styles.label}>
                Tanggal Lahir <span style={styles.req}>*</span>
              </Text>
              <DatePicker
                style={{ ...styles.input, width: "100%" }}
                placeholder="YYYY-MM-DD"
                status={getStatus("date_of_birth")}
                value={values.date_of_birth || null}
                onChange={(d) => onChange("date_of_birth", d || null)}
                format="YYYY-MM-DD"
                required
                aria-required="true"
                aria-invalid={!!errors?.date_of_birth}
                aria-describedby={
                  errors?.date_of_birth ? "err-date_of_birth" : undefined
                }
              />
              {errors?.date_of_birth ? (
                <div id="err-date_of_birth" style={styles.errText}>
                  {errors.date_of_birth}
                </div>
              ) : null}
            </Col>
            <Col xs={24} md={12} data-field="gender">
              <Text style={styles.label}>
                Jenis Kelamin <span style={styles.req}>*</span>
              </Text>
              <Select
                style={{ ...styles.input, width: "100%" }}
                options={[
                  { value: "MALE", label: "Laki-laki" },
                  { value: "FEMALE", label: "Perempuan" },
                ]}
                status={getStatus("gender")}
                value={values.gender || undefined}
                onChange={(v) => onChange("gender", v)}
                placeholder="Pilih"
                required
                aria-required="true"
                aria-invalid={!!errors?.gender}
                aria-describedby={errors?.gender ? "err-gender" : undefined}
              />
              {errors?.gender ? (
                <div id="err-gender" style={styles.errText}>
                  {errors.gender}
                </div>
              ) : null}
            </Col>
          </Row>

          {/* ===== Pekerjaan (WAJIB) ===== */}
          <div style={styles.item} data-field="pekerjaan">
            <Text style={styles.label}>
              Pekerjaan <span style={styles.req}>*</span>
            </Text>
            <Input
              placeholder="Contoh: Mahasiswa, Barista, Staf Administrasi"
              style={styles.input}
              status={getStatus("pekerjaan")}
              value={values.pekerjaan || ""}
              onChange={(e) => onChange("pekerjaan", e.target.value)}
              maxLength={100}
              required
              aria-required="true"
              aria-invalid={!!errors?.pekerjaan}
              aria-describedby={errors?.pekerjaan ? "err-pekerjaan" : undefined}
            />
            {errors?.pekerjaan ? (
              <div id="err-pekerjaan" style={styles.errText}>
                {errors.pekerjaan}
              </div>
            ) : null}
          </div>

          {/* ===== Alamat sesuai Kartu Identitas ===== */}
          <div style={styles.sectionTitle}>Alamat sesuai Kartu Identitas</div>

          <div style={styles.item} data-field="address_line">
            <Text style={styles.label}>
              Jalan / Alamat <span style={styles.req}>*</span>
            </Text>
            <TextArea
              placeholder="Contoh: Jl. Kenanga No. 12, Blok B"
              autoSize={{ minRows: 2, maxRows: 4 }}
              style={styles.textArea}
              status={getStatus("address_line")}
              value={values.address_line || ""}
              onChange={(e) => onChange("address_line", e.target.value)}
              maxLength={191}
              required
              aria-required="true"
              aria-invalid={!!errors?.address_line}
              aria-describedby={
                errors?.address_line ? "err-address_line" : undefined
              }
            />
            {errors?.address_line ? (
              <div id="err-address_line" style={styles.errText}>
                {errors.address_line}
              </div>
            ) : null}
          </div>

          <Row gutter={[12, 12]} style={styles.item}>
            <Col xs={12} md={6} data-field="rt">
              <Text style={styles.label}>
                RT <span style={styles.req}>*</span>
              </Text>
              <Input
                placeholder="003"
                style={styles.input}
                status={getStatus("rt")}
                value={values.rt || ""}
                onChange={(e) =>
                  onChange(
                    "rt",
                    e.target.value.replace(/[^\d]/g, "").slice(0, 3)
                  )
                }
                maxLength={3}
                inputMode="numeric"
                required
                aria-required="true"
                aria-invalid={!!errors?.rt}
                aria-describedby={errors?.rt ? "err-rt" : undefined}
              />
              {errors?.rt ? (
                <div id="err-rt" style={styles.errText}>
                  {errors.rt}
                </div>
              ) : null}
            </Col>
            <Col xs={12} md={6} data-field="rw">
              <Text style={styles.label}>
                RW <span style={styles.req}>*</span>
              </Text>
              <Input
                placeholder="006"
                style={styles.input}
                status={getStatus("rw")}
                value={values.rw || ""}
                onChange={(e) =>
                  onChange(
                    "rw",
                    e.target.value.replace(/[^\d]/g, "").slice(0, 3)
                  )
                }
                maxLength={3}
                inputMode="numeric"
                required
                aria-required="true"
                aria-invalid={!!errors?.rw}
                aria-describedby={errors?.rw ? "err-rw" : undefined}
              />
              {errors?.rw ? (
                <div id="err-rw" style={styles.errText}>
                  {errors.rw}
                </div>
              ) : null}
            </Col>
            <Col xs={24} md={12} data-field="kelurahan">
              <Text style={styles.label}>
                Kel/ Kelurahan <span style={styles.req}>*</span>
              </Text>
              <Input
                placeholder="Contoh: Renon"
                style={styles.input}
                status={getStatus("kelurahan")}
                value={values.kelurahan || ""}
                onChange={(e) => onChange("kelurahan", e.target.value)}
                maxLength={64}
                required
                aria-required="true"
                aria-invalid={!!errors?.kelurahan}
                aria-describedby={
                  errors?.kelurahan ? "err-kelurahan" : undefined
                }
              />
              {errors?.kelurahan ? (
                <div id="err-kelurahan" style={styles.errText}>
                  {errors.kelurahan}
                </div>
              ) : null}
            </Col>
          </Row>

          <Row gutter={[12, 12]} style={styles.item}>
            <Col xs={24} md={12} data-field="kecamatan">
              <Text style={styles.label}>
                Kecamatan <span style={styles.req}>*</span>
              </Text>
              <Input
                placeholder="Contoh: Denpasar Selatan"
                style={styles.input}
                status={getStatus("kecamatan")}
                value={values.kecamatan || ""}
                onChange={(e) => onChange("kecamatan", e.target.value)}
                maxLength={64}
                required
                aria-required="true"
                aria-invalid={!!errors?.kecamatan}
                aria-describedby={
                  errors?.kecamatan ? "err-kecamatan" : undefined
                }
              />
              {errors?.kecamatan ? (
                <div id="err-kecamatan" style={styles.errText}>
                  {errors.kecamatan}
                </div>
              ) : null}
            </Col>
            <Col xs={24} md={12} data-field="city">
              <Text style={styles.label}>
                Kota/Kabupaten <span style={styles.req}>*</span>
              </Text>
              <Input
                placeholder="Contoh: Denpasar"
                style={styles.input}
                status={getStatus("city")}
                value={values.city || ""}
                onChange={(e) => onChange("city", e.target.value)}
                maxLength={64}
                required
                aria-required="true"
                aria-invalid={!!errors?.city}
                aria-describedby={errors?.city ? "err-city" : undefined}
              />
              {errors?.city ? (
                <div id="err-city" style={styles.errText}>
                  {errors.city}
                </div>
              ) : null}
            </Col>
          </Row>

          <Row gutter={[12, 12]} style={styles.item}>
            <Col xs={24} md={12} data-field="province">
              <Text style={styles.label}>
                Provinsi <span style={styles.req}>*</span>
              </Text>
              <Input
                placeholder="Contoh: Bali"
                style={styles.input}
                status={getStatus("province")}
                value={values.province || ""}
                onChange={(e) => onChange("province", e.target.value)}
                maxLength={64}
                required
                aria-required="true"
                aria-invalid={!!errors?.province}
                aria-describedby={errors?.province ? "err-province" : undefined}
              />
              {errors?.province ? (
                <div id="err-province" style={styles.errText}>
                  {errors.province}
                </div>
              ) : null}
            </Col>
            <Col xs={24} md={12} data-field="postal_code">
              <Text style={styles.label}>
                Kode Pos <span style={styles.req}>*</span>
              </Text>
              <Input
                placeholder="Contoh: 80226"
                style={styles.input}
                status={getStatus("postal_code")}
                value={values.postal_code || ""}
                onChange={(e) =>
                  onChange(
                    "postal_code",
                    e.target.value.replace(/[^\d]/g, "").slice(0, 10)
                  )
                }
                inputMode="numeric"
                maxLength={10}
                required
                aria-required="true"
                aria-invalid={!!errors?.postal_code}
                aria-describedby={
                  errors?.postal_code ? "err-postal_code" : undefined
                }
              />
              {errors?.postal_code ? (
                <div id="err-postal_code" style={styles.errText}>
                  {errors.postal_code}
                </div>
              ) : null}
            </Col>
          </Row>

          {/* ===== Domisili saat ini ===== */}
          <div style={styles.item} data-field="domicile">
            <Text style={styles.label}>
              Domisili Saat Ini (jika berbeda dengan Kartu Identitas)
            </Text>
            <Input
              placeholder="Contoh: Kuta, Badung"
              style={styles.input}
              value={values.domicile || ""}
              onChange={(e) => onChange("domicile", e.target.value)}
              maxLength={100}
            />
          </div>

          {/* ===== PIC Konsultan (opsional) ===== */}
          <div style={styles.sectionTitle}>PIC Konsultan</div>
          <div style={styles.item} data-field="pic_consultant_id">
            <Text style={styles.label}>
              Konsultan Penanggung Jawab (opsional)
            </Text>
            <Select
              style={{ ...styles.input, width: "100%" }}
              placeholder="Pilih konsultan (opsional)"
              options={consultants}
              loading={consultantsLoading}
              value={values.pic_consultant_id || undefined}
              onChange={(v) => onChange("pic_consultant_id", v)}
              showSearch
              optionFilterProp="label"
            />
          </div>

          {/* ===== Kontak ===== */}
          <div style={styles.sectionTitle}>Kontak</div>

          <div style={styles.item} data-field="whatsapp">
            <Text style={styles.label}>
              Nomor WhatsApp <span style={styles.req}>*</span>
            </Text>
            <Input
              placeholder="Contoh: 08xxxxxxxxxx atau +628xxxxxxxxxx"
              style={styles.input}
              status={getStatus("whatsapp")}
              inputMode="tel"
              value={values.whatsapp || ""}
              onChange={(e) => onChange("whatsapp", e.target.value)}
              maxLength={32}
              required
              aria-required="true"
              aria-invalid={!!errors?.whatsapp}
              aria-describedby={errors?.whatsapp ? "err-whatsapp" : undefined}
            />
            {errors?.whatsapp ? (
              <div id="err-whatsapp" style={styles.errText}>
                {errors.whatsapp}
              </div>
            ) : null}
          </div>

          <div style={styles.item} data-field="email">
            <Text style={styles.label}>
              Email <span style={styles.req}>*</span>
            </Text>
            <Input
              placeholder="contoh@email.com"
              style={styles.input}
              status={getStatus("email")}
              type="email"
              value={values.email || ""}
              onChange={(e) => onChange("email", e.target.value)}
              maxLength={191}
              required
              aria-required="true"
              aria-invalid={!!errors?.email}
              aria-describedby={errors?.email ? "err-email" : undefined}
            />
            {errors?.email ? (
              <div id="err-email" style={styles.errText}>
                {errors.email}
              </div>
            ) : null}
          </div>

          {/* ===== Consent ===== */}
          <div
            style={{ ...styles.item, marginTop: 8 }}
            data-field="consent_agreed"
          >
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                  border: `1px solid ${
                    values.consent_agreed
                      ? "#0B3E91"
                      : errors?.consent_agreed
                      ? "#ff4d4f"
                      : "#7ba9ff"
                  }`,
                  cursor: "pointer",
                  display: "grid",
                  placeItems: "center",
                  background: values.consent_agreed ? "#0B3E91" : "#fff",
                }}
                role="checkbox"
                aria-checked={!!values.consent_agreed}
                aria-invalid={!!errors?.consent_agreed}
                aria-describedby={
                  errors?.consent_agreed ? "err-consent" : undefined
                }
                tabIndex={0}
                onClick={() =>
                  onChange("consent_agreed", !values.consent_agreed)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ")
                    onChange("consent_agreed", !values.consent_agreed);
                }}
              >
                {values.consent_agreed ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M20 6L9 17l-5-5"
                      stroke="#fff"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : null}
              </div>
              <div style={{ color: "#274d96", fontSize: 13, lineHeight: 1.5 }}>
                Saya menyetujui{" "}
                <a href="/terms" target="_blank" rel="noreferrer">
                  Syarat & Ketentuan
                </a>{" "}
                dan{" "}
                <a href="/privacy" target="_blank" rel="noreferrer">
                  Kebijakan Privasi
                </a>
                . <span style={styles.req}>*</span>
                {errors?.consent_agreed ? (
                  <div id="err-consent" style={styles.errText}>
                    {errors.consent_agreed}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* ===== Submit ===== */}
          <div style={styles.btnWrap}>
            <Button
              style={{
                ...styles.btn,
                minWidth: isNarrow ? 200 : styles.btn.minWidth,
                height: isNarrow ? 42 : styles.btn.height,
              }}
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

      {/* small CSS helpers */}
      <style jsx global>{`
        .referral-card .ant-input,
        .referral-card .ant-select-selector,
        .referral-card .ant-picker {
          height: 40px !important;
          border-radius: 8px !important;
        }
        .referral-card .ant-select-selection-placeholder,
        .referral-card .ant-select-selection-item {
          line-height: 38px !important;
        }
        @media (max-width: 480px) {
          .referral-card .ant-typography {
            word-break: break-word;
          }
        }
      `}</style>
    </div>
  );
}
