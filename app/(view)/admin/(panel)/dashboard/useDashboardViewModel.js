"use client";

import { useMemo } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { fetcher } from "@/lib/swr/fetcher";

export default function useDashboardViewModel() {
  const { data: session, status } = useSession();
  const email = session?.user?.email ?? "";

  const fmt = (n) =>
    n == null || Number.isNaN(Number(n))
      ? "—"
      : new Intl.NumberFormat("id-ID").format(Number(n));

  // Counts via SWR
  const { data: partnersJson } = useSWR("/api/partners?perPage=1", fetcher);
  const { data: eventsJson } = useSWR("/api/events?perPage=1", fetcher);
  const { data: merchantsJson } = useSWR("/api/merchants?perPage=1", fetcher);

  // Upcoming events via SWR
  const fromIso = useMemo(() => new Date().toISOString(), []);
  const { data: upcomingJson } = useSWR(
    `/api/events?is_published=1&from=${encodeURIComponent(fromIso)}&perPage=5`,
    fetcher
  );

  const partnersCount = partnersJson?.total ?? null;
  const eventsCount = eventsJson?.total ?? null;
  const merchantsCount = merchantsJson?.total ?? null;
  const upcomingEvents = Array.isArray(upcomingJson?.data)
    ? upcomingJson.data
    : [];

  const kpis = useMemo(
    () => [
      {
        key: "Total Events",
        label: "Total Events",
        value: fmt(eventsCount),
        hint: "",
      },
      {
        key: "Total Merchants",
        label: "Total Merchants",
        value: fmt(merchantsCount),
        hint: "",
      },
      {
        key: "Total Partners",
        label: "Total Partners",
        value: fmt(partnersCount),
        hint: "",
      },
      {
        key: "Active Programs",
        label: "Active Programs",
        value: "—",
        hint: "",
      }, // diisi di Content
    ],
    [eventsCount, merchantsCount, partnersCount]
  );

  return { status, email, kpis, upcomingEvents };
}
