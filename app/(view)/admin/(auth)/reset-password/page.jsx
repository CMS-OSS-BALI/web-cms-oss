"use client";

import { Suspense, lazy } from "react";
import useResetViewModel from "./useResetViewModel";

const ResetContentLazy = lazy(() => import("./ResetContent"));

export default function Page() {
  const vm = useResetViewModel(); // state + handlers + resendHref
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetContentLazy {...vm} />
    </Suspense>
  );
}
