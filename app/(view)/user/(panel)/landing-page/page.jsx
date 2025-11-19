// app/(view)/user/landing/page.jsx
import { Suspense } from "react";
import LandingContent from "./LandingContent";
import Loading from "@/app/components/loading/LoadingImage";
import { buildUserMetadata, pickLocale } from "@/app/seo/userMetadata";

// Dynamic metadata untuk landing
export async function generateMetadata({ searchParams }) {
  const locale = pickLocale(searchParams?.lang);

  const title =
    locale === "en"
      ? "Study abroad consultation and services"
      : "Konsultan studi luar negeri dan layanan pendukung";

  const description =
    locale === "en"
      ? "Discover programs, events, and services that support your international study and career journey with OSS Bali."
      : "Temukan program, event, dan layanan yang mendukung perjalanan studi dan karier internasionalmu bersama OSS Bali.";

  // OG image khusus landing (sesuaikan path-nya)
  const ogImagePath =
    locale === "en" ? "/og/landing-en.png" : "/og/landing-id.png";

  return buildUserMetadata({
    title,
    description,
    path: "/", // atau path sebenarnya kalau ini bukan root
    locale,
    image: ogImagePath,
    type: "website",
  });
}

// Server component, tapi membungkus LandingContent (client)
export default function LandingPage({ searchParams }) {
  const locale = pickLocale(searchParams?.lang);

  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      <LandingContent locale={locale} />
    </Suspense>
  );
}
