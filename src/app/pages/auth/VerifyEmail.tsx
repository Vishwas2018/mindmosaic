/**
 * MindMosaic — Verify Email Page (Day 23)
 *
 * Shown after a user signs up and needs to verify their email.
 * Also handles the post-verification redirect when user clicks
 * the confirmation link in their email.
 *
 * Supabase handles the actual verification — this page just
 * provides user feedback.
 */

import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";

type VerifyState = "pending" | "confirmed" | "error";

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<VerifyState>("pending");

  // If there's a token_hash in the URL, Supabase is completing verification
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  useEffect(() => {
    if (!tokenHash || type !== "email") {
      // No token — user landed here directly (e.g. after signup).
      // Show "check your email" message.
      return;
    }

    const verifyEmail = async () => {
      try {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "email",
        });

        if (error) {
          console.error("[VerifyEmail] Verification error:", error.message);
          setState("error");
        } else {
          setState("confirmed");
        }
      } catch {
        setState("error");
      }
    };

    verifyEmail();
  }, [tokenHash, type]);

  // Post-verification: email confirmed
  if (state === "confirmed") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background-soft px-4">
        <div className="w-full max-w-md rounded-lg border border-border-subtle bg-white p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success-green/10">
            <span className="text-2xl text-success-green" aria-hidden="true">
              ✓
            </span>
          </div>
          <h1 className="mt-4 text-2xl font-bold text-text-primary">
            Email Verified
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Your email address has been confirmed. You can now log in to your
            account.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-block rounded-lg bg-primary-blue px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-blue-light"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  // Verification failed
  if (state === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background-soft px-4">
        <div className="w-full max-w-md rounded-lg border border-border-subtle bg-white p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-danger-red/10">
            <span className="text-2xl text-danger-red" aria-hidden="true">
              ✕
            </span>
          </div>
          <h1 className="mt-4 text-2xl font-bold text-text-primary">
            Verification Failed
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            This verification link is invalid or has expired. Please try signing
            up again or contact support.
          </p>
          <div className="mt-6 flex items-center justify-center gap-4">
            <Link
              to="/signup"
              className="rounded-lg bg-primary-blue px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-blue-light"
            >
              Sign Up
            </Link>
            <Link
              to="/contact"
              className="rounded-lg border border-border-subtle px-6 py-2.5 text-sm font-medium text-text-primary hover:bg-background-soft"
            >
              Contact Support
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Default: "check your email" state (arrived from signup)
  return (
    <div className="flex min-h-screen items-center justify-center bg-background-soft px-4">
      <div className="w-full max-w-md rounded-lg border border-border-subtle bg-white p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-blue/10">
          <span className="text-2xl" aria-hidden="true">
            ✉️
          </span>
        </div>
        <h1 className="mt-4 text-2xl font-bold text-text-primary">
          Check Your Email
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          We've sent a verification link to your email address. Click the link
          in the email to activate your account.
        </p>
        <p className="mt-4 text-sm text-text-muted">
          Didn't receive the email? Check your spam folder or{" "}
          <Link
            to="/signup"
            className="font-medium text-primary-blue hover:underline"
          >
            try signing up again
          </Link>
          .
        </p>
        <Link
          to="/login"
          className="mt-6 inline-block text-sm font-medium text-primary-blue hover:underline"
        >
          Back to Login
        </Link>
      </div>
    </div>
  );
}
