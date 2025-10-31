// app/(view)/admin/college/page.jsx
import dynamic from "next/dynamic";
import Loading from "@/app/components/loading/LoadingImage";

const CollegeAContent = dynamic(() => import("./CollegeAContent"), {
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

export default function CollegePage({ searchParams }) {
  const initialLocale = pickLocale(searchParams?.lang);
  return <CollegeAContent initialLocale={initialLocale} />;
}
