import { useMemo } from "react";
import useSWR from "swr";
import { fetcher } from "../../../../utils/fetcher";

// endpoint publik (sudah include locale & limit)
const TESTIMONIALS_ENDPOINT = "/api/testimonials?locale=id&limit=12";

// default/pola fetch consultants (mirip useConsultantsViewModel)
const DEFAULT_SORT = "created_at:desc";
const DEFAULT_LOCALE = "id";
const DEFAULT_FALLBACK = "id";

function consultantsKey({
  page = 1,
  perPage = 3,
  q = "",
  sort = DEFAULT_SORT,
  locale = DEFAULT_LOCALE,
  fallback = DEFAULT_FALLBACK,
} = {}) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("perPage", String(perPage));
  params.set("sort", sort);
  params.set("locale", locale);
  params.set("fallback", fallback);
  params.set("public", "1"); // ← make it public
  if (q && q.trim()) params.set("q", q.trim());
  return `/api/consultants?${params.toString()}`;
}

// safer fetcher (keeps page stable even if server returns non-OK)
const publicFetcher = async (url) => {
  const res = await fetch(url, { credentials: "omit" });
  if (!res.ok) {
    // if something odd happens, just return empty structure
    return { data: [] };
  }
  return res.json();
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export function useLandingViewModel() {
  const hero = {
    background: "/bg-1-lp.svg",
    title: "MAKE YOU PRIORITY",
    description:
      "One Step Solution (OSS) Bali adalah konsultan pendidikan & karir yang membantu siswa serta profesional di Bali meraih peluang karir di luar negeri.",
  };

  const metrics = [
    {
      id: "global-partner-1",
      value: "50K+",
      label: "Global Partner",
      gradient:
        "linear-gradient(180deg, rgba(18,88,190,0.95) 0%, rgba(12,63,151,0.95) 100%)",
    },
    {
      id: "visa-apply",
      value: "50K+",
      label: "Visa Apply",
      gradient:
        "linear-gradient(180deg, rgba(74,154,255,0.95) 0%, rgba(43,131,231,0.95) 100%)",
    },
    {
      id: "student-exchange",
      value: "50K+",
      label: "Student Exchange",
      gradient:
        "linear-gradient(180deg, rgba(32,107,220,0.95) 0%, rgba(25,86,184,0.95) 100%)",
    },
    {
      id: "global-partner-2",
      value: "50K+",
      label: "Global Partner",
      gradient:
        "linear-gradient(180deg, rgba(13,74,168,0.95) 0%, rgba(8,46,108,0.95) 100%)",
    },
  ];

  const whyChoose = {
    title: "WHY CHOOSE US?",
    cards: [
      {
        id: "trusted",
        icon: "/trusted.svg",
        value: "50K+",
        label: "Trusted Institution",
      },
      {
        id: "program",
        icon: "/program.svg",
        value: "50K+",
        label: "Program Unggulan",
      },
      {
        id: "exchange",
        icon: "/exchange.svg",
        value: "50K+",
        label: "Study Exchange",
      },
      {
        id: "universitas",
        icon: "/university.svg",
        value: "50K+",
        label: "Universitas Global",
      },
    ],
  };

  const popularProgram = {
    title: "OUR POPULAR PROGRAM",
    subtitle:
      "Kami menawarkan program unggulan untuk mendukung studi dan karier global Anda, dengan pengalaman belajar berkualitas, peluang internasional, serta akses ke universitas dan mitra terbaik.",
    items: [
      {
        id: "destinations",
        image: "/program-destinations.svg",
        label: "PULUHAN NEGARA TUJUAN",
      },
      {
        id: "campus",
        image: "/program-campus.svg",
        label: "RATUSAN MITRA KAMPUS",
      },
      {
        id: "career",
        image: "/program-career.svg",
        label: "KARIR LUAR NEGERI",
      },
    ],
  };

  const testimonials = {
    title: "What They Say",
    subtitle: "Cerita mereka yang sudah merasakan layanan OSS Bali.",
  };

  /* ===== Testimonials (GET) ===== */
  const {
    data: testiJson,
    error: testiErr,
    isLoading: testiLoading,
    isValidating: testiValidating,
  } = useSWR(TESTIMONIALS_ENDPOINT, fetcher);

  const testimonialsList = useMemo(() => {
    const source = Array.isArray(testiJson?.data)
      ? testiJson.data
      : Array.isArray(testiJson)
      ? testiJson
      : [];
    return source.map((t, index) => ({
      id: t.id ?? t._id ?? `testimonial-${index}`,
      name: t.name ?? "",
      message: t.message ?? t.quote ?? "",
      photoUrl: t.photo_url ?? t.photoUrl ?? "/images/avatars/default.jpg",
      star: toNumber(t.star),
      youtubeUrl: t.youtube_url ?? t.youtubeUrl ?? null,
      campusCountry: t.kampus_negara_tujuan ?? t.campusCountry ?? "",
    }));
  }, [testiJson]);

  /* ===== Consultants (GET) publik ===== */
  const consultantsReqKey = useMemo(
    () =>
      consultantsKey({
        page: 1,
        perPage: 3, // tampilkan 3 di landing
        sort: DEFAULT_SORT,
        locale: DEFAULT_LOCALE,
        fallback: DEFAULT_FALLBACK,
      }),
    []
  );

  const {
    data: consultantsJson,
    error: consultantsErr,
    isLoading: consultantsLoading,
  } = useSWR(consultantsReqKey, publicFetcher, { revalidateOnFocus: false });

  const consultantsItems = useMemo(() => {
    const list = consultantsJson?.data ?? [];
    return list.map((c, i) => ({
      id: c.id ?? c._id ?? `consultant-${i}`,
      name: c.name ?? c.name_id ?? "",
      photo:
        c.profile_image_url ??
        c.program_consultant_image_url ??
        "/images/avatars/default.jpg",
      bio: c.description ?? c.description_id ?? "",
    }));
  }, [consultantsJson]);

  const consultants = useMemo(
    () => ({
      title: "Our Consultants",
      items: consultantsItems,
    }),
    [consultantsItems]
  );

  const faq = {
    title: "FREQUENTLY ASK QUESTION",
    illustration: "/images/mascot-faq.png",
    items: [
      {
        q: "Apakah harus punya IELTS untuk Kuliah di Luar Negeri?",
        a: "Tidak selalu. Sejumlah kampus menerima alternatif seperti Duolingo English Test, TOEFL iBT, atau program pathway/ELP. Syarat spesifik tergantung negara dan universitas tujuan.",
      },
      {
        q: "Bagaimana jika saya pernah mengalami penolakan visa?",
        a: "Masih bisa apply lagi. Perbaiki dokumen yang lemah, kuatkan bukti finansial & ikatan kembali ke Indonesia, dan jelaskan perubahan kondisi pada pengajuan ulang.",
      },
      {
        q: "Apakah kuliah di luar negeri bisa sambil bekerja?",
        a: "Di banyak negara bisa part-time (contoh 20 jam/minggu saat kuliah). Aturan tiap negara berbeda, jadi pastikan cek regulasi imigrasi tujuanmu.",
      },
    ],
  };

  const countryPartners = {
    title: "OUR COUNTRY PARTNER",
    items: [
      { id: "us", name: "United States", flag: "/flags/us.svg" },
      { id: "au", name: "Australia", flag: "/flags/au.svg" },
      { id: "ca", name: "Canada", flag: "/flags/ca.svg" },
      { id: "de", name: "Germany", flag: "/flags/de.svg" },
      { id: "jp", name: "Japan", flag: "/flags/jp.svg" },
      { id: "kr", name: "South Korea", flag: "/flags/kr.svg" },
      { id: "nl", name: "Netherlands", flag: "/flags/nl.svg" },
      { id: "ch", name: "Switzerland", flag: "/flags/ch.svg" },
      { id: "cn", name: "China", flag: "/flags/cn.svg" },
      { id: "nz", name: "New Zealand", flag: "/flags/nz.svg" },
      { id: "gb", name: "United Kingdom", flag: "/flags/gb.svg" },
      { id: "dk", name: "Denmark", flag: "/flags/dk.svg" },
      { id: "pl", name: "Poland", flag: "/flags/pl.svg" },
      { id: "ie", name: "Ireland", flag: "/flags/ie.svg" },
      { id: "tw", name: "Taiwan", flag: "/flags/tw.svg" },
      { id: "sg", name: "Singapore", flag: "/flags/sg.svg" },
      { id: "my", name: "Malaysia", flag: "/flags/my.svg" },
      { id: "tr", name: "Turkey", flag: "/flags/tr.svg" },
      { id: "cz", name: "Czech Republic", flag: "/flags/cz.svg" },
      { id: "it", name: "Italy", flag: "/flags/it.svg" },
    ],
  };

  return {
    hero,
    metrics,
    whyChoose,
    popularProgram,
    testimonials,
    testimonialsList,
    isTestimonialsLoading: testiLoading,
    isTestimonialsValidating: testiValidating,
    testimonialsError: testiErr,

    consultants,
    isConsultantsLoading: consultantsLoading,
    consultantsError: consultantsErr,

    faq,
    countryPartners,
  };
}
