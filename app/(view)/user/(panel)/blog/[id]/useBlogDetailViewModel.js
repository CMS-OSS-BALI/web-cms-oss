"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { useParams } from "next/navigation";
import { fetcher } from "@/lib/swr/fetcher";

/* ---------- helpers ---------- */
const imgSrc = (r) => r?.image_public_url || r?.image_url || "";

// Split title -> [main, sub] pakai delimiter umum.
function splitTitle(name = "") {
  const s = String(name || "").trim();
  if (!s) return ["", ""];

  const delims = [":", "–", "-"];
  for (const d of delims) {
    const i = s.indexOf(d);
    if (i > 0) {
      const a = s.slice(0, i).trim();
      const b = s.slice(i + 1).trim();
      if (a && b) return [a, b];
    }
  }
  return [s, ""];
}

/**
 * Bilingual Blog Detail VM
 * Gunakan: const vm = useBlogDetailViewModel({ locale: "id" | "en", fallback: "id" })
 */
export default function useBlogDetailViewModel({
  locale = "id",
  fallback = "id",
} = {}) {
  const { id } = useParams();

  const key = id
    ? `/api/blog/${encodeURIComponent(
        id
      )}?locale=${locale}&fallback=${fallback}`
    : null;

  const { data, isLoading, error, mutate } = useSWR(key, fetcher);

  const vm = useMemo(() => {
    const row = data?.data || {};
    const [titleMain, titleSub] = splitTitle(row?.name || "");

    return {
      locale,
      fallback,
      loading: isLoading,
      error: error?.message || "",
      refresh: mutate,

      // content
      titleMain: (titleMain || "").toUpperCase(),
      titleSub: (titleSub || "").toUpperCase(),
      image: imgSrc(row),
      html: row?.description || "",

      // optional
      source: row?.source || "",

      // raw
      raw: row,
    };
  }, [data, isLoading, error, mutate, locale, fallback]);

  return vm;
}
