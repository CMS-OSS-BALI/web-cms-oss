// app/(view)/user/(panel)/aboutus/page.jsx
import { Suspense } from "react";
import AboutUsContent from "./AboutUsContent";
import Loading from "@/app/components/loading/LoadingImage";
import { buildUserMetadata, pickLocale } from "@/app/seo/userMetadata";

// Dynamic metadata untuk About Us
export async function generateMetadata({ searchParams }) {
  const locale = pickLocale(searchParams?.lang);

  const title =
    locale === "en"
      ? "About OSS Bali"
      : "Tentang OSS Bali – Partner Studi Luar Negeri";

  const description =
    locale === "en"
      ? "Learn more about OSS Bali, our story, mission, and how we support international study and career journeys."
      : "Kenali lebih dekat OSS Bali, cerita, visi misi, dan peran kami dalam mendampingi perjalanan studi dan karier internasional.";

  return buildUserMetadata({
    title,
    description,
    path: "/user/aboutus", // sesuaikan kalau rutenya beda
    locale,
    type: "website",
  });
}

// Server component, membungkus AboutUsContent (client)
export default function AboutUsPage({ searchParams }) {
  const locale = pickLocale(searchParams?.lang);

  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      {/* initialLocale dipakai AboutUsContent untuk hit API + toggle bahasa */}
      <AboutUsContent initialLocale={locale} />
    </Suspense>
  );
}
