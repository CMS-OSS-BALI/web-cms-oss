"use client";

import { Suspense, lazy, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Loading from "@/app/components/loading/LoadingImage";
import useConsultantDetailViewModel from "./useConsultantDetailViewModel";

/* Lazy-load the content component */
const ConsultantDetailContentLazy = lazy(() =>
  import("./ConsultantDetailContent")
);

const LANG_STORAGE_KEY = "oss.lang";

/* Locale picker: prefer URL lang, fallback to stored/html/browser language */
function pickLocale({
  localeParam,
  langParam,
  storedLang,
  htmlLang,
  browserLang,
}) {
  const raw =
    localeParam ||
    langParam ||
    storedLang ||
    htmlLang ||
    browserLang ||
    "id";
  const normalized = String(raw).slice(0, 2).toLowerCase();
  return normalized === "en" ? "en" : "id";
}

function readStoredLang() {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage?.getItem(LANG_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function readHtmlLang() {
  if (typeof document === "undefined") return "";
  return document.documentElement.getAttribute("lang") || "";
}

function readBrowserLang() {
  if (typeof navigator === "undefined") return "";
  return navigator.language || "";
}

export default function ConsultantDetailPage() {
  const { id: rawId } = useParams(); // /user/landing-page/[id]
  const search = useSearchParams();

  // Normalize id to string just in case
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  // Compute locale once (avoids hydration mismatches)
  const locale = useMemo(() => {
    return pickLocale({
      localeParam: search?.get?.("locale"),
      langParam: search?.get?.("lang"),
      storedLang: readStoredLang(),
      htmlLang: readHtmlLang(),
      browserLang: readBrowserLang(),
    });
  }, [search]);

  // If no id (unlikely), keep the loading UI
  if (!id) {
    return (
      <div className="page-wrap">
        <Loading />
      </div>
    );
  }

  const vm = useConsultantDetailViewModel({ id, locale });

  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <Loading />
        </div>
      }
    >
      {/* key ensures content refreshes when id/locale change */}
      <ConsultantDetailContentLazy key={`${id}-${locale}`} {...vm} />
    </Suspense>
  );
}
