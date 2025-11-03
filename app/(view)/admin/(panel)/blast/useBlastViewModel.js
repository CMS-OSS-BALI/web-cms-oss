"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/* =========================
   Small utils & constants
========================= */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

const LIMITS = {
  SUBJECT: 256,
  BODY: 200_000,
  SAFE_MAX_TO_PER_REQUEST: 500,
  DEFAULT_MAX_TO_PER_REQUEST: 200,
  DEFAULT_CONCURRENCY: 5,
  MIN_CONCURRENCY: 1,
  MAX_CONCURRENCY: 20,
};

function clamp(n, min, max) {
  const v = Number(n);
  if (!Number.isFinite(v)) return min;
  return Math.min(Math.max(v, min), max);
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

function splitMaybeList(s) {
  // dukung ; , \n spasi
  return (s || "")
    .toString()
    .split(/[;,\n\s]+/)
    .map((v) => v.trim())
    .filter(Boolean);
}

function stripHtmlToText(html = "") {
  const withoutTags = String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  // decode entity minimal
  return withoutTags
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, LIMITS.BODY);
}

/* ===== Option mappers ===== */
function mapCollege(c) {
  const name = c?.name || "(Tanpa Nama)";
  const country = c?.country ? ` • ${c.country}` : "";
  return { label: `${name}${country}`, value: String(c.id) };
}
function mapMitra(m) {
  // GET /api/mitra-dalam-negeri -> { merchant_name, email, ... }
  const name = m?.merchant_name || "(Mitra)";
  const city = m?.city ? ` • ${m.city}` : "";
  return { label: `${name}${city}`, value: String(m.id) };
}

