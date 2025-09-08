"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

/**
 * VM:
 * - Baca event_id dari query (?event_id=...)
 * - Kalau tidak ada, fetch daftar event published -> user pilih dulu
 * - Setelah ada id, fetch detail event
 * - State form & submit POST /api/tickets
 */
export default function useBuyTicketViewModel() {
  const sp = useSearchParams();
  const eventIdFromUrl = sp.get("event_id") || "";

  const [events, setEvents] = useState([]); // list event untuk dropdown
  const [selectedEventId, setSelectedEventId] = useState(eventIdFromUrl);
  const [event, setEvent] = useState(null);
  const [loadingEvent, setLoadingEvent] = useState(false);
  const [loadingList, setLoadingList] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    whatsapp: "",
    school_or_campus: "",
    class_or_semester: "",
    domicile: "",
    payment_method: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [ticket, setTicket] = useState(null);

  // Ambil list event kalau belum ada id
  useEffect(() => {
    if (selectedEventId) return;
    (async () => {
      setLoadingList(true);
      try {
        // Sesuaikan kalau endpoint list event-mu beda
        let res = await fetch(`/api/events?is_published=true&perPage=100`, {
          cache: "no-store",
        });
        if (!res.ok) res = await fetch(`/api/events`, { cache: "no-store" });
        const data = await res.json();
        const rows = Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data)
          ? data
          : [];
        const published = rows.filter((e) => e?.is_published !== false);
        setEvents(published);
      } catch {
        setEvents([]);
      } finally {
        setLoadingList(false);
      }
    })();
  }, [selectedEventId]);

  // Ambil detail event setiap kali id berubah
  useEffect(() => {
    if (!selectedEventId) {
      setEvent(null);
      return;
    }
    fetchEvent(selectedEventId);
  }, [selectedEventId]);

  async function fetchEvent(id) {
    setLoadingEvent(true);
    try {
      let res = await fetch(`/api/events/${id}`, { cache: "no-store" });
      if (!res.ok)
        res = await fetch(`/api/events?id=${encodeURIComponent(id)}`, {
          cache: "no-store",
        });
      if (res.ok) {
        const data = await res.json();
        const ev = Array.isArray(data?.data)
          ? data.data[0]
          : data?.data || data;
        setEvent(ev || { id });
      } else {
        setEvent({ id });
      }
    } catch {
      setEvent({ id });
    } finally {
      setLoadingEvent(false);
    }
  }

  const isPaid = useMemo(() => event?.pricing_type === "PAID", [event]);
  const price = useMemo(() => Number(event?.ticket_price || 0), [event]);

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function submit() {
    setError("");
    setSubmitting(true);
    try {
      const activeEventId = selectedEventId;
      if (!activeEventId) {
        setError("Silakan pilih event terlebih dahulu.");
        return;
      }
      const payload = {
        event_id: activeEventId,
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        whatsapp: form.whatsapp?.trim() || undefined,
        school_or_campus: form.school_or_campus || undefined,
        class_or_semester: form.class_or_semester || undefined,
        domicile: form.domicile || undefined,
      };
      if (isPaid && form.payment_method)
        payload.payment_method = form.payment_method;

      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let data = {};
      try {
        data = await res.json();
      } catch {}

      if (!res.ok) {
        setError(data?.message || "Gagal memesan tiket");
        return;
      }
      setTicket(data);
    } catch {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setForm({
      full_name: "",
      email: "",
      whatsapp: "",
      school_or_campus: "",
      class_or_semester: "",
      domicile: "",
      payment_method: "",
    });
    setTicket(null);
    setError("");
  }

  return {
    // selection event
    events,
    loadingList,
    selectedEventId,
    setSelectedEventId,

    // detail event
    event,
    loadingEvent,
    isPaid,
    price,

    // form
    form,
    setField,

    // actions
    submit,
    reset,

    // state
    submitting,
    error,
    ticket,
  };
}
