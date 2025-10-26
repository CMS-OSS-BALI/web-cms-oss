// app/(view)/user/(panel)/PanelLayout.jsx  (Server Component)
import { cookies, headers } from "next/headers";
import Header from "../header/header-user"; // pastikan path benar
import Footer from "../footer/footer-user"; // pastikan path benar

function pickLocale(source) {
  const s = String(source || "id")
    .trim()
    .toLowerCase();
  return s.startsWith("en") ? "en" : "id";
}

export default function PanelLayout({ children, searchParams }) {
  // 1) param lang dari URL (jika layout ini menerima searchParams)
  const spLang = searchParams?.lang;

  // 2) fallback ke cookie
  const cookieLang = cookies().get("oss.lang")?.value;

  // 3) fallback ke Accept-Language header
  const accept = headers().get("accept-language") || "";
  // contoh: "en-US,en;q=0.9" → ambil "en"
  const acceptLang = accept.split(",")?.[0]?.split("-")?.[0];

  // 4) pilih final
  const initialLang = pickLocale(spLang || cookieLang || acceptLang);

  return (
    <div className="user-shell">
      {/* Header & Footer (client) terima initialLang dari server → no hydration mismatch */}
      <Header initialLang={initialLang} />

      <main className="user-main">
        <div className="user-content">{children}</div>
      </main>

      <Footer initialLang={initialLang} />
    </div>
  );
}
