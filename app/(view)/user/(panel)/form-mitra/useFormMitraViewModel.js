"use client";

import { useEffect, useMemo, useState } from "react";

/* ===== helpers ===== */
const normalizeLocale = (v, fb = "id") => {
  const raw = String(v ?? "")
    .trim()
    .toLowerCase();
  if (!raw) return fb;
  if (raw.startsWith("en")) return "en";
  if (raw.startsWith("id")) return "id";
  return fb;
};
const trim = (v) => (v == null ? "" : String(v).trim());
const isEmail = (s = "") => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(trim(s));
const isPhone = (s = "") =>
  /^(\+?\d[\d\s-]{7,}|0\d{8,})$/.test(String(s).replace(/\s+/g, ""));
const isDigits = (s = "") => /^\d{10,20}$/.test(String(s).replace(/\s+/g, ""));

const DEFAULT_LOGO_URL =
  process.env.NEXT_PUBLIC_DEFAULT_LOGO_URL ||
  "https://cdn.onestepsolutionbali.com/public/cms-oss/system/placeholder-logo.png";

/* ===== UI copy (semua teks di sini) ===== */
const UI_COPY = {
  id: {
    title: "FORM MITRA",
    labels: {
      contact_name: "Nama Penanggung Jawab",
      merchant_name: "Nama Merchant/organisasi",
      whatsapp: "No Whatsapp",
      address: "Alamat Lengkap",
      email: "Email",
      ktp_number: "Nomor KTP",
      submit: "KIRIM",
    },
    placeholders: {
      contact_name:
        "Nama Lengkap ( Contoh : Ni Komang Putri Indah Puspita Sari )",
      merchant_name: "Nama Merchant (contoh : IMADJI COFFE)",
      whatsapp:
        "Gunakan Kode Nomor  +62 atau kode sesuai negara (contoh: +6289770)",
      address:
        "Alamat Lengkap (contoh : Jl. P.B. Sudirman No.18 A, Dauh Puri Klod, Kec. Denpasar Bar., Kota Denpasar, Bali 80232, Indonesia.)",
      email: "Gunakan Email Aktif (contoh : imadji@gmail.com)",
      ktp_number: "Gunakan No KTP Penanggung jawab (contoh : 00897123900)",
    },
    reqMark: "*",
    notif: { successTitle: "Berhasil", errorTitle: "Gagal" },
    errors: {
      required: "Wajib diisi.",
      invalidPhone: "Nomor tidak valid.",
      invalidEmail: "Email tidak valid.",
      invalidKTP: "Nomor KTP tidak valid.",
    },
  },
  en: {
    title: "PARTNER FORM",
    labels: {
      contact_name: "PIC Full Name",
      merchant_name: "Merchant/Organization Name",
      whatsapp: "WhatsApp Number",
      address: "Full Address",
      email: "Email",
      ktp_number: "National ID (KTP)",
      submit: "SUBMIT",
    },
    placeholders: {
      contact_name: "Full name",
      merchant_name: "e.g., IMADJI COFFE",
      whatsapp: "Use country code, e.g., +628xxx",
      address: "Street, district, city, province, country, postal code",
      email: "Active email address",
      ktp_number: "PIC National ID number",
    },
    reqMark: "*",
    notif: { successTitle: "Success", errorTitle: "Failed" },
    errors: {
      required: "This field is required.",
      invalidPhone: "Invalid phone number.",
      invalidEmail: "Invalid email address.",
      invalidKTP: "Invalid ID number.",
    },
  },
};

export default function useFormMitraViewModel({ locale = "id" } = {}) {
  const [activeLocale, setActiveLocale] = useState(
    normalizeLocale(locale, "id")
  );

  // sinkron saat header/URL ubah bahasa
  useEffect(() => {
    setActiveLocale(normalizeLocale(locale, "id"));
  }, [locale]);

  const ui = useMemo(() => UI_COPY[activeLocale], [activeLocale]);

  const [values, setValues] = useState({
    contact_name: "",
    merchant_name: "",
    whatsapp: "",
    address: "",
    email: "",
    ktp_number: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const onChange = (k, v) => {
    setValues((s) => ({ ...s, [k]: v }));
    setErrors((e) => ({ ...e, [k]: null }));
  };

  const validate = () => {
    const e = {};
    if (!trim(values.contact_name)) e.contact_name = ui.errors.required;
    if (!trim(values.merchant_name)) e.merchant_name = ui.errors.required;
    if (!isPhone(values.whatsapp)) e.whatsapp = ui.errors.invalidPhone;
    if (!trim(values.address)) e.address = ui.errors.required;
    if (!isEmail(values.email)) e.email = ui.errors.invalidEmail;
    if (!isDigits(values.ktp_number)) e.ktp_number = ui.errors.invalidKTP;
    return e;
  };

  // Jika user ganti bahasa saat ada error, refresh pesan error ke bahasa baru
  useEffect(() => {
    if (Object.keys(errors || {}).length) setErrors(validate());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLocale]);

  const canSubmit = useMemo(
    () => !Object.keys(validate()).length,
    [values, ui]
  );

  const submit = async () => {
    const e = validate();
    setErrors(e);
    setMsg(null);
    if (Object.keys(e).length) return;

    try {
      setLoading(true);
      const fd = new FormData();
      fd.append("locale", activeLocale);
      fd.append("merchant_name", trim(values.merchant_name));
      fd.append("email", trim(values.email));
      fd.append("phone", trim(values.whatsapp));
      fd.append("address", trim(values.address));
      fd.append("contact_name", trim(values.contact_name));
      fd.append("contact_whatsapp", trim(values.whatsapp));
      fd.append("ktp_number", trim(values.ktp_number));
      if (DEFAULT_LOGO_URL) fd.append("image_url", DEFAULT_LOGO_URL);

      const res = await fetch("/api/mitra-dalam-negeri", {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(
          data?.error?.message || data?.message || "Submit failed"
        );

      setMsg({ type: "success", text: data?.message || "Success" });
      setValues({
        contact_name: "",
        merchant_name: "",
        whatsapp: "",
        address: "",
        email: "",
        ktp_number: "",
      });
    } catch (err) {
      setMsg({ type: "error", text: err?.message || "Server error" });
    } finally {
      setLoading(false);
    }
  };

  // compat (tidak dipakai, biarkan ada biar aman)
  const onPickImage = () => {};
  const onPickAttachments = () => {};
  const removeAttachment = () => {};

  return {
    ui,
    // form
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
  };
}
