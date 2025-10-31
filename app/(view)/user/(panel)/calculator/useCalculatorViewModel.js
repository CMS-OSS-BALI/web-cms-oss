"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Kategori yang dipakai kalkulator (sinkron dgn service_categories.slug)
 */
const KATEGORI = [
  { key: "service_fee", name: "Service Fee", slug: "service-fee" },
  { key: "asuransi", name: "Asuransi Kesehatan", slug: "asuransi-kesehatan" },
  { key: "biaya_visa", name: "Biaya Visa", slug: "biaya-visa" },
  { key: "addons", name: "Add-ons", slug: "add-ons" },
];

async function fetchServicesByCategory({
  slug,
  signal,
  locale = "id",
  fallback = "en",
}) {
  const qs = new URLSearchParams({
    category_slug: slug,
    published: "true",
    locale,
    fallback,
    sort: "price:asc",
  }).toString();

  const res = await fetch(`/api/services?${qs}`, {
    signal,
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok)
    throw new Error(`Fetch services failed (${slug}): ${res.status}`);
  const json = await res.json();
  const list = Array.isArray(json?.data) ? json.data : [];
  return list.filter((s) => s?.category?.slug === slug);
}

/**
 * Output:
 * {
 *   loading, error,
 *   categories: {
 *     service_fee: { key, name, slug, items: [{ id, name, price }] },
 *     asuransi:    { ... },
 *     biaya_visa:  { ... },
 *     addons:      { ... },
 *   },
 *   flatList: [{ id, name, price }],
 *   refetch()
 * }
 */
export default function useCalculatorViewModel({
  locale = "id",
  fallback = "en",
} = {}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(() =>
    KATEGORI.reduce((acc, k) => {
      acc[k.key] = { ...k, items: [] };
      return acc;
    }, {})
  );

  const abortRef = useRef(null);
  const inflightRef = useRef(null);
  const mountedOnceRef = useRef(false);
  const prevLocaleRef = useRef({ locale, fallback });

  const load = useCallback(async () => {
    if (inflightRef.current) return inflightRef.current;

    setLoading(true);
    setError(null);

    abortRef.current?.abort?.();
    const controller = new AbortController();
    abortRef.current = controller;

    inflightRef.current = (async () => {
      try {
        const results = await Promise.all(
          KATEGORI.map(async (k) => {
            const raw = await fetchServicesByCategory({
              slug: k.slug,
              signal: controller.signal,
              locale,
              fallback,
            });
            const items = (raw || []).map((s) => ({
              id: s.id,
              name: s.name ?? "",
              price: s.price ?? 0,
            }));
            return { key: k.key, meta: k, items };
          })
        );

        if (controller.signal.aborted) return;

        const shaped = results.reduce((acc, r) => {
          acc[r.key] = { ...r.meta, items: r.items };
          return acc;
        }, {});
        setData(shaped);
      } catch (err) {
        if (err?.name !== "AbortError") {
          setError(err?.message || "Gagal memuat data services");
        }
      } finally {
        setLoading(false);
        inflightRef.current = null;
      }
    })();

    return inflightRef.current;
  }, [locale, fallback]);

  // Mount sekali (hindari double fetch di StrictMode)
  useEffect(() => {
    if (mountedOnceRef.current) return;
    mountedOnceRef.current = true;
    load();
    return () => {
      mountedOnceRef.current = false;
      try {
        abortRef.current?.abort();
      } catch {}
      abortRef.current = null;
      inflightRef.current = null;
    };
  }, [load]);

  // Refetch saat locale/fallback berubah
  useEffect(() => {
    const prev = prevLocaleRef.current;
    if (prev.locale !== locale || prev.fallback !== fallback) {
      prevLocaleRef.current = { locale, fallback };
      load();
    }
  }, [locale, fallback, load]);

  const flatList = useMemo(
    () => KATEGORI.flatMap((k) => data[k.key]?.items || []),
    [data]
  );

  return {
    loading,
    error,
    categories: data,
    flatList,
    refetch: load,
  };
}
