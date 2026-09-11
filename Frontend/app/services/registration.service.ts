import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  type User as FirebaseUser,
} from "firebase/auth";
import { firebaseAuth } from "../config/firebase";
import { authService } from "./auth.service";
import { loadAuthSession } from "./auth-session.service";
import type { ApiError, RegisterCredentialsResponse } from "./types";

export async function getRegistrationUser(
  email: string,
  password: string,
): Promise<FirebaseUser> {
  await firebaseAuth.authStateReady();
  const normalizedEmail = email.trim().toLowerCase();
  const currentUser = firebaseAuth.currentUser;

  if (currentUser?.email?.toLowerCase() === normalizedEmail) return currentUser;

  try {
    const credential = await createUserWithEmailAndPassword(
      firebaseAuth, normalizedEmail, password,
    );
    return credential.user;
  } catch (error) {
    if ((error as { code?: string }).code !== "auth/email-already-in-use") {
      throw error;
    }

    const credential = await signInWithEmailAndPassword(
      firebaseAuth, normalizedEmail, password,
    );
    return credential.user;
  }
}

export async function syncRegistration(
  firebaseUser: FirebaseUser,
): Promise<RegisterCredentialsResponse> {
  await firebaseUser.reload();
  await firebaseUser.getIdToken(true);
  if (!firebaseUser.email) throw new Error("User email not found. Please log in again.");

  const token = await firebaseUser.getIdTokenResult();
  if (token.signInProvider === "google.com") {
    const session = await loadAuthSession(firebaseUser);
    return { ...session, nextStep: session.nextStep ?? "complete", message: "" };
  }

  const result = await authService.registerCredentials({
    firebaseUid: firebaseUser.uid,
    email: firebaseUser.email,
  });
  if (!result.user) throw new Error("Registration could not be restored. Please try again.");

  if (!firebaseUser.emailVerified) {
    try {
      const session = await authService.me();
      return { ...result, ...session, nextStep: session.nextStep ?? "complete" };
    } catch (error) {
      if ((error as ApiError).message !== "email is not verified") throw error;
      return { ...result, nextStep: "verifyEmail" };
    }
  }

  return {
    ...result,
    nextStep: result.user.role !== "member" || result.nextStep === "complete" ? "complete" : "details",
  };
}
