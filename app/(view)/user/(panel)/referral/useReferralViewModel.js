"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import dayjs from "dayjs";

/* ========= Helpers ========= */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const PHONE_RE = /^(?:\+?62|0)\d{8,15}$/;

function cleanDigits(str = "") {
  return String(str).replace(/\D+/g, "");
}
function nonEmpty(v) {
  return typeof v === "string" && v.trim().length > 0;
}

export function useReferralViewModel() {
  const [values, setValues] = useState({
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
    pic_consultant_id: "", // Wajib
    consent_agreed: false,
    document: { front_file: null, front_preview: "" },
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  // Data dropdown konsultan
  const [consultants, setConsultants] = useState([]);
  const [consultantsLoading, setConsultantsLoading] = useState(false);

  const loadConsultants = useCallback(async (q = "") => {
    try {
      setConsultantsLoading(true);
      // sesuaikan jika endpoint kamu beda; `public=1` aman untuk publik
      const url = new URL("/api/consultants", window.location.origin);
      url.searchParams.set("public", "1");
      url.searchParams.set("limit", "50");
      if (q && q.trim()) url.searchParams.set("q", q.trim());

      const res = await fetch(url.toString(), { credentials: "omit" });
      const json = await res.json().catch(() => ({}));
      const items = Array.isArray(json?.data) ? json.data : [];

      const opts = items.map((it) => ({
        value: String(it.id),
        label: it.name || it.full_name || it.name_id || `Konsultan ${it.id}`,
      }));
      setConsultants(opts);
    } catch {
      setConsultants([]);
    } finally {
      setConsultantsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConsultants();
  }, [loadConsultants]);

  // Generic setter
  const onChange = useCallback((path, val) => {
    setValues((prev) => {
      const next = { ...prev };
      if (path.includes(".")) {
        const [p1, p2] = path.split(".");
        next[p1] = { ...(prev[p1] || {}), [p2]: val };
      } else next[path] = val;
      return next;
    });
  }, []);

  // Picker file KTP
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

  // Validasi
  const buildErrors = useCallback((v) => {
    const e = {};
    if (cleanDigits(v.nik).length !== 16) e.nik = "NIK harus 16 digit.";
    if (!nonEmpty(v.full_name) || v.full_name.trim().length < 2)
      e.full_name = "Nama lengkap minimal 2 karakter.";
    if (!(dayjs.isDayjs(v.date_of_birth) && v.date_of_birth.isValid()))
      e.date_of_birth = "Tanggal lahir wajib (format YYYY-MM-DD).";
    if (!v.gender) e.gender = "Jenis kelamin wajib.";

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

    if (!PHONE_RE.test(String(v.whatsapp || "").trim()))
      e.whatsapp = "Nomor WhatsApp tidak valid.";
    if (!EMAIL_RE.test(String(v.email || "").trim()))
      e.email = "Email tidak valid.";

    if (!v.pic_consultant_id)
      e.pic_consultant_id = "Pilih PIC Konsultan terlebih dahulu.";

    if (!(v.document.front_file || v.document.front_preview))
      e.front = "Foto KTP wajib diunggah.";
    if (!v.consent_agreed) e.consent_agreed = "Wajib menyetujui syarat.";
    return e;
  }, []);

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
        e.pic_consultant_id && "PIC Konsultan",
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
      fd.append("nik", cleanDigits(values.nik));
      fd.append("full_name", values.full_name.trim());
      fd.append(
        "date_of_birth",
        values.date_of_birth ? values.date_of_birth.format("YYYY-MM-DD") : ""
      );
      fd.append("gender", String(values.gender));

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
        if (v != null && String(v).trim() !== "")
          fd.append(k, String(v).trim());
      });

      fd.append("whatsapp", values.whatsapp.trim());
      fd.append("email", values.email.trim());

      // Wajib
      fd.append("pic_consultant_id", String(values.pic_consultant_id));

      fd.append("consent_agreed", String(!!values.consent_agreed));

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
        pic_consultant_id: "",
        consent_agreed: false,
        document: { front_file: null, front_preview: "" },
      });
      setErrors({});
    } catch {
      setMsg({ type: "error", text: "Terjadi kesalahan jaringan. Coba lagi." });
    } finally {
      setLoading(false);
    }
  }, [values, buildErrors]);

  return {
    values,
    errors,
    onChange,
    onPickFront,
    submit,
    canSubmit,
    loading,
    msg,
    consultants,
    consultantsLoading,
    loadConsultants,
  };
}
