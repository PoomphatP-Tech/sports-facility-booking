import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "./auth-middleware";
import { Form, Button, Alert, Spinner } from "react-bootstrap";
import "./auth.css";
import { authService } from "~/services/auth.service";
import {
  APP_BRAND_NAME,
  APP_BRAND_SUBTITLE,
  APP_BRAND_TAGLINE,
} from "~/constants/app.constants";
import googleIcon from "~/image/google.png";

export default function Login() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleGoogleLogin = async () => {
    setErrorMessage("");
    setIsSubmitting(true);
    try {
      const { user, nextStep } = await authService.loginWithGoogle();
      if (nextStep === "details") {
        navigate("/auth/register?step=3");
      } else {
        setUser(user);
        navigate(user.role === "admin" ? "/admin" : "/");
      }
    } catch (error) {
      const apiError = error as ApiError;
      setErrorMessage(apiError.message || "Google login failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    setIsSubmitting(true);
    try {
      const { user } = await authService.login(email, password);
      setUser(user);
      navigate("/");
    } catch (error) {
      const anyError = error as { code?: string; message?: string };

      if (anyError.code === "email-not-verified") {
        navigate("/auth/register?verify=true");
      } else if (anyError.code?.startsWith("auth/")) {
        setErrorMessage("Email or password is incorrect");
      } else {
        setErrorMessage(anyError.message || "Login failed");
      }
    } finally {
      setIsSubmitting(false);
    }
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
                {isSubmitting ? (
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
