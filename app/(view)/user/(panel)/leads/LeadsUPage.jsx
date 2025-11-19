// app/(view)/user/(panel)/leads/LeadsUPage.jsx
"use client";

import LeadsUContent from "./LeadsUContent";
import { useLeadsUViewModel } from "./useLeadsUViewModel";

export default function LeadsUPage({ initialLocale }) {
  // Hook view model yang ngurus state form + i18n + submit
  const vm = useLeadsUViewModel(initialLocale);

  // vm: { locale, values, errors, onChange, submit, canSubmit, loading, msg }
  return <LeadsUContent {...vm} />;
}
