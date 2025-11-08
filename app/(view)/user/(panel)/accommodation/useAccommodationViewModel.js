"use client";

import { useMemo } from "react";
import useSWR from "swr";

const fetcher = (url) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`Failed to load ${url}`);
    return r.json();
  });

const pickLocale = (v) =>
  String(v || "id")
    .slice(0, 2)
    .toLowerCase() === "en"
    ? "en"
    : "id";

/* ================= i18n texts — ALIGNED TO DESIGN ================= */
const TEXT = {
  id: {
    hero: {
      title: "Pemesanan Akomodasi",
      subtitle:
        "Temukan tempat tinggal terbaik untuk mendukung perjalanan studi dan karier internasional Anda dengan nyaman dan mudah.",
      illustration: "/akomodasi.svg",
    },

    description:
      "<p>Booking Akomodasi adalah layanan pemesanan tempat tinggal yang membantu Anda menemukan hunian nyaman dan sesuai kebutuhan selama studi dan karier di luar negeri. Mulai dari apartemen, asrama mahasiswa, homestay, hingga penginapan jangka pendek—semuanya bisa dipilih dengan mudah dan praktis. Dengan dukungan tim kami, Anda tak perlu khawatir soal kenyamanan, lokasi strategis, maupun keamanan, karena kami memastikan akomodasi terbaik untuk menunjang perjalanan dan aktivitas Anda.</p>",

    services: {
      heading: "LAYANAN PEMESANAN AKOMODASI",
      imageBack: "/accommodation-collage-back.svg",
      imageFront: "/accommodation-collage-front.svg",
      items: [
        {
          id: "hotel",
          icon: "🏨",
          title: "Hotel berkualitas",
          text: "Kenyamanan terbaik di hotel pilihan dengan lokasi strategis.",
        },
        {
          id: "dorm",
          icon: "🛌",
          title: "Asrama",
          text: "Akomodasi aman dan praktis untuk kebutuhan mahasiswa.",
        },
        {
          id: "homestay",
          icon: "🏠",
          title: "Homestay",
          text: "Kenyamanan dengan sentuhan lingkungan lokal.",
        },
        {
          id: "transport",
          icon: "🚌",
          title: "Transportasi",
          text: "Layanan perjalanan efisien dan terpercaya di Bali.",
        },
        {
          id: "apartment",
          icon: "🏢",
          title: "Apartment",
          text: "Akomodasi modern, privat, serta akses fasilitas premium.",
        },
        {
          id: "house",
          icon: "🏡",
          title: "Rumah",
          text: "Ruang privat maksimal—ideal untuk kenyamanan keluarga.",
        },
      ],
    },

    why: {
      heading: "MENGAPA PILIH AKOMODASI DI OSS BALI?",
      reasons: [
        {
          id: "price",
          icon: "💲",
          title: "Harga Terjangkau",
          sub: "Harga yang terjangkau dan ramah.",
        },
        {
          id: "trusted",
          icon: "🤝",
          title: "Akomodasi Terpercaya",
          sub: "Sudah terpercaya dan resmi.",
        },
        {
          id: "security",
          icon: "🔒",
          title: "Keamanan Data",
          sub: "Memastikan keamanan data student.",
        },
        {
          id: "pickup",
          icon: "🚖",
          title: "Transportasi",
          sub: "Gratis penjemputan.",
        },
      ],
    },

    cta: {
      title: "SOLUSI AKOMODASI PROFESIONAL UNTUK KEHIDUPAN GLOBAL ANDA",
      subtitle:
        "Layanan Kami Menghadirkan Kemudahan, Keamanan, Dan Kenyamanan Bagi Setiap Individu Yang Siap Menapaki Perjalanan Internasional.",
      button: { label: "COBA SEKARANG", href: "/user/leads" },
    },
  },

  en: {
    hero: {
      title: "Accommodation Booking",
      subtitle:
        "Find the best place to stay to support your study and international career—comfortably and easily.",
      illustration: "/akomodasi.svg",
    },

    description:
      "<p>Accommodation Booking helps you find comfortable housing tailored to your needs during study or career abroad. From apartments, student dorms, homestays, to short-term stays—everything can be arranged easily and practically. With our team’s support, you won’t worry about comfort, strategic location, or security as we secure the best accommodation to support your journey and activities.</p>",

    services: {
      heading: "ACCOMMODATION BOOKING SERVICES",
      imageBack: "/accommodation-collage-back.jpg",
      imageFront: "/accommodation-collage-front.jpg",
      items: [
        {
          id: "hotel",
          icon: "🏨",
          title: "Quality Hotels",
          text: "The best comfort at selected hotels in strategic locations.",
        },
        {
          id: "dorm",
          icon: "🛌",
          title: "Dormitory",
          text: "Safe and practical housing for students' needs.",
        },
        {
          id: "homestay",
          icon: "🏠",
          title: "Homestay",
          text: "Comfort with a local touch.",
        },
        {
          id: "transport",
          icon: "🚌",
          title: "Transportation",
          text: "Efficient and reliable travel service in Bali.",
        },
        {
          id: "apartment",
          icon: "🏢",
          title: "Apartment",
          text: "Modern, private stays with access to premium facilities.",
        },
        {
          id: "house",
          icon: "🏡",
          title: "House",
          text: "Maximum private space—ideal for families.",
        },
      ],
    },

    why: {
      heading: "WHY CHOOSE ACCOMMODATION WITH OSS BALI?",
      reasons: [
        {
          id: "price",
          icon: "💲",
          title: "Affordable Price",
          sub: "Wallet-friendly and transparent.",
        },
        {
          id: "trusted",
          icon: "🤝",
          title: "Trusted Accommodation",
          sub: "Official and reliable partners.",
        },
        {
          id: "security",
          icon: "🔒",
          title: "Data Security",
          sub: "We keep student data safe.",
        },
        {
          id: "pickup",
          icon: "🚖",
          title: "Transportation",
          sub: "Free pick-up.",
        },
      ],
    },

    cta: {
      title: "PROFESSIONAL ACCOMMODATION SOLUTIONS FOR YOUR GLOBAL LIFE",
      subtitle:
        "We deliver ease, safety, and comfort for every individual ready to embark on an international journey.",
      button: { label: "TRY NOW", href: "/user/leads" },
    },
  },
};

/* =============== View Model =============== */
export default function useAccommodationViewModel({ locale = "id" } = {}) {
  const lk = pickLocale(locale);

  const { data, error, isLoading } = useSWR(
    `/api/accommodation?locale=${lk}`,
    fetcher,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  const fallback = useMemo(() => TEXT[lk], [lk]);

  const content = useMemo(() => {
    if (!data || error) return fallback;
    return { ...fallback, ...data };
  }, [data, error, fallback]);

  return { locale: lk, content, isLoading, isError: Boolean(error) };
}
