import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { firebaseAuth } from "~/config/firebase";
import { loadAuthSession } from "~/services/auth-session.service";
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
    let active = true;
    let authVersion = 0;
    const unsubscribe = onAuthStateChanged(
      firebaseAuth,
      async (firebaseUser: FirebaseUser | null) => {
        const version = ++authVersion;
        const isCurrent = () => active && version === authVersion;
        setUser(null);
        if (!firebaseUser) {
          setUser(null);
          setLoading(false);
          return;
        }

        try {
          const data = await loadAuthSession(firebaseUser);
          if (!isCurrent()) return;

          setUser(data.user);
        } catch {
          if (isCurrent()) setUser(null);
        } finally {
          if (isCurrent()) setLoading(false);
        }
      },
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext)!;
