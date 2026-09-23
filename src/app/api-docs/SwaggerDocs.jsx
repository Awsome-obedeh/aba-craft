"use client";

import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";

const SwaggerUI = dynamic(() => import("swagger-ui-react"), {
  ssr: false,
  loading: () => <p role="status" className="p-8 text-center">Loading API documentation...</p>,
});

// swagger-ui-react does not forward validatorUrl. Disable the online validator
// through its supported component plugin API; validation runs locally in tests.
const localValidationOnly = () => ({ components: { onlineValidatorBadge: () => null } });
const plugins = [localValidationOnly];

export default function SwaggerDocs() {
  return (
    <SwaggerUI
      url="/api/openapi"
      deepLinking
      filter
      displayRequestDuration
      docExpansion="list"
      defaultModelsExpandDepth={1}
      persistAuthorization={false}
      withCredentials
      plugins={plugins}
      supportedSubmitMethods={["get", "post"]}
    />
  );
}
