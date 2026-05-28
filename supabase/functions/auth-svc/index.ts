import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getTraceId } from "../_shared/trace-id.ts";
import { jsonOk, jsonError } from "../_shared/error-envelope.ts";
import { CORS_HEADERS } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { verifyBearer } from "../_shared/auth.ts";
import { log } from "../_shared/logger.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const APP_URL = Deno.env.get("APP_URL") ?? "";

function anonClient() {
  return createClient(SUPABASE_URL, ANON_KEY);
}

function serviceClient() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
}

function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

// ─── Route dispatch ──────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const t0 = Date.now();
  const traceId = getTraceId(req);

  const url = new URL(req.url);
  // Strip function prefix: /functions/v1/auth-svc/auth/signup → /auth/signup
  const path = url.pathname.replace(/^\/functions\/v1\/auth-svc/, "");
  const method = req.method;

  let status = 200;
  let userId: string | undefined;

  try {
    if (method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: { "X-Trace-Id": traceId, ...CORS_HEADERS },
      });
    }

    if (method === "POST" && path === "/auth/signup") {
      return await handleSignup(req, traceId);
    }
    if (method === "POST" && path === "/auth/login") {
      return await handleLogin(req, traceId);
    }
    if (method === "POST" && path === "/auth/refresh") {
      return await handleRefresh(req, traceId);
    }
    if (method === "POST" && path === "/auth/logout") {
      return await handleLogout(req, traceId, (id) => { userId = id; });
    }
    if (method === "POST" && path === "/auth/forgot-password") {
      return await handleForgotPassword(req, traceId);
    }
    if (method === "POST" && path === "/auth/reset-password") {
      return await handleResetPassword(req, traceId, (id) => { userId = id; });
    }

    status = 404;
    return jsonError("NOT_FOUND", "Endpoint not found", traceId, 404);
  } catch (err) {
    status = 500;
    console.error(JSON.stringify({ level: "error", trace_id: traceId, err: String(err) }));
    return jsonError("INTERNAL_ERROR", "An unexpected error occurred", traceId, 500);
  } finally {
    log({
      level: status >= 500 ? "error" : "info",
      service: "auth-svc",
      trace_id: traceId,
      user_id: userId,
      endpoint: `${method} ${path}`,
      status_code: status,
      duration_ms: Date.now() - t0,
    });
  }
});

// ─── Handlers ────────────────────────────────────────────────────────────────

async function handleSignup(req: Request, traceId: string): Promise<Response> {
  const allowed = await checkRateLimit(serviceClient(), {
    endpoint: "auth.signup",
    key: clientIp(req),
    limit: 10,
    windowMinutes: 1,
  });
  if (!allowed) {
    return jsonError("RATE_LIMIT_EXCEEDED", "Too many signup attempts. Try again in a minute.", traceId, 429);
  }

  let body: { email?: unknown; password?: unknown; fullName?: unknown; role?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonError("INVALID_BODY", "Request body must be valid JSON", traceId, 400);
  }

  const { email, password, fullName, role } = body;

  if (typeof email !== "string" || !email.includes("@")) {
    return jsonError("VALIDATION_ERROR", "Valid email address required", traceId, 400);
  }
  if (typeof password !== "string" || password.length < 8) {
    return jsonError("VALIDATION_ERROR", "Password must be at least 8 characters", traceId, 400);
  }
  if (typeof fullName !== "string" || fullName.trim().length < 2) {
    return jsonError("VALIDATION_ERROR", "Full name required (minimum 2 characters)", traceId, 400);
  }

  // G1: student self-signup blocked at the endpoint; DB trigger provides defence in depth
  if (role === "student") {
    return jsonError(
      "SIGNUP_STUDENT_BLOCKED",
      "Student accounts can only be created by a parent or via invitation.",
      traceId,
      422,
    );
  }

  const { error } = await anonClient().auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName.trim(), role: "parent" } },
  });

  if (error) {
    // Treat "already registered" as success to prevent user enumeration
    if (error.message.toLowerCase().includes("already registered")) {
      return jsonOk({ message: "Check your email to confirm your account." }, traceId);
    }
    return jsonError("SIGNUP_FAILED", error.message, traceId, 400);
  }

  return jsonOk({ message: "Check your email to confirm your account." }, traceId);
}

