/**
 * useChildProfile — Load parent's linked child profile
 *
 * Assumes profiles table has parent_id field.
 * If missing, returns clear error message.
 */

import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../context/AuthContext";
import type { ChildProfile } from "../types/parent-dashboard.types";

export interface UseChildProfileReturn {
  status: "idle" | "loading" | "error" | "success";
  child: ChildProfile | null;
  error: string | null;
  reload: () => void;
}

export function useChildProfile(): UseChildProfileReturn {
  const { user } = useAuth();
  const [status, setStatus] = useState<
    "idle" | "loading" | "error" | "success"
  >("idle");
  const [child, setChild] = useState<ChildProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!user) {
      setStatus("error");
      setError("Not authenticated");
      return;
    }

    setStatus("loading");
    setError(null);

    try {
      // Look for child linked to this parent
      // Assumes profiles.parent_id references parent user
      const { data, error: err } = await supabase
        .from("profiles")
        .select("id, full_name, year_level, email")
        .eq("parent_id", user.id)
        .single();

      if (err) {
        // Check if it's a missing parent_id field
        if (err.message.includes("parent_id")) {
          throw new Error(
            "Parent-child linkage not configured. Contact administrator to link your account to your child's profile.",
          );
        }
        throw err;
      }

      if (!data) {
        throw new Error(
          "No child profile linked to your account. Contact administrator to configure access.",
        );
      }

      setChild(data as ChildProfile);
      setStatus("success");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load child profile";
      setError(message);
      setStatus("error");
    }
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  return {
    status,
    child,
    error,
    reload: load,
  };
}
