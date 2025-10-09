"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import { notification } from "antd";

const LEADS_ENDPOINT = "/api/leads";

// ===== i18n strings (errors + notifications) =====
const STRINGS = {
  id: {
    notif: {
      submit_ok_title: "Form terkirim",
      submit_ok_desc: "Terima kasih! Kami akan menghubungi Anda segera.",
      submit_fail_title: "Gagal mengirim",
      network_error: "Terjadi kesalahan jaringan.",
    },
    errors: {
      full_name_req: "Nama lengkap minimal 2 karakter.",
      domicile_req: "Domisili wajib diisi.",
      whatsapp_req: "Whatsapp wajib diisi.",
      whatsapp_format: "Format Whatsapp tidak valid. Gunakan 08… atau +62…",
      email_req: "Email wajib diisi.",
      email_format: "Format email tidak valid.",
      education_req: "Last Education wajib diisi.",
      generic: "Lengkapi semua field wajib.",
    },
    success_msg: "Terima kasih! Data berhasil dikirim.",
  },
  en: {
    notif: {
      submit_ok_title: "Form submitted",
      submit_ok_desc: "Thanks! We will contact you shortly.",
      submit_fail_title: "Submission failed",
      network_error: "A network error occurred.",
    },
    errors: {
      full_name_req: "Full name must be at least 2 characters.",
      domicile_req: "Domicile is required.",
      whatsapp_req: "Whatsapp is required.",
      whatsapp_format: "Invalid Whatsapp format. Use 08… or +62…",
      email_req: "Email is required.",
      email_format: "Invalid email format.",
      education_req: "Last Education is required.",
      generic: "Please complete all required fields.",
    },
    success_msg: "Thanks! Your data has been submitted.",
  },
};

// simple validators
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
// 08xxxxxxxx / +628xxxxxxxx / 628xxxxxxxx (8–15 digits after prefix)
const PHONE_RE = /^(?:\+?62|0)\d{8,15}$/;

function detectLocale(fallback = "id") {
  try {
    const p = typeof window !== "undefined" ? window.location.pathname : "";
    if (p.startsWith("/en")) return "en";
  } catch {}
  return fallback;
}

export function useLeadsUViewModel(localeProp = null) {
  const locale = (localeProp || detectLocale("id")) === "en" ? "en" : "id";
  const T = STRINGS[locale];

  const [values, setValues] = useState({
    full_name: "",
    domicile: "",
    whatsapp: "",
    email: "",
    education_last: "",
    referral_code: "", // optional
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  // Prefill referral_code dari query string (jika ada)
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const refFromQS =
        sp.get("referral_code") ||
        sp.get("referral") ||
        sp.get("ref") ||
        sp.get("code");
      if (refFromQS && String(refFromQS).trim()) {
        setValues((s) => ({ ...s, referral_code: String(refFromQS).trim() }));
      }
    } catch {}
  }, []);

  const onChange = useCallback((name, v) => {
    setValues((s) => ({ ...s, [name]: v }));
  }, []);

  const buildErrors = useCallback(
    (v) => {
      const e = {};
      if (
        !String(v.full_name || "").trim() ||
        String(v.full_name).trim().length < 2
      ) {
        e.full_name = T.errors.full_name_req;
      }
      if (!String(v.domicile || "").trim()) {
        e.domicile = T.errors.domicile_req;
      }
      if (!String(v.whatsapp || "").trim()) {
        e.whatsapp = T.errors.whatsapp_req;
      } else if (!PHONE_RE.test(String(v.whatsapp).trim())) {
        e.whatsapp = T.errors.whatsapp_format;
      }
      if (!String(v.email || "").trim()) {
        e.email = T.errors.email_req;
      } else if (!EMAIL_RE.test(String(v.email).trim())) {
        e.email = T.errors.email_format;
      }
      if (!String(v.education_last || "").trim()) {
        e.education_last = T.errors.education_req;
      }
      return e;
    },
    [T]
  );

  const canSubmit = useMemo(() => {
    const e = buildErrors(values);
    return Object.keys(e).length === 0 && !loading;
  }, [values, loading, buildErrors]);

  const reset = useCallback(() => {
    setValues({
      full_name: "",
      domicile: "",
      whatsapp: "",
      email: "",
      education_last: "",
      referral_code: "",
    });
    setErrors({});
  }, []);

  const submit = useCallback(async () => {
    setMsg({ type: "", text: "" });
    const e = buildErrors(values);
    setErrors(e);

    if (Object.keys(e).length > 0) {
      const first = Object.values(e)[0];
      const text = first || T.errors.generic;
      setMsg({ type: "error", text });
      notification.error({
        message: T.notif.submit_fail_title,
        description: text,
        placement: "topRight",
      });
      return;
    }

    setLoading(true);
    try {
      const body = {
        full_name: String(values.full_name).trim(),
        domicile: String(values.domicile).trim(),
        whatsapp: String(values.whatsapp).trim(),
        email: String(values.email).trim(),
        education_last: String(values.education_last).trim(),
      };
      const rc = String(values.referral_code || "").trim();
      if (rc) body.referral_code = rc;

      const res = await fetch(LEADS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errMsg =
          data?.error?.message ||
          `${T.notif.submit_fail_title} (status ${res.status}).`;
        setMsg({ type: "error", text: errMsg });
        notification.error({
          message: T.notif.submit_fail_title,
          description: errMsg,
          placement: "topRight",
        });
        return;
      }

      setMsg({ type: "success", text: T.success_msg });
      notification.success({
        message: T.notif.submit_ok_title,
        description: T.notif.submit_ok_desc,
        placement: "topRight",
      });
      reset(); // kosongkan form
    } catch {
      const text = T.notif.network_error;
      setMsg({ type: "error", text });
      notification.error({
        message: T.notif.submit_fail_title,
        description: text,
        placement: "topRight",
      });
    } finally {
      setLoading(false);
    }
  }, [values, T, buildErrors, reset]);

  return {
    locale,
    values,
    errors,
    onChange,
    submit,
    canSubmit,
    loading,
    msg,
  };
}
