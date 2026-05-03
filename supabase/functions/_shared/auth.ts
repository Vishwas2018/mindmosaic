import { SupabaseClient, User } from "https://esm.sh/@supabase/supabase-js@2";

export async function verifyBearer(
  req: Request,
  serviceClient: SupabaseClient,
): Promise<{ user: User; token: string } | null> {
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const { data: { user }, error } = await serviceClient.auth.getUser(token);
  if (error || !user) return null;

  return { user, token };
}
