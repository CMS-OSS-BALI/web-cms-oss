// app/api/blast/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getPrismaClient } from "@/lib/prisma";
import { sendMail } from "@/lib/mailer";
import { readFile } from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FILE_LABEL = "app/api/blast/route.js";

/* =========================
   Auth
========================= */
async function assertAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    const err = new Error("UNAUTHORIZED");
    // Stack di sini akan menunjuk ke baris assertAdmin dipanggil
    Error.captureStackTrace?.(err, assertAdmin);
    throw err;
  }
  return session.user;
}

/* =========================
   Constants & Utils
========================= */
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

const LIMITS = {
  SUBJECT: 256,
  BODY: 200_000,
  SAFE_MAX_TO_PER_REQUEST: 500, // hard cap to prevent abuse
  DEFAULT_MAX_TO_PER_REQUEST: 200,
  DEFAULT_CONCURRENCY: 5,
  MIN_CONCURRENCY: 1,
  MAX_CONCURRENCY: 20,
};

const FOOTER_IMAGE_PATH = "/footer-email.jpg";
const FOOTER_CID = "blast-footer-img";
let footerImageCache = null; // { ok: true, attachment } | { ok: false }

// Prisma client (global utk file ini)
const db = getPrismaClient();

/**
 * Logger terpusat supaya stack trace dan origin line selalu tercatat.
 */
function logError(context, err) {
  const name = err?.name || "Error";
  const message = err?.message || String(err);
  const stack = err?.stack || "";

  // baris kedua stack biasanya "at func (file:line:col)"
  const originLine = stack.split("\n")[1]?.trim();

  console.error(`[Blast][${FILE_LABEL}] ${context} – ${name}: ${message}`);

  if (originLine) {
    console.error(`[Blast][${FILE_LABEL}] Origin: ${originLine}`);
  }

  if (stack) {
    console.error(`[Blast][${FILE_LABEL}] Stack trace:\n${stack}`);
  }

  // Extra hint ketika error-nya terkait findMany (db undefined / model undefined)
  if (/(findMany)/i.test(message)) {
    try {
      const models = db ? Object.keys(db) : [];
      console.error(
        `[Blast][${FILE_LABEL}] Prisma debug – has client: ${!!db}, models: ${models.join(
          ", "
        )}`
      );
    } catch {
      // ignore
    }
  }
}

/**
 * Pastikan Prisma client + model yang dipakai tersedia,
 * supaya kalau undefined kita lempar error yang lebih jelas
 * (bukan TypeError "Cannot read properties of undefined (reading 'findMany')").
 */
function assertDbOrThrow() {
  if (!db) {
    const err = new Error("Prisma client is undefined (db)");
    Error.captureStackTrace?.(err, assertDbOrThrow);
    throw err;
  }

  const missing = [];
  if (!db.college?.findMany) missing.push("college.findMany");

  if (missing.length) {
    const err = new Error(
      "Prisma client missing expected model methods: " + missing.join(", ")
    );
    Error.captureStackTrace?.(err, assertDbOrThrow);
    throw err;
  }

  return db;
}

function normStr(x, max = 512) {
  return (x ?? "").toString().slice(0, max);
}

function splitMaybeList(s) {
  // dukung delimiter ; , \n
  return (s || "")
    .toString()
    .split(/[;,\n]/)
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

function clampNumber(v, { min, max, fallback }) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

function normalizeAttachments(attachments) {
  if (!Array.isArray(attachments) || attachments.length === 0) return undefined;
  const norm = attachments
    .filter((a) => a && (a.content || a.path))
    .map((a) => ({
      filename: a.filename || a.name,
      content: a.content,
      path: a.path,
      encoding: a.encoding,
      contentType: a.contentType,
    }));
  return norm.length ? norm : undefined;
}

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
  const p = u.startsWith("/") ? u : `/${u}`;
  return b ? `${b}${p}` : p;
}

