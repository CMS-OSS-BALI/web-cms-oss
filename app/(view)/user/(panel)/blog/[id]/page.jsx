// app/(view)/user/blog/[id]/page.jsx
import { Suspense } from "react";
import BlogDetailContent from "./BlogDetailContent";
import Loading from "@/app/components/loading/LoadingImage";
import { buildUserMetadata, pickLocale } from "@/app/seo/userMetadata";

// Dynamic metadata untuk blog detail
export async function generateMetadata({ params, searchParams }) {
  const locale = pickLocale(searchParams?.lang);
  const id = params?.id;

  // Default (kalau belum ambil judul dari API)
  const title =
    locale === "en" ? "OSS Bali Blog – Article" : "Blog OSS Bali – Artikel";

  const description =
    locale === "en"
      ? "Read an article from OSS Bali blog about studying abroad, scholarships, and international careers."
      : "Baca artikel dari Blog OSS Bali seputar studi luar negeri, beasiswa, dan karier internasional.";

  return buildUserMetadata({
    title,
    description,
    path: `/user/blog/${id}`, // penting untuk canonical/hreflang
    locale,
    type: "article",
  });
}

// Server component, membungkus BlogDetailContent (client)
export default function BlogDetailPage({ params, searchParams }) {
  const locale = pickLocale(searchParams?.lang);
  const fallbackLocale = "id";

  return (
    <Suspense
      fallback={
        <div className="page-wrap" style={{ padding: "40px 0" }}>
          <Loading />
        </div>
      }
    >
      {/* initialLocale & fallbackLocale akan dipakai di client untuk i18n */}
      <BlogDetailContent
        initialLocale={locale}
        fallbackLocale={fallbackLocale}
      />
    </Suspense>
  );
}
