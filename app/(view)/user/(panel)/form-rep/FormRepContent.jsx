"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ConfigProvider, Steps } from "antd";
import "antd/dist/reset.css";
import useFormRepViewModel from "./useFormRepViewModel";

/* Layout tokens */
const SHELL = { width: "92%", maxWidth: 1100, margin: "0 auto" };
const BLUE = "#0b56c9";

const safe = (v) => (v == null ? "" : String(v));

/* Locale helper (konsisten dengan halaman lain) */
const pickLocaleClient = (lang, ls, fallback = "id") => {
  const v = String(lang || ls || fallback)
    .slice(0, 2)
    .toLowerCase();
  return v === "en" ? "en" : "id";
};

export default function FormRepContent(props) {
  const { initialLocale, locale: localeProp } = props || {};
  const search = useSearchParams();
  const router = useRouter();

  /* ===== Locale: ?lang / ?locale -> localStorage(oss.lang) -> baseLocale ===== */
  const baseLocale = initialLocale || localeProp || "id";

  const locale = useMemo(() => {
    const fromQuery = search?.get("lang") ?? search?.get("locale") ?? "";
    const fromLs =
      typeof window !== "undefined"
        ? window.localStorage.getItem("oss.lang") || ""
        : "";
    return pickLocaleClient(fromQuery || baseLocale, fromLs);
  }, [search, baseLocale]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("oss.lang", locale);
    } catch {
      // ignore
    }
  }, [locale]);

  const eventId = search?.get("id") || "";

  const vm = useFormRepViewModel({ locale, eventId });

  const currentStep = vm?.ui?.step ?? 0;
  const loading =
    Boolean(vm?.state?.loading) ||
    Boolean(vm?.ui?.submitting) ||
    Boolean(vm?.payment?.starting);
  const errorMsg = vm?.state?.error || vm?.ui?.error || "";

  const T = useMemo(
    () =>
      locale === "en"
        ? {
            heroTitle: "BOOTH BOOKING",
            heroSub:
              "Fill in your representative data, then choose a payment method via Midtrans Snap popup.",
            step1: { t: "Booth Booking", s: "Representative data" },
            step2: { t: "Booth Booking Detail", s: "Booth payment details" },
            formTitle: "REPRESENTATIVE BOOTH BOOKING FORM",
            tip: "Complete the information below to book your booth at OSS Bali events.",
            fields: {
              rep_name: "Representative Name",
              country: "Country",
              campus_name: "Campus/Institution",
              voucher_code: "Voucher Code",
              campus_address: "Campus Address",
              email: "Email",
              whatsapp: "Whatsapp Number",
            },
            placeholders: {
              rep_name: "Full name (e.g., Putri Indah)",
              country: "Origin country (e.g., Indonesia)",
              campus_name: "Campus name (e.g., KAPLAN)",
              voucher_code: "If any, enter voucher (e.g., OSS2025)",
              campus_address:
                "Full address (e.g., Wilkie Edge 8 Wilkie Road, Level 2, Singapore 228095)",
              email: "Active email (e.g., you@gmail.com)",
              whatsapp:
                "International format (+, spaces, -, ., ()) — total 6–15 digits",
            },
            submit: "BOOK BOOTH",
            doneTitle: "Booking Detail",
            lbl: {
              ref: "Ref Number",
              status: "Payment Status",
              time: "Payment Time",
              total: "Total Payment",
              channel: "Payment Channel",
            },
            receipt: "Get PDF Receipt",
            done: "Done",
            statusPaid: "Success",
            statusPending: "Pending",
            statusFailed: "Failed",
            back: "Back to Event",
            help: "Trouble with your payment?",
            helpSub:
              "Contact our help center now and we’ll help you complete your booking.",
          }
        : {
            heroTitle: "BOOKING BOOTH",
            heroSub:
              "Isi data representative kampus Anda, lalu pilih metode pembayaran langsung di popup Midtrans Snap.",
            step1: { t: "Booking Booth", s: "Data representative" },
            step2: { t: "Detail Booking Booth", s: "Detail pembayaran booth" },
            formTitle: "FORM BOOKING REPRESENTATIVE",
            tip: "Lengkapi data berikut untuk booking booth di event OSS Bali.",
            fields: {
              rep_name: "Nama Representative",
              country: "Nama Negara",
              campus_name: "Nama Kampus / Institusi",
              voucher_code: "Kode Voucher",
              campus_address: "Alamat Kampus",
              email: "Email",
              whatsapp: "No WhatsApp",
            },
            placeholders: {
              rep_name: "Nama Lengkap (contoh : Putri Indah)",
              country: "Asal Negara (contoh : Indonesia)",
              campus_name: "Nama Kampus (contoh : KAPLAN)",
              voucher_code: "Jika ada, isi kode voucher (contoh : OSS2025)",
              campus_address:
                "Alamat lengkap (contoh: Wilkie Edge 8 Wilkie Road, Level 2, Singapore 228095)",
              email: "Email aktif (contoh: you@gmail.com)",
              whatsapp:
                "Boleh +, spasi, -, ., () — total digit 6–15 (contoh: +62812xxxxxxx)",
            },
            submit: "BOOKING BOOTH",
            doneTitle: "Detail Booking",
            lbl: {
              ref: "Nomor Referensi",
              status: "Status Pembayaran",
              time: "Waktu Pembayaran",
              total: "Total Pembayaran",
              channel: "Metode Pembayaran",
            },
            receipt: "Unduh PDF Receipt",
            done: "Selesai",
            statusPaid: "Berhasil",
            statusPending: "Menunggu",
            statusFailed: "Gagal",
            back: "Kembali ke Event",
            help: "Ada kendala saat pembayaran?",
            helpSub:
              "Hubungi help center kami agar proses booking booth kamu tetap lancar.",
          },
    [locale]
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (typeof vm.onSubmit === "function") {
      vm.onSubmit(e);
    }
  };

  const backToEvent = () => {
    if (!eventId) return;
    router.push(
      `/user/events/rep?id=${encodeURIComponent(
        eventId
      )}&lang=${encodeURIComponent(locale)}`
    );
  };

  const pageAriaLabel =
    locale === "en"
      ? "Booth booking form for event representatives"
      : "Form booking booth untuk representative event";

  return (
    <ConfigProvider
      theme={{
        token: { colorPrimary: BLUE, colorInfo: BLUE, borderRadius: 12 },
      }}
    >
      <main
        className="page form-rep-page"
        aria-label={pageAriaLabel}
        aria-labelledby="form-rep-heading"
      >
        {/* ===== HERO ===== */}
        <section style={{ ...SHELL, paddingTop: 36, paddingBottom: 6 }}>
          <h1 id="form-rep-heading" className="hero-title">
            {T.heroTitle}
          </h1>
          <p className="hero-sub">{T.heroSub}</p>

          <div
            className="steps-scroll"
            style={{ maxWidth: 860, margin: "22px auto 0" }}
          >
            <div className="steps-inner">
              <Steps
                current={currentStep}
                items={[
                  { title: T.step1.t, description: T.step1.s },
                  { title: T.step2.t, description: T.step2.s },
                ]}
              />
            </div>
          </div>
        </section>

        {/* ===== FORM or STEP-2 DETAILS ===== */}
        <section style={{ ...SHELL, marginTop: 24, marginBottom: 120 }}>
          <div className="card">
            {currentStep === 0 ? (
              <>
                <h2 className="form-title">{T.formTitle}</h2>
                <p className="form-tip">{T.tip}</p>

                <form onSubmit={handleSubmit} className="form" noValidate>
                  <div className="grid">
                    <Field
                      label={T.fields.rep_name}
                      name="rep_name"
                      value={vm?.model?.rep_name || ""}
                      onChange={vm.onChange}
                      placeholder={T.placeholders.rep_name}
                      error={vm?.errors?.rep_name}
                      required
                      autoComplete="name"
                    />
                    <Field
                      label={T.fields.country}
                      name="country"
                      value={vm?.model?.country || ""}
                      onChange={vm.onChange}
                      placeholder={T.placeholders.country}
                      error={vm?.errors?.country}
                      required
                      autoComplete="country-name"
                    />
                    <Field
                      label={T.fields.campus_name}
                      name="campus_name"
                      value={vm?.model?.campus_name || ""}
                      onChange={vm.onChange}
                      placeholder={T.placeholders.campus_name}
                      error={vm?.errors?.campus_name}
                      required
                      autoComplete="organization"
                    />
                    <Field
                      label={T.fields.voucher_code}
                      name="voucher_code"
                      value={vm?.model?.voucher_code || ""}
                      onChange={vm.onChange}
                      placeholder={T.placeholders.voucher_code}
                      error={vm?.errors?.voucher_code}
                      autoComplete="off"
                    />
                    <Field
                      label={T.fields.campus_address}
                      name="campus_address"
                      value={vm?.model?.campus_address || ""}
                      onChange={vm.onChange}
                      placeholder={T.placeholders.campus_address}
                      error={vm?.errors?.campus_address}
                      required
                      autoComplete="street-address"
                    />
                    <Field
                      label={T.fields.email}
                      name="email"
                      value={vm?.model?.email || ""}
                      onChange={vm.onChange}
                      placeholder={T.placeholders.email}
                      error={vm?.errors?.email}
                      type="email"
                      required
                      autoComplete="email"
                    />
                    <Field
                      label={T.fields.whatsapp}
                      name="whatsapp"
                      value={vm?.model?.whatsapp || ""}
                      onChange={vm.onChange}
                      placeholder={T.placeholders.whatsapp}
                      error={vm?.errors?.whatsapp}
                      type="tel"
                      inputMode="tel"
                      pattern="^\+?\d([\s().-]?\d){5,19}$"
                      required
                      autoComplete="tel"
                    />
                  </div>

                  {Boolean(errorMsg) && (
                    <div className="alert" role="alert">
                      {errorMsg}
                    </div>
                  )}

                  <div className="cta-row">
                    <button
                      type="submit"
                      disabled={loading}
                      className="primary-btn"
                    >
                      {loading ? "Processing..." : T.submit}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              /* ===== STEP 2 — DETAIL BOOKING ===== */
              <div className="step2">
                <div className="big-check" aria-hidden="true">
                  ✔
                </div>
                <h3 className="detail-title">{T.doneTitle}</h3>

                <div className="pay-card">
                  <div className="pay-row">
                    <div className="k">{T.lbl.ref}</div>
                    <div className="v mono">
                      {safe(
                        vm?.payment?.orderId ||
                          vm?.state?.booking?.order_id ||
                          vm?.ui?.orderId
                      )}
                    </div>
                  </div>

                  <div className="pay-row">
                    <div className="k">{T.lbl.status}</div>
                    <div
                      className={`v badge ${
                        vm?.ui?.paid
                          ? "ok"
                          : vm?.payment?.lastResult?.type === "error"
                          ? "bad"
                          : "pending"
                      }`}
                    >
                      {vm?.ui?.paid
                        ? T.statusPaid
                        : vm?.payment?.lastResult?.type === "error"
                        ? T.statusFailed
                        : T.statusPending}
                    </div>
                  </div>

                  <div className="pay-row">
                    <div className="k">{T.lbl.time}</div>
                    <div className="v">
                      {vm?.ui?.paid
                        ? vm?.ui?.paidAtText
                        : vm?.payment?.check?.midtrans?.transaction_status
                        ? vm?.ui?.nowText
                        : "—"}
                    </div>
                  </div>

                  <div className="pay-row">
                    <div className="k">{T.lbl.channel}</div>
                    <div className="v">{vm?.ui?.channelLabel || "—"}</div>
                  </div>

                  <div className="pay-row total">
                    <div className="k">{T.lbl.total}</div>
                    <div className="v strong">
                      {vm?.ui?.amountText || "IDR —"}
                    </div>
                  </div>
                </div>

                <div className="help">
                  <div className="ic" aria-hidden="true">
                    ⓘ
                  </div>
                  <div>
                    <div className="h">{T.help}</div>
                    <div className="p">{T.helpSub}</div>
                  </div>
                </div>

                <div className="actions">
                  <button
                    type="button"
                    className="ghost-btn"
                    onClick={vm.onDownloadReceipt || (() => {})}
                  >
                    ⤓ {T.receipt}
                  </button>

                  <button
                    type="button"
                    className="primary-btn slim"
                    onClick={backToEvent}
                  >
                    {T.done}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        <style jsx>{`
          .page {
            background: radial-gradient(
                1200px 600px at 10% -10%,
                #f2f7ff 0%,
                #ffffff 55%
              )
              no-repeat;
          }

          .hero-title {
            margin: 0;
            text-align: center;
            font-size: clamp(28px, 6vw, 54px);
            line-height: 1.08;
            font-weight: 900;
            color: ${BLUE};
            text-transform: uppercase;
            letter-spacing: 0.02em;
            word-break: break-word;
          }
          .hero-sub {
            margin: 10px auto 0;
            text-align: center;
            color: #334155;
            font-size: clamp(13px, 2.2vw, 18px);
            max-width: min(92vw, 760px);
          }

          .steps-scroll {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            padding: 0 2px;
          }
          .steps-scroll::-webkit-scrollbar {
            display: none;
          }
          .steps-inner {
            min-width: 560px;
          }
          :global(.ant-steps) {
            max-width: 100%;
          }
          :global(.ant-steps-item-title) {
            white-space: nowrap;
            font-size: clamp(12px, 1.8vw, 14px);
          }
          @media (max-width: 520px) {
            :global(.ant-steps-item-description) {
              display: none;
            }
          }

          .card {
            background: #fff;
            border-radius: 20px;
            border: 1px solid rgba(14, 56, 140, 0.08);
            box-shadow: 0 16px 36px rgba(15, 23, 42, 0.06),
              0 46px 100px rgba(15, 23, 42, 0.07);
            padding: clamp(18px, 3.2vw, 30px);
          }
          .form-title {
            margin: 0;
            text-align: center;
            font-size: clamp(18px, 3.6vw, 32px);
            line-height: 1.12;
            font-weight: 900;
            letter-spacing: 0.02em;
            color: ${BLUE};
            text-transform: uppercase;
          }
          .form-tip {
            margin-top: 6px;
            text-align: center;
            color: #7c8fb4;
            font-size: clamp(11px, 2vw, 12px);
          }
          .form {
            margin-top: clamp(12px, 2.2vw, 18px);
          }

          /* Grid: mobile 1 kolom, >=920px 2 kolom */
          .grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 18px 16px;
          }
          @media (min-width: 920px) {
            .grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
          }

          .alert {
            margin-top: 12px;
            background: #fff4f4;
            border: 1px solid #ffd3d3;
            color: #9c1c1c;
            border-radius: 12px;
            padding: 10px 12px;
            font-size: 14px;
          }
          .cta-row {
            display: grid;
            place-items: center;
            margin-top: 24px;
          }
          .primary-btn {
            background: ${BLUE};
            color: #fff;
            font-weight: 900;
            letter-spacing: 0.02em;
            text-transform: uppercase;
            padding: 12px 18px;
            border-radius: 14px;
            border: none;
            cursor: pointer;
            box-shadow: 0 12px 28px rgba(11, 86, 201, 0.3);
            min-width: clamp(180px, 46vw, 280px);
          }
          .primary-btn.slim {
            min-width: clamp(150px, 40vw, 180px);
          }
          .primary-btn[disabled] {
            opacity: 0.7;
            cursor: not-allowed;
          }

          /* ===== STEP 2 ===== */
          .step2 {
            max-width: 920px;
            margin: 0 auto;
            text-align: center;
          }
          .big-check {
            width: clamp(84px, 14vw, 128px);
            height: clamp(84px, 14vw, 128px);
            border-radius: 999px;
            display: grid;
            place-items: center;
            font-size: clamp(42px, 8vw, 64px);
            margin: 6px auto 8px;
            border: 2px solid #d5e5ff;
            color: ${BLUE};
            box-shadow: 0 10px 26px rgba(11, 86, 201, 0.12);
          }
          .detail-title {
            margin: 6px 0 18px;
            color: ${BLUE};
            font-size: clamp(16px, 2.6vw, 22px);
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.02em;
          }
          .pay-card {
            text-align: left;
            background: #fff;
            border: 1px solid #eef2ff;
            border-radius: 14px;
            box-shadow: 0 10px 22px rgba(15, 23, 42, 0.06);
            padding: 12px 8px;
            margin: 0 auto 16px;
          }
          .pay-row {
            display: grid;
            grid-template-columns: 220px 1fr;
            align-items: center;
            gap: 8px;
            padding: 10px 14px;
            border-bottom: 1px solid #f1f5ff;
          }
          .pay-row:last-child {
            border-bottom: 0;
          }
          .pay-row.total {
            background: #f8fbff;
            border-radius: 0 0 14px 14px;
          }
          .k {
            color: #5a77a6;
            font-size: 13px;
          }
          .v {
            color: #0a2b69;
            font-weight: 700;
            word-break: break-all;
          }
          .v.mono {
            font-family: ui-monospace, Menlo, monospace;
          }
          .v.strong {
            font-size: clamp(16px, 2.6vw, 18px);
          }
          .badge {
            display: inline-block;
            padding: 6px 10px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 900;
            letter-spacing: 0.02em;
          }
          .badge.ok {
            background: #ecfdf5;
            color: #047857;
            border: 1px solid #a7f3d0;
          }
          .badge.pending {
            background: #fff7ed;
            color: #9a3412;
            border: 1px solid #fed7aa;
          }
          .badge.bad {
            background: #fef2f2;
            color: #991b1b;
            border: 1px solid #fecaca;
          }

          .help {
            margin: 8px 0 12px;
            border: 1px solid #eef2ff;
            border-radius: 12px;
            padding: 12px 14px;
            display: grid;
            grid-template-columns: 36px 1fr;
            align-items: start;
            background: #fbfdff;
          }
          .help .ic {
            width: 36px;
            height: 36px;
            display: grid;
            place-items: center;
            border-radius: 10px;
            background: #eef6ff;
            color: ${BLUE};
            border: 1px solid #dbe7ff;
          }
          .help .h {
            font-weight: 800;
            color: #0a2b69;
          }
          .help .p {
            margin-top: 2px;
            color: #5a77a6;
            font-size: 13px;
          }

          .actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 14px;
            max-width: 560px;
            margin: 12px auto 0;
          }

          @media (max-width: 920px) {
            .pay-row {
              grid-template-columns: 1fr;
            }
            .actions {
              grid-template-columns: 1fr;
            }
          }
        `}</style>

        {/* Anti horizontal scroll kecil */}
        <style jsx global>{`
          .form-rep-page {
            overflow-x: hidden;
          }
          @supports (overflow: clip) {
            .form-rep-page {
              overflow-x: clip;
            }
          }
        `}</style>
      </main>
    </ConfigProvider>
  );
}

/* ------- Field component ------- */
function Field({
  label,
  name,
  value,
  onChange,
  placeholder,
  error,
  required = false,
  type = "text",
  inputMode,
  pattern,
  autoComplete,
}) {
  const BLUE = "#0b56c9";
  const errorId = error ? `${name}-error` : undefined;

  return (
    <div className="field">
      <label className="label" htmlFor={name}>
        {label}
        {required ? <span style={{ color: "#dc2626" }}> *</span> : null}
      </label>
      <input
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`input ${error ? "has-error" : ""}`}
        required={required}
        type={type}
        inputMode={inputMode}
        pattern={pattern}
        aria-required={required ? "true" : undefined}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={errorId}
      />
      {error ? (
        <div id={errorId} className="err">
          {error}
        </div>
      ) : null}

      <style jsx>{`
        .label {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: #0a2b69;
          margin-bottom: 8px;
        }
        .input {
          width: 100%;
          height: 48px;
          border-radius: 12px;
          border: 1px solid rgba(14, 56, 140, 0.14);
          padding: 0 14px;
          outline: none;
          background: #f7faff;
          box-sizing: border-box;
        }
        .input:focus {
          border-color: ${BLUE};
          box-shadow: 0 0 0 3px rgba(11, 86, 201, 0.14);
          background: #fff;
        }
        .has-error {
          border-color: #f5a3a3 !important;
          box-shadow: 0 0 0 3px rgba(245, 163, 163, 0.15);
          background: #fffafa;
        }
        .err {
          margin-top: 6px;
          color: #b42318;
          font-size: 12px;
        }
      `}</style>
    </div>
  );
}
