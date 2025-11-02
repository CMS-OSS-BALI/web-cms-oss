// app/page.jsx
import PanelLayout from "./(view)/user/(panel)/layout";
import LandingPage from "./(view)/user/(panel)/landing-page/page";
import { buildMetadata, SITE } from "./seo.config";

// Landing mostly statis → pakai SSG + revalidate periodik
export const dynamic = "force-static";
export const revalidate = 600; // 10 menit

export async function generateMetadata() {
  return buildMetadata({
    title: `${SITE.name} - One Step Solution Bali`,
    description:
      "Selamat datang di OSS Bali. Temukan layanan, program, dan event terbaru.",
    path: "/",
    image: "/images/og-landing.jpg", // pastikan tersedia di /public/images
    locale: "id-ID",
    localeAlt: "en", // jika punya versi bahasa Inggris
  });
}

export default function Home() {
  return (
    <PanelLayout>
      <LandingPage />
    </PanelLayout>
  );
}
