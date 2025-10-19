// FormMitraContent.jsx
"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Card,
  Input,
  Typography,
  notification,
  Select,
  Divider,
} from "antd";

const { Title, Text } = Typography;

/* ==== UI copy (tanpa URL Logo) ==== */
const UI = {
  id: {
    title: "FORM MITRA DALAM NEGERI",
    sections: {
      org: "Informasi Organisasi",
      addr: "Alamat",
      cp: "Kontak Person",
      web: "Website & Sosial Media (Opsional)",
      about: "Tentang Mitra",
      upload: "Upload Dokumen",
    },
    labels: {
      merchant_name: "Nama Organisasi/Usaha",
      email: "Email",
      phone: "Telepon/HP",
      address: "Alamat",
      city: "Kota/Kabupaten",
      province: "Provinsi",
      postal_code: "Kode Pos",
      contact_name: "Nama PIC",
      contact_position: "Jabatan PIC",
      contact_whatsapp: "WhatsApp PIC",
      website: "Website",
      instagram: "Instagram",
      twitter: "Twitter/X",
      mou_url: "URL MoU",
      about: "Deskripsi Singkat",
      image: "Logo/Gambar (wajib)",
      attachments: "Lampiran (multi-file, opsional)",
      category: "Kategori Mitra",
      submit: "KIRIM",
    },
    placeholders: {
      merchant_name: "Contoh: CV Maju Jaya",
      email: "email@contoh.com",
      phone: "08… atau +62…",
      address: "Nama jalan, RT/RW, dsb.",
      city: "Kota/Kabupaten",
      province: "Provinsi",
      postal_code: "Kode Pos",
      contact_name: "Nama penanggung jawab",
      contact_position: "Jabatan/Posisi",
      contact_whatsapp: "Nomor WhatsApp PIC",
      website: "https://contoh.com",
      instagram: "@akun_instagram",
      twitter: "@akun_twitter",
      mou_url: "URL MoU bila ada",
      about: "Ceritakan singkat tentang mitra",
      category: "Pilih kategori…",
    },
    help: {
      img: "JPEG/PNG/WebP/SVG, maks 10MB.",
      att: "PDF/DOC/XLS/PPT/IMG/TXT, maks 20MB per file. Bisa pilih berkali-kali.",
    },
    reqMark: "*",
    notif: { successTitle: "Berhasil", errorTitle: "Gagal" },
    list: { loading: "Memuat kategori…", empty: "Tidak ada kategori" },
  },
  en: {
    title: "LOCAL PARTNER FORM",
    sections: {
      org: "Organization Info",
      addr: "Address",
      cp: "Contact Person",
      web: "Website & Socials (Optional)",
      about: "About Partner",
      upload: "Upload Documents",
    },
    labels: {
      merchant_name: "Organization/Business Name",
      email: "Email",
      phone: "Phone",
      address: "Address",
      city: "City/Regency",
      province: "Province",
      postal_code: "Postal Code",
      contact_name: "PIC Name",
      contact_position: "PIC Position",
      contact_whatsapp: "PIC WhatsApp",
      website: "Website",
      instagram: "Instagram",
      twitter: "Twitter/X",
      mou_url: "MoU URL",
      about: "Short Description",
      image: "Logo/Image (required)",
      attachments: "Attachments (multi-file, optional)",
      category: "Partner Category",
      submit: "SUBMIT",
    },
    placeholders: {
      merchant_name: "e.g., CV Maju Jaya",
      email: "email@example.com",
      phone: "08… or +62…",
      address: "Street name, etc.",
      city: "City/Regency",
      province: "Province/State",
      postal_code: "Postal Code",
      contact_name: "Responsible person",
      contact_position: "Position/Title",
      contact_whatsapp: "PIC WhatsApp number",
      website: "https://example.com",
      instagram: "@instagram_handle",
      twitter: "@twitter_handle",
      mou_url: "MoU URL if available",
      about: "Tell us briefly about the partner",
      category: "Select a category…",
    },
    help: {
      img: "JPEG/PNG/WebP/SVG, max 10MB.",
      att: "PDF/DOC/XLS/PPT/IMG/TXT, max 20MB each. You can select multiple times.",
    },
    reqMark: "*",
    notif: { successTitle: "Success", errorTitle: "Failed" },
    list: { loading: "Loading categories…", empty: "No categories" },
  },
};

