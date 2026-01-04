import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { logIn as apiSignIn, signUp as apiSignUp } from "../api/auth";

type AuthContextType = {
  token: string | null;
  email: string | null;
  loading: boolean;
  logIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAuth = async () => {
      try {
        const storedToken = await AsyncStorage.getItem("token");
        const storedEmail = await AsyncStorage.getItem("email");
        if (storedToken) {
          setToken(storedToken);
          setEmail(storedEmail);
        }
      } finally {
        setLoading(false);
      }
    };
    loadAuth();
  }, []);

  const logIn = async (email: string, password: string) => {
    const data = await apiSignIn(email, password);
    setToken(data.access_token);
    setEmail(email);
    await AsyncStorage.setItem("token", data.access_token);
    await AsyncStorage.setItem("email", email);
  };

  const signUp = async (email: string, password: string) => {
    await apiSignUp(email, password);
    await logIn(email, password);
  };

  const signOut = async () => {
    setToken(null);
    setEmail(null);
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("email");
  };

  return (
    <AuthContext.Provider
      value={{ token, email, loading, logIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
