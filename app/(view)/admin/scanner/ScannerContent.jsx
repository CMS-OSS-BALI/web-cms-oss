"use client";

import {
  Alert,
  Button,
  Divider,
  Input,
  Popover,
  Space,
  Tag,
  Typography,
  Spin,
  Modal,
  Result,
  notification,
} from "antd";
import {
  Camera,
  CameraOff,
  Flashlight,
  FlashlightOff,
  Copy,
  Check,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const { Text, Paragraph } = Typography;

export default function ScannerContent(props) {
  const {
    videoRef,
    loading,
    error,
    permission,
    scanning,
    torchSupported,
    torchOn,
    lastText,
    lastFormat,
    verifying,
    checkStatus,
    paused,
    modal,
    start,
    stop,
    toggleTorch,
    clearResult,
    onModalOk,
    validate,
    tokens = { shellW: "94%", maxW: 1140, blue: "#0b56c9", text: "#0f172a" },
  } = props;

  const [notify, contextHolder] = notification.useNotification();
  const ok = (m, d) =>
    notify.success({ message: m, description: d, placement: "topRight" });
  const info = (m, d) =>
    notify.info({ message: m, description: d, placement: "topRight" });
  const warn = (m, d) =>
    notify.warning({ message: m, description: d, placement: "topRight" });
  const err = (m, d) =>
    notify.error({ message: m, description: d, placement: "topRight" });

  const [secure, setSecure] = useState(null);
  useEffect(() => {
    if (typeof window !== "undefined") setSecure(window.isSecureContext);
  }, []);
  const [copied, setCopied] = useState(false);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => setIsMobile(window.innerWidth <= 640);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const isUrl = useMemo(() => {
    if (!lastText) return false;
    try {
      new URL(lastText);
      return true;
    } catch {
      return /^https?:\/\//i.test(lastText);
    }
  }, [lastText]);

  const copyToClipboard = async () => {
    if (!lastText) return;
    try {
      await navigator.clipboard.writeText(lastText);
      setCopied(true);
      ok("Disalin", "Hasil scan disalin.");
      setTimeout(() => setCopied(false), 900);
    } catch {
      err("Gagal menyalin", "Browser memblokir clipboard.");
    }
  };

  useEffect(() => {
    if (scanning) info("Kamera aktif");
  }, [scanning]);
  useEffect(() => {
    if (error) err("Kesalahan Kamera", error);
  }, [error]);

  const scanBorder = (() => {
    if (checkStatus?.kind === "success") return "2px solid rgba(34,197,94,0.9)";
    if (checkStatus?.kind === "already") return "2px solid rgba(234,179,8,0.9)";
    if (checkStatus?.kind) return "2px solid rgba(239,68,68,0.8)";
    if (paused) return "2px solid rgba(148,163,184,0.8)";
    return "1px solid #e6eeff";
  })();
  const crosshairBorder = (() => {
    if (checkStatus?.kind === "success") return "2px solid rgba(34,197,94,0.9)";
    if (checkStatus?.kind === "already") return "2px solid rgba(234,179,8,0.9)";
    if (checkStatus?.kind) return "2px solid rgba(239,68,68,0.85)";
    if (paused) return "2px solid rgba(148,163,184,0.85)";
    return "2px solid rgba(0, 255, 153, 0.8)";
  })();
  const crosshairShadow = (() => {
    if (checkStatus?.kind === "success") return "0 0 24px rgba(34,197,94,0.35)";
    if (checkStatus?.kind === "already") return "0 0 24px rgba(234,179,8,0.30)";
    if (checkStatus?.kind) return "0 0 24px rgba(239,68,68,0.30)";
    if (paused) return "0 0 24px rgba(148,163,184,0.30)";
    return "0 0 24px rgba(0,255,153,0.24)";
  })();

  /* ===== styles selaras Services ===== */
  const styles = {
    section: {
      width: "100%",
      position: "relative",
      minHeight: "100dvh",
      display: "flex",
      alignItems: "flex-start",
      padding: isMobile ? "28px 0 44px" : "56px 0",
      overflowX: "hidden",
    },
    bg: {
      position: "absolute",
      inset: 0,
      background:
        "linear-gradient(180deg, #f8fbff 0%, #eef5ff 40%, #ffffff 100%)",
      zIndex: 0,
    },
    container: {
      width: tokens.shellW,
      maxWidth: tokens.maxW,
      margin: "0 auto",
      position: "relative",
      zIndex: 1,
    },
    cardOuter: {
      background: "#ffffff",
      borderRadius: 16,
      border: "1px solid #e6eeff",
      boxShadow:
        "0 10px 40px rgba(11, 86, 201, 0.07), 0 3px 12px rgba(11,86,201,0.05)",
      overflow: "hidden",
    },
    cardHeaderBar: {
      height: 20,
      background:
        "linear-gradient(90deg, #0b56c9 0%, #0b56c9 65%, rgba(11,86,201,0.35) 100%)",
    },
    cardInner: { padding: "12px 14px 14px", position: "relative" },
    cardTitle: {
      fontSize: 18,
      fontWeight: 800,
      color: "#0b3e91",
      marginTop: 8,
      marginBottom: 8,
    },

    // wrap khusus agar width CTA = width scanner
    scanShell: {
      width: "100%",
      maxWidth: isMobile ? "100%" : 900,
      margin: "0 auto",
    },

    videoWrap: {
      width: "100%",
      position: "relative",
      borderRadius: 12,
      overflow: "hidden",
      background: "#0b1223",
      aspectRatio: "16 / 9",
      border: scanBorder,
      boxShadow: "0 8px 24px rgba(11,86,201,0.08)",
    },

    ctaWrap: { marginTop: 10 },
    ctaBtn: { width: "100%", height: 44, borderRadius: 10 },

    tips: { marginTop: 8, color: "#475569" },
    modalInfo: { fontSize: 12, opacity: 0.9, marginTop: -8 },
  };

  return (
    <section style={styles.section}>
      {contextHolder}
      <div aria-hidden style={styles.bg} />

      <div style={styles.container}>
        {/* ===== Header (tetap) ===== */}
        <div style={styles.cardOuter}>
          <div style={styles.cardHeaderBar} />
          <div style={styles.cardInner}>
            <div style={styles.cardTitle}>Scanner Tiket</div>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <Button
                href="/admin/events"
                shape="round"
                icon={<ArrowLeft size={16} />}
              >
                Kembali ke Events
              </Button>

              {!secure && secure !== null && (
                <Alert
                  type="warning"
                  showIcon
                  message="Saran: buka via HTTPS"
                  description="Akses kamera dibatasi tanpa HTTPS (kecuali localhost)."
                />
              )}
              {permission === "denied" && !error && (
                <Alert
                  type="error"
                  showIcon
                  message="Izin kamera ditolak"
                  description="Ubah izin di pengaturan situs browser, lalu muat ulang halaman."
                />
              )}
              {!!error && <Alert type="error" showIcon message={error} />}
            </div>
          </div>
        </div>

        {/* ===== Camera Card (Start/Stop dipindah ke bawah video & full width) ===== */}
        <div style={{ ...styles.cardOuter, marginTop: 12 }}>
          <div style={{ ...styles.cardInner, paddingTop: 14 }}>
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "#0b3e91",
                marginBottom: 8,
              }}
            >
              Camera & Controls
            </div>

            <div style={styles.scanShell}>
              {/* Video */}
              <div style={styles.videoWrap}>
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    filter: verifying || paused ? "grayscale(25%)" : "none",
                  }}
                />

                {/* overlay frame */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    boxShadow:
                      "inset 0 0 0 4px rgba(255,255,255,0.12), inset 0 0 0 1px rgba(0,0,0,0.06)",
                  }}
                />
                {/* crosshair */}
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "56%",
                    height: "56%",
                    border: crosshairBorder,
                    borderRadius: 12,
                    boxShadow: crosshairShadow,
                    pointerEvents: "none",
                    transition: "border-color 180ms, box-shadow 180ms",
                  }}
                />
                {/* status / torch */}
                {(verifying || paused) && (
                  <div
                    style={{
                      position: "absolute",
                      right: 8,
                      top: 8,
                      background: "rgba(0,0,0,0.45)",
                      borderRadius: 8,
                      padding: "6px 10px",
                    }}
                  >
                    <Space size={8}>
                      {verifying ? <Spin size="small" /> : null}
                      <Text style={{ color: "#fff" }}>
                        {verifying ? "Validating…" : "Paused"}
                      </Text>
                    </Space>
                  </div>
                )}

                {torchSupported && (
                  <div style={{ position: "absolute", left: 8, top: 8 }}>
                    <Button
                      size="small"
                      onClick={() => {
                        toggleTorch();
                        info(!torchOn ? "Torch diaktifkan" : "Torch dimatikan");
                      }}
                      disabled={!scanning}
                      icon={
                        torchOn ? (
                          <FlashlightOff size={16} />
                        ) : (
                          <Flashlight size={16} />
                        )
                      }
                    >
                      {torchOn ? "Torch Off" : "Torch On"}
                    </Button>
                  </div>
                )}
              </div>

              {/* CTA Start/Stop — full width mengikuti lebar scanner */}
              <div style={styles.ctaWrap}>
                {!scanning ? (
                  <Button
                    type="primary"
                    size="large"
                    loading={loading}
                    onClick={() => start().then(() => ok("Mulai Scan"))}
                    icon={<Camera size={18} />}
                    style={styles.ctaBtn}
                  >
                    Start
                  </Button>
                ) : (
                  <Button
                    danger
                    size="large"
                    onClick={() => {
                      stop();
                      warn("Scan dihentikan");
                    }}
                    icon={<CameraOff size={18} />}
                    style={styles.ctaBtn}
                  >
                    Stop
                  </Button>
                )}
              </div>
            </div>

            <div style={styles.tips}>
              <Text type="secondary">
                Tips: arahkan kode ke dalam kotak. Jaga jarak 10–25 cm agar
                fokus cepat.
              </Text>
            </div>
          </div>
        </div>

        {/* ===== Raw Result Card ===== */}
        <div style={{ ...styles.cardOuter, marginTop: 12 }}>
          <div style={{ ...styles.cardInner, paddingTop: 14 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 800, color: "#0b3e91" }}>
                Hasil Scan (raw)
              </div>
              <Space>
                <Button
                  icon={<RefreshCw size={16} />}
                  onClick={() => {
                    clearResult();
                    info("Hasil direset");
                  }}
                >
                  Reset
                </Button>
                {lastText && (
                  <Button
                    icon={copied ? <Check size={16} /> : <Copy size={16} />}
                    onClick={copyToClipboard}
                  >
                    {copied ? "Copied" : "Copy"}
                  </Button>
                )}
              </Space>
            </div>

            {lastText ? (
              <Space direction="vertical" size={8} style={{ display: "flex" }}>
                <div>
                  <Tag color="green" style={{ marginRight: 8 }}>
                    {lastFormat || "UNKNOWN"}
                  </Tag>
                  {isUrl && (
                    <a href={lastText} target="_blank" rel="noreferrer">
                      Buka tautan ↗
                    </a>
                  )}
                </div>
                <Paragraph
                  copyable={{ tooltips: ["Copy", "Copied"] }}
                  ellipsis={{
                    rows: 4,
                    expandable: true,
                    symbol: "lihat semua",
                  }}
                  style={{
                    background: "#f8fafc",
                    color: "#0f172a",
                    padding: 12,
                    borderRadius: 8,
                    border: "1px solid #e8eeff",
                    marginBottom: 0,
                    wordBreak: "break-all",
                    boxShadow: "inset 0 2px 6px rgba(11,86,201,0.05)",
                  }}
                >
                  {lastText}
                </Paragraph>
              </Space>
            ) : (
              <Alert
                type="info"
                showIcon
                message="Belum ada hasil"
                description="Mulai kamera, lalu arahkan ke QR/Barcode. Hasil akan tampil di sini."
              />
            )}

            <Divider style={{ margin: "16px 0" }} />

            <Popover
              trigger="click"
              content={
                <div style={{ maxWidth: 360 }}>
                  <Text type="secondary">
                    Input manual hanya untuk uji coba/backup jika kamera
                    bermasalah.
                  </Text>
                </div>
              }
            >
              <Text underline style={{ cursor: "pointer" }}>
                Kenapa ada input manual?
              </Text>
            </Popover>

            <div style={{ marginTop: 8 }}>
              <Input.Search
                placeholder="Tempel kode (opsional) lalu Enter"
                allowClear
                enterButton="Validate"
                style={{ width: "100%" }}
                onSearch={(val) => {
                  if (!val) return;
                  validate(val);
                  info("Validasi manual", "Kode dikirim untuk validasi.");
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ===== Modal hasil scan ===== */}
      <Modal
        open={modal.open}
        onOk={onModalOk}
        okText="OK"
        cancelButtonProps={{ style: { display: "none" } }}
        maskClosable={false}
        keyboard={false}
        centered
        width={520}
      >
        <Result
          status={modal.type}
          title={modal.title}
          subTitle={modal.message}
        />
        {modal?.data?.ticket && (
          <div style={styles.modalInfo}>
            <div>
              <b>Nama</b>: {modal.data.ticket.full_name}
            </div>
            <div>
              <b>Kode</b>: {modal.data.ticket.ticket_code}
            </div>
            {modal.data.ticket.checked_in_at && (
              <div>
                <b>Checked at</b>:{" "}
                {new Date(modal.data.ticket.checked_in_at).toLocaleString()}
              </div>
            )}
            {modal?.data?.event?.title && (
              <div>
                <b>Event</b>: {modal.data.event.title}
              </div>
            )}
          </div>
        )}
      </Modal>
    </section>
  );
}
