"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import dayjs from "dayjs";
import {
  ConfigProvider,
  Button,
  Input,
  Select,
  Tag,
  Tooltip,
  Popconfirm,
  Empty,
  Skeleton,
  Modal,
  Spin,
  notification,
  Upload,
  Form,
  InputNumber,
  DatePicker,
} from "antd";
import {
  SearchOutlined,
  FilterOutlined,
  BarChartOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
  PlusOutlined,
  LeftOutlined,
  RightOutlined,
  QrcodeOutlined,
} from "@ant-design/icons";

/* ===== helpers ===== */
const fmtDateId = (dLike) => {
  if (!dLike && dLike !== 0) return "—";
  let ts = null;
  if (typeof dLike === "number") ts = dLike < 1e12 ? dLike * 1000 : dLike;
  else ts = new Date(String(dLike)).getTime();
  if (Number.isNaN(ts)) return "—";
  return new Date(ts).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};
const fmtIDR = (n) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(
    Math.round(Number(n || 0))
  );
const toTs = (v) => {
  if (v == null) return null;
  const n = Number(v);
  if (!Number.isNaN(n)) return n < 1e12 ? n * 1000 : n;
  const t = new Date(String(v)).getTime();
  return Number.isNaN(t) ? null : t;
};
const numFormatter = (val) => {
  if (val == null || val === "") return "";
  const s = String(val).replace(/\D/g, "");
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};
const numParser = (val) => (!val ? "" : val.replace(/\./g, ""));
const isImg = (f) =>
  ["image/jpeg", "image/png", "image/webp"].includes(f?.type || "");
const tooBig = (f, mb = 10) => (f?.size || 0) / 1024 / 1024 > mb;
const stripTags = (s) => (s ? String(s).replace(/<[^>]*>/g, "") : "");

/* normalizer supaya View & Edit konsisten */
const normalizeEvent = (src = {}) => {
  const get = (...keys) => {
    for (const k of keys) {
      if (k.includes(".")) {
        const parts = k.split(".");
        let cur = src;
        let ok = true;
        for (const p of parts) {
          cur = cur?.[p];
          if (cur == null) {
            ok = false;
            break;
          }
        }
        if (ok) return cur;
      } else if (src?.[k] != null) return src[k];
    }
    return undefined;
  };

  const pricing_type = String(
    get("pricing_type", "pricingType") || "FREE"
  ).toUpperCase();

  return {
    banner_url: get("banner_url", "bannerUrl", "banner", "image_url") || "",
    title_id: get("title_id", "title") || "",
    description_id: get("description_id", "description") || "",
    start_at: get("start_at", "start_ts", "start"),
    end_at: get("end_at", "end_ts", "end"),
    location: get("location", "venue", "place") || "",
    category_id: get("category_id"),
    category_name:
      get("category_name", "category.name", "category.label") || "—",
    is_published: !!get("is_published", "published", "isPublished"),
    capacity: get("capacity", "quota", "max_capacity") ?? null,
    pricing_type,
    ticket_price:
      pricing_type === "PAID"
        ? Number(get("ticket_price", "ticketPrice", "price") ?? 0)
        : 0,
    booth_price: Number(get("booth_price", "boothPrice") ?? 0),
    booth_quota: get("booth_quota", "boothQuota") ?? null,
  };
};

