"use client";

import React, { useRef, useCallback, useMemo, useState } from "react";
import {
  Row,
  Col,
  Card,
  Typography,
  Input,
  InputNumber,
  Select,
  Checkbox,
  Divider,
  Button,
  Space,
  Alert,
  Skeleton,
} from "antd";
import { FileDown, MessageCircle } from "lucide-react";
import useCalculatorViewModel from "./useCalculatorViewModel";

const { Title, Text } = Typography;

const styles = {
  wrap: {
    width: "100vw",
    marginLeft: "calc(50% - 50vw)",
    background: "#f2f7ff",
  },
  hero: {
    background: "linear-gradient(180deg,#d8edff 0%, #e4f0ff 55%, #ffffff 100%)",
    padding: "36px 16px 300px",
    marginTop: "calc(-1 * clamp(48px, 8vw, 84px))",
    overflow: "hidden",
  },
  heroInner: { width: "min(1040px, 92%)", margin: "0 auto" },
  heroTitle: {
    textAlign: "center",
    fontWeight: 900,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#0B3E91",
    fontSize: "clamp(28px, 4vw, 44px)",
    margin: 0,
  },
  underline: {
    width: 160,
    height: 4,
    background:
      "linear-gradient(90deg, transparent 0%, #5aa6ff 40%, #5aa6ff 60%, transparent 100%)",
    borderRadius: 999,
    margin: "12px auto 0",
  },
  container: { width: "min(1080px, 94%)", margin: "-230px auto 80px" },
  cardStack: { display: "flex", flexDirection: "column", gap: 28 },
  card: {
    borderRadius: 18,
    border: "2px solid #cfe0ff",
    boxShadow: "0 18px 40px rgba(8,42,116,0.12)",
    background: "#fff",
  },
  cardBody: { padding: 28 },
  sectionTitle: {
    margin: 0,
    fontWeight: 900,
    fontSize: 20,
    letterSpacing: "0.05em",
    color: "#0B3E91",
    textTransform: "uppercase",
  },
  subTitle: {
    margin: "12px 0 4px",
    fontWeight: 700,
    letterSpacing: "0.04em",
    color: "#1e4396",
    textTransform: "uppercase",
  },
  formItem: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: 700,
    color: "#0f2b5a",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },
  input: {
    borderRadius: 10,
    background: "#f2f6fd",
    border: "1px solid #d9e6ff",
    height: 44,
  },
  addonRow: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    alignItems: "center",
    gap: 12,
    border: "1px solid #d9e6ff",
    borderRadius: 12,
    padding: "14px 16px",
    background: "#f7f9ff",
  },
  addonLabel: { color: "#0f2b5a", fontWeight: 600, letterSpacing: "0.02em" },
  addonNote: { fontSize: 12, color: "#5b709c", marginTop: 4 },
  estList: { display: "flex", flexDirection: "column", gap: 12, marginTop: 8 },
  estRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    paddingBottom: 12,
    borderBottom: "1px dashed #d0dcf4",
  },
  estKey: { color: "#345a99", fontWeight: 600 },
  estValue: { color: "#0f2b5a", fontWeight: 700, textAlign: "right" },
  totalWrap: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    border: "1px solid #cfe0ff",
    borderRadius: 14,
    padding: "16px 20px",
    background:
      "linear-gradient(90deg, rgba(90,166,255,0.12) 0%, #ffffff 100%)",
    marginTop: 8,
  },
  totalValue: {
    fontSize: 22,
    fontWeight: 900,
    color: "#0B3E91",
    letterSpacing: "0.04em",
  },
  actionBar: {
    marginTop: 22,
    display: "flex",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 14,
  },
  primaryBtn: {
    minWidth: 220,
    height: 46,
    borderRadius: 12,
    fontWeight: 800,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    background: "#0B3E91",
    border: "none",
  },
  secondaryBtn: {
    minWidth: 220,
    height: 46,
    borderRadius: 12,
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },
};

// currency helpers
function formatIDR(n) {
  const v = Number(n) || 0;
  return v.toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  });
}
function parseIDR(str) {
  if (str === null || str === undefined) return 0;
  const num = Number(String(str).replace(/[^\d]/g, ""));
  return Number.isFinite(num) ? num : 0;
}

