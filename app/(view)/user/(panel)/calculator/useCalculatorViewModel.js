"use client";

import { useMemo, useState, useCallback } from "react";
import useSWR from "swr";

/** Fetcher untuk endpoint list calculator:
 *  - API mengembalikan ARRAY langsung (tanpa { data, meta })
 *  - Kalau ternyata bukan array, fallback ke json.data atau []
 */
const fetcher = async (url) => {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${url}`);
  const json = await res.json();
  return Array.isArray(json) ? json : json?.data ?? [];
};

export default function useCalculatorViewModel() {
  // Helpers
  const formatIDR = useCallback((v) => {
    const n = Number(v || 0);
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(n);
  }, []);
  const parseIDR = useCallback((str = "") => {
    return Number(String(str).replace(/[^\d]/g, "")) || 0;
  }, []);

  // Fetch options from DB (API: return array langsung)
  const {
    data: sfRes = [],
    error: sfErr,
    isLoading: sfLoading,
  } = useSWR("/api/calculator?type=SERVICE_FEE&per_page=200", fetcher, {
    revalidateOnFocus: false,
  });

  const {
    data: insRes = [],
    error: insErr,
    isLoading: insLoading,
  } = useSWR("/api/calculator?type=INSURANCE&per_page=300", fetcher, {
    revalidateOnFocus: false,
  });

  const {
    data: visaRes = [],
    error: visaErr,
    isLoading: visaLoading,
  } = useSWR("/api/calculator?type=VISA&per_page=300", fetcher, {
    revalidateOnFocus: false,
  });

  const {
    data: addonRes = [],
    error: addonErr,
    isLoading: addonLoading,
  } = useSWR("/api/calculator?type=ADDON&per_page=300", fetcher, {
    revalidateOnFocus: false,
  });

  const serviceFeeOptions = useMemo(
    () =>
      sfRes.map((r) => ({
        value: r.code,
        label: r.label,
        amount: r.amount_idr ?? 0,
      })),
    [sfRes]
  );

  const insuranceOptions = useMemo(
    () =>
      insRes.map((r) => ({
        value: r.code,
        label: r.label,
        amount: r.amount_idr ?? 0,
      })),
    [insRes]
  );

  const visaOptions = useMemo(
    () =>
      visaRes.map((r) => ({
        value: r.code,
        label: r.label,
        amount: r.amount_idr ?? 0,
      })),
    [visaRes]
  );

  const addonList = useMemo(
    () =>
      addonRes.map((r) => ({
        key: r.code,
        label: r.label,
        note: r.note || null,
        amount: r.amount_idr ?? 0,
      })),
    [addonRes]
  );

  const isOptionsLoading =
    sfLoading || insLoading || visaLoading || addonLoading;

  // Term options (static)
  const termOptions = useMemo(
    () =>
      Array.from({ length: 8 }).map((_, i) => ({
        value: i + 1,
        label: `${i + 1}`,
      })),
    []
  );

  // Form state: SEMUA NULL
  const [form, setForm] = useState({
    namaStudent: null,
    namaKampus: null,
    lokasiKampus: null,
    jurusan: null,
    intake: null,
    kurs: null,

    serviceFeeKey: null,
    insuranceKey: null,
    visaKey: null,

    biayaKuliahTerm: null,
    jumlahTerm: null,

    addons: {},
  });

  const update = useCallback((key, value) => {
    setForm((p) => ({ ...p, [key]: value }));
  }, []);

  const toggleAddon = useCallback((key, checked) => {
    setForm((p) => ({ ...p, addons: { ...p.addons, [key]: checked } }));
  }, []);

  // Derived selections (bisa null)
  const serviceFee = useMemo(
    () => serviceFeeOptions.find((x) => x.value === form.serviceFeeKey) || null,
    [form.serviceFeeKey, serviceFeeOptions]
  );
  const insurance = useMemo(
    () => insuranceOptions.find((x) => x.value === form.insuranceKey) || null,
    [form.insuranceKey, insuranceOptions]
  );
  const visa = useMemo(
    () => visaOptions.find((x) => x.value === form.visaKey) || null,
    [form.visaKey, visaOptions]
  );

  const selectedAddons = useMemo(
    () => addonList.filter((a) => !!form.addons[a.key]),
    [addonList, form.addons]
  );

  const addonsTotal = useMemo(
    () => selectedAddons.reduce((s, a) => s + (a.amount || 0), 0),
    [selectedAddons]
  );

  // Kalkulasi (anggap kurs default 1 jika null)
  const termCount = Number(form.jumlahTerm) || 0;
  const tuitionPerTerm = Number(form.biayaKuliahTerm) || 0;
  const kurs = Number(form.kurs) || 1;

  const tuitionTotal = useMemo(
    () => tuitionPerTerm * termCount,
    [tuitionPerTerm, termCount]
  );

  const subtotalIDR = useMemo(
    () =>
      tuitionTotal +
      (serviceFee?.amount || 0) +
      (insurance?.amount || 0) +
      (visa?.amount || 0) +
      addonsTotal,
    [
      tuitionTotal,
      serviceFee?.amount,
      insurance?.amount,
      visa?.amount,
      addonsTotal,
    ]
  );

  const totalIDR = useMemo(
    () => Math.round(subtotalIDR * kurs),
    [subtotalIDR, kurs]
  );

  // Utilities
  const hasAddon = useCallback((key) => !!form.addons[key], [form.addons]);
  const addonByKey = useCallback(
    (key) => addonList.find((x) => x.key === key) || { amount: 0 },
    [addonList]
  );

  // CTA
  const goConsult = () => {
    window.open(
      "https://wa.me/6287785092020?text=Halo%20OSS%20Bali,%20saya%20ingin%20konsultasi%20biaya%20kuliah.",
      "_blank"
    );
  };

  return {
    // state & ops
    form,
    update,
    toggleAddon,

    // options
    termOptions,
    serviceFeeOptions,
    insuranceOptions,
    visaOptions,
    addonList,

    // loading / error
    isOptionsLoading,
    error: sfErr || insErr || visaErr || addonErr || null,

    // derived
    serviceFee,
    insurance,
    visa,
    selectedAddons,
    addonsTotal,
    tuitionTotal,
    totalIDR,

    // helpers
    formatIDR,
    parseIDR,
    hasAddon,
    addonByKey,

    // cta
    goConsult,
  };
}
