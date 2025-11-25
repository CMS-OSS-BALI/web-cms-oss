// app/(view)/admin/consultants/useConsultantsViewModel.js
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";

const DEFAULT_SORT = "created_at:desc";
const DEFAULT_LOCALE = "id";
const fallbackFor = (loc) => (String(loc).toLowerCase() === "id" ? "en" : "id");

// ---- helpers ----
function buildKey({ page, perPage, q, sort, locale, fallback }) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("perPage", String(perPage));
  params.set("sort", sort || DEFAULT_SORT);
  params.set("locale", locale || DEFAULT_LOCALE);
  params.set("fallback", fallback || fallbackFor(locale || DEFAULT_LOCALE));
  if (q && q.trim()) params.set("q", q.trim());
  return `/api/consultants?${params.toString()}`;
}

/** payload -> FormData (support replace/append program_images) */
// NOTE: autoTranslate hanya dikirim kalau eksplisit diset pada payload.
//       (default lama yang selalu true dihapus supaya PATCH tidak lambat)
function toFormData(payload = {}) {
  const fd = new FormData();

  const map = {
    name_id: payload.name_id ?? payload.name,
    role_id: payload.role_id ?? payload.role,
    description_id: payload.description_id ?? payload.description,
    whatsapp: payload.whatsapp ?? payload.no_whatsapp,
    email: payload.email,
    profile_image_url: payload.profile_image_url,
  };
  Object.entries(map).forEach(([k, v]) => {
    if (v === undefined) return;
    if (v === null) fd.append(k, "");
    else fd.append(k, String(v));
  });

  // program_images_mode hanya dikirim kalau di-provide (hindari side effect)
  const mode = payload.imagesMode || payload.program_images_mode;
  if (mode) {
    fd.append("program_images_mode", mode === "append" ? "append" : "replace");
  }

  // Hanya kirim autoTranslate jika eksplisit diset di payload
  if (typeof payload.autoTranslate === "boolean") {
    fd.append("autoTranslate", payload.autoTranslate ? "true" : "false");
  }

  // avatar file
  const pf =
    payload.profile_file ||
    (payload.avatar && payload.avatar instanceof File ? payload.avatar : null);
  if (pf instanceof File) fd.append("profile_file", pf);

  // program images (string URL/keys yang dipertahankan)
  const programImages = Array.isArray(payload.program_images)
    ? payload.program_images
    : Array.isArray(payload.images)
    ? payload.images
    : [];
  programImages
    .map((s) => (s == null ? "" : String(s).trim()))
    .filter(Boolean)
    .forEach((s) => fd.append("program_images[]", s));

  // file baru untuk program images
  const programFiles =
    payload.program_files instanceof FileList
      ? [...payload.program_files]
      : Array.isArray(payload.program_files)
      ? payload.program_files
      : Array.isArray(payload.files)
      ? payload.files
      : [];
  programFiles
    .filter((f) => f instanceof File)
    .forEach((f) => fd.append("files[]", f));

  return fd;
}

// Tambahkan no-store agar benar-benar fresh
const SSR_INIT = {
  headers: { "x-ssr": "1" },
  credentials: "include",
  cache: "no-store",
  // Hindari cache di beberapa browser/CDN bandel
  headersAdditional: { Pragma: "no-cache" },
};
const fetcherWithInit = async ([url, init]) => {
  const merged = {
    ...init,
    headers: {
      ...(init?.headers || {}),
      ...(SSR_INIT.headersAdditional || {}),
    },
  };
  const r = await fetch(url, merged);
  return r.json();
};

