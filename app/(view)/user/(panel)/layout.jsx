// app/(view)/user/(panel)/PanelLayout.jsx
import { cookies, headers } from "next/headers";
import Header from "../header/header-user";
import Footer from "../footer/footer-user";
import { LangProvider } from "./lang-context"; // ⟵ file client di bawah

function pickLocale(source) {
  const s = String(source || "id")
    .trim()
    .toLowerCase();
  return s.startsWith("en") ? "en" : "id";
}

/** Alternates & html lang via metadata */
export function generateMetadata({ searchParams }) {
  const lang = pickLocale(searchParams?.lang);

  // Ambil info request + pathname aktual
  const h = headers();
  const pathname = h.get("x-pathname") || "/"; // fallback kalau header belum ada
  const host = h.get("x-forwarded-host") || h.get("host") || "example.com";
  const protocol = h.get("x-forwarded-proto") || "https";
  const origin = `${protocol}://${host}`;

  // Helper untuk bikin URL absolut per bahasa
  const makeUrl = (langValue) => {
    const url = new URL(pathname, origin);
    if (langValue) {
      url.searchParams.set("lang", langValue);
    } else {
      url.searchParams.delete("lang");
    }
    return url.toString();
  };

  const canonicalUrl = makeUrl(lang); // versi bahasa aktif
  const defaultUrl = makeUrl(null); // x-default tanpa ?lang=
  const enUrl = makeUrl("en"); // versi Inggris
  const idUrl = makeUrl("id"); // versi Indonesia

  return {
    alternates: {
      canonical: canonicalUrl,
      languages: {
        "x-default": defaultUrl,
        en: enUrl,
        id: idUrl,
      },
    },
  };
}

export default function PanelLayout({ children, searchParams }) {
  // 1) URL ?lang=
  const spLang = searchParams?.lang;

  // 2) Cookie
  const cookieLang = cookies().get("oss.lang")?.value;

  // 3) Accept-Language
  const accept = headers().get("accept-language") || "";
  const acceptLang = accept.split(",")?.[0]?.split("-")?.[0];

  // 4) Bahasa final (SSR)
  const initialLang = pickLocale(spLang || cookieLang || acceptLang);

  return (
    <LangProvider initialLang={initialLang}>
      <Header initialLang={initialLang} />
      <main className="user-main" lang={initialLang} data-lang={initialLang}>
        <div className="user-content">{children}</div>
      </main>
      <Footer initialLang={initialLang} />
    </LangProvider>
  );
}
