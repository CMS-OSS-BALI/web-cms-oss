"use client";

import React, {
  useRef,
  useCallback,
  useMemo,
  useEffect,
  useState,
} from "react";
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
  ConfigProvider,
} from "antd";
import { FileDown, MessageCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import useCalculatorViewModel from "./useCalculatorViewModel";

const { Title, Text } = Typography;

/* =========================
   TOKENS (shared)
========================= */
const TOKENS = {
  shellW: "96%",
  maxW: 1220,
  blue: "#0b56c9",
  text: "#0f172a",
};

/* =========================
   Locale helper (client)
========================= */
const pickLocaleClient = (lang, ls, fallback = "id") => {
  const v = String(lang || ls || fallback)
    .slice(0, 2)
    .toLowerCase();
  return v === "en" ? "en" : "id";
};

/* =========================
   i18n
========================= */
const T = (locale) =>
  locale === "en"
    ? {
        title: "PRICE CALCULATOR",
        formTitle: "Input Form",
        name: "Student Name",
        campusName: "Campus Name",
        campusLoc: "Campus Location",
        major: "Major",
        intake: "Intake",
        serviceFee: "Service Fee",
        insurance: "Health Insurance",
        visaFee: "Visa Fee (Non-Refundable)",
        tuition1Term: "Tuition (1 term)",
        termCount: "Number of Terms to Pay",
        addons: "Add-ons",
        nf: "No data",
        est: "Estimated Costs",
        total: "Total Estimated Cost",
        btnConsult: "Consult",
        btnDownload: "Download",
        placeholders: {
          student: "Enter student name",
          campus: "Enter campus name",
          loc: "Address / city, country",
          major: "e.g., Computer Science",
          intake: "e.g., 11 September 2024",
          fee: "Select…",
          term: "Select term",
        },
        labelsEst: {
          student: "Student Name",
          campus: "Campus Name",
          loc: "Campus Location",
          major: "Major",
          intake: "Intake",
          service: "Service Fee (Non-Refundable)",
          insurance: "Health Insurance (Refundable)",
          termCount: "Number of Terms Paid to Campus",
          visa: "Visa Fee (Non-Refundable)",
          addons: "Add-Ons (Non-Refundable)",
          dash: "—",
        },
        fetchFail: "Failed to load price options",
      }
    : {
        title: "PRICE CALCULATOR",
        formTitle: "Form Input",
        name: "Nama Student",
        campusName: "Nama Kampus",
        campusLoc: "Lokasi Kampus",
        major: "Jurusan",
        intake: "Intake",
        serviceFee: "Service Fee",
        insurance: "Asuransi Kesehatan",
        visaFee: "Biaya Visa (Non-Refundable)",
        tuition1Term: "Biaya Kuliah (1 term)",
        termCount: "Jumlah Term Yang Dibayarkan",
        addons: "Add-ons",
        nf: "Tidak ada data",
        est: "Estimated Costs",
        total: "Total Estimated Cost",
        btnConsult: "Konsultasi",
        btnDownload: "Download",
        placeholders: {
          student: "Isi nama student",
          campus: "Isi nama kampus",
          loc: "Alamat / kota, negara",
          major: "Contoh: Computer Science",
          intake: "Misal: 11 September 2024",
          fee: "Pilih…",
          term: "Pilih term",
        },
        labelsEst: {
          student: "Nama Student",
          campus: "Nama Kampus",
          loc: "Lokasi Kampus",
          major: "Jurusan",
          intake: "Intake",
          service: "Service Fee (Non-Refundable)",
          insurance: "Asuransi Kesehatan (Refundable)",
          termCount: "Jumlah Term Yang Dibayar ke Kampus",
          visa: "Biaya Visa (Non-Refundable)",
          addons: "Add-Ons (Non-Refundable)",
          dash: "—",
        },
        fetchFail: "Gagal memuat opsi harga",
      };

/* =========================
   Currency helpers
========================= */
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

/* =========================
   Reusable Glow Card
========================= */
function GlowCard({ children, style, bodyStyle }) {
  const [hover, setHover] = useState(false);
  const baseShadow =
    "0 10px 40px rgba(11,86,201,.08), 0 0 0 1px rgba(11,86,201,.06), 0 0 24px rgba(90,166,255,.18)";
  const hoverShadow =
    "0 16px 54px rgba(11,86,201,.12), 0 0 0 1px rgba(11,86,201,.10), 0 0 36px rgba(90,166,255,.28)";
  return (
    <Card
      style={{
        borderRadius: 16,
        border: "1px solid #e6eeff",
        background: "#fff",
        overflow: "hidden",
        boxShadow: hover ? hoverShadow : baseShadow,
        transform: hover ? "translateY(-2px)" : "translateY(0)",
        transition: "box-shadow .25s ease, transform .15s ease",
        ...style,
      }}
      bodyStyle={{ padding: 18, ...bodyStyle }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {children}
    </Card>
  );
}

export default function CalculatorContent(props) {
  const { initialLocale, locale: localeProp } = props || {};
  const search = useSearchParams();

  // ===== Locale client-side (sinkron dengan pattern page lain) =====
  const baseLocale = initialLocale || localeProp || "id";

  const locale = useMemo(() => {
    const fromQuery = search?.get("lang") || "";
    const fromLs =
      typeof window !== "undefined"
        ? window.localStorage.getItem("oss.lang") || ""
        : "";
    return pickLocaleClient(fromQuery, fromLs, baseLocale);
  }, [search, baseLocale]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("oss.lang", locale);
    }
  }, [locale]);

  // ===== ViewModel dieksekusi di client component =====
  const {
    loading,
    error: fetchError,
    categories,
  } = useCalculatorViewModel({
    locale,
    fallback: locale === "id" ? "en" : "id",
  });

  const t = T(locale);

  /* ========== Options from VM ========== */
  const serviceFeeOptions = useMemo(() => {
    const items = categories?.service_fee?.items || [];
    return items.map((s) => ({
      value: s.id,
      label: s.name || "(no title)",
      amount: Number(s.price || 0),
      raw: s,
    }));
  }, [categories]);

  const insuranceOptions = useMemo(() => {
    const items = categories?.asuransi?.items || [];
    return items.map((s) => ({
      value: s.id,
      label: s.name || "(no title)",
      amount: Number(s.price || 0),
      raw: s,
    }));
  }, [categories]);

  const visaOptions = useMemo(() => {
    const items = categories?.biaya_visa?.items || [];
    return items.map((s) => ({
      value: s.id,
      label: s.name || "(no title)",
      amount: Number(s.price || 0),
      raw: s,
    }));
  }, [categories]);

  const addonList = useMemo(() => {
    const items = categories?.addons?.items || [];
    return items.map((s) => ({
      key: s.id,
      label: s.name || "(no title)",
      amount: Number(s.price || 0),
      note: s.description || "",
      raw: s,
    }));
  }, [categories]);

  /* ========== Local form ========== */
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
  const toggleAddon = useCallback(
    (addonId, checked) =>
      setForm((p) => ({ ...p, addons: { ...p.addons, [addonId]: !!checked } })),
    []
  );

  /* ========== Derived values ========== */
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

  /* ========== PDF ========== */
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

  /* ========== Responsive (for halo sizing) ========== */
  const [vw, setVw] = useState(1280);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => setVw(window.innerWidth || 1280);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const isMobile = vw <= 640;

  /* ========== Styles (no background, with glow) ========== */
  const styles = {
    hero: {
      position: "relative",
      padding: isMobile ? "18px 0 8px" : "22px 0 10px",
    },
    heroInner: {
      width: "min(1040px, 96%)",
      margin: "0 auto",
      position: "relative",
    },
    heroTitleWrap: {
      position: "relative",
      display: "grid",
      placeItems: "center",
      isolation: "isolate",
    },
    heroHalo: {
      position: "absolute",
      top: -6,
      left: "50%",
      transform: "translateX(-50%)",
      width: isMobile ? "70%" : "55%",
      height: isMobile ? 70 : 90,
      background:
        "radial-gradient(60% 60% at 50% 40%, rgba(90,166,255,.35) 0%, rgba(11,86,201,.22) 35%, rgba(11,86,201,0) 70%)",
      filter: "blur(16px)",
      opacity: 0.9,
      borderRadius: 999,
      pointerEvents: "none",
      zIndex: -1,
    },
    heroTitle: {
      textAlign: "center",
      fontWeight: 900,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      color: "#0B3E91",
      fontSize: "clamp(26px, 3.6vw, 40px)",
      margin: 0,
      textShadow:
        "0 1px 0 rgba(255,255,255,.6), 0 0 18px rgba(90,166,255,.35), 0 0 30px rgba(11,86,201,.15)",
    },
    underline: {
      width: 140,
      height: 4,
      background:
        "linear-gradient(90deg, transparent 0%, #5aa6ff 40%, #5aa6ff 60%, transparent 100%)",
      borderRadius: 999,
      margin: "8px auto 0",
    },

    section: {
      width: "100%",
      padding: isMobile ? "10px 0 40px" : "16px 0 56px",
    },
    container: {
      width: TOKENS.shellW,
      maxWidth: TOKENS.maxW,
      margin: "0 auto",
    },

    grid: { marginTop: 12 },

    sectionTitle: {
      margin: "2px 0 10px",
      fontWeight: 800,
      fontSize: 18,
      letterSpacing: "0.05em",
      color: "#0B3E91",
      textTransform: "uppercase",
    },
    subTitle: {
      margin: "4px 0 8px",
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
      padding: "12px 14px",
      background: "#f7f9ff",
    },
    addonLabel: { color: "#0f2b5a", fontWeight: 600, letterSpacing: "0.02em" },
    addonNote: { fontSize: 12, color: "#5b709c", marginTop: 4 },

    estList: {
      display: "flex",
      flexDirection: "column",
      gap: 12,
      marginTop: 8,
    },
    estRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
      paddingBottom: 10,
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
      padding: "12px 16px",
      background:
        "linear-gradient(90deg, rgba(90,166,255,0.12) 0%, #ffffff 100%)",
      marginTop: 2,
    },
    totalValue: {
      fontSize: 20,
      fontWeight: 900,
      color: "#0B3E91",
      letterSpacing: "0.04em",
    },

    actionBar: {
      marginTop: 16,
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
      gap: 12,
    },

    sticky: { position: isMobile ? "static" : "sticky", top: 12 },
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: TOKENS.blue,
          colorText: TOKENS.text,
          fontFamily:
            '"Public Sans", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
          borderRadius: 12,
          fontSize: 13,
          controlHeight: 36,
        },
        components: { Button: { borderRadius: 10 } },
      }}
    >
      {/* HERO (halo glow) */}
      <div style={styles.hero}>
        <div style={styles.heroInner}>
          <div style={styles.heroTitleWrap}>
            <span aria-hidden style={styles.heroHalo} />
            <Title level={2} style={styles.heroTitle}>
              {t.title}
            </Title>
          </div>
          <div style={styles.underline} />
        </div>
      </div>

      {/* BODY */}
      <section data-shell="full" style={styles.section}>
        <div style={styles.container}>
          <Row gutter={[16, 16]} style={styles.grid}>
            {/* LEFT: form */}
            <Col xs={24} lg={14}>
              <GlowCard>
                <Space direction="vertical" size={12} style={{ width: "100%" }}>
                  <Title level={4} style={styles.sectionTitle}>
                    {t.formTitle}
                  </Title>

                  {fetchError ? (
                    <Alert
                      type="error"
                      showIcon
                      message={t.fetchFail}
                      description={String(fetchError)}
                    />
                  ) : null}

                  <Row gutter={[12, 16]}>
                    <Col xs={24}>
                      <div style={styles.formItem}>
                        <Text style={styles.label}>{t.name}</Text>
                        <Input
                          size="large"
                          placeholder={t.placeholders.student}
                          style={styles.input}
                          value={form.namaStudent}
                          onChange={(e) =>
                            update("namaStudent", e.target.value)
                          }
                        />
                      </div>
                    </Col>

                    <Col xs={24}>
                      <div style={styles.formItem}>
                        <Text style={styles.label}>{t.campusName}</Text>
                        <Input
                          size="large"
                          placeholder={t.placeholders.campus}
                          style={styles.input}
                          value={form.namaKampus}
                          onChange={(e) => update("namaKampus", e.target.value)}
                        />
                      </div>
                    </Col>

                    <Col xs={24}>
                      <div style={styles.formItem}>
                        <Text style={styles.label}>{t.campusLoc}</Text>
                        <Input
                          size="large"
                          placeholder={t.placeholders.loc}
                          style={styles.input}
                          value={form.lokasiKampus}
                          onChange={(e) =>
                            update("lokasiKampus", e.target.value)
                          }
                        />
                      </div>
                    </Col>

                    <Col xs={24} md={12}>
                      <div style={styles.formItem}>
                        <Text style={styles.label}>{t.major}</Text>
                        <Input
                          size="large"
                          placeholder={t.placeholders.major}
                          style={styles.input}
                          value={form.jurusan}
                          onChange={(e) => update("jurusan", e.target.value)}
                        />
                      </div>
                    </Col>

                    <Col xs={24} md={12}>
                      <div style={styles.formItem}>
                        <Text style={styles.label}>{t.intake}</Text>
                        <Input
                          size="large"
                          placeholder={t.placeholders.intake}
                          style={styles.input}
                          value={form.intake}
                          onChange={(e) => update("intake", e.target.value)}
                        />
                      </div>
                    </Col>

                    {/* Selects */}
                    <Col xs={24} sm={12} lg={8}>
                      <div style={styles.formItem}>
                        <Text style={styles.label}>{t.serviceFee}</Text>
                        <Select
                          size="large"
                          loading={loading}
                          allowClear
                          placeholder={t.placeholders.fee}
                          disabled={loading}
                          getPopupContainer={(el) =>
                            el?.parentElement || document.body
                          }
                          notFoundContent={t.nf}
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

                    <Col xs={24} sm={12} lg={8}>
                      <div style={styles.formItem}>
                        <Text style={styles.label}>{t.insurance}</Text>
                        <Select
                          size="large"
                          loading={loading}
                          allowClear
                          placeholder={t.placeholders.fee}
                          disabled={loading}
                          getPopupContainer={(el) =>
                            el?.parentElement || document.body
                          }
                          notFoundContent={t.nf}
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

                    <Col xs={24} lg={8}>
                      <div style={styles.formItem}>
                        <Text style={styles.label}>{t.visaFee}</Text>
                        <Select
                          size="large"
                          loading={loading}
                          allowClear
                          placeholder={t.placeholders.fee}
                          disabled={loading}
                          getPopupContainer={(el) =>
                            el?.parentElement || document.body
                          }
                          notFoundContent={t.nf}
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

                    <Col xs={24} md={12}>
                      <div style={styles.formItem}>
                        <Text style={styles.label}>{t.tuition1Term}</Text>
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

                    <Col xs={24} md={12}>
                      <div style={styles.formItem}>
                        <Text style={styles.label}>{t.termCount}</Text>
                        <Select
                          size="large"
                          allowClear
                          placeholder={t.placeholders.term}
                          options={termOptions}
                          value={form.jumlahTerm ?? undefined}
                          onChange={(value) =>
                            update("jumlahTerm", value ?? null)
                          }
                          style={{ width: "100%" }}
                        />
                      </div>
                    </Col>
                  </Row>

                  <Divider style={{ margin: "8px 0 12px" }} />

                  <Title level={5} style={styles.subTitle}>
                    {t.addons}
                  </Title>

                  {loading ? (
                    <Space
                      direction="vertical"
                      size={12}
                      style={{ width: "100%" }}
                    >
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
                    <Space
                      direction="vertical"
                      size={12}
                      style={{ width: "100%" }}
                    >
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
              </GlowCard>
            </Col>

            {/* RIGHT: summary */}
            <Col xs={24} lg={10}>
              <div style={styles.sticky}>
                <GlowCard>
                  <div ref={estimatedRef}>
                    <Space
                      direction="vertical"
                      size={12}
                      style={{ width: "100%" }}
                    >
                      <Title level={4} style={styles.sectionTitle}>
                        {t.est}
                      </Title>

                      <div style={styles.estList}>
                        {[
                          [
                            t.labelsEst.student,
                            form.namaStudent || t.labelsEst.dash,
                          ],
                          [
                            t.labelsEst.campus,
                            form.namaKampus || t.labelsEst.dash,
                          ],
                          [
                            t.labelsEst.loc,
                            form.lokasiKampus || t.labelsEst.dash,
                          ],
                          [t.labelsEst.major, form.jurusan || t.labelsEst.dash],
                          [t.labelsEst.intake, form.intake || t.labelsEst.dash],
                          [
                            t.labelsEst.service,
                            serviceFee
                              ? `${serviceFee.label} (${formatIDR(
                                  serviceFee.amount
                                )})`
                              : t.labelsEst.dash,
                          ],
                          [
                            t.labelsEst.insurance,
                            insurance
                              ? `${insurance.label} (${formatIDR(
                                  insurance.amount
                                )})`
                              : t.labelsEst.dash,
                          ],
                          [
                            t.labelsEst.termCount,
                            form.jumlahTerm || t.labelsEst.dash,
                          ],
                          [
                            t.labelsEst.visa,
                            visa
                              ? `${visa.label} (${formatIDR(visa.amount)})`
                              : t.labelsEst.dash,
                          ],
                          [
                            t.labelsEst.addons,
                            selectedAddons.length
                              ? selectedAddons.map((i) => i.label).join(", ")
                              : t.labelsEst.dash,
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
                        <span>{t.total}</span>
                        <span style={styles.totalValue}>
                          {formatIDR(totalIDR)}
                        </span>
                      </div>
                    </Space>
                  </div>

                  <div style={styles.actionBar}>
                    <Button
                      size="large"
                      type="primary"
                      icon={<MessageCircle size={18} />}
                      onClick={() => window.open("/contact", "_blank")}
                      style={{
                        height: 46,
                        borderRadius: 12,
                        fontWeight: 800,
                        letterSpacing: "0.05em",
                      }}
                    >
                      {t.btnConsult}
                    </Button>
                    <Button
                      size="large"
                      icon={<FileDown size={18} />}
                      onClick={handleDownloadPDF}
                      style={{
                        height: 46,
                        borderRadius: 12,
                        fontWeight: 700,
                        letterSpacing: "0.04em",
                      }}
                    >
                      {t.btnDownload}
                    </Button>
                  </div>
                </GlowCard>
              </div>
            </Col>
          </Row>
        </div>
      </section>
    </ConfigProvider>
  );
}
