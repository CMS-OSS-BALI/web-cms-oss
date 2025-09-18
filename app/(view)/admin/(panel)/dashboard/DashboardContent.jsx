"use client";

import Link from "next/link";
import { Row, Col, Card, Typography, List, Button } from "antd";
import VisitorsSection from "@/app/components/dashboard/VisitorsSection";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

export default function DashboardContent({
  status,
  email,
  kpis,
  upcomingEvents,
}) {
  const { data: session } = useSession();

  // ===== Helpers =====
  const pickKpi = (...candidates) => {
    const found = (kpis || []).find(
      (k) =>
        candidates.includes(k?.key) ||
        candidates.includes(k?.label) ||
        candidates.includes(k?.name)
    );
    return found || { value: "—", hint: "" };
  };

  const greet = () => {
    const h = new Date().getHours();
    if (h < 12) return "Selamat pagi";
    if (h < 15) return "Selamat siang";
    if (h < 19) return "Selamat sore";
    return "Selamat malam";
  };

  const prettyNameFromEmail = (addr) => {
    if (!addr) return "";
    const base = addr.split("@")[0];
    const spaced = base.replace(/[._-]+/g, " ");
    return spaced.replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const todayLabel = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  // ===== Nama pengguna (session/profile) =====
  const [nameFromApi, setNameFromApi] = useState("");
  useEffect(() => {
    let stop = false;
    (async () => {
      try {
        const res = await fetch("/api/profile", { cache: "no-store" });
        if (!res.ok) return;
        const j = await res.json();
        if (!stop) setNameFromApi((j?.name || "").trim());
      } catch {}
    })();

    try {
      const bc = new BroadcastChannel("profile");
      bc.onmessage = (e) => {
        if (
          e?.data?.type === "name-updated" &&
          typeof e.data.name === "string"
        ) {
          setNameFromApi(e.data.name.trim());
        }
      };
      return () => {
        stop = true;
        bc.close();
      };
    } catch {
      return () => {
        stop = true;
      };
    }
  }, []);

  const sessionFullName = (session?.user?.name || "").trim();
  const displayName =
    (nameFromApi && nameFromApi.split(/\s+/)[0]) ||
    (sessionFullName && sessionFullName.split(/\s+/)[0]) ||
    prettyNameFromEmail(session?.user?.email || email) ||
    "";

  // ===== Programs count (active + total) =====
  const [progCount, setProgCount] = useState({
    total: null,
    active: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setProgCount((s) => ({ ...s, loading: true, error: null }));
        const [allRes, activeRes] = await Promise.all([
          fetch("/api/programs?perPage=1", { cache: "no-store" }),
          fetch("/api/programs?published=1&perPage=1", { cache: "no-store" }),
        ]);
        const [allJson, activeJson] = await Promise.all([
          allRes.json(),
          activeRes.json(),
        ]);
        if (cancelled) return;
        setProgCount({
          total: allJson?.meta?.total ?? 0,
          active: activeJson?.meta?.total ?? 0,
          loading: false,
          error: null,
        });
      } catch (e) {
        if (cancelled) return;
        setProgCount((s) => ({
          ...s,
          loading: false,
          error: e?.message || "Gagal memuat jumlah program",
        }));
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  // ===== KPI Cards =====
  const kpiCards = useMemo(() => {
    const totalEvents = pickKpi("Total Events");
    const totalMerchants = pickKpi("Total Merchants");
    const totalPartners = pickKpi("Total Partners");

    const baseActive = pickKpi(
      "Active Programs",
      "Programs Active",
      "Programs"
    );
    const activeValue =
      progCount.active != null ? progCount.active : baseActive.value;
    const activeHint =
      progCount.total != null
        ? `Total ${progCount.total}`
        : baseActive.hint || "";

    return [
      { title: "Total Events", data: totalEvents },
      { title: "Total Merchants", data: totalMerchants },
      { title: "Total Partners", data: totalPartners },
      {
        title: "Active Programs",
        data: { value: activeValue, hint: activeHint },
      },
    ];
  }, [kpis, progCount.active, progCount.total]);

  // ===== Upcoming Events helpers + sorting =====
  const getStart = (e) =>
    e?.start_at || e?.startAt || e?.start_date || e?.starts_at || e?.start;
  const getEnd = (e) =>
    e?.end_at || e?.endAt || e?.end_date || e?.ends_at || e?.end;

  const toMs = (dStr) => {
    if (!dStr) return Number.POSITIVE_INFINITY;
    const d = new Date(dStr);
    return Number.isNaN(d.getTime()) ? Number.POSITIVE_INFINITY : d.getTime();
  };

  // Urutkan dari paling dekat → paling jauh
  const sortedUpcoming = useMemo(() => {
    const arr = Array.isArray(upcomingEvents) ? [...upcomingEvents] : [];
    return arr.sort((a, b) => {
      const as = toMs(getStart(a));
      const bs = toMs(getStart(b));
      if (as !== bs) return as - bs;
      const ae = toMs(getEnd(a));
      const be = toMs(getEnd(b));
      return ae - be;
    });
  }, [upcomingEvents]);

  const fmtDate = (dStr) => {
    const d = new Date(dStr);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("id-ID", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };
  const fmtTime = (dStr) => {
    const d = new Date(dStr);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="page-wrap">
      {/* Header */}
      <Card
        className="card-dark card-hover"
        variant="outlined"
        bodyStyle={{ padding: 16 }}
        style={{ marginBottom: 20 }}
      >
        <Typography.Title level={2} style={{ margin: 0, color: "#e5e7eb" }}>
          Dashboard
        </Typography.Title>
        <Typography.Text style={{ color: "#9fb1d1" }}>
          {status === "loading"
            ? "Mengecek sesi…"
            : `${greet()}${
                displayName ? ", " + displayName : ""
              }. Ringkasan ${todayLabel}.`}
        </Typography.Text>
      </Card>

      {/* ROW 1 — Analytics (8) + Upcoming Events (4) */}
      <Row gutter={[20, 20]} align="stretch" style={{ marginBottom: 16 }}>
        <Col xs={24} lg={16}>
          <Card
            className="card-dark card-hover"
            variant="outlined"
            style={{ height: "100%" }}
            bodyStyle={{ padding: 16 }}
          >
            <VisitorsSection />
          </Card>
        </Col>

        <Col xs={24} lg={8} style={{ display: "flex" }}>
          <Card
            className="card-dark card-hover"
            variant="outlined"
            style={{ height: "100%", width: "100%" }}
            bodyStyle={{
              padding: 16,
              display: "flex",
              flexDirection: "column",
              height: "100%",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Typography.Text strong style={{ color: "#e5e7eb" }}>
                Upcoming Events
              </Typography.Text>
              <Link href="/admin/events">
                <Button type="link" size="small" style={{ padding: 0 }}>
                  View all
                </Button>
              </Link>
            </div>

            <div style={{ marginTop: 8, flex: 1 }}>
              {sortedUpcoming?.length ? (
                <List
                  dataSource={sortedUpcoming}
                  split={false}
                  renderItem={(ev) => {
                    const title =
                      ev?.name ||
                      ev?.title ||
                      ev?.event_name ||
                      "Untitled Event";
                    const s = getStart(ev);
                    const e = getEnd(ev);
                    const sameDay =
                      s &&
                      e &&
                      new Date(s).toDateString() === new Date(e).toDateString();

                    const dateLabel = s ? fmtDate(s) : e ? fmtDate(e) : "";
                    const timeLabel = s
                      ? `${fmtTime(s)}${e ? " – " + fmtTime(e) : ""}`
                      : e
                      ? fmtTime(e)
                      : "";

                    return (
                      <List.Item style={{ padding: "8px 0" }}>
                        <div style={{ display: "grid" }}>
                          <Typography.Text style={{ color: "#e5e7eb" }}>
                            {title}
                          </Typography.Text>
                          <Typography.Text
                            type="secondary"
                            style={{ color: "#94a3b8", fontSize: 12 }}
                          >
                            {dateLabel}
                            {timeLabel
                              ? sameDay
                                ? ` · ${timeLabel}`
                                : ` · ${fmtTime(s)} – ${fmtDate(e)} ${fmtTime(
                                    e
                                  )}`
                              : ""}
                            {ev?.location ? ` · ${ev.location}` : ""}
                          </Typography.Text>
                        </div>
                      </List.Item>
                    );
                  }}
                />
              ) : (
                <Typography.Text type="secondary" style={{ color: "#94a3b8" }}>
                  No upcoming events.
                </Typography.Text>
              )}
            </div>
          </Card>
        </Col>
      </Row>

      {/* ROW 2 — KPI Cards (4 kolom dalam satu baris di layar besar) */}
      <Row gutter={[20, 20]}>
        {kpiCards.map((k) => (
          <Col key={k.title} xs={24} sm={12} lg={6} xl={6}>
            <Card
              className="card-dark card-hover"
              variant="outlined"
              style={{ height: "100%" }}
              bodyStyle={{
                padding: 16,
                minHeight: 120,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <Typography.Text style={{ color: "#cbd5e1", fontSize: 12 }}>
                {k.title}
              </Typography.Text>
              <Typography.Title
                level={2}
                style={{ margin: "8px 0 4px 0", color: "#e5e7eb" }}
              >
                {k.data.value ?? "—"}
              </Typography.Title>
              {k.data.hint ? (
                <Typography.Text style={{ color: "#94a3b8", fontSize: 12 }}>
                  {k.data.hint}
                </Typography.Text>
              ) : null}
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
