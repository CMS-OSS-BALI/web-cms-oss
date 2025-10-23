"use client";

import useSWR from "swr";
import { useMemo } from "react";

const fetcher = (url) =>
  fetch(url, { cache: "no-store" }).then(async (r) => {
    const j = await r.json();
    if (!r.ok) throw new Error(j?.error?.message || "Failed to load");
    return j;
  });

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

const FALLBACK_POSTER =
  "https://images.unsplash.com/photo-1551836022-d5d88e9218df?q=80&w=1200&auto=format&fit=crop";

export default function useEventsPViewModel({ locale = "id", eventId } = {}) {
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
    const item = row
      ? {
          id: row.id,
          title: safeText(row.title || "(no title)"),
          description: stripHtml(row.description || "").slice(0, 320),
          date: fmtDateLong(row.start_ts ?? row.start_at, locale),
          time: fmtTimeRange(
            row.start_ts ?? row.start_at,
            row.end_ts ?? row.end_at,
            locale
          ),
          location: safeText(row.location || "-"),
          poster: row.banner_url || FALLBACK_POSTER,
          ctaHref: `/user/events/${row.id}?action=ticket`,
          ctaText: locale === "en" ? "Get Ticket" : "Ambil tiket",
        }
      : null;

    // Semua ikon berasal dari /public
    const icon = {
      intrep: "/intrep.svg",
      stuvis: "/stuvis.svg",
      freesd: "/freesd.svg",
      accglb: "/accglb.svg",
      freeielts: "/freeielts.svg",
      ecert: "/ecert.svg",
    };

    const idBenefits = [
      {
        icon: icon.intrep,
        iconType: "svg",
        title: "Representatif Luar Negeri",
        desc: "Bertemu langsung perwakilan universitas & institusi luar negeri.",
      },
      {
        icon: icon.stuvis,
        iconType: "svg",
        title: "Panduan Perencanaan Studi dan Visa",
        desc: "Konsultasi gratis mempersiapkan dokumen studi dan visa pelajar.",
      },
      {
        icon: icon.freesd,
        iconType: "svg",
        title: "Snack & drink Gratis Selama Event",
        desc: "Nikmati suasana expo sambil menikmati free coffee dan snack.",
      },
      {
        icon: icon.accglb,
        iconType: "svg",
        title: "Akses Informasi Global Education",
        desc: "Temukan informasi edukasi internasional yang valid.",
      },
      {
        icon: icon.freeielts,
        iconType: "svg",
        title: "Simulasi & Tryout IELTS Gratis",
        desc: "Uji kemampuan bahasa Inggris dan dapatkan diskon kelasnya.",
      },
      {
        icon: icon.ecert,
        iconType: "svg",
        title: "E-Certificate & Merchandise Eksklusif",
        desc: "Sertifikat dan souvenir menarik di event OSS Bali.",
      },
    ];

    const enBenefits = [
      {
        icon: icon.intrep,
        iconType: "svg",
        title: "International Representatives",
        desc: "Meet university & institution reps from abroad.",
      },
      {
        icon: icon.stuvis,
        iconType: "svg",
        title: "Study & Visa Planning Guidance",
        desc: "Free consultation for documents and student visa.",
      },
      {
        icon: icon.freesd,
        iconType: "svg",
        title: "Free Snacks & Drinks",
        desc: "Enjoy the expo vibe with complimentary coffee and snacks.",
      },
      {
        icon: icon.accglb,
        iconType: "svg",
        title: "Access to Global Education Info",
        desc: "Find reliable information on international education.",
      },
      {
        icon: icon.freeielts,
        iconType: "svg",
        title: "Free IELTS Simulation & Tryout",
        desc: "Test your English skills and get course discounts.",
      },
      {
        icon: icon.ecert,
        iconType: "svg",
        title: "E-Certificate & Exclusive Merchandise",
        desc: "Take home certificates and special souvenirs.",
      },
    ];

    return {
      ready: !!row && !error,
      errorMessage: error?.message || "",
      item,
      benefits: locale === "en" ? enBenefits : idBenefits,
      benefitTitle:
        locale === "en" ? "EXCLUSIVE BENEFITS" : "BENEFIT EKSKLUSIF",
      emptyTitle: locale === "en" ? "Event not found" : "Event tidak ditemukan",
      emptySub:
        locale === "en"
          ? "Please check the link or choose another event."
          : "Periksa tautan atau pilih event lainnya.",
    };
  }, [row, error, locale]);
}
