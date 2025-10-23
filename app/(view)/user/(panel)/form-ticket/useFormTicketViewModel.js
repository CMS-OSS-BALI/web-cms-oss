"use client";

import { useCallback, useMemo, useState } from "react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WA_RE = /^(?:\+?62|62|0)8[1-9][0-9]{6,11}$/; // santai: 08xx / 628xx

export default function useFormTicketViewModel({
  locale = "id",
  eventId = "",
} = {}) {
  const [model, setModel] = useState({
    full_name: "",
    whatsapp: "",
    school_or_campus: "",
    class_or_semester: "",
    email: "",
    domicile: "",
  });
  const [errors, setErrors] = useState({});
  const [state, setState] = useState({
    loading: false,
    error: "",
    success: false,
    ticket: null,
  });

  const t = useMemo(
    () =>
      locale === "en"
        ? {
            req: "This field is required",
            email: "Please enter a valid email",
            wa: "Invalid Whatsapp number",
            duplicate: "You are already registered for this event.",
            soldout: "Tickets are SOLD OUT.",
            failed: "Failed to submit ticket.",
          }
        : {
            req: "Wajib diisi",
            email: "Email tidak valid",
            wa: "Nomor Whatsapp tidak valid",
            duplicate: "Kamu sudah terdaftar pada event ini.",
            soldout: "Tiket sudah SOLD OUT.",
            failed: "Gagal mengirim tiket.",
          },
    [locale]
  );

  const onChange = useCallback((e) => {
    const { name, value } = e.target;
    setModel((m) => ({ ...m, [name]: value }));
  }, []);

  const validate = useCallback(() => {
    const errs = {};
    if (!model.full_name.trim()) errs.full_name = t.req;
    if (!model.email.trim()) errs.email = t.req;
    else if (!EMAIL_RE.test(model.email.trim())) errs.email = t.email;

    if (model.whatsapp && !WA_RE.test(model.whatsapp.trim()))
      errs.whatsapp = t.wa;

    if (!model.school_or_campus.trim()) errs.school_or_campus = t.req;
    if (!model.class_or_semester.trim()) errs.class_or_semester = t.req;
    if (!model.domicile.trim()) errs.domicile = t.req;

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [model, t]);

  const onSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!validate() || !eventId) return;

      setState((s) => ({ ...s, loading: true, error: "" }));
      try {
        const res = await fetch("/api/tickets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...model, event_id: eventId }),
        });

        if (res.status === 201) {
          const json = await res.json();
          setState({ loading: false, error: "", success: true, ticket: json });
          return;
        }

        // handle known errors
        if (res.status === 409) {
          setState((s) => ({ ...s, loading: false, error: t.duplicate }));
          return;
        }
        if (res.status === 400) {
          const j = await res.json().catch(() => ({}));
          const msg = (j?.message || "").toLowerCase();
          if (msg.includes("sold out")) {
            setState((s) => ({ ...s, loading: false, error: t.soldout }));
            return;
          }
        }

        const j = await res.json().catch(() => ({}));
        setState((s) => ({
          ...s,
          loading: false,
          error: j?.message || t.failed,
        }));
      } catch {
        setState((s) => ({ ...s, loading: false, error: t.failed }));
      }
    },
    [eventId, model, t, validate]
  );

  return {
    model,
    errors,
    state,
    onChange,
    onSubmit,
  };
}
