"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/swr/fetcher";

/* =========================
   Helpers
========================= */
const t = (locale, id, en) => (String(locale).toLowerCase() === "en" ? en : id);

const stripHtml = (html = "") =>
  String(html)
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const fmtIDR = (n) => {
  if (n === null || n === undefined) return null;
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

const fmtDateLong = (iso, locale) => {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "id-ID", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(d);
  } catch {
    return iso;
  }
};

function makeFallbackStart() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
}

/** ambil start ISO terdekat yang masih di masa depan */
function pickNearestFutureStart(rows = []) {
  const now = Date.now();
  let nearest = null;
  for (const e of rows) {
    const tms = new Date(e?.start_at ?? "").getTime();
    if (!Number.isFinite(tms) || tms <= now) continue;
    if (nearest === null || tms < nearest) nearest = tms;
  }
  return nearest ? new Date(nearest).toISOString() : makeFallbackStart();
}

function useCountdown(startAtISO) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const target = new Date(startAtISO).getTime();
  const diff = Math.max(0, target - now);

  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((diff % (60 * 1000)) / 1000);

  return { days, hours, minutes, seconds, finished: diff <= 0 };
}

/* =========================
   Hook
========================= */
export default function useEventsUViewModel({ locale = "id" } = {}) {
  const sp = new URLSearchParams();
  sp.set("is_published", "1");
  sp.set("status", "upcoming");
  sp.set("sort", "start_at:asc");
  sp.set("perPage", "100");
  sp.set("locale", locale);
  sp.set("fallback", locale === "id" ? "en" : "id");

  const { data, error } = useSWR(`/api/events?${sp.toString()}`, fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  const rows = Array.isArray(data?.data) ? data.data : [];

  // Countdown → ke event paling dekat
  const nearestStartISO = pickNearestFutureStart(rows);
  const cd = useCountdown(nearestStartISO);

  return useMemo(() => {
    const labels =
      locale === "en"
        ? {
            days: "Days",
            hours: "Hours",
            minutes: "Minutes",
            seconds: "Seconds",
          }
        : { days: "Hari", hours: "Jam", minutes: "Menit", seconds: "Detik" };

    const studentBarTitle = t(
      locale,
      "GABUNG EVENT KITA SEBAGAI STUDENT",
      "JOIN OUR EVENT AS A STUDENT"
    );
    const repBarTitle = t(
      locale,
      "GABUNG EVENT KITA SEBAGAI REPRESENTATIF",
      "JOIN OUR EVENT AS A REPRESENTATIVE"
    );

    const FALLBACK_POSTER =
      "https://images.unsplash.com/photo-1551836022-d5d88e9218df?q=80&w=1200&auto=format&fit=crop";

    // STUDENT map
    const studentEvents = rows.map((e) => {
      const isFree = String(e.pricing_type).toUpperCase() === "FREE";
      const priceText = isFree
        ? t(locale, "FREE untuk masuk", "FREE for entry")
        : fmtIDR(e.ticket_price);
      return {
        id: e.id,
        barTitle: studentBarTitle,
        title: e.title || "(no title)",
        desc: stripHtml(e.description || "").slice(0, 260),
        location: e.location || "-",
        price: priceText,
        priceLabel: t(locale, "Harga", "Price"),
        dateLabel: t(locale, "Tanggal", "Date"),
        dateLong: fmtDateLong(e.start_at, locale),
        ctaText: isFree
          ? t(locale, "Ambil tiketmu", "Get Ticket")
          : t(locale, "Beli tiket", "Buy Ticket"),
        ctaHref: `/user/events/${e.id}`,
        poster: e.banner_url || FALLBACK_POSTER,
      };
    });

    // REP map (hanya event yang punya booth)
    const repEvents = rows
      .filter((e) => e.booth_quota != null && Number(e.booth_quota) > 0)
      .map((e) => ({
        id: `${e.id}-rep`,
        barTitle: repBarTitle,
        title: e.title || "(no title)",
        desc:
          stripHtml(e.description || "").slice(0, 260) ||
          t(
            locale,
            "Buka booth Anda, perluas jaringan, dan temui calon mahasiswa berkualitas.",
            "Open your booth, expand your network, and meet quality students."
          ),
        location: e.location || "-",
        price:
          e.booth_quota != null && Number(e.booth_quota) > 0
            ? fmtIDR(e.booth_price || 0)
            : t(locale, "Hubungi kami", "Contact us"),
        priceLabel: t(locale, "Biaya Booth", "Booth Fee"),
        dateLabel: t(locale, "Tanggal", "Date"),
        dateLong: fmtDateLong(e.start_at, locale),
        ctaText: t(locale, "Booking Booth", "Book a Booth"),
        ctaHref: `/user/events/${e.id}#booth`,
        poster: e.banner_url || FALLBACK_POSTER,
      }));

    /* ===== WHY (copywriting disesuaikan) ===== */
    const why2Title = t(
      locale,
      "MENGAPA ANDA TIDAK BOLEH MELEWATKANNYA?",
      "WHY YOU SHOULDN'T MISS IT?"
    );

    const why2Cards = [
      {
        title: t(locale, "Peluang Global", "Global Opportunities"),
        desc: t(
          locale,
          "Temui perwakilan universitas secara langsung dan pelajari program studi serta peluang beasiswa terbaik.",
          "Talk directly with university reps and discover programs and scholarships that fit your study plan."
        ),
        img: "/kiri.svg",
      },
      {
        title: t(
          locale,
          "Informasi dan Akses Langsung",
          "Direct Info & Access"
        ),
        desc: t(
          locale,
          "Temui perwakilan universitas dan dapatkan wawasan mendalam mengenai program studi dan proses penerimaan.",
          "Meet university representatives and gain in-depth insights into study programs and the admission process."
        ),
        img: "/tengah.svg",
      },
      {
        title: t(locale, "Koneksi Internasional", "International Connections"),
        desc: t(
          locale,
          "Bangun hubungan dengan pendidik, mahasiswa, dan pemimpin industri dari seluruh dunia.",
          "Build relationships with educators, students, and industry leaders from around the world."
        ),
        img: "/kanan.svg",
      },
    ];

    return {
      // HERO
      titleLine1: t(
        locale,
        "TEMUKAN EVENT TERDEKATMU",
        "FIND YOUR NEAREST EVENT"
      ),
      titleLine2: "",
      heroSub: t(
        locale,
        "Bergabunglah dalam acara kami dan rasakan pengalaman inspiratif menuju dunia global.",
        "Join our events and experience inspiring journeys toward the global world."
      ),
      panelTitle: t(locale, "Event Terdekat", "Nearest Event"),

      countdown: cd,
      labels,

      // DATA LIST
      studentEvents,
      repEvents,

      // REP CTA
      repCtaTitle: t(
        locale,
        "Apakah Kamu Dari Perwakilan Kampus Luar Negeri?",
        "Are You a Representative from an Overseas University?"
      ),
      repCtaImages: [
        { src: "/rep/1.jpg", alt: "Representative 1" },
        { src: "/rep/2.jpg", alt: "Representative 2" },
        { src: "/rep/3.jpg", alt: "Representative 3" },
        { src: "/rep/4.jpg", alt: "Representative 4" },
      ],
      repEventOptions: repEvents.map((e) => {
        const baseId = String(e.id).replace(/-rep$/, "");
        const label = `${e.title || "(no title)"} — ${
          e.dateLong || t(locale, "TBA", "TBA")
        }`;
        return { value: baseId, label };
      }),

      // WHY
      why2Title,
      why2Cards,

      // flags
      ready: !error && !!data,
      errorMessage: error?.message || (data?.error?.message ?? ""),
    };
  }, [locale, cd, rows, data, error]);
}
