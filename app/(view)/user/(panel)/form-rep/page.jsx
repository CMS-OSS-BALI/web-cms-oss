// app/(view)/user/form-rep/page.jsx  (SESUAIKAN PATH DENGAN STRUKTURMU)
import { Suspense } from "react";
import FormRepContent from "./FormRepContent";
import Loading from "@/app/components/loading/LoadingImage";
import { buildUserMetadata, pickLocale } from "@/app/seo/userMetadata";

// Dynamic metadata untuk halaman Form Booking Booth Representative
export async function generateMetadata({ searchParams }) {
  const locale = pickLocale(searchParams?.lang);

  let titleId = "Form Booking Booth Representative – Event OSS Bali";
  let descId =
    "Isi formulir booking booth representative untuk mengikuti event OSS Bali sebagai perwakilan kampus, sekolah, atau institusi pendidikan. Lengkapi data dan selesaikan pembayaran secara online.";

  let titleEn = "Booth Booking Form for Representatives – OSS Bali Events";
  let descEn =
    "Complete the booth booking form to join OSS Bali events as a representative of your campus, school, or education institution. Fill in your details and finish payment online.";

  const title = locale === "en" ? titleEn : titleId;
  const description = locale === "en" ? descEn : descId;

  return buildUserMetadata({
    title,
    description,
    // SESUAIKAN jika route-nya beda
    path: "/user/form-rep",
    locale,
    type: "website",
  });
}

// Server component → bungkus FormRepContent (client)
export default function FormRepPage({ searchParams }) {
  const initialLocale = pickLocale(searchParams?.lang);

  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      {/* initialLocale dikirim ke client; client akan merge dengan ?lang + localStorage */}
      <FormRepContent initialLocale={initialLocale} />
    </Suspense>
  );
}
