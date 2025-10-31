"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** util kecil */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

export default function useBlastViewModel() {
  // form state
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  // optional single attachment
  const [attachment, setAttachment] = useState(null); // { name, type, size, base64 }
  const [attachmentFileList, setAttachmentFileList] = useState([]);

  // selections
  const [collegeIds, setCollegeIds] = useState([]);
  const [mitraIds, setMitraIds] = useState([]);

  // ui state
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);

  // options
  const [collegeOptions, setCollegeOptions] = useState([]);
  const [mitraOptions, setMitraOptions] = useState([]);
  const [loadingColleges, setLoadingColleges] = useState(false);
  const [loadingMitras, setLoadingMitras] = useState(false);

  // sending
  const [sending, setSending] = useState(false);
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const abortRef = useRef(null);

  const canSend = useMemo(
    () =>
      subject.trim().length > 0 &&
      (html.trim().length > 0 || !!attachment) &&
      (collegeIds.length > 0 || mitraIds.length > 0),
    [subject, html, attachment, collegeIds, mitraIds]
  );

  /* ===== Fetch lookup ===== */
  const fetchColleges = useCallback(async (q = "") => {
    setLoadingColleges(true);
    try {
      const url = `/api/college?perPage=50${
        q ? `&q=${encodeURIComponent(q)}` : ""
      }`;
      const r = await fetch(url, { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      const items = j?.data || j?.items || j?.records || j?.rows || [];
      setCollegeOptions(items.map(mapCollege));
    } catch {
      setCollegeOptions([]);
    } finally {
      setLoadingColleges(false);
    }
  }, []);

  const fetchMitras = useCallback(async (q = "") => {
    setLoadingMitras(true);
    try {
      const url = `/api/mitra-dalam-negeri?perPage=50${
        q ? `&q=${encodeURIComponent(q)}` : ""
      }`;
      const r = await fetch(url, { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      const items = j?.data || j?.items || j?.records || j?.rows || [];
      setMitraOptions(items.map(mapMitra));
    } catch {
      setMitraOptions([]);
    } finally {
      setLoadingMitras(false);
    }
  }, []);

  useEffect(() => {
    fetchColleges();
    fetchMitras();
  }, [fetchColleges, fetchMitras]);

  const searchColleges = useCallback(debounce(fetchColleges, 350), [
    fetchColleges,
  ]);
  const searchMitras = useCallback(debounce(fetchMitras, 350), [fetchMitras]);

  /* ========== Preview (dry run) ========== */
  const onPreview = useCallback(async () => {
    setError("");
    setPreview(null);
    setPreviewing(true);
    try {
      const payload = {
        subject: subject || "(preview)",
        html: html || "",
        attachments: attachment
          ? [
              {
                filename: attachment.name,
                content: attachment.base64,
                encoding: "base64",
                contentType: attachment.type || "application/octet-stream",
              },
            ]
          : undefined,
        // 🔁 ganti: kirim collegeIds & mitraIds
        collegeIds,
        merchantIds: mitraIds, // backend tetap sebut 'merchantIds'
        dryRun: true,
      };
      const r = await fetch("/api/blast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.message || j?.error || "Preview gagal");
      setPreview({
        count: j.count || (j.recipients?.length ?? 0),
        recipients: j.recipients || [],
        sources: j.sources || null,
      });
    } catch (e) {
      setError(e?.message || "Preview gagal.");
    } finally {
      setPreviewing(false);
    }
  }, [subject, html, attachment, collegeIds, mitraIds]);

  /* ========== Kirim (stream NDJSON) ========== */
  const onSend = useCallback(async () => {
    setError("");
    setLogs([]);
    setSummary(null);
    setSending(true);

    try {
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      const payload = {
        subject,
        html,
        attachments: attachment
          ? [
              {
                filename: attachment.name,
                content: attachment.base64,
                encoding: "base64",
                contentType: attachment.type || "application/octet-stream",
              },
            ]
          : undefined,
        collegeIds,
        merchantIds: mitraIds,
      };

      const res = await fetch("/api/blast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) {
        const j = await safeJson(res).catch(() => ({}));
        throw new Error(j?.error || "Gagal mulai pengiriman.");
      }

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
            setLogs((l) => [...l, evt]);
            if (evt.type === "done")
              setSummary({
                total: evt.total,
                sent: evt.sent,
                failed: evt.failed,
              });
          } catch {
            // ignore bad lines
          }
        }
      }
    } catch (e) {
      if (e?.name !== "AbortError")
        setError(e?.message || "Terjadi kesalahan saat mengirim.");
    } finally {
      abortRef.current = null;
      setSending(false);
      await sleep(100);
    }
  }, [subject, html, attachment, collegeIds, mitraIds]);

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

    // selections
    collegeIds,
    setCollegeIds,
    mitraIds,
    setMitraIds,

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
