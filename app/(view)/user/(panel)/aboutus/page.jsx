"use client";

import dynamic from "next/dynamic";
import { useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import useAboutUsViewModel from "./useAboutUsViewModel";

const AboutUsContent = dynamic(() => import("./AboutUsContent"), {
  ssr: false,
  loading: () => <div style={{ padding: 24 }}>Loading…</div>,
});

const SUPPORTED = ["id", "en"];
const DEFAULT_LOCALE = "id";

function normalizeLocale(input) {
  const v = (input || "").toLowerCase().slice(0, 2);
  return SUPPORTED.includes(v) ? v : DEFAULT_LOCALE;
}

export default function AboutUsPage() {
  const search = useSearchParams();

  const locale = useMemo(() => {
    const q = search?.get("lang");
    const ls =
      typeof window !== "undefined" ? localStorage.getItem("oss.lang") : "";
    const nav =
      typeof navigator !== "undefined" ? navigator.language : DEFAULT_LOCALE;
    return normalizeLocale(q || ls || nav);
  }, [search]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("oss.lang", locale);
    }
  }, [locale]);

  const vm = useAboutUsViewModel({ locale });

  return <AboutUsContent key={locale} {...vm} />;
}
