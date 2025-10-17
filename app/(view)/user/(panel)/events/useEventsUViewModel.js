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

  const hero = useMemo(() => {
    return {
      background: "/gelombang.svg",
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
      benefits: [
        {
          icon: "🌍",
          title: t(
            locale,
            "Menjadi Bagian Dunia Global",
            "Be Part of the Global World"
          ),
          desc: t(
            locale,
            "Ikuti kegiatan interaktif yang mempertemukan Anda dengan peluang dan inspirasi baru.",
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
            "Jelajahi universitas terbaik dan destinasi studi unggulan di seluruh dunia.",
            "Explore top universities and study destinations worldwide."
          ),
        },
      ],
    };
  }, [locale, cd]);

  return { hero, locale };
}
