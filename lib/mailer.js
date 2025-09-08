// lib/mailer.js
import nodemailer from "nodemailer";

/**
 * Transporter singleton (dibuat sekali saat server jalan)
 */
let transporter = null;

function buildTransporter() {
  if (!process.env.SMTP_HOST) return null;

  const port = Number(process.env.SMTP_PORT || 587);
  const t = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465, // 465 = SSL, 587 = TLS (STARTTLS)
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });

  return t;
}

if (process.env.SMTP_HOST) {
  transporter = buildTransporter();
  // Optional: self-check
  transporter
    .verify()
    .then(() => console.log("[MAILER] SMTP ready:", process.env.SMTP_HOST))
    .catch((err) =>
      console.error("[MAILER] SMTP verify error:", err?.message || err)
    );
} else {
  console.warn("[MAILER] SMTP not configured. Emails will NOT be sent.");
}

/**
 * Helper generik kirim email
 */
export async function sendMail({ to, subject, html, text }) {
  if (!transporter) {
    console.warn("[MAILER] No transporter; skip sending");
    return { ok: false, skipped: true };
  }

  const from =
    process.env.MAIL_FROM || // <- ENV kamu
    process.env.SMTP_USER || // fallback
    "no-reply@localhost";

  const info = await transporter.sendMail({ from, to, subject, html, text });
  return { ok: true, info };
}

/**
 * Email tiket (dipakai di /api/tickets POST free)
 */
export async function sendTicketEmail({
  to,
  full_name,
  event,
  ticket_code,
  qr_url,
}) {
  const fmt = (d) =>
    d
      ? new Date(d).toLocaleString("id-ID", {
          dateStyle: "long",
          timeStyle: "short",
        })
      : "—";

  const subject = `Tiket ${event?.title || "Event"} — ${ticket_code}`;

  const html = `
  <div style="font-family:Inter,system-ui,Segoe UI,Roboto,Arial;line-height:1.6">
    <h2 style="margin:0 0 8px">Halo ${full_name},</h2>
    <p>Berikut tiket Anda untuk <b>${event?.title || "-"}</b>.</p>
    <ul>
      <li><b>Jadwal:</b> ${fmt(event?.start_at)} — ${fmt(event?.end_at)}</li>
      <li><b>Lokasi:</b> ${event?.location || "-"}</li>
      <li><b>Kode Tiket:</b> <code>${ticket_code}</code></li>
    </ul>
    <p>Scan QR saat check-in:</p>
    <p><img src="${qr_url}" alt="QR Ticket" style="max-width:240px"/></p>
    <p style="color:#64748b;font-size:12px">Jika tidak tampil, buka: ${qr_url}</p>
  </div>`;

  const text = `Halo ${full_name}
Tiket: ${event?.title || "-"}
Jadwal: ${fmt(event?.start_at)} — ${fmt(event?.end_at)}
Lokasi: ${event?.location || "-"}
Kode: ${ticket_code}
QR: ${qr_url}`;

  return sendMail({ to, subject, html, text });
}

/**
 * (Opsional) uji kirim cepat dari server
 */
export async function sendTestEmail(to) {
  return sendMail({
    to,
    subject: "Test SMTP • OSS CMS",
    html: "<p>SMTP OK ✅</p>",
    text: "SMTP OK",
  });
}

// Tetap export default untuk kompatibilitas lama (kalau kamu masih import default)
export default transporter;
