// app/(view)/user/mitra-dalam-negeri/page.jsx
import { Suspense } from "react";
import MitraDalamNegeriContent from "./MitraDalamNegeriContent";
import Loading from "@/app/components/loading/LoadingImage";
import { buildUserMetadata, pickLocale } from "@/app/seo/userMetadata";

// Dynamic metadata untuk halaman Mitra Dalam Negeri
export async function generateMetadata({ searchParams }) {
  const locale = pickLocale(searchParams?.lang);

  let titleId =
    "Mitra Dalam Negeri OSS Bali – Sekolah, Komunitas, dan Organisasi Partner";
  let descId =
    "Lihat daftar mitra dalam negeri OSS Bali yang terdiri dari sekolah, komunitas, dan organisasi di Indonesia yang berkolaborasi mendukung perjalanan studi dan karier internasional.";

  let titleEn =
    "OSS Bali Domestic Partners – Schools, Communities, and Local Organizations";
  let descEn =
    "Explore OSS Bali domestic partners including schools, communities, and organizations in Indonesia that support international study and career journeys.";

  const title = locale === "en" ? titleEn : titleId;
  const description = locale === "en" ? descEn : descId;

  return buildUserMetadata({
    title,
    description,
    // SESUAIKAN path dengan route halaman ini
    path: "/user/mitra-dalam-negeri",
    locale,
    type: "website",
  });
}

// Server component, membungkus client content
export default function MitraDalamNegeriPage({ searchParams }) {
  const locale = pickLocale(searchParams?.lang);

  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      {/* initialLocale dipakai di client untuk seed bahasa, 
          lalu disinkronkan lagi dengan ?lang & localStorage */}
      <MitraDalamNegeriContent initialLocale={locale} />
    </Suspense>
  );
}
