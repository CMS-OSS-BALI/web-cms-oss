"use client";

import ScannerContent from "./ScannerContent";
import useScannerViewModel from "./useScannerViewModel";

export default function ScannerPage() {
  const vm = useScannerViewModel();
  return (
    <div style={{ padding: 16 }}>
      <ScannerContent {...vm} />
    </div>
  );
}
