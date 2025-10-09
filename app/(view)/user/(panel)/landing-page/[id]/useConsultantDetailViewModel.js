"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { fetcher } from "../../../../../utils/fetcher";

const DEFAULT_LOCALE = "id";
const fallbackFor = (loc) => (String(loc).toLowerCase() === "id" ? "en" : "id");

/* ================= ENV (client-side) ================= */
const SUPA_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(
  /\/+$/,
  ""
);
const SUPA_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_BUCKET ||
  process.env.SUPABASE_BUCKET || // fallback kalau kebetulan diekspos
  "";

/** Bentuk public URL dari path Supabase (kalau belum https). */
function ensurePublicUrl(src) {
  const v = String(src || "").trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;

  // kalau ada SUPA_URL, kita paksa jadi public URL
  if (SUPA_URL) {
    const clean = v.replace(/^\/+/, "");
    const withBucket =
      SUPA_BUCKET && !clean.startsWith(`${SUPA_BUCKET}/`)
        ? `${SUPA_BUCKET}/${clean}`
        : clean;
    return `${SUPA_URL}/storage/v1/object/public/${withBucket}`;
  }

  // fallback terakhir (lebih baik daripada 404 ke /consultants/...)
  return v.startsWith("/") ? v : `/${v}`;
}

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

function pickConsultantImage(row = {}) {
  // prioritas: public url, lalu path → dipaksa jadi public
  const candidate =
    row.profile_image_public_url ||
    row.profile_image_url ||
    row.program_consultant_image_public_url ||
    row.program_consultant_image_url ||
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

function mapImagesToPrograms(imgs = [], locale = DEFAULT_LOCALE) {
  return imgs.map((it, idx) => {
    const rawThumb =
      it.image_public_url || it.public_url || it.url || it.image_url || "";
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
        id,
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

  const api = data?.data || data || {};

  // API detail already FLATTENS { name, description } by locale/fallback
  const name = (api.name || DUMMY.name || "").trim();
  const descriptionRaw = (api.description || "").trim();
  const role = api.role || "Consultant Education";

  // ---- gambar program
  const programImages =
    api.program_images || api.consultant_program_images || [];

  const mappedPrograms = mapImagesToPrograms(programImages, locale);

  const hero = {
    greet: "Hey there,",
    title: "It’s Consultant",
    name,
    role,
    image: pickConsultantImage(api) || DUMMY.heroImage,
    circleColor: DUMMY.circleColor,
  };

  // pakai 2 gambar pertama buat kartu About jika tidak ada field khusus
  const leftImgSrc =
    api.gallery?.left ||
    programImages?.[0]?.image_public_url ||
    programImages?.[0]?.image_url ||
    DUMMY.galleryLeft;

  const rightImgSrc =
    api.gallery?.right ||
    programImages?.[1]?.image_public_url ||
    programImages?.[1]?.image_url ||
    DUMMY.galleryRight;

  const about = {
    title: locale === "en" ? `About Kak ${name}!` : `Tentang Kak ${name}!`,
    html: toHtml(descriptionRaw),
    leftImg: ensurePublicUrl(leftImgSrc),
    rightImg: ensurePublicUrl(rightImgSrc),
  };

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
    programs: mappedPrograms, // slider source
    wa,
  };
}
