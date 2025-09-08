"use client";

import { Suspense, lazy } from "react";
import useLoginViewModel from "./useLoginViewModel";

const LoginContentLazy = lazy(() => import("./LoginContent"));

export default function Page() {
  const vm = useLoginViewModel(); // <- buat state & handlers di sini
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContentLazy {...vm} />
    </Suspense>
  );
}
