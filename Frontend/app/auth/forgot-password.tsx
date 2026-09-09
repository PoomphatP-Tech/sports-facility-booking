import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { Form, Button, Alert, Spinner } from "react-bootstrap";
import "./auth.css";
import { authService } from "~/services/auth.service";
import {
  APP_BRAND_NAME,
  APP_BRAND_SUBTITLE,
  APP_BRAND_TAGLINE,
} from "~/constants/app.constants";
import type { ApiError } from "~/services/types";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  const handleApiError = (error: unknown) => {
    const apiError = error as ApiError;
    setErrorMessage(apiError.message || "Something went wrong");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setInfoMessage("");
    setIsSubmitting(true);

    try {
      await authService.forgotPassword(email);
      setInfoMessage("Password reset email has been sent. Please check your inbox.");
    } catch (error) {
      handleApiError(error);
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
            <h2>Forgot Password</h2>
            <p>Enter your email and we&apos;ll send you a password reset link.</p>

            {errorMessage && <Alert variant="danger">{errorMessage}</Alert>}
            {infoMessage && <Alert variant="info">{infoMessage}</Alert>}

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
                  "Send reset link"
                )}
              </Button>
            </Form>

            <p className="auth-footer">
              Remember your password?{" "}
              <Link to="/auth/login" className="text-primary">
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}