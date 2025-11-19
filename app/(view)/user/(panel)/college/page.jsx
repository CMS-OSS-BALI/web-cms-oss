// app/(view)/user/college/page.jsx
import { Suspense } from "react";
import CollegeContent from "./CollegeContent";
import Loading from "@/app/components/loading/LoadingImage";
import { buildUserMetadata, pickLocale } from "@/app/seo/userMetadata";

// Dynamic metadata untuk daftar kampus
export async function generateMetadata({ searchParams }) {
  const locale = pickLocale(searchParams?.lang);
  const q = searchParams?.q || "";
  const country = searchParams?.country || "";

  let title =
    locale === "en"
      ? "Partner Colleges and Universities – OSS Bali"
      : "Daftar Kampus dan Universitas Mitra – OSS Bali";

  let description =
    locale === "en"
      ? "Explore international universities and colleges partnered with OSS Bali. Find study destinations that match your goals."
      : "Jelajahi universitas dan kampus mitra OSS Bali di berbagai negara. Temukan tujuan studi yang sesuai dengan impianmu.";

  // Filter berdasarkan negara
  if (country) {
    title =
      locale === "en"
        ? `Universities in ${country} – OSS Bali`
        : `Kampus di ${country} – OSS Bali`;
    description =
      locale === "en"
        ? `Explore partner universities located in ${country} and find the right campus for you.`
        : `Jelajahi universitas mitra OSS Bali yang berlokasi di ${country} dan temukan kampus yang tepat untukmu.`;
  }

  // Pencarian
  if (q) {
    description =
      locale === "en"
        ? `Search results for “${q}” on OSS Bali partner colleges and universities page.`
        : `Hasil pencarian untuk “${q}” pada halaman daftar kampus dan universitas mitra OSS Bali.`;
  }

  return buildUserMetadata({
    title,
    description,
    path: "/user/college",
    locale,
    type: "website",
    image: "/og/college.png",
  });
}

// Server component membungkus client CollegeContent
export default function CollegePage({ searchParams }) {
  const locale = pickLocale(searchParams?.lang);
  const q = searchParams?.q || "";
  const country = searchParams?.country || "";

  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      <CollegeContent
        locale={locale}
        initialQuery={q}
        initialCountry={country}
      />
    </Suspense>
  );
}
