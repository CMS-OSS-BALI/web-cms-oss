// app/(view)/user/(panel)/document-translate/page.jsx
import { Suspense } from "react";
import DocumentTranslateContent from "./DocumentTranslateContent";
import Loading from "@/app/components/loading/LoadingImage";
import { buildUserMetadata, pickLocale } from "@/app/seo/userMetadata";

// Dynamic metadata untuk halaman Penerjemahan Dokumen
export async function generateMetadata({ searchParams }) {
  const locale = pickLocale(searchParams?.lang);

  const title =
    locale === "en"
      ? "Official Document Translation – OSS Bali"
      : "Penerjemahan Dokumen Resmi – OSS Bali";

  const description =
    locale === "en"
      ? "Translate academic and official documents such as transcripts, diplomas, certificates, and more with professional translators at OSS Bali."
      : "Layanan penerjemahan dokumen akademik dan resmi seperti transkrip, ijazah, sertifikat, dan lainnya bersama penerjemah profesional di OSS Bali.";

  return buildUserMetadata({
    title,
    description,
    // SESUAIKAN bila rutenya berbeda
    path: "/user/services/document-translate",
    locale,
    type: "website",
  });
}

// Server component, membungkus DocumentTranslateContent (client)
export default function DocumentTranslatePage({ searchParams }) {
  const locale = pickLocale(searchParams?.lang);

  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      {/* initialLocale dipakai DocumentTranslateContent
          untuk hit API + sinkron toggle bahasa */}
      <DocumentTranslateContent initialLocale={locale} />
    </Suspense>
  );
}
