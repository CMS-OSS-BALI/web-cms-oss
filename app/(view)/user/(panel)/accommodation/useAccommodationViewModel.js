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

/* ================= i18n texts ================ */
const TEXT = {
  id: {
    hero: {
      title: "BOOKING AKOMODASI",
      subtitle:
        "Mulai perjalanan global Anda bersama Overseas Study, dan melangkah ke dunia penuh kemungkinan.",
      illustration: "/akomodasi.svg",
    },
    description:
      "<p>Booking Akomodasi adalah layanan pemesanan tempat tinggal yang membantu Anda menemukan hunian nyaman dan sesuai kebutuhan selama studi atau magang di luar negeri. Mulai dari apartemen, asrama mahasiswa, homestay, hingga penginapan jangka pendek, semua dapat dipilih dengan mudah dan praktis. Dengan dukungan tim kami, Anda tidak perlu khawatir soal kenyamanan, lokasi strategis, maupun keamanan, karena kami memastikan akomodasi terbaik untuk menunjang perjalanan dan aktivitas Anda.</p>",
    services: {
      heading: "LAYANAN BOOKING AKOMODASI",
      imageBack: "/accommodation-collage-back.jpg",
      imageFront: "/accommodation-collage-front.jpg",
      items: [
        {
          id: "s1",
          icon: "🏨",
          title: "Hotel Berkualitas",
          text: "Penyedia tepercaya dan terverifikasi.",
        },
        {
          id: "s2",
          icon: "🏢",
          title: "Apartemen",
          text: "Lokasi strategis dengan banyak pilihan.",
        },
        {
          id: "s3",
          icon: "🌐",
          title: "Student Apartment",
          text: "Pilihan khusus mahasiswa, nyaman & aman.",
        },
        {
          id: "s4",
          icon: "🚕",
          title: "Transportasi",
          text: "Opsi antar-jemput & mobil sewa.",
        },
      ],
    },
    why: {
      heading: "MENGAPA PILIH AKOMODASI DI OSS BALI?",
      reasons: [
        {
          id: "w1",
          icon: "💲",
          title: "Harga Terjangkau",
          sub: "Harga yang terjangkau dan ramah",
        },
        {
          id: "w2",
          icon: "🤝",
          title: "Student Apartement",
          sub: "Sudah terpercaya dan resmi",
        },
        {
          id: "w3",
          icon: "🔒",
          title: "Keamanan Data",
          sub: "Memastikan keamanan data student",
        },
        {
          id: "w4",
          icon: "🚖",
          title: "Transportasi",
          sub: "Bekerja secara profesional",
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
      title: "ACCOMMODATION BOOKING",
      subtitle:
        "Begin your global journey with Overseas Study and step into a world full of possibilities.",
      illustration: "/akomodasi.svg",
    },
    description:
      "<p>Accommodation Booking helps you find comfortable housing tailored to your needs during study or internship abroad. From apartments, student dorms, homestays, to short-term stays — everything can be arranged easily. With our team, you can focus on your goals while we secure the best accommodation for you.</p>",
    services: {
      heading: "ACCOMMODATION SERVICES",
      imageBack: "/accommodation-collage-back.jpg",
      imageFront: "/accommodation-collage-front.jpg",
      items: [
        {
          id: "s1",
          icon: "🏨",
          title: "Quality Hotels",
          text: "Trusted, verified providers.",
        },
        {
          id: "s2",
          icon: "🏢",
          title: "Apartments",
          text: "Prime locations & many options.",
        },
        {
          id: "s3",
          icon: "🌐",
          title: "Student Apartment",
          text: "Student-friendly, safe & comfy.",
        },
        {
          id: "s4",
          icon: "🚕",
          title: "Transportation",
          text: "Pick-up options & car rentals.",
        },
      ],
    },
    why: {
      heading: "WHY CHOOSE ACCOMMODATION WITH OSS BALI?",
      reasons: [
        {
          id: "w1",
          icon: "💲",
          title: "Affordable Price",
          sub: "Wallet-friendly & transparent.",
        },
        {
          id: "w2",
          icon: "🤝",
          title: "Student Apartment",
          sub: "Trusted & officially partnered.",
        },
        {
          id: "w3",
          icon: "🔒",
          title: "Data Security",
          sub: "We keep student data safe.",
        },
        {
          id: "w4",
          icon: "🚖",
          title: "Transportation",
          sub: "Professionally operated.",
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
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  );

  const fallback = useMemo(() => TEXT[lk], [lk]);

  const content = useMemo(() => {
    if (!data || error) return fallback;
    return { ...fallback, ...data };
  }, [data, error, fallback]);

  return {
    locale: lk,
    content,
    isLoading,
    isError: Boolean(error),
  };
}
