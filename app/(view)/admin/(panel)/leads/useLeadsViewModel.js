"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/swr/fetcher";

export const ASSIGNED_FILTER = {
  UNASSIGNED: "UNASSIGNED",
  ALL: "ALL",
  ASSIGNED: "ASSIGNED",
};

const DEFAULT_SORT = "created_at:desc";

// useLeadsViewModel.js
function buildQuery({
  page,
  perPage,
  q,
  sort,
  assignedFilter,
  includeDeleted,
}) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("perPage", String(perPage));
  if (q.trim()) params.set("q", q.trim());
  if (sort) params.set("sort", sort);
  if (includeDeleted) params.set("with_deleted", "1");

  // NEW: support consultant-specific filter
  if (
    assignedFilter &&
    assignedFilter !== ASSIGNED_FILTER.ALL &&
    assignedFilter !== ASSIGNED_FILTER.UNASSIGNED &&
    assignedFilter !== ASSIGNED_FILTER.ASSIGNED
  ) {
    // assignedFilter holds the consultant id as string
    params.set("assigned_to", assignedFilter);
  } else {
    // legacy 3-state filter
    switch (assignedFilter) {
      case ASSIGNED_FILTER.ALL:
        params.set("include_assigned", "1");
        break;
      case ASSIGNED_FILTER.ASSIGNED:
        params.set("only_assigned", "1");
        break;
      default:
        // UNASSIGNED = default (assigned_to IS NULL)
        break;
    }
  }

  return `/api/leads?${params.toString()}`;
}

export default function useLeadsViewModel() {
  const [q, setQ] = useState("");
  const [assignedFilter, setAssignedFilter] = useState(
    ASSIGNED_FILTER.UNASSIGNED
  );
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [sort, setSort] = useState(DEFAULT_SORT);
  const [opLoading, setOpLoading] = useState(false);

  // SWR key
  const listKey = useMemo(
    () =>
      buildQuery({ page, perPage, q, sort, assignedFilter, includeDeleted }),
    [page, perPage, q, sort, assignedFilter, includeDeleted]
  );

  const {
    data: listJson,
    error: listErrorObj,
    isLoading: listLoading,
    mutate: mutateLeads,
  } = useSWR(listKey, fetcher);

  const leads = listJson?.data ?? [];
  const total = listJson?.meta?.total ?? 0;
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / (perPage || 1))),
    [total, perPage]
  );

  // sinkronkan page/perPage dari API meta (jika backend mengubah)
  useEffect(() => {
    if (listJson?.meta?.page) setPage(listJson.meta.page);
    if (listJson?.meta?.perPage) setPerPage(listJson.meta.perPage);
  }, [listJson]);

  // consultants (untuk dropdown assign)
  const consultantsKey = "/api/consultants?perPage=200&sort=name:asc";
  const { data: consultantsJson, isLoading: consultantsLoading } = useSWR(
    consultantsKey,
    fetcher
  );
  const consultants = consultantsJson?.data ?? [];
  const consultantOptions = useMemo(
    () =>
      consultants.map((c) => ({
        label: c.name,
        value: String(c.id), // simpan sebagai string supaya aman di Select
        raw: c,
      })),
    [consultants]
  );

  const refresh = useCallback(() => mutateLeads(), [mutateLeads]);

  async function createLead(payload) {
    setOpLoading(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload || {}),
      });
      if (!res.ok) {
        const info = await res.json().catch(() => null);
        throw new Error(
          info?.error?.message || info?.message || "Gagal menambah lead"
        );
      }
      await refresh();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err?.message || "Gagal menambah lead" };
    } finally {
      setOpLoading(false);
    }
  }

  async function updateLead(id, payload) {
    setOpLoading(true);
    try {
      const res = await fetch(`/api/leads/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload || {}),
      });
      if (!res.ok) {
        const info = await res.json().catch(() => null);
        throw new Error(
          info?.error?.message || info?.message || "Gagal memperbarui lead"
        );
      }
      await refresh();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err?.message || "Gagal memperbarui lead" };
    } finally {
      setOpLoading(false);
    }
  }

  async function deleteLead(id) {
    setOpLoading(true);
    try {
      const res = await fetch(`/api/leads/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const info = await res.json().catch(() => null);
        throw new Error(
          info?.error?.message || info?.message || "Gagal menghapus lead"
        );
      }
      await refresh();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err?.message || "Gagal menghapus lead" };
    } finally {
      setOpLoading(false);
    }
  }

  /** Assign konsultan ke lead (trigger WA dikirim oleh backend) */
  async function assignConsultant(leadId, consultantId) {
    // consultantId bisa string (dari Select), backend akan parse BigInt
    return updateLead(leadId, { assigned_to: consultantId });
  }

  /** Lepas konsultan (set null) */
  async function unassignConsultant(leadId) {
    return updateLead(leadId, { assigned_to: null });
  }

  const listError = listErrorObj?.message || "";

  return {
    // data
    leads,
    total,
    totalPages,

    // paging & filters
    page,
    perPage,
    sort,
    q,
    assignedFilter,
    includeDeleted,

    // setters
    setQ,
    setPage,
    setPerPage,
    setSort,
    setAssignedFilter,
    setIncludeDeleted,

    // states
    loading: listLoading,
    opLoading,
    listError,

    // consultants
    consultants,
    consultantOptions,
    consultantsLoading,

    // actions
    createLead,
    updateLead,
    deleteLead,
    assignConsultant,
    unassignConsultant,
    refresh,
  };
}