export default function EventsContent({ vm }) {
  const viewModel = vm ?? require("./useEventsViewModel").default?.();

  const TOKENS = {
    shellW: "94%",
    maxW: 1140,
    blue: "#0b56c9",
    text: "#0f172a",
  };
  const T = {
    title: "Manajemen Event",
    listTitle: "Daftar Event",
    searchPh: "Cari event (judul/kategori/tahun)",
    action: "Aksi",
    addNew: "Buat Event",
    csv: "Download CSV",
    scanner: "Scanner",
  };

  const [api, contextHolder] = notification.useNotification();
  const toast = {
    ok: (m, d) =>
      api.success({ message: m, description: d, placement: "topRight" }),
    err: (m, d) =>
      api.error({ message: m, description: d, placement: "topRight" }),
  };

  const rows = useMemo(() => viewModel?.events || [], [viewModel?.events]);
  const q = viewModel?.q ?? "";

  // --- Enhanced search: parse year & category dari input ---
  const onSearchNow = (rawInput) => {
    const raw = String(rawInput ?? q ?? "").trim();
    let text = raw;

    // 1) year 19xx/20xx
    const y = raw.match(/\b(19|20)\d{2}\b/);
    if (y) {
      const yearNum = Number(y[0]);
      if (!Number.isNaN(yearNum)) {
        viewModel?.setYear?.(yearNum);
        text = text.replace(y[0], "").trim();
      }
    }

    // 2) kategori
    const categories = viewModel?.categoryOptions || [];
    const lower = text.toLowerCase();
    let matched = categories.find(
      (c) => String(c.label || "").toLowerCase() === lower
    );
    if (!matched && lower) {
      matched = categories.find((c) =>
        String(c.label || "")
          .toLowerCase()
          .includes(lower)
      );
    }
    if (matched) {
      viewModel?.setCategoryId?.(matched.value);
      const onlyYear =
        y && (raw === y[0] || raw === `${y[0]} ` || raw === ` ${y[0]}`);
      if (onlyYear || lower === String(matched.label || "").toLowerCase()) {
        viewModel?.setQ?.("");
      } else viewModel?.setQ?.(text);
    } else {
      viewModel?.setQ?.(text);
    }

    viewModel?.setPage?.(1);
  };

  /* ===== view modal ===== */
  const [viewOpen, setViewOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewData, setViewData] = useState(null);

  const openView = async (row) => {
    setViewOpen(true);
    setViewLoading(true);
    try {
      let payload = null;
      if (typeof viewModel?.getEvent === "function") {
        const { ok, data, error } = await viewModel.getEvent(row.id, {
          includeCategory: true,
        });
        if (!ok) throw new Error(error || "Gagal memuat detail.");
        payload = data || row;
      } else {
        const r = await fetch(
          `/api/events/${row.id}?include_category=1&_=${Date.now()}`,
          { cache: "no-store" }
        );
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j?.error?.message || "Gagal memuat detail.");
        payload = j?.data || row;
      }
      setViewData(normalizeEvent(payload));
    } catch (e) {
      toast.err("Gagal memuat detail event", e?.message);
      setViewOpen(false);
      setViewData(null);
    } finally {
      setViewLoading(false);
    }
  };

  /* ===== create / edit ===== */
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeRow, setActiveRow] = useState(null);

  const [formCreate] = Form.useForm();
  const [formEdit] = Form.useForm();

  const [imgPrevCreate, setImgPrevCreate] = useState("");
  const [imgPrevEdit, setImgPrevEdit] = useState("");

  const categoryOptions = viewModel?.categoryOptions || [];
  const beforeImgCreate = (file) => {
    if (!isImg(file) || tooBig(file, 10)) return Upload.LIST_IGNORE;
    try {
      setImgPrevCreate(URL.createObjectURL(file));
    } catch {}
    return false;
  };
  const beforeImgEdit = (file) => {
    if (!isImg(file) || tooBig(file, 10)) return Upload.LIST_IGNORE;
    try {
      setImgPrevEdit(URL.createObjectURL(file));
    } catch {}
    return false;
  };
  const normList = (e) => (Array.isArray(e) ? e : e?.fileList || []);

  /* CREATE submit */
  const submitCreate = async (values) => {
    if (
      !values.title_id ||
      !values.start_at ||
      !values.end_at ||
      !values.location
    ) {
      toast.err("Form belum lengkap", "Judul, waktu, dan lokasi wajib diisi.");
      return;
    }
    if (
      values.pricing_type === "PAID" &&
      (!values.ticket_price || Number(values.ticket_price) < 1)
    ) {
      toast.err("Harga tiket tidak valid", "Event berbayar butuh harga tiket.");
      return;
    }

    const fd = new FormData();
    const file = values.image?.[0]?.originFileObj || null;
    if (file) fd.append("file", file);
    fd.append("title_id", values.title_id);
    if (values.description_id != null)
      fd.append("description_id", String(values.description_id));
    fd.append("start_at", dayjs(values.start_at).toDate().toISOString());
    fd.append("end_at", dayjs(values.end_at).toDate().toISOString());
    fd.append("location", values.location);
    if (values.category_id)
      fd.append("category_id", String(values.category_id));
    fd.append("is_published", String(values.is_published === true));
    if (!(values.capacity == null || values.capacity === "")) {
      fd.append("capacity", String(values.capacity));
    }
    fd.append("pricing_type", values.pricing_type || "FREE");
    if (values.pricing_type === "PAID")
      fd.append("ticket_price", String(values.ticket_price || 0));
    fd.append("booth_price", String(values.booth_price ?? 0));
    if (!(values.booth_quota == null || values.booth_quota === "")) {
      fd.append("booth_quota", String(values.booth_quota));
    }
    fd.append("autoTranslate", "true");

    let res;
    if (typeof viewModel?.createEvent === "function") {
      res = await viewModel.createEvent(fd);
    } else {
      const r = await fetch("/api/events?_=" + Date.now(), {
        method: "POST",
        body: fd,
      });
      const j = await r.json().catch(() => ({}));
      res = r.ok
        ? { ok: true, data: j?.data }
        : { ok: false, error: j?.error?.message || "Gagal" };
    }

    if (!res?.ok)
      return toast.err("Gagal membuat event", res?.error || "Periksa isian.");
    toast.ok("Berhasil", "Event berhasil dibuat.");
    setCreateOpen(false);
    formCreate.resetFields();
    setImgPrevCreate("");
    await viewModel?.refetch?.();
    viewModel?.setPage?.(1);
  };

  /* === NEW: open edit modal + prefill === */
  const openEdit = async (row) => {
    setEditOpen(true);
    setDetailLoading(true);
    setActiveRow(row);
    try {
      let payload = null;
      if (typeof viewModel?.getEvent === "function") {
        const { ok, data, error } = await viewModel.getEvent(row.id, {
          includeCategory: true,
        });
        if (!ok) throw new Error(error || "Gagal memuat data edit.");
        payload = data || row;
      } else {
        const r = await fetch(
          `/api/events/${row.id}?include_category=1&_=${Date.now()}`,
          { cache: "no-store" }
        );
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j?.error?.message || "Gagal memuat data.");
        payload = j?.data || row;
      }

      const e = normalizeEvent(payload);
      setImgPrevEdit(e.banner_url || "");
      formEdit.setFieldsValue({
        title_id: e.title_id || "",
        description_id: e.description_id || "",
        start_at: e.start_at ? dayjs(e.start_at) : null,
        end_at: e.end_at ? dayjs(e.end_at) : null,
        location: e.location || "",
        category_id: e.category_id || undefined,
        capacity:
          e.capacity == null || e.capacity === ""
            ? undefined
            : Number(e.capacity),
        pricing_type: e.pricing_type || "FREE",
        ticket_price:
          e.pricing_type === "PAID" ? Number(e.ticket_price || 0) : 0,
        booth_price: Number(e.booth_price || 0),
        booth_quota:
          e.booth_quota == null || e.booth_quota === ""
            ? undefined
            : Number(e.booth_quota),
        is_published: !!e.is_published,
        image: [],
      });
    } catch (err) {
      toast.err("Tidak bisa membuka form edit", err?.message);
      setEditOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  /* EDIT submit — no autoTranslate */
  const [pricingCreate, pricingEdit] = [
    Form.useWatch("pricing_type", formCreate),
    Form.useWatch("pricing_type", formEdit),
  ];

  const submitEdit = async (values) => {
    if (!activeRow?.id) return;
    if (!values.title_id) return toast.err("Judul (ID) wajib diisi");
    if (!values.start_at || !values.end_at)
      return toast.err("Waktu mulai & selesai wajib diisi");
    if (
      values.pricing_type === "PAID" &&
      (!values.ticket_price || Number(values.ticket_price) < 1)
    ) {
      return toast.err(
        "Harga tiket tidak valid",
        "Event berbayar butuh harga tiket."
      );
    }

    const fd = new FormData();
    const file = values.image?.[0]?.originFileObj || null;
    if (file) fd.append("file", file);
    fd.append("title_id", values.title_id);
    fd.append("description_id", String(values.description_id || ""));
    fd.append("start_at", dayjs(values.start_at).toDate().toISOString());
    fd.append("end_at", dayjs(values.end_at).toDate().toISOString());
    fd.append("location", values.location || "");
    fd.append("is_published", String(values.is_published === true));
    if (values.capacity == null || values.capacity === "")
      fd.append("capacity", "");
    else fd.append("capacity", String(values.capacity));
    fd.append("pricing_type", values.pricing_type || "FREE");
    if (values.pricing_type === "PAID")
      fd.append("ticket_price", String(values.ticket_price || 0));
    else fd.append("ticket_price", "0");
    fd.append("booth_price", String(values.booth_price ?? 0));
    if (values.booth_quota == null || values.booth_quota === "")
      fd.append("booth_quota", "");
    else fd.append("booth_quota", String(values.booth_quota));
    if (values.category_id)
      fd.append("category_id", String(values.category_id));
    else fd.append("category_id", ""); // kosongkan=disconnect

    let res;
    if (typeof viewModel?.updateEvent === "function") {
      res = await viewModel.updateEvent(activeRow.id, fd);
    } else {
      const r = await fetch(`/api/events/${activeRow.id}?_=${Date.now()}`, {
        method: "PATCH",
        body: fd,
      });
      const j = await r.json().catch(() => ({}));
      res = r.ok
        ? { ok: true, data: j?.data }
        : { ok: false, error: j?.error?.message || "Gagal" };
    }

    if (!res?.ok)
      return toast.err(
        "Gagal memperbarui event",
        res?.error || "Periksa isian."
      );
    toast.ok("Berhasil", "Perubahan berhasil disimpan.");
    setEditOpen(false);
    formEdit.resetFields();
    setImgPrevEdit("");
    await viewModel?.refetch?.();
  };

  const openCreate = () => {
    setCreateOpen(true);
    formCreate.resetFields();
    setImgPrevCreate("");
  };

  const goPrev = () =>
    viewModel?.setPage?.(Math.max(1, (viewModel?.page || 1) - 1));
  const goNext = () => viewModel?.setPage?.((viewModel?.page || 1) + 1);
  const statusPill = (s0, e0) => {
    const now = Date.now();
    const s = toTs(s0);
    const e = toTs(e0);
    if (s && e) {
      if (now < s) return <Tag color="blue">UPCOMING</Tag>;
      if (now >= s && now <= e) return <Tag color="green">ONGOING</Tag>;
      if (now > e) return <Tag color="default">DONE</Tag>;
    }
    return <Tag>—</Tag>;
  };

  const { shellW, maxW, blue, text } = TOKENS;

  return (
    <ConfigProvider
      componentSize="middle"
      theme={{
        token: {
          colorPrimary: blue,
          colorText: text,
          fontFamily:
            '"Poppins", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
          borderRadius: 12,
          fontSize: 13,
          controlHeight: 36,
        },
        components: { Button: { borderRadius: 10 } },
      }}
    >
      {contextHolder}

      <style jsx global>{`
        .landscape-uploader.ant-upload.ant-upload-select-picture-card {
          width: 320px !important;
          height: 180px !important;
          padding: 0 !important;
        }
        .landscape-uploader .ant-upload {
          width: 100% !important;
          height: 100% !important;
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
          {/* Header */}
          <div style={styles.cardOuter}>
            <div style={styles.cardHeaderBar} />
            <div style={styles.cardInner}>
              <div style={styles.cardTitle}>{T.title}</div>
              <div style={styles.totalBadgeWrap}>
                <div style={styles.totalBadgeLabel}>Total Event</div>
                <div style={styles.totalBadgeValue}>
                  {viewModel?.total ?? rows.length ?? "—"}
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div style={styles.statsRow}>
            <div style={styles.statCard}>
              <div style={styles.statIconBox}>
                <Image
                  src="/simbolstudent.png"
                  alt="Student"
                  width={28}
                  height={28}
                  style={styles.statIconImg}
                  priority
                />
              </div>
              <div style={styles.statTitle}>Total Student</div>
              <div style={styles.statValue}>
                {viewModel?.totalStudentsLoading
                  ? "…"
                  : viewModel?.totalStudents ?? "—"}
              </div>
            </div>

            <div style={styles.statCard}>
              <div style={styles.statIconBox}>
                <Image
                  src="/simbolrep.png"
                  alt="Rep"
                  width={28}
                  height={28}
                  style={styles.statIconImg}
                  priority
                />
              </div>
              <div style={styles.statTitle}>Total Representative</div>
              <div style={styles.statValue}>{viewModel?.totalReps ?? "—"}</div>
            </div>

            <div style={styles.statCard}>
              <div style={styles.statIconBox}>
                <Image
                  src="/revenue.png"
                  alt="Revenue"
                  width={28}
                  height={28}
                  style={styles.statIconImg}
                  priority
                />
              </div>
              <div style={styles.statTitle}>Total Revenue</div>
              <div
                style={styles.statValue}
                title="Estimasi dari booth sold x booth price"
              >
                {fmtIDR(viewModel?.totalRevenue || 0)}
              </div>
            </div>
          </div>

          {/* Charts */}
          <div style={{ ...styles.cardOuter, marginTop: 12 }}>
            <div style={{ ...styles.cardInner, paddingTop: 14 }}>
              <div style={styles.sectionHeader}>
                <div style={styles.sectionTitle}>Analisis Event</div>
                <Button
                  size="small"
                  icon={<BarChartOutlined />}
                  onClick={viewModel?.toggleCharts}
                >
                  {viewModel?.showCharts
                    ? "Sembunyikan Grafik"
                    : "Tampilkan Grafik"}
                </Button>
              </div>

              {!viewModel?.showCharts ? null : (
                <div style={styles.chartsGrid}>
                  <div style={styles.chartCard}>
                    <div style={styles.chartTitle}>Student</div>
                    {viewModel?.chartLoading ? (
                      <Skeleton active paragraph={{ rows: 3 }} />
                    ) : (viewModel?.chartStudent || []).length === 0 ? (
                      <Empty description="Belum ada data" />
                    ) : (
                      <div style={styles.barsArea}>
                        {viewModel.chartStudent.map((it) => (
                          <div key={it.id} style={styles.barItem}>
                            <div style={styles.barCol}>
                              <div
                                style={{
                                  ...styles.barInner,
                                  height: `${Math.min(100, it.percent)}%`,
                                }}
                                title={`${it.label}: ${it.value}`}
                              />
                            </div>
                            <div style={styles.barLabel} title={it.label}>
                              {it.short}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={styles.chartCard}>
                    <div style={styles.chartTitle}>Representative</div>
                    {viewModel?.chartLoading ? (
                      <Skeleton active paragraph={{ rows: 3 }} />
                    ) : (viewModel?.chartRep || []).length === 0 ? (
                      <Empty description="Belum ada data" />
                    ) : (
                      <div style={styles.barsArea}>
                        {viewModel.chartRep.map((it) => (
                          <div key={it.id} style={styles.barItem}>
                            <div style={styles.barCol}>
                              <div
                                style={{
                                  ...styles.barInnerAlt,
                                  height: `${Math.min(100, it.percent)}%`,
                                }}
                                title={`${it.label}: ${it.value}`}
                              />
                            </div>
                            <div style={styles.barLabel} title={it.label}>
                              {it.short}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Filters */}
          <div style={{ ...styles.cardOuter, marginTop: 12 }}>
            <div style={{ ...styles.cardInner, paddingTop: 14 }}>
              <div style={styles.filtersRowBig}>
                <Input
                  allowClear
                  value={q}
                  onChange={(e) => {
                    viewModel?.setQ?.(e.target.value);
                    viewModel?.setPage?.(1);
                  }}
                  onPressEnter={(e) => onSearchNow(e.currentTarget.value)}
                  placeholder={T.searchPh}
                  prefix={<SearchOutlined />}
                  style={styles.searchInput}
                />
                <Select
                  value={viewModel?.year ?? "ALL"}
                  onChange={(v) => {
                    viewModel?.setYear?.(v === "ALL" ? null : Number(v));
                    viewModel?.setPage?.(1);
                  }}
                  options={[
                    { value: "ALL", label: "Semua Tahun" },
                    ...(viewModel?.yearOptions || []).map((y) => ({
                      value: String(y),
                      label: String(y),
                    })),
                  ]}
                  style={{ minWidth: 140 }}
                  suffixIcon={<FilterOutlined />}
                />
                <Select
                  showSearch
                  allowClear
                  placeholder="Kategori"
                  value={viewModel?.categoryId || undefined}
                  onChange={(v) => {
                    viewModel?.setCategoryId?.(v || null);
                    viewModel?.setPage?.(1);
                  }}
                  filterOption={(input, opt) =>
                    String(opt?.label ?? "")
                      .toLowerCase()
                      .includes(String(input).toLowerCase())
                  }
                  options={categoryOptions}
                  style={{ minWidth: 220, width: "100%" }}
                />
                <Button
                  icon={<DownloadOutlined />}
                  onClick={() =>
                    viewModel
                      ?.downloadCSV?.()
                      .catch((e) => toast.err("Gagal unduh CSV", e?.message))
                  }
                >
                  {T.csv}
                </Button>

                <Button
                  icon={<QrcodeOutlined />}
                  onClick={viewModel?.goScanner}
                >
                  {T.scanner}
                </Button>

                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={openCreate}
                >
                  {T.addNew}
                </Button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div style={{ ...styles.cardOuter, marginTop: 12 }}>
            <div style={{ ...styles.cardInner, paddingTop: 14 }}>
              <div style={styles.sectionHeader}>
                <div style={styles.sectionTitle}>{T.listTitle}</div>
              </div>

              <div style={{ overflowX: "auto" }}>
                <div style={styles.tableHeader}>
                  <div style={{ ...styles.thLeft, paddingLeft: 8 }}>
                    Nama Event
                  </div>
                  <div style={styles.thCenter}>Status</div>
                  <div style={styles.thCenter}>Tanggal</div>
                  <div style={styles.thCenter}>Tempat</div>
                  <div style={styles.thCenter}>Kapasitas</div>
                  <div style={styles.thCenter}>Total Rep</div>
                  <div style={styles.thCenter}>{T.action}</div>
                </div>

                <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
                  {viewModel?.loading ? (
                    <div style={{ padding: "8px 4px" }}>
                      <Skeleton active paragraph={{ rows: 3 }} />
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
                    rows.map((r) => (
                      <div key={r.id} style={styles.row}>
                        <div style={styles.colName}>
                          <div style={styles.nameWrap}>
                            <div style={styles.nameText}>
                              {r.title || r.title_id || "(tanpa judul)"}
                            </div>
                            <div style={styles.subDate}>
                              {r.category_name
                                ? `Kategori: ${r.category_name}`
                                : "—"}
                            </div>
                          </div>
                        </div>
                        <div style={styles.colCenter}>
                          {statusPill(
                            r.start_ts || r.start_at,
                            r.end_ts || r.end_at
                          )}
                        </div>
                        <div style={styles.colCenter}>
                          <span style={styles.cellEllipsis}>
                            {fmtDateId(r.start_ts || r.start_at)}
                          </span>
                        </div>
                        <div style={styles.colCenter}>
                          <span style={styles.cellEllipsis}>
                            {r.location || "—"}
                          </span>
                        </div>
                        <div style={styles.colCenter}>
                          <span style={styles.cellEllipsis}>
                            {r.capacity == null ? "∞" : r.capacity}
                          </span>
                        </div>
                        <div style={styles.colCenter}>
                          <span style={styles.cellEllipsis}>
                            {r.booth_sold_count ?? 0}
                          </span>
                        </div>
                        <div style={styles.colActionsCenter}>
                          <Tooltip title="Lihat">
                            <Button
                              size="small"
                              icon={<EyeOutlined />}
                              onClick={() => openView(r)}
                              style={styles.iconBtn}
                            />
                          </Tooltip>
                          <Tooltip title="Edit">
                            <Button
                              size="small"
                              icon={<EditOutlined />}
                              onClick={() => openEdit(r)} // <<-- modal edit
                              style={styles.iconBtn}
                            />
                          </Tooltip>
                          <Tooltip title="Hapus">
                            <Popconfirm
                              title="Hapus event ini?"
                              okText="Ya"
                              cancelText="Batal"
                              onConfirm={async () => {
                                const res = await viewModel?.deleteEvent?.(
                                  r.id
                                );
                                if (!res?.ok)
                                  return toast.err(
                                    "Gagal menghapus",
                                    res?.error
                                  );
                                toast.ok(
                                  "Terhapus",
                                  "Event dihapus (soft delete)."
                                );
                                viewModel?.refetch?.();
                              }}
                            >
                              <Button
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                                loading={viewModel?.opLoading}
                                style={styles.iconBtn}
                              />
                            </Popconfirm>
                          </Tooltip>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div style={styles.pagination}>
                <Button
                  icon={<LeftOutlined />}
                  onClick={goPrev}
                  disabled={(viewModel?.page || 1) <= 1 || viewModel?.loading}
                />
                <div style={styles.pageText}>
                  Page {viewModel?.page || 1}
                  {viewModel?.totalPages ? ` of ${viewModel.totalPages}` : ""}
                </div>
                <Button
                  icon={<RightOutlined />}
                  onClick={goNext}
                  disabled={
                    viewModel?.loading ||
                    (viewModel?.totalPages
                      ? (viewModel?.page || 1) >= viewModel.totalPages
                      : rows.length < (viewModel?.perPage || 10))
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Create Modal ===== */}
      <Modal
        open={createOpen}
        onCancel={() => {
          setCreateOpen(false);
          setImgPrevCreate("");
          formCreate.resetFields();
        }}
        footer={null}
        width={920}
        destroyOnClose
        title={null}
      >
        <div style={styles.modalShell}>
          <Form layout="vertical" form={formCreate}>
            <div style={styles.coverWrap}>
              <Form.Item
                name="image"
                valuePropName="fileList"
                getValueFromEvent={normList}
                noStyle
              >
                <Upload
                  accept="image/*"
                  listType="picture-card"
                  showUploadList={false}
                  beforeUpload={beforeImgCreate}
                  className="landscape-uploader"
                >
                  <div style={styles.coverBox}>
                    {imgPrevCreate ? (
                      <img
                        src={imgPrevCreate}
                        alt="cover"
                        style={styles.coverImg}
                      />
                    ) : (
                      <div style={styles.coverPlaceholder}>+ Banner (16:9)</div>
                    )}
                  </div>
                </Upload>
              </Form.Item>
            </div>

            <Form.Item
              label="Judul (Bahasa Indonesia)"
              name="title_id"
              rules={[{ required: true, message: "Judul wajib diisi" }]}
            >
              <Input placeholder="cth: OSS Education Fair 2025" />
            </Form.Item>

            <Form.Item
              label="Deskripsi (Bahasa Indonesia)"
              name="description_id"
            >
              <Input.TextArea rows={3} placeholder="Deskripsi singkat..." />
            </Form.Item>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              <Form.Item
                label="Mulai"
                name="start_at"
                rules={[{ required: true, message: "Waktu mulai wajib diisi" }]}
              >
                <DatePicker showTime style={{ width: "100%" }} />
              </Form.Item>
              <Form.Item
                label="Selesai"
                name="end_at"
                rules={[
                  { required: true, message: "Waktu selesai wajib diisi" },
                ]}
              >
                <DatePicker showTime style={{ width: "100%" }} />
              </Form.Item>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              <Form.Item
                label="Lokasi"
                name="location"
                rules={[{ required: true, message: "Lokasi wajib diisi" }]}
              >
                <Input placeholder="cth: Bali Nusa Dua Convention Center" />
              </Form.Item>
              <Form.Item label="Kategori" name="category_id">
                <Select
                  allowClear
                  showSearch
                  placeholder="Pilih kategori"
                  options={categoryOptions}
                />
              </Form.Item>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 8,
              }}
            >
              <Form.Item label="Capacity" name="capacity">
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  controls={false}
                />
              </Form.Item>
              <Form.Item
                label="Tipe Tiket"
                name="pricing_type"
                initialValue="FREE"
              >
                <Select
                  options={[
                    { value: "FREE", label: "FREE" },
                    { value: "PAID", label: "PAID" },
                  ]}
                />
              </Form.Item>
              <Form.Item
                label="Harga Tiket"
                name="ticket_price"
                tooltip="Wajib diisi bila PAID"
              >
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  controls={false}
                  formatter={numFormatter}
                  parser={numParser}
                  disabled={(pricingCreate || "FREE") !== "PAID"}
                  placeholder="cth: 150.000"
                />
              </Form.Item>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 8,
              }}
            >
              <Form.Item
                label="Booth Price"
                name="booth_price"
                initialValue={0}
              >
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  controls={false}
                  formatter={numFormatter}
                  parser={numParser}
                />
              </Form.Item>
              <Form.Item label="Booth Quota" name="booth_quota">
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  controls={false}
                />
              </Form.Item>
              <Form.Item
                label="Published"
                name="is_published"
                initialValue={false}
              >
                <Select
                  options={[
                    { value: true, label: "Published" },
                    { value: false, label: "Draft" },
                  ]}
                />
              </Form.Item>
            </div>

            <div style={styles.modalFooter}>
              <Button
                type="primary"
                size="large"
                onClick={() => {
                  formCreate
                    .validateFields()
                    .then((v) => submitCreate(v))
                    .catch(() => {});
                }}
                style={styles.saveBtn}
              >
                Simpan
              </Button>
            </div>
          </Form>
        </div>
      </Modal>

      {/* ===== Edit Modal ===== */}
      <Modal
        open={editOpen}
        onCancel={() => {
          setEditOpen(false);
          setImgPrevEdit("");
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
              <div style={styles.coverWrap}>
                <Form.Item
                  name="image"
                  valuePropName="fileList"
                  getValueFromEvent={normList}
                  noStyle
                >
                  <Upload
                    accept="image/*"
                    listType="picture-card"
                    showUploadList={false}
                    beforeUpload={beforeImgEdit}
                    className="landscape-uploader"
                  >
                    <div style={styles.coverBox}>
                      {imgPrevEdit ? (
                        <img
                          src={imgPrevEdit}
                          alt="cover"
                          style={styles.coverImg}
                        />
                      ) : (
                        <div style={styles.coverPlaceholder}>
                          + Banner (16:9)
                        </div>
                      )}
                    </div>
                  </Upload>
                </Form.Item>
              </div>

              <Form.Item
                label="Judul (Bahasa Indonesia)"
                name="title_id"
                rules={[{ required: true, message: "Judul wajib diisi" }]}
              >
                <Input placeholder="cth: OSS Education Fair 2025" />
              </Form.Item>

              <Form.Item
                label="Deskripsi (Bahasa Indonesia)"
                name="description_id"
              >
                <Input.TextArea rows={3} placeholder="Deskripsi singkat..." />
              </Form.Item>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                <Form.Item
                  label="Mulai"
                  name="start_at"
                  rules={[
                    { required: true, message: "Waktu mulai wajib diisi" },
                  ]}
                >
                  <DatePicker showTime style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item
                  label="Selesai"
                  name="end_at"
                  rules={[
                    { required: true, message: "Waktu selesai wajib diisi" },
                  ]}
                >
                  <DatePicker showTime style={{ width: "100%" }} />
                </Form.Item>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                <Form.Item label="Lokasi" name="location">
                  <Input placeholder="cth: Bali Nusa Dua Convention Center" />
                </Form.Item>
                <Form.Item label="Kategori" name="category_id">
                  <Select
                    allowClear
                    showSearch
                    placeholder="Pilih kategori"
                    options={categoryOptions}
                  />
                </Form.Item>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 8,
                }}
              >
                <Form.Item label="Capacity" name="capacity">
                  <InputNumber
                    style={{ width: "100%" }}
                    min={0}
                    controls={false}
                  />
                </Form.Item>
                <Form.Item label="Tipe Tiket" name="pricing_type">
                  <Select
                    options={[
                      { value: "FREE", label: "FREE" },
                      { value: "PAID", label: "PAID" },
                    ]}
                  />
                </Form.Item>
                <Form.Item label="Harga Tiket" name="ticket_price">
                  <InputNumber
                    style={{ width: "100%" }}
                    min={0}
                    controls={false}
                    formatter={numFormatter}
                    parser={numParser}
                    disabled={(pricingEdit || "FREE") !== "PAID"}
                  />
                </Form.Item>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 8,
                }}
              >
                <Form.Item label="Booth Price" name="booth_price">
                  <InputNumber
                    style={{ width: "100%" }}
                    min={0}
                    controls={false}
                    formatter={numFormatter}
                    parser={numParser}
                  />
                </Form.Item>
                <Form.Item label="Booth Quota" name="booth_quota">
                  <InputNumber
                    style={{ width: "100%" }}
                    min={0}
                    controls={false}
                  />
                </Form.Item>
                <Form.Item label="Published" name="is_published">
                  <Select
                    options={[
                      { value: true, label: "Published" },
                      { value: false, label: "Draft" },
                    ]}
                  />
                </Form.Item>
              </div>

              <div style={styles.modalFooter}>
                <Button
                  type="primary"
                  size="large"
                  onClick={() => {
                    formEdit
                      .validateFields()
                      .then((v) => submitEdit(v))
                      .catch(() => {});
                  }}
                  style={styles.saveBtn}
                >
                  Simpan Perubahan
                </Button>
              </div>
            </Form>
          </Spin>
        </div>
      </Modal>

      {/* ===== View Modal ===== */}
      <Modal
        open={viewOpen}
        onCancel={() => {
          setViewOpen(false);
          setViewData(null);
        }}
        footer={null}
        width={920}
        destroyOnClose
        title={null}
      >
        <div style={styles.modalShell}>
          <Spin spinning={viewLoading}>
            {!viewData ? null : (
              <div style={{ display: "grid", gap: 10 }}>
                <div style={styles.coverWrap}>
                  <div style={styles.coverBox}>
                    {viewData.banner_url ? (
                      <img
                        src={viewData.banner_url}
                        alt="banner"
                        style={styles.coverImg}
                      />
                    ) : (
                      <div style={styles.coverPlaceholder}>
                        Tidak ada banner
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div style={styles.label}>Judul (Bahasa Indonesia)</div>
                  <div style={styles.value}>{viewData.title_id || "—"}</div>
                </div>
                <div>
                  <div style={styles.label}>Deskripsi (Bahasa Indonesia)</div>
                  <div style={{ ...styles.value, whiteSpace: "pre-wrap" }}>
                    {stripTags(viewData.description_id) || "—"}
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                  }}
                >
                  <div>
                    <div style={styles.label}>Mulai</div>
                    <div style={styles.value}>
                      {fmtDateId(viewData.start_at)}
                    </div>
                  </div>
                  <div>
                    <div style={styles.label}>Selesai</div>
                    <div style={styles.value}>{fmtDateId(viewData.end_at)}</div>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                  }}
                >
                  <div>
                    <div style={styles.label}>Lokasi</div>
                    <div style={styles.value}>{viewData.location || "—"}</div>
                  </div>
                  <div>
                    <div style={styles.label}>Kategori</div>
                    <div style={styles.value}>
                      {viewData.category_name || "—"}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                  }}
                >
                  <div>
                    <div style={styles.label}>Capacity</div>
                    <div style={styles.value}>
                      {viewData.capacity == null
                        ? "Tanpa batas"
                        : viewData.capacity}
                    </div>
                  </div>
                  <div>
                    <div style={styles.label}>Status</div>
                    <div style={styles.value}>
                      {viewData.is_published ? "Published" : "Draft"}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                  }}
                >
                  <div>
                    <div style={styles.label}>Tipe Tiket</div>
                    <div style={styles.value}>{viewData.pricing_type}</div>
                  </div>
                  <div>
                    <div style={styles.label}>Harga Tiket</div>
                    <div style={styles.value}>
                      {viewData.pricing_type === "PAID"
                        ? fmtIDR(viewData.ticket_price || 0)
                        : "—"}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                  }}
                >
                  <div>
                    <div style={styles.label}>Booth Price</div>
                    <div style={styles.value}>
                      {fmtIDR(viewData.booth_price || 0)}
                    </div>
                  </div>
                  <div>
                    <div style={styles.label}>Booth Quota</div>
                    <div style={styles.value}>
                      {viewData.booth_quota == null
                        ? "—"
                        : viewData.booth_quota}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Spin>
        </div>
      </Modal>
    </ConfigProvider>
  );
}

/* ===== styles ===== */
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
    gridTemplateColumns: "1fr 1fr 1fr",
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
  statIconImg: { width: 28, height: 28, objectFit: "contain" },
  statTitle: { fontWeight: 800, color: "#0b3e91", textAlign: "center" },
  statValue: { fontWeight: 800, fontSize: 24, color: "#0b56c9" },

  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 18, fontWeight: 800, color: "#0b3e91" },

  // + 1 kolom untuk tombol Scanner
  filtersRowBig: {
    display: "grid",
    gridTemplateColumns: "1fr 140px minmax(220px, 1fr) auto auto auto",
    gap: 8,
    alignItems: "center",
  },
  searchInput: { height: 36, borderRadius: 10 },

  chartsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  chartCard: {
    background: "#fff",
    border: "1px solid #e6eeff",
    borderRadius: 14,
    padding: "12px",
  },
  chartTitle: { fontWeight: 800, color: "#0b3e91", marginBottom: 8 },
  barsArea: {
    display: "grid",
    gridTemplateColumns: "repeat(8, minmax(0, 1fr))",
    gap: 10,
    height: 180,
    alignItems: "end",
  },
  barItem: { display: "grid", gap: 6, justifyItems: "center" },
  barCol: {
    width: "100%",
    height: "100%",
    background: "linear-gradient(180deg,#f3f7ff 0%,#fbfdff 100%)",
    border: "1px solid #e6eeff",
    borderRadius: 10,
    display: "flex",
    alignItems: "flex-end",
    padding: 4,
  },
  barInner: {
    width: "100%",
    borderRadius: 8,
    background:
      "linear-gradient(180deg, rgba(11,86,201,0.8) 0%, rgba(11,86,201,0.45) 100%)",
    boxShadow: "0 3px 10px rgba(11,86,201,0.25)",
  },
  barInnerAlt: {
    width: "100%",
    borderRadius: 8,
    background:
      "linear-gradient(180deg, rgba(9,132,71,0.85) 0%, rgba(9,132,71,0.45) 100%)",
    boxShadow: "0 3px 10px rgba(9,132,71,0.25)",
  },
  barLabel: {
    fontSize: 11.5,
    color: "#475569",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "100%",
  },

  tableHeader: {
    display: "grid",
    gridTemplateColumns: "1.6fr .8fr 1.2fr 1fr .8fr .7fr .9fr",
    gap: 8,
    marginBottom: 4,
    color: "#0b3e91",
    fontWeight: 700,
    alignItems: "center",
    minWidth: 1060,
  },
  thLeft: { display: "flex", justifyContent: "flex-start", width: "100%" },
  thCenter: { display: "flex", justifyContent: "center", width: "100%" },

  row: {
    display: "grid",
    gridTemplateColumns: "1.6fr .8fr 1.2fr 1fr .8fr .7fr .9fr",
    gap: 8,
    alignItems: "center",
    background: "#f5f8ff",
    borderRadius: 10,
    border: "1px solid #e8eeff",
    padding: "8px 10px",
    boxShadow: "0 6px 12px rgba(11, 86, 201, 0.05)",
    minWidth: 1060,
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

  /* modal read/edit styles */
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

  coverWrap: {
    display: "grid",
    justifyContent: "center",
    justifyItems: "center",
    marginTop: 6,
    marginBottom: 10,
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
  saveBtn: { minWidth: 200, height: 40, borderRadius: 12 },
};
