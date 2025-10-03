"use client";

import { useCallback, useMemo, useState } from "react";
import dayjs from "dayjs";

/* ========= Helpers ========= */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
// Accepts 08xxxxxxxx / +628xxxxxxxx / 628xxxxxxxx (8–15 digits after prefix)
const PHONE_RE = /^(?:\+?62|0)\d{8,15}$/;

function cleanDigits(str = "") {
  return String(str).replace(/\D+/g, "");
}
function nonEmpty(v) {
  return typeof v === "string" && v.trim().length > 0;
}

export function useReferralViewModel() {
  const [values, setValues] = useState({
    // Identitas
    nik: "",
    full_name: "",
    date_of_birth: null, // dayjs | null
    gender: undefined, // "MALE" | "FEMALE"

    // Alamat
    address_line: "",
    rt: "",
    rw: "",
    kelurahan: "",
    kecamatan: "",
    city: "",
    province: "",
    postal_code: "",
    domicile: "",

    // Kontak
    whatsapp: "",
    email: "",

    // Persetujuan
    consent_agreed: false,

    // Dokumen
    document: { front_file: null, front_preview: "" },
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  // `msg` is consumed by your <ReferralContent /> to show AntD notifications
  const [msg, setMsg] = useState(null);

  // Generic setter (supports nested path like "document.front_preview")
  const onChange = useCallback((path, val) => {
    setValues((prev) => {
      const next = { ...prev };
      if (path.includes(".")) {
        const [p1, p2] = path.split(".");
        next[p1] = { ...(prev[p1] || {}), [p2]: val };
      } else {
        next[path] = val;
      }
      return next;
    });
  }, []);

  // Picker file KTP depan (no OCR)
  const onPickFront = useCallback((file) => {
    if (!(file instanceof File)) return;
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) return;
    if (file.size > 5 * 1024 * 1024) return;

    const reader = new FileReader();
    reader.onload = () => {
      setValues((prev) => ({
        ...prev,
        document: {
          ...prev.document,
          front_file: file,
          front_preview: reader.result || "",
        },
      }));
    };
    reader.readAsDataURL(file);
  }, []);

  // Build field errors (used for canSubmit + helpful message)
  const buildErrors = useCallback((v) => {
    const e = {};

    // Identitas
    if (cleanDigits(v.nik).length !== 16) e.nik = "NIK harus 16 digit.";
    if (!nonEmpty(v.full_name) || v.full_name.trim().length < 2)
      e.full_name = "Nama lengkap minimal 2 karakter.";
    if (!(dayjs.isDayjs(v.date_of_birth) && v.date_of_birth.isValid()))
      e.date_of_birth = "Tanggal lahir wajib (format YYYY-MM-DD).";
    if (!v.gender) e.gender = "Jenis kelamin wajib.";

    // Alamat
    if (!nonEmpty(v.address_line) || v.address_line.trim().length < 6)
      e.address_line = "Alamat terlalu pendek.";
    if (cleanDigits(v.rt).length === 0) e.rt = "RT wajib.";
    if (cleanDigits(v.rw).length === 0) e.rw = "RW wajib.";
    if (!nonEmpty(v.kelurahan)) e.kelurahan = "Kelurahan wajib.";
    if (!nonEmpty(v.kecamatan)) e.kecamatan = "Kecamatan wajib.";
    if (!nonEmpty(v.city)) e.city = "Kota/Kabupaten wajib.";
    if (!nonEmpty(v.province)) e.province = "Provinsi wajib.";
    if (cleanDigits(v.postal_code).length < 5)
      e.postal_code = "Kode pos minimal 5 digit.";

    // Kontak
    if (!PHONE_RE.test(String(v.whatsapp || "").trim()))
      e.whatsapp = "Nomor WhatsApp tidak valid.";
    if (!EMAIL_RE.test(String(v.email || "").trim()))
      e.email = "Email tidak valid.";

    // Dokumen
    if (!(v.document.front_file || v.document.front_preview))
      e.front = "Foto KTP wajib diunggah.";

    // Consent
    if (!v.consent_agreed) e.consent_agreed = "Wajib menyetujui syarat.";

    return e;
  }, []);

  // All required fields valid?
  const canSubmit = useMemo(() => {
    const e = buildErrors(values);
    return Object.keys(e).length === 0 && !loading;
  }, [values, loading, buildErrors]);

  const submit = useCallback(async () => {
    const e = buildErrors(values);
    setErrors(e);

    if (Object.keys(e).length > 0) {
      const sections = [
        e.nik && "NIK",
        e.full_name && "Nama",
        e.date_of_birth && "Tanggal Lahir",
        e.gender && "Jenis Kelamin",
        (e.address_line ||
          e.rt ||
          e.rw ||
          e.kelurahan ||
          e.kecamatan ||
          e.city ||
          e.province ||
          e.postal_code) &&
          "Alamat",
        e.whatsapp && "WhatsApp",
        e.email && "Email",
        e.front && "Foto KTP",
        e.consent_agreed && "Persetujuan",
      ]
        .filter(Boolean)
        .join(", ");

      setMsg({
        type: "error",
        text:
          "Lengkapi semua field bertanda * dan pastikan formatnya benar: " +
          sections,
      });
      return;
    }

    setLoading(true);
    setMsg(null);

    try {
      const fd = new FormData();

      // Identitas (required)
      fd.append("nik", cleanDigits(values.nik));
      fd.append("full_name", values.full_name.trim());
      fd.append(
        "date_of_birth",
        values.date_of_birth ? values.date_of_birth.format("YYYY-MM-DD") : ""
      );
      fd.append("gender", String(values.gender)); // "MALE" | "FEMALE"

      // Alamat (UI requires; backend accepts)
      [
        "address_line",
        "rt",
        "rw",
        "kelurahan",
        "kecamatan",
        "city",
        "province",
        "postal_code",
        "domicile",
      ].forEach((k) => {
        const v = values[k];
        if (v != null && String(v).trim() !== "") {
          fd.append(k, String(v).trim());
        }
      });

      // Kontak (required)
      fd.append("whatsapp", values.whatsapp.trim());
      fd.append("email", values.email.trim());

      // Consent
      fd.append("consent_agreed", String(!!values.consent_agreed));

      // Dokumen (required)
      if (values.document.front_file instanceof File) {
        fd.append(
          "front",
          values.document.front_file,
          values.document.front_file.name
        );
      } else {
        setMsg({ type: "error", text: "Foto KTP wajib diunggah." });
        setLoading(false);
        return;
      }

      const res = await fetch("/api/referral", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        const message =
          json?.error?.message ||
          (res.status === 409
            ? "NIK sudah terdaftar."
            : "Gagal mengirim data. Coba lagi.");
        setMsg({ type: "error", text: message });
        return;
      }

      setMsg({
        type: "success",
        text: "Berhasil mengirim data. Terima kasih!",
      });

      // Reset
      setValues({
        nik: "",
        full_name: "",
        date_of_birth: null,
        gender: undefined,
        address_line: "",
        rt: "",
        rw: "",
        kelurahan: "",
        kecamatan: "",
        city: "",
        province: "",
        postal_code: "",
        domicile: "",
        whatsapp: "",
        email: "",
        consent_agreed: false,
        document: { front_file: null, front_preview: "" },
      });
      setErrors({});
    } catch (_e) {
      setMsg({ type: "error", text: "Terjadi kesalahan jaringan. Coba lagi." });
    } finally {
      setLoading(false);
    }
  }, [values, buildErrors]);

  return {
    values,
    errors, // optional: bind to inputs for visual error states later
    onChange,
    onPickFront,
    submit,
    canSubmit,
    loading,
    msg, // consumed by AntD notification in ReferralContent
  };
}
