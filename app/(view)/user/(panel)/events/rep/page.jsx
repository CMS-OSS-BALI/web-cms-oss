// app/(view)/user/(panel)/events/rep/page.jsx
import { Suspense } from "react";
import EventsRContent from "./EventsRContent";
import Loading from "@/app/components/loading/LoadingImage";
import { buildUserMetadata, pickLocale } from "@/app/seo/userMetadata";

// Dynamic metadata untuk halaman detail Representative Event
export async function generateMetadata({ searchParams }) {
  const locale = pickLocale(searchParams?.lang);
  const hasId = !!(searchParams?.id || "");

  let titleId =
    "Event OSS Bali untuk Representative – Detail Booth & Kemitraan";
  let descId =
    "Lihat detail event OSS Bali untuk representative, termasuk informasi booth, lokasi, dan benefit kerja sama dengan sekolah dan universitas.";
  let titleEn =
    "OSS Bali Events for Representatives – Booth & Partnership Details";
  let descEn =
    "View detailed information about OSS Bali representative events, including booth info, venue, and partnership benefits with schools and universities.";

  // Jika tidak ada id → fallback ke copy generic untuk halaman rep
  if (!hasId) {
    titleId =
      "Event OSS Bali untuk Representative – Booth, School Visit, dan Kemitraan";
    descId =
      "Informasi event OSS Bali untuk representative, sekolah, dan universitas. Booking booth, kunjungan sekolah, dan peluang kolaborasi.";
    titleEn =
      "OSS Bali Events for Representatives – Booths, School Visits, and Partnerships";
    descEn =
      "Event information for OSS Bali representatives, schools, and universities. Book booths, arrange school visits, and explore collaboration opportunities.";
  }

  const title = locale === "en" ? titleEn : titleId;
  const description = locale === "en" ? descEn : descId;

  return buildUserMetadata({
    title,
    description,
    path: "/user/events/rep",
    locale,
    type: "website",
  });
}

// Server component yang membungkus EventsRContent (client)
export default function RepPage({ searchParams }) {
  // Single source of truth untuk initial locale di level server
  const initialLocale = pickLocale(searchParams?.lang);

  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      {/* initialLocale → nanti di-refine di client berdasarkan ?lang + localStorage */}
      <EventsRContent initialLocale={initialLocale} />
    </Suspense>
  );
}
