// app/(view)/user/(panel)/events/peserta/page.jsx
import { Suspense } from "react";
import EventsPContent from "./EventsPContent";
import Loading from "@/app/components/loading/LoadingImage";
import { buildUserMetadata, pickLocale } from "@/app/seo/userMetadata";

// Dynamic metadata untuk halaman detail Event Peserta
export async function generateMetadata({ searchParams }) {
  const locale = pickLocale(searchParams?.lang);
  const hasId = !!(searchParams?.id || "");

  let titleId = "Event OSS Bali untuk Peserta – Detail Event & Tiket";
  let descId =
    "Lihat detail event OSS Bali untuk peserta, termasuk informasi acara, jadwal, dan harga tiket.";
  let titleEn = "OSS Bali Events for Participants – Event & Ticket Details";
  let descEn =
    "View detailed information about OSS Bali events for participants, including schedule and ticket information.";

  // Jika tidak ada id → fallback ke copy generic untuk halaman peserta
  if (!hasId) {
    titleId = "Event OSS Bali untuk Peserta – Daftar Tiket dan Program Terbaru";
    descId =
      "Jelajahi event OSS Bali yang bisa diikuti sebagai peserta. Lihat detail acara, harga tiket, dan cara pendaftaran secara online.";
    titleEn = "OSS Bali Events for Participants – Tickets and Latest Programs";
    descEn =
      "Explore OSS Bali events you can join as a participant. View event details, ticket prices, and online registration steps.";
  }

  const title = locale === "en" ? titleEn : titleId;
  const description = locale === "en" ? descEn : descId;

  return buildUserMetadata({
    title,
    description,
    path: "/user/events/peserta",
    locale,
    type: "website",
  });
}

// Server component, membungkus EventsPContent (client)
export default function EventsPesertaPage({ searchParams }) {
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
      <EventsPContent initialLocale={initialLocale} />
    </Suspense>
  );
}
