"use client";

import ScannerContent from "./ScannerContent";
import useScannerViewModel from "./useScannerViewModel";

export default function ScannerPage() {
  const vm = useScannerViewModel();
  return (
    <div style={{ height: "100dvh", overflow: "auto" }}>
      <ScannerContent {...vm} />
    </div>
  );
}
