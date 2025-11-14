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
  const h1 = pad2(s.getHours());
  const m1 = pad2(s.getMinutes());
  const h2 = pad2(e.getHours());
  const m2 = pad2(e.getMinutes());
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
          priceText,
          quota: Number(row.booth_quota ?? 0) || 0,
          ctaHref: `/user/events/${row.id}#booth`,
          ctaText: isEN ? "Book a Booth" : "Booking Booth",
        }
      : null;

    // ===== Ikon (public assets) =====
    const icon = {
      student: "/intrep.svg",
      brand: "/ecert.svg",
      network: "/accglb.svg",
      data: "/stuvis.svg",
      facility: "/freesd.svg",
      collab: "/freeielts.svg",
    };

    /* =======================
       BENEFITS COPY (match design)
       ID: persis seperti di slide
    ======================= */
    const idBenefits = [
      {
        icon: icon.student,
        iconType: "svg",
        title: "Peluang mendapatkan siswa potensial",
        desc: "Menjangkau segmen siswa internasional yang aktif mencari peluang studi luar negeri.",
      },
      {
        icon: icon.brand,
        iconType: "svg",
        title: "Brand Exposure & Positioning",
        desc: "Peningkatan brand awareness kampus di kalangan pelajar, sekolah, dan orang tua.",
      },
      {
        icon: icon.network,
        iconType: "svg",
        title: "Kegiatan Engagement & Networking",
        desc: "Sesi presentasi institusi, workshop, dan counseling langsung dengan peserta.",
      },
      {
        icon: icon.data,
        iconType: "svg",
        title: "Data & Insight Strategis",
        desc: "Mendapatkan feedback dan tren minat siswa Indonesia terhadap program, negara, dan jurusan tertentu.",
      },
      {
        icon: icon.facility,
        iconType: "svg",
        title: "Fasilitas Eksklusif Selama Event",
        desc: "Booth eksklusif premium dan dukungan tim OSS Bali untuk logistik, interpreter, dan koordinasi lapangan.",
      },
      {
        icon: icon.collab,
        iconType: "svg",
        title: "Peluang Kolaborasi Strategis",
        desc: "OSS Bali akan menyediakan support promosi dan operasional lokal seperti ikutserta dalam sosialisasi ke sekolah dan iklan sosial media eksklusif.",
      },
    ];

    /* =======================
       EN version (natural translation)
    ======================= */
    const enBenefits = [
      {
        icon: icon.student,
        iconType: "svg",
        title: "Opportunity to Reach Potential Students",
        desc: "Reach international-minded students who are actively seeking study abroad opportunities.",
      },
      {
        icon: icon.brand,
        iconType: "svg",
        title: "Brand Exposure & Positioning",
        desc: "Increase your campus brand awareness among students, schools, and parents.",
      },
      {
        icon: icon.network,
        iconType: "svg",
        title: "Engagement & Networking Activities",
        desc: "Host institution presentations, workshops, and direct counseling sessions with participants.",
      },
      {
        icon: icon.data,
        iconType: "svg",
        title: "Strategic Data & Insights",
        desc: "Gain feedback and trend data on Indonesian students’ interests by program, country, and major.",
      },
      {
        icon: icon.facility,
        iconType: "svg",
        title: "Exclusive On-Site Facilities",
        desc: "Premium booth space and OSS Bali team support for logistics, interpreters, and on-ground coordination.",
      },
      {
        icon: icon.collab,
        iconType: "svg",
        title: "Strategic Collaboration Opportunities",
        desc: "OSS Bali provides promotional and local operational support such as school roadshows and exclusive social-media campaigns.",
      },
    ];

    return {
      ready: !!row && !error,
      errorMessage: error?.message || "",
      item,
      benefits: isEN ? enBenefits : idBenefits,
      benefitTitle: isEN ? "EXCLUSIVE BENEFITS" : "Benefit Ekslusif",
      benefitSubtitle: isEN
        ? "Get direct exposure to thousands of visitors, prospective student databases, media coverage, and exclusive booth facilities!"
        : "Dapat Exposure Langsung Ke Ribuan Pengunjung, Database Calon Mahasiswa, Media Coverage, Dan Fasilitas Booth Eksklusif!",
      emptyTitle: isEN ? "Event not found" : "Event tidak ditemukan",
      emptySub: isEN
        ? "Please check the link or choose another event."
        : "Periksa tautan atau pilih event lainnya.",
    };
  }, [row, error, locale]);
}