function buildFooterHtml({ src, cid } = {}) {
  const imgSrc = cid ? `cid:${cid}` : src ? toAbs(src) : "";
  if (!imgSrc) return "";
  return `
    <div style="margin-top:24px;text-align:center">
      <img src="${imgSrc}" alt="Footer" style="max-width:100%;height:auto;display:block;margin:0 auto" />
    </div>
  `;
}

function appendFooter(html, { cid } = {}) {
  const footer = buildFooterHtml({ cid, src: FOOTER_IMAGE_PATH });
  if (!footer) return html;
  const body = (html || "").trim();
  if (!body) return footer;

  // Sisipkan sebelum </body> jika ada, jika tidak append di akhir
  const closingTag = /<\/body>/i;
  if (closingTag.test(body)) {
    return body.replace(closingTag, `${footer}</body>`);
  }
  return `${body}\n${footer}`;
}

async function loadFooterAttachment() {
  if (footerImageCache)
    return footerImageCache.ok ? footerImageCache.attachment : null;
  try {
    const absPath = path.join(
      process.cwd(),
      "public",
      FOOTER_IMAGE_PATH.replace(/^\//, "")
    );
    const buf = await readFile(absPath);
    const attachment = {
      filename: path.basename(absPath),
      content: buf,
      cid: FOOTER_CID,
      contentType: "image/jpeg",
      contentDisposition: "inline",
    };
    footerImageCache = { ok: true, attachment };
    return attachment;
  } catch (e) {
    logError("Failed to load footer image", e);
    footerImageCache = { ok: false };
    return null;
  }
}

/* =========================
   DB fetchers
   (di-wrap dengan logging + stack yang jelas)
========================= */

async function fetchCollegeEmails(collegeIds = []) {
  if (!Array.isArray(collegeIds) || collegeIds.length === 0) return [];
  try {
    const client = assertDbOrThrow();
    const ids = collegeIds.map(String);
    const rows = await client.college.findMany({
      where: { id: { in: ids } },
      select: { id: true, email: true },
    });
    const bag = [];
    for (const r of rows) if (r?.email) bag.push(...splitMaybeList(r.email));
    return bag;
  } catch (e) {
    const err = new Error(`[fetchCollegeEmails] ${e?.message || String(e)}`);
    err.name = e?.name || "Error";
    err.stack = e?.stack || err.stack;
    logError("fetchCollegeEmails failed", err);
    throw err;
  }
}

function extractEmailsFromPartnerContact(contact) {
  const bag = [];
  let obj = contact;

  // Contact bisa string JSON atau string e-mail biasa
  if (typeof contact === "string") {
    try {
      obj = JSON.parse(contact);
    } catch {
      bag.push(contact);
    }
  }

  if (obj && typeof obj === "object") {
    if (obj.email) bag.push(...splitMaybeList(obj.email));
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

    // Fallback: ambil semua field yang mengandung "mail"
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === "string" && /mail/i.test(k)) bag.push(v);
    }
  }

  return bag;
}

async function fetchPartnerEmails(partnerIds = []) {
  if (!Array.isArray(partnerIds) || partnerIds.length === 0) return [];
  try {
    const client = db;
    const method = client?.partners?.findMany;
    if (typeof method !== "function") {
      console.warn(
        "[Blast] partners.findMany not available; skipping partner email fetch"
      );
      return [];
    }
    const ids = partnerIds.map(String);
    const rows = await method.call(client.partners, {
      where: { id: { in: ids } },
      select: { id: true, contact: true },
    });
    const bag = [];
    for (const p of rows)
      bag.push(...extractEmailsFromPartnerContact(p?.contact));
    return bag;
  } catch (e) {
    const err = new Error(`[fetchPartnerEmails] ${e?.message || String(e)}`);
    err.name = e?.name || "Error";
    err.stack = e?.stack || err.stack;
    logError("fetchPartnerEmails failed", err);
    // legacy fallback: abaikan error biar tidak memutus flow
    return [];
  }
}

