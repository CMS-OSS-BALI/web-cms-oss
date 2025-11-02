import "./globals.css";
import LayoutClient from "./layout-client";
import { Inter } from "next/font/google";
import PageviewTracker from "@/app/components/analytics/PageviewTracker";
import { BASE_URL, SITE } from "./seo.config";
import { headers, cookies } from "next/headers";

const inter = Inter({ subsets: ["latin"] });

/** Detect initial lang on the server (cookie → Accept-Language → fallback) */
function pickInitialLang() {
  const cookieLang = cookies().get("oss.lang")?.value;
  if (cookieLang === "en" || cookieLang === "id") return cookieLang;

  const accept = headers().get("accept-language") || "";
  const primary = accept.split(",")[0]?.trim().toLowerCase() || "id";
  return primary.startsWith("en") ? "en" : "id";
}

/** Default, each page can override via generateMetadata */
export const metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: `${SITE.name} - One Step Solution Bali`,
    template: `%s — ${SITE.name}`,
  },
  description:
    "Platform layanan OSS Bali: program, layanan, event, dan informasi terbaru.",
  robots: { index: true, follow: true },
  alternates: {
    canonical: BASE_URL, // ID as default language without ?lang
    languages: {
      "id-ID": BASE_URL,
      "en-US": `${BASE_URL}?lang=en`,
      "x-default": BASE_URL,
    },
  },
  openGraph: {
    title: SITE.name,
    description:
      "Platform layanan OSS Bali: program, layanan, event, dan informasi terbaru.",
    url: BASE_URL,
    siteName: SITE.name,
    type: "website",
    locale: "id_ID",
    alternateLocale: ["en_US"],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.name,
    description:
      "Platform layanan OSS Bali: program, layanan, event, dan informasi terbaru.",
  },
};

export default function RootLayout({ children }) {
  const initialLang = pickInitialLang(); // ← server-picked

  return (
    <html lang={initialLang}>
      <body className={inter.className}>
        {/* Tracker kunjungan anonim; set true untuk skip halaman admin */}
        <PageviewTracker ignoreAdmin={true} />
        {/* (opsional) kirim initialLang ke client jika diperlukan */}
        <LayoutClient initialLang={initialLang}>{children}</LayoutClient>
      </body>
    </html>
  );
}
