// app/(view)/user/(landing)/useLandingViewModel.js
import { useMemo } from "react";
import useSWR from "swr";
import { fetcher } from "../../../../utils/fetcher";

/* ---------- constants ---------- */
const DEFAULT_SORT = "created_at:desc";
const DEFAULT_LOCALE = "id";
const DEFAULT_FALLBACK = "id";
const DEFAULT_AVATAR = "/images/avatars/default.svg";

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
  params.set("page", String(Math.max(1, page)));
  params.set("perPage", String(Math.max(1, perPage)));
  params.set("sort", sort || DEFAULT_SORT);
  params.set("locale", locale || DEFAULT_LOCALE);
  params.set("fallback", fallback || DEFAULT_FALLBACK);
  params.set("public", "1");
  if (q && String(q).trim().length > 0) params.set("q", String(q).trim());
  return `/api/consultants?${params.toString()}`;
}

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const pickPublicImage = (obj, fallback = DEFAULT_AVATAR) =>
  obj?.image_public_url ||
  obj?.photo_public_url ||
  obj?.program_consultant_image_public_url ||
  obj?.profile_image_public_url ||
  obj?.profile_image_url ||
  obj?.program_consultant_image_url ||
  obj?.photo_url ||
  obj?.photoUrl ||
  fallback;

/* ---------- fetchers ---------- */
const publicFetcher = async (url) => {
  try {
    const res = await fetch(url, {
      method: "GET",
      credentials: "omit",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "ngrok-skip-browser-warning": "true",
      },
    });
    if (!res.ok) return { data: [] };
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) return { data: [] };
    return await res.json();
  } catch {
    return { data: [] };
  }
};

