// src/config/brand.ts

/**
 * MindMosaic — Authoritative Brand Configuration
 *
 * This file is the single source of truth for all brand identity,
 * visual tokens, and public-facing copy.
 *
 * No component should hardcode brand strings, colours, or fonts.
 */

// -----------------------------------------------------------------------------
// App Identity
// -----------------------------------------------------------------------------

export const APP_NAME = "MindMosaic";

export const APP_TAGLINE = "Turning Practice into Mastery";

export const SUPPORT_EMAIL = "support@mindmosaic.com.au";

// -----------------------------------------------------------------------------
// Visual Tokens
// -----------------------------------------------------------------------------

export const BRAND_COLORS = {
  primaryBlue: "#1D4ED8",
  primaryBlueLight: "#2563EB",
  backgroundSoft: "#EEF5FF",
  textPrimary: "#0F172A",
  textMuted: "#475569",
  borderSubtle: "#D8E2F3",
  accentAmber: "#F59E0B",
  successGreen: "#16A34A",
  dangerRed: "#DC2626",
} as const;

// -----------------------------------------------------------------------------
// Typography
// -----------------------------------------------------------------------------

export const BRAND_FONT =
  "IBM Plex Sans, system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
