// app/(view)/user/blog/page.jsx
import { Suspense } from "react";
import BlogUContent from "./BlogUContent";
import Loading from "@/app/components/loading/LoadingImage";
import { buildUserMetadata, pickLocale } from "@/app/seo/userMetadata";

// Dynamic metadata untuk blog list
export async function generateMetadata({ searchParams }) {
  const locale = pickLocale(searchParams?.lang);
  const q = searchParams?.q || "";
  const category = searchParams?.category || "";

  let title =
    locale === "en" ? "OSS Bali Blog" : "Blog OSS Bali – Artikel & Insight";

  let description =
    locale === "en"
      ? "Articles about studying abroad, scholarships, and international career planning."
      : "Artikel seputar studi luar negeri, beasiswa, dan perencanaan karier internasional.";

  if (category) {
    title =
      locale === "en"
        ? `Articles in ${category} – OSS Bali Blog`
        : `Artikel kategori ${category} – Blog OSS Bali`;
  }

  if (q) {
    description =
      locale === "en"
        ? `Search results for “${q}” on OSS Bali blog.`
        : `Hasil pencarian untuk “${q}” di blog OSS Bali.`;
  }

  return buildUserMetadata({
    title,
    description,
    path: "/user/blog", // sesuaikan kalau route-mu beda
    locale,
    type: "website",
  });
}

// Server component, membungkus BlogUContent (client)
export default function BlogPage({ searchParams }) {
  const locale = pickLocale(searchParams?.lang);

  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      {/* initialLocale dipakai BlogUContent untuk hit API + toggle bahasa */}
      <BlogUContent initialLocale={locale} />
    </Suspense>
  );
}
