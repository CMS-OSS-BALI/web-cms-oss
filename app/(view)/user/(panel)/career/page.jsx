// app/(view)/user/(panel)/career/page.jsx  (sesuaikan dengan strukturmu)
import { Suspense } from "react";
import Loading from "@/app/components/loading/LoadingImage";
import CareerContent from "./CareerContent";
import { buildUserMetadata, pickLocale } from "@/app/seo/userMetadata";

// Dynamic metadata untuk Career page
export async function generateMetadata({ searchParams }) {
  const locale = pickLocale(searchParams?.lang);

  const title =
    locale === "en"
      ? "Career & Referral Program – OSS Bali"
      : "Karier & Program Sahabat Referral – OSS Bali";

  const description =
    locale === "en"
      ? "Explore career opportunities and the Sahabat Referral program with OSS Bali. Join our team or become a referral partner and earn rewards."
      : "Jelajahi peluang karier dan Program Sahabat Referral bersama OSS Bali. Bergabung dengan tim kami atau jadi mitra referral dan dapatkan berbagai benefit.";

  return buildUserMetadata({
    title,
    description,
    // SESUAIKAN dengan route sebenarnya kalau beda
    path: "/career",
    locale,
    type: "website",
  });
}

// Server component, membungkus CareerContent (client)
export default function CareerPage({ searchParams }) {
  const locale = pickLocale(searchParams?.lang);

  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      {/* initialLocale dipakai CareerContent untuk sinkron ?lang + localStorage */}
      <CareerContent initialLocale={locale} />
    </Suspense>
  );
}
