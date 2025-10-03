"use client";

import { Suspense, lazy } from "react";
import useBuyTicketViewModel from "./useBuyTicketViewModel";

const BuyTicketContentLazy = lazy(() => import("./BuyTicketContent"));

export default function Page() {
  const vm = useBuyTicketViewModel();
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BuyTicketContentLazy {...vm} />
    </Suspense>
  );
}
