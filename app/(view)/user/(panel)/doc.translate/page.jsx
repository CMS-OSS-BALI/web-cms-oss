"use client";

import { Suspense, lazy } from "react";
import Loading from "@/app/components/loading/LoadingImage";
import useDocumentTranslateViewModel from "./useDocumentTranslateViewModel"; // <- default import

const DocumentTranslateContentLazy = lazy(() =>
  import("./DocumentTranslateContent")
);

export default function DocumentTranslatePage() {
  // optional: pass locale if you need it
  const vm = useDocumentTranslateViewModel({ locale: "id" });

  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      {/* DocumentTranslateContent currently uses its own hook,
          but spreading vm here is harmless if you later consume it */}
      <DocumentTranslateContentLazy {...vm} />
    </Suspense>
  );
}
