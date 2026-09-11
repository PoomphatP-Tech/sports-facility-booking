import { signOut } from "firebase/auth";
import { firebaseAuth } from "../config/firebase";
import { api } from "./http";
import type { ApiError, MeResponse } from "./types";

export async function clearIncompleteLoginSession(
  isActive: () => boolean = () => true,
): Promise<boolean> {
  await firebaseAuth.authStateReady();
  const entryUser = firebaseAuth.currentUser;
  if (!entryUser || !isActive()) return false;

  let incomplete = false;
  try {
    const { data } = await api.get<MeResponse>("/auth/me");
    incomplete = data.user.role === "member" && data.nextStep === "details";
  } catch (error) {
    const message = (error as ApiError)?.message;
    if (message !== "user not registered in system" && message !== "email is not verified") {
      throw error;
    }
    incomplete = true;
  }

  if (!incomplete || !isActive() || firebaseAuth.currentUser !== entryUser) return false;
  await signOut(firebaseAuth);
  return true;
}
