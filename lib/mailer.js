// lib/mailer.js
import nodemailer from "nodemailer";
import QRCode from "qrcode";
import Jimp from "jimp";

/* =========================================================
   Transporter (lazy + pooled + reusable)
========================================================= */
let _transporter = null;

function buildTransporter() {
  if (!process.env.SMTP_HOST) return null;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = port === 465;

  const usePool = String(process.env.SMTP_POOL ?? "true") !== "false";
  const maxConnections = Number(process.env.SMTP_MAX_CONNECTIONS || 5);
  const maxMessages = Number(process.env.SMTP_MAX_MESSAGES || 1000);
  const rateDelta = Number(process.env.SMTP_RATE_WINDOW_MS || 1000); // ms
  const rateLimit = Number(process.env.SMTP_RATE_LIMIT || 10); // msgs per window
  const logger =
    (process.env.SMTP_DEBUG === "1" || process.env.SMTP_DEBUG === "true") &&
    process.env.NODE_ENV !== "production";

  /** Optional DKIM (isi env di .env bila ada) */
  const dkim =
    process.env.DKIM_DOMAIN &&
    process.env.DKIM_SELECTOR &&
    (process.env.DKIM_PRIVATE_KEY || process.env.DKIM_KEY)
      ? {
          domainName: process.env.DKIM_DOMAIN,
          keySelector: process.env.DKIM_SELECTOR,
          privateKey: process.env.DKIM_PRIVATE_KEY || process.env.DKIM_KEY,
        }
      : undefined;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
    pool: usePool,
    maxConnections,
    maxMessages,
    // Rate control (hindari throttle provider)
    rateDelta,
    rateLimit,
    // Biarkan koneksi hidup selama proses masih warm
    keepAlive: true,
    // TLS modern
    tls: { ciphers: "TLSv1.2" },
    // Debugging nodemailer (non-prod)
    logger,
    dkim,
  });

  // Verify non-blocking (biar gak tambah cold-start)
  transporter
    .verify()
    .then(() =>
      console.log(
        `[MAILER] SMTP ready (pool=${usePool}, conn=${maxConnections}, rate=${rateLimit}/${rateDelta}ms) @ ${host}:${port}`
      )
    )
    .catch((err) =>
      console.error("[MAILER] SMTP verify error:", err?.message || err)
    );

  return transporter;
}

export function getTransporter() {
  if (_transporter) return _transporter;
  _transporter = buildTransporter();
  return _transporter;
}

/* =========================================================
   Core sender helper
========================================================= */
function buildFromHeader() {
  // Prioritas pengirim
  const fromEmail =
    process.env.FROM_EMAIL ||
    process.env.MAIL_FROM ||
    process.env.SMTP_USER ||
    "no-reply@localhost";

  const brandName = process.env.MAIL_BRAND || process.env.APP_NAME || "";
  return brandName ? `${brandName} <${fromEmail}>` : fromEmail;
}

export async function sendMail({
  to,
  subject,
  html,
  text,
  headers,
  attachments,
  cc, // NEW
  bcc, // NEW
  replyTo, // NEW
  priority, // NEW: 'high' | 'normal' | 'low'
}) {
  const transporter = getTransporter();
  if (!transporter) return { ok: false, skipped: true };

  const from = buildFromHeader();

  // Optional default headers untuk deliverability
  const baseHeaders = {
    "X-Mailer": "OSS-CMS Mailer",
    ...headers,
  };

  // Optional Unsubscribe header (isi env kalau punya URL)
  if (process.env.MAIL_UNSUBSCRIBE_URL) {
    baseHeaders["List-Unsubscribe"] = `<${process.env.MAIL_UNSUBSCRIBE_URL}>`;
  }

  const info = await transporter.sendMail({
    from,
    to,
    cc,
    bcc,
    replyTo,
    subject,
    html,
    text,
    headers: baseHeaders,
    attachments,
    priority,
  });

  return { ok: true, info };
}

