"use client";

import { ConfigProvider } from "antd";
import ScannerContent from "./ScannerContent";
import useScannerViewModel from "./useScannerViewModel";

const TOKENS = {
  shellW: "94%",
  maxW: 1140,
  blue: "#0b56c9",
  text: "#0f172a",
};

export default function ScannerPage() {
  const vm = useScannerViewModel();

  return (
    <ConfigProvider
      componentSize="middle"
      theme={{
        token: {
          colorPrimary: TOKENS.blue,
          colorText: TOKENS.text,
          fontFamily:
            '"Public Sans", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
          borderRadius: 12,
          fontSize: 13,
          controlHeight: 36,
        },
        components: { Button: { borderRadius: 10 } },
      }}
    >
      <div style={{ height: "100dvh", overflow: "auto" }}>
        <ScannerContent {...vm} tokens={TOKENS} />
      </div>
    </ConfigProvider>
  );
}

