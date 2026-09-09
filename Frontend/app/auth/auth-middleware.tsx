import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { firebaseAuth } from "~/config/firebase";
import { api } from "~/services/http";
import type { User } from "~/services/types";

const AuthContext = createContext<{
  user: User | null;
  loading: boolean;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
} | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      firebaseAuth,
      async (firebaseUser: FirebaseUser | null) => {
        setLoading(true);
        if (!firebaseUser) {
          setUser(null);
          setLoading(false);
          return;
        }

        try {
          await firebaseUser.getIdToken(true);

          const { data } = await api.get<{ user: User }>("/auth/me");

          if (data.user.role === "member" && !firebaseUser.emailVerified) {
            setUser(null);
            return;
          }

          setUser(data.user);
        } catch {
          setUser(null);
        } finally {
          setLoading(false);
        }
      },
    );

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext)!;