// app/(view)/user/(panel)/overseas/page.jsx
import { Suspense } from "react";
import OverseasContent from "./OverseasContent";
import Loading from "@/app/components/loading/LoadingImage";
import { buildUserMetadata, pickLocale } from "@/app/seo/userMetadata";

// Dynamic metadata untuk halaman Program Luar Negeri
export async function generateMetadata({ searchParams }) {
  const locale = pickLocale(searchParams?.lang);

  // Versi Indonesia
  let titleId =
    "Program Luar Negeri OSS Bali – Kuliah dan Karier Internasional";
  let descId =
    "Pelajari layanan pendampingan studi luar negeri OSS Bali: konsultasi kampus, beasiswa, dan rute cerdas menuju kuliah dan karier internasional.";

  // Versi English
  let titleEn =
    "OSS Bali Overseas Programs – Study Abroad and Global Career Path";
  let descEn =
    "Learn about OSS Bali overseas study services: university guidance, scholarships, and smart routes to international study and career opportunities.";

  const title = locale === "en" ? titleEn : titleId;
  const description = locale === "en" ? descEn : descId;

  return buildUserMetadata({
    title,
    description,
    // sesuaikan jika path berbeda
    path: "/user/overseas",
    locale,
    type: "website",
  });
}

// Server component yang membungkus OverseasContent (client)
export default function OverseasPage({ searchParams }) {
  const locale = pickLocale(searchParams?.lang);

  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      {/* initialLocale dipakai di client untuk sinkronisasi bahasa */}
      <OverseasContent initialLocale={locale} />
    </Suspense>
  );
}
