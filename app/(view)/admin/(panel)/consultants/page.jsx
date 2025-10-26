"use client";

import dynamic from "next/dynamic";
import Loading from "@/app/components/loading/LoadingImage";
import useConsultantsViewModel from "./useConsultantsViewModel";

const ConsultantsContent = dynamic(() => import("./ConsultantsContent"), {
  ssr: false,
  loading: () => (
    <div>
      <Loading />
    </div>
  ),
});

export default function Page() {
  const vm = useConsultantsViewModel();
  return <ConsultantsContent vm={vm} />;
}
