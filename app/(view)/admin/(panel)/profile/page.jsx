"use client";

import { Suspense, lazy } from "react";
import useProfileViewModel from "./useProfileViewModel";

const ProfileContentLazy = lazy(() => import("./ProfileContent"));

export default function Page() {
  const vm = useProfileViewModel();
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProfileContentLazy {...vm} />
    </Suspense>
  );
}
