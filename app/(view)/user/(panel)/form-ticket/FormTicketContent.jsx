"use client";

import { useRouter, useSearchParams } from "next/navigation";
import useFormTicketViewModel from "./useFormTicketViewModel";
import { ConfigProvider, Steps } from "antd";
import "antd/dist/reset.css";

/* Layout tokens */
const SHELL = { width: "92%", maxWidth: 1100, margin: "0 auto" };
const BLUE = "#0b56c9";

const safe = (v) => (v == null ? "" : String(v));

export default function FormTicketContent({ locale = "id" }) {
  const sp = useSearchParams();
  const router = useRouter();
  const eventId = sp.get("id") || "";
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
      const u = new URL(url, location.origin);
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

  // OPTIONAL: print receipt (tetap ada jika perlu)
  const onPrintReceipt = () => {
    const code = ticketCode;
    const qr = qrSrc;
    const name = safe(vm.model.full_name);
    const email = safe(vm.model.email);

    const w = window.open("", "_blank", "noopener,noreferrer,width=720");
    if (!w) return;

    w.document.write(`<!doctype html>
<html><head><meta charset="utf-8"><title>Ticket ${code}</title>
<style>
  body{font-family:"Public Sans",system-ui,Arial,sans-serif;padding:24px;color:#0f172a}
  .card{max-width:640px;margin:0 auto;border:1px solid #e5e7eb;border-radius:16px;padding:24px}
  h1{margin:0 0 8px;font-size:20px;color:#0b56c9}
  .meta{font-size:13px;color:#475569;margin-bottom:16px}
  .qrwrap{display:grid;place-items:center;background:#fff;border:1px solid #eef2ff;border-radius:16px;box-shadow:0 10px 28px rgba(15,23,42,.06);padding:18px}
  .qr{width:360px;height:360px;object-fit:contain}
  .kv{display:flex;gap:10px;margin-top:12px;font-size:14px}
  .k{width:120px;color:#64748b}
  .v{font-weight:700}
  @media print {.btn{display:none}}
</style></head>
<body>
  <div class="card">
    <h1>OSS Event Ticket</h1>
    <div class="meta">${T.lblCode}: <strong>${code}</strong></div>
    <div class="qrwrap"><img class="qr" src="${qr}" alt="QR Ticket"/></div>
    <div class="kv"><div class="k">Name</div><div class="v">${name}</div></div>
    <div class="kv"><div class="k">Email</div><div class="v">${email}</div></div>
  </div>
  <div class="btn" style="text-align:center;margin-top:16px">
    <button onclick="window.print()" style="padding:10px 16px;border-radius:10px;background:#0b56c9;color:#fff;border:none;font-weight:700">Print</button>
  </div>
</body></html>`);
    w.document.close();
    w.onload = () => w.print();
  };

  // === Download QR as PDF with centered logo (auto download) ===
  async function onDownloadQrPdf() {
    const code = ticketCode?.trim();
    if (!code) {
      alert("QR belum tersedia.");
      return;
    }

    // Pakai endpoint internal agar bebas CORS
    const pdfQrUrl = `/api/tickets/qr?code=${encodeURIComponent(code)}`;
    const logoUrl = `/images/loading.png`;

    // helper: fetch -> dataURL via FileReader (tanpa canvas)
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

      // Lebar QR di PDF
      const qW = Math.min(pageW - 40, Math.max(100, pageW * 0.7));
      const x = (pageW - qW) / 2;
      const y = (pageH - qW) / 2;

      // Quiet zone di sekitar QR
      doc.setFillColor(255, 255, 255);
      doc.rect(x - 6, y - 6, qW + 12, qW + 12, "F");

      // Gambar QR
      doc.addImage(qrDataUrl, "PNG", x, y, qW, qW, undefined, "FAST");

      // Logo di tengah (dengan background putih kecil agar tetap scannable)
      const cx = x + qW / 2;
      const cy = y + qW / 2;

      const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
      const logoW = clamp(qW * 0.22, 18, 42); // 22% dari QR, min 18mm, max 42mm
      const bg = logoW + 6; // padding putih

      // Background putih di belakang logo
      doc.setFillColor(255, 255, 255);
      if (typeof doc.roundedRect === "function") {
        doc.roundedRect(cx - bg / 2, cy - bg / 2, bg, bg, 3, 3, "F");
      } else {
        doc.rect(cx - bg / 2, cy - bg / 2, bg, bg, "F");
      }

      // Tempel logo
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

      // Simpan → auto download
      doc.save(`Ticket_${code}.pdf`);
    } catch (err) {
      console.error(err);
      alert(
        "Gagal membuat PDF. Pastikan 'jspdf' terpasang dan file logo ada di /public/images/loading.png"
      );
    }
  }

  return (
    <ConfigProvider
      theme={{
        token: { colorPrimary: BLUE, colorInfo: BLUE, borderRadius: 12 },
      }}
    >
      <main className="page">
        {/* ===== HERO ===== */}
        <section style={{ ...SHELL, paddingTop: 36, paddingBottom: 6 }}>
          <h1 className="hero-title">{T.heroTitle}</h1>
          <p className="hero-sub">{T.heroSub}</p>

          {/* ===== Antd Steps (default) ===== */}
          <div style={{ maxWidth: 860, margin: "22px auto 0" }}>
            <Steps
              current={currentStep}
              items={[
                { title: T.step1.t, description: T.step1.s },
                { title: T.step2.t, description: T.step2.s },
              ]}
            />
          </div>
        </section>

        {/* ===== FORM / SUCCESS ===== */}
        <section style={{ ...SHELL, marginTop: 24, marginBottom: 120 }}>
          <div className="card">
            {!vm.state.success ? (
              <>
                <h2 className="form-title">{T.formTitle}</h2>
                <p className="form-tip">{T.tip}</p>

                <form onSubmit={vm.onSubmit} className="form">
                  <div className="grid">
                    <Field
                      label={T.name}
                      name="full_name"
                      value={vm.model.full_name}
                      onChange={vm.onChange}
                      placeholder={T.placeholders.name}
                      error={vm.errors.full_name}
                    />
                    <Field
                      label={T.whatsapp}
                      name="whatsapp"
                      value={vm.model.whatsapp}
                      onChange={vm.onChange}
                      placeholder={T.placeholders.whatsapp}
                      error={vm.errors.whatsapp}
                    />
                    <Field
                      label={T.school}
                      name="school_or_campus"
                      value={vm.model.school_or_campus}
                      onChange={vm.onChange}
                      placeholder={T.placeholders.school}
                      error={vm.errors.school_or_campus}
                    />
                    <Field
                      label={T.class}
                      name="class_or_semester"
                      value={vm.model.class_or_semester}
                      onChange={vm.onChange}
                      placeholder={T.placeholders.class}
                      error={vm.errors.class_or_semester}
                    />
                    <Field
                      label={T.email}
                      name="email"
                      value={vm.model.email}
                      onChange={vm.onChange}
                      placeholder={T.placeholders.email}
                      error={vm.errors.email}
                    />
                    <Field
                      label={T.domicile}
                      name="domicile"
                      value={vm.model.domicile}
                      onChange={vm.onChange}
                      placeholder={T.placeholders.domicile}
                      error={vm.errors.domicile}
                    />
                  </div>

                  {vm.state.error && (
                    <div className="alert">{vm.state.error}</div>
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
                  {/* QR + CENTER LOGO OVERLAY (display) */}
                  <div className="qr-wrap">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      key={ticketCode}
                      className="qr"
                      src={qrSrc}
                      alt="Ticket QR"
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
                        `/user/events/peserta?id=${encodeURIComponent(eventId)}`
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
            font-size: 54px;
            line-height: 1.04;
            font-weight: 900;
            color: ${BLUE};
            text-transform: uppercase;
            letter-spacing: 0.02em;
          }
          .hero-sub {
            margin: 10px auto 0;
            text-align: center;
            color: #334155;
            font-size: 18px;
            max-width: 760px;
          }

          .card {
            background: #fff;
            border-radius: 20px;
            border: 1px solid rgba(14, 56, 140, 0.08);
            box-shadow: 0 16px 36px rgba(15, 23, 42, 0.06),
              0 46px 100px rgba(15, 23, 42, 0.07);
            padding: 30px 30px 36px;
          }
          .form-title {
            margin: 0;
            text-align: center;
            font-size: 32px;
            line-height: 1.1;
            font-weight: 900;
            letter-spacing: 0.02em;
            color: ${BLUE};
            text-transform: uppercase;
          }
          .form-tip {
            margin-top: 6px;
            text-align: center;
            color: #7c8fb4;
            font-size: 12px;
          }
          .form {
            margin-top: 18px;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 18px 16px;
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
            padding: 14px 22px;
            border-radius: 14px;
            border: none;
            cursor: pointer;
            box-shadow: 0 12px 28px rgba(11, 86, 201, 0.3);
            min-width: 240px;
          }
          .primary-btn.slim {
            min-width: 180px;
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
            font-size: 20px;
          }
          .done-sub {
            margin: 8px auto 18px;
            color: #27446f;
            max-width: 760px;
          }
          .qr-card {
            width: 100%;
            display: grid;
            place-items: center;
            background: #fff;
            border: 1px solid #eef2ff;
            border-radius: 16px;
            box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
            padding: 18px;
            margin: 0 auto 16px;
            max-width: 720px;
          }

          /* QR wrapper to allow centered logo overlay */
          .qr-wrap {
            position: relative;
            width: clamp(260px, 80vw, 420px);
            aspect-ratio: 1 / 1;
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
            width: clamp(52px, 22%, 96px);
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
            .hero-title {
              font-size: 42px;
            }
            .action-row {
              grid-template-columns: 1fr;
            }
            .grid {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
      </main>
    </ConfigProvider>
  );
}

/* ------- Field component ------- */
function Field({ label, name, value, onChange, placeholder, error }) {
  return (
    <div className="field">
      <label className="label" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete="off"
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
