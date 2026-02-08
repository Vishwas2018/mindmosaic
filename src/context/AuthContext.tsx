/**
 * MindMosaic — Auth Context (FIXED)
 *
 * Real Supabase Auth session management.
 * Provides user session, role, and auth state to the entire app.
 *
 * FIXES:
 * - Added timeout protection for hung auth calls
 * - Better error handling
 * - More defensive coding
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
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Failed to fetch profile:", error.message);
        setProfile(null);
        setRole(null);
        return;
      }

      setProfile(data);
      setRole(data.role);
    } catch (err) {
      console.error("Profile fetch error:", err);
      setProfile(null);
      setRole(null);
    }
  }, []);

  // Initialize auth state with timeout protection
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      console.log("[AuthContext] Starting auth initialization...");

      try {
        // Add a timeout to prevent infinite loading
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(
            () => reject(new Error("Auth initialization timeout")),
            10000,
          );
        });

        const authPromise = supabase.auth.getSession();

        const { data } = (await Promise.race([
          authPromise,
          timeoutPromise,
        ])) as Awaited<typeof authPromise>;

        if (!mounted) return;

        console.log("[AuthContext] Session fetched:", !!data.session);
        setSession(data.session);
        setUser(data.session?.user ?? null);

        if (data.session?.user) {
          console.log(
            "[AuthContext] Fetching profile for user:",
            data.session.user.id,
          );
          await fetchProfile(data.session.user.id);
        }
      } catch (error: any) {
        console.error("[AuthContext] Auth init failed:", error.message);
        if (!mounted) return;

        setSession(null);
        setUser(null);
        setProfile(null);
        setRole(null);
      } finally {
        if (mounted) {
          console.log("[AuthContext] Auth initialization complete");
          setIsLoading(false);
        }
      }
    };

    initAuth();

    // Set up auth state change listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[AuthContext] Auth state changed:", event);

      if (!mounted) return;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setRole(null);
      }

      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // Sign in with email and password
  const signIn = useCallback(async (email: string, password: string) => {
    console.log("[AuthContext] Attempting sign in for:", email);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("[AuthContext] Sign in error:", error.message);
    } else {
      console.log("[AuthContext] Sign in successful");
    }

    return { error };
  }, []);

  // Sign up with email and password
  const signUp = useCallback(async (email: string, password: string) => {
    console.log("[AuthContext] Attempting sign up for:", email);
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      console.error("[AuthContext] Sign up error:", error.message);
    } else {
      console.log("[AuthContext] Sign up successful");
    }

    return { error };
  }, []);

  // Sign out
  const signOut = useCallback(async () => {
    console.log("[AuthContext] Signing out");
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setRole(null);
  }, []);

  // Refresh profile (useful after profile updates)
  const refreshProfile = useCallback(async () => {
    if (user) {
      console.log("[AuthContext] Refreshing profile for:", user.id);
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
// Hook
// =============================================================================

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}

// =============================================================================
// Utility Hooks
// =============================================================================

/**
 * Hook to check if current user has a specific role
 */
export function useHasRole(allowedRoles: UserRole[]): boolean {
  const { role } = useAuth();
  return role !== null && allowedRoles.includes(role);
}

/**
 * Hook to get current user's year level (for student UX adaptation)
 * Returns null if not available or not a student
 */
export function useStudentYearLevel(): number | null {
  const { profile } = useAuth();
  return profile?.role === "student" ? null : null;
}
