// app/seo.config.js
export const BASE_URL = (
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
).replace(/\/$/, "");

export const DEFAULT_OG = "/images/og-default.jpg"; // ganti ke gambar OG kamu
export const SITE = {
  name: "OSS Bali",
  twitterHandle: "@ossbali", // opsional: ganti jika ada
  localeDefault: "id-ID",
  locales: {
    "id-ID": "",
    "en-US": "?lang=en", // sesuaikan kalau kamu pakai /en atau i18n routes
  },
};

// Buat URL absolut aman
export function absoluteUrl(path = "/") {
  try {
    return new URL(path, BASE_URL).toString();
  } catch {
    return `${BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
  }
}

// Helper pembuat metadata per halaman
export function buildMetadata({
  title,
  description,
  path = "/",
  image = DEFAULT_OG,
  locale = SITE.localeDefault,
  noIndex = false,
  extraLanguages = {}, // untuk override/extend hreflang per halaman
}) {
  const url = absoluteUrl(path);

  // Map hreflang
  const languages = Object.fromEntries(
    Object.entries(SITE.locales).map(([lang, suffix]) => [
      lang,
      absoluteUrl(`${path}${suffix}`),
    ])
  );
  // Allow custom overrides
  Object.assign(languages, extraLanguages);

  return {
    metadataBase: new URL(BASE_URL),
    title: {
      default: title,
      template: `%s — ${SITE.name}`,
    },
    description,
    alternates: {
      canonical: url,
      languages: {
        ...languages,
        "x-default": url,
      },
    },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE.name,
      images: [{ url: image }],
      locale,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
      site: SITE.twitterHandle || undefined,
      creator: SITE.twitterHandle || undefined,
    },
    robots: {
      index: !noIndex,
      follow: !noIndex,
    },
    icons: {
      icon: "/favicon.ico",
      apple: "/apple-touch-icon.png",
    },
  };
}