/* ===== helpers ===== */
function debounce(fn, wait = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

/* =========================
   ViewModel Hook
========================= */
export default function useBlastViewModel() {
  // ---------- form fields ----------
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");

  // optional single attachment
  const [attachment, setAttachment] = useState(null); // { name, type, size, base64 }
  const [attachmentFileList, setAttachmentFileList] = useState([]);

  // recipients selections
  const [collegeIds, setCollegeIds] = useState([]);
  const [mitraIds, setMitraIds] = useState([]);

  // manual recipients + headers
  const [manualEmails, setManualEmails] = useState(""); // textarea raw input
  const [cc, setCc] = useState(""); // raw string, comma/semicolon/newline separated
  const [bcc, setBcc] = useState("");

  // delivery tuning
  const [concurrency, setConcurrency] = useState(LIMITS.DEFAULT_CONCURRENCY);
  const [maxPerRequest, setMaxPerRequest] = useState(
    LIMITS.DEFAULT_MAX_TO_PER_REQUEST
  );

  // ---------- UI state ----------
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);

  // lookups/options
  const [collegeOptions, setCollegeOptions] = useState([]);
  const [mitraOptions, setMitraOptions] = useState([]);
  const [loadingColleges, setLoadingColleges] = useState(false);
  const [loadingMitras, setLoadingMitras] = useState(false);

  // sending/streaming
  const [sending, setSending] = useState(false);
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);

  // refs for abort / lifecycle guards
  const abortRef = useRef(null);
  const aliveRef = useRef(true);
  const collegeFetchAbort = useRef(null);
  const mitraFetchAbort = useRef(null);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      try {
        abortRef.current?.abort();
        collegeFetchAbort.current?.abort();
        mitraFetchAbort.current?.abort();
      } catch {}
    };
  }, []);

  // ---------- derived flags ----------
  const hasContent = useMemo(() => {
    return html.trim().length > 0 || !!attachment;
  }, [html, attachment]);

  const hasAnyRecipient = useMemo(() => {
    const manualList = dedupValidEmails(splitMaybeList(manualEmails));
    return (
      manualList.length > 0 || collegeIds.length > 0 || mitraIds.length > 0
    );
  }, [manualEmails, collegeIds, mitraIds]);

  const canSend = useMemo(() => {
    return subject.trim().length > 0 && hasContent && hasAnyRecipient;
  }, [subject, hasContent, hasAnyRecipient]);

  /* =========================
     Lookup Fetchers (Abortable)
  ========================= */
  const doFetch = useCallback(async (url, abortRef) => {
    abortRef?.current?.abort?.();
    const ctrl = new AbortController();
    if (abortRef) abortRef.current = ctrl;
    const res = await fetch(url, {
      cache: "no-store",
      signal: ctrl.signal,
    });
    return res;
  }, []);

  const fetchColleges = useCallback(
    async (q = "") => {
      setLoadingColleges(true);
      try {
        const url = `/api/college?perPage=50${
          q ? `&q=${encodeURIComponent(q)}` : ""
        }`;
        const r = await doFetch(url, collegeFetchAbort);
        const j = await r.json().catch(() => ({}));
        const items = j?.data || j?.items || j?.records || j?.rows || [];
        if (!aliveRef.current) return;
        setCollegeOptions(items.map(mapCollege));
      } catch {
        if (!aliveRef.current) return;
        setCollegeOptions([]);
      } finally {
        if (!aliveRef.current) return;
        setLoadingColleges(false);
      }
    },
    [doFetch]
  );

  const fetchMitras = useCallback(
    async (q = "") => {
      setLoadingMitras(true);
      try {
        const url = `/api/mitra-dalam-negeri?perPage=50${
          q ? `&q=${encodeURIComponent(q)}` : ""
        }`;
        const r = await doFetch(url, mitraFetchAbort);
        const j = await r.json().catch(() => ({}));
        const items = j?.data || j?.items || j?.records || j?.rows || [];
        if (!aliveRef.current) return;
        setMitraOptions(items.map(mapMitra));
      } catch {
        if (!aliveRef.current) return;
        setMitraOptions([]);
      } finally {
        if (!aliveRef.current) return;
        setLoadingMitras(false);
      }
    },
    [doFetch]
  );

  useEffect(() => {
    // initial prefetch
    fetchColleges();
    fetchMitras();
  }, [fetchColleges, fetchMitras]);

  const searchColleges = useCallback(debounce(fetchColleges, 350), [
    fetchColleges,
  ]);
  const searchMitras = useCallback(debounce(fetchMitras, 350), [fetchMitras]);

  /* =========================
     Payload Builder (DRY)
  ========================= */
  const buildPayload = useCallback(
    (opts = {}) => {
      const safeSubject = subject.slice(0, LIMITS.SUBJECT);

      // manual emails + headers
      const manualTo = dedupValidEmails(splitMaybeList(manualEmails));
      const ccList = dedupValidEmails(splitMaybeList(cc));
      const bccList = dedupValidEmails(splitMaybeList(bcc));

      // attachments
      const atts =
        attachment && attachment.base64
          ? [
              {
                filename: attachment.name,
                content: attachment.base64,
                encoding: "base64",
                contentType: attachment.type || "application/octet-stream",
              },
            ]
          : undefined;

      // text fallback
      const textPlain =
        html && typeof html === "string" ? stripHtmlToText(html) : undefined;

      // delivery knobs
      const maxTo = clamp(maxPerRequest, 1, LIMITS.SAFE_MAX_TO_PER_REQUEST);
      const conc = clamp(
        concurrency,
        LIMITS.MIN_CONCURRENCY,
        LIMITS.MAX_CONCURRENCY
      );

      return {
        subject: safeSubject,
        html: html.slice(0, LIMITS.BODY),
        text: textPlain,
        attachments: atts,
        collegeIds,
        merchantIds: mitraIds, // backend naming
        emails: manualTo, // manual recipients ikut dedup di server juga
        cc: ccList,
        bcc: bccList,
        maxPerRequest: maxTo,
        concurrency: conc,
        ...opts,
      };
    },
    [
      subject,
      html,
      attachment,
      collegeIds,
      mitraIds,
      manualEmails,
      cc,
      bcc,
      maxPerRequest,
      concurrency,
    ]
  );

  /* =========================
     Preview (dry run)
  ========================= */
  const onPreview = useCallback(async () => {
    setError("");
    setPreview(null);
    setPreviewing(true);
    try {
      const payload = buildPayload({ dryRun: true });
      const r = await fetch("/api/blast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!r.ok) {
        const msg = j?.message || j?.error || "Preview gagal";
        throw new Error(msg);
      }
      setPreview({
        count: j.count ?? j.recipients?.length ?? 0,
        recipients: j.recipients || [],
        sources: j.sources || null,
      });
    } catch (e) {
      setError(e?.message || "Preview gagal.");
    } finally {
      setPreviewing(false);
    }
  }, [buildPayload]);

  /* =========================
     Send (NDJSON streaming)
  ========================= */
  const parseNdjsonStream = useCallback(async (res, onEvent) => {
    if (!res?.body) throw new Error("Stream tidak tersedia.");
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 1);
        if (!line) continue;
        try {
          const evt = JSON.parse(line);
          onEvent?.(evt);
        } catch {
          // abaikan baris tak valid
        }
      }
    }
    // tail (tanpa newline)
    const tail = buf.trim();
    if (tail) {
      try {
        const evt = JSON.parse(tail);
        onEvent?.(evt);
      } catch {}
    }
  }, []);

  const onSend = useCallback(async () => {
    setError("");
    setLogs([]);
    setSummary(null);
    setSending(true);

    try {
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      const payload = buildPayload();
      const res = await fetch("/api/blast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });

      if (!res.ok) {
        const j = await safeJson(res);
        const msg = j?.error || "Gagal mulai pengiriman.";
        throw new Error(msg);
      }

      await parseNdjsonStream(res, (evt) => {
        if (!aliveRef.current) return;
        setLogs((l) => [...l, evt]);
        if (evt?.type === "done") {
          setSummary({
            total: evt.total,
            sent: evt.sent,
            failed: evt.failed,
          });
        }
      });
    } catch (e) {
      if (e?.name !== "AbortError") {
        setError(e?.message || "Terjadi kesalahan saat mengirim.");
      }
    } finally {
      abortRef.current = null;
      setSending(false);
      await sleep(100);
    }
  }, [buildPayload, parseNdjsonStream]);

  // Attachment helpers
  const onSelectAttachment = useCallback((file) => {
    try {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        let base64 = "";
        if (typeof result === "string") {
          const comma = result.indexOf(",");
          base64 = comma >= 0 ? result.slice(comma + 1) : result;
        }
        setAttachment({
          name: file.name,
          type: file.type || "application/octet-stream",
          size: file.size || 0,
          base64,
        });
        setAttachmentFileList([{ uid: "1", name: file.name, status: "done" }]);
      };
      reader.readAsDataURL(file);
    } catch {}
    // biar antd Upload tidak auto-upload
    return false;
  }, []);

  const removeAttachment = useCallback(() => {
    setAttachment(null);
    setAttachmentFileList([]);
  }, []);

  const onCancel = useCallback(() => {
    try {
      abortRef.current?.abort();
    } catch {}
  }, []);

  /* =========================
     Exposed API
  ========================= */
  return {
    // fields
    subject,
    setSubject,
    html,
    setHtml,
    attachment,
    attachmentFileList,
    onSelectAttachment,
    removeAttachment,

    // recipients selections
    collegeIds,
    setCollegeIds,
    mitraIds,
    setMitraIds,

    // manual & headers
    manualEmails,
    setManualEmails,
    cc,
    setCc,
    bcc,
    setBcc,

    // delivery knobs
    concurrency,
    setConcurrency,
    maxPerRequest,
    setMaxPerRequest,

    // lookups
    collegeOptions,
    mitraOptions,
    loadingColleges,
    loadingMitras,
    searchColleges,
    searchMitras,

    // state
    preview,
    previewing,
    sending,
    logs,
    summary,
    error,

    // actions
    canSend,
    onPreview,
    onSend,
    onCancel,
  };
}
