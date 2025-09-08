"use client";

import useMerchantsViewModel from "./useMerchantsViewModel";
import MerchantsContent from "./MerchantsContent";

export default function MerchantsPage() {
  const vm = useMerchantsViewModel();
  return <MerchantsContent {...vm} />;
}
