"use client";

import { useEffect } from "react";
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Divider,
  Form,
  Input,
  Select,
  Space,
  Typography,
} from "antd";

export default function BuyTicketContent(props) {
  const {
    // event selection
    events,
    loadingList,
    selectedEventId,
    setSelectedEventId,

    // event detail
    event,
    loadingEvent,
    isPaid,
    price,

    // form
    form,
    setField,

    // actions
    submit,
    submitting,

    // result
    error,
    ticket,
  } = props;

  // Pastikan halaman bisa scroll (kalau ada global overflow hidden)
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "auto";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const fmt = (n) => new Intl.NumberFormat("id-ID").format(Number(n || 0));
  const title = event?.title || "Event";

  // ========== Sukses submit ==========
  if (ticket) {
    const pending = ticket.status === "PENDING";
    const confirmed = ticket.status === "CONFIRMED";

    return (
      <div style={{ maxWidth: 720, margin: "24px auto", padding: 12 }}>
        <Card>
          <Typography.Title level={3} style={{ marginTop: 0 }}>
            {pending ? "Pendaftaran Berhasil" : "Tiket Berhasil Dipesan"}
          </Typography.Title>

          <p>
            Kami sudah mengirimkan email ke <b>{ticket.email}</b>.
          </p>

          <Descriptions size="small" column={1} bordered>
            <Descriptions.Item label="Event">{title}</Descriptions.Item>
            <Descriptions.Item label="Nama">
              {ticket.full_name}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              {ticket.status}
            </Descriptions.Item>
            <Descriptions.Item label="Kode Tiket">
              {ticket.ticket_code}
            </Descriptions.Item>
            {typeof ticket.total_price === "number" && (
              <Descriptions.Item label="Total">
                Rp {fmt(ticket.total_price)}
              </Descriptions.Item>
            )}
          </Descriptions>

          {confirmed && ticket.qr_url && (
            <>
              <Divider />
              <Typography.Paragraph>
                Tunjukkan QR berikut saat <i>check-in</i>:
              </Typography.Paragraph>
              <img
                src={ticket.qr_url}
                alt="QR Ticket"
                style={{ maxWidth: 240 }}
              />
            </>
          )}

          {pending && (
            <>
              <Divider />
              <Alert
                type="info"
                showIcon
                message="Pembayaran diperlukan"
                description="Status tiket masih PENDING. Selesaikan pembayaran sesuai instruksi email."
              />
            </>
          )}

          <Divider />
          <Space>
            <Button type="primary" onClick={() => window.location.assign("/")}>
              Kembali ke Beranda
            </Button>
            <Button onClick={() => window.location.reload()}>Pesan Lagi</Button>
          </Space>
        </Card>
      </div>
    );
  }

  // ========== Form pemesanan ==========
  return (
    <div style={{ maxWidth: 720, margin: "24px auto", padding: 12 }}>
      <Card title="Beli Tiket" loading={loadingEvent}>
        {/* Picker event jika ?event_id tidak diberikan */}
        {!selectedEventId && (
          <Form layout="vertical" style={{ marginBottom: 16 }}>
            <Form.Item label="Pilih Event" required extra="Silakan pilih event">
              <Select
                loading={loadingList}
                placeholder="Pilih event"
                value={selectedEventId || undefined}
                options={events.map((e) => ({
                  value: e.id,
                  label: e.title || e.id,
                }))}
                onChange={(v) => setSelectedEventId(v)}
                showSearch
                optionFilterProp="label"
              />
            </Form.Item>
          </Form>
        )}

        {/* Info event */}
        {selectedEventId && event && (
          <Descriptions
            size="small"
            column={1}
            bordered
            style={{ marginBottom: 16 }}
          >
            <Descriptions.Item label="Event">{title}</Descriptions.Item>
            {event?.start_at && (
              <Descriptions.Item label="Jadwal">
                {new Date(event.start_at).toLocaleString()} —{" "}
                {event.end_at ? new Date(event.end_at).toLocaleString() : "-"}
              </Descriptions.Item>
            )}
            {event?.location && (
              <Descriptions.Item label="Lokasi">
                {event.location}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Harga">
              {isPaid ? `Rp ${fmt(price)}` : "GRATIS"}
            </Descriptions.Item>
          </Descriptions>
        )}

        {error && (
          <Alert
            type="error"
            showIcon
            message={error}
            style={{ marginBottom: 16 }}
          />
        )}

        <Form layout="vertical" onFinish={submit}>
          <Form.Item label="Nama Lengkap" required>
            <Input
              value={form.full_name}
              onChange={(e) => setField("full_name", e.target.value)}
              placeholder="Nama lengkap"
              autoComplete="name"
            />
          </Form.Item>

          <Form.Item label="Email" required extra="Tiket dikirim ke email ini">
            <Input
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              type="email"
              placeholder="nama@email.com"
              autoComplete="email"
            />
          </Form.Item>

          <Form.Item label="WhatsApp">
            <Input
              value={form.whatsapp}
              onChange={(e) => setField("whatsapp", e.target.value)}
              placeholder="08xxxxxxxxxx"
              autoComplete="tel"
            />
          </Form.Item>

          <Form.Item label="Asal Sekolah/Kampus">
            <Input
              value={form.school_or_campus}
              onChange={(e) => setField("school_or_campus", e.target.value)}
              placeholder="Nama sekolah/kampus"
            />
          </Form.Item>

          <Form.Item label="Kelas/Semester">
            <Input
              value={form.class_or_semester}
              onChange={(e) => setField("class_or_semester", e.target.value)}
              placeholder="cth: Semester 3 / Kelas 12 IPA"
            />
          </Form.Item>

          <Form.Item label="Domisili">
            <Input
              value={form.domicile}
              onChange={(e) => setField("domicile", e.target.value)}
              placeholder="Kota domisili"
            />
          </Form.Item>

          {selectedEventId && isPaid && (
            <Form.Item label="Metode Pembayaran">
              <Select
                value={form.payment_method || undefined}
                onChange={(v) => setField("payment_method", v)}
                placeholder="Pilih metode"
                options={[
                  { value: "QRIS", label: "QRIS" },
                  { value: "VA", label: "Virtual Account" },
                  { value: "MANUAL", label: "Transfer Manual" },
                ]}
              />
            </Form.Item>
          )}

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              disabled={!selectedEventId || !form.full_name || !form.email}
              block
            >
              {selectedEventId && isPaid
                ? `Bayar Rp ${fmt(price)}`
                : "Daftar Gratis"}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
