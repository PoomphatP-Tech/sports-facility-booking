import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCI1sYEJwOVMcN1nZCZfTf_nn6EJ1F2xIw",
  authDomain: "web-application-2fe7b.firebaseapp.com",
  projectId: "web-application-2fe7b",
  storageBucket: "web-application-2fe7b.firebasestorage.app",
  messagingSenderId: "345021620284",
  appId: "1:345021620284:web:0ef2f99194f140a9c9e339",
  measurementId: "G-C5S9LWTDBN",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();