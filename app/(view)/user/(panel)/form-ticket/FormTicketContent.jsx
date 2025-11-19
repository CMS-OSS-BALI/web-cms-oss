// app/(view)/user/(panel)/events/form-ticket/FormTicketContent.jsx
"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useFormTicketViewModel from "./useFormTicketViewModel";
import { ConfigProvider, Steps } from "antd";
import "antd/dist/reset.css";

/* Layout tokens */
const SHELL = { width: "92%", maxWidth: 1100, margin: "0 auto" };
const BLUE = "#0b56c9";

const safe = (v) => (v == null ? "" : String(v));

export default function FormTicketContent({
  locale = "id",
  eventId: eventIdProp = "",
}) {
  const sp = useSearchParams();
  const router = useRouter();

  // Event ID: utamakan dari props (server), fallback ke query
  const eventId = useMemo(() => {
    const fromProp = safe(eventIdProp).trim();
    if (fromProp) return fromProp;
    return sp.get("id") || "";
  }, [eventIdProp, sp]);

  // Simpan locale ke localStorage supaya sinkron dengan halaman lain
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("oss.lang", locale);
      } catch {
        // ignore
      }
    }
  }, [locale]);

  const vm = useFormTicketViewModel({ locale, eventId });

  const T =
    locale === "en"
      ? {
          heroTitle: "OSS EVENT TICKET",
          heroSub: "Be part of our event, starting now",
          step1: { t: "Event Ticket", s: "Registrant student data" },
          step2: { t: "Ticket Detail Info", s: "Student ticket data" },
          formTitle: "OSS EVENT TICKET FORM",
          tip: "Fill in your event ticket data",
          name: "Full Name",
          whatsapp: "Whatsapp Number",
          school: "School/Campus",
          class: "Class/Semester",
          email: "Email",
          domicile: "Domicile",
          placeholders: {
            name: "Your full name",
            whatsapp: "Whatsapp number (e.g. 628xx)",
            school: "Your school/campus",
            class: "Your class/semester (e.g. Grade 12)",
            email: "Your active email",
            domicile: "Your current city/district",
          },
          submit: "GET TICKET",
          back: "Back to Events",
          doneTitle: "Ticket Sent to Email",
          doneSub:
            "We’ve emailed your ticket. Show this QR at the venue. You can also print the receipt.",
          btnPdf: "Get PDF Receipt",
          btnDone: "Done",
          lblCode: "Ticket Code",
        }
      : {
          heroTitle: "TIKET EVENT OSS",
          heroSub: "Jadilah bagian dari acara kita, sekarang juga",
          step1: {
            t: "Tiket Event Oss",
            s: "Data diri student yang mendaftar",
          },
          step2: { t: "Informasi Detail Tiket", s: "Data tiket student" },
          formTitle: "FORM TIKET EVENT OSS",
          tip: "Isi data form tiket event OSS",
          name: "Nama Lengkap",
          whatsapp: "No Whatsapp",
          school: "Asal Sekolah/Instansi",
          class: "Kelas/Semester",
          email: "Email",
          domicile: "Domisili",
          placeholders: {
            name: "Isi nama lengkap",
            whatsapp: "Isi no hp (contoh: 628xx atau 08xx)",
            school:
              "Isi nama sekolah/instansi (contoh: Universitas Pendidikan Ganesha)",
            class: "Isi kelas / semester (contoh: Kelas 12)",
            email: "Isi email aktif (contoh: you@gmail.com)",
            domicile: "Tempat tinggal saat ini (contoh: Denpasar)",
          },
          submit: "AMBIL TIKET",
          back: "Kembali ke Event",
          doneTitle: "Tiket Terkirim ke Email",
          doneSub:
            "Tiket sudah kami kirim ke email. Tunjukkan QR berikut saat hadir. Kamu juga bisa cetak bukti (PDF).",
          btnPdf: "Get PDF Receipt",
          btnDone: "Selesai",
          lblCode: "Kode Tiket",
        };

  const currentStep = vm.state.success ? 1 : 0;

  function appendBuster(url) {
    try {
      const u = new URL(url, window.location.origin);
      u.searchParams.set("_", Date.now().toString());
      return u.toString();
    } catch {
      return url + (url.includes("?") ? "&" : "?") + "_=" + Date.now();
    }
  }

  const ticketCode = safe(vm.state.ticket?.ticket_code);
  const qrPrimary =
    vm.state.ticket?.qr_url ||
    (ticketCode
      ? `/api/tickets/qr?code=${encodeURIComponent(ticketCode)}`
      : "");
  const qrSrc = qrPrimary ? appendBuster(qrPrimary) : "";

  async function onDownloadQrPdf() {
    const code = ticketCode?.trim();
    if (!code) {
      alert("QR belum tersedia.");
      return;
    }
    const pdfQrUrl = `/api/tickets/qr?code=${encodeURIComponent(code)}`;
    const logoUrl = `/images/loading.png`;

    async function fetchAsDataURL(url) {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`Fetch failed (${res.status}) for ${url}`);
      const blob = await res.blob();
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    }

    try {
      const [qrDataUrl, logoDataUrl] = await Promise.all([
        fetchAsDataURL(pdfQrUrl),
        fetchAsDataURL(logoUrl),
      ]);

      const mod = await import("jspdf");
      const { jsPDF } = mod.jsPDF ? mod : { jsPDF: mod.default };

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();

      const qW = Math.min(pageW - 40, Math.max(100, pageW * 0.7));
      const x = (pageW - qW) / 2;
      const y = (pageH - qW) / 2;

      doc.setFillColor(255, 255, 255);
      doc.rect(x - 6, y - 6, qW + 12, qW + 12, "F");
      doc.addImage(qrDataUrl, "PNG", x, y, qW, qW, undefined, "FAST");

      const cx = x + qW / 2;
      const cy = y + qW / 2;
      const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
      const logoW = clamp(qW * 0.22, 18, 42);
      const bg = logoW + 6;

      doc.setFillColor(255, 255, 255);
      if (typeof doc.roundedRect === "function") {
        doc.roundedRect(cx - bg / 2, cy - bg / 2, bg, bg, 3, 3, "F");
      } else {
        doc.rect(cx - bg / 2, cy - bg / 2, bg, bg, "F");
      }
      doc.addImage(
        logoDataUrl,
        "PNG",
        cx - logoW / 2,
        cy - logoW / 2,
        logoW,
        logoW,
        undefined,
        "FAST"
      );
      doc.save(`Ticket_${code}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Gagal membuat PDF. Pastikan 'jspdf' terpasang dan logo tersedia.");
    }
  }

  return (
    <ConfigProvider
      theme={{
        token: { colorPrimary: BLUE, colorInfo: BLUE, borderRadius: 12 },
      }}
    >
      <main className="page" aria-labelledby="ticket-form-heading">
        {/* ===== HERO ===== */}
        <section
          style={{ ...SHELL, paddingTop: 36, paddingBottom: 6 }}
          aria-label={
            locale === "en"
              ? "OSS Bali event ticket registration"
              : "Form pendaftaran tiket event OSS Bali"
          }
        >
          <h1 id="ticket-form-heading" className="hero-title">
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
                aria-label={
                  locale === "en"
                    ? "Ticket registration steps"
                    : "Langkah pendaftaran tiket"
                }
              />
            </div>
          </div>
        </section>

        {/* ===== FORM / SUCCESS ===== */}
        <section
          style={{ ...SHELL, marginTop: 24, marginBottom: 120 }}
          aria-live="polite"
        >
          <div className="card">
            {!vm.state.success ? (
              <>
                <h2 className="form-title">{T.formTitle}</h2>
                <p className="form-tip">{T.tip}</p>

                <form onSubmit={vm.onSubmit} className="form" noValidate>
                  <div className="grid">
                    <Field
                      label={T.name}
                      name="full_name"
                      value={vm.model.full_name}
                      onChange={vm.onChange}
                      placeholder={T.placeholders.name}
                      error={vm.errors.full_name}
                      autoComplete="name"
                    />
                    <Field
                      label={T.whatsapp}
                      name="whatsapp"
                      value={vm.model.whatsapp}
                      onChange={vm.onChange}
                      placeholder={T.placeholders.whatsapp}
                      error={vm.errors.whatsapp}
                      autoComplete="tel"
                    />
                    <Field
                      label={T.school}
                      name="school_or_campus"
                      value={vm.model.school_or_campus}
                      onChange={vm.onChange}
                      placeholder={T.placeholders.school}
                      error={vm.errors.school_or_campus}
                      autoComplete="organization"
                    />
                    <Field
                      label={T.class}
                      name="class_or_semester"
                      value={vm.model.class_or_semester}
                      onChange={vm.onChange}
                      placeholder={T.placeholders.class}
                      error={vm.errors.class_or_semester}
                      autoComplete="off"
                    />
                    <Field
                      label={T.email}
                      name="email"
                      type="email"
                      value={vm.model.email}
                      onChange={vm.onChange}
                      placeholder={T.placeholders.email}
                      error={vm.errors.email}
                      autoComplete="email"
                    />
                    <Field
                      label={T.domicile}
                      name="domicile"
                      value={vm.model.domicile}
                      onChange={vm.onChange}
                      placeholder={T.placeholders.domicile}
                      error={vm.errors.domicile}
                      autoComplete="address-level2"
                    />
                  </div>

                  {vm.state.error && (
                    <div className="alert" role="alert">
                      {vm.state.error}
                    </div>
                  )}

                  <div className="cta-row">
                    <button
                      type="submit"
                      disabled={vm.state.loading}
                      className="primary-btn"
                    >
                      {vm.state.loading ? "Processing..." : T.submit}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              /* ===== SUCCESS: QR & Actions ===== */
              <div className="success-wrap">
                <h3 className="done-title">✅ {T.doneTitle}</h3>
                <p className="done-sub">{T.doneSub}</p>

                <div className="qr-card" id="qr-receipt">
                  <div className="qr-wrap">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      key={ticketCode}
                      className="qr"
                      src={qrSrc}
                      alt={
                        locale === "en"
                          ? "QR code for your OSS event ticket"
                          : "Kode QR untuk tiket event OSS kamu"
                      }
                      title={
                        locale === "en"
                          ? "OSS event ticket QR code"
                          : "QR Code tiket event OSS"
                      }
                      loading="eager"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        const fb = `https://api.qrserver.com/v1/create-qr-code/?size=420x420&data=${encodeURIComponent(
                          ticketCode || "OSS Ticket"
                        )}`;
                        e.currentTarget.src = fb;
                      }}
                    />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      className="qr-logo"
                      src="/images/loading.png"
                      alt="OSS logo"
                      title="OSS logo"
                      aria-hidden="true"
                    />
                  </div>
                </div>

                <div className="codebox">
                  <div className="k">{T.lblCode}</div>
                  <div className="v">{ticketCode}</div>
                </div>

                <div className="action-row">
                  <button
                    type="button"
                    className="ghost-btn"
                    onClick={onDownloadQrPdf}
                  >
                    <span className="ic">⤓</span> {T.btnPdf}
                  </button>

                  <button
                    type="button"
                    className="primary-btn slim"
                    onClick={() =>
                      router.push(
                        `/user/events/peserta?id=${encodeURIComponent(
                          eventId
                        )}&lang=${locale}`
                      )
                    }
                  >
                    {T.btnDone}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* === styles tetap sama seperti punyamu (dipertahankan) === */}
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

          .grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 18px 16px;
          }
          @media (max-width: 920px) {
            .grid {
              grid-template-columns: 1fr;
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
            min-width: clamp(180px, 46vw, 240px);
          }
          .primary-btn.slim {
            min-width: clamp(150px, 40vw, 180px);
          }
          .primary-btn[disabled] {
            opacity: 0.7;
            cursor: not-allowed;
          }

          /* SUCCESS VIEW */
          .success-wrap {
            text-align: center;
          }
          .done-title {
            margin: 0;
            color: #0a3a86;
            font-weight: 800;
            font-size: clamp(16px, 2.6vw, 20px);
          }
          .done-sub {
            margin: 8px auto 18px;
            color: #27446f;
            max-width: min(92vw, 760px);
            font-size: clamp(12px, 2.2vw, 14px);
          }
          .qr-card {
            width: 100%;
            display: grid;
            place-items: center;
            background: #fff;
            border: 1px solid #eef2ff;
            border-radius: 16px;
            box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
            padding: clamp(14px, 2.8vw, 18px);
            margin: 0 auto 16px;
            max-width: 720px;
          }
          .qr-wrap {
            position: relative;
            width: clamp(240px, 80vw, 420px);
            aspect-ratio: 1/1;
            display: grid;
            place-items: center;
          }
          .qr {
            width: 100%;
            height: 100%;
            object-fit: contain;
            image-rendering: crisp-edges;
          }
          .qr-logo {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: clamp(48px, 22%, 96px);
            height: auto;
            background: #ffffff;
            padding: 6px;
            border-radius: 14px;
            box-shadow: 0 6px 18px rgba(15, 23, 42, 0.15);
            pointer-events: none;
          }

          .codebox {
            display: inline-flex;
            gap: 10px;
            align-items: baseline;
            background: #f6faff;
            border: 1px dashed #cfe1ff;
            padding: 8px 12px;
            border-radius: 10px;
            margin: 0 auto 10px;
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          }
          .codebox .k {
            color: #5870a0;
            font-size: 12px;
          }
          .codebox .v {
            color: #0b2e76;
            font-weight: 900;
            word-break: break-all;
          }

          .action-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 18px;
            max-width: 720px;
            margin: 12px auto 0;
          }
          .ghost-btn {
            background: #fff;
            color: #0b2e76;
            border: 1px solid #d8e5ff;
            padding: 12px 16px;
            border-radius: 12px;
            font-weight: 800;
            box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08);
          }
          .ic {
            margin-right: 8px;
          }

          @media (max-width: 920px) {
            .action-row {
              grid-template-columns: 1fr;
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
  autoComplete = "off",
  type = "text",
}) {
  const BLUE = "#0b56c9";
  return (
    <div className="field">
      <label className="label" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`input ${error ? "has-error" : ""}`}
      />
      {error ? <div className="err">{error}</div> : null}

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
