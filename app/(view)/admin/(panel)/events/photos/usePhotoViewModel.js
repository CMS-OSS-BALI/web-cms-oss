"use client";

import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/swr/fetcher";

/* =========================
   Storage public URL helper
========================= */
const PUBLIC_PREFIX = "cms-oss";

function computePublicBase() {
  const base = (
    process.env.NEXT_PUBLIC_OSS_STORAGE_BASE_URL ||
    process.env.OSS_STORAGE_BASE_URL ||
    ""
  ).replace(/\/+$/, "");
  if (!base) return "";
  try {
    const u = new URL(base);
    const host = u.host.replace(/^storage\./, "cdn.");
    return `${u.protocol}//${host}`;
  } catch {
    return base;
  }
}

const PUBLIC_BASE = computePublicBase();

/* =========================
   Query builders & helpers
========================= */
function buildListKey(filter) {
  const params = new URLSearchParams();
  if (filter === "published") params.set("published", "1");
  else if (filter === "unpublished") params.set("published", "0");
  const qs = params.toString();
  return `/api/previous-event-photos${qs ? `?${qs}` : ""}`;
}

function toFormData(payload = {}) {
  const fd = new FormData();
  Object.entries(payload).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (v instanceof File) {
      fd.append(k, v);
    } else if (Array.isArray(v)) {
      v.forEach((it) => fd.append(`${k}[]`, it));
    } else if (typeof v === "boolean") {
      fd.append(k, v ? "true" : "false");
    } else {
      fd.append(k, String(v));
    }
  });
  return fd;
}

function extractErrorMessage(json, fallback = "Terjadi kesalahan.") {
  if (!json || typeof json !== "object") return fallback;
  return json?.error?.message || json?.message || json?.error || fallback;
}

function buildPublicImageUrl(key) {
  if (!key) return "";
  if (/^https?:\/\//i.test(key)) return key;

  const clean = String(key || "").replace(/^\/+/, "");
  const prefixed = clean.startsWith(`${PUBLIC_PREFIX}/`)
    ? clean
    : `${PUBLIC_PREFIX}/${clean}`;

  if (!PUBLIC_BASE) return `/public/${prefixed}`;
  return `${PUBLIC_BASE}/public/${prefixed}`;
}

/* =========================
   View Model
========================= */
export default function usePhotoViewModel() {
  const [filter, setFilter] = useState("all"); // all | published | unpublished
  const [opLoading, setOpLoading] = useState(false);

  const listKey = buildListKey(filter);
  const {
    data: listJson,
    error: listErrorObj,
    isLoading: listLoading,
    mutate: mutateList,
  } = useSWR(listKey, fetcher);

  const photos = useMemo(() => {
    const rows = listJson?.data ?? [];
    return rows.map((p) => {
      const createdAt = p.created_at || null;
      const createdTs = createdAt ? Date.parse(createdAt) : null;
      return {
        ...p,
        created_at: createdAt,
        created_ts: createdTs,
        image_src: buildPublicImageUrl(p.image_url || ""),
      };
    });
  }, [listJson]);

  const total = photos.length;
  const listError = listErrorObj?.message || "";

  const refresh = useCallback(() => mutateList(), [mutateList]);

  /* ===== CRUD ===== */
  async function createPhoto({ image, is_published = false }) {
    if (!(image instanceof File)) {
      return { ok: false, error: "File gambar belum dipilih." };
    }
    setOpLoading(true);
    try {
      const body = toFormData({ image, is_published });
      const res = await fetch("/api/previous-event-photos", {
        method: "POST",
        body,
      });
      if (!res.ok) {
        const info = await res.json().catch(() => null);
        const msg = extractErrorMessage(info, "Gagal menambah foto event.");
        throw new Error(msg);
      }
      await refresh();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err?.message || "Gagal menambah foto event." };
    } finally {
      setOpLoading(false);
    }
  }

  async function updatePhotoPublished(id, is_published) {
    setOpLoading(true);
    try {
      const res = await fetch(
        `/api/previous-event-photos/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_published: !!is_published }),
        }
      );
      if (!res.ok) {
        const info = await res.json().catch(() => null);
        const msg = extractErrorMessage(
          info,
          "Gagal mengubah status publish foto."
        );
        throw new Error(msg);
      }
      await refresh();
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err?.message || "Gagal mengubah status publish foto.",
      };
    } finally {
      setOpLoading(false);
    }
  }

  async function deletePhoto(id) {
    setOpLoading(true);
    try {
      const res = await fetch(
        `/api/previous-event-photos/${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const info = await res.json().catch(() => null);
        const msg = extractErrorMessage(
          info,
          "Gagal menghapus foto event (soft delete)."
        );
        throw new Error(msg);
      }
      await refresh();
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err?.message || "Gagal menghapus foto event.",
      };
    } finally {
      setOpLoading(false);
    }
  }

  return {
    // data
    photos,
    total,

    // filter
    filter,
    setFilter,

    // state
    loading: listLoading,
    opLoading,
    listError,

    // actions
    refresh,
    createPhoto,
    updatePhotoPublished,
    deletePhoto,
  };
}
