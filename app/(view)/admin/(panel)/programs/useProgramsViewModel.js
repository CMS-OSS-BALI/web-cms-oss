"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { crudService } from "@/app/utils/services/crudService";

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
  const [loading, setLoading] = useState(false);
  const [programs, setPrograms] = useState([]);
  const [error, setError] = useState("");

  // filters
  const [q, setQ] = useState("");
  const [category, setCategory] = useState(); // "B2B" | "B2C" | undefined
  const [published, setPublished] = useState(); // true | false | undefined
  const [sort, setSort] = useState("created_at:desc");

  // pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // debounce
  const debounceRef = useRef(null);

  // Fallback admin ID (untuk Postman/testing)
  const ADMIN_ID = useMemo(
    () => (process.env.NEXT_PUBLIC_ADMIN_USER_ID || "").trim(),
    []
  );

  /** LIST */
  const fetchPrograms = useCallback(
    async (overrides = {}) => {
      const params = {
        q: overrides.q ?? q,
        category: overrides.category ?? category,
        published: overrides.published ?? published,
        page: Math.max(1, overrides.page ?? page),
        perPage: overrides.perPage ?? perPage,
        sort: overrides.sort ?? sort,
      };

      // sinkronkan state kalau ada override
      if ("q" in overrides) setQ(overrides.q);
      if ("category" in overrides) setCategory(overrides.category);
      if ("published" in overrides) setPublished(overrides.published);
      if ("page" in overrides) setPage(params.page);
      if ("perPage" in overrides) setPerPage(params.perPage);
      if ("sort" in overrides) setSort(params.sort);

      setLoading(true);
      setError("");
      try {
        const qs = buildQuery(params);
        const json = await crudService.get(`/api/programs?${qs}`);
        setPrograms(json?.data || []);
        setTotal(json?.meta?.total || 0);
        setTotalPages(json?.meta?.totalPages || 1);
      } catch (e) {
        console.error(e);
        setError(e?.message || "Failed to fetch");
      } finally {
        setLoading(false);
      }
    },
    [q, category, published, page, perPage, sort]
  );

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

        await crudService.post("/api/programs", body);
        await fetchPrograms();
      } catch (e) {
        console.error(e);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [ADMIN_ID, fetchPrograms]
  );

  /** UPDATE */
  const updateProgram = useCallback(
    async (id, payload) => {
      setLoading(true);
      try {
        await crudService.patch(`/api/programs/${id}`, payload); // pakai route [id]
        await fetchPrograms();
      } catch (e) {
        console.error(e);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [fetchPrograms]
  );

  /** DELETE */
  const deleteProgram = useCallback(
    async (id) => {
      setLoading(true);
      try {
        await crudService.delete(`/api/programs/${id}`); // DELETE tanpa body
        await fetchPrograms();
      } catch (e) {
        console.error(e);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [fetchPrograms]
  );

  // auto-fetch (debounce)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPrograms(), 350);
    return () => clearTimeout(debounceRef.current);
  }, [q, category, published, page, perPage, sort, fetchPrograms]);

  return {
    loading,
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
