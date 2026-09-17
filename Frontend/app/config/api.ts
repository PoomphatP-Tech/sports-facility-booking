import { resolveApiUrl } from "./api-url";

export const API_URL = resolveApiUrl(
  import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:5000/api" : undefined),
  import.meta.env.PROD,
);
