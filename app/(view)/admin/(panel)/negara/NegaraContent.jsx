// app/(view)/admin/negara/NegaraContent.jsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ConfigProvider,
  Button,
  Modal,
  Form,
  Input,
  Upload,
  Select,
  Empty,
  Skeleton,
  Popconfirm,
  Tooltip,
  Spin,
  Switch,
  notification,
} from "antd";
import {
  PlusCircleOutlined,
  EyeOutlined,
  DeleteOutlined,
  EditOutlined,
  LeftOutlined,
  RightOutlined,
  SearchOutlined,
  FilterOutlined,
} from "@ant-design/icons";

/* ===== tokens ===== */
const TOKENS = {
  shellW: "94%",
  maxW: 1140,
  headerH: 84,
  blue: "#0b56c9",
  text: "#0f172a",
};

/* ===== copy (ID) ===== */
const T = {
  title: "Manajemen Negara",
  totalLabel: "Negara",
  listTitle: "Data Negara",
  addNew: "Buat Negara Baru",
  searchPh: "Cari nama negara...",
  statusFilter: "Status",
  statusAll: "Semua",
  statusActive: "Aktif",
  statusInactive: "Nonaktif",
  colNegara: "Negara",
  colCreated: "Dibuat",
  colUpdated: "Diubah",
  colStatus: "Status",
  colAction: "Aksi",
  flag: "Bendera",
  nameId: "Nama Negara (Bahasa Indonesia)",
  isActive: "Status Aktif",
  // autoTranslate: "Terjemahkan otomatis ke Bahasa Inggris", // ⬅️ DIHAPUS
  save: "Simpan",
  saveChanges: "Simpan Perubahan",
  edit: "Edit",
  del: "Nonaktifkan",
  activate: "Aktifkan",
  view: "Detail",
  aktif: "Aktif",
  nonaktif: "Nonaktif",
};

/* ===== helpers ===== */
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
    if (Number.isNaN(dt.getTime())) return "-";
    const day = dt.getDate();
    const month = monthsId[dt.getMonth()];
    const year = dt.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return "-";
  }
};

const SANITIZE_STATUS = (flag) => (flag ? T.aktif : T.nonaktif);

/* ===== Upload helpers ===== */
const isImg = (f) =>
  ["image/jpeg", "image/png", "image/webp"].includes(f?.type || "");
const tooBig = (f, mb = 10) => (f?.size || 0) / 1024 / 1024 > mb;
const normList = (e) => (Array.isArray(e) ? e : e?.fileList || []);

