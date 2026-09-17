import { APP_BRAND_NAME } from "~/constants/app.constants";

type ColdStartProps = {
  unavailable?: boolean;
  onRetry?: () => void;
};

export default function ColdStart({ unavailable = false, onRetry }: ColdStartProps) {
  return (
    <main className="min-vh-100 d-flex align-items-center justify-content-center bg-light p-3">
      <section
        className="bg-white border rounded-4 shadow-sm p-4 p-md-5 text-center w-100"
        style={{ maxWidth: "30rem" }}
        role={unavailable ? "alert" : "status"}
        aria-live="polite"
      >
        <p className="text-primary fw-semibold mb-4">{APP_BRAND_NAME}</p>
        {!unavailable && <div className="spinner-border text-primary mb-4" aria-hidden="true" />}
        <h1 className="h3 fw-semibold mb-3">
          {unavailable ? "We couldn't connect to the server" : "Our server is waking up"}
        </h1>
        <p className="text-secondary mb-3">
          {unavailable
            ? "The server is taking longer than expected. Please try again in a moment."
            : "We're connecting to the server. This can take a little longer after a period of inactivity."}
        </p>
        {unavailable && onRetry ? (
          <button className="btn btn-primary" type="button" onClick={onRetry}>Try again</button>
        ) : (
          <p className="text-secondary mb-0">Please wait. We'll retry the connection automatically.</p>
        )}
      </section>
    </main>
  );
}
