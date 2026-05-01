import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const CLAIM_FLAG_PREFIX = "fp_legacy_claimed_";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const claimedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // 1. Listener FIRST (avoids missing events during init)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      // One-shot legacy data migration on first sign-in per user/device
      const uid = newSession?.user?.id;
      if (uid && !claimedRef.current.has(uid)) {
        claimedRef.current.add(uid);
        const flagKey = CLAIM_FLAG_PREFIX + uid;
        if (!localStorage.getItem(flagKey)) {
          // defer so we don't block auth state propagation
          setTimeout(async () => {
            const { error } = await supabase.rpc("claim_legacy_data" as any);
            if (!error) {
              localStorage.setItem(flagKey, "1");
              toast.success("Dados antigos migrados para sua conta");
            }
          }, 0);
        }
      }
    });

    // 2. THEN check existing session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
