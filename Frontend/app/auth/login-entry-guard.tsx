import { useEffect, useState } from "react";
import { useAuth } from "./auth-middleware";
import { clearIncompleteLoginSession } from "~/services/login-entry.service";

export function LoginEntryGuard({ children }: { children: React.ReactNode }) {
  const { setUser } = useAuth();
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setChecking(true);
    setError(false);

    void clearIncompleteLoginSession(() => active)
      .then((signedOut) => {
        if (!active) return;
        if (signedOut) setUser(null);
        setChecking(false);
      })
      .catch(() => {
        if (active) setError(true);
      });

    return () => { active = false; };
  }, [setUser, attempt]);

  if (error) {
    return (
      <div className="container py-5 text-center" role="alert">
        <p>Unable to prepare the login page. Please try again.</p>
        <button className="btn btn-primary" onClick={() => setAttempt((value) => value + 1)}>
          Try again
        </button>
      </div>
    );
  }
  if (checking) return <p className="text-center py-5" role="status">Preparing login...</p>;
  return children;
}
