// useFormMitraViewModel.js
"use client";

import { useMemo, useState } from "react";

/* ==== helpers ==== */
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

export default function useFormMitraViewModel({ locale = "id" } = {}) {
  const activeLocale = normalizeLocale(locale, "id");

  const [values, setValues] = useState({
    // required
    merchant_name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    province: "",
    postal_code: "",
    contact_name: "",
    contact_position: "",
    contact_whatsapp: "",
    about: "",
    category_id: "",

    // logo: boleh file ATAU url (salah satu wajib)
    image: null, // file
    image_url: "",

    // Website & Socials (opsional)
    website: "",
    instagram: "",
    twitter: "",
    mou_url: "",

    // attachments optional multi
    attachments: [],
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const onChange = (k, v) => {
    setValues((s) => ({ ...s, [k]: v }));
    setErrors((e) => ({ ...e, [k]: null }));
  };

  const onPickImage = (fileOrNull) => {
    setValues((s) => ({ ...s, image: fileOrNull || null }));
    setErrors((e) => ({ ...e, image: null, image_url: null }));
  };

  // merge files (multi pick) + dedup
  const onPickAttachments = (files) => {
    setValues((s) => {
      const current = s.attachments || [];
      const incoming = Array.isArray(files) ? files : [];
      const merged = [...current, ...incoming];
      const map = new Map();
      merged.forEach((f) =>
        map.set(`${f.name}|${f.size}|${f.lastModified || 0}`, f)
      );
      return { ...s, attachments: Array.from(map.values()) };
    });
  };

  const removeAttachment = (idx) => {
    setValues((s) => {
      const copy = [...(s.attachments || [])];
      copy.splice(idx, 1);
      return { ...s, attachments: copy };
    });
  };

  const validate = () => {
    const e = {};
    // required utama
    if (!trim(values.merchant_name)) e.merchant_name = "Required";
    if (!isEmail(values.email)) e.email = "Invalid email";
    if (!isPhone(values.phone)) e.phone = "Invalid phone";
    if (!trim(values.address)) e.address = "Required";
    if (!trim(values.city)) e.city = "Required";
    if (!trim(values.province)) e.province = "Required";
    if (!trim(values.postal_code)) e.postal_code = "Required";
    if (!trim(values.contact_name)) e.contact_name = "Required";
    if (!trim(values.contact_position)) e.contact_position = "Required";
    if (!isPhone(values.contact_whatsapp)) e.contact_whatsapp = "Invalid phone";
    if (!trim(values.about)) e.about = "Required";
    if (!trim(values.category_id)) e.category_id = "Required";

    // logo wajib: file ATAU url
    if (!values.image && !trim(values.image_url)) {
      e.image = "Image file or URL is required";
      e.image_url = e.image;
    }

    // Website & Socials -> opsional (tak divalidasi)
    return e;
  };

  const canSubmit = useMemo(() => {
    const e = validate();
    return !Object.keys(e).length;
  }, [
    values.merchant_name,
    values.email,
    values.phone,
    values.address,
    values.city,
    values.province,
    values.postal_code,
    values.contact_name,
    values.contact_position,
    values.contact_whatsapp,
    values.about,
    values.category_id,
    values.image,
    values.image_url,
  ]);

  const submit = async () => {
    const e = validate();
    setErrors(e);
    setMsg(null);
    if (Object.keys(e).length) return;

    try {
      setLoading(true);
      const fd = new FormData();

      // locale
      fd.append("locale", activeLocale);

      // required
      fd.append("merchant_name", trim(values.merchant_name));
      fd.append("email", trim(values.email));
      fd.append("phone", trim(values.phone));
      fd.append("address", trim(values.address));
      fd.append("city", trim(values.city));
      fd.append("province", trim(values.province));
      fd.append("postal_code", trim(values.postal_code));
      fd.append("contact_name", trim(values.contact_name));
      fd.append("contact_position", trim(values.contact_position));
      fd.append("contact_whatsapp", trim(values.contact_whatsapp));
      fd.append("about", trim(values.about));
      fd.append("category_id", trim(values.category_id));

      // logo
      if (values.image) fd.append("image", values.image);
      if (trim(values.image_url))
        fd.append("image_url", trim(values.image_url));

      // Website & Socials (opsional)
      ["website", "instagram", "twitter", "mou_url"].forEach((k) => {
        const v = trim(values[k]);
        if (v) fd.append(k, v);
      });

      // attachments (opsional multi)
      if (values.attachments?.length) {
        values.attachments.forEach((f) => fd.append("attachments", f));
      }

      const res = await fetch("/api/mitra-dalam-negeri", {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data?.error?.message || data?.message || "Submit failed"
        );
      }

      setMsg({ type: "success", text: data?.message || "Success" });

      // Reset form
      setValues({
        merchant_name: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        province: "",
        postal_code: "",
        contact_name: "",
        contact_position: "",
        contact_whatsapp: "",
        about: "",
        category_id: "",
        image: null,
        image_url: "",
        website: "",
        instagram: "",
        twitter: "",
        mou_url: "",
        attachments: [],
      });
    } catch (err) {
      setMsg({ type: "error", text: err?.message || "Server error" });
    } finally {
      setLoading(false);
    }
  };

  return {
    locale: activeLocale,
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
