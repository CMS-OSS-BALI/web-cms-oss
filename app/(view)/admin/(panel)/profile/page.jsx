"use client";

import dynamic from "next/dynamic";
import Loading from "@/app/components/loading/LoadingImage";
import useProfileViewModel from "./useProfileViewModel";

const ProfileContent = dynamic(() => import("./ProfileContent"), {
  ssr: false,
  loading: () => (
    <div>
      <Loading />
    </div>
  ),
});

export default function Page() {
  const vm = useProfileViewModel({ locale: "id" });
  return <ProfileContent vm={vm} />;
}
