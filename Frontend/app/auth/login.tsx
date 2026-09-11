import { useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "./auth-middleware";
import { Form, Button, Alert, Spinner } from "react-bootstrap";
import "./auth.css";
import { authService } from "~/services/auth.service";
import { getSessionDestination } from "~/services/auth-session.service";
import {
  APP_BRAND_NAME,
  APP_BRAND_SUBTITLE,
  APP_BRAND_TAGLINE,
} from "~/constants/app.constants";
import googleIcon from "~/image/google.png";

const DEMO_ACCOUNTS = [
  { label: "Member", email: "demo.member@example.com" },
  { label: "Member 2", email: "demo.member2@example.com" },
  { label: "Staff", email: "demo.staff@example.com" },
  { label: "Admin", email: "demo.admin@example.com" },
];
const DEMO_PASSWORD = "PlayCourt!27";

export default function Login() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeDemo, setActiveDemo] = useState<string | null>(null);
  const [demoError, setDemoError] = useState("");
  const submittingRef = useRef(false);

  const handleGoogleLogin = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setErrorMessage("");
    setDemoError("");
    setIsSubmitting(true);
    try {
      const session = await authService.loginWithGoogle();
      setUser(session.user);
      navigate(getSessionDestination(session), { replace: true });
    } catch (error) {
      const authError = error as { code?: string; message?: string };
      if (authError.code === "auth/popup-closed-by-user" ||
          authError.code === "auth/cancelled-popup-request") return;
      if (authError.code === "auth/popup-blocked") {
        setErrorMessage("Allow popups for this site, then try Google sign-in again.");
      } else if (authError.code === "auth/account-exists-with-different-credential") {
        setErrorMessage("An account with this email already exists. Please sign in using your original method.");
      } else if (authError.code === "auth/invalid-credential") {
        setErrorMessage("Google sign-in could not be verified. Please try again.");
      } else {
        setErrorMessage(authError.message || "Google login failed. Please try again.");
      }
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const loginWithPassword = async (loginEmail: string, loginPassword: string, demoLabel: string | null = null) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setErrorMessage("");
    setDemoError("");
    setActiveDemo(demoLabel);
    setIsSubmitting(true);
    try {
      const session = await authService.login(loginEmail, loginPassword);
      setUser(session.user);
      navigate(getSessionDestination(session), { replace: true });
    } catch (error) {
      const anyError = error as { code?: string; message?: string };
      if (anyError.message === "email is not verified") {
        navigate("/auth/register?step=2", { replace: true });
        return;
      }

      const message = anyError.code?.startsWith("auth/")
        ? demoLabel
          ? "This demo account is unavailable. Please try again later."
          : "Email or password is incorrect. Please try again."
        : anyError.message || "Login failed. Please try again.";
      if (demoLabel) setDemoError(message);
      else setErrorMessage(message);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
      setActiveDemo(null);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void loginWithPassword(email, password);
  };

  return (
    <div className="auth-container">
      <div className="auth-panel">
        <div className="auth-side">
          <div>
            <h1>{APP_BRAND_NAME}</h1>
            <p>{APP_BRAND_SUBTITLE}</p>
          </div>
          <p>{APP_BRAND_TAGLINE}</p>
          <section className="auth-demo" aria-labelledby="guest-accounts-heading">
            <h2 id="guest-accounts-heading">Try the demo</h2>
            <p className="auth-demo-intro">Choose an account to log in instantly.</p>
            <div className="auth-demo-accounts">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  className="auth-demo-button"
                  key={account.email}
                  type="button"
                  disabled={isSubmitting}
                  aria-label={`Log in as ${account.label}`}
                  aria-busy={activeDemo === account.label}
                  onClick={() => void loginWithPassword(account.email, DEMO_PASSWORD, account.label)}
                >
                  <span className="auth-demo-button-title">{account.label}</span>
                  <span className="auth-demo-button-action">
                    {activeDemo === account.label ? (
                      <Spinner animation="border" size="sm" aria-hidden="true" />
                    ) : (
                      <span aria-hidden="true">→</span>
                    )}
                  </span>
                </button>
              ))}
            </div>
            {activeDemo && <span className="visually-hidden" role="status">Signing in as {activeDemo}...</span>}
            {demoError && <p className="auth-demo-error" role="alert">{demoError}</p>}
          </section>
        </div>

        <div className="auth-form-wrap">
          <div className="auth-form">
            <h2>Welcome Back</h2>
            <p>Sign in to access your sports centre account</p>
            {errorMessage && <Alert variant="danger">{errorMessage}</Alert>}

            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>Email Address</Form.Label>
                <Form.Control
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Password</Form.Label>
                <Form.Control
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </Form.Group>

              <div className="mb-3 text-end">
                <Link
                  to="/auth/forgot-password"
                  className="text-decoration-none"
                >
                  Forgot password?
                </Link>
              </div>

              <Button
                variant="primary"
                size="lg"
                type="submit"
                className="w-100 mb-3"
                disabled={isSubmitting}
              >
                {isSubmitting && !activeDemo ? (
                  <Spinner animation="border" size="sm" />
                ) : (
                  "Log In"
                )}
              </Button>
            </Form>

            <div className="auth-divider">
              <span>or</span>
            </div>

            <Button
              variant="outline-secondary"
              size="lg"
              className="w-100 mb-3 d-flex align-items-center justify-content-center gap-2"
              onClick={handleGoogleLogin}
              disabled={isSubmitting}
            >
              <img src={googleIcon} alt="Google" style={{ width: 20, height: 20 }} />
              Continue with Google
            </Button>

            <p className="auth-footer">
              Don&apos;t have an account?{" "}
              <Link to="/auth/register" className="text-primary">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
