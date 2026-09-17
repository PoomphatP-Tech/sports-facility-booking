import axios from "axios";
import { firebaseAuth } from "../config/firebase";
import type { ApiError } from "./types";
import { API_URL } from "../config/api";

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(async (config) => {
  const currentUser = firebaseAuth.currentUser;
  if (currentUser) {
    const token = await currentUser.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(toApiError(error))
);

export function toApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as ApiError) ?? { message: error.message };
  }
  return { message: "Unknown error" };
}
