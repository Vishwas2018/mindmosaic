/**
 * MindMosaic — Authentication
 * --------------------------------------------------------------------------
 * Standalone screen (no portal shell). Single component with tabbed
 * sign-in / sign-up. Validates emails and password length client-side; real
 * auth is wired by the parent via `onSubmit`.
 *
 * Layout: split panel on lg+ — left side carries the brand and value props,
 * right side carries the form. Mobile: form-only with brand on top.
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  ArrowRight,
  Check,
  AlertCircle,
} from "lucide-react";
import { Logo, Wordmark, Favicon } from "../shell.jsx";

const SOCIAL_PROVIDERS = [
  { id: "google",   label: "Continue with Google",   bg: "bg-white border border-slate-200 text-slate-800 hover:bg-slate-50" },
  { id: "apple",    label: "Continue with Apple",    bg: "bg-slate-900 text-white hover:bg-slate-800" },
];

const VALUE_PROPS = [
  "NAPLAN & ICAS aligned diagnostics for K–9",
  "Personalised practice that adapts to your child",
  "Weekly reports parents and teachers actually read",
];

/** Email check tight enough for client-side; server still validates. */
function isValidEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function PasswordRule({ ok, children }) {
  return (
    <li className={"flex items-center gap-1.5 text-xs " + (ok ? "text-emerald-600" : "text-slate-400")}>
      <Check className={"h-3 w-3 " + (ok ? "opacity-100" : "opacity-30")} strokeWidth={3} />
      {children}
    </li>
  );
}

function FieldError({ children }) {
  if (!children) return null;
  return (
    <p className="mt-1.5 flex items-center gap-1 text-xs text-rose-600">
      <AlertCircle className="h-3 w-3" strokeWidth={2.25} />
      {children}
    </p>
  );
}

function Input({ id, label, icon: Icon, error, type = "text", ...rest }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="relative">
        {Icon ? (
          <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={2} />
        ) : null}
        <input
          id={id}
          type={type}
          className={
            "h-11 w-full rounded-lg border bg-white pr-3 text-sm text-slate-800 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-4 " +
            (Icon ? "pl-10 " : "pl-3 ") +
            (error
              ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
              : "border-slate-200 focus:border-violet-300 focus:ring-violet-100")
          }
          {...rest}
        />
      </div>
      <FieldError>{error}</FieldError>
    </div>
  );
}

function PasswordInput({ id, label, value, onChange, error, autoComplete = "current-password" }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="relative">
        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={2} />
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          className={
            "h-11 w-full rounded-lg border bg-white pl-10 pr-10 text-sm text-slate-800 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-4 " +
            (error
              ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
              : "border-slate-200 focus:border-violet-300 focus:ring-violet-100")
          }
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/30"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      <FieldError>{error}</FieldError>
    </div>
  );
}

function SocialButtons({ onClick }) {
  return (
    <div className="space-y-2">
      {SOCIAL_PROVIDERS.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onClick?.(p.id)}
          className={
            "flex h-11 w-full items-center justify-center gap-2.5 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100 active:scale-[0.99] " +
            p.bg
          }
        >
          <SocialIcon id={p.id} />
          {p.label}
        </button>
      ))}
    </div>
  );
}

function SocialIcon({ id }) {
  if (id === "google") {
    return (
      <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M22 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.6c-.2 1.3-1 2.4-2 3.1v2.6h3.3c1.9-1.8 3.1-4.4 3.1-7.6z" fill="#4285F4" />
        <path d="M12 22c2.7 0 5-.9 6.7-2.4l-3.3-2.6c-.9.6-2.1 1-3.4 1-2.6 0-4.8-1.7-5.6-4.1H3v2.6C4.7 19.7 8.1 22 12 22z" fill="#34A853" />
        <path d="M6.4 13.9c-.2-.6-.3-1.2-.3-1.9s.1-1.3.3-1.9V7.5H3C2.4 8.9 2 10.4 2 12s.4 3.1 1 4.5l3.4-2.6z" fill="#FBBC05" />
        <path d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9C16.9 2.9 14.7 2 12 2 8.1 2 4.7 4.3 3 7.5l3.4 2.6c.8-2.4 3-4.1 5.6-4.1z" fill="#EA4335" />
      </svg>
    );
  }
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.6 12.7c0-2.6 2.1-3.9 2.2-3.9-1.2-1.7-3-2-3.7-2-1.6-.2-3 .9-3.8.9-.8 0-2-.9-3.3-.9C7.3 6.9 5.7 8 4.8 9.8c-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.8 2.5 3 2.4 1.2-.1 1.7-.8 3.1-.8s1.9.8 3.1.8c1.3 0 2.1-1.2 2.9-2.4.9-1.4 1.3-2.7 1.3-2.8-.1-.1-2.6-1-2.6-3.9zM15.1 4.6C15.8 3.7 16.3 2.4 16.2 1c-1.2.1-2.6.8-3.4 1.7-.7.8-1.3 2.1-1.1 3.4 1.3.1 2.7-.7 3.4-1.5z"/>
    </svg>
  );
}

/* ============================================================================
 * AUTH FORMS
 * ========================================================================== */

