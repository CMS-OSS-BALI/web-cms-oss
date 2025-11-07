"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ConfigProvider,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Empty,
  Skeleton,
  Popconfirm,
  Tooltip,
  Spin,
  Tag,
  Upload,
  notification,
} from "antd";
import {
  EyeOutlined,
  DeleteOutlined,
  EditOutlined,
  LeftOutlined,
  RightOutlined,
  SearchOutlined,
  FilterOutlined,
  DownloadOutlined,
  PaperClipOutlined,
  ReloadOutlined,
} from "@ant-design/icons";

/* =======================
   Lightweight Donut Pie
======================= */
const PIE_COLORS = [
  "#0b56c9",
  "#5aa8ff",
  "#8ab6ff",
  "#b3d4ff",
  "#d1e5ff",
  "#2c3e50",
];

function PieDonut({
  data,
  size = 240,
  inner = 86,
  palette = PIE_COLORS,
  centerTitle = "Total Mitra",
}) {
  const safe = Array.isArray(data) ? data : [];
  const total = Math.max(
    1,
    safe.reduce((a, b) => a + (Number(b.value) || 0), 0)
  );
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2;
  let acc = 0;
  const EPS = 1e-4;

  const polar = (cx, cy, r, a) => {
    const rad = ((a - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };
  const donutPath = (cx, cy, rO, rI, start, end) => {
    const large = end - start > 180 ? 1 : 0;
    const sO = polar(cx, cy, rO, start);
    const eO = polar(cx, cy, rO, end);
    const sI = polar(cx, cy, rI, end);
    const eI = polar(cx, cy, rI, start);
    return [
      `M ${sO.x} ${sO.y}`,
      `A ${rO} ${rO} 0 ${large} 1 ${eO.x} ${eO.y}`,
      `L ${sI.x} ${sI.y}`,
      `A ${rI} ${rI} 0 ${large} 0 ${eI.x} ${eI.y}`,
      "Z",
    ].join(" ");
  };

  const totalLabel = safe.reduce((a, b) => a + (Number(b.value) || 0), 0);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="Distribusi kategori mitra"
      style={{ display: "block" }}
    >
      {safe.map((d, i) => {
        const value = Number(d.value) || 0;
        if (value <= 0) return null;
        const pct = value / total;
        const angle = pct * 360;
        const start = acc;
        const end = acc + angle;
        acc = end;
        const fill = palette[i % palette.length];

        if (1 - pct < EPS) {
          return (
            <g key={i}>
              <circle cx={cx} cy={cy} r={r} fill={fill}>
                <title>{`${d.label}: ${value} (100%)`}</title>
              </circle>
            </g>
          );
        }
        return (
          <path
            key={i}
            d={donutPath(cx, cy, r, inner, start, Math.max(start + EPS, end))}
            fill={fill}
            stroke="#fff"
            strokeWidth="2"
          >
            <title>{`${d.label}: ${value} (${Math.round(pct * 100)}%)`}</title>
          </path>
        );
      })}
      <circle cx={cx} cy={cy} r={inner - 8} fill="#fff" />
      <text
        x={cx}
        y={cy - 2}
        textAnchor="middle"
        fontWeight="800"
        fontSize="22"
        fill="#0f172a"
      >
        {totalLabel}
      </text>
      <text x={cx} y={cy + 16} textAnchor="middle" fontSize="11" fill="#6b7280">
        {centerTitle}
      </text>
    </svg>
  );
}

/* ===== tokens & texts ===== */
const TOKENS = { shellW: "94%", maxW: 1140, blue: "#0b56c9", text: "#0f172a" };

const T = {
  title: "Manajemen Mitra",
  totalLabel: "Mitra",
  listTitle: "Data Mitra",
  searchPh: "Search",
  // table
  nameCol: "Mitra",
  statusCol: "Status",
  typeCol: "Tipe",
  dateCol: "Tanggal",
  action: "Aksi",
  // filters
  category: "Kategori",
  status: "Status",
  // detail / edit labels
  merchant: "Nama Mitra",
  email: "Email",
  phone: "No. Telepon",
  website: "Website",
  instagram: "Instagram",
  twitter: "Twitter",
  mou_url: "Link MoU",
  address: "Alamat",
  city: "Kota",
  province: "Provinsi",
  postal_code: "Kode Pos",
  contact_name: "Nama PIC",
  contact_position: "Jabatan PIC",
  contact_whatsapp: "WhatsApp PIC",
  categoryLbl: "Kategori",
  logo: "Logo / Gambar (1:1)",
  about: "Tentang",
  attachments: "Lampiran (opsional)",
  review_notes: "Catatan Review",
};

/* ===== helpers ===== */
const PUB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const PUB_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_BUCKET ||
  process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ||
  "";

const monthsId = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];
const fmtDateId = (dLike) => {
  if (dLike === null || dLike === undefined || dLike === "") return "-";
  try {
    const dt =
      typeof dLike === "number" ? new Date(dLike) : new Date(String(dLike));
    if (isNaN(dt.getTime())) return "-";
    return `${dt.getDate()} ${monthsId[dt.getMonth()]} ${dt.getFullYear()}`;
  } catch {
    return "-";
  }
};
const clip = (s) => (s ? String(s) : "â€”");
const isImg = (f) =>
  ["image/jpeg", "image/png", "image/webp", "image/svg+xml"].includes(
    f?.type || ""
  );
const tooBig = (f, mb = 10) => f.size / 1024 / 1024 > mb;