/* =========================================================
   Utilities (URL helpers)
========================================================= */
const TEMPLATE_VERSION = "TICKET_V3_QR_WITH_LOGO";
const CERT_TEMPLATE_VERSION = "CERT_V1_FRONT_ONLY";

function baseUrl() {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.NEXTAUTH_URL ||
    "";
  const trimmed = raw.replace(/\/+$/, "");
  return trimmed.startsWith("https://")
    ? trimmed
    : trimmed.replace(/^http:\/\//i, "https://");
}
function toAbs(u) {
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  const b = baseUrl();
  return b ? `${b}${u.startsWith("/") ? u : `/${u}`}` : "";
}

/* =========================================================
   QR with center logo (untuk e-ticket)
========================================================= */
async function generateQrWithLogo(code, logoPathOrUrl) {
  const size = 512;
  const qrPng = await QRCode.toBuffer(code, {
    width: size,
    errorCorrectionLevel: "H",
    margin: 2,
  });

  const qr = await Jimp.read(qrPng);

  // Sumber logo: coba path/url yang diberikan, fallback ke /public/images/loading.png
  let logo;
  try {
    logo = await Jimp.read(logoPathOrUrl);
  } catch {
    logo = await Jimp.read(`${process.cwd()}/public/images/loading.png`);
  }

  // Ukuran logo ~18% dari QR
  const logoTarget = Math.round(size * 0.18);
  logo.resize(logoTarget, Jimp.AUTO);

  // Latar putih di tengah
  const pad = Math.round(logoTarget * 0.22);
  const bgW = logo.getWidth() + pad;
  const bgH = logo.getHeight() + pad;
  const bg = new Jimp(bgW, bgH, 0xffffffff);

  const cx = Math.round((qr.getWidth() - bgW) / 2);
  const cy = Math.round((qr.getHeight() - bgH) / 2);
  qr.composite(bg, cx, cy);

  // Tempel logo
  const lx = Math.round((qr.getWidth() - logo.getWidth()) / 2);
  const ly = Math.round((qr.getHeight() - logo.getHeight()) / 2);
  qr.composite(logo, lx, ly);

  return await qr.getBufferAsync(Jimp.MIME_PNG);
}

/* =========================================================
   Kirim E-Ticket (QR inline CID)
========================================================= */
export async function sendTicketEmail({
  to,
  full_name,
  event = {},
  ticket_code,
  qr_url,
  ics_url,
  is_paid,
  support_email,
  breakGmailThread = false,
  logo_url, // opsional: URL/relative path untuk logo header
}) {
  const qrCid = "qrimg";
  const qrLogoPath = "/images/loading.png"; // logo di tengah QR
  const qrPng = await generateQrWithLogo(ticket_code, qrLogoPath);
  const attachments = [
    {
      filename: "qr.png",
      content: qrPng,
      cid: qrCid,
      contentType: "image/png",
      contentDisposition: "inline",
      headers: { "X-Attachment-Id": qrCid },
    },
  ];
  const headerLogo = toAbs(logo_url || "/images/loading.png");

  const tz = event.timezone || "Asia/Jakarta";
  const fmt = (d, withDay = true) =>
    d
      ? new Date(d).toLocaleString("id-ID", {
          timeZone: tz,
          dateStyle: withDay ? "full" : "long",
          timeStyle: "short",
        })
      : "—";

  let subject = `[E-Ticket] ${event?.title || "Event"} — ${ticket_code}`;
  if (breakGmailThread) subject += ` • ${Date.now()}`;

  const preheader =
    `E-ticket untuk ${event?.title || "acara"} • Kode ${ticket_code} • ` +
    `Jadwal ${fmt(event?.start_at)} — ${fmt(event?.end_at)}.`;
  const payLine =
    typeof is_paid === "boolean"
      ? `<li><b>Status Pembayaran:</b> ${
          is_paid ? "Lunas" : "Belum Lunas"
        }</li>`
      : "";
  const organizer = event.organizer || "Panitia Penyelenggara";
  const hotline = support_email
    ? `<div style="margin-top:4px">Butuh bantuan? Email <a href="mailto:${support_email}">${support_email}</a></div>`
    : "";

  const html = `
  <div style="background:#f5f7fb;padding:24px 0;font-family:'Public Sans',system-ui,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a">
    <span style="display:none;opacity:0;height:0;width:0">${preheader}</span>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse">
      <tr><td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background:#fff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden">
          <tr><td style="padding:24px 24px 12px;text-align:center">
            ${
              headerLogo
                ? `<img src="${headerLogo}" alt="Logo" title="Logo" style="max-height:80px;width:auto;display:inline-block;margin-bottom:12px" />`
                : ""
            }
            <h1 style="margin:0 0 4px;font-size:20px;line-height:1.2">E-Ticket — ${
              event?.title || "Event"
            }</h1>
            <div style="color:#64748b;font-size:13px">${organizer}</div>
          </td></tr>

          <tr><td style="padding:0 24px 4px">
            <p style="margin:0 0 8px">Halo <b>${full_name}</b>,</p>
            <p style="margin:0 0 12px">Berikut adalah tiket Anda untuk <b>${
              event?.title || "-"
            }</b>. Tunjukkan QR ini saat check-in.</p>
            <ul style="padding-left:18px;margin:0 0 8px;line-height:1.7">
              <li><b>Jadwal:</b> ${fmt(event?.start_at)} — ${fmt(
    event?.end_at
  )}</li>
              ${
                event?.location
                  ? `<li><b>Lokasi:</b> ${event.location}</li>`
                  : ""
              }
              ${payLine}
              <li><b>Kode Tiket:</b> <code style="background:#f1f5f9;padding:2px 6px;border-radius:6px">${ticket_code}</code></li>
            </ul>

            <div style="text-align:center;margin:18px 0 8px">
              <img src="cid:${qrCid}" alt="QR Ticket" title="QR Ticket" style="max-width:220px;border-radius:10px;border:1px solid #e2e8f0" />
              <div style="margin-top:6px;color:#475569;font-size:12px">Tunjukkan QR ini saat proses registrasi/masuk venue.</div>
              ${
                qr_url
                  ? `<div style="margin-top:6px;color:#64748b;font-size:12px;word-break:break-all">Jika gambar tidak tampil, buka: ${toAbs(
                      qr_url
                    )}</div>`
                  : ""
              }
            </div>

            ${
              ics_url
                ? `<div style="text-align:center;margin:18px 0 6px">
                    <a href="${toAbs(
                      ics_url
                    )}" target="_blank" rel="noopener" style="display:inline-block;padding:12px 16px;border-radius:10px;background:#0ea5e9;color:#fff;text-decoration:none">Tambahkan ke Kalender</a>
                  </div>`
                : ""
            }
            ${hotline}
          </td></tr>

          <tr><td style="padding:18px 24px;background:#f8fafc;color:#64748b;font-size:12px;text-align:center">
            © ${new Date().getFullYear()} ${organizer}. Semua hak dilindungi.
          </td></tr>
        </table>
      </td></tr>
    </table>
  </div>`;

  const text = [
    `Halo ${full_name},`,
    ``,
    `E-ticket untuk "${event?.title || "-"}".`,
    `Jadwal  : ${fmt(event?.start_at)} — ${fmt(event?.end_at)}`,
    event?.location ? `Lokasi  : ${event.location}` : null,
    typeof is_paid === "boolean"
      ? `Pembayaran: ${is_paid ? "Lunas" : "Belum Lunas"}`
      : null,
    `Kode    : ${ticket_code}`,
    qr_url ? `QR      : ${toAbs(qr_url)}` : null,
    `Template: ${TEMPLATE_VERSION}`,
  ]
    .filter(Boolean)
    .join("\n");

  const headers = {
    "X-Template-Version": TEMPLATE_VERSION,
    "X-Entity-Ref-ID": ticket_code,
  };

  return sendMail({ to, subject, html, text, headers, attachments });
}

