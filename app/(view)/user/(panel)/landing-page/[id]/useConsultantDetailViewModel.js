"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { fetcher } from "../../../../../utils/fetcher";

const DEFAULT_LOCALE = "id";
const fallbackFor = (loc) => (String(loc).toLowerCase() === "id" ? "en" : "id");

/* ================= ENV (client-side) ================= */
// Ambil base dari NEXT_PUBLIC_OSS_STORAGE_BASE_URL (kalau ada), fallback ke OSS_STORAGE_BASE_URL.
const OSS_BASE = (
  process.env.NEXT_PUBLIC_OSS_STORAGE_BASE_URL ||
  process.env.OSS_STORAGE_BASE_URL ||
  ""
).replace(/\/+$/, "");

// Samakan prefix public folder dengan server (CONSISTENT)
const PUBLIC_PREFIX = "cms-oss";

/** computePublicBase(): ganti subdomain storage. -> cdn. (konsisten dgn server) */
function computePublicBase() {
  if (!OSS_BASE) return "";
  try {
    const u = new URL(OSS_BASE);
    const host = u.host.replace(/^storage\./, "cdn.");
    return `${u.protocol}//${host}`;
  } catch {
    return OSS_BASE;
  }
}

/** ensurePublicUrl():
 * - Jika sudah http(s) -> return apa adanya
 * - Jika path/key -> bangun URL cdn + "/public/cms-oss/<path>"
 * - Fallback "/" kalau base tidak tersedia (tetap prefiks cms-oss untuk konsistensi)
 */
function ensurePublicUrl(src) {
  const v = String(src || "").trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;

  const base = computePublicBase();
  const clean = v.replace(/^\/+/, "");
  const withPrefix = clean.startsWith(`${PUBLIC_PREFIX}/`)
    ? clean
    : `${PUBLIC_PREFIX}/${clean}`;
  if (!base) return `/${withPrefix}`;
  return `${base}/public/${withPrefix}`;
}

/* ================= Dummy & helpers ================= */
const DUMMY = {
  name: "Tami",
  role: "Consultant Education",
  heroImage:
    "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=900&auto=format&fit=crop",
  circleColor: "#ffd21e",
  galleryLeft:
    "https://images.unsplash.com/photo-1515187029135-18ee286d815b?q=80&w=1200&auto=format&fit=crop",
  galleryRight:
    "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=900&auto=format&fit=crop",
  programs: [],
  whatsapp: "620909090909",
};

/** Key untuk SWR → tembak ke DETAIL: /api/consultants/:id */
function consultantDetailKey({ id, locale, fallback, isPublic }) {
  if (!id) return null;
  const p = new URLSearchParams();
  p.set("locale", locale);
  p.set("fallback", fallback);
  if (isPublic) p.set("public", "1");
  return `/api/consultants/${encodeURIComponent(id)}?${p.toString()}`;
}

// convert plain text with \n into <br/>, keep HTML if already HTML
function toHtml(str = "") {
  const s = String(str || "");
  return /<\/?[a-z][\s\S]*>/i.test(s) ? s : s.replace(/\n/g, "<br/>");
}

/** Pilih gambar profil — prioritas field baru (OSS) + back-compat */
function pickConsultantImage(row = {}) {
  const candidate =
    row.profile_image_url ||
    row.profile_image_public_url || // legacy
    row.program_consultant_image_public_url || // legacy
    row.program_consultant_image_url || // legacy
    "";
  return ensurePublicUrl(candidate);
}

function fmtDateLabel(v, locale) {
  if (!v) return "";
  try {
    const d = new Date(v);
    return d.toLocaleDateString(locale === "id" ? "id-ID" : "en-US", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function fmtPriceLabel(v, locale) {
  if (v === null || v === undefined || v === "") return "";
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return new Intl.NumberFormat(locale === "id" ? "id-ID" : "en-US", {
    style: "currency",
    currency: locale === "id" ? "IDR" : "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

/** Map API program_images → array untuk slider. (API baru sudah toPublicUrl server-side, tapi tetap robust) */
function mapImagesToPrograms(imgs = [], locale = DEFAULT_LOCALE) {
  return imgs.map((it, idx) => {
    const rawThumb =
      it.image_url || // field baru (sudah public)
      it.image_public_url || // legacy
      it.public_url || // legacy
      it.url || // legacy
      it.image || // legacy
      "";
    const thumb = ensurePublicUrl(rawThumb);

    const title =
      it.title || it.name || it.caption || it.label || `Program ${idx + 1}`;
    const dateSrc = it.date || it.date_at || it.created_at;
    const priceSrc = it.price_label || it.price;

    return {
      id: it.id ?? String(idx),
      tag: it.tag || "Best Activity",
      title,
      thumb,
      dateLabel: fmtDateLabel(dateSrc, locale),
      priceLabel:
        typeof priceSrc === "string"
          ? priceSrc
          : fmtPriceLabel(priceSrc, locale),
    };
  });
}

export default function useConsultantDetailViewModel({
  id,
  locale = DEFAULT_LOCALE,
}) {
  const key = useMemo(
    () =>
      consultantDetailKey({
        id, // bisa numeric id atau uuid
        locale,
        fallback: fallbackFor(locale),
        isPublic: true,
      }),
    [id, locale]
  );

  const { data, error, isLoading } = useSWR(key, fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  // API detail: { data: { id, name, description, profile_image_url, program_images: [...] , ... } }
  const api = data?.data || {};

  const name = (api.name || DUMMY.name || "").trim();
  const descriptionRaw = (api.description || "").trim();
  const role = api.role || "Consultant Education"; // role belum keluar dari API → fallback

  // dari API detail: program_images: [{ id, image_url, sort }]
  const programImages = Array.isArray(api.program_images)
    ? api.program_images
    : [];

  const mappedPrograms = mapImagesToPrograms(programImages, locale);

  const hero = {
    greet: "Hey there,",
    title: "It’s Consultant",
    name,
    role,
    image: pickConsultantImage(api) || DUMMY.heroImage,
    circleColor: DUMMY.circleColor,
  };

  // pakai 2 gambar pertama sebagai kiri/kanan ABOUT bila tidak ada field khusus
  const leftImgSrc =
    programImages?.[0]?.image_url ||
    programImages?.[0]?.image_public_url ||
    DUMMY.galleryLeft;

  const rightImgSrc =
    programImages?.[1]?.image_url ||
    programImages?.[1]?.image_public_url ||
    DUMMY.galleryRight;

  const about = {
    title: locale === "en" ? `About Kak ${name}!` : `Tentang Kak ${name}!`,
    html: toHtml(descriptionRaw),
    leftImg: ensurePublicUrl(leftImgSrc),
    rightImg: ensurePublicUrl(rightImgSrc),
  };

  // public detail menyembunyikan whatsapp di API → tetap siapkan untuk CTA bila dibutuhkan
  const whatsapp = api.whatsapp || DUMMY.whatsapp;
  const wa = {
    link: `https://wa.me/${String(whatsapp || "")
      .replace(/\D+/g, "")
      .replace(/^0/, "62")}`,
    label:
      locale === "en" ? "Click for more consultation" : "Klik More Konsultasi",
  };

  return {
    locale,
    isLoading,
    error: !!error,
    hero,
    about,
    programs: mappedPrograms,
    wa,
  };
}
