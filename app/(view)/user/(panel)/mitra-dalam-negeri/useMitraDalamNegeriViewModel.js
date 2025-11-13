"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toPublicStorageUrl } from "@/app/utils/publicCdnClient";

/* ========== Fonts / static ========== */
const FONT_FAMILY = '"Public Sans", sans-serif';

/* ========== Helpers: CDN public URL resolver ========== */
function toPublicUrl(keyOrUrl) {
  return toPublicStorageUrl(keyOrUrl);
}

/* ========== Small fetch util ========== */
async function getJson(url, init) {
  const res = await fetch(url, { cache: "no-store", ...init });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.error?.message || `Request failed: ${res.status}`;
    const e = new Error(msg);
    e.status = res.status;
    e.data = json;
    throw e;
  }
  return json;
}

/* ========== Heuristic category classifier (fallback) ========== */
function isInternationalCat(cat) {
  const s = String(cat || "").toLowerCase();
  return /(luar|international|internasional|global|mancanegara|overseas|asing)/.test(
    s
  );
}
function isDomesticCat(cat) {
  const s = String(cat || "").toLowerCase();
  return /(dalam|domestic|nasional|lokal|indonesia|\bid\b)/.test(s);
}
function splitMitraRows(rows = [], mapRowFn = () => null) {
  const intl = [];
  const domestic = [];
  const seen = new Set();

  rows.forEach((row) => {
    if (!row || !row.id || seen.has(row.id)) return;
    seen.add(row.id);

    const entry = mapRowFn(row);
    if (!entry) return;

    const cat =
      row?.category?.slug || row?.category?.name || row?.category?.type || "";
    if (isInternationalCat(cat)) intl.push(entry);
    else if (isDomesticCat(cat)) domestic.push(entry);
    else domestic.push(entry);
  });

  return { international: intl, domestic };
}

/* ========== ViewModel ========== */
export default function useMitraDalamNegeriViewModel({ locale = "id" } = {}) {
  const [loading, setLoading] = useState(true);
  const [merchants, setMerchants] = useState([]); // LUAR NEGERI
  const [organizations, setOrganizations] = useState([]); // DALAM NEGERI

  const abortRef = useRef(null);
  const t = (id, en) => (locale === "en" ? en : id);

  const hero = { bg: "/mitra-bg.svg" };
  const sections = {
    merchant: { title: t("MITRA LUAR NEGERI", "INTERNATIONAL PARTNERS") },
    organization: { title: t("MITRA DALAM NEGERI", "DOMESTIC PARTNERS") },
  };

  // Map API row -> UI row
  const mapRow = (r) => {
    const name = r.merchant_name || r.name || "Partner";
    const logo =
      r.image_public_url ||
      r.logo_public_url ||
      toPublicUrl(r.image_url || r.logo_url || r.logo || "");
    return { id: r.id, name, logo };
  };

  useEffect(() => {
    abortRef.current?.abort?.();
    const ac = new AbortController();
    abortRef.current = ac;

    const run = async () => {
      setLoading(true);

      const qs = (params) => {
        const u = new URLSearchParams();
        u.set("page", "1");
        u.set("perPage", "100");
        u.set("sort", "merchant_name:asc");
        u.set("status", "APPROVED");
        u.set("locale", locale);
        u.set("fallback", locale === "id" ? "en" : "id");
        Object.entries(params || {}).forEach(([k, v]) => {
          if (v !== undefined && v !== null && String(v).trim() !== "") {
            u.set(k, String(v));
          }
        });
        return u.toString();
      };

      try {
        // 1) Coba endpoint khusus
        const [luar, dalam] = await Promise.all([
          getJson(`/api/mitra-luar-negeri?${qs()}`, {
            signal: ac.signal,
          }).catch(() => null),
          getJson(`/api/mitra-dalam-negeri?${qs()}`, {
            signal: ac.signal,
          }).catch(() => null),
        ]);

        const luarRows = Array.isArray(luar?.data) ? luar.data : null;
        const dalamRows = Array.isArray(dalam?.data) ? dalam.data : null;

        if (luarRows && dalamRows) {
          setMerchants(luarRows.map(mapRow));
          setOrganizations(dalamRows.map(mapRow));
          setLoading(false);
          return;
        }

        if (luarRows || dalamRows) {
          const buckets = splitMitraRows(
            [...(luarRows || []), ...(dalamRows || [])],
            mapRow
          );
          setMerchants(buckets.international);
          setOrganizations(buckets.domestic);
          setLoading(false);
          return;
        }

        // 2) Fallback: hanya punya /mitra-dalam-negeri → pilah berdasarkan kategori
        const all = await getJson(`/api/mitra-dalam-negeri?${qs()}`, {
          signal: ac.signal,
        });
        const rows = Array.isArray(all?.data) ? all.data : [];

        const buckets = splitMitraRows(rows, mapRow);
        setMerchants(buckets.international);
        setOrganizations(buckets.domestic);
      } catch {
        setMerchants([]);
        setOrganizations([]);
      } finally {
        setLoading(false);
      }
    };

    run();
    return () => ac.abort();
  }, [locale]);

  return {
    font: FONT_FAMILY,
    hero,
    sections,
    loading,
    merchants, // LUAR NEGERI (approved only)
    organizations, // DALAM NEGERI (approved only)
  };
}
