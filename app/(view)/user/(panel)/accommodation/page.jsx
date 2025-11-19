// app/(view)/user/(panel)/accommodation/page.jsx (atau path-mu sekarang)
import { Suspense } from "react";
import AccommodationContent from "./AccommodationContent";
import Loading from "@/app/components/loading/LoadingImage";
import { buildUserMetadata, pickLocale } from "@/app/seo/userMetadata";

// Dynamic metadata untuk halaman Akomodasi
export async function generateMetadata({ searchParams }) {
  const locale = pickLocale(searchParams?.lang);

  const title =
    locale === "en"
      ? "Accommodation Booking – OSS Bali"
      : "Pemesanan Akomodasi – OSS Bali";

  const description =
    locale === "en"
      ? "Find the best housing options to support your international study and career journey, from apartments and student dorms to homestays."
      : "Temukan tempat tinggal terbaik untuk mendukung perjalanan studi dan karier internasional Anda, mulai dari apartemen, asrama mahasiswa, hingga homestay.";

  return buildUserMetadata({
    title,
    description,
    // SESUAIKAN bila rutenya beda
    path: "/user/services/accommodation",
    locale,
    type: "website",
  });
}

// Server component, membungkus AccommodationContent (client)
export default function AccommodationPage({ searchParams }) {
  const locale = pickLocale(searchParams?.lang);

  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      {/* initialLocale dipakai AccommodationContent untuk hit API + toggle bahasa */}
      <AccommodationContent initialLocale={locale} />
    </Suspense>
  );
}
