"use client";

import useTestimonialsViewModel from "./useTestimonialsViewModel";
import TestimonialsContent from "./TestimonialsContent";

export default function TestimonialsPage() {
  const vm = useTestimonialsViewModel();
  return <TestimonialsContent {...vm} />;
}
