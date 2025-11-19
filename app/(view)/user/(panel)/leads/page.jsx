// app/(view)/user/(panel)/leads/page.jsx
import { Suspense } from "react";
import Loading from "@/app/components/loading/LoadingImage";
import LeadsUPage from "./LeadsUPage";
import { buildUserMetadata, pickLocale } from "@/app/seo/userMetadata";

// Dynamic metadata untuk halaman Leads
export async function generateMetadata({ searchParams }) {
  const locale = pickLocale(searchParams?.lang);

  const titleId =
    "Form Leads OSS Bali – Daftar Minat dan Konsultasi Studi Luar Negeri";
  const descId =
    "Isi Form Leads OSS Bali untuk mendaftarkan minat kuliah luar negeri, konsultasi pendidikan, dan mendapatkan informasi program OSS Bali. Tim kami akan menghubungi Anda melalui WhatsApp atau email.";

  const titleEn =
    "OSS Bali Leads Form – Study Abroad Interest and Consultation";
  const descEn =
    "Fill in the OSS Bali Leads Form to register your study abroad interest, book an education consultation, and get information about OSS Bali programs. Our team will contact you via WhatsApp or email.";

  const title = locale === "en" ? titleEn : titleId;
  const description = locale === "en" ? descEn : descId;

  return buildUserMetadata({
    title,
    description,
    path: "/user/leads",
    locale,
    type: "website",
  });
}

// Server component → bungkus client wrapper
export default function LeadsPage({ searchParams }) {
  const locale = pickLocale(searchParams?.lang);

  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      {/* initialLocale dipakai di client untuk sinkron lang (SSR + client) */}
      <LeadsUPage initialLocale={locale} />
    </Suspense>
  );
}
