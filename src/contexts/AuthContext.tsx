import { createContext, useContext, ReactNode } from "react";

interface AuthContextType {
  user: null;
  session: null;
  loading: false;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: false,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthContext.Provider value={{ user: null, session: null, loading: false, signOut: async () => {} }}>
      {children}
    </AuthContext.Provider>
  );
}