export function useLandingViewModel(arg) {
  // allow string or object
  let locale = DEFAULT_LOCALE;
  if (typeof arg === "string") locale = arg;
  else if (arg && typeof arg === "object" && arg.locale) locale = arg.locale;
  locale = (locale || "id").slice(0, 2).toLowerCase() === "en" ? "en" : "id";

  const t = (id, en) => (locale === "en" ? en : id);

  /* ===== HERO (baru) - video background ===== */
  const hero = {
    backgroundType: "video",
    backgroundSrc: "/assets/video/hero-background.mp4",
    background: "", // fallback image (kalau mau pakai image nanti)
    title: "#WEMAKEYOUPRIORITY",
    description: t(
      "37.000+ alumni sukses bersama OSS Bali",
      "37,000+ successful alumni with OSS Bali"
    ),
    ctaText: t("Konsultasi Gratis Sekarang", "Get Free Consultation"),
    ctaHref: "/user/leads",
  };

  /* ===== Video Education (copy bilingual) ===== */
  const education = {
    blocks: [
      {
        title: t(
          "Siapa Bilang Kuliah Luar Negeri Susah?",
          "Who Says Studying Abroad Is Hard?"
        ),
        desc: t(
          "Mungkin mereka belum tahu caranya yang benar. Temukan langkahmu bersama kami.",
          "Maybe they just don't know the right way. Find your path with us."
        ),
        youtube: "https://youtu.be/xKatx3USazQ?si=qd95Up2gceDJSVKK",
      },
      {
        title: t(
          "Langkah pertamamu menuju Study & Karir Luar Negeri",
          "Your First Step to Overseas Study & Career"
        ),
        desc: t(
          "Jangan khawatir—kami akan menuntunmu dari awal hingga berhasil kuliah dan karier di luar negeri.",
          "Don't worry—we'll guide you from the start until you succeed in studying and building a career abroad."
        ),
        youtube: "https://youtu.be/BdcyBPoG-kY?si=pR1xpVMjgjjSePvB",
      },
    ],
    centerTitle: t(
      "Kesuksesan Itu 80%-Nya Adalah Memulai",
      "Success Is 80% About Getting Started"
    ),
    centerSubtitle: t(
      "Rencanakan study & karirmu bersama kami.",
      "Plan your study & career with us."
    ),
    centerYoutube: "https://youtu.be/Py1jA2EjCmk?si=qke7rB0X2BlWXHsv",
  };

  /* ===== Popular Program (layout teks kiri + slider kanan) ===== */
  const popularProgram = {
    headline: t(
      "Mulai Dari Sini Tentukan Kemanapun Perjalananmu",
      "Start Here, Choose Your Journey Anywhere"
    ),
    subheadline: t(
      "Temukan Layanan Terbaikmu",
      "Find the best service for you"
    ),
    ctaText: t("Bandingkan Sekarang", "Compare Now"),
    ctaHref: "/user/leads",

    // legacy title/subtitle (kalau masih dipakai di tempat lain)
    title: t("PROGRAM POPULER KAMI", "OUR POPULAR PROGRAM"),
    subtitle: t(
      "Kami menawarkan program unggulan ...",
      "We offer standout programs ..."
    ),

    items: [
      {
        id: "study-overseas",
        image: "/study-overseas.svg",
        label: t("STUDI LUAR NEGERI", "STUDY OVERSEAS"),
      },
      {
        id: "translate-doc",
        image: "/translate-doc.svg",
        label: t("TERJEMAHAN DOKUMEN", "TRANSLATE DOCUMENTS"),
      },
      {
        id: "eng-course",
        image: "/eng-course.svg",
        label: t("KURSUS BAHASA INGGRIS", "ENGLISH COURSE"),
      },
      {
        id: "visa-apply",
        image: "/visa-landing.svg",
        label: t("PENGAJUAN VISA", "VISA APPLICATION"),
      },
      {
        id: "accommodation",
        image: "/accom-landing.svg",
        label: t("AKOMODASI", "ACCOMMODATION"),
      },
    ],
  };

  const testimonials = {
    title: t("Apa Kata Mereka", "What They Say"),
  };

  /* ===== Testimonials (GET) ===== */
  const testiKey = useMemo(
    () => `/api/testimonials?locale=${locale}&fallback=id&limit=12`,
    [locale]
  );
  const {
    data: testiJson,
    error: testiErr,
    isLoading: testiLoading,
    isValidating: testiValidating,
  } = useSWR(testiKey, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  });

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
      photoUrl: pickPublicImage(t),
      star: toNumber(t?.star),
      youtubeUrl: t?.youtube_url ?? t?.youtubeUrl ?? null,
      campusCountry: t?.kampus_negara_tujuan ?? t?.campusCountry ?? "",
    }));
  }, [testiJson]);

  /* ===== Consultants (GET) public ===== */
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
  } = useSWR(consultantsReqKey, publicFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
    fallbackData: { data: [] },
    shouldRetryOnError: false,
  });

  const consultantsItems = useMemo(() => {
    const list = Array.isArray(consultantsJson?.data)
      ? consultantsJson.data
      : [];
    return list.map((c, i) => ({
      id: c?.id ?? c?._id ?? `consultant-${i}`,
      name:
        c?.name ??
        (locale === "en" ? c?.name_en : c?.name_id) ??
        c?.name_id ??
        c?.name_en ??
        "",
      photo: pickPublicImage(c, DEFAULT_AVATAR),
      // description tetap kita simpan sebagai bio (kalau mau dipakai di halaman detail)
      bio:
        c?.description ??
        (locale === "en" ? c?.description_en : c?.description_id) ??
        c?.description_id ??
        c?.description_en ??
        "",
      // 🔽 ROLE yang dipakai di card landing (di bawah nama)
      role: c?.role || c?.title || "",
      slug: c?.slug || null,
    }));
  }, [consultantsJson, locale]);

  const consultants = useMemo(
    () => ({
      title: t(
        "Temukan solusimu bersama ahli kami",
        "Find your solution with our experts"
      ),
      items: consultantsItems,
    }),
    [consultantsItems, locale]
  );

  const faq = {
    title: t("PERTANYAAN YANG SERING DITANYAKAN", "FREQUENTLY ASKED QUESTIONS"),
    illustration: "/dar.svg",
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

  /* ===== Country Partners (static list) ===== */
  const countryPartners = {
    title: t("Negara Partner", "Partner Countries"),
    items: [
      {
        id: "nz",
        name: t("New Zealand", "New Zealand"),
        flag: "/flags/nz.svg",
        cover: "/countries/nz.svg",
      },
      {
        id: "au",
        name: t("Australia", "Australia"),
        flag: "/flags/au.svg",
        cover: "/countries/au.svg",
      },
      {
        id: "ca",
        name: t("Kanada", "Canada"),
        flag: "/flags/ca.svg",
        cover: "/countries/ca.svg",
      },
      {
        id: "nl",
        name: t("Belanda", "Netherlands"),
        flag: "/flags/nl.svg",
        cover: "/countries/nl.svg",
      },
      {
        id: "us",
        name: t("Amerika", "United States"),
        flag: "/flags/us.svg",
        cover: "/countries/us.svg",
      },
      {
        id: "jp",
        name: t("Jepang", "Japan"),
        flag: "/flags/jp.svg",
        cover: "/countries/jp.svg",
      },
      {
        id: "tw",
        name: t("Taiwan", "Taiwan"),
        flag: "/flags/tw.svg",
        cover: "/countries/tw.svg",
      },
      {
        id: "fr",
        name: t("Prancis", "France"),
        flag: "/flags/fr.svg",
        cover: "/countries/fr.svg",
      },
      {
        id: "de",
        name: t("Jerman", "Germany"),
        flag: "/flags/de.svg",
        cover: "/countries/de.svg",
      },
      {
        id: "gb",
        name: t("Inggris", "United Kingdom"),
        flag: "/flags/gb.svg",
        cover: "/countries/gb.svg",
      },
      {
        id: "pl",
        name: t("Polandia", "Poland"),
        flag: "/flags/pl.svg",
        cover: "/countries/pl.svg",
      },
      {
        id: "it",
        name: t("Italia", "Italy"),
        flag: "/flags/it.svg",
        cover: "/countries/it.svg",
      },
      {
        id: "kr",
        name: t("Korea", "Korea"),
        flag: "/flags/kr.svg",
        cover: "/countries/kr.svg",
      },
      {
        id: "ch",
        name: t("Swiss", "Switzerland"),
        flag: "/flags/ch.svg",
        cover: "/countries/ch.svg",
      },
      {
        id: "cn",
        name: t("China", "China"),
        flag: "/flags/cn.svg",
        cover: "/countries/cn.svg",
      },
      {
        id: "sg",
        name: t("Singapura", "Singapore"),
        flag: "/flags/sg.svg",
        cover: "/countries/sg.svg",
      },
      {
        id: "my",
        name: t("Malaysia", "Malaysia"),
        flag: "/flags/my.svg",
        cover: "/countries/my.svg",
      },
    ],
  };

  return {
    hero,
    education,
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