function SignInForm({ onSubmit }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const next = {};
    if (!email) next.email = "Required.";
    else if (!isValidEmail(email)) next.email = "Enter a valid email.";
    if (!password) next.password = "Required.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setSubmitting(true);
    Promise.resolve(onSubmit?.({ kind: "signin", email, password }))
      .finally(() => setSubmitting(false));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <Input
        id="signin-email"
        label="Email"
        icon={Mail}
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
      />
      <PasswordInput
        id="signin-password"
        label="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
      />
      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2 text-slate-600">
          <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-violet-700 focus:ring-violet-500" />
          Remember me
        </label>
        <button type="button" className="font-medium text-violet-700 hover:text-violet-800">
          Forgot password?
        </button>
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-violet-700 px-5 text-sm font-semibold text-white shadow-[0_4px_12px_-2px_rgba(91,33,182,0.35)] transition-all hover:bg-violet-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-violet-400"
      >
        {submitting ? "Signing in…" : "Sign in"}
        <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
      </button>
    </form>
  );
}

function SignUpForm({ onSubmit }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const has8 = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasUpper = /[A-Z]/.test(password);

  const handleSubmit = (e) => {
    e.preventDefault();
    const next = {};
    if (!name.trim()) next.name = "Required.";
    if (!email) next.email = "Required.";
    else if (!isValidEmail(email)) next.email = "Enter a valid email.";
    if (!password) next.password = "Required.";
    else if (!(has8 && hasNumber && hasUpper)) next.password = "Doesn't meet requirements.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setSubmitting(true);
    Promise.resolve(onSubmit?.({ kind: "signup", name, email, password }))
      .finally(() => setSubmitting(false));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <Input
        id="signup-name"
        label="Full name"
        icon={UserIcon}
        placeholder="Your name"
        autoComplete="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
      />
      <Input
        id="signup-email"
        label="Email"
        icon={Mail}
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
      />
      <PasswordInput
        id="signup-password"
        label="Password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
      />
      <ul className="space-y-1">
        <PasswordRule ok={has8}>At least 8 characters</PasswordRule>
        <PasswordRule ok={hasNumber}>Contains a number</PasswordRule>
        <PasswordRule ok={hasUpper}>Contains an uppercase letter</PasswordRule>
      </ul>
      <p className="text-xs text-slate-500">
        By creating an account, you agree to our <a href="#" className="font-medium text-violet-700 hover:text-violet-800">Terms</a> and <a href="#" className="font-medium text-violet-700 hover:text-violet-800">Privacy Policy</a>.
      </p>
      <button
        type="submit"
        disabled={submitting}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-violet-700 px-5 text-sm font-semibold text-white shadow-[0_4px_12px_-2px_rgba(91,33,182,0.35)] transition-all hover:bg-violet-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-violet-400"
      >
        {submitting ? "Creating account…" : "Create account"}
        <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
      </button>
    </form>
  );
}

/* ============================================================================
 * AUTH PAGE
 * ========================================================================== */

export default function AuthenticationPage({ initialTab = "signin", onSubmit, onSocial }) {
  const [tab, setTab] = useState(initialTab);

  return (
    <div className="min-h-screen bg-slate-50/60 font-sans text-slate-900 antialiased">
      <Favicon />
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Brand panel */}
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-violet-700 p-10 text-white lg:flex">
          <div className="pointer-events-none absolute -top-24 -right-12 h-72 w-72 rounded-full bg-orange-500/30 blur-3xl" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-24 -left-12 h-72 w-72 rounded-full bg-violet-900/40 blur-3xl" aria-hidden="true" />

          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-white/10 p-2 backdrop-blur-sm">
                <Logo size={36} />
              </div>
              <span className="text-xl font-semibold tracking-tight">
                <span className="text-white">Mind</span>
                <span className="text-orange-300">Mosaic</span>
              </span>
            </div>
          </div>

          <div className="relative max-w-md">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-orange-300">
              Built for Australian K–9 learners
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight leading-tight">
              The smartest way to prepare for NAPLAN, ICAS, and beyond.
            </h1>
            <ul className="mt-7 space-y-3">
              {VALUE_PROPS.map((v) => (
                <li key={v} className="flex items-start gap-3 text-sm text-white/85">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-500/20 text-orange-200">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  {v}
                </li>
              ))}
            </ul>
          </div>

          <p className="relative text-xs text-white/60">© {new Date().getFullYear()} MindMosaic. All rights reserved.</p>
        </aside>

        {/* Form panel */}
        <section className="flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-14">
          {/* Mobile brand */}
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <Logo size={32} />
            <Wordmark className="text-lg" />
          </div>

          <div className="mx-auto w-full max-w-sm">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              {tab === "signin" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {tab === "signin"
                ? "Sign in to continue your learning journey."
                : "Start with a free diagnostic — no card required."}
            </p>

            {/* Tab switch */}
            <div role="tablist" aria-label="Authentication mode" className="mt-6 inline-flex rounded-lg bg-slate-100 p-1">
              {[
                { id: "signin", label: "Sign in" },
                { id: "signup", label: "Sign up" },
              ].map((t) => {
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setTab(t.id)}
                    className={
                      "rounded-md px-4 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/30 " +
                      (active
                        ? "bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.06)]"
                        : "text-slate-500 hover:text-slate-700")
                    }
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-6">
              <SocialButtons onClick={onSocial} />
              <div className="my-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-slate-200" />
                <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-slate-400">or</span>
                <span className="h-px flex-1 bg-slate-200" />
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                >
                  {tab === "signin" ? <SignInForm onSubmit={onSubmit} /> : <SignUpForm onSubmit={onSubmit} />}
                </motion.div>
              </AnimatePresence>
            </div>

            <p className="mt-6 text-center text-sm text-slate-500">
              {tab === "signin" ? (
                <>
                  New to MindMosaic?{" "}
                  <button onClick={() => setTab("signup")} className="font-semibold text-violet-700 hover:text-violet-800">
                    Create an account
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button onClick={() => setTab("signin")} className="font-semibold text-violet-700 hover:text-violet-800">
                    Sign in
                  </button>
                </>
              )}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
