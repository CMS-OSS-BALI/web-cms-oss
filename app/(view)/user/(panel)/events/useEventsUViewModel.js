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
    const t = new Date(e?.start_at ?? "").getTime();
    if (!Number.isFinite(t) || t <= now) continue;
    if (nearest === null || t < nearest) nearest = t;
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
  // Ambil event publish & upcoming (urut terdekat dari API tetap ok, tapi countdown tidak bergantung urutan)
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

  // Countdown → ke event paling dekat yang belum mulai (fallback 30 hari bila kosong)
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

    // Mapper: API -> props EventCard untuk STUDENT (tanggal diambil dari start_at)
    const mapStudent = (e) => {
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
        dateLong: fmtDateLong(e.start_at, locale), // <-- dari start_at
        ctaText: isFree
          ? t(locale, "Ambil tiketmu", "Get Ticket")
          : t(locale, "Beli tiket", "Buy Ticket"),
        ctaHref: `/user/events/${e.id}`,
        poster: e.banner_url || FALLBACK_POSTER,
      };
    };

    // Mapper: API -> props EventCard untuk REPRESENTATIVE (Booth) — tanggal dari start_at
    const mapRep = (e) => {
      const boothEnabled =
        e.booth_quota !== null &&
        e.booth_quota !== undefined &&
        Number(e.booth_quota) > 0;

      return {
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
        price: boothEnabled
          ? fmtIDR(e.booth_price || 0)
          : t(locale, "Hubungi kami", "Contact us"),
        priceLabel: t(locale, "Biaya Booth", "Booth Fee"),
        dateLabel: t(locale, "Tanggal", "Date"),
        dateLong: fmtDateLong(e.start_at, locale), // <-- dari start_at
        ctaText: t(locale, "Booking Booth", "Book a Booth"),
        ctaHref: `/user/events/${e.id}#booth`,
        poster: e.banner_url || FALLBACK_POSTER,
      };
    };

    const studentEvents = rows.map(mapStudent);

    const repEvents = rows
      .filter((e) => {
        const q = e.booth_quota;
        return q !== null && q !== undefined && Number(q) > 0;
      })
      .map(mapRep);

    const benefits = [
      {
        icon: "🌍",
        title: t(
          locale,
          "Menjadi Bagian Dunia Global",
          "Be Part of the Global World"
        ),
        desc: t(
          locale,
          "Ikuti kegiatan interaktif yang mempertemukan Anda dengan peluang baru.",
          "Join interactive sessions that connect you with new opportunities."
        ),
      },
      {
        icon: "🎓",
        title: t(
          locale,
          "Insight dari Ahli & Alumni",
          "Insights from Experts & Alumni"
        ),
        desc: t(
          locale,
          "Temukan arahan tepat dari pakar dan alumni berpengalaman.",
          "Get guidance from experienced experts and alumni."
        ),
      },
      {
        icon: "🧭",
        title: t(
          locale,
          "Pengalaman Studi Internasional",
          "International Study Experience"
        ),
        desc: t(
          locale,
          "Jelajahi universitas terbaik dan destinasi studi unggulan.",
          "Explore top universities and study destinations."
        ),
      },
    ];

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
          "Meet university representatives directly and learn about programs and scholarships."
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
          "Dapatkan wawasan mendalam mengenai program studi dan proses penerimaan.",
          "Get deep insights into programs and admissions."
        ),
        img: "/tengah.svg",
      },
      {
        title: t(locale, "Koneksi Internasional", "International Connections"),
        desc: t(
          locale,
          "Bangun hubungan dengan pendidik, mahasiswa, dan pemimpin industri dari seluruh dunia.",
          "Build relationships with educators, students, and industry leaders worldwide."
        ),
        img: "/kanan.svg",
      },
    ];

    return {
      // hero copy
      titleLine1: t(
        locale,
        "JELAJAHI PENDIDIKAN GLOBAL",
        "EXPLORE GLOBAL EDUCATION"
      ),
      titleLine2: t(
        locale,
        "BENTUK MASA DEPANMU TANPA BATAS",
        "SHAPE YOUR FUTURE WITHOUT LIMITS"
      ),
      panelTitle: t(locale, "MULAI EVENT", "EVENT STARTS IN"),
      countdown: cd, // <-- countdown ke event terdekat
      labels,

      benefits,

      upcomingTitle: t(locale, "EVENT AKAN BERLANGSUNG", "UPCOMING EVENTS"),
      upcomingSub: t(
        locale,
        "Bergabunglah dalam acara kami dan rasakan pengalaman inspiratif menuju dunia global.",
        "Join our events and experience inspiring journeys to the global world."
      ),

      studentEvents,
      repEvents,

      why2Title,
      why2Cards,

      // optional flags
      ready: !error && !!data,
      errorMessage: error?.message || (data?.error?.message ?? ""),
    };
  }, [locale, cd, rows, data, error]);
}
