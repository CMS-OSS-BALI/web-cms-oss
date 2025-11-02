// app/(view)/admin/(panel)/events/page.jsx
"use client";

import { Suspense, lazy } from "react";
import Loading from "@/app/components/loading/LoadingImage";
import useEventsViewModel from "./useEventsViewModel";

// Container ringan yang akan mengorkestrasi child modular
const EventsContentLazy = lazy(() => import("./EventsContent"));

export default function EventsPage() {
  const vm = useEventsViewModel(); // ⟵ bootstrap VM di page (bukan di content)

  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      <EventsContentLazy vm={vm} />
    </Suspense>
  );
}
