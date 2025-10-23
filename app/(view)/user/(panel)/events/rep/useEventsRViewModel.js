"use client";

import useSWR from "swr";
import { useMemo } from "react";

/* =========================
   Fetcher (no-store)
========================= */
const fetcher = (url) =>
  fetch(url, { cache: "no-store" }).then(async (r) => {
    const j = await r.json();
    if (!r.ok) throw new Error(j?.error?.message || "Failed to load");
    return j;
  });

/* =========================
   Helpers
========================= */
const safeText = (v) => {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  try {
    return String(v);
  } catch {
    return "";
  }
};

const stripHtml = (html = "") =>
  String(html)
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const fmtDateLong = (ts, locale) => {
  if (!ts) return "-";
  try {
    const d = new Date(Number(ts));
    return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "id-ID", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(d);
  } catch {
    return "-";
  }
};

const pad2 = (n) => String(Math.max(0, Number(n || 0))).padStart(2, "0");
const fmtTimeRange = (startTs, endTs, locale) => {
  if (!startTs || !endTs) return "-";
  const s = new Date(Number(startTs));
  const e = new Date(Number(endTs));
  const h1 = pad2(s.getHours()),
    m1 = pad2(s.getMinutes());
  const h2 = pad2(e.getHours()),
    m2 = pad2(e.getMinutes());
  const offMin = -s.getTimezoneOffset();
  const hours = Math.round(offMin / 60);
  const gmt = `GMT${hours >= 0 ? "+" : ""}${hours}`;
  const map = { "GMT+7": "WIB", "GMT+8": "WITA", "GMT+9": "WIT" };
  const tz = map[gmt] || (locale === "en" ? gmt : gmt);
  return `${h1}.${m1} – ${h2}.${m2} ${tz}`;
};

const fmtIDR = (n) => {
  if (n === null || n === undefined || n === "") return null;
  try {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(Number(n));
  } catch {
    return String(n);
  }
};

const FALLBACK_POSTER =
  "https://images.unsplash.com/photo-1551836022-d5d88e9218df?q=80&w=1200&auto=format&fit=crop";

/* =========================
   Hook
========================= */
export default function useEventsRViewModel({ locale = "id", eventId } = {}) {
  const fb = locale === "id" ? "en" : "id";
  const url = eventId
    ? `/api/events/${encodeURIComponent(
        eventId
      )}?locale=${locale}&fallback=${fb}`
    : null;

  const { data, error } = useSWR(url, fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  const row = data?.data || null;

  return useMemo(() => {
    const isEN = locale === "en";

    // ===== Item utama untuk Representative (Booth) =====
    const boothEnabled =
      row &&
      row.booth_quota !== null &&
      row.booth_quota !== undefined &&
      Number(row.booth_quota) > 0;

    const boothPrice = row?.booth_price ?? null;
    const priceText = boothEnabled
      ? fmtIDR(boothPrice) || (isEN ? "Contact us" : "Hubungi kami")
      : isEN
      ? "Contact us"
      : "Hubungi kami";

    const item = row
      ? {
          id: row.id,
          title: safeText(row.title || "(no title)"),
          description:
            stripHtml(row.description || "").slice(0, 320) ||
            (isEN
              ? "Open your booth, expand your network, and meet quality students."
              : "Buka booth Anda, perluas jaringan, dan temui calon mahasiswa berkualitas."),
          date: fmtDateLong(row.start_ts ?? row.start_at, locale),
          time: fmtTimeRange(
            row.start_ts ?? row.start_at,
            row.end_ts ?? row.end_at,
            locale
          ),
          location: safeText(row.location || "-"),
          poster: row.banner_url || FALLBACK_POSTER,
          priceLabel: isEN ? "Booth Fee" : "Biaya Booth",
          priceText, // <= booth_price dalam IDR (atau 'Hubungi kami')
          quota: Number(row.booth_quota ?? 0) || 0,
          ctaHref: `/user/events/${row.id}#booth`,
          ctaText: isEN ? "Book a Booth" : "Booking Booth",
        }
      : null;

    // ===== Ikon (public assets) =====
    const icon = {
      network: "/accglb.svg",
      lead: "/intrep.svg",
      branding: "/ecert.svg",
      lounge: "/freesd.svg",
      talk: "/freeielts.svg",
      support: "/stuvis.svg",
    };

    const idBenefits = [
      {
        icon: icon.network,
        iconType: "svg",
        title: "Jaringan & Eksposur",
        desc: "Temui langsung calon mahasiswa & partner institusi.",
      },
      {
        icon: icon.lead,
        iconType: "svg",
        title: "Lead Berkualitas",
        desc: "Kumpulkan data prospek yang siap di-follow up.",
      },
      {
        icon: icon.branding,
        iconType: "svg",
        title: "Branding Booth",
        desc: "Posisi strategis dan materi promosi on-site.",
      },
      {
        icon: icon.lounge,
        iconType: "svg",
        title: "Fasilitas Booth Nyaman",
        desc: "Meja, kursi, listrik, snack & drink tersedia.",
      },
      {
        icon: icon.talk,
        iconType: "svg",
        title: "Slot Sesi/Talk",
        desc: "Opsional sesi presentasi untuk highlight program.",
      },
      {
        icon: icon.support,
        iconType: "svg",
        title: "Dukungan Tim",
        desc: "On-ground support membantu operasional booth.",
      },
    ];

    const enBenefits = [
      {
        icon: icon.network,
        iconType: "svg",
        title: "Network & Exposure",
        desc: "Meet prospective students and institutional partners.",
      },
      {
        icon: icon.lead,
        iconType: "svg",
        title: "Qualified Leads",
        desc: "Collect prospects ready for follow-ups.",
      },
      {
        icon: icon.branding,
        iconType: "svg",
        title: "Booth Branding",
        desc: "Strategic placement & on-site promo materials.",
      },
      {
        icon: icon.lounge,
        iconType: "svg",
        title: "Comfort Facilities",
        desc: "Table, chairs, power, snacks & drinks provided.",
      },
      {
        icon: icon.talk,
        iconType: "svg",
        title: "Talk Slot",
        desc: "Optional session to highlight your programs.",
      },
      {
        icon: icon.support,
        iconType: "svg",
        title: "On-ground Support",
        desc: "Local team assists your booth operations.",
      },
    ];

    return {
      ready: !!row && !error,
      errorMessage: error?.message || "",
      item,
      benefits: isEN ? enBenefits : idBenefits,
      benefitTitle: isEN
        ? "REPRESENTATIVE BENEFITS"
        : "BENEFIT UNTUK REPRESENTATIVE",
      emptyTitle: isEN ? "Event not found" : "Event tidak ditemukan",
      emptySub: isEN
        ? "Please check the link or choose another event."
        : "Periksa tautan atau pilih event lainnya.",
    };
  }, [row, error, locale]);
}
