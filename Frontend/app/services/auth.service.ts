import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { firebaseAuth, googleProvider } from "../config/firebase";
import { api } from "./http";
import type {
  User,
  CompleteRegisterRequest,
  CompleteRegisterResponse,
  RegisterCredentialsRequest,
  RegisterCredentialsResponse,
  SessionStatusResponse,
  MeResponse,
} from "./types";

export const authService = {
  registerCredentials: async (
    body: RegisterCredentialsRequest,
  ): Promise<RegisterCredentialsResponse> => {
    const { data } = await api.post<RegisterCredentialsResponse>(
      "/auth/register/credentials",
      body,
    );

    return data;
  },

  completeRegister: async (
    body: CompleteRegisterRequest,
  ): Promise<CompleteRegisterResponse> => {
    const { data } = await api.post<CompleteRegisterResponse>(
      "/auth/register/details",
      body,
    );

    return data;
  },

  login: async (email: string, password: string): Promise<{ user: User }> => {
    await signInWithEmailAndPassword(firebaseAuth, email, password);

    try {
      const { data } = await api.get<{ user: User }>("/auth/me");
      return data;
    } catch (err: unknown) {
      const msg = (err as { message?: string }).message;
      if (msg === "email is not verified") {
        const e = new Error("Email not verified") as Error & { code: string };
        e.code = "email-not-verified";
        throw e;
      }
      throw err;
    }
  },

  loginWithGoogle: async (): Promise<{ user: User; nextStep: string | null }> => {
    const credential = await signInWithPopup(firebaseAuth, googleProvider);
    const { uid, email, displayName } = credential.user;
    const [firstName, ...rest] = (displayName ?? "").split(" ");
    const { data } = await api.post<{ user: User; nextStep: string | null }>(
      "/auth/google-sync",
      { firebaseUid: uid, email, firstName: firstName || "", lastName: rest.join(" ") || "" }
    );
    return data;
  },

  logout: async (): Promise<void> => {
    await signOut(firebaseAuth);
  },

  me: async (): Promise<MeResponse> => {
    const { data } = await api.get<MeResponse>("/auth/me");
    return data;
  },

  checkLogin: async (): Promise<SessionStatusResponse> => {
    try {
      if (!firebaseAuth.currentUser) {
        return { isLoggedIn: false, isPendingStep3: false, user: null };
      }

      await firebaseAuth.currentUser.reload();

      if (!firebaseAuth.currentUser.emailVerified) {
        return { isLoggedIn: false, isPendingStep3: false, user: null };
      }

      const { data } = await api.get<SessionStatusResponse>("/auth/session");
      return data;
    } catch {
      return { isLoggedIn: false, isPendingStep3: false, user: null };
    }
  },

  forgotPassword: async (email: string): Promise<void> => {
    await sendPasswordResetEmail(firebaseAuth, email);
  },

  changePassword: async (
    currentPassword: string,
    newPassword: string,
  ): Promise<void> => {
    const currentUser = firebaseAuth.currentUser;

    if (!currentUser?.email) {
      throw new Error("Not logged in");
    }

    const credential = EmailAuthProvider.credential(
      currentUser.email,
      currentPassword,
    );

    await reauthenticateWithCredential(currentUser, credential);
    await updatePassword(currentUser, newPassword);
  },
};