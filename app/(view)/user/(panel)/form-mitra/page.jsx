"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import useFormMitraViewModel from "./useFormMitraViewModel";
import FormMitraContent from "./FormMitraContent";

const pickLocale = (queryVal, navigatorLang) => {
  const v = (queryVal || navigatorLang || "id").slice(0, 2).toLowerCase();
  return v === "en" ? "en" : "id";
};

export default function Page() {
  const search = useSearchParams();
  const locale = useMemo(() => {
    const fromQuery = search?.get("lang") ?? search?.get("locale") ?? "";
    const nav = typeof navigator !== "undefined" ? navigator.language : "id";
    return pickLocale(fromQuery, nav);
  }, [search]);

  const vm = useFormMitraViewModel({ locale });
  return <FormMitraContent locale={locale} {...vm} />;
}
