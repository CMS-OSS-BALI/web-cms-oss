// app/(view)/user/(panel)/english-course/page.jsx
import { Suspense } from "react";
import EnglishCContent from "./EnglishCContent";
import Loading from "@/app/components/loading/LoadingImage";
import { buildUserMetadata, pickLocale } from "@/app/seo/userMetadata";

// Dynamic metadata untuk halaman Kursus Bahasa Inggris
export async function generateMetadata({ searchParams }) {
  const locale = pickLocale(searchParams?.lang);

  const title =
    locale === "en"
      ? "English Preparation Course – OSS Bali"
      : "Kursus Bahasa Inggris – OSS Bali";

  const description =
    locale === "en"
      ? "Intensive English program to prepare for TOEFL, IELTS, and academic communication with structured materials and personal guidance."
      : "Program Bahasa Inggris intensif untuk persiapan TOEFL, IELTS, dan komunikasi akademik dengan materi terstruktur dan pendampingan personal.";

  return buildUserMetadata({
    title,
    description,
    // SESUAIKAN bila rute kamu beda
    path: "/user/services/english-course",
    locale,
    type: "website",
  });
}

// Server component, membungkus EnglishCContent (client)
export default function EnglishCoursePage({ searchParams }) {
  const locale = pickLocale(searchParams?.lang);

  const rawType = searchParams?.type || searchParams?.service_type || "";

  const upType = String(rawType || "")
    .trim()
    .toUpperCase();

  const initialServiceType =
    upType === "B2B" || upType === "B2C" ? upType : undefined;

  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      {/* initialLocale & initialServiceType dipakai di client
          buat sinkronisasi bahasa dan jenis layanan */}
      <EnglishCContent
        initialLocale={locale}
        initialServiceType={initialServiceType}
      />
    </Suspense>
  );
}