/* ==== Styles (unchanged) ==== */
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
  hGroup: { marginBottom: 8, fontWeight: 900, color: "#0b3e91" },
  label: {
    display: "block",
    fontSize: 12,
    fontWeight: 700,
    color: "#0f2b5a",
    marginBottom: 6,
  },
  req: { color: "#ff4d4f", marginLeft: 4, fontWeight: 900 },
  item: { marginBottom: 16 },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
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
  help: { color: "#6b7da3", fontSize: 12, marginTop: 6 },
  file: { display: "block", width: "100%" },
  fileList: { marginTop: 8, fontSize: 12, color: "#335" },
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
  locale = "id",
  values,
  errors,
  onChange,
  onPickImage,
  onPickAttachments,
  removeAttachment,
  submit,
  canSubmit,
  loading,
  msg,
}) {
  const lang = locale === "en" ? "en" : "id";
  const U = UI[lang];
  const status = (k) => (errors?.[k] ? "error" : undefined);

  const [api, contextHolder] = notification.useNotification();

  const [catLoading, setCatLoading] = useState(true);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    if (!msg?.text) return;
    const isSuccess = msg.type === "success";
    api[isSuccess ? "success" : "error"]({
      message: isSuccess ? U.notif.successTitle : U.notif.errorTitle,
      description: msg.text,
      placement: "topRight",
      duration: 3.5,
    });
  }, [msg, api, U.notif]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setCatLoading(true);
        const res = await fetch(
          `/api/mitra-dalam-negeri-categories?locale=${encodeURIComponent(
            lang
          )}&fallback=${lang === "id" ? "en" : "id"}&perPage=100&sort=sort:asc`
        );
        const data = await res.json().catch(() => ({}));
        if (!alive) return;
        const list = Array.isArray(data?.data) ? data.data : [];
        setCategories(
          list.map((c) => ({ value: c.id, label: c.name || c.slug }))
        );
      } catch {
        setCategories([]);
      } finally {
        if (alive) setCatLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [lang]);

  const LabelReq = ({ children }) => (
    <Text style={styles.label}>
      {children} <span style={styles.req}>{U.reqMark}</span>
    </Text>
  );

  return (
    <div style={styles.wrap}>
      {contextHolder}

      <div style={styles.hero}>
        <div style={styles.heroInner}>
          <Title level={2} style={styles.heroTitle}>
            {U.title}
          </Title>
          <div style={styles.underline} />
        </div>
      </div>

      <div style={styles.container}>
        <Card style={styles.card} bodyStyle={styles.cardBody}>
          {/* Organization */}
          <h4 style={styles.hGroup}>{U.sections.org}</h4>

          <div style={styles.item}>
            <LabelReq>{U.labels.merchant_name}</LabelReq>
            <Input
              placeholder={U.placeholders.merchant_name}
              style={styles.input}
              value={values.merchant_name}
              onChange={(e) => onChange("merchant_name", e.target.value)}
              maxLength={191}
              status={status("merchant_name")}
              required
              aria-required="true"
              aria-invalid={!!errors?.merchant_name}
              allowClear
            />
          </div>

          <div style={styles.grid2}>
            <div style={styles.item}>
              <LabelReq>{U.labels.email}</LabelReq>
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
            <div style={styles.item}>
              <LabelReq>{U.labels.phone}</LabelReq>
              <Input
                placeholder={U.placeholders.phone}
                style={styles.input}
                inputMode="tel"
                value={values.phone}
                onChange={(e) => onChange("phone", e.target.value)}
                maxLength={32}
                status={status("phone")}
                required
                aria-required="true"
                aria-invalid={!!errors?.phone}
                allowClear
              />
            </div>
          </div>

          {/* Category (required) */}
          <div style={styles.item}>
            <LabelReq>{U.labels.category}</LabelReq>
            <Select
              style={{ width: "100%" }}
              placeholder={U.placeholders.category}
              value={values.category_id || undefined}
              onChange={(v) => onChange("category_id", v)}
              loading={catLoading}
              options={categories}
              allowClear={false}
              status={errors?.category_id ? "error" : undefined}
              notFoundContent={catLoading ? U.list.loading : U.list.empty}
            />
            {errors?.category_id ? (
              <div style={styles.err}>
                {lang === "en"
                  ? "Category is required."
                  : "Kategori wajib dipilih."}
              </div>
            ) : null}
          </div>

          {/* Address */}
          <h4 style={{ ...styles.hGroup, marginTop: 8 }}>{U.sections.addr}</h4>

          <div style={styles.item}>
            <LabelReq>{U.labels.address}</LabelReq>
            <Input
              placeholder={U.placeholders.address}
              style={styles.input}
              value={values.address}
              onChange={(e) => onChange("address", e.target.value)}
              maxLength={191}
              status={status("address")}
              required
              aria-required="true"
              aria-invalid={!!errors?.address}
              allowClear
            />
          </div>

          <div style={styles.grid2}>
            <div style={styles.item}>
              <LabelReq>{U.labels.city}</LabelReq>
              <Input
                placeholder={U.placeholders.city}
                style={styles.input}
                value={values.city}
                onChange={(e) => onChange("city", e.target.value)}
                maxLength={64}
                status={status("city")}
                required
                aria-required="true"
                aria-invalid={!!errors?.city}
                allowClear
              />
            </div>
            <div style={styles.item}>
              <LabelReq>{U.labels.province}</LabelReq>
              <Input
                placeholder={U.placeholders.province}
                style={styles.input}
                value={values.province}
                onChange={(e) => onChange("province", e.target.value)}
                maxLength={64}
                status={status("province")}
                required
                aria-required="true"
                aria-invalid={!!errors?.province}
                allowClear
              />
            </div>
          </div>

          <div style={styles.item}>
            <LabelReq>{U.labels.postal_code}</LabelReq>
            <Input
              placeholder={U.placeholders.postal_code}
              style={styles.input}
              value={values.postal_code}
              onChange={(e) => onChange("postal_code", e.target.value)}
              maxLength={16}
              status={status("postal_code")}
              required
              aria-required="true"
              aria-invalid={!!errors?.postal_code}
              allowClear
            />
          </div>

          {/* Contact Person */}
          <h4 style={{ ...styles.hGroup, marginTop: 8 }}>{U.sections.cp}</h4>

          <div style={styles.grid2}>
            <div style={styles.item}>
              <LabelReq>{U.labels.contact_name}</LabelReq>
              <Input
                placeholder={U.placeholders.contact_name}
                style={styles.input}
                value={values.contact_name}
                onChange={(e) => onChange("contact_name", e.target.value)}
                maxLength={128}
                status={status("contact_name")}
                required
                aria-required="true"
                aria-invalid={!!errors?.contact_name}
                allowClear
              />
            </div>
            <div style={styles.item}>
              <LabelReq>{U.labels.contact_position}</LabelReq>
              <Input
                placeholder={U.placeholders.contact_position}
                style={styles.input}
                value={values.contact_position}
                onChange={(e) => onChange("contact_position", e.target.value)}
                maxLength={128}
                status={status("contact_position")}
                required
                aria-required="true"
                aria-invalid={!!errors?.contact_position}
                allowClear
              />
            </div>
          </div>

          <div style={styles.item}>
            <LabelReq>{U.labels.contact_whatsapp}</LabelReq>
            <Input
              placeholder={U.placeholders.contact_whatsapp}
              style={styles.input}
              inputMode="tel"
              value={values.contact_whatsapp}
              onChange={(e) => onChange("contact_whatsapp", e.target.value)}
              maxLength={32}
              status={status("contact_whatsapp")}
              required
              aria-required="true"
              aria-invalid={!!errors?.contact_whatsapp}
              allowClear
            />
            {errors?.contact_whatsapp ? (
              <div style={styles.err}>
                {lang === "en" ? "Invalid phone." : "Nomor tidak valid."}
              </div>
            ) : null}
          </div>

          {/* Website & Socials (Optional) */}
          <h4 style={{ ...styles.hGroup, marginTop: 8 }}>{U.sections.web}</h4>
          <div style={styles.item}>
            <Text style={styles.label}>{U.labels.website}</Text>
            <Input
              placeholder={U.placeholders.website}
              style={styles.input}
              value={values.website}
              onChange={(e) => onChange("website", e.target.value)}
              maxLength={191}
              allowClear
            />
          </div>
          <div style={styles.grid2}>
            <div style={styles.item}>
              <Text style={styles.label}>{U.labels.instagram}</Text>
              <Input
                placeholder={U.placeholders.instagram}
                style={styles.input}
                value={values.instagram}
                onChange={(e) => onChange("instagram", e.target.value)}
                maxLength={64}
                allowClear
              />
            </div>
            <div style={styles.item}>
              <Text style={styles.label}>{U.labels.twitter}</Text>
              <Input
                placeholder={U.placeholders.twitter}
                style={styles.input}
                value={values.twitter}
                onChange={(e) => onChange("twitter", e.target.value)}
                maxLength={64}
                allowClear
              />
            </div>
          </div>
          <div style={styles.item}>
            <Text style={styles.label}>{U.labels.mou_url}</Text>
            <Input
              placeholder={U.placeholders.mou_url}
              style={styles.input}
              value={values.mou_url}
              onChange={(e) => onChange("mou_url", e.target.value)}
              maxLength={191}
              allowClear
            />
          </div>

          {/* About (Required) */}
          <h4 style={{ ...styles.hGroup, marginTop: 8 }}>{U.sections.about}</h4>
          <div style={styles.item}>
            <LabelReq>{U.labels.about}</LabelReq>
            <Input.TextArea
              placeholder={U.placeholders.about}
              style={styles.textarea}
              rows={4}
              value={values.about}
              onChange={(e) => onChange("about", e.target.value)}
              maxLength={2000}
              status={status("about")}
              required
              aria-required="true"
              aria-invalid={!!errors?.about}
              allowClear
            />
          </div>

          {/* Upload */}
          <h4 style={{ ...styles.hGroup, marginTop: 8 }}>
            {U.sections.upload}
          </h4>

          {/* Logo (Required) */}
          <div style={styles.item}>
            <LabelReq>{U.labels.image}</LabelReq>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.svg"
              onChange={(e) => onPickImage(e.target.files?.[0] || null)}
              onClick={(e) => {
                e.currentTarget.value = null;
              }}
              style={styles.file}
              required
              aria-required="true"
              aria-invalid={!!errors?.image}
            />
            <div style={styles.help}>{U.help.img}</div>
            {errors?.image ? (
              <div style={styles.err}>
                {lang === "en" ? "Logo is required." : "Logo wajib diunggah."}
              </div>
            ) : null}
          </div>

          <Divider style={{ margin: "8px 0 16px" }} />

          {/* Attachments — optional */}
          <div style={styles.item}>
            <Text style={styles.label}>{U.labels.attachments}</Text>
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.webp,.svg,.txt"
              onChange={(e) =>
                onPickAttachments(Array.from(e.target.files || []))
              }
              onClick={(e) => {
                e.currentTarget.value = null;
              }}
              style={styles.file}
            />
            <div style={styles.help}>{U.help.att}</div>
            {values.attachments?.length ? (
              <div style={styles.fileList}>
                {values.attachments.map((f, i) => (
                  <div
                    key={`${f.name}-${f.size}-${i}`}
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <span>• {f.name}</span>
                    <Button
                      size="small"
                      type="text"
                      onClick={() => removeAttachment(i)}
                    >
                      ✕
                    </Button>
                  </div>
                ))}
              </div>
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
              {U.labels.submit}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
