"use client";

import { useMemo, useState, useCallback } from "react";
import useSWR from "swr";
import { notification, message } from "antd";
import { useParams } from "next/navigation";
import { fetcher } from "@/lib/swr/fetcher";
import { sanitizeHtml } from "@/app/utils/dompurify";

/* ---------- helpers ---------- */
const imgSrc = (r) => r?.image_public_url || r?.image_url || "";

// Split title -> [main, sub]
function splitTitle(name = "") {
  const s = String(name || "").trim();
  if (!s) return ["", ""];
  const delims = [":", "–", "-"];
  for (const d of delims) {
    const i = s.indexOf(d);
    if (i > 0) return [s.slice(0, i).trim(), s.slice(i + 1).trim()];
  }
  return [s, ""];
}

const BLOG_HTML_SANITIZE_OPTIONS = {
  allowedTags: [
    "p",
    "br",
    "b",
    "strong",
    "i",
    "em",
    "u",
    "s",
    "strike",
    "a",
    "ul",
    "ol",
    "li",
    "blockquote",
    "code",
    "pre",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "span",
    "div",
    "img",
  ],
  allowedAttrs: [
    "href",
    "title",
    "target",
    "rel",
    "src",
    "alt",
    "width",
    "height",
    "loading",
  ],
};

/* ---------- dictionary form (id/en) ---------- */
const FORM_TEXT = {
  id: {
    fullNameLabel: "Nama Lengkap",
    fullNamePlaceholder: "Masukkan nama lengkap sesuai KTP",
    domicileLabel: "Domisili",
    domicilePlaceholder: "Contoh: Denpasar, Bali",
    whatsappLabel: "WhatsApp",
    whatsappPlaceholder: "No WhatsApp aktif (62…)",
    emailLabel: "Email",
    emailPlaceholder: "Alamat email aktif",
    educationLabel: "Pendidikan terakhir",
    educationPlaceholder: "SMA / SMK / S1, dll.",
    referralLabel: "Kode Referral (opsional)",
    referralPlaceholder: "Jika ada, masukkan kode referral",
    helperText:
      "Dengan mengirim formulir ini kamu setuju untuk dihubungi melalui WhatsApp / email oleh tim OSS Bali.",
    buttonSubmit: "Kirim",
    buttonSubmitting: "Mengirim…",
    validationFullNameRequired: "Nama lengkap wajib diisi.",
    validationContactRequired: "Isi minimal WhatsApp atau Email.",
    errorSubmitFallback: "Gagal mengirim data.",
    errorNetwork: "Terjadi kesalahan jaringan.",
    successTitle: "Terima kasih!",
    successDescription:
      "Data kamu sudah kami terima. Tim kami akan segera menghubungi via WhatsApp / email.",
  },
  en: {
    fullNameLabel: "Full Name",
    fullNamePlaceholder: "Enter your full legal name",
    domicileLabel: "City / Country",
    domicilePlaceholder: "Example: Denpasar, Indonesia",
    whatsappLabel: "WhatsApp",
    whatsappPlaceholder: "Active WhatsApp number (country code)",
    emailLabel: "Email",
    emailPlaceholder: "Active email address",
    educationLabel: "Last Education",
    educationPlaceholder: "High school / Vocational / Bachelor, etc.",
    referralLabel: "Referral Code (optional)",
    referralPlaceholder: "Fill if you have a referral code",
    helperText:
      "By submitting this form you agree to be contacted via WhatsApp / email by the OSS Bali team.",
    buttonSubmit: "Submit",
    buttonSubmitting: "Submitting…",
    validationFullNameRequired: "Full name is required.",
    validationContactRequired: "Please fill at least WhatsApp or Email.",
    errorSubmitFallback: "Failed to submit data.",
    errorNetwork: "Network error. Please try again.",
    successTitle: "Thank you!",
    successDescription:
      "We have received your data. Our team will contact you via WhatsApp / email.",
  },
};

export default function useBlogDetailViewModel({
  locale = "id",
  fallback = "id",
} = {}) {
  const { id } = useParams();

  /* ---------- fetch detail blog ---------- */
  const key = id
    ? `/api/blog/${encodeURIComponent(
        id
      )}?locale=${locale}&fallback=${fallback}`
    : null;

  const { data, isLoading, error, mutate } = useSWR(key, fetcher);

  /* ---------- Form Leads State ---------- */
  const [form, setForm] = useState({
    full_name: "",
    domicile: "",
    whatsapp: "",
    email: "",
    education_last: "",
    referral_code: "",
  });

  const [submitting, setSubmitting] = useState(false);

  // pilih dictionary sesuai locale
  const formText = FORM_TEXT[locale] || FORM_TEXT[fallback] || FORM_TEXT.id;

  /* ---------- Handler Input ---------- */
  const onChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }, []);

  /* ---------- Submit Leads ---------- */
  const submitLead = useCallback(
    async (e) => {
      e?.preventDefault?.();

      if (!form.full_name.trim()) {
        message.warning(formText.validationFullNameRequired);
        return;
      }
      if (!form.whatsapp.trim() && !form.email.trim()) {
        message.warning(formText.validationContactRequired);
        return;
      }

      setSubmitting(true);
      try {
        const res = await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          message.error(data?.error?.message || formText.errorSubmitFallback);
          return;
        }

        // Reset form
        setForm({
          full_name: "",
          domicile: "",
          whatsapp: "",
          email: "",
          education_last: "",
          referral_code: "",
        });

        notification.success({
          message: formText.successTitle,
          description: formText.successDescription,
          placement: "topRight",
        });
      } catch (err) {
        console.error("lead submit error:", err);
        message.error(formText.errorNetwork);
      } finally {
        setSubmitting(false);
      }
    },
    [form, formText]
  );

  /* ---------- Blog Content ---------- */
  const vm = useMemo(() => {
    const row = data?.data || {};
    const [titleMain, titleSub] = splitTitle(row?.name || "");
    const safeHtml = sanitizeHtml(
      row?.description || row?.description_id || "",
      BLOG_HTML_SANITIZE_OPTIONS
    );

    return {
      // info locale
      locale,
      fallback,

      // view
      loading: isLoading,
      error: error?.message || "",
      refresh: mutate,

      titleMain,
      titleSub,
      image: imgSrc(row),
      html: safeHtml,
      source: row?.source || "",

      // form
      form,
      submitting,
      onChange,
      submitLead,
      formText, // semua teks multilanguage untuk form
    };
  }, [
    data,
    isLoading,
    error,
    mutate,
    locale,
    fallback,
    form,
    submitting,
    onChange,
    submitLead,
    formText,
  ]);

  return vm;
}
