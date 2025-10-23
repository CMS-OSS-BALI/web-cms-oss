"use client";

import { useRef, useState } from "react";

export default function useFormRepViewModel({ locale = "id", eventId = "" }) {
  /* =========================
     FORM STATE
  ========================= */
  const [model, setModel] = useState({
    rep_name: "",
    country: "",
    campus_name: "",
    campus_address: "",
    whatsapp: "",
    voucher_code: "",
    email: "",
  });

  const [errors, setErrors] = useState({});
  const [state, setState] = useState({
    loading: false,
    error: "",
    booking: null, // { id, order_id, amount, ... }
  });

  /* =========================
     UI STATE (steps)
  ========================= */
  const [ui, setUi] = useState({
    step: 0, // 0=form, 1=detail
    paid: false,
    paidAt: null,
    nowText: new Date().toLocaleString("id-ID"),
    paidAtText: "",
    amountText: "",
  });

  /* =========================
     PAYMENT STATE (Snap)
  ========================= */
  const [payment, setPayment] = useState({
    starting: false,
    snapToken: "",
    redirectUrl: "",
    orderId: "",
    amount: null, // number (normalized)
    lastResult: null,
    error: "",
    checking: false,
    check: null,
  });

  /* =========================
     MIDTRANS ENV
  ========================= */
  const clientKey =
    process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ||
    (typeof window !== "undefined"
      ? document
          .querySelector('script[src*="midtrans"]')
          ?.getAttribute("data-client-key") || ""
      : "");

  const env =
    (process.env.NEXT_PUBLIC_MIDTRANS_ENV || "sandbox").toLowerCase() ===
    "production"
      ? "production"
      : "sandbox";

  const snapLoadedRef = useRef(false);

  async function ensureSnapLoaded() {
    if (typeof window === "undefined") return;
    if (window.snap && typeof window.snap.pay === "function") {
      snapLoadedRef.current = true;
      return;
    }
    if (!clientKey) {
      throw new Error(
        "Midtrans client key tidak ditemukan. Set NEXT_PUBLIC_MIDTRANS_CLIENT_KEY."
      );
    }
    await new Promise((resolve, reject) => {
      const id = "__midtrans_snap_js__";
      if (document.getElementById(id)) return resolve();
      const s = document.createElement("script");
      s.id = id;
      s.src =
        env === "production"
          ? "https://app.midtrans.com/snap/snap.js"
          : "https://app.sandbox.midtrans.com/snap/snap.js";
      s.setAttribute("data-client-key", clientKey);
      s.onload = resolve;
      s.onerror = () => reject(new Error("Gagal memuat Snap.js"));
      document.body.appendChild(s);
    });
    if (!(window.snap && typeof window.snap.pay === "function")) {
      throw new Error("Snap belum siap.");
    }
    snapLoadedRef.current = true;
  }

  /* =========================
     HELPERS
  ========================= */
  // Normalize to integer IDR number
  function toIDRNumber(v) {
    if (v == null) return null;
    const n = Number(String(v).replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? Math.round(n) : null;
  }
  function fmtIDR(v) {
    const n = toIDRNumber(v);
    return n == null
      ? "IDR —"
      : n.toLocaleString("id-ID", { style: "currency", currency: "IDR" });
  }
  // Best-available amount across sources to avoid stale state
  function bestAmount(prefer) {
    return (
      toIDRNumber(prefer) ??
      toIDRNumber(payment.amount) ??
      toIDRNumber(state.booking?.amount) ??
      toIDRNumber(payment.check?.midtrans?.gross_amount) ??
      null
    );
  }

  function onChange(e) {
    const { name, value } = e.target;
    setModel((m) => ({ ...m, [name]: value }));
  }

  // Permissive phone validation (+, space, dot, (), dash), 6–15 digits
  function isLooseIntlPhone(raw) {
    if (!raw) return false;
    const s = String(raw).trim();
    if (s.includes("+") && !s.startsWith("+")) return false;
    const digits = s.replace(/\D/g, "");
    if (digits.length < 6 || digits.length > 15) return false;
    return /^\+?\d(?:[\s().-]?\d){5,19}$/.test(s);
  }
  function normalizePhoneForBackend(raw) {
    if (!raw) return "";
    let s = String(raw).trim();
    s = s.replace(/^00+/, "+").replace(/[^\d+]/g, "");
    return s.startsWith("+")
      ? "+" + s.slice(1).replace(/\D/g, "")
      : s.replace(/\D/g, "");
  }

  function validate(m) {
    const err = {};
    const t = (id, en) => (String(locale).toLowerCase() === "en" ? en : id);

    if (!m.rep_name.trim())
      err.rep_name = t(
        "Nama representatif wajib diisi",
        "Representative name is required"
      );
    if (!m.country.trim())
      err.country = t("Nama negara wajib diisi", "Country is required");
    if (!m.campus_name.trim())
      err.campus_name = t("Nama kampus wajib diisi", "Campus name is required");
    if (!m.campus_address.trim())
      err.campus_address = t(
        "Alamat kampus wajib diisi",
        "Campus address is required"
      );

    const wa = m.whatsapp.trim();
    if (!wa) {
      err.whatsapp = t(
        "No whatsapp wajib diisi",
        "Whatsapp number is required"
      );
    } else if (!isLooseIntlPhone(wa)) {
      err.whatsapp = t(
        "Nomor tidak valid. Boleh pakai +, spasi, -, titik, atau (). Pastikan 6–15 digit.",
        "Invalid number. +, spaces, dashes, dots and () allowed. Must be 6–15 digits."
      );
    }

    if (!m.email.trim())
      err.email = t("Email wajib diisi", "Email is required");
    else if (!/^\S+@\S+\.\S+$/.test(m.email))
      err.email = t("Email tidak valid", "Invalid email");

    return err;
  }

  /* =========================
     VOUCHER (optional)
  ========================= */
  const [voucher, setVoucher] = useState({
    checking: false,
    info: null,
    error: "",
  });

  async function checkVoucher() {
    const code = String(model.voucher_code || "").trim();
    if (!code) return setVoucher({ checking: false, info: null, error: "" });
    try {
      setVoucher((v) => ({ ...v, checking: true, error: "" }));
      const url = new URL("/api/vouchers", window.location.origin);
      url.searchParams.set("code", code);
      if (eventId) url.searchParams.set("event_id", eventId);
      const res = await fetch(url.toString(), { cache: "no-store" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j?.valid === false) {
        throw new Error(
          j?.reason ||
            j?.error?.message ||
            "Voucher tidak valid untuk event ini."
        );
      }
      setVoucher({ checking: false, info: j?.data || null, error: "" });
    } catch (e) {
      setVoucher({
        checking: false,
        info: null,
        error: e?.message || "Invalid voucher",
      });
    }
  }

  /* =========================
     QUICK RECONCILE (public)
  ========================= */
  async function quickReconcile(orderId) {
    try {
      await fetch("/api/payments/reconcile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-public-reconcile": "1",
        },
        cache: "no-store",
        body: JSON.stringify({ order_id: orderId }),
      });
    } catch {}
  }

  /* =========================
     SNAP PAYMENT
  ========================= */
  async function startSnapPayment({ booking_id, order_id }) {
    try {
      setPayment((p) => ({ ...p, starting: true, error: "" }));

      // 1) request Snap token
      const res = await fetch("/api/payments/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(booking_id ? { booking_id } : { order_id }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          j?.error?.message || j?.message || "Gagal membuat transaksi Midtrans."
        );
      }
      const token = j?.data?.token || "";
      const redirect_url = j?.data?.redirect_url || "";
      const oid = j?.data?.order_id || order_id;
      const amountNum = toIDRNumber(j?.data?.amount);

      setPayment((p) => ({
        ...p,
        snapToken: token,
        redirectUrl: redirect_url,
        orderId: oid || p.orderId,
        amount: amountNum ?? p.amount,
      }));

      // 2) ensure snap loaded
      await ensureSnapLoaded();

      // 3) open popup (fallback redirect)
      if (token) {
        return new Promise((resolve) => {
          window.snap.pay(token, {
            onSuccess: async (result) => {
              setPayment((p) => ({
                ...p,
                lastResult: { type: "success", result },
              }));
              const oidNow = oid || state.booking?.order_id || "";
              if (oidNow) await quickReconcile(oidNow);
              await finishPaid({ orderId: oidNow, amount: amountNum });
              resolve(result);
            },
            onPending: async (result) => {
              setPayment((p) => ({
                ...p,
                lastResult: { type: "pending", result },
              }));
              await checkPaymentStatus();
              resolve(result);
            },
            onError: (result) => {
              setPayment((p) => ({
                ...p,
                lastResult: { type: "error", result },
                error: "Pembayaran gagal / ditolak.",
              }));
              resolve(result);
            },
            onClose: async () => {
              setPayment((p) => ({ ...p, lastResult: { type: "closed" } }));
              await checkPaymentStatus();
              resolve({ closed: true });
            },
          });
        });
      } else {
        // fallback redirect (rare)
        window.location.href = redirect_url;
        return null;
      }
    } finally {
      setPayment((p) => ({ ...p, starting: false }));
    }
  }

  // Mark UI paid + goto step 2 — accept args to avoid stale state
  async function finishPaid({ orderId, amount } = {}) {
    const order_id =
      orderId || payment.orderId || state.booking?.order_id || "";
    const amountFinal = bestAmount(amount);

    const paidAt = new Date();
    setUi({
      step: 1,
      paid: true,
      paidAt,
      paidAtText: paidAt.toLocaleString("id-ID"),
      nowText: new Date().toLocaleString("id-ID"),
      amountText: fmtIDR(amountFinal),
    });

    try {
      const res = await fetch(
        `/api/payments/check?order_id=${encodeURIComponent(order_id)}`,
        { cache: "no-store" }
      );
      const j = await res.json().catch(() => ({}));
      setPayment((p) => ({ ...p, check: j?.data || j }));
    } catch {}
  }

  // Re-open payment
  async function payNow() {
    const order_id = payment.orderId || state.booking?.order_id || "";
    const booking_id = state.booking?.id || "";
    if (!order_id && !booking_id) {
      setPayment((p) => ({ ...p, error: "Booking belum tersedia." }));
      return;
    }
    await startSnapPayment({ order_id, booking_id });
  }

  // Check status (manual)
  async function checkPaymentStatus() {
    const order_id = payment.orderId || state.booking?.order_id || "";
    if (!order_id) return;
    try {
      setPayment((p) => ({ ...p, checking: true }));
      const res = await fetch(
        `/api/payments/check?order_id=${encodeURIComponent(order_id)}`,
        { cache: "no-store" }
      );
      const j = await res.json().catch(() => ({}));
      if (j?.data?.midtrans?.mapped === "paid") {
        await finishPaid({ orderId: order_id });
      }
      setPayment((p) => ({ ...p, checking: false, check: j?.data || j }));
    } catch {
      setPayment((p) => ({ ...p, checking: false }));
    }
  }

  // Submit booking → SNAP (no payment-type field)
  async function onSubmit(e) {
    e.preventDefault();
    const v = validate(model);
    setErrors(v);
    if (Object.keys(v).length > 0) return;

    setState((s) => ({ ...s, loading: true, error: "" }));

    try {
      const body = {
        event_id: eventId,
        rep_name: model.rep_name.trim(),
        country: model.country.trim(),
        campus_name: model.campus_name.trim(),
        address: model.campus_address.trim(),
        whatsapp: normalizePhoneForBackend(model.whatsapp),
        email: model.email.trim(),
        voucher_code: model.voucher_code?.trim() || null,
      };

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(body),
      });

      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          j?.error?.message || j?.message || "Failed to submit booking"
        );
      }

      const booking = j?.data || j; // { id, order_id, amount, status, ... }
      const amtNum = toIDRNumber(booking?.amount);

      setState({ loading: false, error: "", booking });
      setPayment((p) => ({
        ...p,
        orderId: booking?.order_id || "",
        amount: amtNum,
      }));

      // always online via Snap
      await startSnapPayment({
        booking_id: booking?.id,
        order_id: booking?.order_id,
      });
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err?.message || "Gagal membuat booking",
      }));
    }
  }

  // Simple receipt PDF
  async function onDownloadReceipt() {
    const order_id = payment.orderId || state.booking?.order_id || "";
    const amount = bestAmount() ?? 0;

    const mod = await import("jspdf");
    const { jsPDF } = mod.jsPDF ? mod : { jsPDF: mod.default };

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    doc.setFontSize(18);
    doc.text("Payment Receipt", 40, 60);
    doc.setFontSize(12);
    const y0 = 100;
    const lines = [
      ["Ref Number", order_id],
      ["Status", ui.paid ? "Success" : "Pending"],
      ["Payment Time", ui.paidAtText || new Date().toLocaleString("id-ID")],
      ["Total Payment", fmtIDR(amount)],
    ];
    let y = y0;
    for (const [k, v] of lines) {
      doc.text(`${k}`, 40, y);
      doc.text(`: ${v}`, 160, y);
      y += 20;
    }
    doc.save(`Receipt_${order_id || "booking"}.pdf`);
  }

  return {
    // base
    locale,
    eventId,

    // form
    model,
    errors,
    onChange,
    onSubmit,

    // payment
    payment,
    payNow,
    checkPaymentStatus,

    // voucher
    voucher,
    checkVoucher,

    // ui
    ui,
    onDownloadReceipt,

    // expose for page
    state,
  };
}
