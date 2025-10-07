// app/(admin)/admin/jurusan/useJurusanViewModel.js
"use client";

import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";

const fetcher = async (url) => {
  const r = await fetch(url, { credentials: "include" });
  let j = {};
  try {
    j = await r.json();
  } catch {}
  if (!r.ok) {
    const msg = j?.message || `Request failed (${r.status})`;
    throw new Error(msg);
  }
  return j;
};

function buildQuery(params = {}) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    sp.set(k, String(v));
  }
  return sp.toString();
}

const isFileObject = (value) =>
  typeof File !== "undefined" && value instanceof File;

const toJsonPayload = (payload = {}) => {
  const result = {};
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined) return;
    result[key] = value;
  });
  return result;
};

const appendFormDataSafe = (formData, payload = {}) => {
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined) return;
    if (value === null) {
      formData.append(key, "");
    } else if (value instanceof Blob) {
      formData.append(key, value);
    } else {
      formData.append(key, String(value));
    }
  });
};

export default function useJurusanViewModel() {
  // filters & pagination
  const [q, setQ] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(12);
  const [sort, setSort] = useState("created_at:desc");
  const [locale, setLocale] = useState("id");
  const [fallback, setFallback] = useState("id");
  const [withDeleted, setWithDeleted] = useState(false);
  const [onlyDeleted, setOnlyDeleted] = useState(false);

  // list jurusan
  const key = useMemo(() => {
    const qs = buildQuery({
      q,
      partner_id: partnerId || undefined,
      locale,
      fallback,
      page,
      perPage,
      sort,
      with_deleted: withDeleted ? 1 : undefined,
      only_deleted: onlyDeleted ? 1 : undefined,
    });
    return `/api/jurusan?${qs}`;
  }, [
    q,
    partnerId,
    locale,
    fallback,
    page,
    perPage,
    sort,
    withDeleted,
    onlyDeleted,
  ]);

  const {
    data: listData,
    error: listError,
    isLoading: loading,
    mutate: refreshList,
  } = useSWR(key, fetcher, { revalidateOnFocus: false });

  const rawJurusan = listData?.data || [];
  const total = listData?.meta?.total || 0;
  const totalPages = listData?.meta?.totalPages || 1;

  // partners (for select)
  const {
    data: partnersData,
    error: partnersError,
    isLoading: partnersLoading,
    mutate: refreshPartners,
  } = useSWR("/api/partners?perPage=1000", fetcher, {
    revalidateOnFocus: false,
  });

  const jurusan = useMemo(
    () =>
      rawJurusan.map((item) => ({
        ...item,
        image_src: item.image_public_url || item.image_url || "",
      })),
    [rawJurusan]
  );

  const partnerOptions = useMemo(() => {
    const rows = partnersData?.data || [];
    return rows.map((p) => ({
      label: p.name || p.slug || p.id,
      value: String(p.id),
    }));
  }, [partnersData]);

  const partnerMetaById = useMemo(() => {
    const rows = partnersData?.data || [];
    const map = new Map();
    rows.forEach((p) => {
      map.set(String(p.id), {
        label: p.name || p.slug || String(p.id),
        currency: (p.currency || "IDR").toUpperCase(),
      });
    });
    return map;
  }, [partnersData]);

  // CRUD actions
  const [opLoading, setOpLoading] = useState(false);

  const createJurusan = useCallback(
    async (payload) => {
      setOpLoading(true);
      try {
        const { file, ...rest } = payload || {};
        let r;
        if (isFileObject(file)) {
          const fd = new FormData();
          fd.append("file", file);
          appendFormDataSafe(fd, rest);
          r = await fetch("/api/jurusan", {
            method: "POST",
            credentials: "include",
            body: fd,
          });
        } else {
          const body = toJsonPayload(rest);
          r = await fetch("/api/jurusan", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
        }
        const j = await r.json().catch(() => ({}));
        if (!r.ok)
          return { ok: false, error: j?.message || "Gagal membuat jurusan" };
        await refreshList();
        return { ok: true, data: j?.data };
      } catch (e) {
        return { ok: false, error: e?.message || "Request error" };
      } finally {
        setOpLoading(false);
      }
    },
    [refreshList]
  );

  const updateJurusan = useCallback(
    async (id, payload) => {
      setOpLoading(true);
      try {
        const { file, ...rest } = payload || {};
        let r;
        const endpoint = `/api/jurusan/${encodeURIComponent(id)}`;
        if (isFileObject(file)) {
          const fd = new FormData();
          fd.append("file", file);
          appendFormDataSafe(fd, rest);
          r = await fetch(endpoint, {
            method: "PATCH",
            credentials: "include",
            body: fd,
          });
        } else {
          const body = toJsonPayload(rest);
          r = await fetch(endpoint, {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
        }
        const j = await r.json().catch(() => ({}));
        if (!r.ok)
          return {
            ok: false,
            error: j?.message || "Gagal memperbarui jurusan",
          };
        await refreshList();
        return { ok: true, data: j?.data };
      } catch (e) {
        return { ok: false, error: e?.message || "Request error" };
      } finally {
        setOpLoading(false);
      }
    },
    [refreshList]
  );

  const deleteJurusan = useCallback(
    async (id) => {
      setOpLoading(true);
      try {
        const r = await fetch(`/api/jurusan/${id}`, {
          method: "DELETE",
          credentials: "include",
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok)
          return { ok: false, error: j?.message || "Gagal menghapus jurusan" };
        await refreshList();
        return { ok: true, data: j?.data };
      } catch (e) {
        return { ok: false, error: e?.message || "Request error" };
      } finally {
        setOpLoading(false);
      }
    },
    [refreshList]
  );

  return {
    // data
    jurusan,
    total,
    totalPages,

    // filters
    q,
    setQ,
    partnerId,
    setPartnerId,
    page,
    setPage,
    perPage,
    setPerPage,
    sort,
    setSort,
    locale,
    setLocale,
    fallback,
    setFallback,
    withDeleted,
    setWithDeleted,
    onlyDeleted,
    setOnlyDeleted,

    // states
    loading,
    partnersLoading,
    listError: listError?.message || null,
    partnersError: partnersError?.message || null,
    opLoading,

    // options
    partnerOptions,
    partnerMetaById,

    // actions
    createJurusan,
    updateJurusan,
    deleteJurusan,
    refreshList,
    refreshPartners,
  };
}