async function handleLogin(req: Request, traceId: string): Promise<Response> {
  const allowed = await checkRateLimit(serviceClient(), {
    endpoint: "auth.login",
    key: clientIp(req),
    limit: 10,
    windowMinutes: 1,
  });
  if (!allowed) {
    return jsonError("RATE_LIMIT_EXCEEDED", "Too many login attempts. Try again in a minute.", traceId, 429);
  }

  let body: { email?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonError("INVALID_BODY", "Request body must be valid JSON", traceId, 400);
  }

  if (typeof body.email !== "string" || typeof body.password !== "string") {
    return jsonError("VALIDATION_ERROR", "Email and password required", traceId, 400);
  }

  const { data, error } = await anonClient().auth.signInWithPassword({
    email: body.email,
    password: body.password,
  });

  if (error || !data.session) {
    return jsonError("INVALID_CREDENTIALS", "Incorrect email or password.", traceId, 401);
  }

  return jsonOk({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
    role: (data.user?.app_metadata?.["role"] as string | undefined) ?? "parent",
  }, traceId);
}

async function handleRefresh(req: Request, traceId: string): Promise<Response> {
  let body: { refresh_token?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonError("INVALID_BODY", "Request body must be valid JSON", traceId, 400);
  }

  if (typeof body.refresh_token !== "string") {
    return jsonError("VALIDATION_ERROR", "refresh_token required", traceId, 400);
  }

  const { data, error } = await anonClient().auth.refreshSession({
    refresh_token: body.refresh_token,
  });

  if (error || !data.session) {
    return jsonError("REFRESH_FAILED", "Invalid or expired refresh token.", traceId, 401);
  }

  return jsonOk({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
  }, traceId);
}

async function handleLogout(
  req: Request,
  traceId: string,
  setUserId: (id: string) => void,
): Promise<Response> {
  const auth = await verifyBearer(req, serviceClient());
  if (!auth) {
    return jsonError("UNAUTHORIZED", "Valid Bearer token required", traceId, 401);
  }
  setUserId(auth.user.id);

  // Scope signOut to this user's session via their token
  const scoped = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${auth.token}` } },
  });

  const { error } = await scoped.auth.signOut();
  if (error) {
    return jsonError("LOGOUT_FAILED", error.message, traceId, 400);
  }

  return new Response(null, { status: 204, headers: { "X-Trace-Id": traceId, "Access-Control-Allow-Origin": CORS_HEADERS["Access-Control-Allow-Origin"] } });
}

async function handleForgotPassword(req: Request, traceId: string): Promise<Response> {
  // 3 attempts per hour per IP (arch §4.13)
  const allowed = await checkRateLimit(serviceClient(), {
    endpoint: "auth.forgot-password",
    key: clientIp(req),
    limit: 3,
    windowMinutes: 60,
  });
  if (!allowed) {
    return jsonError("RATE_LIMIT_EXCEEDED", "Too many reset requests. Try again in an hour.", traceId, 429);
  }

  let body: { email?: unknown; redirectTo?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonError("INVALID_BODY", "Request body must be valid JSON", traceId, 400);
  }

  if (typeof body.email !== "string") {
    return jsonError("VALIDATION_ERROR", "Email required", traceId, 400);
  }

  const redirectTo = typeof body.redirectTo === "string"
    ? body.redirectTo
    : `${APP_URL}/reset-password`;

  // Fire-and-forget — always 200 to prevent user enumeration
  await anonClient().auth.resetPasswordForEmail(body.email, { redirectTo });

  return jsonOk(
    { message: "If that email is registered, you'll receive a reset link shortly." },
    traceId,
  );
}

async function handleResetPassword(
  req: Request,
  traceId: string,
  setUserId: (id: string) => void,
): Promise<Response> {
  const auth = await verifyBearer(req, serviceClient());
  if (!auth) {
    return jsonError("UNAUTHORIZED", "Valid Bearer token required (use the link from your email)", traceId, 401);
  }
  setUserId(auth.user.id);

  let body: { password?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonError("INVALID_BODY", "Request body must be valid JSON", traceId, 400);
  }

  if (typeof body.password !== "string" || body.password.length < 8) {
    return jsonError("VALIDATION_ERROR", "Password must be at least 8 characters", traceId, 400);
  }

  // Update via scoped client so only this user's session is used
  const scoped = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${auth.token}` } },
  });

  const { error } = await scoped.auth.updateUser({ password: body.password });
  if (error) {
    return jsonError("RESET_FAILED", error.message, traceId, 400);
  }

  return jsonOk({ message: "Password updated successfully." }, traceId);
}
