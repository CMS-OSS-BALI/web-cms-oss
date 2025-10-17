import { useMemo } from "react";
import useSWR from "swr";
import { fetcher } from "../../../../utils/fetcher";

/* ---------- constants ---------- */
const DEFAULT_SORT = "created_at:desc";
const DEFAULT_LOCALE = "id";
const DEFAULT_FALLBACK = "id";
const DEFAULT_AVATAR = "/images/avatars/default.jpg";

/* ---------- utils ---------- */
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
  params.set("sort", String(sort || DEFAULT_SORT));
  params.set("locale", String(locale || DEFAULT_LOCALE));
  params.set("fallback", String(fallback || DEFAULT_FALLBACK));
  params.set("public", "1"); // public listing
  if (q && String(q).trim()) params.set("q", String(q).trim());
  return `/api/consultants?${params.toString()}`;
}

// tolerant number cast (for ratings etc.)
const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

// prefer public URL fields; fall back to path/legacy keys -> default avatar
const pickPublicImage = (obj, fallback = DEFAULT_AVATAR) =>
  obj?.image_public_url ||
  obj?.photo_public_url ||
  obj?.profile_image_public_url ||
  obj?.profile_image_url ||
  obj?.program_consultant_image_url ||
  obj?.photo_url ||
  obj?.photoUrl ||
  fallback;

// safer fetcher for public endpoints (don’t throw on non-OK)
const publicFetcher = async (url) => {
  try {
    const res = await fetch(url, { credentials: "omit" });
    if (!res.ok) return { data: [] };
    return await res.json();
  } catch {
    return { data: [] };
  }
};

