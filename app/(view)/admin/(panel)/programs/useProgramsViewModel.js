"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/swr/fetcher";

/* ===== Helpers ===== */
const buildQuery = (params = {}) => {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    sp.set(k, String(v));
  });
  return sp.toString();
};

export default function useProgramsViewModel() {
  const [loading, setLoading] = useState(false); // non-GET ops (create/update/delete)

  // ===== Filters =====
  const [q, setQ] = useState("");
  /** "B2B" | "B2C" | undefined */
  const [programType, setProgramType] = useState();
  /** "STUDY_ABROAD" | "WORK_ABROAD" | "LANGUAGE_COURSE" | "CONSULTANT_VISA" | undefined */
  const [programCategory, setProgramCategory] = useState();
  /** true | false | undefined */
  const [published, setPublished] = useState();
  const [sort, setSort] = useState("created_at:desc");

  // (opsional) dukung i18n list
  const [locale] = useState("id");
  const [fallback] = useState("id");

  // ===== Pagination =====
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(8);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // debounce revalidate
  const debounceRef = useRef(null);

  // Fallback admin ID (untuk Postman/testing lokal)
  const ADMIN_ID = useMemo(
    () => (process.env.NEXT_PUBLIC_ADMIN_USER_ID || "").trim(),
    []
  );

  // ===== SWR List =====
  const listParams = {
    q,
    program_type: programType || undefined,
    program_category: programCategory || undefined,
    published,
    page,
    perPage,
    sort,
    locale,
    fallback,
  };

  const listKey = `/api/programs?${buildQuery(listParams)}`;

  const {
    data: listJson,
    error: listErr,
    isLoading: listLoading,
    mutate,
  } = useSWR(listKey, fetcher, { revalidateOnFocus: false });

  const programs = listJson?.data || [];
  useEffect(() => {
    if (listJson?.meta) {
      setTotal(listJson.meta.total || 0);
      setTotalPages(listJson.meta.totalPages || 1);
    }
  }, [listJson]);

  // helper untuk memodifikasi filter/pagination (akan memicu fetch oleh SWR via key change)
  const fetchPrograms = useCallback(async (overrides = {}) => {
    if ("q" in overrides) setQ(overrides.q);
    if ("programType" in overrides) setProgramType(overrides.programType);
    if ("programCategory" in overrides)
      setProgramCategory(overrides.programCategory);
    if ("published" in overrides) setPublished(overrides.published);
    if ("page" in overrides) setPage(Math.max(1, overrides.page));
    if ("perPage" in overrides) setPerPage(overrides.perPage);
    if ("sort" in overrides) setSort(overrides.sort);
  }, []);

  /** ===== CREATE =====
   * payload minimal:
   * {
   *   program_type: "B2B" | "B2C",
   *   program_category?: "STUDY_ABROAD" | "WORK_ABROAD" | "LANGUAGE_COURSE" | "CONSULTANT_VISA",
   *   name_id: string,
   *   description_id?: string,
   *   image_url?: string, price?: number, phone?: string, is_published?: boolean,
   *   name_en?, description_en?, autoTranslate? (default true di API)
   * }
   */
  const createProgram = useCallback(
    async (payload) => {
      setLoading(true);
      try {
        // Sertakan admin_user_id jika tersedia via env untuk testing manual
        const body =
          ADMIN_ID && !payload?.admin_user_id
            ? { ...payload, admin_user_id: ADMIN_ID }
            : payload;

        const res = await fetch("/api/programs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j?.message || "Failed to create program");

        // setelah create, reset ke page 1 agar item baru terlihat
        await fetchPrograms({ page: 1 });
        await mutate();
        return { ok: true, data: j?.data };
      } catch (e) {
        console.error(e);
        return { ok: false, error: e?.message || "Request error" };
      } finally {
        setLoading(false);
      }
    },
    [ADMIN_ID, fetchPrograms, mutate]
  );

  /** ===== UPDATE ===== */
  const updateProgram = useCallback(
    async (id, payload) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/programs/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j?.message || "Failed to update program");
        await mutate();
        return { ok: true, data: j?.data };
      } catch (e) {
        console.error(e);
        return { ok: false, error: e?.message || "Request error" };
      } finally {
        setLoading(false);
      }
    },
    [mutate]
  );

  /** ===== DELETE (soft) ===== */
  const deleteProgram = useCallback(
    async (id) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/programs/${id}`, { method: "DELETE" });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j?.message || "Failed to delete program");
        await mutate();
        return { ok: true, data: j?.data };
      } catch (e) {
        console.error(e);
        return { ok: false, error: e?.message || "Request error" };
      } finally {
        setLoading(false);
      }
    },
    [mutate]
  );

  // auto-refetch (debounce state changes → mutate)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => mutate(), 350);
    return () => clearTimeout(debounceRef.current);
  }, [q, programType, programCategory, published, page, perPage, sort, mutate]);

  return {
    // states
    loading: listLoading || loading,
    error: listErr?.message || "",

    // data
    programs,
    total,
    totalPages,

    // filters (getters)
    q,
    programType,
    programCategory,
    published,
    sort,
    page,
    perPage,

    // filters (setters)
    setQ,
    setProgramType,
    setProgramCategory,
    setPublished,
    setSort,
    setPage,
    setPerPage,

    // API ops
    fetchPrograms,
    createProgram,
    updateProgram,
    deleteProgram,
  };
}