/** Build public URL from Supabase storage path when bucket is public */
const toPublicUrl = (pathOrUrl) => {
  const s = String(pathOrUrl || "");
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  if (PUB_URL && PUB_BUCKET) {
    return `${PUB_URL.replace(
      /\/$/,
      ""
    )}/storage/v1/object/public/${PUB_BUCKET}/${s.replace(/^\/+/, "")}`;
  }
  return s;
};
/** Derive filename from Supabase path */
const baseName = (p = "") => String(p).split("/").pop() || "file";
/** Build download href that ALWAYS works (private/public) */
const toDownloadHref = (storagePath = "", name) => {
  if (!storagePath) return "#";
  const n = encodeURIComponent(name || baseName(storagePath));
  const p = encodeURIComponent(String(storagePath));
  return `/api/supabase/download?path=${p}&name=${n}`;
};

export default function MerchantsContent({ vm }) {
  const viewModel = vm ?? require("./useMerchantsViewModel").default();
  const { shellW, maxW, blue, text } = TOKENS;

  // notifications
  const [api, contextHolder] = notification.useNotification();
  const toast = {
    ok: (m, d) =>
      api.success({ message: m, description: d, placement: "topRight" }),
    err: (m, d) =>
      api.error({ message: m, description: d, placement: "topRight" }),
    info: (m, d) =>
      api.info({ message: m, description: d, placement: "topRight" }),
  };

  // UI states
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [activeRow, setActiveRow] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [formEdit] = Form.useForm();

  // upload previews (logo)
  const [imgPrevEdit, setImgPrevEdit] = useState("");
  // cleanup blob url
  useEffect(() => {
    return () => {
      if (imgPrevEdit && imgPrevEdit.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(imgPrevEdit);
        } catch {}
      }
    };
  }, [imgPrevEdit]);

  // attachments delete list
  const [delAttach, setDelAttach] = useState([]);
  const toggleDelAttach = (id) =>
    setDelAttach((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  // new attachments
  const [newAttList, setNewAttList] = useState([]);

  // derived
  const rows = useMemo(() => viewModel.merchants || [], [viewModel.merchants]);

  // status counts (already respects q + category in VM)
  const pendingCount =
    viewModel.statusCounts?.pending ??
    rows.filter((r) => r.status === "PENDING").length;
  const approvedCount =
    viewModel.statusCounts?.approved ??
    rows.filter((r) => r.status === "APPROVED").length;
  const declinedCount =
    viewModel.statusCounts?.declined ??
    rows.filter((r) => r.status === "DECLINED").length;

  const chartStats = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => {
      const key = r?.category?.name || "Lainnya";
      map.set(key, (map.get(key) || 0) + 1);
    });
    const parts = Array.from(map.entries()).map(([label, count]) => ({
      label,
      count,
    }));
    const total = parts.reduce((a, b) => a + b.count, 0) || 1;
    return {
      parts: parts
        .sort((a, b) => b.count - a.count)
        .map((p) => ({ ...p, pct: Math.round((p.count / total) * 100) })),
      total,
    };
  }, [rows]);

  // Filters
  const [searchValue, setSearchValue] = useState(viewModel.q || "");
  useEffect(() => setSearchValue(viewModel.q || ""), [viewModel.q]);
  useEffect(() => {
    const t = setTimeout(() => {
      viewModel.setQ?.((searchValue || "").trim());
      viewModel.setPage?.(1);
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  // category remote
  useEffect(() => {
    viewModel.fetchCategoryOptions?.("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const onCategorySearch = (kw) => {
    viewModel.fetchCategoryOptions?.(kw);
  };

  const statusTag = (s) => {
    const v = String(s || "").toUpperCase();
    if (v === "APPROVED") return <Tag color="green">APPROVED</Tag>;
    if (v === "DECLINED") return <Tag color="red">DECLINED</Tag>;
    return <Tag color="gold">PENDING</Tag>;
  };

  // unify vm ops
  const vmGetDetail = viewModel.getDetail || viewModel.getMerchant;
  const vmUpdate = viewModel.update || viewModel.updateMerchant;
  const vmRemove = viewModel.remove || viewModel.deleteMerchant;
  const vmExport = viewModel.exportCsv || viewModel.exportCSV;

  // view
  const openView = async (row) => {
    setActiveRow(row);
    setViewOpen(true);
    setDetailLoading(true);
    setDetailData(null);
    const { ok, data, error } = (await vmGetDetail?.(row.id)) || {};
    setDetailLoading(false);
    if (!ok) {
      setViewOpen(false);
      return toast.err(
        "Gagal memuat detail",
        error || "Tidak dapat memuat data."
      );
    }
    setDetailData(data);
  };

  // edit
  const beforeImgEdit = (file) => {
    if (!isImg(file) || tooBig(file, 10)) return Upload.LIST_IGNORE;
    try {
      const url = URL.createObjectURL(file);
      setImgPrevEdit((prev) => {
        if (prev && prev.startsWith("blob:")) {
          try {
            URL.revokeObjectURL(prev);
          } catch {}
        }
        return url;
      });
    } catch {}
    return false;
  };

  const openEdit = async (row) => {
    setActiveRow(row);
    setEditOpen(true);
    setDetailLoading(true);
    setDetailData(null);
    setImgPrevEdit("");
    setDelAttach([]);
    setNewAttList([]);

    const { ok, data, error } = (await vmGetDetail?.(row.id)) || {};
    setDetailLoading(false);
    if (!ok) {
      setEditOpen(false);
      return toast.err(
        "Gagal memuat detail",
        error || "Tidak dapat memuat data."
      );
    }
    const d = data || row;
    setDetailData(d);

    formEdit.setFieldsValue({
      merchant_name: d.merchant_name || "",
      email: d.email || "",
      phone: d.phone || "",
      website: d.website || "",
      instagram: d.instagram || "",
      twitter: d.twitter || "",
      mou_url: d.mou_url || "",
      address: d.address || "",
      city: d.city || "",
      province: d.province || "",
      postal_code: d.postal_code || "",
      contact_name: d.contact_name || "",
      contact_position: d.contact_position || "",
      contact_whatsapp: d.contact_whatsapp || "",
      category_id: d.category?.id || undefined,
      about: d.about || "",
      status: (d.status || "PENDING").toUpperCase(),
      review_notes: d.review_notes || "",
    });

    setImgPrevEdit(toPublicUrl(d.image_url || ""));
    viewModel.fetchCategoryOptions?.("");
  };

  const onEditSubmit = async () => {
    if (!activeRow) return;
    const v = await formEdit.validateFields().catch(() => null);
    if (!v) return;

    const file = v.image?.[0]?.originFileObj || null;
    const newFiles = (newAttList || [])
      .map((i) => i.originFileObj)
      .filter(Boolean);

    const payload = {
      file,
      merchant_name: v.merchant_name,
      email: v.email,
      phone: v.phone,
      website: v.website || null,
      instagram: v.instagram || null,
      twitter: v.twitter || null,
      mou_url: v.mou_url || null,
      address: v.address,
      city: v.city || null,
      province: v.province || null,
      postal_code: v.postal_code || null,
      contact_name: v.contact_name || null,
      contact_position: v.contact_position || null,
      contact_whatsapp: v.contact_whatsapp || null,
      category_id: v.category_id || null,
      about: v.about ?? null,
      status: v.status,
      review_notes: v.review_notes ?? null,
      attachments_new: newFiles,
      attachments_to_delete: delAttach,
    };

    const res = (await vmUpdate?.(activeRow.id, payload)) || {};
    if (!res?.ok)
      return toast.err(
        "Gagal menyimpan",
        res?.error || "Perubahan tidak tersimpan."
      );

    toast.ok("Perubahan disimpan", "Data mitra berhasil diperbarui.");
    setEditOpen(false);
    formEdit.resetFields();
    setImgPrevEdit("");
    setDelAttach([]);
    setNewAttList([]);
  };

  const onDelete = async (id) => {
    const res = (await vmRemove?.(id)) || {};
    if (!res?.ok)
      return toast.err(
        "Gagal menghapus",
        res?.error || "Tidak bisa menghapus data."
      );
    toast.ok("Terhapus", "Mitra berhasil dihapus (soft delete).");
  };

  const onDownloadCsv = async () => {
    if (!vmExport)
      return toast.err("Tidak tersedia", "Fitur ekspor belum diimplementasi.");
    const blob = await vmExport();
    if (!blob) return toast.err("Gagal", "Tidak bisa membuat CSV.");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mitra_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <ConfigProvider
      componentSize="middle"
      theme={{
        token: {
          colorPrimary: blue,
          colorText: text,
          fontFamily:
            '"Public Sans", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
          borderRadius: 12,
          fontSize: 13,
          controlHeight: 36,
        },
        components: { Button: { borderRadius: 10 } },
      }}
    >
      {contextHolder}

      {/* paksa rasio 1:1 untuk Upload logo */}
      <style jsx global>{`
        .square-uploader.ant-upload.ant-upload-select-picture-card {
          width: 180px !important;
          height: 180px !important;
          padding: 0 !important;
        }
        .square-uploader .ant-upload {
          width: 100% !important;
          height: 100% !important;
        }

        /* responsive tweaks */
        @media (max-width: 960px) {
          .grid-stats {
            grid-template-columns: repeat(
              auto-fit,
              minmax(220px, 1fr)
            ) !important;
          }
          .grid-filters {
            grid-template-columns: 1fr !important;
          }
          .grid-chart {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <section
        style={{
          width: "100%",
          position: "relative",
          minHeight: "100dvh",
          display: "flex",
          alignItems: "flex-start",
          padding: "56px 0",
          overflowX: "hidden",
        }}
      >
        {/* background */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, #f8fbff 0%, #eef5ff 40%, #ffffff 100%)",
            zIndex: 0,
          }}
        />
        <div
          style={{
            width: shellW,
            maxWidth: maxW,
            margin: "0 auto",
            paddingTop: 12,
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* Header Card */}
          <div style={styles.cardOuter}>
            <div style={styles.cardHeaderBar} />
            <div style={styles.cardInner}>
              <div style={styles.cardTitle}>{T.title}</div>
              <div style={styles.totalBadgeWrap}>
                <div style={styles.totalBadgeLabel}>{T.totalLabel}</div>
                <div style={styles.totalBadgeValue}>
                  {viewModel.total ?? rows.length ?? "â€”"}
                </div>
              </div>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid-stats" style={styles.statsRow}>
            <div style={styles.statCard} aria-label="Jumlah Pending">
              <div style={styles.statIconBox}>
                <img
                  src="/image266.svg"
                  alt=""
                  aria-hidden="true"
                  style={styles.statIconImg}
                />
              </div>
              <div style={styles.statTitle}>Pending</div>
              <div style={styles.statValue}>{pendingCount ?? "â€”"}</div>
            </div>
            <div style={styles.statCard} aria-label="Jumlah Approved">
              <div style={styles.statIconBox}>
                <img
                  src="/image266.svg"
                  alt=""
                  aria-hidden="true"
                  style={styles.statIconImg}
                />
              </div>
              <div style={styles.statTitle}>Approved</div>
              <div style={styles.statValue}>{approvedCount ?? "â€”"}</div>
            </div>
            <div style={styles.statCard} aria-label="Jumlah Declined">
              <div style={styles.statIconBox}>
                <img
                  src="/image266.svg"
                  alt=""
                  aria-hidden="true"
                  style={styles.statIconImg}
                />
              </div>
              <div style={styles.statTitle}>Declined</div>
              <div style={styles.statValue}>{declinedCount ?? "â€”"}</div>
            </div>
          </div>

          {/* Chart (Pie) + legend */}
          <div style={{ ...styles.cardOuter, marginTop: 12 }}>
            <div style={{ ...styles.cardInner, paddingTop: 14 }}>
              <div style={styles.sectionHeader}>
                <div style={styles.sectionTitle}>
                  Persentase Peningkatan Mitra OSS
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={() => {
                      viewModel.reload?.();
                      viewModel.refreshStatusCounts?.();
                    }}
                  >
                    Refresh
                  </Button>
                  <Select
                    value="Tahun"
                    options={[{ value: "Tahun", label: "Tahun" }]}
                    style={{ width: 120 }}
                    disabled
                  />
                </div>
              </div>

              <div className="grid-chart" style={styles.chartRow}>
                <PieDonut
                  data={chartStats.parts.map((p) => ({
                    label: p.label,
                    value: p.count,
                  }))}
                  size={240}
                  inner={90}
                  palette={PIE_COLORS}
                  centerTitle="Total Mitra"
                />

                <div style={styles.chartTable}>
                  <div style={styles.chartThead}>
                    <div>Tipe Mitra</div>
                    <div style={styles.numHead}>Jumlah</div>
                    <div style={styles.numHead}>Persen</div>
                  </div>
                  <div style={{ display: "grid", gap: 6 }}>
                    {chartStats.parts.length === 0 ? (
                      <div style={{ padding: 10, color: "#64748b" }}>
                        Tidak ada data
                      </div>
                    ) : (
                      chartStats.parts.map((p, i) => (
                        <div key={p.label} style={styles.chartRowItem}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              minWidth: 0,
                            }}
                          >
                            <span
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius: 3,
                                background: PIE_COLORS[i % PIE_COLORS.length],
                                display: "inline-block",
                                flex: "0 0 10px",
                              }}
                              aria-hidden
                            />
                            <span
                              style={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {p.label}
                            </span>
                          </div>
                          <div style={styles.numCell}>{p.count}</div>
                          <div style={styles.numCell}>{p.pct}%</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Data Card */}
          <div style={{ ...styles.cardOuter, marginTop: 12 }}>
            <div style={{ ...styles.cardInner, paddingTop: 14 }}>
              <div style={styles.sectionHeader}>
                <div style={styles.sectionTitle}>{T.listTitle}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={onDownloadCsv}
                    style={{ borderRadius: 10 }}
                  >
                    Download CSV
                  </Button>
                </div>
              </div>

              {/* Filters (per page & reset removed) */}
              <div className="grid-filters" style={styles.filtersRow}>
                <Input
                  allowClear
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onPressEnter={() => {
                    viewModel.setQ?.((searchValue || "").trim());
                    viewModel.setPage?.(1);
                  }}
                  placeholder={T.searchPh}
                  prefix={<SearchOutlined />}
                  style={styles.searchInput}
                />
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                  }}
                >
                  <Select
                    allowClear
                    placeholder={T.category}
                    value={viewModel.categoryId || undefined}
                    onChange={(v) => {
                      viewModel.setCategoryId?.(v || "");
                      viewModel.setPage?.(1);
                    }}
                    onSearch={onCategorySearch}
                    showSearch
                    filterOption={false}
                    options={viewModel.categoryOptions}
                    style={styles.filterSelect}
                    suffixIcon={<FilterOutlined />}
                  />
                  <Select
                    allowClear
                    placeholder={T.status}
                    value={viewModel.status || undefined}
                    onChange={(v) => {
                      viewModel.setStatus?.(v || "");
                      viewModel.setPage?.(1);
                    }}
                    options={[
                      { value: "PENDING", label: "Pending" },
                      { value: "APPROVED", label: "Approved" },
                      { value: "DECLINED", label: "Declined" },
                    ]}
                    style={styles.filterSelect}
                    suffixIcon={<FilterOutlined />}
                  />
                </div>
              </div>

              {/* Table */}
              <div style={{ overflowX: "auto" }}>
                <div style={styles.tableHeader}>
                  <div style={{ ...styles.thLeft, paddingLeft: 8 }}>
                    {T.nameCol}
                  </div>
                  <div style={styles.thCenter}>{T.statusCol}</div>
                  <div style={styles.thCenter}>{T.typeCol}</div>
                  <div style={styles.thCenter}>{T.dateCol}</div>
                  <div style={styles.thCenter}>{T.action}</div>
                </div>

                <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
                  {viewModel.loading ? (
                    <div style={{ padding: "8px 4px" }}>
                      <Skeleton active paragraph={{ rows: 2 }} />
                    </div>
                  ) : rows.length === 0 ? (
                    <div
                      style={{
                        display: "grid",
                        placeItems: "center",
                        padding: "20px 0",
                      }}
                    >
                      <Empty description="Belum ada data" />
                    </div>
                  ) : (
                    rows.map((r) => {
                      const image = toPublicUrl(r.image_url);
                      const title = r.merchant_name || "(tanpa nama)";
                      // â¬‡ï¸ Fallback tanggal: reviewed_at -> created_ts -> created_at
                      const date = fmtDateId(
                        r.reviewed_at ?? r.created_ts ?? r.created_at
                      );
                      const cat = r.category?.name || "â€”";
                      return (
                        <div key={r.id} style={styles.row}>
                          {/* Mitra */}
                          <div style={styles.colName}>
                            <div style={styles.thumbBox}>
                              {image ? (
                                <img
                                  src={image}
                                  alt=""
                                  style={styles.thumbImg}
                                />
                              ) : (
                                <div style={styles.thumbFallback}>ðŸ¢</div>
                              )}
                            </div>
                            <div style={styles.nameWrap}>
                              <Tooltip title={title}>
                                <div style={styles.nameText}>{title}</div>
                              </Tooltip>
                              <div style={styles.subDate}>{date}</div>
                            </div>
                          </div>

                          {/* Status */}
                          <div style={styles.colCenter}>
                            {statusTag(r.status)}
                          </div>

                          {/* Tipe */}
                          <div style={styles.colCenter}>
                            <span style={styles.cellEllipsis}>{cat}</span>
                          </div>

                          {/* Tanggal */}
                          <div style={styles.colCenter}>{date}</div>

                          {/* Aksi */}
                          <div style={styles.colActionsCenter}>
                            <Tooltip title="Lihat">
                              <Button
                                size="small"
                                icon={<EyeOutlined />}
                                onClick={() => openView(r)}
                                style={styles.iconBtn}
                              />
                            </Tooltip>
                            <Tooltip title="Hapus">
                              <Popconfirm
                                title="Hapus mitra ini?"
                                okText="Ya"
                                cancelText="Batal"
                                onConfirm={() => onDelete(r.id)}
                              >
                                <Button
                                  size="small"
                                  danger
                                  icon={<DeleteOutlined />}
                                  style={styles.iconBtn}
                                />
                              </Popconfirm>
                            </Tooltip>
                            <Tooltip title="Edit">
                              <Button
                                size="small"
                                icon={<EditOutlined />}
                                onClick={() => openEdit(r)}
                                style={styles.iconBtn}
                              />
                            </Tooltip>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Pagination */}
              <div style={styles.pagination}>
                <Button
                  icon={<LeftOutlined />}
                  onClick={() =>
                    viewModel.setPage?.(Math.max(1, (viewModel.page || 1) - 1))
                  }
                  disabled={viewModel.page <= 1 || viewModel.loading}
                />
                <div style={styles.pageText}>
                  Page {viewModel.page}
                  {viewModel.totalPages ? ` of ${viewModel.totalPages}` : ""}
                </div>
                <Button
                  icon={<RightOutlined />}
                  onClick={() => viewModel.setPage?.((viewModel.page || 1) + 1)}
                  disabled={
                    viewModel.loading ||
                    (viewModel.totalPages
                      ? viewModel.page >= viewModel.totalPages
                      : rows.length < (viewModel.perPage || 10))
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== View Modal ===== */}
      <Modal
        open={viewOpen}
        onCancel={() => {
          setViewOpen(false);
          setDetailData(null);
        }}
        footer={null}
        width={900}
        destroyOnClose
        title={null}
      >
        <div style={styles.modalShell}>
          <Spin spinning={detailLoading}>
            {detailData ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                }}
              >
                {/* logo */}
                <div
                  style={{
                    gridColumn: "1 / span 2",
                    display: "grid",
                    justifyContent: "center",
                  }}
                >
                  <div style={styles.coverBoxRead}>
                    {detailData.image_url ? (
                      <img
                        src={toPublicUrl(detailData.image_url)}
                        alt="logo"
                        style={styles.coverImgRead}
                      />
                    ) : (
                      <div style={{ padding: 24, textAlign: "center" }}>
                        Tidak ada logo
                      </div>
                    )}
                  </div>
                </div>

                {/* kiri */}
                <div>
                  <div style={styles.label}>{T.merchant}</div>
                  <div style={styles.value}>
                    {clip(detailData.merchant_name)}
                  </div>
                </div>
                <div>
                  <div style={styles.label}>{T.categoryLbl}</div>
                  <div style={styles.value}>
                    {clip(detailData.category?.name)}
                  </div>
                </div>

                <div>
                  <div style={styles.label}>{T.email}</div>
                  <div style={styles.value}>{clip(detailData.email)}</div>
                </div>
                <div>
                  <div style={styles.label}>{T.phone}</div>
                  <div style={styles.value}>{clip(detailData.phone)}</div>
                </div>

                <div>
                  <div style={styles.label}>{T.website}</div>
                  <div style={styles.value}>{clip(detailData.website)}</div>
                </div>
                <div>
                  <div style={styles.label}>{T.instagram}</div>
                  <div style={styles.value}>{clip(detailData.instagram)}</div>
                </div>

                <div>
                  <div style={styles.label}>{T.twitter}</div>
                  <div style={styles.value}>{clip(detailData.twitter)}</div>
                </div>
                <div>
                  <div style={styles.label}>{T.mou_url}</div>
                  <div style={styles.value}>{clip(detailData.mou_url)}</div>
                </div>

                <div style={{ gridColumn: "1 / span 2" }}>
                  <div style={styles.label}>{T.address}</div>
                  <div style={styles.value}>{clip(detailData.address)}</div>
                </div>

                <div>
                  <div style={styles.label}>{T.city}</div>
                  <div style={styles.value}>{clip(detailData.city)}</div>
                </div>
                <div>
                  <div style={styles.label}>{T.province}</div>
                  <div style={styles.value}>{clip(detailData.province)}</div>
                </div>

                <div>
                  <div style={styles.label}>{T.postal_code}</div>
                  <div style={styles.value}>{clip(detailData.postal_code)}</div>
                </div>
                <div>
                  <div style={styles.label}>Status</div>
                  <div style={styles.value}>{statusTag(detailData.status)}</div>
                </div>

                <div>
                  <div style={styles.label}>{T.contact_name}</div>
                  <div style={styles.value}>
                    {clip(detailData.contact_name)}
                  </div>
                </div>
                <div>
                  <div style={styles.label}>{T.contact_position}</div>
                  <div style={styles.value}>
                    {clip(detailData.contact_position)}
                  </div>
                </div>

                <div>
                  <div style={styles.label}>{T.contact_whatsapp}</div>
                  <div style={styles.value}>
                    {clip(detailData.contact_whatsapp)}
                  </div>
                </div>
                <div>
                  <div style={styles.label}>{T.review_notes}</div>
                  <div style={styles.value}>
                    {clip(detailData.review_notes)}
                  </div>
                </div>

                <div style={{ gridColumn: "1 / span 2" }}>
                  <div style={styles.label}>{T.about}</div>
                  <div style={{ ...styles.value, whiteSpace: "pre-wrap" }}>
                    {clip(detailData.about)}
                  </div>
                </div>

                {/* Lampiran: gunakan signed URL via API */}
                <div style={{ gridColumn: "1 / span 2" }}>
                  <div style={styles.label}>Lampiran</div>
                  <div style={{ ...styles.value, display: "grid", gap: 6 }}>
                    {(detailData.files || []).length === 0 ? (
                      <span style={{ color: "#64748b" }}>
                        Tidak ada lampiran
                      </span>
                    ) : (
                      detailData.files.map((f) => {
                        const href = toDownloadHref(
                          f.file_url,
                          baseName(f.file_url)
                        );
                        return (
                          <div
                            key={f.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <PaperClipOutlined />
                            <a
                              href={href}
                              style={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                color: "#0b56c9",
                                fontWeight: 600,
                              }}
                              title={baseName(f.file_url)}
                            >
                              {baseName(f.file_url)}
                            </a>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </Spin>
        </div>
      </Modal>

      {/* ===== Edit Modal ===== */}
      <Modal
        open={editOpen}
        onCancel={() => {
          setEditOpen(false);
          setDetailData(null);
          setImgPrevEdit("");
          setDelAttach([]);
          setNewAttList([]);
          formEdit.resetFields();
        }}
        footer={null}
        width={960}
        destroyOnClose
        title={null}
      >
        <div style={styles.modalShell}>
          <Spin spinning={detailLoading}>
            <Form layout="vertical" form={formEdit}>
              {/* Gambar di atas */}
              <div
                style={{
                  display: "grid",
                  justifyContent: "center",
                  marginBottom: 10,
                }}
              >
                <Form.Item
                  name="image"
                  valuePropName="fileList"
                  getValueFromEvent={(e) =>
                    Array.isArray(e) ? e : e?.fileList || []
                  }
                  label={T.logo}
                  style={{ marginBottom: 8 }}
                >
                  <Upload
                    accept="image/*"
                    listType="picture-card"
                    showUploadList={false}
                    beforeUpload={beforeImgEdit}
                    className="square-uploader"
                  >
                    <div style={styles.coverBox}>
                      {imgPrevEdit ? (
                        <img
                          src={imgPrevEdit}
                          alt="logo"
                          style={styles.coverImg}
                        />
                      ) : (
                        <div style={styles.coverPlaceholder}>+ {T.logo}</div>
                      )}
                    </div>
                  </Upload>
                </Form.Item>
              </div>

              {/* Field 2 kolom */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                <Form.Item
                  label={T.merchant}
                  name="merchant_name"
                  rules={[{ required: true, message: "Wajib diisi" }]}
                >
                  <Input placeholder="Nama mitra" />
                </Form.Item>
                <Form.Item label={T.categoryLbl} name="category_id">
                  <Select
                    allowClear
                    showSearch
                    placeholder="Pilih kategori"
                    filterOption={false}
                    onSearch={(kw) => viewModel.fetchCategoryOptions?.(kw)}
                    options={viewModel.categoryOptions}
                  />
                </Form.Item>

                <Form.Item
                  label={T.email}
                  name="email"
                  rules={[{ required: true, message: "Wajib diisi" }]}
                >
                  <Input placeholder="email@domain.com" />
                </Form.Item>
                <Form.Item
                  label={T.phone}
                  name="phone"
                  rules={[{ required: true, message: "Wajib diisi" }]}
                >
                  <Input placeholder="08xxxxxxxxxx" />
                </Form.Item>

                <Form.Item label={T.website} name="website">
                  <Input placeholder="https://..." />
                </Form.Item>
                <Form.Item label={T.instagram} name="instagram">
                  <Input placeholder="@handle" />
                </Form.Item>

                <Form.Item label={T.twitter} name="twitter">
                  <Input placeholder="@handle" />
                </Form.Item>
                <Form.Item label={T.mou_url} name="mou_url">
                  <Input placeholder="https://..." />
                </Form.Item>

                <Form.Item
                  label={T.address}
                  name="address"
                  style={{ gridColumn: "1 / span 2" }}
                  rules={[{ required: true, message: "Wajib diisi" }]}
                >
                  <Input.TextArea rows={3} placeholder="Alamat lengkap" />
                </Form.Item>

                <Form.Item label={T.city} name="city">
                  <Input />
                </Form.Item>
                <Form.Item label={T.province} name="province">
                  <Input />
                </Form.Item>

                <Form.Item label={T.postal_code} name="postal_code">
                  <Input />
                </Form.Item>
                <Form.Item label="Status" name="status">
                  <Select
                    options={[
                      { value: "PENDING", label: "Pending" },
                      { value: "APPROVED", label: "Approved" },
                      { value: "DECLINED", label: "Declined" },
                    ]}
                  />
                </Form.Item>

                <Form.Item label={T.contact_name} name="contact_name">
                  <Input />
                </Form.Item>
                <Form.Item label={T.contact_position} name="contact_position">
                  <Input />
                </Form.Item>

                <Form.Item label={T.contact_whatsapp} name="contact_whatsapp">
                  <Input />
                </Form.Item>
                <Form.Item label={T.review_notes} name="review_notes">
                  <Input />
                </Form.Item>

                <Form.Item
                  label={T.about}
                  name="about"
                  style={{ gridColumn: "1 / span 2" }}
                >
                  <Input.TextArea rows={4} placeholder="Deskripsi singkat" />
                </Form.Item>
              </div>

              {/* Lampiran lama + hapus */}
              <div style={{ marginTop: 8 }}>
                <div style={styles.label}>Lampiran yang sudah ada</div>
                <div style={{ ...styles.value, display: "grid", gap: 6 }}>
                  {(detailData?.files || []).length === 0 ? (
                    <span style={{ color: "#64748b" }}>Tidak ada lampiran</span>
                  ) : (
                    (detailData?.files || []).map((f) => {
                      const href = toDownloadHref(
                        f.file_url,
                        baseName(f.file_url)
                      );
                      const marked = delAttach.includes(f.id);
                      return (
                        <div
                          key={f.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <PaperClipOutlined />
                          <a
                            href={href}
                            style={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              flex: 1,
                              color: "#0b56c9",
                              fontWeight: 600,
                              textDecoration: marked ? "line-through" : "none",
                            }}
                            title={baseName(f.file_url)}
                          >
                            {baseName(f.file_url)}
                          </a>
                          <Tag
                            color={marked ? "red" : "default"}
                            onClick={() => toggleDelAttach(f.id)}
                            style={{ cursor: "pointer", userSelect: "none" }}
                          >
                            {marked ? "Akan dihapus" : "Hapus?"}
                          </Tag>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Upload lampiran baru */}
              <div style={{ marginTop: 8 }}>
                <Form.Item label={T.attachments}>
                  <Upload
                    multiple
                    fileList={newAttList}
                    onChange={({ fileList }) => setNewAttList(fileList)}
                  >
                    <Button icon={<PaperClipOutlined />}>
                      Tambah Lampiran
                    </Button>
                  </Upload>
                </Form.Item>
              </div>

              <div style={styles.modalFooter}>
                <Button
                  type="primary"
                  size="large"
                  onClick={onEditSubmit}
                  loading={viewModel.opLoading}
                  style={styles.saveBtn}
                >
                  Simpan Perubahan
                </Button>
              </div>
            </Form>
          </Spin>
        </div>
      </Modal>
    </ConfigProvider>
  );
}

/* ===== styles ===== */
const GRID_COLS = "1.8fr 1fr 1fr .9fr .7fr";
/* Grid untuk tabel persentase: label | jumlah | persen */
const CHART_COLS = "1fr 96px 96px";

const styles = {
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

  totalBadgeWrap: {
    position: "absolute",
    right: 14,
    top: 8,
    display: "grid",
    gap: 4,
    justifyItems: "end",
    background: "#fff",
    border: "1px solid #e6eeff",
    borderRadius: 12,
    padding: "6px 12px",
    boxShadow: "0 6px 18px rgba(11,86,201,0.08)",
  },
  totalBadgeLabel: { fontSize: 12, color: "#0b3e91", fontWeight: 600 },
  totalBadgeValue: {
    fontSize: 16,
    color: "#0b56c9",
    fontWeight: 800,
    lineHeight: 1,
  },

  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 14,
    marginTop: 12,
  },
  statCard: {
    background: "#fff",
    borderRadius: 14,
    border: "1px solid #e6eeff",
    boxShadow: "0 10px 24px rgba(11,86,201,0.08)",
    padding: "12px 16px",
    display: "grid",
    gridTemplateColumns: "48px 1fr auto",
    alignItems: "center",
    columnGap: 12,
  },
  statIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    border: "1px solid #e6eeff",
    background: "#f8fbff",
    display: "grid",
    placeItems: "center",
    boxShadow: "inset 0 2px 8px rgba(11,86,201,0.06)",
  },
  statIconImg: {
    width: 32,
    height: 32,
    objectFit: "contain",
    display: "block",
  },
  statTitle: { fontWeight: 800, color: "#0b3e91", textAlign: "center" },
  statValue: { fontWeight: 800, fontSize: 24, color: "#0b56c9" },

  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 18, fontWeight: 800, color: "#0b3e91" },

  filtersRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr", // â† simplified (per page & reset removed)
    gap: 8,
    marginBottom: 10,
    alignItems: "center",
  },
  searchInput: { height: 36, borderRadius: 10 },
  filterSelect: { width: "100%" },

  chartRow: {
    display: "grid",
    gridTemplateColumns: "280px 1fr",
    gap: 14,
    alignItems: "center",
  },
  chartTable: {
    background: "#fff",
    borderRadius: 12,
    border: "1px solid #e6eeff",
    padding: 10,
  },
  chartThead: {
    display: "grid",
    gridTemplateColumns: CHART_COLS,
    fontWeight: 700,
    color: "#0b3e91",
    marginBottom: 6,
    alignItems: "center",
  },
  chartRowItem: {
    display: "grid",
    gridTemplateColumns: CHART_COLS,
    alignItems: "center",
    background: "#f5f8ff",
    padding: "6px 8px",
    borderRadius: 8,
    border: "1px solid #e8eeff",
  },
  /* Header & cell angka: right-align + tabular numbers */
  numHead: {
    textAlign: "right",
    fontVariantNumeric: "tabular-nums",
    fontFeatureSettings: '"tnum" 1, "lnum" 1',
  },
  numCell: {
    textAlign: "right",
    fontWeight: 700,
    color: "#0f172a",
    fontVariantNumeric: "tabular-nums",
    fontFeatureSettings: '"tnum" 1, "lnum" 1',
  },

  tableHeader: {
    display: "grid",
    gridTemplateColumns: GRID_COLS,
    gap: 8,
    marginBottom: 4,
    color: "#0b3e91",
    fontWeight: 700,
    alignItems: "center",
    minWidth: 980,
  },
  thLeft: { display: "flex", justifyContent: "flex-start", width: "100%" },
  thCenter: { display: "flex", justifyContent: "center", width: "100%" },

  row: {
    display: "grid",
    gridTemplateColumns: GRID_COLS,
    gap: 8,
    alignItems: "center",
    background: "#f5f8ff",
    borderRadius: 10,
    border: "1px solid #e8eeff",
    padding: "8px 10px",
    boxShadow: "0 6px 12px rgba(11, 86, 201, 0.05)",
    minWidth: 980,
  },

  colName: {
    background: "#ffffff",
    borderRadius: 10,
    border: "1px solid #eef3ff",
    padding: "6px 10px",
    display: "flex",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
  },
  thumbBox: {
    width: 44,
    height: 44,
    borderRadius: 8,
    background: "#fff",
    border: "1px solid #e5edff",
    display: "grid",
    placeItems: "center",
    overflow: "hidden",
    boxShadow: "0 2px 6px rgba(0,0,0,.04) inset",
    flex: "0 0 44px",
  },
  thumbImg: { width: "100%", height: "100%", objectFit: "cover" },
  thumbFallback: { fontSize: 18 },
  nameWrap: { display: "grid", gap: 2, minWidth: 0 },
  nameText: {
    fontWeight: 600,
    color: "#111827",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  subDate: { fontSize: 11.5, color: "#6b7280" },

  colCenter: {
    textAlign: "center",
    color: "#0f172a",
    fontWeight: 600,
    minWidth: 0,
  },
  cellEllipsis: {
    display: "inline-block",
    maxWidth: "100%",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    verticalAlign: "bottom",
  },

  colActionsCenter: { display: "flex", justifyContent: "center", gap: 6 },
  iconBtn: { borderRadius: 8 },

  pagination: {
    marginTop: 12,
    display: "grid",
    gridTemplateColumns: "36px 1fr 36px",
    alignItems: "center",
    justifyItems: "center",
    gap: 8,
  },
  pageText: { fontSize: 12, color: "#475569" },

  label: { fontSize: 11.5, color: "#64748b" },
  value: {
    fontWeight: 600,
    color: "#0f172a",
    background: "#f8fafc",
    border: "1px solid #e8eeff",
    borderRadius: 10,
    padding: "8px 10px",
    boxShadow: "inset 0 2px 6px rgba(11,86,201,0.05)",
    wordBreak: "break-word",
  },

  modalShell: {
    position: "relative",
    background: "#fff",
    borderRadius: 16,
    padding: "14px 14px 8px",
    boxShadow: "0 10px 36px rgba(11,86,201,0.08)",
  },

  coverBoxRead: {
    width: "100%",
    borderRadius: 12,
    border: "1px solid #e6eeff",
    overflow: "hidden",
    background: "#f8fbff",
    display: "grid",
    placeItems: "center",
  },
  coverImgRead: {
    maxWidth: "100%",
    maxHeight: "48vh",
    width: "auto",
    height: "auto",
    display: "block",
  },

  coverBox: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
    border: "2px dashed #c0c8d8",
    background: "#f8fbff",
    display: "grid",
    placeItems: "center",
    overflow: "hidden",
  },
  coverImg: { width: "100%", height: "100%", objectFit: "cover" },
  coverPlaceholder: { fontWeight: 700, color: "#0b56c9", userSelect: "none" },

  modalFooter: { marginTop: 8, display: "grid", placeItems: "center" },
  saveBtn: { minWidth: 220, height: 40, borderRadius: 12 },
};

