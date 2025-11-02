// app/(view)/admin/profile/page.jsx
"use client";

import { Suspense, lazy } from "react";
import Loading from "@/app/components/loading/LoadingImage";
import useProfileViewModel from "./useProfileViewModel";

const ProfileContentLazy = lazy(() => import("./ProfileContent"));

export default function ProfilePage() {
  const vm = useProfileViewModel({ locale: "id" });

  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      <ProfileContentLazy vm={vm} />
    </Suspense>
  );
}
