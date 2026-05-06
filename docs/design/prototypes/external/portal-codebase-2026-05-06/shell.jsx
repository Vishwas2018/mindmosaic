/**
 * MindMosaic — shared portal shell
 * --------------------------------------------------------------------------
 * The single home for everything reused across pages:
 *   - Brand:       <Logo />, <Wordmark />, <BrandLockup />, <Favicon />
 *   - Shell:       <AppShell />  — sidebar + top bar layout for portal routes
 *   - Primitives:  <Card />, <Pill />, <SectionTitle />, <Skeleton />
 *   - Hooks:       useCountUp
 *   - Marks:       <CheckMark />, <CrossMark />, <QuestionMark /> (marker-pen SVGs)
 *   - Tone tables: TONE_HEX, TONE_BADGE, TONE_TEXT, TONE_BAR_BG, TONE_ICON_BG
 *   - Helpers:     pctTone(), trendIcon(), trendText()
 *
 * AppShell API
 *   <AppShell
 *     role="student" | "parent" | "teacher" | "admin"
 *     active="dashboard"          // id of active main-nav item
 *     pageTitle="Dashboard"       // breadcrumb / top-bar title
 *     contextualSection={{        // per-page action group (optional)
 *       title: "Quick start",
 *       items: [{ id, icon, label, hint?, tone? }, ...]
 *     }}
 *     recentSection={{            // per-page recent items list (optional)
 *       title: "Recent results",
 *       items: [{ id, title, date, score, current? }, ...],
 *       actionLabel?: "See all"
 *     }}
 *     topBarSlot={...}            // optional extra topbar content
 *     user={{ name, role: "Year 7" | "Parent" | "Teacher · ...", plan? }}
 *   >
 *     {pageContent}
 *   </AppShell>
 *
 * Theme: Royal Purple (violet-700) + Royal Orange (orange-600). Flat colors.
 * Tailwind v3 default config required (no custom theme tokens).
 *
 * Peer deps: react ^18, framer-motion ^11, lucide-react.
 */

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  Bell,
  Search,
  Settings,
  Menu,
  X as XIcon,
  TrendingUp,
  TrendingDown,
  Minus,
  LayoutDashboard,
  GraduationCap,
  Pencil,
  ClipboardList,
  Trophy,
  Users,
  CreditCard,
  BarChart3,
  Building2,
  Shield,
  FileText,
  HelpCircle,
} from "lucide-react";

/* ============================================================================
 * BRAND — logo SVG + wordmark + favicon injector
 * ========================================================================== */

/**
 * The MindMosaic mark: a stylised brain split into two halves.
 *   - Left half (violet-700): geometric grid suggesting logic/circuitry.
 *   - Right half (orange-600): organic branching suggesting growth/learning.
 *   - A subtle vertical seam ties the halves together.
 *
 * Original artwork — not a trace of any external reference.
 * `size` controls both width and height; the SVG is square via viewBox padding
 * so it lines up cleanly with text in a flex row.
 */
export function Logo({ size = 32, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* ── Left half — violet ── */}
      <path
        d="M30 10
           C20 10 12 18 12 28
           C12 32 14 35 16 37
           C14 39 13 42 14 45
           C15 49 19 52 23 52
           C24 52 26 51 27 51
           C28 53 30 54 30 54
           Z"
        fill="#5B21B6"
      />
      {/* circuit dots + traces on the violet half */}
      <circle cx="20" cy="24" r="1.5" fill="#FFF" opacity="0.85" />
      <circle cx="22" cy="34" r="1.5" fill="#FFF" opacity="0.7" />
      <circle cx="18" cy="42" r="1.5" fill="#FFF" opacity="0.7" />
      <path
        d="M20 24 L20 30 L22 30 M22 34 L18 34 M18 42 L24 42 L24 38"
        stroke="#FFF"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.55"
      />

      {/* ── Right half — orange ── */}
      <path
        d="M34 10
           C44 10 52 18 52 28
           C52 32 50 35 48 37
           C50 39 51 42 50 45
           C49 49 45 52 41 52
           C40 52 38 51 37 51
           C36 53 34 54 34 54
           Z"
        fill="#EA580C"
      />
      {/* tree-like branches on the orange half */}
      <path
        d="M44 22 L40 26 M44 22 L48 26 M44 22 L44 30
           M44 30 L40 34 M44 30 L48 34
           M44 38 L41 42 M44 38 L47 42"
        stroke="#FFF"
        strokeWidth="1.3"
        strokeLinecap="round"
        opacity="0.65"
      />

      {/* ── Centre seam ── */}
      <path
        d="M32 10 L32 54"
        stroke="#FFF"
        strokeWidth="1.25"
        opacity="0.4"
      />
      {/* tiny spark where the halves meet */}
      <circle cx="32" cy="32" r="1.6" fill="#FFF" opacity="0.85" />
    </svg>
  );
}

