// app/(whatever)/events/useEventsUViewModel.js
"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/swr/fetcher";

const t = (locale, id, en) => (String(locale).toLowerCase() === "en" ? en : id);

function makeFallbackStart() {
  const d = new Date();
  d.setDate(d.getDate() + 55);
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
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

export default function useEventsUViewModel({ locale = "id" } = {}) {
  const { data } = useSWR("/api/events/hero", fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  const startAt = data?.startAt || makeFallbackStart();
  const cd = useCountdown(startAt);

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

    /* ===== EVENT CARDS ===== */
    const studentEvent = {
      title: t(locale, "EXPO EDUCATION OSS BALI", "EXPO EDUCATION OSS BALI"),
      desc: t(
        locale,
        "Ikuti pameran pendidikan, temui universitas favorit, dan dapatkan informasi beasiswa.",
        "Join the education fair, meet top universities, and get scholarship info."
      ),
      location: "BSCC",
      price: t(locale, "FREE for entry", "FREE for entry"),
      priceLabel: t(locale, "Price", "Price"),
      dateLong: t(
        locale,
        "Jumat, 17 Desember 2025",
        "Friday, 17 December 2025"
      ),
      ctaText: t(locale, "Ambil Tiket", "Get Ticket"),
      ctaHref: "#",
      poster:
        "https://images.unsplash.com/photo-1551836022-d5d88e9218df?q=80&w=1200&auto=format&fit=crop",
    };

    const repEvent = {
      title: t(locale, "EXPO EDUCATION OSS BALI", "EXPO EDUCATION OSS BALI"),
      desc: t(
        locale,
        "Buka booth Anda, perluas jaringan, dan temui calon mahasiswa berkualitas.",
        "Open your booth, expand network, and meet quality students."
      ),
      location: "BSCC",
      price: t(locale, "IDR 2.000.000", "IDR 2,000,000"),
      priceLabel: t(locale, "Booth Fee", "Booth Fee"),
      dateLong: t(
        locale,
        "Jumat, 17 Desember 2025",
        "Friday, 17 December 2025"
      ),
      ctaText: t(locale, "Booking Booth", "Book a Booth"),
      ctaHref: "#",
      poster:
        "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=1200&auto=format&fit=crop",
    };

    /* ===== BENEFITS ===== */
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

    /* ===== WHY (V2) — 3 cards sesuai Figma ===== */
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
      countdown: cd,
      labels,

      benefits,

      upcomingTitle: t(locale, "EVENT AKAN BERLANGSUNG", "UPCOMING EVENTS"),
      upcomingSub: t(
        locale,
        "Bergabunglah dalam acara kami dan rasakan pengalaman inspiratif menuju dunia global.",
        "Join our events and experience inspiring journeys to the global world."
      ),

      // Bars
      studentBarTitle: t(
        locale,
        "GABUNG EVENT KITA SEBAGAI STUDENT",
        "JOIN OUR EVENT AS A STUDENT"
      ),
      repBarTitle: t(
        locale,
        "GABUNG EVENT KITA SEBAGAI REPRESENTATIF",
        "JOIN OUR EVENT AS A REPRESENTATIVE"
      ),

      // Cards
      studentEvent,
      repEvent,

      // WHY (v2)
      why2Title,
      why2Cards,
    };
  }, [locale, cd]);
}
