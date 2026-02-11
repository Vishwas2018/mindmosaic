/**
 * MindMosaic — Auth Context (FIXED)
 *
 * Real Supabase Auth session management.
 *
 * Fixes:
 * - Non-blocking initialization with safety timeout
 * - Graceful error handling
 * - Always exits loading state
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Session, User, AuthError } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { UserRole, Profile } from "../lib/database.types";

// =============================================================================
// Types
// =============================================================================

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: UserRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ error: AuthError | null }>;
  signUp: (
    email: string,
    password: string,
  ) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// =============================================================================
// Context
// =============================================================================

const AuthContext = createContext<AuthContextValue | null>(null);

// =============================================================================
// Provider
// =============================================================================

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user profile from profiles table
  const fetchProfile = useCallback(
    async (userId: string): Promise<UserRole | null> => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();

        if (error) {
          // Profile might not exist yet for new users
          console.warn("[AuthContext] Profile not found:", error.message);
          setProfile(null);
          setRole(null);
          return null;
        }

        setProfile(data);
        setRole(data.role);
        return data.role;
      } catch (err) {
        console.error("[AuthContext] Profile fetch error:", err);
        setProfile(null);
        setRole(null);
        return null;
      }
    },
    [],
  );

  // Initialize auth state
  useEffect(() => {
    let mounted = true;
    let initialized = false;

    const completeInit = () => {
      if (mounted && !initialized) {
        initialized = true;
        setIsLoading(false);
      }
    };

    const initAuth = async () => {
      try {
        const {
          data: { session: currentSession },
          error,
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          console.error("[AuthContext] Session error:", error.message);
          completeInit();
          return;
        }

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          await fetchProfile(currentSession.user.id);
        }

        completeInit();
      } catch (error) {
        console.error("[AuthContext] Init error:", error);
        completeInit();
      }
    };

    // Start initialization
    initAuth();

    // Safety: ensure loading ends within 3 seconds
    const safetyTimeout = setTimeout(completeInit, 3000);

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return;

      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        await fetchProfile(newSession.user.id);
      } else {
        setProfile(null);
        setRole(null);
      }

      completeInit();
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // Sign in
  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  }, []);

  // Sign up
  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error };
  }, []);

  // Sign out
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setRole(null);
  }, []);

  // Refresh profile
  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  const value: AuthContextValue = {
    session,
    user,
    profile,
    role,
    isLoading,
    isAuthenticated: !!session,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// =============================================================================
// Hooks
// =============================================================================

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useHasRole(allowedRoles: UserRole[]): boolean {
  const { role } = useAuth();
  return role !== null && allowedRoles.includes(role);
}
