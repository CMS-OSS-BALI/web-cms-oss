// app/(view)/admin/(panel)/events/EventsContent.jsx
"use client";

import { useMemo, useState, lazy, Suspense } from "react";
import { ConfigProvider, notification } from "antd";
import EventsHeader from "./components/EventsHeader";
import EventsStats from "./components/EventsStats";
import EventsFilters from "./components/EventsFilters";
import EventsTable from "./components/EventsTable";
import styles from "./eventsStyles";
import { normalizeEvent } from "./utils/eventUtils";
import dayjs from "dayjs";
import Loading from "@/app/components/loading/LoadingImage";

/** Bagian berat → lazy */
const EventsCharts = lazy(() => import("./components/EventsCharts"));
const CreateEventModal = lazy(() => import("./modals/CreateEventModal"));
const EditEventModal = lazy(() => import("./modals/EditEventModal"));
const ViewEventModal = lazy(() => import("./modals/ViewEventModal"));

const TOKENS = {
  shellW: "94%",
  maxW: 1140,
  blue: "#0b56c9",
  text: "#0f172a",
};

export default function EventsContent({ vm }) {
  const [api, contextHolder] = notification.useNotification();
  const toast = {
    ok: (m, d) =>
      api.success({ message: m, description: d, placement: "topRight" }),
    err: (m, d) =>
      api.error({ message: m, description: d, placement: "topRight" }),
  };

  const rows = useMemo(() => vm?.events || [], [vm?.events]);

  // ======= Search helper: parse year & category dari input =======
  const onSearchNow = (rawInput) => {
    const raw = String(rawInput ?? vm?.q ?? "").trim();
    let text = raw;

    // 1) year 19xx/20xx
    const y = raw.match(/\b(19|20)\d{2}\b/);
    if (y) {
      const yearNum = Number(y[0]);
      if (!Number.isNaN(yearNum)) {
        vm?.setYear?.(yearNum);
        text = text.replace(y[0], "").trim();
      }
    }

    // 2) kategori (exact/contains)
    const categories = vm?.categoryOptions || [];
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
      vm?.setCategoryId?.(matched.value);
      const onlyYear =
        y && (raw === y[0] || raw === `${y[0]} ` || raw === ` ${y[0]}`);
      if (onlyYear || lower === String(matched.label || "").toLowerCase()) {
        vm?.setQ?.("");
      } else vm?.setQ?.(text);
    } else {
      vm?.setQ?.(text);
    }
    vm?.setPage?.(1);
  };

  // ======= Modal states =======
  const [viewOpen, setViewOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewData, setViewData] = useState(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [activeRow, setActiveRow] = useState(null);

  // ======= Actions =======
  async function handleOpenView(row) {
    setViewOpen(true);
    setViewLoading(true);
    try {
      let payload = null;
      if (typeof vm?.getEvent === "function") {
        const { ok, data, error } = await vm.getEvent(row.id, {
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
  }

  function handleOpenCreate() {
    setCreateOpen(true);
  }

  async function handleSubmitCreate(values) {
    // Validasi ringan untuk PAID
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
    if (typeof vm?.createEvent === "function") {
      res = await vm.createEvent(fd);
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
    await vm?.refetch?.();
    vm?.setPage?.(1);
  }

  async function handleOpenEdit(row) {
    setEditOpen(true);
    setEditLoading(true);
    setActiveRow(row);
    try {
      let payload = null;
      if (typeof vm?.getEvent === "function") {
        const { ok, data, error } = await vm.getEvent(row.id, {
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
      // Simpan normalized buat modal edit
      setActiveRow({ ...row, _normalized: normalizeEvent(payload) });
    } catch (e) {
      toast.err("Tidak bisa membuka form edit", e?.message);
      setEditOpen(false);
    } finally {
      setEditLoading(false);
    }
  }

  async function handleSubmitEdit(values) {
    if (!activeRow?.id) return;
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
    if (typeof vm?.updateEvent === "function") {
      res = await vm.updateEvent(activeRow.id, fd);
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
    await vm?.refetch?.();
  }

  async function handleDelete(row) {
    const res = await vm?.deleteEvent?.(row.id);
    if (!res?.ok) return toast.err("Gagal menghapus", res?.error);
    toast.ok("Terhapus", "Event dihapus (soft delete).");
    vm?.refetch?.();
  }

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
          <EventsHeader
            title="Manajemen Event"
            total={vm?.total ?? rows.length ?? "—"}
          />

          {/* Stats */}
          <EventsStats
            totalStudentsLoading={vm?.totalStudentsLoading}
            totalStudents={vm?.totalStudents}
            totalReps={vm?.totalReps}
            totalRevenue={vm?.totalRevenue}
          />

          {/* Charts (LAZY) */}
          <Suspense
            fallback={
              <div style={{ marginTop: 12 }}>
                <Loading />
              </div>
            }
          >
            <EventsCharts
              show={!!vm?.showCharts}
              loading={!!vm?.chartLoading}
              student={vm?.chartStudent || []}
              rep={vm?.chartRep || []}
              onToggle={vm?.toggleCharts}
            />
          </Suspense>

          {/* Filters */}
          <EventsFilters
            q={vm?.q ?? ""}
            onChangeQ={(val) => {
              vm?.setQ?.(val);
              vm?.setPage?.(1);
            }}
            onEnterSearch={onSearchNow}
            year={vm?.year}
            yearOptions={vm?.yearOptions}
            setYear={(y) => {
              vm?.setYear?.(y);
              vm?.setPage?.(1);
            }}
            categoryId={vm?.categoryId}
            categoryOptions={vm?.categoryOptions || []}
            setCategoryId={(v) => {
              vm?.setCategoryId?.(v);
              vm?.setPage?.(1);
            }}
            onDownloadCSV={() =>
              vm
                ?.downloadCSV?.()
                .catch((e) => toast.err("Gagal unduh CSV", e?.message))
            }
            onOpenScanner={vm?.goScanner}
            onOpenCreate={handleOpenCreate}
          />

          {/* Table */}
          <EventsTable
            rows={rows}
            loading={!!vm?.loading}
            page={vm?.page}
            perPage={vm?.perPage}
            totalPages={vm?.totalPages}
            onPrev={() => vm?.setPage?.(Math.max(1, (vm?.page || 1) - 1))}
            onNext={() => vm?.setPage?.((vm?.page || 1) + 1)}
            onView={handleOpenView}
            onEdit={handleOpenEdit}
            onDelete={handleDelete}
            opLoading={!!vm?.opLoading}
          />
        </div>
      </section>

      {/* ===== Modals (LAZY) ===== */}
      <Suspense fallback={null}>
        <CreateEventModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onSubmit={handleSubmitCreate}
          categoryOptions={vm?.categoryOptions || []}
        />
      </Suspense>

      <Suspense fallback={null}>
        <EditEventModal
          open={editOpen}
          loading={editLoading}
          initial={activeRow?._normalized}
          onClose={() => setEditOpen(false)}
          onSubmit={handleSubmitEdit}
          categoryOptions={vm?.categoryOptions || []}
          submitting={!!vm?.opLoading}
        />
      </Suspense>

      <Suspense fallback={null}>
        <ViewEventModal
          open={viewOpen}
          loading={viewLoading}
          data={viewData}
          onClose={() => {
            setViewOpen(false);
            setViewData(null);
          }}
        />
      </Suspense>
    </ConfigProvider>
  );
}