/* =========================================================
   Kirim Sertifikat (PDF attachment, 1 halaman)
========================================================= */
export async function sendCertificateEmail({
  to,
  full_name,
  event_title = "Event",
  no_certificate, // string nomor sertifikat
  pdfBuffer, // Buffer PDF hasil generateCertificateFront
  filename, // opsional: nama file PDF
  support_email, // opsional
  breakGmailThread = false,
  logo_url, // opsional: URL/path logo header
}) {
  if (!pdfBuffer || !(pdfBuffer instanceof Buffer)) {
    return { ok: false, error: "pdfBuffer is required (Buffer)" };
  }

  let subject = `[Certificate] ${event_title} — ${no_certificate}`;
  if (breakGmailThread) subject += ` • ${Date.now()}`;

  const preheader = `Sertifikat kehadiran — ${event_title} • No ${no_certificate}`;
  const headerLogo = toAbs(logo_url || "/images/loading.png");

  const hotline = support_email
    ? `<div style="margin-top:4px">Butuh bantuan? Email <a href="mailto:${support_email}">${support_email}</a></div>`
    : "";

  const html = `
  <div style="background:#f5f7fb;padding:24px 0;font-family:'Public Sans',system-ui,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a">
    <span style="display:none;opacity:0;height:0;width:0">${preheader}</span>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse">
      <tr><td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background:#fff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden">
          <tr><td style="padding:24px 24px 12px;text-align:center">
            ${
              headerLogo
                ? `<img src="${headerLogo}" alt="Logo" title="Logo" style="max-height:80px;width:auto;display:inline-block;margin-bottom:12px" />`
                : ""
            }
            <h1 style="margin:0 0 4px;font-size:20px;line-height:1.2">Sertifikat Kehadiran</h1>
            <div style="color:#64748b;font-size:13px">${event_title}</div>
          </td></tr>

          <tr><td style="padding:0 24px 12px">
            <p style="margin:0 0 8px">Halo <b>${full_name || "Peserta"}</b>,</p>
            <p style="margin:0 0 12px">Terima kasih telah menghadiri <b>${event_title}</b>. Sertifikat kehadiran Anda terlampir pada email ini.</p>
            <ul style="padding-left:18px;margin:0 0 8px;line-height:1.7">
              <li><b>No Sertifikat:</b> ${no_certificate}</li>
            </ul>
            ${hotline}
          </td></tr>

          <tr><td style="padding:18px 24px;background:#f8fafc;color:#64748b;font-size:12px;text-align:center">
            © ${new Date().getFullYear()} Panitia Penyelenggara. Semua hak dilindungi.
          </td></tr>
        </table>
      </td></tr>
    </table>
  </div>`;

  const text = [
    `Halo ${full_name || "Peserta"},`,
    ``,
    `Berikut sertifikat kehadiran Anda untuk "${event_title}".`,
    `No Sertifikat: ${no_certificate}`,
    `Template: ${CERT_TEMPLATE_VERSION}`,
  ].join("\n");

  const headers = {
    "X-Template-Version": CERT_TEMPLATE_VERSION,
    "X-Entity-Ref-ID": no_certificate,
  };

  const attachments = [
    {
      filename:
        filename ||
        `Sertifikat-${String(full_name || "Peserta")
          .replace(/[^\w\d-]+/g, "_")
          .slice(0, 64)}.pdf`,
      content: pdfBuffer,
      contentType: "application/pdf",
    },
  ];

  return sendMail({ to, subject, html, text, headers, attachments });
}

