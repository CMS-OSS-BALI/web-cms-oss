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
  return {
    // Boleh pakai relative URLs — Next akan prefix path segment saat render
    alternates: {
      canonical: `?lang=${lang}`,
      languages: {
        en: `?lang=en`,
        id: `?lang=id`,
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

  // 4) Bahasa final (SSR) — ini yang dipakai untuk first paint
  const initialLang = pickLocale(spLang || cookieLang || acceptLang);

  return (
    // Provider client akan meneruskan lang ke seluruh subtree, tapi first paint sudah benar dari server
    <LangProvider initialLang={initialLang}>
      {/* Header/ Footer client menerima initialLang via props agar tidak baca localStorage di awal */}
      <Header initialLang={initialLang} />

      {/* Set atribut lang di container (html lang idealnya di root layout; ini membantu a11y sementara) */}
      <main className="user-main" lang={initialLang} data-lang={initialLang}>
        <div className="user-content">{children}</div>
      </main>

      <Footer initialLang={initialLang} />
    </LangProvider>
  );
}
