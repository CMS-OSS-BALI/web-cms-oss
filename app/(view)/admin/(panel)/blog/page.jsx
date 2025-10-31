// app/(view)/admin/blog/page.jsx
import dynamic from "next/dynamic";
import Loading from "@/app/components/loading/LoadingImage";

const BlogContent = dynamic(() => import("./BlogContent"), {
  ssr: false,
  loading: () => (
    <div className="page-wrap">
      <Loading />
    </div>
  ),
});

const pickLocale = (v) => {
  const s = String(v || "id")
    .trim()
    .toLowerCase();
  return s.startsWith("en") ? "en" : "id";
};

export default function BlogPage({ searchParams }) {
  const initialLocale = pickLocale(searchParams?.lang);
  return <BlogContent initialLocale={initialLocale} />;
}
