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
  const [loading, setLoading] = useState(false); // non-GET ops
  const [error, setError] = useState("");

  // filters
  const [q, setQ] = useState("");
  const [category, setCategory] = useState(); // "B2B" | "B2C" | undefined
  const [published, setPublished] = useState(); // true | false | undefined
  const [sort, setSort] = useState("created_at:desc");

  // pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(8);
  const [total, setTotal] = useState(0); // derived
  const [totalPages, setTotalPages] = useState(1); // derived

  // debounce
  const debounceRef = useRef(null);

  // Fallback admin ID (untuk Postman/testing)
  const ADMIN_ID = useMemo(
    () => (process.env.NEXT_PUBLIC_ADMIN_USER_ID || "").trim(),
    []
  );

  // SWR List
  const listParams = { q, category, published, page, perPage, sort };
  const listKey = `/api/programs?${buildQuery(listParams)}`;
  const { data: listJson, error: listErr, isLoading: listLoading, mutate } = useSWR(listKey, fetcher);
  const programs = listJson?.data || [];
  useEffect(() => {
    if (listJson?.meta) {
      setTotal(listJson.meta.total || 0);
      setTotalPages(listJson.meta.totalPages || 1);
    }
  }, [listJson]);

  const fetchPrograms = useCallback(async (overrides = {}) => {
    if ("q" in overrides) setQ(overrides.q);
    if ("category" in overrides) setCategory(overrides.category);
    if ("published" in overrides) setPublished(overrides.published);
    if ("page" in overrides) setPage(Math.max(1, overrides.page));
    if ("perPage" in overrides) setPerPage(overrides.perPage);
    if ("sort" in overrides) setSort(overrides.sort);
    // SWR refetches on key change
  }, []);

  /** CREATE */
  const createProgram = useCallback(
    async (payload) => {
      setLoading(true);
      try {
        // API kamu support admin_user_id; sertakan kalau ada fallback env
        const body =
          ADMIN_ID && !payload?.admin_user_id
            ? { ...payload, admin_user_id: ADMIN_ID }
            : payload;

        const res = await fetch("/api/programs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error((await res.json().catch(()=>null))?.message || "Failed to create");
        await fetchPrograms({ page: 1 });
        await mutate();
      } catch (e) {
        console.error(e);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [ADMIN_ID, fetchPrograms, mutate]
  );

  /** UPDATE */
  const updateProgram = useCallback(
    async (id, payload) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/programs/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error((await res.json().catch(()=>null))?.message || "Failed to update");
        await mutate();
      } catch (e) {
        console.error(e);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [mutate]
  );

  /** DELETE */
  const deleteProgram = useCallback(
    async (id) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/programs/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error((await res.json().catch(()=>null))?.message || "Failed to delete");
        await mutate();
      } catch (e) {
        console.error(e);
        throw e;
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
  }, [q, category, published, page, perPage, sort, mutate]);

  return {
    loading: listLoading || loading,
    programs,
    q,
    category,
    published,
    sort,
    page,
    perPage,
    total,
    totalPages,
    error,
    setQ,
    setCategory,
    setPublished,
    setSort,
    setPage,
    setPerPage,
    fetchPrograms,
    createProgram,
    updateProgram,
    deleteProgram,
  };
}