/* =========================================================
   Kirim Invoice Booking Booth
========================================================= */
export async function sendBoothInvoiceEmail({
  to,
  order_id,
  amount,
  status = "PAID", // PAID | PENDING | FAILED
  paid_at = new Date(),
  channel, // payment_type dari Midtrans
  event = {}, // { title, location, start_at, end_at, timezone, organizer }
  support_email,
}) {
  if (!to) return { ok: false, skipped: true };

  const fmtIDR = (n) =>
    typeof n === "number"
      ? n.toLocaleString("id-ID", { style: "currency", currency: "IDR" })
      : "IDR —";
  const fmt = (d) =>
    d
      ? new Date(d).toLocaleString("id-ID", {
          timeZone: event.timezone || "Asia/Jakarta",
          dateStyle: "long",
          timeStyle: "medium",
        })
      : "—";

  const subject = `[Invoice] ${event.title || "Booth Booking"} — ${order_id}`;
  const statusBadge =
    status === "PAID"
      ? `<span style="background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;padding:4px 8px;border-radius:999px;font-weight:700">Success</span>`
      : status === "FAILED"
      ? `<span style="background:#fef2f2;color:#991b1b;border:1px solid #fecaca;padding:4px 8px;border-radius:999px;font-weight:700">Failed</span>`
      : `<span style="background:#fff7ed;color:#9a3412;border:1px solid #fed7aa;padding:4px 8px;border-radius:999px;font-weight:700">Pending</span>`;

  const html = `
  <div style="background:#f5f7fb;padding:24px 0;font-family:'Public Sans',system-ui,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse">
      <tr><td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background:#fff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden">
          <tr><td style="padding:20px 24px">
            <h1 style="margin:0 0 6px;font-size:20px;line-height:1.2;color:#0b56c9">Invoice — ${
              event.title || "Booth Booking"
            }</h1>
            <div style="color:#64748b;font-size:13px">${
              event.location || ""
            }</div>
          </td></tr>

          <tr><td style="padding:0 24px 8px">
            <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse">
              <tr>
                <td style="padding:10px 0;color:#5a77a6;width:160px">Ref Number</td>
                <td style="padding:10px 0;font-weight:700">${order_id}</td>
              </tr>
              <tr style="border-top:1px solid #eef2ff">
                <td style="padding:10px 0;color:#5a77a6">Payment Status</td>
                <td style="padding:10px 0;font-weight:700">${statusBadge}</td>
              </tr>
              <tr style="border-top:1px solid #eef2ff">
                <td style="padding:10px 0;color:#5a77a6">Payment Time</td>
                <td style="padding:10px 0;font-weight:700">${fmt(paid_at)}</td>
              </tr>
              <tr style="border-top:1px solid #eef2ff">
                <td style="padding:10px 0;color:#5a77a6">Channel</td>
                <td style="padding:10px 0;font-weight:700">${
                  channel || "-"
                }</td>
              </tr>
              <tr style="border-top:1px solid #eef2ff;background:#f8fbff">
                <td style="padding:12px 0;color:#5a77a6">Total Payment</td>
                <td style="padding:12px 0;font-weight:900;font-size:16px">${fmtIDR(
                  amount || 0
                )}</td>
              </tr>
            </table>
            ${
              support_email
                ? `<div style="margin-top:10px;color:#64748b;font-size:12px">Butuh bantuan? Email <a href="mailto:${support_email}">${support_email}</a></div>`
                : ""
            }
          </td></tr>

          <tr><td style="padding:16px 24px;background:#f8fafc;color:#64748b;font-size:12px;text-align:center">
            © ${new Date().getFullYear()} ${
    event.organizer || "Panitia"
  }. Semua hak dilindungi.
          </td></tr>
        </table>
      </td></tr>
    </table>
  </div>`;

  const headers = {
    "X-Template-Version": "INVOICE_V1",
    "X-Entity-Ref-ID": order_id,
  };

  return sendMail({
    to,
    subject,
    html,
    text: `Invoice ${
      event.title || "Booth Booking"
    }\nRef: ${order_id}\nStatus: ${status}\nWaktu: ${fmt(
      paid_at
    )}\nTotal: ${fmtIDR(amount || 0)}`,
    headers,
  });
}

/* =========================================================
   Test helper
========================================================= */
export async function sendTestEmail(to) {
  return sendMail({
    to,
    subject: `Test SMTP • ${TEMPLATE_VERSION}`,
    html: `<p>SMTP OK ✅ — ${TEMPLATE_VERSION}</p>`,
    text: `SMTP OK — ${TEMPLATE_VERSION}`,
    headers: { "X-Template-Version": TEMPLATE_VERSION },
  });
}

export default getTransporter();
