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
