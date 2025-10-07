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
      bullets: [
        { id: "b1", label: "Konsultasi Gratis" },
        { id: "b2", label: "Jadwal Fleksibel" },
      ],
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
          title: "Hotel Berkualitas",
          text: "Penyedia tepercaya dan terverifikasi.",
        },
        {
          id: "s2",
          title: "Apartemen",
          text: "Lokasi strategis dengan banyak pilihan.",
        },
        {
          id: "s3",
          title: "Student Apartment",
          text: "Pilihan khusus mahasiswa, nyaman & aman.",
        },
        {
          id: "s4",
          title: "Transportasi",
          text: "Opsi antar-jemput & mobil sewa.",
        },
      ],
    },
    why: {
      heading: "MENGAPA PILIH OSS BALI",
      reasons: [
        {
          id: "w1",
          title: "Harga Terjangkau",
          sub: "Harga ramah & transparan.",
        },
        {
          id: "w2",
          title: "Student Apartment",
          sub: "Mitra resmi & tepercaya.",
        },
        {
          id: "w3",
          title: "Keamanan Data",
          sub: "Privasi dan data Anda terlindungi.",
        },
        {
          id: "w4",
          title: "Transportasi",
          sub: "Operasional profesional.",
        },
      ],
    },
    cta: {
      big: "ADA PERTANYAAN?",
      button: { label: "CLICK HERE", href: "/user/leads" },
    },
  },

  en: {
    hero: {
      title: "ACCOMMODATION BOOKING",
      subtitle:
        "Begin your global journey with Overseas Study and step into a world full of possibilities.",
      bullets: [
        { id: "b1", label: "Free Consultation" },
        { id: "b2", label: "Flexible Schedule" },
      ],
      illustration: "/akomodasi.svg",
    },
    description:
      "<p>Accommodation Booking helps you find comfortable housing tailored to your needs during study or internship abroad. From apartments, student dorms, homestays, to short-term stays - everything can be arranged easily. With our team, you can focus on your goals while we secure the best accommodation for you.</p>",
    services: {
      heading: "ACCOMMODATION SERVICES",
      imageBack: "/accommodation-collage-back.jpg",
      imageFront: "/accommodation-collage-front.jpg",
      items: [
        {
          id: "s1",
          title: "Quality Hotels",
          text: "Trusted, verified providers.",
        },
        {
          id: "s2",
          title: "Apartments",
          text: "Prime locations & many options.",
        },
        {
          id: "s3",
          title: "Student Apartment",
          text: "Student-friendly, safe & comfy.",
        },
        {
          id: "s4",
          title: "Transportation",
          text: "Pick-up options & car rentals.",
        },
      ],
    },
    why: {
      heading: "WHY GO WITH OSS BALI",
      reasons: [
        {
          id: "w1",
          title: "Affordable Price",
          sub: "Transparent pricing.",
        },
        {
          id: "w2",
          title: "Student Apartment",
          sub: "Official & trusted partners.",
        },
        {
          id: "w3",
          title: "Data Security",
          sub: "Your privacy is protected.",
        },
        {
          id: "w4",
          title: "Transportation",
          sub: "Professionally operated.",
        },
      ],
    },
    cta: {
      big: "ANY QUESTION?",
      button: { label: "CLICK HERE", href: "/user/leads" },
    },
  },
};

/* =============== View Model =============== */
export default function useAccommodationViewModel({ locale = "id" } = {}) {
  const lk = pickLocale(locale);

  // Ambil data server-side (kalau ada override per kampanye)
  const { data, error, isLoading } = useSWR(
    `/api/accommodation?locale=${lk}`,
    fetcher,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  const fallback = useMemo(() => TEXT[lk], [lk]);

  // Jika API memberikan sebagian field, gabungkan dengan fallback
  const content = useMemo(() => {
    if (!data || error) return fallback;
    return { ...fallback, ...data }; // shallow merge cukup karena struktur datanya datar per blok
  }, [data, error, fallback]);

  return {
    locale: lk,
    content,
    isLoading,
    isError: Boolean(error),
  };
}
