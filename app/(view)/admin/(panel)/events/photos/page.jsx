"use client";

import { Suspense, lazy } from "react";
import Loading from "@/app/components/loading/LoadingImage";
import usePhotoViewModel from "./usePhotoViewModel";

const PhotoContentLazy = lazy(() => import("./PhotoContent"));

export default function EventPhotosPage() {
  const vm = usePhotoViewModel();

  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      <PhotoContentLazy vm={vm} />
    </Suspense>
  );
}
