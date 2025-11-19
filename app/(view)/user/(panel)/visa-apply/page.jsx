// app/(view)/user/services/visa/page.jsx
import { Suspense } from "react";
import Loading from "@/app/components/loading/LoadingImage";
import VisaContent from "./VisaContent";
import { buildUserMetadata, pickLocale } from "@/app/seo/userMetadata";

// Dynamic metadata untuk halaman Layanan Visa
export async function generateMetadata({ searchParams }) {
  const locale = pickLocale(searchParams?.lang);

  let titleId =
    "Layanan Visa & Izin Tinggal OSS Bali – Konsultasi dan Pengurusan Dokumen";
  let descId =
    "Dapatkan pendampingan lengkap pengajuan visa pelajar, izin tinggal, dan dokumen studi luar negeri bersama tim OSS Bali. Mulai dari konsultasi hingga proses apply visa.";
  let titleEn =
    "OSS Bali Visa Application Services – Study Visa & Residence Permit Support";
  let descEn =
    "Get end-to-end support for student visas, residence permits, and study abroad documents with OSS Bali. From consultation to submitting your visa application.";

  const title = locale === "en" ? titleEn : titleId;
  const description = locale === "en" ? descEn : descId;

  return buildUserMetadata({
    title,
    description,
    // SESUAIKAN kalau rute beda
    path: "/user/services/visa",
    locale,
    type: "website",
  });
}

// Server component, membungkus VisaContent (client)
export default function VisaPage({ searchParams }) {
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
      <VisaContent initialLocale={locale} />
    </Suspense>
  );
}
