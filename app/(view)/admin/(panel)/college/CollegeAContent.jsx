"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import useCollegeAViewModel from "./useCollegeAViewModel";
import {
  ConfigProvider,
  Button,
  Modal,
  Form,
  Input,
  Upload,
  Empty,
  Skeleton,
  Popconfirm,
  Tooltip,
  Spin,
  Select,
  InputNumber,
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
  ArrowUpOutlined,
  ArrowDownOutlined,
  PlusOutlined,
} from "@ant-design/icons";

/* ===== compact tokens ===== */
const TOKENS = {
  shellW: "94%",
  maxW: 1140,
  blue: "#0b56c9",
  text: "#0f172a",
};

const T = {
  title: "Manajemen Kampus",
  totalLabel: "Kampus Terdaftar",
  listTitle: "Data Kampus",
  addNew: "Buat Data Baru",
  searchPh: "Cari nama/desk kampus",
  nameCol: "Nama Kampus",
  priceCol: "Price",
  livingCol: "Living Cost",
  jenjangCol: "Jenjang",
  countryCol: "Negara",
  action: "Aksi",
  view: "Lihat",
  edit: "Edit",
  del: "Hapus",
  save: "Simpan",

  // form fields
  logo: "Logo (1:1)",
  name: "Nama Kampus",
  desc: "Deskripsi",
  country: "Negara",
  city: "Kota",
  state: "State/Provinsi",
  postal: "Kode Pos",
  website: "Website",
  address: "Alamat",
  tuitionMin: "Biaya Kuliah Minimum",
  tuitionMax: "Biaya Kuliah Maksimum",
  living: "Estimasi Living Cost",
  contact: "Nama Kontak",
  phone: "No. Telp",
  email: "Email",
  jenjang: "Jenjang",

  // requirements
  reqTitleCreate: "Requirement",
  reqTitleEdit: "Requirement Kampus",
  reqPlaceholder: "Tulis persyaratan, contoh: IELTS 6.0 atau TOEFL iBT 80",
  reqAdd: "Tambah Requirement",
};

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
    return `${dt.getDate()} ${monthsId[dt.getMonth()]}`;
  } catch {
    return "-";
  }
};

const isImg = (f) =>
  ["image/jpeg", "image/png", "image/webp"].includes(f?.type || "");
const tooBig = (f, mb = 10) => f.size / 1024 / 1024 > mb;

// formatter & parser angka
const numFormatter = (val) => {
  if (val === undefined || val === null || val === "") return "";
  const s = String(val).replace(/\D/g, "");
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};
const numParser = (val) => {
  const s = String(val ?? "").replace(/\./g, "");
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
};
const numOrNull = (v) =>
  v === undefined || v === null || v === "" ? null : Number(v);

const stripTags = (s) => (s ? String(s).replace(/<[^>]*>/g, "") : "");

/* ===== util ===== */
const safeGetId = (resObj) =>
  resObj?.data?.data?.id ||
  resObj?.data?.id ||
  resObj?.id ||
  resObj?.data ||
  null;

