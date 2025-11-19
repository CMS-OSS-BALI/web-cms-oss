// app/(view)/user/(panel)/calculator/page.jsx (sesuaikan path)
import { Suspense } from "react";
import CalculatorContent from "./CalculatorContent";
import Loading from "@/app/components/loading/LoadingImage";
import { buildUserMetadata, pickLocale } from "@/app/seo/userMetadata";

// Metadata dinamis untuk Price Calculator
export async function generateMetadata({ searchParams }) {
  const locale = pickLocale(searchParams?.lang);

  const title =
    locale === "en"
      ? "Study Cost Price Calculator – OSS Bali"
      : "Kalkulator Estimasi Biaya Studi – OSS Bali";

  const description =
    locale === "en"
      ? "Estimate your study and living costs with OSS Bali's price calculator for tuition, service fees, insurance, visa, and add-ons."
      : "Hitung estimasi biaya studi dan kebutuhan lain (tuition, service fee, asuransi, visa, dan add-ons) dengan kalkulator biaya OSS Bali.";

  return buildUserMetadata({
    title,
    description,
    // SESUAIKAN dengan rute sebenarnya
    path: "/user/tools/price-calculator",
    locale,
    type: "website",
  });
}

export default function CalculatorPage({ searchParams }) {
  const locale = pickLocale(searchParams?.lang);

  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      {/* initialLocale dipakai client component untuk nentuin locale awal */}
      <CalculatorContent initialLocale={locale} />
    </Suspense>
  );
}
