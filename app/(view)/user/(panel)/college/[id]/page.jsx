import { Suspense } from "react";
import CollegeDetailContent from "./CollegeDetailContent";
import Loading from "@/app/components/loading/LoadingImage";
import { buildUserMetadata, pickLocale } from "@/app/seo/userMetadata";

// Dynamic metadata untuk detail kampus
export async function generateMetadata({ params, searchParams }) {
  const locale = pickLocale(searchParams?.lang);
  const rawId = Array.isArray(params?.id) ? params.id[0] : params?.id || "";
  const decodedId = decodeURIComponent(rawId);

  const baseTitle =
    locale === "en"
      ? "College Partner Detail – OSS Bali"
      : "Detail Kampus Mitra – OSS Bali";

  const humanName = decodedId ? decodedId.replace(/-/g, " ") : "";

  const title = humanName ? `${humanName} – ${baseTitle}` : baseTitle;

  const description =
    locale === "en"
      ? `Detailed information about ${
          humanName || "a partner college"
        } collaborating with OSS Bali.`
      : `Informasi detail tentang ${
          humanName || "kampus mitra"
        } yang bekerja sama dengan OSS Bali.`;

  return buildUserMetadata({
    title,
    description,
    path: `/user/college/${rawId}`,
    locale,
    type: "website",
    image: "/og/college.png",
  });
}

// Server component membungkus client CollegeDetailContent
export default function CollegeDetailPage({ params, searchParams }) {
  const locale = pickLocale(searchParams?.lang);
  const identifier = Array.isArray(params?.id)
    ? params.id[0]
    : params?.id || "";

  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      {/* key pakai locale supaya ketika ganti bahasa, component remount dan data ikut ganti */}
      <CollegeDetailContent
        key={`${identifier}-${locale}`}
        id={identifier}
        locale={locale}
      />
    </Suspense>
  );
}
