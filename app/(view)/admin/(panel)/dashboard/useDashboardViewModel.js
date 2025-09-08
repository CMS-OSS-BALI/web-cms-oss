"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

export default function useDashboardViewModel() {
  const { data: session, status } = useSession();
  const email = session?.user?.email ?? "";

  const fmt = (n) =>
    n == null || Number.isNaN(Number(n))
      ? "—"
      : new Intl.NumberFormat("id-ID").format(Number(n));

  const [partnersCount, setPartnersCount] = useState(null);
  const [eventsCount, setEventsCount] = useState(null);
  const [merchantsCount, setMerchantsCount] = useState(null);
  const [upcomingEvents, setUpcomingEvents] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/partners?perPage=1", {
          cache: "no-store",
        });
        const j = await res.json().catch(() => ({}));
        if (!cancelled) setPartnersCount(Number(j?.total ?? 0));
      } catch {
        !cancelled && setPartnersCount(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const totalRes = await fetch("/api/events?perPage=1", {
          cache: "no-store",
        });
        const totalJson = await totalRes.json().catch(() => ({}));
        if (!cancelled) setEventsCount(Number(totalJson?.total ?? 0));
      } catch {
        !cancelled && setEventsCount(0);
      }

      try {
        const from = new Date().toISOString();
        const res = await fetch(
          `/api/events?is_published=1&from=${encodeURIComponent(
            from
          )}&perPage=5`,
          { cache: "no-store" }
        );
        const j = await res.json().catch(() => ({}));
        if (!cancelled) setUpcomingEvents(Array.isArray(j?.data) ? j.data : []);
      } catch {
        !cancelled && setUpcomingEvents([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/merchants?perPage=1", {
          cache: "no-store",
        });
        const j = await res.json().catch(() => ({}));
        if (!cancelled) setMerchantsCount(Number(j?.total ?? 0));
      } catch {
        !cancelled && setMerchantsCount(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
