"use client";

import { Suspense, lazy } from "react";
import useForgotViewModel from "./useForgotViewModel";

const ForgotContentLazy = lazy(() => import("./ForgotContent"));

export default function Page() {
  const vm = useForgotViewModel(); // <- buat state & handlers di sini
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ForgotContentLazy {...vm} /> {/* <- pass props ke Content */}
    </Suspense>
  );
}
