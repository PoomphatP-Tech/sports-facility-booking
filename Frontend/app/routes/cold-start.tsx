import { APP_BRAND_NAME } from "~/constants/app.constants";

export default function ColdStart() {
  return (
    <main className="min-vh-100 d-flex align-items-center justify-content-center bg-light p-3">
      <section
        className="bg-white border rounded-4 shadow-sm p-4 p-md-5 text-center w-100"
        style={{ maxWidth: "30rem" }}
        role="status"
        aria-live="polite"
      >
        <p className="text-primary fw-semibold mb-4">{APP_BRAND_NAME}</p>
        <div className="spinner-border text-primary mb-4" aria-hidden="true" />
        <h1 className="h3 fw-semibold mb-3">Our server is waking up</h1>
        <p className="text-secondary mb-3">
          The server is starting up again after a period of inactivity.
        </p>
        <p className="text-secondary mb-0">
          Please wait a moment. This wait only happens on the first visit after
          the server has been idle.
        </p>
      </section>
    </main>
  );
}