/**
 * "MindMosaic" wordmark. "Mind" in royal purple, "Mosaic" in royal orange.
 * Inherits font-family from the surrounding context (DM Sans / system sans).
 */
export function Wordmark({ className = "" }) {
  return (
    <span className={"font-semibold tracking-tight " + className}>
      <span className="text-violet-700">Mind</span>
      <span className="text-orange-600">Mosaic</span>
    </span>
  );
}

/** Logo + wordmark + optional sub-line, for portal headers. */
export function BrandLockup({ subline = "Learning intelligence", iconSize = 36, className = "" }) {
  return (
    <div className={"flex items-center gap-2.5 " + className}>
      <Logo size={iconSize} />
      <div className="leading-none">
        <Wordmark className="text-[15px]" />
        {subline ? (
          <p className="mt-1 text-[11px] font-medium text-slate-500 leading-none">{subline}</p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Injects an inline-SVG favicon at runtime so the browser tab matches the
 * brand without requiring a build-time asset. In production, also drop the
 * uploaded `favicon.png` into your `public/` folder for older browsers and
 * for OG/Apple-touch fallbacks.
 */
export function Favicon() {
  useEffect(() => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
        <path d="M30 10 C20 10 12 18 12 28 C12 32 14 35 16 37 C14 39 13 42 14 45 C15 49 19 52 23 52 C24 52 26 51 27 51 C28 53 30 54 30 54 Z" fill="#5B21B6"/>
        <path d="M34 10 C44 10 52 18 52 28 C52 32 50 35 48 37 C50 39 51 42 50 45 C49 49 45 52 41 52 C40 52 38 51 37 51 C36 53 34 54 34 54 Z" fill="#EA580C"/>
        <circle cx="32" cy="32" r="1.6" fill="#FFF"/>
      </svg>`.trim();
    const dataUrl = "data:image/svg+xml," + encodeURIComponent(svg);

    let link = document.querySelector("link[rel='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    const previous = link.href;
    link.type = "image/svg+xml";
    link.href = dataUrl;

    return () => {
      // Restore on unmount so multiple pages don't fight over the favicon.
      if (previous) link.href = previous;
    };
  }, []);
  return null;
}

/* ============================================================================
 * TONE TABLES — single source of truth for colour mapping by semantic state.
 * Brand colours do real semantic work: 60–79% renders in royal purple,
 * 40–59% renders in royal orange. Brand IS the score colour.
 * ========================================================================== */

export const TONE_HEX = {
  success: "#059669",
  primary: "#5B21B6",
  warn:    "#EA580C",
  danger:  "#E11D48",
  blue:    "#2563EB",
};

export const TONE_BADGE = {
  neutral: "bg-slate-50 text-slate-700 ring-slate-200/70",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200/70",
  primary: "bg-violet-50 text-violet-700 ring-violet-200/70",
  warn:    "bg-orange-50 text-orange-700 ring-orange-200/70",
  danger:  "bg-rose-50 text-rose-700 ring-rose-200/70",
  blue:    "bg-blue-50 text-blue-700 ring-blue-200/70",
};

export const TONE_TEXT = {
  neutral: "text-slate-900",
  success: "text-emerald-600",
  primary: "text-violet-700",
  warn:    "text-orange-600",
  danger:  "text-rose-600",
  blue:    "text-blue-600",
};

export const TONE_BAR_BG = {
  neutral: "bg-slate-300",
  success: "bg-emerald-500",
  primary: "bg-violet-700",
  warn:    "bg-orange-500",
  danger:  "bg-rose-500",
  blue:    "bg-blue-500",
};

export const TONE_ICON_BG = {
  neutral: "bg-slate-100 text-slate-600",
  success: "bg-emerald-50 text-emerald-600",
  primary: "bg-violet-50 text-violet-700",
  warn:    "bg-orange-50 text-orange-600",
  danger:  "bg-rose-50 text-rose-600",
  blue:    "bg-blue-50 text-blue-600",
};

/* ============================================================================
 * HELPERS
 * ========================================================================== */

export function pctTone(pct) {
  if (pct >= 80) return "success";
  if (pct >= 60) return "primary";
  if (pct >= 40) return "warn";
  return "danger";
}

export function trendIcon(trend) {
  if (trend === "up") return TrendingUp;
  if (trend === "down") return TrendingDown;
  return Minus;
}

export function trendText(trend) {
  if (trend === "up") return "text-emerald-600";
  if (trend === "down") return "text-rose-600";
  return "text-slate-400";
}

/* ============================================================================
 * HOOKS
 * ========================================================================== */

/** Tween an integer from 0 → value over `duration` ms with eased timing. */
export function useCountUp(value, { duration = 1000, delay = 0 } = {}) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let raf = 0;
    const startAt = performance.now() + delay;
    const tick = (now) => {
      if (now < startAt) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const t = Math.min(1, (now - startAt) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, delay]);
  return display;
}

/* ============================================================================
 * PRIMITIVES
 * ========================================================================== */

export function Card({ as: Tag = "div", className = "", children, ...rest }) {
  return (
    <Tag
      className={
        "bg-white border border-slate-200/70 rounded-2xl " +
        "shadow-[0_1px_2px_rgba(15,23,42,0.04),0_2px_8px_-2px_rgba(15,23,42,0.04)] " +
        className
      }
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function Pill({ tone = "neutral", icon: Icon, children, className = "" }) {
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset " +
        TONE_BADGE[tone] +
        " " +
        className
      }
    >
      {Icon ? <Icon className="h-3.5 w-3.5" strokeWidth={2.25} /> : null}
      {children}
    </span>
  );
}

export function SectionTitle({ eyebrow, title, description, action }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        {eyebrow ? (
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-violet-700">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Skeleton({ className = "" }) {
  return <div className={"animate-pulse rounded-md bg-slate-200/70 " + className} />;
}

/** Section header inside Card with bottom border. */
export function CardHeader({ title, description, action, className = "" }) {
  return (
    <div className={"flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 " + className}>
      <div className="min-w-0">
        <h3 className="text-base font-semibold tracking-tight text-slate-900">{title}</h3>
        {description ? <p className="mt-1 text-xs text-slate-500">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

/* ============================================================================
 * GRAFFITI MARKS — marker-pen-style SVGs for correct / incorrect / unanswered.
 * ========================================================================== */

export function CheckMark({ className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <path d="M5 17.5 L13.2 25 L27 7.5" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M28.5 3 L29.5 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.55" />
      <path d="M30 6.5 L31 6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.55" />
    </svg>
  );
}

export function CrossMark({ className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <path d="M8 8 L24.5 25" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path d="M24 7.5 L7.5 24.5" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path d="M2.5 16.5 L0.5 17" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" opacity="0.5" />
      <path d="M30 26.5 L31.5 27" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

export function QuestionMark({ className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <path
        d="M10.5 11.5 C10.5 7 21.5 7 21.5 12.5 C21.5 16.5 16 16 16 19.5"
        stroke="currentColor" strokeWidth="3.75" strokeLinecap="round" strokeLinejoin="round" fill="none"
      />
      <circle cx="16" cy="25.5" r="2.1" fill="currentColor" />
    </svg>
  );
}

/* ============================================================================
 * NAV CONFIGURATION — main nav per role.
 * ========================================================================== */

const NAV_BY_ROLE = {
  student: [
    { id: "dashboard",   label: "Dashboard",   icon: LayoutDashboard },
    { id: "learn",       label: "Learn",       icon: GraduationCap   },
    { id: "practice",    label: "Practice",    icon: Pencil          },
    { id: "assignments", label: "Assignments", icon: ClipboardList   },
    { id: "results",     label: "Results",     icon: Trophy          },
  ],
  parent: [
    { id: "dashboard", label: "Overview",   icon: LayoutDashboard },
    { id: "children",  label: "Children",   icon: Users           },
    { id: "reports",   label: "Reports",    icon: FileText        },
    { id: "billing",   label: "Billing",    icon: CreditCard      },
  ],
  teacher: [
    { id: "dashboard",   label: "Dashboard",   icon: LayoutDashboard },
    { id: "classes",     label: "Classes",     icon: Users           },
    { id: "assignments", label: "Assignments", icon: ClipboardList   },
    { id: "analytics",   label: "Analytics",   icon: BarChart3       },
  ],
  admin: [
    { id: "intelligence", label: "Intelligence", icon: BarChart3       },
    { id: "schools",      label: "Schools",      icon: Building2       },
    { id: "users",        label: "Users",        icon: Users           },
    { id: "security",     label: "Security",     icon: Shield          },
  ],
};

/** Friendly label for the role chip beside the user. */
const ROLE_LABEL = {
  student: "Student",
  parent:  "Parent",
  teacher: "Teacher",
  admin:   "Admin",
};

/* ============================================================================
 * SIDEBAR PIECES
 * ========================================================================== */

function SidebarNavItem({ item, active, onClick }) {
  const Icon = item.icon;
  const isActive = item.id === active;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={
        "group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/30 " +
        (isActive
          ? "bg-violet-50 text-violet-700"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900")
      }
    >
      {isActive ? (
        <span className="absolute -left-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-orange-500" aria-hidden="true" />
      ) : null}
      <Icon className={"h-[18px] w-[18px] " + (isActive ? "text-violet-700" : "text-slate-500 group-hover:text-slate-700")} strokeWidth={2} />
      <span>{item.label}</span>
    </button>
  );
}

function SidebarActionItem({ icon: Icon, label, hint, tone = "default", onClick }) {
  const isAccent = tone === "accent";
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/30"
    >
      <span
        className={
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg " +
          (isAccent ? "bg-orange-50 text-orange-600" : "bg-violet-50 text-violet-700")
        }
      >
        <Icon className="h-4 w-4" strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-slate-800">{label}</span>
        {hint ? <span className="block truncate text-[11px] text-slate-500">{hint}</span> : null}
      </span>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500" strokeWidth={2} />
    </button>
  );
}

function SidebarRecentItem({ item, onClick }) {
  const tone = pctTone(item.score ?? 0);
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/30 " +
        (item.current ? "bg-violet-50/60" : "hover:bg-slate-100")
      }
    >
      {item.current ? (
        <span className="absolute -left-3 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-orange-500" aria-hidden="true" />
      ) : null}
      {typeof item.score === "number" ? (
        <span className={"h-2 w-2 shrink-0 rounded-full " + TONE_BAR_BG[tone]} />
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium text-slate-800">{item.title}</span>
        {item.date ? <span className="block text-[11px] text-slate-500">{item.date}</span> : null}
      </span>
      {typeof item.score === "number" ? (
        <span className={"text-xs font-semibold tabular-nums " + TONE_TEXT[tone]}>{item.score}%</span>
      ) : null}
    </button>
  );
}

function SidebarGroup({ title, action, children }) {
  return (
    <div className="mt-7">
      <div className="flex items-center justify-between px-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{title}</p>
        {action}
      </div>
      <div className="mt-2 space-y-0.5">{children}</div>
    </div>
  );
}

/* ============================================================================
 * APP SIDEBAR
 * ========================================================================== */

function AppSidebar({
  role,
  active,
  contextualSection,
  recentSection,
  user,
  isOpen,
  onClose,
}) {
  const navItems = NAV_BY_ROLE[role] ?? [];
  const initial = user?.name?.[0]?.toUpperCase() ?? "U";

  return (
    <>
      <AnimatePresence>
        {isOpen ? (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
            aria-hidden="true"
          />
        ) : null}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ x: isOpen ? 0 : -288 }}
        transition={{ type: "tween", duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200 bg-white lg:translate-x-0"
        style={{ transform: isOpen ? "translateX(0)" : undefined }}
        aria-label="Primary"
      >
        {/* Brand */}
        <div className="flex h-16 items-center justify-between gap-3 border-b border-slate-100 px-5">
          <BrandLockup />
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/30 lg:hidden"
            aria-label="Close menu"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-5">
          {/* Main nav */}
          <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            {ROLE_LABEL[role] ?? "Navigate"}
          </p>
          <nav className="mt-2 space-y-0.5" aria-label={`${role} navigation`}>
            {navItems.map((item) => (
              <SidebarNavItem key={item.id} item={item} active={active} />
            ))}
          </nav>

          {/* Per-page contextual section */}
          {contextualSection ? (
            <SidebarGroup title={contextualSection.title} action={contextualSection.action}>
              {contextualSection.items.map((it) => (
                <SidebarActionItem
                  key={it.id}
                  icon={it.icon}
                  label={it.label}
                  hint={it.hint}
                  tone={it.tone}
                />
              ))}
            </SidebarGroup>
          ) : null}

          {/* Per-page recent items */}
          {recentSection ? (
            <SidebarGroup
              title={recentSection.title}
              action={
                recentSection.actionLabel ? (
                  <button type="button" className="text-[11px] font-medium text-violet-700 hover:text-violet-800">
                    {recentSection.actionLabel}
                  </button>
                ) : null
              }
            >
              {recentSection.items.map((it) => (
                <SidebarRecentItem key={it.id} item={it} />
              ))}
            </SidebarGroup>
          ) : null}
        </div>

        {/* User pinned to bottom */}
        <div className="border-t border-slate-100 p-3">
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-lg p-2 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/30"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-700 text-sm font-semibold text-white">
              {initial}
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate text-sm font-semibold text-slate-900 leading-none">{user?.name ?? "User"}</span>
              <span className="mt-1 block truncate text-[11px] text-slate-500 leading-none">
                {user?.role ?? ""}
                {user?.plan ? ` · ${user.plan}` : ""}
              </span>
            </span>
            <Settings className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={2} />
          </button>
        </div>
      </motion.aside>
    </>
  );
}

/* ============================================================================
 * APP TOP BAR
 * ========================================================================== */

function AppTopBar({ pageTitle, breadcrumbs, topBarSlot, onMenuClick }) {
  return (
    <div className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200/70 bg-white/85 px-4 backdrop-blur-xl md:px-6 lg:px-8">
      <button
        type="button"
        onClick={onMenuClick}
        className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/30 lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" strokeWidth={2} />
      </button>

      <nav className="flex min-w-0 items-center gap-1.5 text-sm" aria-label="Breadcrumb">
        {breadcrumbs?.length ? (
          <>
            {breadcrumbs.map((c, i) => (
              <React.Fragment key={i}>
                <span className="truncate text-slate-500">{c}</span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" strokeWidth={2} />
              </React.Fragment>
            ))}
            <span className="truncate font-semibold text-slate-900">{pageTitle}</span>
          </>
        ) : (
          <span className="truncate font-semibold text-slate-900">{pageTitle}</span>
        )}
      </nav>

      <div className="ml-auto flex items-center gap-1.5">
        {topBarSlot}
        <div className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" strokeWidth={2} />
          <input
            type="search"
            placeholder="Search…"
            className="h-9 w-56 rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-violet-300 focus:outline-none focus:ring-4 focus:ring-violet-100"
          />
        </div>
        <button
          type="button"
          aria-label="Help"
          className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/30"
        >
          <HelpCircle className="h-[18px] w-[18px]" strokeWidth={2} />
        </button>
        <button
          type="button"
          aria-label="Notifications"
          className="relative rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/30"
        >
          <Bell className="h-[18px] w-[18px]" strokeWidth={2} />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-orange-500 ring-2 ring-white" />
        </button>
      </div>
    </div>
  );
}

/* ============================================================================
 * APP SHELL — top-level wrapper used by every portal page.
 * ========================================================================== */

export function AppShell({
  role,
  active,
  pageTitle,
  breadcrumbs,
  contextualSection,
  recentSection,
  topBarSlot,
  user,
  contentMaxWidth = "max-w-[1200px]",
  children,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen bg-slate-50/60 font-sans text-slate-900 antialiased">
      <Favicon />
      <AppSidebar
        role={role}
        active={active}
        contextualSection={contextualSection}
        recentSection={recentSection}
        user={user}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="lg:pl-72">
        <AppTopBar
          pageTitle={pageTitle}
          breadcrumbs={breadcrumbs}
          topBarSlot={topBarSlot}
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className={"mx-auto " + contentMaxWidth + " px-4 pb-24 pt-8 md:px-6 lg:px-10"}>
          {children}
        </main>
      </div>
    </div>
  );
}
