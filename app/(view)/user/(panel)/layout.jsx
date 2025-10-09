import Header from "../header/header-user"; // pastikan path-nya benar
import Footer from "../footer/footer-user";

const pickLocale = (v) => {
  const s = String(v || "id")
    .trim()
    .toLowerCase();
  return s.startsWith("en") ? "en" : "id";
};

export default function PanelLayout({ children, searchParams }) {
  // bahasa untuk render pertama (SSR) => hindari mismatch "Beranda" vs "Home"
  const initialLang = pickLocale(searchParams?.lang);

  return (
    <div className="user-shell">
      {/* Header (client) menerima initialLang dari server */}
      <Header initialLang={initialLang} />

      <main className="user-main">
        <div className="user-content">{children}</div>
        <Footer />
      </main>
    </div>
  );
}
