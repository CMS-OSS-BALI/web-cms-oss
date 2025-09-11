"use client";

import {
  Alert,
  Button,
  Card,
  Divider,
  Input,
  Popover,
  Select,
  Space,
  Tag,
  Typography,
  Spin,
  Modal,
  Result,
} from "antd";
import {
  Camera,
  CameraOff,
  Flashlight,
  FlashlightOff,
  Copy,
  Check,
  RefreshCw,
  Info,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const { Title, Text, Paragraph } = Typography;

export default function ScannerContent(props) {
  const {
    videoRef,
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

    start,
    stop,
    onChangeDevice,
    toggleTorch,
    clearResult,
    onModalOk,
    validate, // ⟵ pastikan ada dari ViewModel
  } = props;

  // Hydration-safe: cek secure context setelah mount (bukan dari props)
  const [secure, setSecure] = useState(null);
  useEffect(() => {
    if (typeof window !== "undefined") setSecure(window.isSecureContext);
  }, []);
  const [copied, setCopied] = useState(false);

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
    try {
      await navigator.clipboard.writeText(lastText || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 800);
    } catch {}
  };

  return (
    <Space direction="vertical" size={16} style={{ display: "flex" }}>
      <Title level={3} style={{ margin: 0 }}>
        QR / Barcode Scanner
      </Title>

      {secure === false && (
        <Alert
          type="warning"
          showIcon
          message="Saran: buka via HTTPS"
          description="Akses kamera biasanya diblokir jika tidak menggunakan HTTPS (kecuali localhost)."
        />
      )}

      {!!error && <Alert type="error" showIcon message={error} />}

      {permission === "denied" && !error && (
        <Alert
          type="error"
          showIcon
          message="Izin kamera ditolak"
          description="Buka pengaturan situs browser untuk mengizinkan kamera, lalu muat ulang halaman."
        />
      )}

      <Card
        styles={{ body: { padding: 16 } }}
        title={
          <Space>
            <Info size={16} />
            <span>Camera & Controls</span>
          </Space>
        }
        extra={
          <Space wrap>
            <Select
              style={{ minWidth: 260 }}
              placeholder="Pilih kamera"
              value={selectedDeviceId || undefined}
              disabled={loading}
              onChange={onChangeDevice}
              options={devices.map((d) => ({
                value: d.deviceId,
                label: d.label || `Camera ${d.deviceId.slice(0, 6)}...`,
              }))}
            />
            {torchSupported && (
              <Button
                onClick={toggleTorch}
                disabled={!scanning}
                icon={
                  torchOn ? (
                    <FlashlightOff size={16} />
                  ) : (
                    <Flashlight size={16} />
                  )
                }
              >
                {torchOn ? "Matikan Torch" : "Nyalakan Torch"}
              </Button>
            )}
            {!scanning ? (
              <Button
                type="primary"
                loading={loading}
                onClick={start}
                icon={<Camera size={16} />}
              >
                Start
              </Button>
            ) : (
              <Button danger onClick={stop} icon={<CameraOff size={16} />}>
                Stop
              </Button>
            )}
          </Space>
        }
      >
        <div
          style={{
            width: "100%",
            maxWidth: 720,
            margin: "0 auto",
            position: "relative",
            borderRadius: 12,
            overflow: "hidden",
            background: "#0b1223",
            aspectRatio: "16 / 9",
            border:
              checkStatus?.kind === "success"
                ? "2px solid rgba(34,197,94,0.9)"
                : checkStatus?.kind === "already"
                ? "2px solid rgba(234,179,8,0.9)"
                : checkStatus?.kind
                ? "2px solid rgba(239,68,68,0.8)"
                : paused
                ? "2px solid rgba(148,163,184,0.8)"
                : "1px solid #2a3957",
          }}
        >
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
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              boxShadow:
                "inset 0 0 0 4px rgba(255,255,255,0.15), inset 0 0 0 1px rgba(255,255,255,0.08)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: "56%",
              height: "56%",
              border:
                checkStatus?.kind === "success"
                  ? "2px solid rgba(34,197,94,0.9)"
                  : checkStatus?.kind === "already"
                  ? "2px solid rgba(234,179,8,0.9)"
                  : checkStatus?.kind
                  ? "2px solid rgba(239,68,68,0.85)"
                  : paused
                  ? "2px solid rgba(148,163,184,0.85)"
                  : "2px solid rgba(0, 255, 153, 0.8)",
              borderRadius: 12,
              boxShadow:
                checkStatus?.kind === "success"
                  ? "0 0 24px rgba(34,197,94,0.4)"
                  : checkStatus?.kind === "already"
                  ? "0 0 24px rgba(234,179,8,0.35)"
                  : checkStatus?.kind
                  ? "0 0 24px rgba(239,68,68,0.35)"
                  : paused
                  ? "0 0 24px rgba(148,163,184,0.35)"
                  : "0 0 24px rgba(0,255,153,0.3)",
              pointerEvents: "none",
              transition: "border-color 180ms, box-shadow 180ms",
            }}
          />
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
        </div>
        <div style={{ marginTop: 8, opacity: 0.8 }}>
          <Text type="secondary">
            Tips: arahkan kode ke dalam kotak. Jaga jarak 10–25 cm agar fokus
            cepat.
          </Text>
        </div>
      </Card>

      <Card
        styles={{ body: { padding: 16 } }}
        title="Hasil Scan (raw)"
        extra={
          <Space>
            <Button icon={<RefreshCw size={16} />} onClick={clearResult}>
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
        }
      >
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
              ellipsis={{ rows: 4, expandable: true, symbol: "lihat semua" }}
              style={{
                background: "#0b1223",
                color: "#e5e7eb",
                padding: 12,
                borderRadius: 8,
                border: "1px solid #2a3957",
                marginBottom: 0,
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
                Input manual hanya untuk uji coba/backup jika kamera bermasalah.
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
            onSearch={(val) => val && validate(val)}
          />
        </div>
      </Card>

      {/* ===== Modal hasil scan ===== */}
      <Modal
        open={modal.open}
        onOk={onModalOk}
        okText="OK"
        cancelButtonProps={{ style: { display: "none" } }}
        maskClosable={false}
        keyboard={false}
        centered
      >
        <Result
          status={modal.type}
          title={modal.title}
          subTitle={modal.message}
        />
        {modal?.data?.ticket && (
          <div style={{ fontSize: 12, opacity: 0.9, marginTop: -8 }}>
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
    </Space>
  );
}
