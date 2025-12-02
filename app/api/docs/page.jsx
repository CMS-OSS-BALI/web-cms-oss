"use client";

import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import "swagger-ui-react/swagger-ui.css";

const SwaggerUI = dynamic(() => import("swagger-ui-react"), {
  ssr: false,
});

const swaggerEnabled =
  process.env.NEXT_PUBLIC_ENABLE_SWAGGER === "true" ||
  process.env.NODE_ENV !== "production";

export default function ApiDoc() {
  // Jangan tampilkan dokumentasi di production kecuali diaktifkan eksplisit
  if (!swaggerEnabled) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-white">
      <SwaggerUI
        url="/api/docs/spec"
        docExpansion="list"
        defaultModelsExpandDepth={-1}
        displayRequestDuration
      />
    </div>
  );
}