export function useLandingViewModel(arg) {
  // allow: useLandingViewModel(), useLandingViewModel({ locale: "en" }), useLandingViewModel("en")
  let locale = DEFAULT_LOCALE;
  if (typeof arg === "string") locale = arg;
  else if (arg && typeof arg === "object" && arg.locale) locale = arg.locale;
  locale = (locale || "id").slice(0, 2).toLowerCase() === "en" ? "en" : "id";

  const t = (id, en) => (locale === "en" ? en : id);

  const hero = {
    background: "/bg-1-lp.svg",
    title: t("JADIKAN KAMU PRIORITAS", "MAKE YOU A PRIORITY"),
    description: t(
      "One Step Solution (OSS) Bali adalah konsultan pendidikan & karier yang membantu siswa serta profesional di Bali meraih peluang karier di luar negeri.",
      "One Step Solution (OSS) Bali is an education & career consultancy helping students and professionals in Bali pursue global career opportunities."
    ),
  };

  const metrics = [
    {
      id: "global-partner-1",
      value: "50K+",
      label: t("Mitra Global", "Global Partner"),
      gradient:
        "linear-gradient(180deg, rgba(18,88,190,0.95) 0%, rgba(12,63,151,0.95) 100%)",
    },
    {
      id: "visa-apply",
      value: "50K+",
      label: t("Pengajuan Visa", "Visa Apply"),
      gradient:
        "linear-gradient(180deg, rgba(74,154,255,0.95) 0%, rgba(43,131,231,0.95) 100%)",
    },
    {
      id: "student-exchange",
      value: "50K+",
      label: t("Pertukaran Pelajar", "Student Exchange"),
      gradient:
        "linear-gradient(180deg, rgba(32,107,220,0.95) 0%, rgba(25,86,184,0.95) 100%)",
    },
    {
      id: "global-partner-2",
      value: "50K+",
      label: t("Mitra Global", "Global Partner"),
      gradient:
        "linear-gradient(180deg, rgba(13,74,168,0.95) 0%, rgba(8,46,108,0.95) 100%)",
    },
  ];

  const whyChoose = {
    title: t("KENAPA PILIH KAMI?", "WHY CHOOSE US?"),
    cards: [
      {
        id: "trusted",
        icon: "/trusted.svg",
        value: "50K+",
        label: t("Lembaga Terpercaya", "Trusted Institution"),
      },
      {
        id: "program",
        icon: "/program.svg",
        value: "50K+",
        label: t("Program Unggulan", "Featured Programs"),
      },
      {
        id: "exchange",
        icon: "/exchange.svg",
        value: "50K+",
        label: t("Program Pertukaran", "Study Exchange"),
      },
      {
        id: "universitas",
        icon: "/university.svg",
        value: "50K+",
        label: t("Universitas Global", "Global Universities"),
      },
    ],
  };

  const popularProgram = {
    title: t("PROGRAM POPULER KAMI", "OUR POPULAR PROGRAM"),
    subtitle: t(
      "Kami menawarkan program unggulan untuk mendukung studi dan karier global Anda, dengan pengalaman belajar berkualitas, peluang internasional, serta akses ke universitas dan mitra terbaik.",
      "We offer standout programs to support your study and global career, with quality learning, international opportunities, and access to top universities & partners."
    ),
    items: [
      {
        id: "destinations",
        image: "/program-destinations.svg",
        label: t("PULUHAN NEGARA TUJUAN", "DOZENS OF DESTINATION COUNTRIES"),
      },
      {
        id: "campus",
        image: "/program-campus.svg",
        label: t("RATUSAN MITRA KAMPUS", "HUNDREDS OF CAMPUS PARTNERS"),
      },
      {
        id: "career",
        image: "/program-career.svg",
        label: t("KARIER LUAR NEGERI", "OVERSEAS CAREERS"),
      },
    ],
  };

  const testimonials = {
    title: t("Apa Kata Mereka", "What They Say"),
    subtitle: t(
      "Cerita mereka yang sudah merasakan layanan OSS Bali.",
      "Stories from those who have experienced OSS Bali's services."
    ),
  };

  /* ===== Testimonials (GET) with locale & fallback) ===== */
  const testiKey = useMemo(
    () => `/api/testimonials?locale=${locale}&fallback=id&limit=12`,
    [locale]
  );

  const {
    data: testiJson,
    error: testiErr,
    isLoading: testiLoading,
    isValidating: testiValidating,
  } = useSWR(testiKey, fetcher, { revalidateOnFocus: false });

  const testimonialsList = useMemo(() => {
    const source = Array.isArray(testiJson?.data)
      ? testiJson.data
      : Array.isArray(testiJson)
      ? testiJson
      : [];

    return source.map((t, index) => ({
      id: t?.id ?? t?._id ?? `testimonial-${index}`,
      name: t?.name ?? "",
      message: t?.message ?? t?.quote ?? "",
      // prefer public image url from new API, fallback to old, then to path, then default avatar
      photoUrl: pickPublicImage(t),
      star: toNumber(t?.star),
      youtubeUrl: t?.youtube_url ?? t?.youtubeUrl ?? null,
      campusCountry: t?.kampus_negara_tujuan ?? t?.campusCountry ?? "",
    }));
  }, [testiJson]);

  /* ===== Consultants (GET) publik, ikut locale ===== */
  const consultantsReqKey = useMemo(
    () =>
      consultantsKey({
        page: 1,
        perPage: 3,
        sort: DEFAULT_SORT,
        locale,
        fallback: "id",
      }),
    [locale]
  );

  const {
    data: consultantsJson,
    error: consultantsErr,
    isLoading: consultantsLoading,
  } = useSWR(consultantsReqKey, publicFetcher, { revalidateOnFocus: false });

  const consultantsItems = useMemo(() => {
    const list = Array.isArray(consultantsJson?.data)
      ? consultantsJson.data
      : [];
    return list.map((c, i) => ({
      id: c?.id ?? c?._id ?? `consultant-${i}`,
      name:
        (locale === "en" ? c?.name_en : c?.name_id) ??
        c?.name ??
        c?.name_id ??
        c?.name_en ??
        "",
      photo: pickPublicImage(c, DEFAULT_AVATAR),
      bio:
        (locale === "en" ? c?.description_en : c?.description_id) ??
        c?.description ??
        c?.description_id ??
        c?.description_en ??
        "",
    }));
  }, [consultantsJson, locale]);

  const consultants = useMemo(
    () => ({
      title: t("Konsultan Kami", "Our Consultants"),
      items: consultantsItems,
    }),
    [consultantsItems, locale]
  );

  const faq = {
    title: t("PERTANYAAN YANG SERING DITANYAKAN", "FREQUENTLY ASKED QUESTIONS"),
    illustration: "/images/maskot.png",
    items: [
      {
        q: t(
          "Apakah harus punya IELTS untuk kuliah di luar negeri?",
          "Do I need IELTS to study abroad?"
        ),
        a: t(
          "Tidak selalu. Sejumlah kampus menerima alternatif seperti Duolingo English Test, TOEFL iBT, atau program pathway/ELP. Syarat spesifik tergantung negara dan universitas tujuan.",
          "Not always. Many universities accept alternatives like Duolingo English Test, TOEFL iBT, or pathway/ELP programs. Requirements depend on the country and the university."
        ),
      },
      {
        q: t(
          "Bagaimana jika saya pernah mengalami penolakan visa?",
          "What if I've had a visa refusal?"
        ),
        a: t(
          "Masih bisa apply lagi. Perbaiki dokumen yang lemah, kuatkan bukti finansial & ikatan kembali ke Indonesia, dan jelaskan perubahan kondisi pada pengajuan ulang.",
          "You can reapply. Strengthen weak documents, improve financial evidence & ties to your home country, and clearly explain changes in your circumstances."
        ),
      },
      {
        q: t(
          "Apakah kuliah di luar negeri bisa sambil bekerja?",
          "Can I work while studying abroad?"
        ),
        a: t(
          "Di banyak negara bisa part-time (contoh 20 jam/minggu saat kuliah). Aturan tiap negara berbeda, jadi pastikan cek regulasi imigrasi tujuanmu.",
          "In many countries you can work part-time (e.g., 20 hours/week during term). Rules vary by country, so always check the relevant immigration regulations."
        ),
      },
    ],
  };

  const countryPartners = {
    title: t("MITRA NEGARA KAMI", "OUR COUNTRY PARTNER"),
    items: [
      {
        id: "us",
        name: t("Amerika Serikat", "United States"),
        flag: "/flags/us.svg",
      },
      { id: "au", name: t("Australia", "Australia"), flag: "/flags/au.svg" },
      { id: "ca", name: t("Kanada", "Canada"), flag: "/flags/ca.svg" },
      { id: "de", name: t("Jerman", "Germany"), flag: "/flags/de.svg" },
      { id: "jp", name: t("Jepang", "Japan"), flag: "/flags/jp.svg" },
      {
        id: "kr",
        name: t("Korea Selatan", "South Korea"),
        flag: "/flags/kr.svg",
      },
      { id: "nl", name: t("Belanda", "Netherlands"), flag: "/flags/nl.svg" },
      { id: "ch", name: t("Swiss", "Switzerland"), flag: "/flags/ch.svg" },
      { id: "cn", name: t("Tiongkok", "China"), flag: "/flags/cn.svg" },
      {
        id: "nz",
        name: t("Selandia Baru", "New Zealand"),
        flag: "/flags/nz.svg",
      },
      { id: "gb", name: t("Inggris", "United Kingdom"), flag: "/flags/gb.svg" },
      { id: "dk", name: t("Denmark", "Denmark"), flag: "/flags/dk.svg" },
      { id: "pl", name: t("Polandia", "Poland"), flag: "/flags/pl.svg" },
      { id: "ie", name: t("Irlandia", "Ireland"), flag: "/flags/ie.svg" },
      { id: "tw", name: t("Taiwan", "Taiwan"), flag: "/flags/tw.svg" },
      { id: "sg", name: t("Singapura", "Singapore"), flag: "/flags/sg.svg" },
      { id: "my", name: t("Malaysia", "Malaysia"), flag: "/flags/my.svg" },
      { id: "tr", name: t("Turki", "Turkey"), flag: "/flags/tr.svg" },
      {
        id: "cz",
        name: t("Republik Ceko", "Czech Republic"),
        flag: "/flags/cz.svg",
      },
      { id: "it", name: t("Italia", "Italy"), flag: "/flags/it.svg" },
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
