"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** util kecil */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function mapPartner(p) {
  // p.contact bisa JSON string, tidak dipakai di opsi — hanya label nama
  const name = p?.name || p?.partner_name || p?.slug || "Partner";
  return { label: name, value: String(p.id) };
}
function mapMerchant(m) {
  const name = m?.merchant_name || m?.name || "Mitra Dalam Negeri";
  return { label: name, value: String(m.id) };
}

export default function useBlastViewModel() {
  // form state
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  // optional single attachment
  const [attachment, setAttachment] = useState(null); // { name, type, size, base64 }
  const [attachmentFileList, setAttachmentFileList] = useState([]);

  const [partnerIds, setPartnerIds] = useState([]);
  const [merchantIds, setMerchantIds] = useState([]);

  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);

  // options
  const [partnerOptions, setPartnerOptions] = useState([]);
  const [merchantOptions, setMerchantOptions] = useState([]);
  const [loadingPartners, setLoadingPartners] = useState(false);
  const [loadingMerchants, setLoadingMerchants] = useState(false);

  // sending
  const [sending, setSending] = useState(false);
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const abortRef = useRef(null);

  const canSend = useMemo(
    () =>
      subject.trim().length > 0 &&
      (html.trim().length > 0 || !!attachment) &&
      (partnerIds.length > 0 || merchantIds.length > 0),
    [subject, html, attachment, partnerIds, merchantIds]
  );

  const fetchPartners = useCallback(async (q = "") => {
    setLoadingPartners(true);
    try {
      const url = `/api/partners?perPage=50${
        q ? `&q=${encodeURIComponent(q)}` : ""
      }`;
      const r = await fetch(url, { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      const items = j?.data || j?.items || j?.records || j?.rows || [];
      setPartnerOptions(items.map(mapPartner));
    } catch {
      setPartnerOptions([]);
    } finally {
      setLoadingPartners(false);
    }
  }, []);

  const fetchMerchants = useCallback(async (q = "") => {
    setLoadingMerchants(true);
    try {
      const url = `/api/merchants?perPage=50${
        q ? `&q=${encodeURIComponent(q)}` : ""
      }`;
      const r = await fetch(url, { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      const items = j?.data || j?.items || j?.records || j?.rows || [];
      setMerchantOptions(items.map(mapMerchant));
    } catch {
      setMerchantOptions([]);
    } finally {
      setLoadingMerchants(false);
    }
  }, []);

  useEffect(() => {
    fetchPartners();
    fetchMerchants();
  }, [fetchPartners, fetchMerchants]);

  const searchPartners = useCallback(debounce(fetchPartners, 350), [
    fetchPartners,
  ]);
  const searchMerchants = useCallback(debounce(fetchMerchants, 350), [
    fetchMerchants,
  ]);

  /* ========== Preview (dry run) ========== */
  const onPreview = useCallback(async () => {
    setError("");
    setPreview(null);
    setPreviewing(true);
    try {
      const payload = {
        subject: subject || "(preview)",
        html: html || "",
        // include attachment metadata to satisfy server NO_CONTENT check
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
        partnerIds,
        merchantIds,
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
  }, [subject, html, attachment, partnerIds, merchantIds]);

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
        partnerIds,
        merchantIds,
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
            // ignore
          }
        }
      }
    } catch (e) {
      if (e?.name !== "AbortError")
        setError(e?.message || "Terjadi kesalahan saat mengirim.");
    } finally {
      abortRef.current = null;
      setSending(false);
      // biar UI sempat render baris terakhir
      await sleep(100);
    }
  }, [subject, html, attachment, partnerIds, merchantIds]);

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
    // state
    subject,
    setSubject,
    html,
    setHtml,
    attachment,
    attachmentFileList,
    onSelectAttachment,
    removeAttachment,
    partnerIds,
    setPartnerIds,
    merchantIds,
    setMerchantIds,
    // cc, bcc, concurrency removed

    partnerOptions,
    merchantOptions,
    loadingPartners,
    loadingMerchants,
    searchPartners,
    searchMerchants,

    preview,
    previewing,
    sending,
    logs,
    summary,
    error,

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
