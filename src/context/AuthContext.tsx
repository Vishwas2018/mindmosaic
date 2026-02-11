/**
 * MindMosaic — Auth Context (FIXED v2)
 *
 * Real Supabase Auth session management.
 *
 * Fixes:
 * - Proper loading state management during sign-in
 * - No safety timeout interfering with auth flow
 * - Clear console logging for debugging
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
        console.log("[AuthContext] Fetching profile for:", userId);

        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();

        if (error) {
          console.warn("[AuthContext] Profile not found:", error.message);
          setProfile(null);
          setRole(null);
          return null;
        }

        console.log("[AuthContext] Profile loaded:", data.role);
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
    setIsLoading(true);
    console.log("[AuthContext] Initializing auth state.");

    const initAuth = async () => {
      try {
        const {
          data: { session: currentSession },
          error,
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          console.error("[AuthContext] Session error:", error.message);
          setSession(null);
          setUser(null);
          setProfile(null);
          setRole(null);
          setIsLoading(false);
          return;
        }

        const currentUser = currentSession?.user ?? null;
        setSession(currentSession);
        setUser(currentUser);

        if (currentUser) {
          void fetchProfile(currentUser.id);
        } else {
          setProfile(null);
          setRole(null);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
          console.log("[AuthContext] Initial auth sync complete.");
        }
      }
    };

    void initAuth();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;

      console.log(
        "[AuthContext] Auth state changed:",
        event,
        newSession ? "session exists" : "no session",
      );

      const currentUser = newSession?.user ?? null;
      setSession(newSession);
      setUser(currentUser);

      if (currentUser) {
        void fetchProfile(currentUser.id);
      } else {
        setProfile(null);
        setRole(null);
      }

      // Never block UI loading state on profile fetch inside auth callback.
      setIsLoading(false);
      console.log("[AuthContext] Auth state processed. Loading finished.");
    });

    return () => {
      mounted = false;
      console.log("[AuthContext] Cleaning up auth listener.");
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // Sign in
  const signIn = useCallback(async (email: string, password: string) => {
    console.log("[AuthContext] Sign in attempt for:", email);
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("[AuthContext] Sign in error:", error.message);
      setIsLoading(false);
    } else {
      console.log("[AuthContext] Sign in successful");
    }

    return { error };
  }, []);

  // Sign up
  const signUp = useCallback(async (email: string, password: string) => {
    console.log("[AuthContext] Sign up attempt for:", email);
    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      console.error("[AuthContext] Sign up error:", error.message);
    } else {
      console.log("[AuthContext] Sign up successful");
    }

    return { error };
  }, []);

  // Sign out
  const signOut = useCallback(async () => {
    console.log("[AuthContext] Sign out");
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setRole(null);
  }, []);

  // Refresh profile
  const refreshProfile = useCallback(async () => {
    if (user) {
      console.log("[AuthContext] Refreshing profile");
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
