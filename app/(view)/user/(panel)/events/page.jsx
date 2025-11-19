// app/(view)/user/(panel)/events/page.jsx
import { Suspense } from "react";
import EventsUContent from "./EventsUContent";
import Loading from "@/app/components/loading/LoadingImage";
import { buildUserMetadata, pickLocale } from "@/app/seo/userMetadata";

// Dynamic metadata untuk halaman Event
export async function generateMetadata({ searchParams }) {
  const locale = pickLocale(searchParams?.lang);

  const rawTab = (searchParams?.tab || "").toString().toLowerCase();
  const tab =
    rawTab === "peserta" || rawTab === "rep" || rawTab === "all"
      ? rawTab
      : "all";

  let titleId =
    "Event & Kegiatan OSS Bali – Info Acara, Seminar, dan Pendaftaran";
  let descId =
    "Temukan dan daftar berbagai event, seminar, dan kegiatan OSS Bali untuk pelajar dan mahasiswa. Lihat jadwal event terbaru dan cara pendaftarannya.";
  let titleEn =
    "OSS Bali Events – Programs, Seminars, and Registration Information";
  let descEn =
    "Discover and register for OSS Bali events, seminars, and programs for students and young professionals. See the latest schedules and how to join.";

  if (tab === "peserta") {
    titleId = "Event OSS Bali untuk Peserta – Daftar Tiket dan Program Terbaru";
    descId =
      "Jelajahi event OSS Bali yang bisa diikuti sebagai peserta. Lihat detail acara, harga tiket, dan cara pendaftaran secara online.";
    titleEn = "OSS Bali Events for Participants – Tickets and Latest Programs";
    descEn =
      "Explore OSS Bali events you can join as a participant. View event details, ticket prices, and online registration steps.";
  } else if (tab === "rep") {
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
    // SESUAIKAN kalau rute beda
    path: "/user/events",
    locale,
    type: "website",
  });
}

// Server component, membungkus EventsUContent (client)
export default function EventsPage({ searchParams }) {
  const locale = pickLocale(searchParams?.lang);

  const rawTab = (searchParams?.tab || "").toString().toLowerCase();
  const initialTab =
    rawTab === "peserta" || rawTab === "rep" || rawTab === "all"
      ? rawTab
      : "all";

  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      {/* initialLocale & initialTab dipakai di client
          buat sinkronisasi bahasa dan tab (all/peserta/rep) */}
      <EventsUContent initialLocale={locale} initialTab={initialTab} />
    </Suspense>
  );
}
