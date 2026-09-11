import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "./auth-middleware";
import { Form, Button, Alert, Spinner } from "react-bootstrap";
import { sendEmailVerification } from "firebase/auth";
import { firebaseAuth } from "../config/firebase";
import "./auth.css";
import { authService } from "~/services/auth.service";
import { getRegistrationUser, syncRegistration } from "~/services/registration.service";
import {
  APP_BRAND_NAME,
  APP_BRAND_SUBTITLE,
  APP_BRAND_TAGLINE,
} from "~/constants/app.constants";
import type { ApiError, RegisterCredentialsResponse } from "~/services/types";

type UiStep = 1 | 2 | 3;

const passwordRules = [
  { label: "At least 8 characters", test: (value: string) => Array.from(value).length >= 8 },
  { label: "One lowercase letter (a-z)", test: (value: string) => /[a-z]/.test(value) },
  { label: "One uppercase letter (A-Z)", test: (value: string) => /[A-Z]/.test(value) },
  { label: "One special character (e.g. !@#)", test: (value: string) => /[\p{P}\p{S}]/u.test(value) },
];

export default function Register() {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const [step, setStep] = useState<UiStep>(1);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [address, setAddress] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordTouched, setPasswordTouched] = useState(false);

  const passwordChecks = passwordRules.map((rule) => ({ ...rule, met: rule.test(password) }));
  const passwordValid = passwordChecks.every((rule) => rule.met);
  const showPasswordWarning = passwordTouched && !passwordValid;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  const applyRegistration = useCallback((result: RegisterCredentialsResponse) => {
    if (result.user) {
      setFirstName(result.user.firstName ?? "");
      setLastName(result.user.lastName ?? "");
      setDateOfBirth(result.user.dateOfBirth ?? "");
      setAddress(result.user.address ?? "");
    }

    if (result.nextStep === "complete" && result.user) {
      setUser(result.user);
      const destination = result.user.role === "admin" ? "/admin"
        : result.user.role === "staff" ? "/staff/pending" : "/";
      navigate(destination, { replace: true });
      return;
    }
    setStep(result.nextStep === "verifyEmail" ? 2 : 3);
  }, [navigate, setUser]);

  const handleApiError = (error: unknown) => {
    const apiError = (error as ApiError & { code?: string }) ?? {
      message: "Something went wrong",
    };

    setErrorMessage(apiError.code === "auth/invalid-credential"
      ? "Email or password is incorrect. Please try again."
      : apiError.message || "Something went wrong");
  };

  const prepareSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setInfoMessage("");
  };

  useEffect(() => {
    let cancelled = false;

    async function restoreRegistration() {
      try {
        await firebaseAuth.authStateReady();
        const firebaseUser = firebaseAuth.currentUser;
        if (cancelled || !firebaseUser) return;

        setEmail(firebaseUser.email ?? "");
        setStep(firebaseUser.emailVerified ? 3 : 2);
        const result = await syncRegistration(firebaseUser);
        if (!cancelled) applyRegistration(result);
      } catch (error) {
        if (!cancelled) {
          setErrorMessage((error as ApiError).message || "Unable to resume registration. Please try again.");
        }
      } finally {
        if (!cancelled) setIsRestoring(false);
      }
    }

    void restoreRegistration();
    return () => { cancelled = true; };
  }, [applyRegistration]);

  const handleStep1Submit = async (e: React.FormEvent) => {
    prepareSubmit(e);

    setPasswordTouched(true);
    if (!passwordValid) return;

    if (password !== confirmPassword) {
      return setErrorMessage("Passwords do not match");
    }

    setIsSubmitting(true);

    try {
      const firebaseUser = await getRegistrationUser(email, password);
      setEmail(firebaseUser.email ?? email);
      // Allow retrying if database sync or email delivery fails.
      setStep(firebaseUser.emailVerified ? 3 : 2);
      setPassword("");
      setConfirmPassword("");

      const result = await syncRegistration(firebaseUser);
      applyRegistration(result);
      if (result.nextStep === "verifyEmail") {
        await sendEmailVerification(firebaseUser);
        setInfoMessage("Verification email sent. Please check your inbox.");
      }
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckVerification = async () => {
    setErrorMessage("");
    setInfoMessage("");
    setIsSubmitting(true);

    try {
      const firebaseUser = firebaseAuth.currentUser;
      if (!firebaseUser) throw new Error("User session not found. Please log in again.");
      const result = await syncRegistration(firebaseUser);
      if (result.nextStep === "verifyEmail") {
        return setErrorMessage("Please verify your email before continuing.");
      }
      applyRegistration(result);
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    setErrorMessage("");
    setInfoMessage("");
    setIsSubmitting(true);

    try {
      if (!firebaseAuth.currentUser) {
        return setErrorMessage("User session not found");
      }

      await sendEmailVerification(firebaseAuth.currentUser);

      setInfoMessage("Verification email has been resent.");
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStep3Submit = async (e: React.FormEvent) => {
    prepareSubmit(e);

    setIsSubmitting(true);

    try {
      const firebaseUser = firebaseAuth.currentUser;
      if (!firebaseUser) throw new Error("User session not found. Please log in again.");
      const progress = await syncRegistration(firebaseUser);
      if (progress.nextStep === "verifyEmail") {
        setStep(2);
        return setErrorMessage("Please verify your email before continuing.");
      }
      const { user } = await authService.completeRegister({
        firstName,
        lastName,
        dateOfBirth,
        address,
      });

      setUser(user);
      alert("Profile completed successfully");
      navigate("/");
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
          <h2>{step === 3 ? "Complete your profile" : step === 2 ? "Verify your email" : "Create Account"}</h2>
          <p>{step === 3 ? "Add your details to finish setting up your account" : step === 2 ? "Check your inbox to continue" : "Sign up for your sports centre account"}</p>

          {errorMessage && <Alert variant="danger">{errorMessage}</Alert>}
          {infoMessage && <Alert variant="info">{infoMessage}</Alert>}

          {isRestoring && <p role="status">Resuming registration...</p>}

          {!isRestoring && step === 1 && (
            <Form onSubmit={handleStep1Submit} className="auth-form">
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

              <Form.Group className="mb-3" controlId="register-password">
                <Form.Label>Password</Form.Label>
                <Form.Control
                  type="password"
                  name="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setPasswordTouched(true)}
                  isInvalid={showPasswordWarning}
                  aria-invalid={showPasswordWarning}
                  aria-describedby={showPasswordWarning
                    ? "register-password-warning register-password-rules"
                    : "register-password-rules"}
                  placeholder="Enter your password"
                  required
                />
                {showPasswordWarning && (
                  <Form.Control.Feedback type="invalid" id="register-password-warning" role="alert">
                    Please meet all password requirements below.
                  </Form.Control.Feedback>
                )}
                <ul id="register-password-rules" className="auth-password-rules">
                  {passwordChecks.map((rule) => (
                    <li key={rule.label} className={rule.met
                      ? "text-success"
                      : showPasswordWarning ? "text-danger" : "text-secondary"}>
                      <span aria-hidden="true">{rule.met ? "✓" : "○"}</span>
                      <span>
                        <span className="visually-hidden">{rule.met ? "Met: " : "Required: "}</span>
                        {rule.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </Form.Group>

              <Form.Group className="mb-3" controlId="register-confirm-password">
                <Form.Label>Confirm Password</Form.Label>
                <Form.Control
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
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
                  "Next"
                )}
              </Button>
            </Form>
          )}

          {!isRestoring && step === 2 && (
            <div className="auth-form">
              <p className="text-muted mb-3">
                Please verify {email} to continue. If you have not received an
                email, use the resend button below.
              </p>

              <Button
                variant="primary"
                size="lg"
                type="button"
                className="w-100 mb-2"
                onClick={handleCheckVerification}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Spinner animation="border" size="sm" />
                ) : (
                  "I have verified my email"
                )}
              </Button>

              <Button
                variant="outline-secondary"
                size="sm"
                type="button"
                className="w-100"
                onClick={handleResendVerification}
                disabled={isSubmitting}
              >
                Resend verification email
              </Button>
            </div>
          )}

          {!isRestoring && step === 3 && (
            <Form onSubmit={handleStep3Submit} className="auth-form">
              <Form.Group className="mb-3">
                <Form.Label>First Name</Form.Label>
                <Form.Control
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Last Name</Form.Label>
                <Form.Control
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Date of Birth</Form.Label>
                <Form.Control
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Address</Form.Label>
                <Form.Control
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter your address"
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
                  "Complete Registration"
                )}
              </Button>
            </Form>
          )}

          <p className="auth-footer">
            Already have an account?{" "}
            <Link to="/auth/login" className="text-primary">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
