// app/(view)/user/form-mitra/page.jsx
import { Suspense } from "react";
import FormMitraContent from "./FormMitraContent";
import Loading from "@/app/components/loading/LoadingImage";
import { buildUserMetadata, pickLocale } from "@/app/seo/userMetadata";

// Dynamic metadata untuk Form Mitra
export async function generateMetadata({ searchParams }) {
  const locale = pickLocale(searchParams?.lang);

  // Copywriting SEO (ID & EN)
  let titleId = "Form Kerja Sama Mitra OSS Bali – Daftar Menjadi Partner Resmi";
  let descId =
    "Isi formulir kerja sama mitra OSS Bali untuk menjalin kolaborasi dalam program edukasi, event, dan layanan bagi pelajar Indonesia yang ingin studi ke luar negeri.";

  let titleEn = "OSS Bali Partnership Form – Become an Official Partner";
  let descEn =
    "Submit the OSS Bali partnership form to collaborate on education programs, events, and services for Indonesian students planning to study abroad.";

  const title = locale === "en" ? titleEn : titleId;
  const description = locale === "en" ? descEn : descId;

  return buildUserMetadata({
    title,
    description,
    path: "/user/form-mitra", // sesuaikan kalau route-nya beda
    locale,
    type: "website",
  });
}

// Server component → bungkus FormMitraContent (client)
export default function FormMitraPage({ searchParams }) {
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
      <FormMitraContent initialLocale={initialLocale} />
    </Suspense>
  );
}
