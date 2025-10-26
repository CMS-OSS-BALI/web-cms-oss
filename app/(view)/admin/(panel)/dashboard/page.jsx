"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import Loading from "@/app/components/loading/LoadingImage";
import useDashboardViewModel from "./useDashboardViewModel";

// Client-only render untuk komponen berbasis AntD (hindari hydration mismatch)
const DashboardContent = dynamic(() => import("./DashboardContent"), {
  ssr: false,
  loading: () => (
    <div>
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

export default function Page() {
  const sp = useSearchParams();
  const locale = pickLocale(sp.get("lang"));
  const vm = useDashboardViewModel({ locale });

  return <DashboardContent vm={vm} />;
}
