"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export default function useScannerViewModel() {
  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);
  const currentStreamRef = useRef(null);
  const currentTrackRef = useRef(null);
  const controlsRef = useRef(null); // simpan controls dari ZXing
  const scanLockRef = useRef(false); // kunci setelah sekali baca
  const startedRef = useRef(false);

  const [permission, setPermission] = useState("prompt");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [scanning, setScanning] = useState(false);

  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const [lastText, setLastText] = useState("");
  const [lastFormat, setLastFormat] = useState("");
  const lastScanMetaRef = useRef({ text: "", at: 0 });

  const [verifying, setVerifying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [checkStatus, setCheckStatus] = useState(null);
  const lastValidatedCodeRef = useRef({ code: "", at: 0 });

  const [modal, setModal] = useState({
    open: false,
    type: "info",
    title: "",
    message: "",
    data: null,
  });

  /* ================= Helpers ================= */
  const enumerateCameras = useCallback(async () => {
    if (!navigator?.mediaDevices?.enumerateDevices) return [];
    const list = await navigator.mediaDevices.enumerateDevices();
    const cams = list.filter((d) => d.kind === "videoinput");
    setDevices(cams);
    if (!selectedDeviceId && cams.length) {
      const back =
        cams.find((d) => /back|rear|environment/i.test(d.label)) || cams[0];
      setSelectedDeviceId(back.deviceId);
    }
    return cams;
  }, [selectedDeviceId]);

  const ensurePermission = useCallback(async () => {
    try {
      setError("");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      setPermission("granted");
      stream.getTracks().forEach((t) => t.stop());
      return true;
    } catch (err) {
      console.error("Camera permission error:", err);
      setPermission("denied");
      setError("Izin kamera ditolak atau tidak tersedia.");
      return false;
    }
  }, []);

  const extractCode = useCallback((raw) => {
    if (!raw) return "";
    const s = String(raw).trim();
    try {
      const u = new URL(s);
      const qCode = u.searchParams.get("code");
      if (qCode) return qCode.trim();
    } catch {}
    const m = s.match(/EVT-[A-Z0-9]{4,}-[A-Z0-9]{3,}/i);
    if (m) return m[0].toUpperCase();
    return s.toUpperCase();
  }, []);

  /* =============== STOP (manual dari tombol) =============== */
  const stop = useCallback(() => {
    try {
      setScanning(false);
      setTorchOn(false);

      controlsRef.current?.stop?.();
      controlsRef.current = null;
      codeReaderRef.current?.stopContinuousDecode?.();
      codeReaderRef.current?.reset?.();

      currentTrackRef.current?.stop?.();
      currentTrackRef.current = null;

      const stream =
        videoRef.current?.srcObject ?? currentStreamRef.current ?? null;
      stream?.getTracks?.().forEach((t) => t.stop());
      currentStreamRef.current = null;

      if (videoRef.current) videoRef.current.srcObject = null;
    } catch (err) {
      console.error("Stop scanner error:", err);
    }
  }, []);

  /* =============== START =============== */
  const start = useCallback(async () => {
    if (startedRef.current) return;
    startedRef.current = true;
    try {
      setLoading(true);
      setError("");

      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error("Browser tidak mendukung mediaDevices.getUserMedia.");
      }

      const granted = permission === "granted" || (await ensurePermission());
      if (!granted) throw new Error("Tidak ada izin kamera.");

      await enumerateCameras();

      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();
      codeReaderRef.current = reader;

      const deviceId = selectedDeviceId || undefined;
      const video = videoRef.current;
      if (!video) throw new Error("Video element belum siap.");

      // jangan await agar tidak ngegantung
      reader.decodeFromVideoDevice(deviceId, video, (result, err, controls) => {
        if (controls && controls !== controlsRef.current) {
          controlsRef.current = controls; // simpan supaya bisa dihentikan
        }

        // attach track pertama kali
        if (!currentTrackRef.current) {
          const stream =
            controls?.stream ??
            (videoRef.current && videoRef.current.srcObject) ??
            null;
          currentStreamRef.current = stream || currentStreamRef.current;

          const track = stream?.getVideoTracks?.()[0] ?? null;
          if (track) {
            currentTrackRef.current = track;
            const caps = track.getCapabilities?.() || {};
            setTorchSupported("torch" in caps);
          }
        }

        // abaikan frame saat kondisi ini
        if (scanLockRef.current || verifying || paused) return;

        if (result) {
          const text = result.getText();
          const format = result.getBarcodeFormat();

          // kunci segera → block callback selanjutnya, tapi kamera tetap menyala
          scanLockRef.current = true;
          setPaused(true);

          setLastText(text);
          setLastFormat(String(format || ""));
          validateCode(text); // ini yang akan munculkan modal
        }
      });

      setScanning(true);
    } catch (err) {
      console.error("Start scanner error:", err);
      setError(err?.message || "Gagal memulai kamera.");
      stop();
    } finally {
      setLoading(false);
      startedRef.current = false;
    }
  }, [
    ensurePermission,
    enumerateCameras,
    permission,
    selectedDeviceId,
    verifying,
    paused,
    stop,
  ]);

  /* ===== Modal helper ===== */
  const openModal = useCallback((type, title, message, data) => {
    setModal({ open: true, type, title, message, data: data || null });
    setPaused(true);
  }, []);

  const onModalOk = useCallback(() => {
    // Tutup modal & reset throttle — TANPA matikan kamera
    setModal((m) => ({ ...m, open: false }));
    setCheckStatus(null);
    setLastText("");
    setLastFormat("");
    lastScanMetaRef.current = { text: "", at: 0 };
    lastValidatedCodeRef.current = { code: "", at: 0 };

    // buka kunci → kamera sudah nyala, callback akan aktif lagi
    scanLockRef.current = false;
    setPaused(false);
  }, []);

  /* =============== VALIDATE =============== */
  const validateCode = useCallback(
    async (rawText) => {
      const code = extractCode(rawText);
      if (!code) return;

      const now = Date.now();
      if (
        lastValidatedCodeRef.current.code === code &&
        now - lastValidatedCodeRef.current.at < 1500
      ) {
        return;
      }
      lastValidatedCodeRef.current = { code, at: now };

      setVerifying(true);
      setCheckStatus(null);
      try {
        const res = await fetch("/api/tickets/checkin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        const payload = await res.json().catch(() => ({}));

        if (res.status === 200) {
          setCheckStatus({
            kind: "success",
            message: "Check-in berhasil",
            data: payload?.data,
          });
          navigator?.vibrate?.(40);
          const t = payload?.data?.ticket;
          openModal(
            "success",
            "Check-in Berhasil",
            t
              ? `Nama: ${t.full_name} • Kode: ${t.ticket_code}`
              : "Tiket berhasil di-check-in.",
            payload?.data
          );
        } else if (res.status === 409) {
          setCheckStatus({
            kind: "already",
            message: payload?.message || "Tiket sudah check-in",
            data: payload?.data,
          });
          const t = payload?.data?.ticket;
          openModal(
            "warning",
            "Tiket Sudah Dipakai",
            t
              ? `Kode ${t.ticket_code} sudah check-in pada ${
                  t.checked_in_at
                    ? new Date(t.checked_in_at).toLocaleString()
                    : "waktu tidak diketahui"
                }.`
              : "Tiket ini sudah pernah dipakai.",
            payload?.data
          );
        } else if (res.status === 400) {
          setCheckStatus({
            kind: "pending",
            message:
              payload?.message || "Tiket belum terkonfirmasi (unpaid/pending)",
          });
          openModal(
            "error",
            "Belum Terkonfirmasi",
            "Status tiket masih PENDING / belum dibayar.",
            payload?.data
          );
        } else if (res.status === 404) {
          setCheckStatus({
            kind: "notfound",
            message: payload?.message || "Tiket tidak ditemukan",
          });
          openModal(
            "error",
            "Tiket Tidak Ditemukan",
            "Kode tiket tidak ada di sistem. Periksa kembali QR/kodenya."
          );
        } else if (res.status === 429) {
          setCheckStatus({
            kind: "ratelimited",
            message:
              payload?.message ||
              "Terlalu banyak permintaan. Coba lagi sebentar.",
          });
          openModal(
            "warning",
            "Terlalu Banyak Permintaan",
            "Anda terlalu cepat memindai. Coba lagi dalam beberapa detik."
          );
        } else {
          setCheckStatus({
            kind: "error",
            message: payload?.message || "Gagal memvalidasi tiket",
          });
          openModal(
            "error",
            "Kesalahan Server",
            payload?.message || "Gagal memvalidasi tiket. Coba lagi."
          );
        }
      } catch (e) {
        console.error("validateCode error:", e);
        setCheckStatus({ kind: "error", message: "Kesalahan jaringan/server" });
        openModal(
          "error",
          "Kesalahan Jaringan",
          "Tidak dapat terhubung ke server."
        );
      } finally {
        setVerifying(false);
      }
    },
    [extractCode, openModal]
  );

  const validate = useCallback(
    (raw) => {
      // manual validate: kunci logic (kamera tetap ON)
      scanLockRef.current = true;
      setPaused(true);
      validateCode(raw);
    },
    [validateCode]
  );

  const toggleTorch = useCallback(async () => {
    try {
      const track = currentTrackRef.current;
      if (!track) return;
      const capabilities = track.getCapabilities?.() || {};
      if (!("torch" in capabilities)) return;

      const next = !torchOn;
      await track.applyConstraints({ advanced: [{ torch: next }] });
      setTorchOn(next);
    } catch (err) {
      console.error("Toggle torch error:", err);
    }
  }, [torchOn]);

  const onChangeDevice = useCallback(
    async (id) => {
      setSelectedDeviceId(id);
      if (scanning) {
        // ganti device → restart kamera
        stop();
        setTimeout(() => start(), 150);
      }
    },
    [scanning, start, stop]
  );

  useEffect(() => {
    const onVis = () => {
      if (document.hidden && scanning) stop();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [scanning, stop]);

  useEffect(() => stop, [stop]);

  const clearResult = useCallback(() => {
    setLastText("");
    setLastFormat("");
    lastScanMetaRef.current = { text: "", at: 0 };
    setCheckStatus(null);
  }, []);

  return {
    // refs
    videoRef,

    // states
    loading,
    error,
    permission,
    devices,
    selectedDeviceId,
    scanning,
    torchSupported,
    torchOn,
    lastText,
    lastFormat,

    verifying,
    checkStatus,
    paused,
    modal,

    // actions
    start,
    stop,
    onChangeDevice,
    toggleTorch,
    clearResult,

    onModalOk,
    validate,
  };
}