/* ============ Requirements Editor (imperative, save on parent submit) ============ */
const RequirementsEditor = forwardRef(function RequirementsEditor(
  { mode, vm, collegeId, notifyOk, notifyErr },
  ref
) {
  // CREATE: drafts (belum ke server)
  const [drafts, setDrafts] = useState([{ id: 1, text: "", sort: 1 }]);

  // EDIT: items di-edit lokal; persist saat parent klik SIMPAN
  const [items, setItems] = useState([]);
  const originalRef = useRef([]);
  const [loading, setLoading] = useState(mode === "edit");

  useEffect(() => {
    if (mode !== "edit" || !collegeId) return;
    let alive = true;
    (async () => {
      setLoading(true);
      const { ok, data, error } = await vm.listRequirements(collegeId);
      if (!alive) return;
      if (!ok) {
        notifyErr?.("Gagal memuat requirement", error);
        originalRef.current = [];
        setItems([]);
      } else {
        const sorted = [...data]
          .sort((a, b) => (a.sort || 0) - (b.sort || 0))
          .map((r) => ({ ...r, _dirty: false, _new: false, _deleted: false }));
        originalRef.current = sorted.map((x) => ({
          id: String(x.id),
          text: x.text,
          sort: x.sort,
        }));
        setItems(sorted);
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [mode, collegeId, vm, notifyErr]);

  // helpers UI
  const addDraft = () =>
    setDrafts((prev) => [
      ...prev,
      { id: Date.now(), text: "", sort: (prev.at(-1)?.sort || 0) + 1 },
    ]);
  const removeDraft = (id) =>
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  const updateDraft = (id, patch) =>
    setDrafts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...patch } : d))
    );

  const addNewItem = () =>
    setItems((prev) => [
      ...prev,
      {
        id: `new:${Date.now()}`,
        text: "",
        sort: (prev.filter((p) => !p._deleted).at(-1)?.sort || 0) + 1,
        _new: true,
        _dirty: true,
        _deleted: false,
      },
    ]);

  const markDelete = (index) =>
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], _deleted: true, _dirty: false };
      const kept = next.filter((x) => !x._deleted);
      kept.forEach((x, i) => ((x.sort = i + 1), (x._dirty = true)));
      const map = new Map(kept.map((k) => [k.id, k]));
      return next.map((n) => (n._deleted ? n : map.get(n.id)));
    });

  const moveItem = (setter) => (idx, dir, arrSource) =>
    setter((prev) => {
      const arr = arrSource ? [...arrSource] : [...prev];
      const liveIdx = arr.filter((x) => !x._deleted);
      const pos = liveIdx.findIndex((x) => x === arr[idx]);
      if (pos < 0) return prev;
      const swapWith = pos + (dir === "up" ? -1 : 1);
      if (swapWith < 0 || swapWith >= liveIdx.length) return prev;
      const a = liveIdx[pos],
        b = liveIdx[swapWith];
      const ai = arr.indexOf(a),
        bi = arr.indexOf(b);
      const tmp = arr[ai];
      arr[ai] = arr[bi];
      arr[bi] = tmp;
      let k = 1;
      for (const it of arr) {
        if (it._deleted) continue;
        it.sort = k++;
        it._dirty = true;
      }
      return arr;
    });

  const moveDraft = moveItem(setDrafts);
  const moveServer = moveItem(setItems);

  useImperativeHandle(ref, () => ({
    async applyChanges(targetCollegeId) {
      if (!targetCollegeId)
        return { ok: true, created: 0, updated: 0, deleted: 0 };

      if (mode === "create") {
        const rows = drafts.filter((d) => (d.text || "").trim());
        if (!rows.length)
          return { ok: true, created: 0, updated: 0, deleted: 0 };
        const results = await vm.bulkCreateRequirements(
          targetCollegeId,
          rows.map((r, i) => ({
            text: r.text.trim(),
            sort: Number.isFinite(r.sort) ? r.sort : i + 1,
          }))
        );
        const fail = results.filter((r) => !r.ok).length;
        if (fail)
          notifyErr?.(
            "Sebagian requirement gagal disimpan",
            `${fail} baris gagal.`
          );
        else
          notifyOk?.(
            "Requirement tersimpan",
            `${results.length} baris ditambahkan.`
          );
        return {
          ok: fail === 0,
          created: results.length,
          updated: 0,
          deleted: 0,
        };
      }

      // EDIT: diff dan apply
      const original = originalRef.current || [];
      const curr = items || [];
      const live = curr.filter((x) => !x._deleted);

      const origMap = new Map(original.map((o) => [String(o.id), o]));
      const currMap = new Map(
        live
          .filter((x) => !String(x.id).startsWith("new:"))
          .map((c) => [String(c.id), c])
      );

      let created = 0,
        updated = 0,
        deleted = 0,
        anyError = false;

      // delete
      const deletedIds = new Set(
        original
          .map((o) => String(o.id))
          .filter(
            (oid) =>
              !currMap.has(oid) ||
              curr.find((x) => String(x.id) === oid)?._deleted
          )
      );
      for (const id of deletedIds) {
        const r = await vm.deleteRequirement(targetCollegeId, id);
        if (!r.ok) {
          anyError = true;
          notifyErr?.("Gagal menghapus requirement", r.error || id);
        } else deleted++;
      }

      // create
      for (const it of live) {
        if (String(it.id).startsWith("new:")) {
          const r = await vm.createRequirement(targetCollegeId, {
            text: (it.text || "").trim(),
            sort: it.sort,
          });
          if (!r.ok) {
            anyError = true;
            notifyErr?.("Gagal menambah requirement", r.error || "");
          } else created++;
        }
      }

      // update
      for (const it of live) {
        const oid = String(it.id);
        if (oid.startsWith("new:")) continue;
        const orig = origMap.get(oid);
        if (!orig) continue;
        const changed =
          (orig.text || "") !== (it.text || "") ||
          Number(orig.sort || 0) !== Number(it.sort || 0);
        if (changed) {
          const r = await vm.updateRequirement(targetCollegeId, oid, {
            text: (it.text || "").trim(),
            sort: it.sort,
          });
          if (!r.ok) {
            anyError = true;
            notifyErr?.("Gagal memperbarui requirement", r.error || oid);
          } else updated++;
        }
      }

      if (!anyError) {
        const total = created + updated + deleted;
        if (total > 0)
          notifyOk?.(
            "Requirement disinkronkan",
            `Create ${created} • Update ${updated} • Delete ${deleted}`
          );
      }
      return { ok: !anyError, created, updated, deleted };
    },
  }));

  if (mode === "create") {
    return (
      <div style={styles.reqBlock}>
        <div style={styles.reqHeader}>
          <div style={styles.reqTitle}>{T.reqTitleCreate}</div>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          {drafts.map((d, i) => (
            <div key={d.id} style={styles.reqRow}>
              <div style={styles.reqSort}>{i + 1}</div>
              <Input.TextArea
                autoSize={{ minRows: 1, maxRows: 4 }}
                placeholder={T.reqPlaceholder}
                value={d.text}
                onChange={(e) => updateDraft(d.id, { text: e.target.value })}
              />
              <div style={styles.reqBtns}>
                <Button
                  icon={<ArrowUpOutlined />}
                  onClick={() => moveDraft(i, "up", drafts)}
                  disabled={i === 0}
                />
                <Button
                  icon={<ArrowDownOutlined />}
                  onClick={() => moveDraft(i, "down", drafts)}
                  disabled={i === drafts.length - 1}
                />
                <Popconfirm
                  title="Hapus baris ini?"
                  okText="Ya"
                  cancelText="Batal"
                  onConfirm={() => removeDraft(d.id)}
                >
                  <Button danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
          <Button icon={<PlusOutlined />} onClick={addDraft}>
            {T.reqAdd}
          </Button>
        </div>
      </div>
    );
  }

  // EDIT MODE
  const visibleItems = items.filter((x) => !x._deleted);
  return (
    <div style={styles.reqBlock}>
      <div style={styles.reqHeader}>
        <div style={styles.reqTitle}>{T.reqTitleEdit}</div>
      </div>

      <Spin spinning={loading}>
        {visibleItems.length === 0 ? (
          <div style={styles.reqEmpty}>Belum ada requirement.</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {visibleItems.map((it, i) => (
              <div key={it.id} style={styles.reqRow}>
                <div style={styles.reqSort}>{i + 1}</div>
                <Input.TextArea
                  autoSize={{ minRows: 1, maxRows: 4 }}
                  placeholder={T.reqPlaceholder}
                  value={it.text || ""}
                  onChange={(e) =>
                    setItems((prev) => {
                      const next = [...prev];
                      const idx = next.findIndex((x) => x.id === it.id);
                      if (idx >= 0)
                        next[idx] = {
                          ...next[idx],
                          text: e.target.value,
                          _dirty: true,
                        };
                      return next;
                    })
                  }
                />
                <div style={styles.reqBtns}>
                  <Button
                    icon={<ArrowUpOutlined />}
                    onClick={() =>
                      moveServer(
                        items.findIndex((x) => x.id === it.id),
                        "up"
                      )
                    }
                    disabled={i === 0}
                  />
                  <Button
                    icon={<ArrowDownOutlined />}
                    onClick={() =>
                      moveServer(
                        items.findIndex((x) => x.id === it.id),
                        "down"
                      )
                    }
                    disabled={i === visibleItems.length - 1}
                  />
                  <Popconfirm
                    title="Hapus baris ini?"
                    okText="Ya"
                    cancelText="Batal"
                    onConfirm={() =>
                      markDelete(items.findIndex((x) => x.id === it.id))
                    }
                  >
                    <Button danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
          <Button icon={<PlusOutlined />} onClick={addNewItem}>
            {T.reqAdd}
          </Button>
        </div>
      </Spin>
    </div>
  );
});

/* ==================== PAGE ==================== */
export default function CollegeAContent(props) {
  const vm =
    props && Object.prototype.hasOwnProperty.call(props, "colleges")
      ? props
      : useCollegeAViewModel({ locale: props?.locale || "id" });

  // notif
  const [notify, contextHolder] = notification.useNotification();
  const ok = useCallback(
    (message, description) =>
      notify.success({ message, description, placement: "topRight" }),
    [notify]
  );
  const err = useCallback(
    (message, description) =>
      notify.error({ message, description, placement: "topRight" }),
    [notify]
  );

  // UI state
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [activeRow, setActiveRow] = useState(null);
  const [formCreate] = Form.useForm();
  const [formEdit] = Form.useForm();
  const [logoPrevCreate, setLogoPrevCreate] = useState("");
  const [logoPrevEdit, setLogoPrevEdit] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState(null);

  // refs imperative editor
  const reqCreateRef = useRef(null);
  const reqEditRef = useRef(null);

  // cleanup objectURL
  useEffect(
    () => () => {
      if (logoPrevCreate) URL.revokeObjectURL(logoPrevCreate);
      if (logoPrevEdit) URL.revokeObjectURL(logoPrevEdit);
    },
    [logoPrevCreate, logoPrevEdit]
  );

  const [viewImgMeta, setViewImgMeta] = useState({ w: 0, h: 0 });
  const viewModalWidth =
    (viewImgMeta.h || 0) >= (viewImgMeta.w || 0) ? 560 : 900;

  const rows = useMemo(() => vm.colleges || [], [vm.colleges]);

  // search/filter client-side kecil
  const [searchValue, setSearchValue] = useState(vm.q || "");
  useEffect(() => setSearchValue(vm.q || ""), [vm.q]);
  const filteredRows = useMemo(() => {
    const s = (searchValue || "").trim().toLowerCase();
    const jf = (vm.jenjang || "").trim().toLowerCase();
    return rows.filter((r) => {
      const okName = !s || (r?.name || "").toLowerCase().includes(s);
      const okCountry = !vm.country || (r?.country || "") === vm.country;
      const okJenjang = !jf || (r?.jenjang || "").toLowerCase().includes(jf);
      return okName && okCountry && okJenjang;
    });
  }, [rows, searchValue, vm.country, vm.jenjang]);

  const normList = (e) => (Array.isArray(e) ? e : e?.fileList || []);
  const beforeLogoCreate = (file) => {
    if (!isImg(file) || tooBig(file, 10)) return Upload.LIST_IGNORE;
    try {
      const url = URL.createObjectURL(file);
      if (logoPrevCreate) URL.revokeObjectURL(logoPrevCreate);
      setLogoPrevCreate(url);
    } catch {}
    return false;
  };
  const beforeLogoEdit = (file) => {
    if (!isImg(file) || tooBig(file, 10)) return Upload.LIST_IGNORE;
    try {
      const url = URL.createObjectURL(file);
      if (logoPrevEdit) URL.revokeObjectURL(logoPrevEdit);
      setLogoPrevEdit(url);
    } catch {}
    return false;
  };

  // ===== CREATE =====
  const onCreate = async () => {
    const v = await formCreate.validateFields().catch(() => null);
    if (!v) return;
    const file = v.logo?.[0]?.originFileObj || null;

    const out = await vm.createCollege({
      file,
      name: v.name,
      description: v.description || "",
      country: v.country || "",
      city: v.city || "",
      state: v.state || "",
      postal_code: v.postal || "",
      website: v.website || "",
      address: v.address || "",
      tuition_min: numOrNull(v.tuition_min),
      tuition_max: numOrNull(v.tuition_max),
      living_cost_estimate: numOrNull(v.living),
      contact_name: v.contact || "",
      no_telp: v.phone || "",
      email: v.email || "",
      jenjang: (v.jenjang || "").trim() || null,
      autoTranslate: true,
    });

    if (!out.ok) {
      err("Gagal membuat kampus", out.error || "Gagal menyimpan");
      return;
    }

    const newId =
      safeGetId(out) ||
      safeGetId(out?.data) ||
      out?.data?.data?.id ||
      out?.data?.id;
    if (newId) {
      await reqCreateRef.current?.applyChanges(String(newId));
      ok("Berhasil", `Kampus “${v.name}” berhasil dibuat beserta requirement.`);
    } else {
      ok("Berhasil", `Kampus “${v.name}” berhasil dibuat.`);
    }

    setCreateOpen(false);
    formCreate.resetFields();
    if (logoPrevCreate) URL.revokeObjectURL(logoPrevCreate);
    setLogoPrevCreate("");
  };

  // ===== EDIT (load) =====
  const openEdit = async (row) => {
    setActiveRow(row);
    setEditOpen(true);
    setDetailLoading(true);
    setDetailData(null);
    const { ok: okDetail, data, error } = await vm.getCollege(row.id);
    setDetailLoading(false);
    if (!okDetail) {
      setEditOpen(false);
      err("Gagal memuat detail", error);
      return;
    }
    const d = data || row;
    setDetailData(d);
    // isi angka murni
    formEdit.setFieldsValue({
      name: d.name || "",
      description: d.description || "",
      country: d.country || "",
      city: d.city || "",
      state: d.state || "",
      postal: d.postal_code || "",
      website: d.website || "",
      address: d.address || "",
      tuition_min: d.tuition_min ?? null,
      tuition_max: d.tuition_max ?? null,
      living: d.living_cost_estimate ?? null,
      contact: d.contact_name || "",
      phone: d.no_telp || "",
      email: d.email || "",
      jenjang: d.jenjang || "",
    });
    setLogoPrevEdit(d.logo_url || "");
  };

  // ===== EDIT (submit) =====
  const onEditSubmit = async () => {
    if (!activeRow) return;
    const v = await formEdit.validateFields().catch(() => null);
    if (!v) return;
    const file = v.logo?.[0]?.originFileObj || null;

    const res = await vm.updateCollege(activeRow.id, {
      file,
      name: v.name,
      description: v.description || "",
      country: v.country || "",
      city: v.city || "",
      state: v.state || "",
      postal_code: v.postal || "",
      website: v.website || "",
      address: v.address || "",
      tuition_min: numOrNull(v.tuition_min),
      tuition_max: numOrNull(v.tuition_max),
      living_cost_estimate: numOrNull(v.living),
      contact_name: v.contact || "",
      no_telp: v.phone || "",
      email: v.email || "",
      jenjang: (v.jenjang || "").trim(),
      autoTranslate: false,
    });

    if (!res.ok) {
      err("Gagal menyimpan perubahan", res.error || "Gagal menyimpan");
      return;
    }

    await reqEditRef.current?.applyChanges(activeRow.id);

    ok(
      "Perubahan tersimpan",
      `Data kampus “${v.name || activeRow.name}” diperbarui.`
    );
    setEditOpen(false);
    formEdit.resetFields();
    if (logoPrevEdit) URL.revokeObjectURL(logoPrevEdit);
    setLogoPrevEdit("");
  };

  const onDelete = async (id) => {
    const res = await vm.deleteCollege(id);
    if (!res.ok) {
      err("Gagal menghapus", res.error || "Tidak bisa menghapus");
      return;
    }
    ok("Terhapus", "Kampus berhasil dihapus.");
  };

  // Search & Filter debounce kecil
  useEffect(() => {
    const v = (searchValue || "").trim();
    const t = setTimeout(() => {
      vm.setQ?.(v);
      vm.setPage?.(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchValue]); // eslint-disable-line

  const { shellW, maxW, blue, text } = TOKENS;
  const req = (msg) => [{ required: true, message: msg }];

  const jenjangOptions = useMemo(() => {
    const uniq = Array.from(
      new Set(
        (rows || []).map((r) => (r?.jenjang || "").trim()).filter(Boolean)
      )
    );
    return uniq.map((v) => ({ value: v, label: v }));
  }, [rows]);

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

      <style jsx global>{`
        .portrait-uploader.ant-upload.ant-upload-select-picture-card {
          width: 220px !important;
          height: 220px !important;
          padding: 0 !important;
        }
        .portrait-uploader .ant-upload {
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
                <div style={styles.totalBadgeLabel}>{T.totalLabel}</div>
                <div style={styles.totalBadgeValue}>
                  {vm.total ?? rows.length ?? "—"}
                </div>
              </div>
            </div>
          </div>

          {/* Data */}
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
                  onPressEnter={() => {
                    vm.setQ?.((searchValue || "").trim());
                    vm.setPage?.(1);
                  }}
                  placeholder={T.searchPh}
                  prefix={<SearchOutlined />}
                  style={styles.searchInput}
                />
                <Select
                  allowClear
                  placeholder="Filter negara"
                  value={vm.country || undefined}
                  onChange={(v) => {
                    vm.setCountry?.(v || "");
                    vm.setPage?.(1);
                  }}
                  options={Array.from(
                    new Set(rows.map((r) => r.country).filter(Boolean))
                  ).map((c) => ({ value: c, label: c }))}
                  style={styles.filterSelect}
                />
                <Select
                  allowClear
                  showSearch
                  placeholder="Filter jenjang"
                  value={vm.jenjang || undefined}
                  onChange={(v) => {
                    vm.setJenjang?.(v || "");
                    vm.setPage?.(1);
                  }}
                  options={jenjangOptions}
                  style={styles.filterSelect}
                  filterOption={(input, option) =>
                    (option?.label || "")
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                />
              </div>

              {/* Table */}
              <div style={{ overflowX: "auto" }}>
                <div style={styles.tableHeader}>
                  <div style={{ ...styles.thLeft, paddingLeft: 8 }}>
                    {T.nameCol}
                  </div>
                  <div style={styles.thCenter}>{T.priceCol}</div>
                  <div style={styles.thCenter}>{T.livingCol}</div>
                  <div style={styles.thCenter}>{T.jenjangCol}</div>
                  <div style={styles.thCenter}>{T.countryCol}</div>
                  <div style={styles.thCenter}>{T.action}</div>
                </div>

                <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
                  {vm.loading ? (
                    <div style={{ padding: "8px 4px" }}>
                      <Skeleton active paragraph={{ rows: 2 }} />
                    </div>
                  ) : filteredRows.length === 0 ? (
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
                    filteredRows.map((r) => {
                      const name = r.name || "(untitled)";
                      const priceMin =
                        r.tuition_min != null
                          ? vm.money(r.tuition_min, r.currency || "IDR")
                          : null;
                      const priceMax =
                        r.tuition_max != null
                          ? vm.money(r.tuition_max, r.currency || "IDR")
                          : null;
                      const price =
                        priceMin && priceMax
                          ? `${priceMin} - ${priceMax}`
                          : priceMin || priceMax || "—";
                      const living =
                        r.living_cost_estimate != null
                          ? vm.money(
                              r.living_cost_estimate,
                              r.currency || "IDR"
                            )
                          : "—";

                      return (
                        <div key={r.id} style={styles.row}>
                          <div style={styles.colName}>
                            <div style={styles.logoBox}>
                              {r.logo_url ? (
                                <img
                                  src={r.logo_url}
                                  alt=""
                                  style={styles.logoImg}
                                />
                              ) : (
                                <div style={styles.logoFallback}>🏫</div>
                              )}
                            </div>
                            <div style={styles.nameWrap}>
                              <div style={styles.nameText} title={name}>
                                {name}
                              </div>
                              <div style={styles.subDate}>
                                {fmtDateId(r.created_at)}
                              </div>
                            </div>
                          </div>
                          <div style={styles.colCenter}>{price}</div>
                          <div style={styles.colCenter}>{living}</div>
                          <div style={styles.colCenter}>{r.jenjang || "—"}</div>
                          <div style={styles.colCenter}>{r.country || "-"}</div>
                          <div style={styles.colActionsCenter}>
                            <Tooltip title={T.view}>
                              <Button
                                size="small"
                                icon={<EyeOutlined />}
                                onClick={() => {
                                  setActiveRow(r);
                                  setViewOpen(true);
                                  setDetailLoading(true);
                                  setDetailData(null);
                                  setViewImgMeta({ w: 0, h: 0 });
                                  vm.getCollege(r.id).then(
                                    ({ ok, data, error }) => {
                                      setDetailLoading(false);
                                      if (!ok) {
                                        setViewOpen(false);
                                        err("Gagal memuat detail", error);
                                        return;
                                      }
                                      setDetailData(data);
                                    }
                                  );
                                }}
                                style={styles.iconBtn}
                              />
                            </Tooltip>
                            <Tooltip title={T.del}>
                              <Popconfirm
                                title="Hapus kampus ini?"
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
                            <Tooltip title={T.edit}>
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
                  onClick={() => vm.setPage(Math.max(1, vm.page - 1))}
                  disabled={vm.page <= 1 || vm.loading}
                />
                <div style={styles.pageText}>
                  Page {vm.page}
                  {vm.totalPages ? ` of ${vm.totalPages}` : ""}
                </div>
                <Button
                  icon={<RightOutlined />}
                  onClick={() => vm.setPage(vm.page + 1)}
                  disabled={
                    vm.loading ||
                    (vm.totalPages
                      ? vm.page >= vm.totalPages
                      : rows.length < (vm.perPage || 10))
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
          if (logoPrevCreate) URL.revokeObjectURL(logoPrevCreate);
          setLogoPrevCreate("");
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
                name="logo"
                valuePropName="fileList"
                getValueFromEvent={normList}
                noStyle
              >
                <Upload
                  accept="image/*"
                  listType="picture-card"
                  showUploadList={false}
                  beforeUpload={beforeLogoCreate}
                  className="portrait-uploader"
                >
                  <div style={styles.coverBox}>
                    {logoPrevCreate ? (
                      <img
                        src={logoPrevCreate}
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

            <Form.Item
              label={T.name}
              name="name"
              rules={req("Nama kampus wajib diisi")}
            >
              <Input placeholder="Contoh: Skyline College" />
            </Form.Item>
            <Form.Item
              label={T.desc}
              name="description"
              rules={req("Deskripsi wajib diisi")}
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
                label={T.country}
                name="country"
                rules={req("Negara wajib diisi")}
              >
                <Input placeholder="Contoh: Australia" />
              </Form.Item>
              <Form.Item
                label={T.city}
                name="city"
                rules={req("Kota wajib diisi")}
              >
                <Input placeholder="Kota" />
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
                label={T.state}
                name="state"
                rules={req("Provinsi/State wajib diisi")}
              >
                <Input placeholder="Provinsi/State" />
              </Form.Item>
              <Form.Item
                label={T.postal}
                name="postal"
                rules={req("Kode Pos wajib diisi")}
              >
                <Input placeholder="Kode Pos" />
              </Form.Item>
            </div>

            <Form.Item
              label={T.website}
              name="website"
              rules={req("Website wajib diisi")}
            >
              <Input placeholder="https://example.edu" />
            </Form.Item>
            <Form.Item
              label={T.address}
              name="address"
              rules={req("Alamat wajib diisi")}
            >
              <Input.TextArea rows={2} placeholder="Alamat lengkap" />
            </Form.Item>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              <Form.Item label={T.tuitionMin} name="tuition_min">
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  controls={false}
                  formatter={numFormatter}
                  parser={numParser}
                  placeholder="cth: 1.272"
                />
              </Form.Item>
              <Form.Item label={T.tuitionMax} name="tuition_max">
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  controls={false}
                  formatter={numFormatter}
                  parser={numParser}
                  placeholder="cth: 9.725"
                />
              </Form.Item>
            </div>

            <Form.Item label={T.living} name="living">
              <InputNumber
                style={{ width: "100%" }}
                min={0}
                controls={false}
                formatter={numFormatter}
                parser={numParser}
                placeholder="cth: 15.000"
              />
            </Form.Item>

            <Form.Item label={T.jenjang} name="jenjang">
              <Input placeholder="cth: Universitas / Politeknik / Institut" />
            </Form.Item>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              <Form.Item label={T.contact} name="contact">
                <Input />
              </Form.Item>
              <Form.Item label={T.phone} name="phone">
                <Input />
              </Form.Item>
            </div>

            <Form.Item
              label={T.email}
              name="email"
              rules={[{ type: "email", message: "Format email tidak valid" }]}
            >
              <Input type="email" />
            </Form.Item>

            {/* Requirements — Create */}
            <RequirementsEditor
              ref={reqCreateRef}
              mode="create"
              vm={vm}
              notifyOk={(m, d) => ok(m, d)}
              notifyErr={(m, d) => err(m, d)}
            />

            <div style={styles.modalFooter}>
              <Button
                type="primary"
                size="large"
                onClick={onCreate}
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
          if (logoPrevEdit) URL.revokeObjectURL(logoPrevEdit);
          setLogoPrevEdit("");
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
                  name="logo"
                  valuePropName="fileList"
                  getValueFromEvent={normList}
                  noStyle
                >
                  <Upload
                    accept="image/*"
                    listType="picture-card"
                    showUploadList={false}
                    beforeUpload={beforeLogoEdit}
                    className="portrait-uploader"
                  >
                    <div style={styles.coverBox}>
                      {logoPrevEdit ? (
                        <img
                          src={logoPrevEdit}
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

              <Form.Item label={T.name} name="name">
                <Input placeholder="Nama kampus" />
              </Form.Item>
              <Form.Item label={T.desc} name="description">
                <Input.TextArea rows={3} placeholder="Deskripsi" />
              </Form.Item>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                <Form.Item label={T.country} name="country">
                  <Input />
                </Form.Item>
                <Form.Item label={T.city} name="city">
                  <Input />
                </Form.Item>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                <Form.Item label={T.state} name="state">
                  <Input />
                </Form.Item>
                <Form.Item label={T.postal} name="postal">
                  <Input />
                </Form.Item>
              </div>

              <Form.Item label={T.website} name="website">
                <Input />
              </Form.Item>
              <Form.Item label={T.address} name="address">
                <Input.TextArea rows={2} />
              </Form.Item>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                <Form.Item label={T.tuitionMin} name="tuition_min">
                  <InputNumber
                    style={{ width: "100%" }}
                    min={0}
                    controls={false}
                    formatter={numFormatter}
                    parser={numParser}
                  />
                </Form.Item>
                <Form.Item label={T.tuitionMax} name="tuition_max">
                  <InputNumber
                    style={{ width: "100%" }}
                    min={0}
                    controls={false}
                    formatter={numFormatter}
                    parser={numParser}
                  />
                </Form.Item>
              </div>

              <Form.Item label={T.living} name="living">
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  controls={false}
                  formatter={numFormatter}
                  parser={numParser}
                />
              </Form.Item>

              <Form.Item label={T.jenjang} name="jenjang">
                <Input placeholder="cth: Universitas / Politeknik / Institut" />
              </Form.Item>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                <Form.Item label={T.contact} name="contact">
                  <Input />
                </Form.Item>
                <Form.Item label={T.phone} name="phone">
                  <Input />
                </Form.Item>
              </div>

              <Form.Item
                label={T.email}
                name="email"
                rules={[{ type: "email", message: "Format email tidak valid" }]}
              >
                <Input type="email" />
              </Form.Item>

              {/* Requirements — Edit */}
              {activeRow?.id && (
                <RequirementsEditor
                  ref={reqEditRef}
                  mode="edit"
                  vm={vm}
                  collegeId={activeRow.id}
                  notifyOk={(m, d) => ok(m, d)}
                  notifyErr={(m, d) => err(m, d)}
                />
              )}

              <div style={styles.modalFooter}>
                <Button
                  type="primary"
                  size="large"
                  onClick={onEditSubmit}
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
          setDetailData(null);
          setViewImgMeta({ w: 0, h: 0 });
        }}
        footer={null}
        width={viewModalWidth}
        destroyOnClose
        title={null}
      >
        <div style={styles.modalShell}>
          <Spin spinning={detailLoading}>
            <div style={styles.coverWrap}>
              <div style={styles.coverBoxRead}>
                {detailData?.logo_url ? (
                  <img
                    src={detailData.logo_url}
                    alt="logo"
                    style={styles.coverImgRead}
                    onLoad={(e) =>
                      setViewImgMeta({
                        w: e.currentTarget.naturalWidth,
                        h: e.currentTarget.naturalHeight,
                      })
                    }
                  />
                ) : (
                  <div style={{ padding: 24, textAlign: "center" }}>
                    Tidak ada foto
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
              <div>
                <div style={styles.label}>{T.name}</div>
                <div style={styles.value}>
                  {detailData?.name || activeRow?.name || "-"}
                </div>
              </div>
              <div>
                <div style={styles.label}>{T.desc}</div>
                <div style={{ ...styles.value, whiteSpace: "pre-wrap" }}>
                  {stripTags(detailData?.description) || "—"}
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
                  <div style={styles.label}>{T.country}</div>
                  <div style={styles.value}>{detailData?.country || "—"}</div>
                </div>
                <div>
                  <div style={styles.label}>{T.city}</div>
                  <div style={styles.value}>{detailData?.city || "—"}</div>
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
                  <div style={styles.label}>{T.state}</div>
                  <div style={styles.value}>{detailData?.state || "—"}</div>
                </div>
                <div>
                  <div style={styles.label}>{T.postal}</div>
                  <div style={styles.value}>
                    {detailData?.postal_code || "—"}
                  </div>
                </div>
              </div>

              <div>
                <div style={styles.label}>{T.website}</div>
                <div style={styles.value}>
                  {detailData?.website ? (
                    <a
                      href={detailData.website}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {detailData.website}
                    </a>
                  ) : (
                    "—"
                  )}
                </div>
              </div>

              <div>
                <div style={styles.label}>{T.address}</div>
                <div style={styles.value}>{detailData?.address || "—"}</div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                <div>
                  <div style={styles.label}>{T.tuitionMin}</div>
                  <div style={styles.value}>
                    {detailData?.tuition_min != null
                      ? vm.money(
                          detailData?.tuition_min,
                          detailData?.currency || "IDR"
                        )
                      : "—"}
                  </div>
                </div>
                <div>
                  <div style={styles.label}>{T.tuitionMax}</div>
                  <div style={styles.value}>
                    {detailData?.tuition_max != null
                      ? vm.money(
                          detailData?.tuition_max,
                          detailData?.currency || "IDR"
                        )
                      : "—"}
                  </div>
                </div>
              </div>

              <div>
                <div style={styles.label}>{T.living}</div>
                <div style={styles.value}>
                  {detailData?.living_cost_estimate != null
                    ? vm.money(
                        detailData?.living_cost_estimate,
                        detailData?.currency || "IDR"
                      )
                    : "—"}
                </div>
              </div>

              <div>
                <div style={styles.label}>{T.jenjang}</div>
                <div style={styles.value}>{detailData?.jenjang || "—"}</div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                <div>
                  <div style={styles.label}>{T.contact}</div>
                  <div style={styles.value}>
                    {detailData?.contact_name || "—"}
                  </div>
                </div>
                <div>
                  <div style={styles.label}>{T.phone}</div>
                  <div style={styles.value}>{detailData?.no_telp || "—"}</div>
                </div>
              </div>

              <div>
                <div style={styles.label}>{T.email}</div>
                <div style={styles.value}>{detailData?.email || "—"}</div>
              </div>
            </div>
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
    gridTemplateColumns: "1fr 220px 220px",
    gap: 8,
    marginBottom: 10,
    alignItems: "center",
  },
  searchInput: { height: 36, borderRadius: 10 },
  filterSelect: { width: "100%" },

  tableHeader: {
    display: "grid",
    gridTemplateColumns: "2.2fr 1fr 1.1fr 1fr .8fr .7fr",
    gap: 8,
    marginBottom: 4,
    color: "#0b3e91",
    fontWeight: 700,
    alignItems: "center",
    minWidth: 1020,
  },
  thLeft: { display: "flex", justifyContent: "flex-start", width: "100%" },
  thCenter: { display: "flex", justifyContent: "center", width: "100%" },

  row: {
    display: "grid",
    gridTemplateColumns: "2.2fr 1fr 1.1fr 1fr .8fr .7fr",
    gap: 8,
    alignItems: "center",
    background: "#f5f8ff",
    borderRadius: 10,
    border: "1px solid #e8eeff",
    padding: "8px 10px",
    boxShadow: "0 6px 12px rgba(11, 86, 201, 0.05)",
    minWidth: 1020,
  },

  colName: {
    background: "#ffffff",
    borderRadius: 10,
    border: "1px solid #eef3ff",
    padding: "6px 10px",
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  logoBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    background: "#fff",
    border: "1px solid #e5edff",
    display: "grid",
    placeItems: "center",
    overflow: "hidden",
    boxShadow: "0 2px 6px rgba(0,0,0,.04) inset",
  },
  logoImg: { width: "100%", height: "100%", objectFit: "contain" },
  logoFallback: { fontSize: 18 },
  nameWrap: { display: "grid", gap: 2, minWidth: 0 },
  nameText: {
    fontWeight: 600,
    color: "#111827",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  subDate: { fontSize: 11.5, color: "#6b7280" },

  colCenter: { textAlign: "center", color: "#0f172a", fontWeight: 600 },
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
    maxHeight: "72vh",
    width: "auto",
    height: "auto",
    display: "block",
  },

  modalFooter: { marginTop: 8, display: "grid", placeItems: "center" },
  saveBtn: { minWidth: 200, height: 40, borderRadius: 12 },

  /* requirements */
  reqBlock: {
    marginTop: 16,
    padding: 12,
    border: "1px solid #e6eeff",
    borderRadius: 14,
    background: "#f8fbff",
  },
  reqHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  reqTitle: { fontWeight: 800, color: "#0b3e91" },
  reqEmpty: {
    padding: "16px 12px",
    border: "1px dashed #c8d7fd",
    borderRadius: 12,
    background: "#fff",
    color: "#0b3e91",
    textAlign: "center",
  },
  reqRow: {
    display: "grid",
    gridTemplateColumns: "40px 1fr 150px",
    gap: 8,
    alignItems: "center",
    background: "#fff",
    border: "1px solid #e6eeff",
    borderRadius: 12,
    padding: 8,
  },
  reqSort: {
    fontWeight: 800,
    color: "#0b56c9",
    display: "grid",
    placeItems: "center",
  },
  reqBtns: {
    display: "grid",
    gridAutoFlow: "column",
    gap: 6,
    justifyContent: "end",
  },
};
