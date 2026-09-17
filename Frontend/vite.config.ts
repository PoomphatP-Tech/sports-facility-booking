import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { resolveApiUrl } from "./app/config/api-url";

export default defineConfig(({ command, mode }) => {
  if (command === "build") {
    const env = loadEnv(mode, process.cwd(), "VITE_");
    resolveApiUrl(env.VITE_API_URL, true);
  }
  return { plugins: [tailwindcss(), reactRouter(), tsconfigPaths()] };
});
