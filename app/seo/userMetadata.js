// app/seo/userMetadata.js
import { headers } from "next/headers";

const SITE_NAME = "OSS Bali Overseas Study Services";

const DEFAULT_DESC_ID =
  "OSS Bali membantu kamu merencanakan studi dan karier internasional: konsultasi, event, layanan akomodasi, dan pendampingan dokumen.";
const DEFAULT_DESC_EN =
  "OSS Bali supports your international study and career journey: consulting, events, accommodation, and document assistance.";

// Simple locale picker dari ?lang
export function pickLocale(lang) {
  const v = String(lang || "id")
    .slice(0, 2)
    .toLowerCase();
  return v === "en" ? "en" : "id";
}

// Base URL dari headers (fallback ke NEXT_PUBLIC_SITE_URL kalau mau)
function getBaseUrl() {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const envBase = process.env.NEXT_PUBLIC_SITE_URL;

  if (envBase) return envBase.replace(/\/$/, "");
  if (!host) return "https://oss-bali.com";

  return `${proto}://${host}`;
}

/**
 * buildUserMetadata
 *
 * @param {Object} opts
 * @param {string} opts.title         - Title spesifik per page (tanpa site name)
 * @param {string} opts.description   - Meta description
 * @param {string} opts.path          - Path tanpa query, misal "/blog/my-slug"
 * @param {string} opts.locale        - "id" | "en"
 * @param {string} [opts.image]       - URL OG image spesifik (thumbnail dsb.)
 * @param {string} [opts.type]        - OG type, default "website" / "article"
 */
export function buildUserMetadata({
  title,
  description,
  path = "/",
  locale = "id",
  image,
  type = "website",
}) {
  const baseUrl = getBaseUrl();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const canonical = `${baseUrl}${cleanPath}`;

  const desc =
    description || (locale === "en" ? DEFAULT_DESC_EN : DEFAULT_DESC_ID);
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;

  const images = image ? [image] : [`${baseUrl}/og/oss-default-${locale}.png`]; // sesuaikan dengan aset-mu

  const ogLocale = locale === "en" ? "en_US" : "id_ID";

  return {
    title: fullTitle,
    description: desc,
    alternates: {
      canonical,
      languages: {
        "x-default": canonical,
        "id-ID": `${canonical}?lang=id`,
        "en-US": `${canonical}?lang=en`,
      },
    },
    openGraph: {
      title: fullTitle,
      description: desc,
      url: canonical,
      siteName: SITE_NAME,
      type,
      locale: ogLocale,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: desc,
      images,
    },
  };
}