async function fetchMerchantEmails(merchantIds = []) {
  if (!Array.isArray(merchantIds) || merchantIds.length === 0) return [];
  try {
    const client = db;
    // Skema baru memakai model "mitra"; nama lama "mitra_dalam_negeri" dijaga jika masih ada.
    const method =
      client?.mitra_dalam_negeri?.findMany || client?.mitra?.findMany;
    const modelCtx = client?.mitra
      ? "mitra.findMany"
      : client?.mitra_dalam_negeri
      ? "mitra_dalam_negeri.findMany"
      : null;
    if (typeof method !== "function") {
      console.warn(
        "[Blast] mitra/mitra_dalam_negeri findMany not available; skipping merchant email fetch"
      );
      return [];
    }
    const ids = merchantIds.map(String);
    const rows = await method.call(
      client.mitra ?? client.mitra_dalam_negeri,
      {
        where: { id: { in: ids } },
        select: { id: true, email: true },
      }
    );
    const bag = [];
    for (const r of rows) if (r?.email) bag.push(...splitMaybeList(r.email));
    return bag;
  } catch (e) {
    const err = new Error(`[fetchMerchantEmails] ${e?.message || String(e)}`);
    err.name = e?.name || "Error";
    err.stack = e?.stack || err.stack;
    logError("fetchMerchantEmails failed", err);
    throw err;
  }
}

/* =========================
   Streaming helper (NDJSON)
========================= */
function createNdjsonStream() {
  const ts = new TransformStream();
  const writer = ts.writable.getWriter();
  const enc = new TextEncoder();

  return {
    stream: ts.readable,
    async send(obj) {
      // Hindari throw pada stringification besar
      let line = "";
      try {
        line = JSON.stringify(obj);
      } catch {
        line = JSON.stringify({
          type: "error",
          message: "serialize-failed",
        });
      }
      await writer.write(enc.encode(line + "\n"));
    },
    async close() {
      await writer.close();
    },
  };
}

