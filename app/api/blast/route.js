// app/api/blast/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // sesuaikan
import prisma from "@/lib/prisma"; // sesuaikan
import { sendMail } from "@/lib/mailer"; // sesuaikan

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ---------- Auth ---------- */
async function assertAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");
  return session.user;
}

/* ---------- Utils ---------- */
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

function normStr(x, max = 512) {
  return (x ?? "").toString().slice(0, max);
}
function splitMaybeList(s) {
  return (s || "")
    .toString()
    .split(/[;,]/)
    .map((v) => v.trim())
    .filter(Boolean);
}
function dedupValidEmails(arr = []) {
  const out = new Set();
  for (const raw of arr) {
    if (!raw) continue;
    const s = String(raw).trim();
    const found = s.match(EMAIL_RE) || [];
    for (const m of found) out.add(m.toLowerCase());
  }
  return Array.from(out);
}
/** Ambil email dari JSON partners.contact (string/array/kumpulan) */
function extractEmailsFromPartnerContact(contact) {
  if (!contact) return [];
  let obj = contact;
  if (typeof contact === "string") {
    try {
      obj = JSON.parse(contact);
    } catch {
      return dedupValidEmails([contact]);
    }
  }
  const bag = [];
  if (obj.email)
    bag.push(
      ...(Array.isArray(obj.email) ? obj.email : splitMaybeList(obj.email))
    );
  if (obj.emails)
    bag.push(
      ...(Array.isArray(obj.emails) ? obj.emails : splitMaybeList(obj.emails))
    );
  if (obj.primary_email) bag.push(obj.primary_email);
  if (Array.isArray(obj.contacts)) {
    for (const c of obj.contacts) {
      if (c?.email) bag.push(c.email);
      if (c?.emails)
        bag.push(
          ...(Array.isArray(c.emails) ? c.emails : splitMaybeList(c.emails))
        );
    }
  }
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "string" && /mail/i.test(k)) bag.push(v);
  }
  return dedupValidEmails(bag);
}

/* ---------- Streaming helper (NDJSON) ---------- */
function createNdjsonStream() {
  const ts = new TransformStream();
  const writer = ts.writable.getWriter();
  const enc = new TextEncoder();
  return {
    stream: ts.readable,
    async send(obj) {
      await writer.write(enc.encode(JSON.stringify(obj) + "\n"));
    },
    async close() {
      await writer.close();
    },
  };
}

/* ---------- Handler: POST /api/blast (streaming progress) ---------- */
export async function POST(req) {
  try {
    await assertAdmin();
    const body = await req.json().catch(() => ({}));

    const {
      subject = "",
      html = "",
      text = "",
      attachments = [],
      emails = [], // manual (opsional)
      partnerIds = [], // array id partner (varchar(36))
      merchantIds = [], // array id merchant (varchar(36))
      cc = [],
      bcc = [],
      dryRun = false,
      maxPerRequest = 200,
      concurrency = 5, // kirim paralel 5 per batch
    } = body || {};

    const safeSubject = normStr(subject, 256);
    const safeHtml = normStr(html, 200_000);
    const safeText = normStr(text, 200_000);
    if (!safeSubject)
      return NextResponse.json(
        { ok: false, error: "NO_SUBJECT" },
        { status: 400 }
      );
    if (!safeHtml && !safeText && !(Array.isArray(attachments) && attachments.length))
      return NextResponse.json(
        { ok: false, error: "NO_CONTENT" },
        { status: 400 }
      );

    // Kumpulkan email partner
    let partnerEmails = [];
    if (Array.isArray(partnerIds) && partnerIds.length) {
      const partners = await prisma.partners.findMany({
        where: { id: { in: partnerIds.map(String) } },
        select: { id: true, contact: true },
      });
      for (const p of partners) {
        partnerEmails.push(...extractEmailsFromPartnerContact(p?.contact));
      }
    }
    // Kumpulkan email Mitra Dalam Negeri
    let merchantEmails = [];
    if (Array.isArray(merchantIds) && merchantIds.length) {
      const mitraList = await prisma.mitra_dalam_negeri.findMany({
        where: { id: { in: merchantIds.map(String) } },
        select: { id: true, email: true },
      });
      for (const m of mitraList) {
        if (m?.email) merchantEmails.push(...splitMaybeList(m.email));
      }
    }

    // Gabungkan + dedup + validasi
    const toList = dedupValidEmails([
      ...(emails || []),
      ...partnerEmails,
      ...merchantEmails,
    ]);
    const ccList = dedupValidEmails(cc);
    const bccList = dedupValidEmails(bcc);

    if (!toList.length)
      return NextResponse.json(
        { ok: false, error: "NO_RECIPIENTS" },
        { status: 400 }
      );
    if (toList.length > maxPerRequest) {
      return NextResponse.json(
        { ok: false, error: "TOO_MANY", count: toList.length },
        { status: 413 }
      );
    }

    // Jika preview (dry run), kembalikan ringkasannya sebagai JSON biasa
    if (dryRun) {
      return NextResponse.json({
        ok: true,
        count: toList.length,
        recipients: toList,
        sources: {
          partners: partnerEmails,
          merchants: merchantEmails,
          mitraDalamNegeri: merchantEmails,
          manual: Array.isArray(emails) ? emails : [],
        },
      });
    }

    // Siapkan stream
    const { stream, send, close } = createNdjsonStream();

    // Mulai kirim stream response duluan (biar frontend bisa tampil progress)
    (async () => {
      try {
        await send({ type: "start", total: toList.length });

        let sent = 0,
          failed = 0;
        // proses dalam kelompok berkonkurensi
        for (let i = 0; i < toList.length; i += concurrency) {
          const chunk = toList.slice(i, i + concurrency);
          const results = await Promise.allSettled(
            chunk.map((to) => {
              const atts = Array.isArray(attachments)
                ? attachments
                    .filter((a) => a && (a.content || a.path))
                    .map((a) => ({
                      filename: a.filename || a.name,
                      content: a.content,
                      path: a.path,
                      encoding: a.encoding,
                      contentType: a.contentType,
                    }))
                : undefined;
              return sendMail({
                to,
                subject: safeSubject,
                html: safeHtml || undefined,
                text: safeText || undefined,
                attachments: atts,
                cc: ccList.length ? ccList.join(", ") : undefined,
                bcc: bccList.length ? bccList.join(", ") : undefined,
              });
            })
          );
          for (let j = 0; j < results.length; j++) {
            const to = chunk[j];
            const r = results[j];
            if (r.status === "fulfilled") {
              sent++;
              await send({ type: "progress", to, ok: true });
            } else {
              failed++;
              await send({
                type: "progress",
                to,
                ok: false,
                error: (r.reason?.message || "send-failed").slice(0, 512),
              });
            }
          }
        }

        await send({ type: "done", sent, failed, total: toList.length });
      } catch (err) {
        await send({ type: "error", message: err?.message || String(err) });
      } finally {
        await close();
      }
    })();

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no", // Nginx/proxy jangan buffer
      },
    });
  } catch (e) {
    const msg = e?.message || String(e);
    const status = msg === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}

