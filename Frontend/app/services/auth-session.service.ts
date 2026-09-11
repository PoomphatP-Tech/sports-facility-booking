import type { User as FirebaseUser } from "firebase/auth";
import { firebaseAuth } from "../config/firebase";
import { api } from "./http";
import type { MeResponse } from "./types";

const pendingSessions = new WeakMap<FirebaseUser, Promise<MeResponse>>();

export function loadAuthSession(firebaseUser: FirebaseUser): Promise<MeResponse> {
  const pending = pendingSessions.get(firebaseUser);
  if (pending) return pending;

  const request = (async () => {
    const token = await firebaseUser.getIdTokenResult();
    const isCurrent = () => firebaseAuth.currentUser?.uid === firebaseUser.uid;
    if (!isCurrent()) throw new Error("The sign-in session changed. Please try again.");

    const { data } = token.signInProvider === "google.com"
      ? await api.post<MeResponse>("/auth/google-sync")
      : await api.get<MeResponse>("/auth/me");

    if (!isCurrent()) throw new Error("The sign-in session changed. Please try again.");
    return data;
  })().finally(() => {
    if (pendingSessions.get(firebaseUser) === request) pendingSessions.delete(firebaseUser);
  });
  pendingSessions.set(firebaseUser, request);
  return request;
}

export function getSessionDestination({ user, nextStep }: MeResponse): string {
  if (nextStep === "details") return "/auth/register?step=3";
  if (user.role === "admin") return "/admin";
  if (user.role === "staff") return "/staff/pending";
  return "/";
}
