"use client";

import useEventsViewModel from "./useEventsViewModel";
import EventsContent from "./EventsContent";

export default function EventsPage() {
  const vm = useEventsViewModel();
  return <EventsContent {...vm} />;
}
