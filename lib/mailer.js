// lib/mailer.js
import nodemailer from "nodemailer";
import QRCode from "qrcode";
import Jimp from "jimp";

/* Transporter */
let transporter = null;
function buildTransporter() {
  if (!process.env.SMTP_HOST) return null;
  const port = Number(process.env.SMTP_PORT || 587);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
}
if (process.env.SMTP_HOST) {
  transporter = buildTransporter();
  transporter
    .verify()
    .then(() => console.log("[MAILER] SMTP ready:", process.env.SMTP_HOST))
    .catch((err) =>
      console.error("[MAILER] SMTP verify error:", err?.message || err)
    );
} else {
  console.warn("[MAILER] SMTP not configured. Emails will NOT be sent.");
}

/* Helper kirim */
export async function sendMail({
  to,
  subject,
  html,
  text,
  headers,
  attachments,
}) {
  if (!transporter) return { ok: false, skipped: true };
  const from =
    process.env.MAIL_FROM || process.env.SMTP_USER || "no-reply@localhost";
  const info = await transporter.sendMail({
    from,
    to,
    subject,
    html,
    text,
    headers,
    attachments,
  });
  return { ok: true, info };
}

const TEMPLATE_VERSION = "TICKET_V3_QR_WITH_LOGO";

/* URL helper (buat fallback link QR / ICS) */
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

/* Kirim e-ticket (tanpa logo) */
async function generateQrWithLogo(code, logoPathOrUrl) {
  const size = 512;
  const qrPng = await QRCode.toBuffer(code, {
    width: size,
    errorCorrectionLevel: "H", // lebih tahan saat ada logo
    margin: 2,
  });

  const qr = await Jimp.read(qrPng);

  // Tentukan sumber logo: wajib logo.jpg
  let logo;
  try {
    logo = await Jimp.read(logoPathOrUrl);
  } catch {
    logo = await Jimp.read(`${process.cwd()}/public/images/logo.jpg`);
  }

  // Ukuran logo ~18% dari QR (sedikit lebih besar)
  const logoTarget = Math.round(size * 0.18);
  logo.resize(logoTarget, Jimp.AUTO);

  // Buat latar putih (excavate) di tengah agar pattern tetap terbaca
  const pad = Math.round(logoTarget * 0.22);
  const bgW = logo.getWidth() + pad;
  const bgH = logo.getHeight() + pad;
  const bg = new Jimp(bgW, bgH, 0xffffffff);

  const cx = Math.round((qr.getWidth() - bgW) / 2);
  const cy = Math.round((qr.getHeight() - bgH) / 2);
  qr.composite(bg, cx, cy);

  // Tempel logo di atas background
  const lx = Math.round((qr.getWidth() - logo.getWidth()) / 2);
  const ly = Math.round((qr.getHeight() - logo.getHeight()) / 2);
  qr.composite(logo, lx, ly);

  return await qr.getBufferAsync(Jimp.MIME_PNG);
}

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
  // Pakai logo.jpg untuk QR overlay (tanpa fallback lain)
  const qrLogoPath = "/images/logo.jpg";
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
  const headerLogo = toAbs(logo_url || "/images/logo.jpg");

  const tz = event.timezone || "Asia/Makassar";
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
  <div style="background:#f5f7fb;padding:24px 0;font-family:Inter,system-ui,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a">
    <span style="display:none;opacity:0;height:0;width:0">${preheader}</span>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse">
      <tr><td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background:#fff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden">
          <tr><td style="padding:24px 24px 12px;text-align:center">
            ${headerLogo ? `<img src="${headerLogo}" alt="Logo" style="max-height:80px;width:auto;display:inline-block;margin-bottom:12px" />` : ""}
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
              <img src="cid:${qrCid}" alt="QR Ticket" style="max-width:220px;border-radius:10px;border:1px solid #e2e8f0" />
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

/* Test */
export async function sendTestEmail(to) {
  return sendMail({
    to,
    subject: `Test SMTP • ${TEMPLATE_VERSION}`,
    html: `<p>SMTP OK ✅ — ${TEMPLATE_VERSION}</p>`,
    text: `SMTP OK — ${TEMPLATE_VERSION}`,
    headers: { "X-Template-Version": TEMPLATE_VERSION },
  });
}

export default transporter;
