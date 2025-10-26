// useConsultantsViewModel.js
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
function toFormData(payload = {}) {
  const fd = new FormData();

  const map = {
    name_id: payload.name_id ?? payload.name,
    description_id: payload.description_id ?? payload.description,
    whatsapp: payload.whatsapp ?? payload.no_whatsapp,
    email: payload.email,
    profile_image_url: payload.profile_image_url,
    autoTranslate:
      payload.autoTranslate === undefined ? true : !!payload.autoTranslate,
    program_images_mode:
      (payload.imagesMode || payload.program_images_mode || "replace") ===
      "append"
        ? "append"
        : "replace",
  };
  Object.entries(map).forEach(([k, v]) => {
    if (v === undefined) return;
    if (typeof v === "boolean") fd.append(k, v ? "true" : "false");
    else if (v === null) fd.append(k, "");
    else fd.append(k, String(v));
  });

  const pf =
    payload.profile_file ||
    (payload.avatar && payload.avatar instanceof File ? payload.avatar : null);
  if (pf instanceof File) fd.append("profile_file", pf);

  const programImages =
    payload.images ||
    payload.program_images ||
    (Array.isArray(payload.images) ? payload.images : []);
  if (Array.isArray(programImages)) {
    programImages
      .map((s) => (s == null ? "" : String(s).trim()))
      .filter(Boolean)
      .forEach((s) => fd.append("program_images[]", s));
  }

  const fileList =
    payload.program_files ||
    payload.files ||
    (payload.program_files instanceof FileList
      ? [...payload.program_files]
      : Array.isArray(payload.program_files)
      ? payload.program_files
      : []);
  (fileList || [])
    .filter((f) => f instanceof File)
    .forEach((f) => fd.append("files[]", f));

  return fd;
}

const SSR_INIT = { headers: { "x-ssr": "1" }, credentials: "include" };
const fetcherWithInit = ([url, init]) => fetch(url, init).then((r) => r.json());

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
    revalidateOnFocus: false,
    keepPreviousData: true,
  });

  const consultants = useMemo(() => {
    const arr = listJson?.data ?? [];
    return arr.map((x) => ({ ...x, phone: x.whatsapp ?? null }));
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
      const res = await fetch(url.toString(), { method: "GET", ...SSR_INIT });
      const info = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          info?.error?.message || info?.message || "Gagal memuat detail"
        );
      }
      const d = info?.data ?? {};
      return { ok: true, data: { ...d, phone: d.whatsapp ?? null } };
    } catch (e) {
      return { ok: false, error: e?.message || "Gagal memuat detail" };
    }
  }

  /* ===== CREATE ===== */
  async function createConsultant(payload) {
    setOpLoading(true);
    try {
      const fd = toFormData(payload);
      const res = await fetch("/api/consultants", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const info = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          info?.error?.message || info?.message || "Gagal menambah konsultan"
        );
      }
      await refresh();
      return { ok: true, data: info?.data };
    } catch (err) {
      return { ok: false, error: err?.message || "Gagal menambah konsultan" };
    } finally {
      setOpLoading(false);
    }
  }

  /* ===== UPDATE ===== */
  async function updateConsultant(id, payload) {
    setOpLoading(true);
    try {
      const fd = toFormData(payload);
      const res = await fetch(`/api/consultants/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: fd,
        credentials: "include",
      });
      const info = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          info?.error?.message || info?.message || "Gagal memperbarui konsultan"
        );
      }
      await refresh();
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
      });
      if (!res.ok && res.status !== 204) {
        const info = await res.json().catch(() => null);
        throw new Error(
          info?.error?.message || info?.message || "Gagal menghapus konsultan"
        );
      }
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
        { method: "DELETE", credentials: "include" }
      );
      if (!res.ok && res.status !== 204) {
        const info = await res.json().catch(() => null);
        throw new Error(info?.error?.message || "Gagal menghapus foto");
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e?.message || "Gagal menghapus foto" };
    }
  }

  const listError = listErrorObj?.message || "";

  return {
    t: {
      title: "Manajemen Konsultan",
      listTitle: "Data Konsultan",
      name: "Nama Konsultan",
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
    deleteProgramImage, // <— expose
    refresh,
  };
}
