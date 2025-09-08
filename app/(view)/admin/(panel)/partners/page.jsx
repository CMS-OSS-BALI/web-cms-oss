"use client";

import usePartnersViewModel from "./usePartnersViewModel";
import PartnersContent from "./PartnersContent";

export default function PartnersPage() {
  const vm = usePartnersViewModel();
  return <PartnersContent {...vm} />;
}
