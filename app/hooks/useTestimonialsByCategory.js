"use client";

import useSWR from "swr";

const fetcher = (url) =>
  fetch(url, { cache: "no-store" }).then((r) => {
    if (!r.ok) throw new Error("Failed to load testimonials");
    return r.json();
  });

/**
 * Ambil testimoni berdasarkan kategori.
 * @param {string} category - contoh: "layanan"
 * @param {string} locale   - contoh: "id"
 * @param {number} limit    - default 12
 */
export function useTestimonialsByCategory(
  category = "layanan",
  locale = "id",
  limit = 12
) {
  const qs = new URLSearchParams({
    category,
    locale,
    limit: String(limit),
  }).toString();
  const { data, error, isLoading } = useSWR(`/api/testimonials?${qs}`, fetcher);

  return {
    testimonials: Array.isArray(data?.data) ? data.data : [],
    total: data?.total ?? 0,
    isLoading,
    isError: !!error,
  };
}
