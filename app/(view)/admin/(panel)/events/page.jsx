"use client";

import { Suspense, lazy } from "react";
import Loading from "@/app/components/loading/LoadingImage";
import useEventsViewModel from "./useEventsViewModel";

const EventsContentLazy = lazy(() => import("./EventsContent"));

export default function EventsPage() {
  const vm = useEventsViewModel();
  return (
    <Suspense fallback={<div className="page-wrap"><Loading /></div>}>
      <EventsContentLazy {...vm} />
    </Suspense>
  );
}
