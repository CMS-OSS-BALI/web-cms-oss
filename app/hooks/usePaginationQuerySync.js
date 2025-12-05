"use client";

import { useEffect, useRef } from "react";

const parsePositiveInt = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const readQueryParams = (pageKey, perPageKey) => {
  if (typeof window === "undefined") return { page: null, perPage: null };
  const sp = new URLSearchParams(window.location.search);
  return {
    page: parsePositiveInt(sp.get(pageKey)),
    perPage: parsePositiveInt(sp.get(perPageKey)),
  };
};

export default function usePaginationQuerySync({
  page,
  perPage,
  pageKey = "page",
  perPageKey = "perPage",
  setPage,
  setPerPage,
  hydrateFromQuery = false,
} = {}) {
  const hydratedRef = useRef(!hydrateFromQuery);

  // Hydrate state from URL after mount to avoid hydration mismatch
  useEffect(() => {
    if (!hydrateFromQuery) return;
    const { page: qp, perPage: qpp } = readQueryParams(pageKey, perPageKey);
    if (qp) setPage?.(qp);
    if (qpp) setPerPage?.(qpp);
    hydratedRef.current = true;
  }, [hydrateFromQuery, pageKey, perPageKey, setPage, setPerPage]);

  // Keep URL in sync with latest state
  useEffect(() => {
    if (hydrateFromQuery && !hydratedRef.current) return;
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set(pageKey, String(page || 1));
    if (perPage) url.searchParams.set(perPageKey, String(perPage));
    const next =
      url.searchParams.toString().length > 0
        ? `${url.pathname}?${url.searchParams.toString()}${url.hash}`
        : `${url.pathname}${url.hash}`;
    window.history.replaceState({}, "", next);
  }, [page, perPage, pageKey, perPageKey]);
}
