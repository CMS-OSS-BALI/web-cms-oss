"use client";

import { useCallback, useMemo, useState } from "react";
import { notification } from "antd"; // ⬅️ add this

const LEADS_ENDPOINT = "/api/leads";

export function useLeadsUViewModel() {
  const [values, setValues] = useState({
    full_name: "",
    domicile: "",
    whatsapp: "",
    email: "",
    education_last: "",
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const onChange = useCallback((name, v) => {
    setValues((s) => ({ ...s, [name]: v }));
  }, []);

  const canSubmit = useMemo(() => {
    return String(values.full_name).trim().length >= 2 && !loading;
  }, [values.full_name, loading]);

  const reset = useCallback(() => {
    setValues({
      full_name: "",
      domicile: "",
      whatsapp: "",
      email: "",
      education_last: "",
    });
  }, []);

  const submit = useCallback(async () => {
    setMsg({ type: "", text: "" });

    const full_name = String(values.full_name || "").trim();
    if (full_name.length < 2) {
      const text = "Nama lengkap minimal 2 karakter.";
      setMsg({ type: "error", text });
      notification.error({
        message: "Gagal mengirim",
        description: text,
        placement: "topRight",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(LEADS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name,
          domicile: values.domicile || null,
          whatsapp: values.whatsapp || null,
          email: values.email || null,
          education_last: values.education_last || null,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errMsg =
          data?.error?.message || `Gagal mengirim data (status ${res.status}).`;
        setMsg({ type: "error", text: errMsg });
        notification.error({
          message: "Gagal mengirim",
          description: errMsg,
          placement: "topRight",
        });
        return;
      }

      setMsg({ type: "success", text: "Terima kasih! Data berhasil dikirim." });
      notification.success({
        message: "Form terkirim",
        description: "Terima kasih! Kami akan menghubungi Anda segera.",
        placement: "topRight",
      });
      reset();
    } catch {
      const text = "Terjadi kesalahan jaringan.";
      setMsg({ type: "error", text });
      notification.error({
        message: "Gagal mengirim",
        description: text,
        placement: "topRight",
      });
    } finally {
      setLoading(false);
    }
  }, [values, reset]);

  return {
    values,
    onChange,
    submit,
    canSubmit,
    loading,
    msg,
  };
}
