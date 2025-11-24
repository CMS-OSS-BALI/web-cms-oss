// app/(view)/user/blog/[id]/page.jsx
import { Suspense } from "react";
import BlogDetailContent from "./BlogDetailContent";
import Loading from "@/app/components/loading/LoadingImage";
import { buildUserMetadata, pickLocale } from "@/app/seo/userMetadata";
import prisma from "@/lib/prisma";
import { toPublicUrl } from "@/app/api/blog/_utils";

async function fetchBlogMeta(id, locale, fallback) {
  if (!id) return null;
  const locales = Array.from(new Set([locale, fallback].filter(Boolean)));
  const row = await prisma.blog.findFirst({
    where: { id, deleted_at: null },
    select: {
      id: true,
      image_url: true,
      blog_translate: {
        where: { locale: { in: locales } },
        select: { locale: true, name: true, description: true },
      },
    },
  });
  if (!row) return null;
  const pickTrans = (loc) =>
    row.blog_translate?.find((t) => t.locale === loc) || null;
  const chosen = pickTrans(locale) || pickTrans(fallback) || null;
  return {
    title: chosen?.name || null,
    description: chosen?.description || null,
    image: toPublicUrl(row.image_url),
  };
}

// Dynamic metadata untuk blog detail
export async function generateMetadata({ params, searchParams }) {
  const locale = pickLocale(searchParams?.lang);
  const rawId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const id = rawId ? decodeURIComponent(rawId) : "";
  const fallbackLocale = "id";

  const meta = await fetchBlogMeta(id, locale, fallbackLocale);

  // Default (kalau belum ambil judul dari API)
  const title =
    meta?.title ||
    (locale === "en" ? "OSS Bali Blog – Article" : "Blog OSS Bali – Artikel");

  const description =
    meta?.description ||
    (locale === "en"
      ? "Read an article from OSS Bali blog about studying abroad, scholarships, and international careers."
      : "Baca artikel dari Blog OSS Bali seputar studi luar negeri, beasiswa, dan karier internasional.");

  const image =
    meta?.image ||
    `/og/oss-default-${locale === "en" ? "en" : "id"}.png`;

  return buildUserMetadata({
    title,
    description,
    path: `/user/blog/${rawId}`, // penting untuk canonical/hreflang
    locale,
    type: "article",
    image,
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
