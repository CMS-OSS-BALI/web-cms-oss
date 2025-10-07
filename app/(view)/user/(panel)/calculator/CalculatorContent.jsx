"use client";

import React, { useRef, useCallback } from "react";
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
    background: "#ffffff",
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

export default function CalculatorContent() {
  const vm = useCalculatorViewModel();
  const loading = vm.isOptionsLoading;
  const fetchError = vm.error;

  // === ref + handler download PDF (blok Estimated Costs) ===
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
    const safeName = (vm.form.namaStudent || "Student")
      .toString()
      .replace(/[^\w-]+/g, "_");
    pdf.save(`Estimated_Costs_${safeName}.pdf`);
  }, [vm.form.namaStudent]);

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
                      value={vm.form.namaStudent ?? ""}
                      onChange={(e) => vm.update("namaStudent", e.target.value)}
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
                      value={vm.form.namaKampus ?? ""}
                      onChange={(e) => vm.update("namaKampus", e.target.value)}
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
                      value={vm.form.lokasiKampus ?? ""}
                      onChange={(e) =>
                        vm.update("lokasiKampus", e.target.value)
                      }
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
                      value={vm.form.jurusan ?? ""}
                      onChange={(e) => vm.update("jurusan", e.target.value)}
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
                      value={vm.form.intake ?? ""}
                      onChange={(e) => vm.update("intake", e.target.value)}
                    />
                  </div>
                </Col>

                {/* --- HAPUS: Kolom "Kurs Hari Ini" --- */}

                <Col span={24} md={8}>
                  <div style={styles.formItem}>
                    <Text style={styles.label}>Service Fee</Text>
                    <Select
                      size="large"
                      loading={loading}
                      allowClear
                      placeholder="Pilih service fee"
                      disabled={loading || !vm.serviceFeeOptions.length}
                      options={(vm.serviceFeeOptions || []).map((o) => ({
                        value: o.value,
                        label: `${o.label} (${vm.formatIDR(o.amount)})`,
                      }))}
                      value={vm.form.serviceFeeKey ?? undefined}
                      onChange={(value) =>
                        vm.update("serviceFeeKey", value ?? null)
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
                      disabled={loading || !vm.insuranceOptions.length}
                      options={(vm.insuranceOptions || []).map((o) => ({
                        value: o.value,
                        label: `${o.label} (${vm.formatIDR(o.amount)})`,
                      }))}
                      value={vm.form.insuranceKey ?? undefined}
                      onChange={(value) =>
                        vm.update("insuranceKey", value ?? null)
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
                      disabled={loading || !vm.visaOptions.length}
                      options={(vm.visaOptions || []).map((o) => ({
                        value: o.value,
                        label: `${o.label} (${vm.formatIDR(o.amount)})`,
                      }))}
                      value={vm.form.visaKey ?? undefined}
                      onChange={(value) => vm.update("visaKey", value ?? null)}
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
                      value={vm.form.biayaKuliahTerm ?? null}
                      onChange={(value) =>
                        vm.update("biayaKuliahTerm", Number(value ?? 0))
                      }
                      formatter={(value) => vm.formatIDR(value)}
                      parser={(value) => vm.parseIDR(value)}
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
                      options={vm.termOptions}
                      value={vm.form.jumlahTerm ?? undefined}
                      onChange={(value) =>
                        vm.update("jumlahTerm", value ?? null)
                      }
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
                  {vm.addonList.map((addon) => (
                    <div key={addon.key} style={styles.addonRow}>
                      <Checkbox
                        checked={!!vm.form.addons[addon.key]}
                        onChange={(e) =>
                          vm.toggleAddon(addon.key, e.target.checked)
                        }
                      >
                        <div>
                          <div style={styles.addonLabel}>{addon.label}</div>
                          {addon.note ? (
                            <div style={styles.addonNote}>{addon.note}</div>
                          ) : null}
                        </div>
                      </Checkbox>
                      <Text strong>{vm.formatIDR(addon.amount)}</Text>
                    </div>
                  ))}
                </Space>
              )}
            </Space>
          </Card>

          <Card style={styles.card} bodyStyle={styles.cardBody}>
            {/* area yang di-export PDF */}
            <div ref={estimatedRef} style={{ background: "#fff" }}>
              <Space direction="vertical" size={12} style={{ width: "100%" }}>
                <Title level={4} style={styles.sectionTitle}>
                  Estimated Costs
                </Title>

                <div style={styles.estList}>
                  {[
                    ["Nama Student", vm.form.namaStudent ?? "—"],
                    ["Nama Kampus", vm.form.namaKampus ?? "—"],
                    ["Lokasi Kampus", vm.form.lokasiKampus ?? "—"],
                    ["Jurusan", vm.form.jurusan ?? "—"],
                    ["Intake", vm.form.intake ?? "—"],
                    // ["Kurs Hari Ini", vm.form.kurs ?? "—"],  // DIHAPUS
                    [
                      "Service Fee (Non-Refundable)",
                      vm.serviceFee
                        ? `${vm.serviceFee.label} (${vm.formatIDR(
                            vm.serviceFee.amount
                          )})`
                        : "—",
                    ],
                    [
                      "Asuransi Kesehatan (Refundable)",
                      vm.insurance
                        ? `${vm.insurance.label} (${vm.formatIDR(
                            vm.insurance.amount
                          )})`
                        : "—",
                    ],
                    [
                      "Jumlah Term Yang Dibayar ke Kampus",
                      vm.form.jumlahTerm ?? "—",
                    ],
                    [
                      "Biaya Visa (Non-Refundable)",
                      vm.visa
                        ? `${vm.visa.label} (${vm.formatIDR(vm.visa.amount)})`
                        : "—",
                    ],
                    [
                      "Add-Ons (Non-Refundable)",
                      vm.selectedAddons.length
                        ? vm.selectedAddons.map((i) => i.label).join(", ")
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
                  <span style={styles.totalValue}>
                    {vm.formatIDR(vm.totalIDR)}
                  </span>
                </div>
              </Space>
            </div>

            <div style={styles.actionBar}>
              <Button
                size="large"
                type="primary"
                icon={<MessageCircle size={18} />}
                onClick={vm.goConsult}
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
