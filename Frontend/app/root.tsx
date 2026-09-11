import { useEffect, useState } from "react";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";
import "bootstrap/dist/css/bootstrap.min.css";
import AppNavbar from "./navigation/app-navbar";
import { AuthProvider } from "./auth/auth-middleware";
import ColdStart from "./routes/cold-start";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const location = useLocation();
  const [serverReady, setServerReady] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function checkServer() {
      try {
        const expiresAt = Number(localStorage.getItem("serverreadyExpiresAt"));
        if (localStorage.getItem("serverready") === "true" && Date.now() < expiresAt) {
          setServerReady(true);
          return;
        }

        localStorage.setItem("serverready", "false");
        const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";
        const response = await fetch(`${apiUrl.replace(/\/+$/, "")}/ping`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const data = response.ok ? await response.json() : null;
        if (data?.serverready === true && !controller.signal.aborted) {
          localStorage.setItem("serverreadyExpiresAt", String(Date.now() + 60 * 60 * 1000));
          localStorage.setItem("serverready", "true");
          setServerReady(true);
        }
      } catch {
        // Keep showing the landing page if the check fails.
      }
    }

    void checkServer();
    return () => controller.abort();
  }, []);

  if (!serverReady) return <ColdStart />;
  if (location.pathname === "/cold-start") return <Outlet />;
  const shouldShowNavbar = !location.pathname.startsWith("/auth");

  return (
    <AuthProvider>
      {shouldShowNavbar ? <AppNavbar /> : null}
      <Outlet />
    </AuthProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