export default function CalculatorContent() {
  const svc = useCalculatorViewModel(); // { loading, error, categories }
  const loading = svc.loading;
  const fetchError = svc.error;

  // options
  const serviceFeeOptions = useMemo(() => {
    const items = svc.categories?.service_fee?.items || [];
    return items.map((s) => ({
      value: s.id,
      label: s.name || "(no title)",
      amount: Number(s.price || 0),
      raw: s,
    }));
  }, [svc.categories]);

  const insuranceOptions = useMemo(() => {
    const items = svc.categories?.asuransi?.items || [];
    return items.map((s) => ({
      value: s.id,
      label: s.name || "(no title)",
      amount: Number(s.price || 0),
      raw: s,
    }));
  }, [svc.categories]);

  const visaOptions = useMemo(() => {
    const items = svc.categories?.biaya_visa?.items || [];
    return items.map((s) => ({
      value: s.id,
      label: s.name || "(no title)",
      amount: Number(s.price || 0),
      raw: s,
    }));
  }, [svc.categories]);

  const addonList = useMemo(() => {
    const items = svc.categories?.addons?.items || [];
    return items.map((s) => ({
      key: s.id,
      label: s.name || "(no title)",
      amount: Number(s.price || 0),
      note: s.description || "",
      raw: s,
    }));
  }, [svc.categories]);

  // local form state
  const [form, setForm] = useState({
    namaStudent: "",
    namaKampus: "",
    lokasiKampus: "",
    jurusan: "",
    intake: "",
    serviceFeeKey: null,
    insuranceKey: null,
    visaKey: null,
    biayaKuliahTerm: 0,
    jumlahTerm: null,
    addons: {},
  });

  const update = useCallback(
    (key, value) => setForm((p) => ({ ...p, [key]: value })),
    []
  );
  const toggleAddon = useCallback((addonId, checked) => {
    setForm((p) => ({ ...p, addons: { ...p.addons, [addonId]: !!checked } }));
  }, []);

  // selected values
  const serviceFee = useMemo(
    () => serviceFeeOptions.find((o) => o.value === form.serviceFeeKey) || null,
    [serviceFeeOptions, form.serviceFeeKey]
  );
  const insurance = useMemo(
    () => insuranceOptions.find((o) => o.value === form.insuranceKey) || null,
    [insuranceOptions, form.insuranceKey]
  );
  const visa = useMemo(
    () => visaOptions.find((o) => o.value === form.visaKey) || null,
    [visaOptions, form.visaKey]
  );
  const selectedAddons = useMemo(
    () => addonList.filter((a) => !!form.addons[a.key]),
    [addonList, form.addons]
  );

  // totals
  const termOptions = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => ({
        value: i + 1,
        label: String(i + 1),
      })),
    []
  );
  const tuition = useMemo(
    () => Number(form.biayaKuliahTerm || 0) * Number(form.jumlahTerm || 0),
    [form.biayaKuliahTerm, form.jumlahTerm]
  );
  const addonsTotal = useMemo(
    () => selectedAddons.reduce((sum, a) => sum + (a.amount || 0), 0),
    [selectedAddons]
  );
  const totalIDR = useMemo(
    () =>
      (serviceFee?.amount || 0) +
      (insurance?.amount || 0) +
      (visa?.amount || 0) +
      addonsTotal +
      tuition,
    [serviceFee, insurance, visa, addonsTotal, tuition]
  );

  // PDF
  const estimatedRef = useRef(null);
  const handleDownloadPDF = useCallback(async () => {
    const el = estimatedRef.current;
    if (!el) return;
    const html2canvas = (await import("html2canvas")).default;
    const { jsPDF } = await import("jspdf");

    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      windowWidth: el.scrollWidth,
      windowHeight: el.scrollHeight,
    });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;

    if (imgH <= pageH) {
      pdf.addImage(imgData, "PNG", 0, 0, imgW, imgH);
    } else {
      const pageHeightPx = Math.floor((pageH * canvas.width) / pageW);
      let y = 0;
      while (y < canvas.height) {
        const sliceHeightPx = Math.min(pageHeightPx, canvas.height - y);
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeightPx;
        const ctx = pageCanvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(
          canvas,
          0,
          y,
          canvas.width,
          sliceHeightPx,
          0,
          0,
          canvas.width,
          sliceHeightPx
        );
        const pageImgData = pageCanvas.toDataURL("image/png");
        const pageImgH = (sliceHeightPx * imgW) / canvas.width;
        pdf.addImage(pageImgData, "PNG", 0, 0, imgW, pageImgH);
        y += sliceHeightPx;
        if (y < canvas.height) pdf.addPage();
      }
    }
    const safeName = (form.namaStudent || "Student")
      .toString()
      .replace(/[^\w-]+/g, "_");
    pdf.save(`Estimated_Costs_${safeName}.pdf`);
  }, [form.namaStudent]);

  const goConsult = useCallback(() => {
    if (typeof window !== "undefined") window.open("/contact", "_blank");
  }, []);

  // AntD dropdown: render ke parent agar tidak ketutup layout yang overflow hidden
  const popupInParent = (trigger) => trigger?.parentElement || document.body;

  return (
    <div style={styles.wrap}>
      <div style={styles.hero}>
        <div style={styles.heroInner}>
          <Title level={2} style={styles.heroTitle}>
            PRICE CALCULATOR
          </Title>
          <div style={styles.underline} />
        </div>
      </div>

      <div style={styles.container}>
        <div style={styles.cardStack}>
          <Card style={styles.card} bodyStyle={styles.cardBody}>
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              <Title level={4} style={styles.sectionTitle}>
                Form Input
              </Title>

              {fetchError ? (
                <Alert
                  type="error"
                  showIcon
                  message="Gagal memuat opsi harga"
                  description={String(fetchError)}
                />
              ) : null}

              <Row gutter={[16, 20]}>
                <Col span={24}>
                  <div style={styles.formItem}>
                    <Text style={styles.label}>Nama Student</Text>
                    <Input
                      size="large"
                      placeholder="Isi nama student"
                      style={styles.input}
                      value={form.namaStudent}
                      onChange={(e) => update("namaStudent", e.target.value)}
                    />
                  </div>
                </Col>

                <Col span={24}>
                  <div style={styles.formItem}>
                    <Text style={styles.label}>Nama Kampus</Text>
                    <Input
                      size="large"
                      placeholder="Isi nama kampus"
                      style={styles.input}
                      value={form.namaKampus}
                      onChange={(e) => update("namaKampus", e.target.value)}
                    />
                  </div>
                </Col>

                <Col span={24}>
                  <div style={styles.formItem}>
                    <Text style={styles.label}>Lokasi Kampus</Text>
                    <Input
                      size="large"
                      placeholder="Alamat / kota, negara"
                      style={styles.input}
                      value={form.lokasiKampus}
                      onChange={(e) => update("lokasiKampus", e.target.value)}
                    />
                  </div>
                </Col>

                <Col span={24} md={12}>
                  <div style={styles.formItem}>
                    <Text style={styles.label}>Jurusan</Text>
                    <Input
                      size="large"
                      placeholder="Contoh: Computer Science"
                      style={styles.input}
                      value={form.jurusan}
                      onChange={(e) => update("jurusan", e.target.value)}
                    />
                  </div>
                </Col>

                <Col span={24} md={12}>
                  <div style={styles.formItem}>
                    <Text style={styles.label}>Intake</Text>
                    <Input
                      size="large"
                      placeholder="Misal: 11 September 2024"
                      style={styles.input}
                      value={form.intake}
                      onChange={(e) => update("intake", e.target.value)}
                    />
                  </div>
                </Col>

                {/* Selects */}
                <Col span={24} md={8}>
                  <div style={styles.formItem}>
                    <Text style={styles.label}>Service Fee</Text>
                    <Select
                      size="large"
                      loading={loading}
                      allowClear
                      placeholder="Pilih service fee"
                      disabled={loading}
                      getPopupContainer={popupInParent}
                      notFoundContent="Tidak ada data"
                      options={serviceFeeOptions.map((o) => ({
                        value: o.value,
                        label: `${o.label} (${formatIDR(o.amount)})`,
                      }))}
                      value={form.serviceFeeKey ?? undefined}
                      onChange={(value) =>
                        update("serviceFeeKey", value ?? null)
                      }
                      style={{ width: "100%" }}
                    />
                  </div>
                </Col>

                <Col span={24} md={8}>
                  <div style={styles.formItem}>
                    <Text style={styles.label}>Asuransi Kesehatan</Text>
                    <Select
                      size="large"
                      loading={loading}
                      allowClear
                      placeholder="Pilih asuransi"
                      disabled={loading}
                      getPopupContainer={popupInParent}
                      notFoundContent="Tidak ada data"
                      options={insuranceOptions.map((o) => ({
                        value: o.value,
                        label: `${o.label} (${formatIDR(o.amount)})`,
                      }))}
                      value={form.insuranceKey ?? undefined}
                      onChange={(value) =>
                        update("insuranceKey", value ?? null)
                      }
                      style={{ width: "100%" }}
                    />
                  </div>
                </Col>

                <Col span={24} md={8}>
                  <div style={styles.formItem}>
                    <Text style={styles.label}>
                      Biaya Visa (Non-Refundable)
                    </Text>
                    <Select
                      size="large"
                      loading={loading}
                      allowClear
                      placeholder="Pilih biaya visa"
                      disabled={loading}
                      getPopupContainer={popupInParent}
                      notFoundContent="Tidak ada data"
                      options={visaOptions.map((o) => ({
                        value: o.value,
                        label: `${o.label} (${formatIDR(o.amount)})`,
                      }))}
                      value={form.visaKey ?? undefined}
                      onChange={(value) => update("visaKey", value ?? null)}
                      style={{ width: "100%" }}
                    />
                  </div>
                </Col>

                <Col span={24} md={12}>
                  <div style={styles.formItem}>
                    <Text style={styles.label}>Biaya Kuliah (1 term)</Text>
                    <InputNumber
                      size="large"
                      min={0}
                      style={{ ...styles.input, width: "100%" }}
                      value={form.biayaKuliahTerm ?? null}
                      onChange={(value) =>
                        update("biayaKuliahTerm", Number(value ?? 0))
                      }
                      formatter={(value) => formatIDR(value)}
                      parser={(value) => parseIDR(value)}
                      placeholder="Rp 0"
                    />
                  </div>
                </Col>

                <Col span={24} md={12}>
                  <div style={styles.formItem}>
                    <Text style={styles.label}>
                      Jumlah Term Yang Dibayarkan
                    </Text>
                    <Select
                      size="large"
                      allowClear
                      placeholder="Pilih term"
                      options={termOptions}
                      value={form.jumlahTerm ?? undefined}
                      onChange={(value) => update("jumlahTerm", value ?? null)}
                      style={{ width: "100%" }}
                    />
                  </div>
                </Col>
              </Row>

              <Divider style={{ margin: "16px 0 20px" }} />

              <Title level={5} style={styles.subTitle}>
                Add-ons
              </Title>

              {loading ? (
                <Space direction="vertical" size={12} style={{ width: "100%" }}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton.Button
                      key={i}
                      active
                      block
                      style={{ height: 56 }}
                    />
                  ))}
                </Space>
              ) : (
                <Space direction="vertical" size={12} style={{ width: "100%" }}>
                  {addonList.map((addon) => (
                    <div key={addon.key} style={styles.addonRow}>
                      <Checkbox
                        checked={!!form.addons[addon.key]}
                        onChange={(e) =>
                          toggleAddon(addon.key, e.target.checked)
                        }
                      >
                        <div>
                          <div style={styles.addonLabel}>{addon.label}</div>
                          {addon.note ? (
                            <div style={styles.addonNote}>{addon.note}</div>
                          ) : null}
                        </div>
                      </Checkbox>
                      <Text strong>{formatIDR(addon.amount)}</Text>
                    </div>
                  ))}
                </Space>
              )}
            </Space>
          </Card>

          <Card style={styles.card} bodyStyle={styles.cardBody}>
            <div ref={estimatedRef} style={{ background: "#fff" }}>
              <Space direction="vertical" size={12} style={{ width: "100%" }}>
                <Title level={4} style={styles.sectionTitle}>
                  Estimated Costs
                </Title>

                <div style={styles.estList}>
                  {[
                    ["Nama Student", form.namaStudent || "—"],
                    ["Nama Kampus", form.namaKampus || "—"],
                    ["Lokasi Kampus", form.lokasiKampus || "—"],
                    ["Jurusan", form.jurusan || "—"],
                    ["Intake", form.intake || "—"],
                    [
                      "Service Fee (Non-Refundable)",
                      serviceFee
                        ? `${serviceFee.label} (${formatIDR(
                            serviceFee.amount
                          )})`
                        : "—",
                    ],
                    [
                      "Asuransi Kesehatan (Refundable)",
                      insurance
                        ? `${insurance.label} (${formatIDR(insurance.amount)})`
                        : "—",
                    ],
                    [
                      "Jumlah Term Yang Dibayar ke Kampus",
                      form.jumlahTerm || "—",
                    ],
                    [
                      "Biaya Visa (Non-Refundable)",
                      visa ? `${visa.label} (${formatIDR(visa.amount)})` : "—",
                    ],
                    [
                      "Add-Ons (Non-Refundable)",
                      selectedAddons.length
                        ? selectedAddons.map((i) => i.label).join(", ")
                        : "—",
                    ],
                  ].map(([label, value]) => (
                    <div key={label} style={styles.estRow}>
                      <span style={styles.estKey}>{label}</span>
                      <span style={styles.estValue}>{value}</span>
                    </div>
                  ))}
                </div>

                <Divider style={{ margin: "10px 0" }} />

                <div style={styles.totalWrap}>
                  <span>Total Estimated Cost</span>
                  <span style={styles.totalValue}>{formatIDR(totalIDR)}</span>
                </div>
              </Space>
            </div>

            <div style={styles.actionBar}>
              <Button
                size="large"
                type="primary"
                icon={<MessageCircle size={18} />}
                onClick={goConsult}
                style={styles.primaryBtn}
              >
                Konsultasi
              </Button>
              <Button
                size="large"
                icon={<FileDown size={18} />}
                onClick={handleDownloadPDF}
                style={styles.secondaryBtn}
              >
                Download
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
