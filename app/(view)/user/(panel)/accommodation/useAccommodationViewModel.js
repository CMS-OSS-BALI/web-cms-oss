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

/* ================= i18n texts ================= */
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
      heading: "Akomodasi Apa Saja Yang Ada Di OSS Bali?",
      subheading:
        "Mulai dari tiket, hunian, hingga kebutuhan penunjang lain — semua bisa kami bantu siapkan sejak sebelum keberangkatan.",
      cards: [
        {
          id: "ticket",
          icon: "/icons/acco-ticket.svg",
          label: "Pemesanan Tiket Pesawat",
        },
        { id: "dorm", icon: "/icons/acco-dorm.svg", label: "Asrama Mahasiswa" },
        {
          id: "homestay",
          icon: "/icons/acco-homestay.svg",
          label: "Homestay Wisatawan",
        },
        {
          id: "hotel",
          icon: "/icons/acco-hotel.svg",
          label: "Hotel & Tempat Wisata Liburan",
        },
        {
          id: "studio",
          icon: "/icons/acco-studio.svg",
          label: "Studio Apartement",
        },
        {
          id: "house",
          icon: "/icons/acco-house.svg",
          label: "Rumah Kontrakan",
        },
        {
          id: "airport",
          icon: "/icons/acco-airport.svg",
          label: "Penjemputan Bandara",
        },
        {
          id: "tour",
          icon: "/icons/acco-tour.svg",
          label: "Tur Fasilitas Kampus & Kota",
        },
        {
          id: "health",
          icon: "/icons/acco-health.svg",
          label: "Pengecekan Kesehatan",
        },
        {
          id: "bank",
          icon: "/icons/acco-bank.svg",
          label: "Pembuatan Akun Bank",
        },
      ],
    },

    why: {
      heading: "Mengapa Pilih Akomodasi Di OSS Bali?",
      image: "/images/why-accommodation-student.svg", // sesuaikan path bila perlu
      reasons: [
        {
          id: "price",
          icon: "/icons/why-price.svg",
          title: "Harga Terjangkau",
          text: "Harga yang terjangkau dan ramah.",
        },
        {
          id: "comfort",
          icon: "/icons/why-comfort.svg",
          title: "Kenyamanan dan keamanan terjamin",
          text: "Memastikan kenyamanan dan keamanan client selalu terjaga.",
        },
        {
          id: "bank",
          icon: "/icons/why-bank.svg",
          title: "Kartu Izin Tinggal / Bank Akun",
          text: "Proses rekening bank menjadi lebih sederhana dan efisien.",
        },
        {
          id: "network",
          icon: "/icons/why-network.svg",
          title: "Jaringan koneksi terlengkap",
          text: "Jaringan koneksi terlengkap untuk pengalaman tanpa batas.",
        },
        {
          id: "location",
          icon: "/icons/why-location.svg",
          title: "Pilihan Lokasi Strategis",
          text: "Nikmati akses mudah dengan pilihan lokasi yang strategis.",
        },
      ],
    },

    // === CTA disesuaikan dengan desain ===
    cta: {
      title: "Rencanakan Dan Pesan Akomodasimu Sekarang Juga Hanya Di OSS Bali",
      subtitle: "", // desain tidak pakai subcopy, jadi dikosongkan
      button: { label: "Temukan Sekarang", href: "/user/leads" },
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
      heading: "What Accommodation Services Are Available at OSS Bali?",
      subheading:
        "From tickets and housing to other essential needs — we help you prepare everything even before departure.",
      cards: [
        {
          id: "ticket",
          icon: "/icons/acco-ticket.svg",
          label: "Flight Ticket Booking",
        },
        {
          id: "dorm",
          icon: "/icons/acco-dorm.svg",
          label: "Student Dormitory",
        },
        {
          id: "homestay",
          icon: "/icons/acco-homestay.svg",
          label: "Tourist Homestay",
        },
        {
          id: "hotel",
          icon: "/icons/acco-hotel.svg",
          label: "Hotels & Holiday Stays",
        },
        {
          id: "studio",
          icon: "/icons/acco-studio.svg",
          label: "Studio Apartment",
        },
        { id: "house", icon: "/icons/acco-house.svg", label: "Rental House" },
        {
          id: "airport",
          icon: "/icons/acco-airport.svg",
          label: "Airport Pick-Up",
        },
        {
          id: "tour",
          icon: "/icons/acco-tour.svg",
          label: "Campus & City Tour",
        },
        { id: "health", icon: "/icons/acco-health.svg", label: "Health Check" },
        {
          id: "bank",
          icon: "/icons/acco-bank.svg",
          label: "Bank Account Opening",
        },
      ],
    },

    why: {
      heading: "Why Choose Accommodation With OSS Bali?",
      image: "/images/why-accommodation-student.svg",
      reasons: [
        {
          id: "price",
          icon: "/icons/why-price.svg",
          title: "Affordable Price",
          text: "Budget-friendly and transparent pricing.",
        },
        {
          id: "comfort",
          icon: "/icons/why-comfort.svg",
          title: "Comfort & Safety Ensured",
          text: "We make sure your comfort and safety are always well maintained.",
        },
        {
          id: "bank",
          icon: "/icons/why-bank.svg",
          title: "Residence Card / Bank Account",
          text: "Bank account and permit processes are made simpler and more efficient.",
        },
        {
          id: "network",
          icon: "/icons/why-network.svg",
          title: "Extensive Connection Network",
          text: "Leverage our broad network for limitless experiences abroad.",
        },
        {
          id: "location",
          icon: "/icons/why-location.svg",
          title: "Strategic Location Choices",
          text: "Enjoy easy access with well-selected, strategic locations.",
        },
      ],
    },

    // Versi Inggris menyesuaikan sense copy CTA
    cta: {
      title: "Plan And Book Your Accommodation Right Now Only With OSS Bali",
      subtitle: "",
      button: { label: "Discover Now", href: "/user/leads" },
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