export default function NegaraContent({ vm, initialLocale = "id" }) {
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

  // set locale dari param
  useEffect(() => {
    vm.setLocale?.(initialLocale);
    vm.setFallback?.(initialLocale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLocale]);

  // ----- UI state -----
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [activeRow, setActiveRow] = useState(null);
  const [formCreate] = Form.useForm();
  const [formEdit] = Form.useForm();

  const [flagPrevCreate, setFlagPrevCreate] = useState("");
  const [flagPrevEdit, setFlagPrevEdit] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState(null);

  // revoke object URL saat unmount
  useEffect(() => {
    return () => {
      if (flagPrevCreate) URL.revokeObjectURL(flagPrevCreate);
      if (flagPrevEdit) URL.revokeObjectURL(flagPrevEdit);
    };
  }, [flagPrevCreate, flagPrevEdit]);

  const rows = useMemo(() => vm.negara || [], [vm.negara]);

  /* ===== Upload guards untuk bendera (16:9, max 10MB) ===== */
  const beforeFlagCreate = useCallback(
    (file) => {
      if (!isImg(file)) {
        toast.err(
          "File tidak didukung",
          "Gunakan gambar dengan format JPEG, PNG, atau WebP."
        );
        return Upload.LIST_IGNORE;
      }
      if (tooBig(file, 10)) {
        toast.err(
          "File terlalu besar",
          "Ukuran maksimum 10MB. Kompres gambar terlebih dahulu."
        );
        return Upload.LIST_IGNORE;
      }
      try {
        const url = URL.createObjectURL(file);
        if (flagPrevCreate) URL.revokeObjectURL(flagPrevCreate);
        setFlagPrevCreate(url);
      } catch {}
      // upload manual via Form
      return false;
    },
    [flagPrevCreate, toast]
  );

  const beforeFlagEdit = useCallback(
    (file) => {
      if (!isImg(file)) {
        toast.err(
          "File tidak didukung",
          "Gunakan gambar dengan format JPEG, PNG, atau WebP."
        );
        return Upload.LIST_IGNORE;
      }
      if (tooBig(file, 10)) {
        toast.err(
          "File terlalu besar",
          "Ukuran maksimum 10MB. Kompres gambar terlebih dahulu."
        );
        return Upload.LIST_IGNORE;
      }
      try {
        const url = URL.createObjectURL(file);
        if (flagPrevEdit) URL.revokeObjectURL(flagPrevEdit);
        setFlagPrevEdit(url);
      } catch {}
      return false;
    },
    [flagPrevEdit, toast]
  );

  /* ===== Detail loader ===== */
  const getNegaraDetail = useCallback(
    async (id) => {
      if (typeof vm.getNegara === "function") return vm.getNegara(id);
      try {
        const res = await fetch(
          `/api/negara/${encodeURIComponent(id)}?locale=id&fallback=id`
        );
        if (!res.ok) {
          const info = await res.json().catch(() => null);
          const msg =
            info?.error?.message ||
            info?.message ||
            "Gagal memuat detail negara.";
          throw new Error(msg);
        }
        const json = await res.json();
        return { ok: true, data: json?.data };
      } catch (e) {
        return { ok: false, error: e?.message || "Gagal memuat detail" };
      }
    },
    [vm]
  );

  /* ===== Filters & pagination ===== */
  const [searchValue, setSearchValue] = useState(vm.q || "");
  useEffect(() => setSearchValue(vm.q || ""), [vm.q]);

  const triggerSearch = useCallback(() => {
    vm.setQ?.(searchValue || "");
    vm.setPage?.(1);
  }, [searchValue, vm]);

  const onChangeStatusFilter = useCallback(
    (value) => {
      vm.setStatus?.(value);
      vm.setPage?.(1);
    },
    [vm]
  );

  const goPrev = useCallback(() => vm.setPage(Math.max(1, vm.page - 1)), [vm]);
  const goNext = useCallback(() => vm.setPage(vm.page + 1), [vm]);

  const { shellW, maxW, blue, text } = TOKENS;

  const disablePrev = vm.page <= 1 || vm.loading;
  const disableNext =
    vm.loading ||
    (vm.totalPages
      ? vm.page >= vm.totalPages
      : rows.length < (vm.perPage || 10));

  /* ===== Actions ===== */
  const onCreate = useCallback(async () => {
    const v = await formCreate.validateFields().catch(() => null);
    if (!v) return;
    const flagFile = v.flag?.[0]?.originFileObj || null;

    const out = await vm.createNegara({
      file: flagFile,
      name_id: v.name_id,
      is_active: v.is_active ?? true,
      // autoTranslate tidak dikirim lagi; backend sudah auto
    });

    if (out.ok) {
      toast.ok("Tersimpan", "Negara berhasil dibuat.");
      setCreateOpen(false);
      formCreate.resetFields();
      if (flagPrevCreate) URL.revokeObjectURL(flagPrevCreate);
      setFlagPrevCreate("");
    } else {
      toast.err("Gagal", out.error || "Gagal membuat negara");
    }
  }, [formCreate, vm, flagPrevCreate, toast]);

  const openEdit = useCallback(
    async (row) => {
      setActiveRow(row);
      setEditOpen(true);
      setDetailLoading(true);
      setDetailData(null);

      const { ok, data, error } = await getNegaraDetail(row.id);
      setDetailLoading(false);
      if (!ok) {
        setEditOpen(false);
        return toast.err("Gagal memuat", error);
      }
      const d = data || row;
      setDetailData(d);

      formEdit.setFieldsValue({
        name_id: d.name || row.name || "",
        is_active: d.is_active ?? true,
        // autoTranslate: false, // ⬅️ DIHAPUS
        flag: [],
      });

      setFlagPrevEdit(d.flag || row.flag || "");
    },
    [formEdit, getNegaraDetail, toast]
  );

  const onEditSubmit = useCallback(async () => {
    if (!activeRow) return;
    const v = await formEdit.validateFields().catch(() => null);
    if (!v) return;
    const flagFile = v.flag?.[0]?.originFileObj || null;

    const payload = {
      name_id: v.name_id,
      is_active: v.is_active ?? true,
    };

    if (flagFile) {
      payload.file = flagFile;
    }

    // autoTranslate tidak digunakan lagi di payload
    // if (v.autoTranslate) {
    //   payload.autoTranslate = true;
    // }

    const res = await vm.updateNegara(activeRow.id, payload);

    if (res.ok) {
      toast.ok("Tersimpan", "Perubahan negara berhasil disimpan.");
      setEditOpen(false);
      formEdit.resetFields();
      if (flagPrevEdit) URL.revokeObjectURL(flagPrevEdit);
      setFlagPrevEdit("");
    } else {
      toast.err("Gagal", res.error || "Gagal menyimpan perubahan");
    }
  }, [activeRow, formEdit, vm, flagPrevEdit, toast]);

  const onSoftDelete = useCallback(
    async (row) => {
      if (!row) return;
      const res = await vm.deleteNegara(row.id);
      if (!res.ok) {
        return toast.err(
          "Gagal",
          res.error || "Negara tidak bisa dinonaktifkan."
        );
      }
      toast.ok("Berhasil", "Negara berhasil dinonaktifkan.");
    },
    [vm, toast]
  );

  const onActivate = useCallback(
    async (row) => {
      if (!row) return;
      const res = await vm.updateNegara(row.id, { is_active: true });
      if (!res.ok) {
        return toast.err(
          "Gagal",
          res.error || "Negara tidak bisa diaktifkan kembali."
        );
      }
      toast.ok("Berhasil", "Negara berhasil diaktifkan kembali.");
    },
    [vm, toast]
  );

  const openView = useCallback(
    async (row) => {
      setActiveRow(row);
      setViewOpen(true);
      setDetailLoading(true);
      setDetailData(null);

      const { ok, data, error } = await getNegaraDetail(row.id);
      setDetailLoading(false);
      if (!ok) {
        setViewOpen(false);
        return toast.err("Gagal memuat", error);
      }
      setDetailData(data);
    },
    [getNegaraDetail, toast]
  );

  const detail = detailData || activeRow || null;

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

      {/* === Global style untuk uploader 16:9 === */}
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

      {/* ===== Page wrapper ===== */}
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
        {/* background layer */}
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
          {/* ===== Header Card ===== */}
          <div style={styles.cardOuter}>
            <div style={styles.cardHeaderBar} />
            <div style={styles.cardInner}>
              <div style={styles.cardTitle}>{T.title}</div>
              <div style={styles.totalBadgeWrap}>
                <div style={styles.totalBadgeLabel}>{T.totalLabel}</div>
                <div style={styles.totalBadgeValue}>
                  {vm.total ?? rows.length ?? "—"}
                </div>
              </div>
            </div>
          </div>

          {/* ===== Data Card ===== */}
          <div style={{ ...styles.cardOuter, marginTop: 12 }}>
            <div style={{ ...styles.cardInner, paddingTop: 14 }}>
              <div style={styles.sectionHeader}>
                <div style={styles.sectionTitle}>{T.listTitle}</div>
                <Button
                  type="primary"
                  icon={<PlusCircleOutlined />}
                  onClick={() => setCreateOpen(true)}
                >
                  {T.addNew}
                </Button>
              </div>

              {/* Filters */}
              <div style={styles.filtersRow}>
                <Input
                  allowClear
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onPressEnter={triggerSearch}
                  placeholder={T.searchPh}
                  prefix={<SearchOutlined />}
                  style={styles.searchInput}
                />

                <Select
                  value={vm.status || "active"}
                  onChange={onChangeStatusFilter}
                  options={[
                    { value: "active", label: T.statusActive },
                    { value: "all", label: T.statusAll },
                    { value: "inactive", label: T.statusInactive },
                  ]}
                  style={styles.filterSelect}
                  suffixIcon={<FilterOutlined />}
                />
              </div>

              {/* Table header */}
              <div style={styles.tableHeader}>
                <div style={{ ...styles.thLeft, paddingLeft: 8 }}>
                  {T.colNegara}
                </div>
                <div style={styles.thCenter}>{T.colCreated}</div>
                <div style={styles.thCenter}>{T.colUpdated}</div>
                <div style={styles.thCenter}>{T.colAction}</div>
              </div>

              {/* Rows */}
              <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
                {vm.loading ? (
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
                    <Empty description="Belum ada data negara" />
                  </div>
                ) : (
                  rows.map((r) => (
                    <div key={r.id} style={styles.row}>
                      <div style={styles.colName}>
                        <div style={styles.flagWrapper}>
                          {r.flag ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={r.flag}
                              alt={r.name || "bendera"}
                              title={r.name || "bendera negara"}
                              style={styles.flagImg}
                            />
                          ) : (
                            <div style={styles.flagPlaceholder}>No Flag</div>
                          )}
                        </div>
                        <div style={styles.countryInfo}>
                          <div style={styles.countryName}>
                            {r.name || "(tanpa nama)"}
                          </div>
                          <div style={styles.countryMeta}>
                            {SANITIZE_STATUS(r.is_active)}
                          </div>
                        </div>
                      </div>

                      <div style={styles.colCenter}>
                        {fmtDateId(r.created_ts || r.created_at)}
                      </div>
                      <div style={styles.colCenter}>
                        {fmtDateId(r.updated_ts || r.updated_at)}
                      </div>
                      <div style={styles.colActionsCenter}>
                        <Tooltip title={T.view}>
                          <Button
                            size="small"
                            aria-label="detail"
                            icon={<EyeOutlined />}
                            onClick={() => openView(r)}
                            style={styles.iconBtn}
                          />
                        </Tooltip>
                        {r.is_active ? (
                          <Tooltip title={T.del}>
                            <Popconfirm
                              title="Nonaktifkan negara ini?"
                              okText="Ya"
                              cancelText="Batal"
                              onConfirm={() => onSoftDelete(r)}
                            >
                              <Button
                                size="small"
                                danger
                                aria-label="nonaktifkan"
                                icon={<DeleteOutlined />}
                                style={styles.iconBtn}
                              />
                            </Popconfirm>
                          </Tooltip>
                        ) : (
                          <Tooltip title={T.activate}>
                            <Button
                              size="small"
                              type="default"
                              aria-label="aktifkan"
                              onClick={() => onActivate(r)}
                              style={styles.iconBtn}
                            >
                              {T.activate}
                            </Button>
                          </Tooltip>
                        )}
                        <Tooltip title={T.edit}>
                          <Button
                            size="small"
                            aria-label="edit"
                            icon={<EditOutlined />}
                            onClick={() => openEdit(r)}
                            style={styles.iconBtn}
                          />
                        </Tooltip>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Pagination */}
              <div style={styles.pagination}>
                <Button
                  icon={<LeftOutlined />}
                  onClick={goPrev}
                  disabled={disablePrev}
                />
                <div style={styles.pageText}>
                  Page {vm.page}
                  {vm.totalPages ? ` of ${vm.totalPages}` : ""}
                </div>
                <Button
                  icon={<RightOutlined />}
                  onClick={goNext}
                  disabled={disableNext}
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
          if (flagPrevCreate) URL.revokeObjectURL(flagPrevCreate);
          setFlagPrevCreate("");
          formCreate.resetFields();
        }}
        footer={null}
        width={720}
        destroyOnClose
        title={null}
      >
        <div style={styles.modalShell}>
          <Form
            layout="vertical"
            form={formCreate}
            initialValues={{ is_active: true }}
          >
            <div style={styles.coverWrap}>
              <Form.Item
                name="flag"
                valuePropName="fileList"
                getValueFromEvent={normList}
                noStyle
                rules={[
                  { required: true, message: "Bendera negara wajib diisi." },
                ]}
              >
                <Upload
                  accept="image/*"
                  listType="picture-card"
                  showUploadList={false}
                  beforeUpload={beforeFlagCreate}
                  className="landscape-uploader"
                >
                  <div style={styles.flagBox}>
                    {flagPrevCreate ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={flagPrevCreate}
                        alt="bendera"
                        title="bendera negara"
                        style={styles.flagImgFull}
                      />
                    ) : (
                      <div style={styles.flagPlaceholderBig}>
                        + Bendera (16:9)
                      </div>
                    )}
                  </div>
                </Upload>
              </Form.Item>
              <div style={styles.coverHint}>
                Sistem akan otomatis memotong gambar ke rasio{" "}
                <b>16:9 (landscape)</b> dan menyimpannya dalam format WebP.
                Gunakan gambar horizontal agar hasil maksimal.
              </div>
            </div>

            <Form.Item
              label={T.nameId}
              name="name_id"
              rules={[{ required: true, message: "Nama negara wajib diisi." }]}
            >
              <Input placeholder="Contoh: Australia" />
            </Form.Item>

            <Form.Item
              label={T.isActive}
              name="is_active"
              valuePropName="checked"
            >
              <Switch checkedChildren="Aktif" unCheckedChildren="Nonaktif" />
            </Form.Item>

            <div style={styles.modalFooter}>
              <Button
                type="primary"
                size="large"
                onClick={onCreate}
                loading={vm.opLoading}
                style={styles.saveBtn}
              >
                {T.save}
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
          if (flagPrevEdit) URL.revokeObjectURL(flagPrevEdit);
          setFlagPrevEdit("");
          formEdit.resetFields();
        }}
        footer={null}
        width={760}
        destroyOnClose
        title={null}
      >
        <div style={styles.modalShell}>
          <Spin spinning={detailLoading}>
            <Form layout="vertical" form={formEdit}>
              <div style={styles.coverWrap}>
                <Form.Item
                  name="flag"
                  valuePropName="fileList"
                  getValueFromEvent={normList}
                  noStyle
                >
                  <Upload
                    accept="image/*"
                    listType="picture-card"
                    showUploadList={false}
                    beforeUpload={beforeFlagEdit}
                    className="landscape-uploader"
                  >
                    <div style={styles.flagBox}>
                      {flagPrevEdit ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={flagPrevEdit}
                          alt="bendera"
                          title="bendera negara"
                          style={styles.flagImgFull}
                        />
                      ) : (
                        <div style={styles.flagPlaceholderBig}>
                          + Bendera (16:9)
                        </div>
                      )}
                    </div>
                  </Upload>
                </Form.Item>
                <div style={styles.coverHint}>
                  Gambar baru juga akan dipotong otomatis ke rasio <b>16:9</b>{" "}
                  saat disimpan.
                </div>
              </div>

              <Form.Item
                label={T.nameId}
                name="name_id"
                rules={[
                  { required: true, message: "Nama negara wajib diisi." },
                ]}
              >
                <Input placeholder="Nama negara" />
              </Form.Item>

              <Form.Item
                label={T.isActive}
                name="is_active"
                valuePropName="checked"
              >
                <Switch checkedChildren="Aktif" unCheckedChildren="Nonaktif" />
              </Form.Item>

              {/* Toggle auto translate DIHAPUS */}
              {/* 
              <Form.Item
                label={T.autoTranslate}
                name="autoTranslate"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
              */}

              <div style={styles.modalFooter}>
                <Button
                  type="primary"
                  size="large"
                  onClick={onEditSubmit}
                  loading={vm.opLoading}
                  style={styles.saveBtn}
                >
                  {T.saveChanges}
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
          setDetailData(null);
        }}
        footer={null}
        width={720}
        destroyOnClose
        title={null}
      >
        <div style={styles.modalShell}>
          <Spin spinning={detailLoading}>
            {detail && (
              <>
                <div style={styles.coverBoxRead}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={detail.flag || ""}
                    alt={detail.name || "bendera negara"}
                    title={detail.name || "bendera negara"}
                    style={styles.coverImgRead}
                  />
                </div>

                <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                  <div>
                    <div style={styles.label}>{T.colNegara}</div>
                    <div style={styles.value}>
                      {detail.name || "(tanpa nama)"}
                    </div>
                  </div>
                  <div>
                    <div style={styles.label}>{T.colStatus}</div>
                    <div style={styles.value}>
                      {SANITIZE_STATUS(detail.is_active)}
                    </div>
                  </div>
                  <div>
                    <div style={styles.label}>{T.colCreated}</div>
                    <div style={styles.value}>
                      {fmtDateId(detail.created_at || detail.created_ts)}
                    </div>
                  </div>
                  <div>
                    <div style={styles.label}>{T.colUpdated}</div>
                    <div style={styles.value}>
                      {fmtDateId(detail.updated_at || detail.updated_ts)}
                    </div>
                  </div>
                </div>
              </>
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

  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 18, fontWeight: 800, color: "#0b3e91" },

  filtersRow: {
    display: "grid",
    gridTemplateColumns: "1fr 200px",
    gap: 8,
    marginBottom: 10,
    alignItems: "center",
  },

  searchInput: { height: 36, borderRadius: 10 },
  filterSelect: { width: "100%" },

  tableHeader: {
    display: "grid",
    gridTemplateColumns: "2.2fr 1fr 1fr 0.8fr",
    gap: 8,
    marginBottom: 4,
    color: "#0b3e91",
    fontWeight: 700,
    alignItems: "center",
  },
  thLeft: { display: "flex", justifyContent: "flex-start", width: "100%" },
  thCenter: { display: "flex", justifyContent: "center", width: "100%" },

  row: {
    display: "grid",
    gridTemplateColumns: "2.2fr 1fr 1fr 0.8fr",
    gap: 8,
    alignItems: "center",
    background: "#f5f8ff",
    borderRadius: 10,
    border: "1px solid #e8eeff",
    padding: "8px 10px",
    boxShadow: "0 6px 12px rgba(11, 86, 201, 0.05)",
  },

  colName: {
    background: "#ffffff",
    borderRadius: 10,
    border: "1px solid #eef3ff",
    padding: "6px 10px",
    boxShadow: "0 3px 8px rgba(0,0,0,0.04) inset",
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  flagWrapper: {
    width: 64,
    height: 40,
    borderRadius: 8,
    overflow: "hidden",
    border: "1px solid #e2e8f0",
    background: "#fff",
    flexShrink: 0,
    display: "grid",
    placeItems: "center",
  },
  flagImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  flagPlaceholder: {
    fontSize: 11,
    color: "#94a3b8",
  },

  countryInfo: {
    display: "grid",
    gap: 2,
    minWidth: 0,
  },
  countryName: {
    fontWeight: 600,
    color: "#111827",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  countryMeta: {
    fontSize: 11.5,
    color: "#64748b",
  },

  colCenter: { textAlign: "center", color: "#0f172a", fontWeight: 500 },
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
  },

  modalShell: {
    position: "relative",
    background: "#fff",
    borderRadius: 16,
    padding: "14px 14px 10px",
    boxShadow: "0 10px 36px rgba(11,86,201,0.08)",
  },

  coverWrap: {
    display: "grid",
    justifyContent: "center",
    justifyItems: "center",
    marginTop: 6,
    marginBottom: 10,
    gap: 6,
  },

  flagBox: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
    border: "2px dashed #c0c8d8",
    background: "#f8fbff",
    display: "grid",
    placeItems: "center",
    overflow: "hidden",
  },
  flagImgFull: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  flagPlaceholderBig: {
    fontWeight: 700,
    color: "#0b56c9",
    userSelect: "none",
  },

  coverBoxRead: {
    width: "100%",
    borderRadius: 12,
    border: "1px solid #e6eeff",
    overflow: "hidden",
    background: "#f8fbff",
  },
  coverImgRead: { width: "100%", height: "auto", display: "block" },

  coverHint: {
    fontSize: 11,
    color: "#64748b",
    textAlign: "center",
    maxWidth: 420,
  },

  modalFooter: { marginTop: 8, display: "grid", placeItems: "center" },
  saveBtn: { minWidth: 200, height: 40, borderRadius: 12 },
};
