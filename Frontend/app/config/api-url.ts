export function resolveApiUrl(value: string | undefined, production: boolean): string {
  const configuredUrl = value?.trim();
  if (!configuredUrl) {
    throw new Error("VITE_API_URL is required. Set it to the deployed backend URL including /api, then rebuild the frontend.");
  }

  let url: URL;
  try {
    url = new URL(configuredUrl);
  } catch {
    throw new Error("VITE_API_URL must be an absolute HTTP or HTTPS URL including /api.");
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error("VITE_API_URL must be an HTTP or HTTPS URL without credentials, query parameters or a fragment.");
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
  const isLoopback = hostname === 'localhost' || hostname.endsWith('.localhost') ||
    hostname === '[::1]' || hostname === '0.0.0.0' || /^127\.\d+\.\d+\.\d+$/.test(hostname);
  if (production && isLoopback) {
    throw new Error("Production VITE_API_URL points to localhost. Set the frontend deployment environment variable to your public backend URL including /api, then rebuild.");
  }
  if (production && url.protocol !== 'https:') {
    throw new Error("Production VITE_API_URL must use HTTPS so requests from the deployed HTTPS frontend are not blocked.");
  }
  return url.toString().replace(/\/+$/, '');
}