/* ---------- unified error extraction ---------- */
async function readJsonIfAny(res) {
  if (!res) return null;
  if (res.status === 204) return null;
  const ct = res.headers?.get?.("content-type") || "";
  if (!ct.includes("application/json")) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function extractFieldErrors(json) {
  const fields = {};

  if (json?.errors && typeof json.errors === "object") {
    for (const [k, v] of Object.entries(json.errors)) {
      if (Array.isArray(v)) fields[k] = v.join("\n");
      else if (v) fields[k] = String(v);
    }
  }

  const candidate = json?.error?.fields || json?.fieldErrors || json?.fields;
  if (candidate && typeof candidate === "object") {
    for (const [k, v] of Object.entries(candidate)) {
      if (Array.isArray(v)) fields[k] = v.join("\n");
      else if (v) fields[k] = String(v);
    }
  }

  const details = json?.error?.details || json?.details;
  if (Array.isArray(details)) {
    for (const d of details) {
      const key = Array.isArray(d?.path) ? d.path.join(".") : d?.path || "form";
      const msg = d?.message || d?.msg || d?.error || "Invalid";
      fields[key] = fields[key] ? `${fields[key]}\n${msg}` : msg;
    }
  }

  return fields;
}

function buildErrorResult(res, jsonFallback, defaultMessage) {
  const json = jsonFallback || {};
  const message =
    json?.error?.message ||
    json?.message ||
    json?.msg ||
    defaultMessage ||
    "Terjadi kesalahan";
  const fields = extractFieldErrors(json);
  const code = json?.error?.code || json?.code || res?.status;
  return { ok: false, error: message, fields, code, raw: json };
}

export default function useConsultantsViewModel() {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState(DEFAULT_SORT);
  const [locale, setLocale] = useState(DEFAULT_LOCALE);
  const [fallback, setFallback] = useState(fallbackFor(DEFAULT_LOCALE));
  const [opLoading, setOpLoading] = useState(false);

  const listKey = useMemo(
    () => [buildKey({ page, perPage, q, sort, locale, fallback }), SSR_INIT],
    [page, perPage, q, sort, locale, fallback]
  );

  const {
    data: listJson,
    error: listErrorObj,
    isLoading,
    mutate,
  } = useSWR(listKey, fetcherWithInit, {
    revalidateOnFocus: true,
    keepPreviousData: true,
    dedupingInterval: 500, // lebih agresif agar refresh cepat
  });

  const consultants = useMemo(() => {
    const arr = listJson?.data ?? [];
    // server sudah kirim profile_image_url (public URL) & whatsapp + role
    return arr.map((x) => ({
      ...x,
      phone: x.whatsapp ?? null,
    }));
  }, [listJson?.data]);

  const total = listJson?.meta?.total ?? 0;
  const metaPage = listJson?.meta?.page;
  const metaPerPage = listJson?.meta?.perPage;

  useEffect(() => {
    if (metaPage && metaPage !== page) setPage(metaPage);
    if (metaPerPage && metaPerPage !== perPage) setPerPage(metaPerPage);
  }, [metaPage, metaPerPage, page, perPage]);

  const totalPages = useMemo(() => {
    const denom = metaPerPage ?? perPage ?? 1;
    return Math.max(1, Math.ceil(total / denom));
  }, [total, metaPerPage, perPage]);

  const refresh = useCallback(() => mutate(), [mutate]);

  /* ===== DETAIL ===== */
  async function getConsultant(id) {
    try {
      const url = new URL(
        `/api/consultants/${encodeURIComponent(id)}`,
        window.location.origin
      );
      url.searchParams.set("locale", locale);
      url.searchParams.set("fallback", fallback);
      const res = await fetch(url.toString(), {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: { "x-ssr": "1", Pragma: "no-cache" },
      });
      const info = await res.json().catch(() => null);
      if (!res.ok) {
        return buildErrorResult(res, info, "Gagal memuat detail");
      }
      const d = info?.data ?? {};
      // data sudah punya profile_image_url & program_images[].image_url
      return {
        ok: true,
        data: {
          ...d,
          phone: d.whatsapp ?? null,
        },
      };
    } catch (e) {
      return { ok: false, error: e?.message || "Gagal memuat detail" };
    }
  }

  /* ===== CREATE ===== */
  async function createConsultant(payload) {
    setOpLoading(true);
    try {
      // CREATE: autoTranslate default ON (eksplisit)
      const fd = toFormData({
        ...payload,
        autoTranslate: true,
        program_images_mode: "replace",
      });
      const res = await fetch("/api/consultants", {
        method: "POST",
        body: fd,
        credentials: "include",
        cache: "no-store",
        headers: { Pragma: "no-cache" },
      });
      const info = await readJsonIfAny(res);
      if (!res.ok) {
        return buildErrorResult(res, info, "Gagal menambah konsultan");
      }

      // Reset ke halaman 1 agar item baru (sort desc) langsung terlihat
      setPage(1);
      await refresh();

      return { ok: true, data: info?.data };
    } catch (err) {
      return { ok: false, error: err?.message || "Gagal menambah konsultan" };
    } finally {
      setOpLoading(false);
    }
  }

  /* ===== UPDATE (text + avatar + optional append images) ===== */
  async function updateConsultant(id, payload) {
    setOpLoading(true);
    try {
      const { imagesMode, ...rest } = payload || {};
      const toSend = {
        ...rest,
        autoTranslate: payload?.autoTranslate ?? false,
      };
      if (imagesMode) {
        toSend.program_images_mode = imagesMode; // "append" / "replace"
      }

      const fd = toFormData(toSend);

      const reqInit = {
        method: "PATCH",
        body: fd,
        credentials: "include",
        cache: "no-store",
        headers: { Pragma: "no-cache" },
      };
      const url = `/api/consultants/${encodeURIComponent(id)}`;
      const res = await fetch(url, reqInit);
      const info = await readJsonIfAny(res);
      if (!res.ok) {
        return buildErrorResult(res, info, "Gagal memperbarui konsultan");
      }

      // --- Optimistic patch ke list supaya UI langsung terlihat ---
      await mutate(
        (current) => {
          if (!current?.data) return current;
          const next = { ...current, data: [...current.data] };
          const idx = next.data.findIndex((it) => it.id === id);
          if (idx !== -1) {
            const prev = next.data[idx];
            next.data[idx] = {
              ...prev,
              name: payload.name ?? prev.name,
              role: payload.role ?? prev.role,
              description: payload.description ?? prev.description,
              email: payload.email ?? prev.email,
              whatsapp:
                payload.no_whatsapp ?? payload.whatsapp ?? prev.whatsapp,
              // profile image akan di-refresh saat revalidate; tak perlu set manual
            };
          }
          return next;
        },
        { revalidate: true }
      );

      return { ok: true, data: info?.data };
    } catch (err) {
      return {
        ok: false,
        error: err?.message || "Gagal memperbarui konsultan",
      };
    } finally {
      setOpLoading(false);
    }
  }

  /* ===== DELETE ===== */
  async function deleteConsultant(id) {
    setOpLoading(true);
    try {
      const res = await fetch(`/api/consultants/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
        cache: "no-store",
        headers: { Pragma: "no-cache" },
      });

      if (!res.ok && res.status !== 204) {
        const info = await readJsonIfAny(res);
        return buildErrorResult(res, info, "Gagal menghapus konsultan");
      }

      // Clamp page: jika item terakhir terhapus, jangan biarkan halaman kosong
      const denom = metaPerPage ?? perPage ?? 1;
      const newTotal = Math.max(0, (total ?? 0) - 1);
      const after = Math.max(1, Math.ceil(newTotal / denom));
      setPage((p) => Math.min(p, after));

      await refresh();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err?.message || "Gagal menghapus konsultan" };
    } finally {
      setOpLoading(false);
    }
  }

  /* ===== DELETE 1 FOTO PROGRAM ===== */
  async function deleteProgramImage(consultantId, imageId) {
    try {
      const res = await fetch(
        `/api/consultants/${encodeURIComponent(
          consultantId
        )}/program-images/${encodeURIComponent(imageId)}`,
        { method: "DELETE", credentials: "include", cache: "no-store" }
      );
      if (!res.ok && res.status !== 204) {
        const info = await readJsonIfAny(res);
        return buildErrorResult(res, info, "Gagal menghapus foto");
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e?.message || "Gagal menghapus foto" };
    }
  }

  /* ===== UPDATE 1 FOTO PROGRAM (16:9) ===== */
  async function updateProgramImage(consultantId, imageId, file) {
    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch(
        `/api/consultants/${encodeURIComponent(
          consultantId
        )}/program-images/${encodeURIComponent(imageId)}`,
        {
          method: "PUT",
          body: fd,
          credentials: "include",
          cache: "no-store",
        }
      );

      const info = await readJsonIfAny(res);
      if (!res.ok) {
        return buildErrorResult(res, info, "Gagal mengganti foto");
      }

      return { ok: true, data: info?.data };
    } catch (e) {
      return { ok: false, error: e?.message || "Gagal mengganti foto" };
    }
  }

  const listError = listErrorObj?.message || "";

  return {
    t: {
      title: "Manajemen Konsultan",
      listTitle: "Data Konsultan",
      name: "Nama Konsultan",
      role: "Role / Jabatan",
      email: "Email",
      phone: "No Whatsapp",
      action: "Action",
      addNew: "Buat Data Baru",
      totalLabel: "Konsultan",
      view: "Lihat",
      edit: "Edit",
      del: "Hapus",
      modalCreateTitle: "Buat Data Konsultan",
      desc: "Deskripsi Konsultan",
      programBlock: "Foto Program Konsultan",
      save: "SIMPAN",
    },
    tokens: { shellW: 1180, headerH: 84, blue: "#0b56c9", text: "#0f172a" },

    consultants,
    total,
    totalPages,

    page,
    perPage,
    q,
    sort,
    locale,
    fallback,

    setPage,
    setPerPage,
    setQ,
    setSort,
    setLocale,
    setFallback,

    loading: isLoading,
    opLoading,
    listError,

    getConsultant,
    createConsultant,
    updateConsultant,
    deleteConsultant,
    deleteProgramImage,
    updateProgramImage,
    refresh,
  };
}
