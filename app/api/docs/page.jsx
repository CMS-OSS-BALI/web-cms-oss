"use client";

import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";

const SwaggerUI = dynamic(() => import("swagger-ui-react"), {
  ssr: false,
});

export default function ApiDoc() {
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
