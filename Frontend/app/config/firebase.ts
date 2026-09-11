import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAkYtCi398r-pofkIfNhVv_yaaOAj9EIW8",
  authDomain: "sports-facility-booking-d3d80.firebaseapp.com",
  projectId: "sports-facility-booking-d3d80",
  storageBucket: "sports-facility-booking-d3d80.firebasestorage.app",
  messagingSenderId: "187343654561",
  appId: "1:187343654561:web:45b31aac96d38a4331aae0",
  measurementId: "G-EHDV0HQ8PV",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();