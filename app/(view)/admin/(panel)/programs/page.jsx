"use client";

import ProgramsContent from "./ProgramsContent";
import useProgramsViewModel from "./useProgramsViewModel";

export default function ProgramsPage() {
  const vm = useProgramsViewModel();

  return (
    <div style={{ padding: 16 }}>
      <ProgramsContent {...vm} />
    </div>
  );
}
