// app/(view)/user/(panel)/events/form-ticket/page.jsx
import { Suspense } from "react";
import FormTicketContent from "./FormTicketContent";
import Loading from "@/app/components/loading/LoadingImage";
import { buildUserMetadata, pickLocale } from "@/app/seo/userMetadata";

// Dynamic metadata untuk halaman Form Ticket
export async function generateMetadata({ searchParams }) {
  const locale = pickLocale(searchParams?.lang);
  const hasEventId = !!searchParams?.id;

  // === Copywriting SEO (ID & EN) ===
  let titleId = hasEventId
    ? "Ambil Tiket Event OSS Bali – Form Pendaftaran Peserta"
    : "Form Tiket Event OSS Bali – Pendaftaran Tiket Peserta";

  let descId = hasEventId
    ? "Isi form tiket ini untuk mengamankan kursi di event OSS Bali pilihanmu. Pastikan data diri benar agar e-ticket dan QR Code terkirim ke email dengan lancar."
    : "Daftar event OSS Bali sebagai peserta melalui form tiket resmi. Lengkapi data diri untuk mendapatkan e-ticket dan QR Code langsung ke email.";

  let titleEn = hasEventId
    ? "Get Your OSS Bali Event Ticket – Participant Registration Form"
    : "OSS Bali Event Ticket Form – Participant Registration";

  let descEn = hasEventId
    ? "Fill in this ticket form to secure your seat at the selected OSS Bali event. Make sure your details are correct so we can send the e-ticket and QR code to your email."
    : "Register as a participant for OSS Bali events using this official ticket form. Complete your details to receive your e-ticket and QR code via email.";

  const title = locale === "en" ? titleEn : titleId;
  const description = locale === "en" ? descEn : descId;

  return buildUserMetadata({
    title,
    description,
    // canonical: tanpa query, biar bersih
    path: "/user/events/form-ticket",
    locale,
    type: "website",
  });
}

// Server component wrapper — kirim locale & eventId ke client component
export default function FormTicketPage({ searchParams }) {
  const locale = pickLocale(searchParams?.lang);
  const eventId = searchParams?.id ? String(searchParams.id) : "";

  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      {/* key diisi locale supaya remount saat ?lang berubah */}
      <FormTicketContent key={locale} locale={locale} eventId={eventId} />
    </Suspense>
  );
}
