import { defineConfig } from "@hey-api/openapi-ts";

const input = process.env.OPENAPI_SPEC_PATH || process.env.OPENAPI_URL;

if (!input) {
  throw new Error("OPENAPI_SPEC_PATH is required; generation must use a local deterministic specification");
}

export default defineConfig({
  input,
  output: {
    path: "src/lib/api-client",
    format: null,
    lint: null,
  },
  plugins: [
    "@hey-api/client-axios",
    "@hey-api/schemas",
    {
      dates: true,
      name: "@hey-api/transformers",
    },
    {
      enums: "javascript",
      name: "@hey-api/typescript",
    },
    {
      name: "@hey-api/sdk",
      transformer: true,
    },
  ],
});