/* =========================
   Handler: POST /api/blast
========================= */
export async function POST(req) {
  try {
    // Validate DB di awal, supaya error undefined findMany ketemu lebih cepat
    try {
      assertDbOrThrow();
    } catch (e) {
      logError("DB validation at handler start failed", e);
      throw e;
    }

    await assertAdmin();

    const body = await req.json().catch(() => ({}));
    const {
      subject = "",
      html = "",
      text = "",
      attachments = [],
      emails = [],
      // baru
      collegeIds = [],
      // legacy (aktif hanya jika collegeIds kosong)
      partnerIds = [],
      // Mitra Dalam Negeri
      merchantIds = [],
      cc = [],
      bcc = [],
      dryRun = false,
      maxPerRequest = LIMITS.DEFAULT_MAX_TO_PER_REQUEST,
      concurrency = LIMITS.DEFAULT_CONCURRENCY,
    } = body || {};

    // ---- normalize inputs ----
    const safeSubject = normStr(subject, LIMITS.SUBJECT).trim();
    const safeHtml = normStr(html, LIMITS.BODY);
    const safeText = normStr(text, LIMITS.BODY);

    const maxTo =
      clampNumber(maxPerRequest, {
        min: 1,
        max: LIMITS.SAFE_MAX_TO_PER_REQUEST,
        fallback: LIMITS.DEFAULT_MAX_TO_PER_REQUEST,
      }) | 0;

    const conc =
      clampNumber(concurrency, {
        min: LIMITS.MIN_CONCURRENCY,
        max: LIMITS.MAX_CONCURRENCY,
        fallback: LIMITS.DEFAULT_CONCURRENCY,
      }) | 0;

    if (!safeSubject) {
      return NextResponse.json(
        { ok: false, error: "NO_SUBJECT" },
        { status: 400 }
      );
    }

    const hasContent =
      Boolean(safeHtml) ||
      Boolean(safeText) ||
      (Array.isArray(attachments) && attachments.length > 0);

    if (!hasContent) {
      return NextResponse.json(
        { ok: false, error: "NO_CONTENT" },
        { status: 400 }
      );
    }

    // ---- collect recipients from DB ----
    // Prioritas baru: colleges; jika kosong, fallback ke partners (legacy).
    const [collegeEmails, partnerEmails, merchantEmails] = await (async () => {
      if (Array.isArray(collegeIds) && collegeIds.length) {
        const ce = await fetchCollegeEmails(collegeIds);
        const me = await fetchMerchantEmails(merchantIds);
        return [ce, [], me];
      }
      // legacy path
      const pe = await fetchPartnerEmails(partnerIds);
      const me = await fetchMerchantEmails(merchantIds);
      return [[], pe, me];
    })();

    // ---- merge + dedup ----
    const toList = dedupValidEmails([
      ...(Array.isArray(emails) ? emails : []),
      ...collegeEmails,
      ...partnerEmails,
      ...merchantEmails,
    ]);

    const ccList = dedupValidEmails(cc);
    const bccList = dedupValidEmails(bcc);

    if (!toList.length) {
      return NextResponse.json(
        { ok: false, error: "NO_RECIPIENTS" },
        { status: 400 }
      );
    }

    if (toList.length > maxTo) {
      return NextResponse.json(
        { ok: false, error: "TOO_MANY", count: toList.length, limit: maxTo },
        { status: 413 }
      );
    }

    // ---- dry run preview ----
    if (dryRun) {
      return NextResponse.json({
        ok: true,
        count: toList.length,
        recipients: toList,
        sources: {
          colleges: collegeEmails,
          partners: partnerEmails, // legacy
          merchants: merchantEmails,
          mitraDalamNegeri: merchantEmails, // alias
          manual: Array.isArray(emails) ? emails : [],
        },
      });
    }

    // ---- prepare once (avoid per-email recompute) ----
    const normalizedAttachments = normalizeAttachments(attachments);
    const footerAttachment = await loadFooterAttachment();
    const htmlWithFooter = appendFooter(
      safeHtml,
      footerAttachment ? { cid: FOOTER_CID } : {}
    );

    const finalAttachments = [];
    if (normalizedAttachments) finalAttachments.push(...normalizedAttachments);
    if (footerAttachment) finalAttachments.push(footerAttachment);

    const ccHeader = ccList.length ? ccList.join(", ") : undefined;
    const bccHeader = bccList.length ? bccList.join(", ") : undefined;

    const { stream, send, close } = createNdjsonStream();

    (async () => {
      try {
        await send({
          type: "start",
          total: toList.length,
          concurrency: conc,
        });

        let sent = 0;
        let failed = 0;

        // Batch by concurrency
        for (let i = 0; i < toList.length; i += conc) {
          const chunk = toList.slice(i, i + conc);

          const results = await Promise.allSettled(
            chunk.map((to) =>
              sendMail({
                to,
                subject: safeSubject,
                html: htmlWithFooter || undefined,
                text: safeText || undefined,
                attachments: finalAttachments.length
                  ? finalAttachments
                  : undefined,
                cc: ccHeader,
                bcc: bccHeader,
              })
            )
          );

          for (let j = 0; j < results.length; j++) {
            const to = chunk[j];
            const r = results[j];
            if (r.status === "fulfilled") {
              sent++;
              await send({ type: "progress", to, ok: true });
            } else {
              failed++;
              const errMsg = (r.reason?.message || "send-failed").slice(0, 512);
              await send({
                type: "progress",
                to,
                ok: false,
                error: errMsg,
              });
              // juga log ke server
              logError(
                "sendMail failed for recipient",
                r.reason || new Error(errMsg)
              );
            }
          }
        }

        await send({ type: "done", sent, failed, total: toList.length });
      } catch (err) {
        logError("blast streaming loop failed", err);
        await send({
          type: "error",
          message: err?.message || String(err),
        });
      } finally {
        await close();
      }
    })();

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    logError("POST /api/blast failed", e);
    const msg = e?.message || String(e);
    const status = msg === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
