# MindMosaic Day 02: Brand System

## 📅 Date: January 31, 2026

---

## 🎯 Objective

Establish a single source of truth for brand values with CSS variables for runtime theming capability.

---

## ✅ What Was Accomplished

### Brand Configuration

Created `src/config/brand.ts` as the authoritative source for all brand values:

```typescript
export const BRAND = {
  name: "MindMosaic",
  tagline: "Turning Practice into Mastery",
  colors: {
    primary: "#4F46E5", // Indigo
    secondary: "#10B981", // Emerald
    accent: "#F59E0B", // Amber
    background: "#F9FAFB", // Gray 50
    surface: "#FFFFFF",
    text: {
      primary: "#111827",
      secondary: "#6B7280",
      inverse: "#FFFFFF",
    },
    status: {
      success: "#10B981",
      warning: "#F59E0B",
      error: "#EF4444",
      info: "#3B82F6",
    },
  },
  spacing: {
    page: "1.5rem",
    section: "2rem",
    card: "1rem",
  },
  borderRadius: {
    sm: "0.25rem",
    md: "0.5rem",
    lg: "0.75rem",
  },
} as const;
```

### CSS Custom Properties

Updated `src/index.css` with CSS variables mapped to brand tokens:

```css
:root {
  --brand-primary: #4f46e5;
  --brand-secondary: #10b981;
  --brand-accent: #f59e0b;
  --brand-background: #f9fafb;
  --brand-surface: #ffffff;
  --brand-text-primary: #111827;
  --brand-text-secondary: #6b7280;
  --brand-text-inverse: #ffffff;
  /* ... additional variables */
}
```

### Tailwind Configuration

Extended `tailwind.config.ts` to reference CSS variables:

```typescript
theme: {
  extend: {
    colors: {
      brand: {
        primary: 'var(--brand-primary)',
        secondary: 'var(--brand-secondary)',
        // ...
      }
    }
  }
}
```

### Brand Enforcement Script

Created `scripts/lint-brand-lock.mjs` to prevent hardcoded color values:

```javascript
// Scans source files for raw hex/rgb values
// Flags violations with file and line number
// Exit code 1 if violations found (CI-friendly)
```

---

## 📁 Files Created/Modified

| File                          | Status   | Purpose                         |
| ----------------------------- | -------- | ------------------------------- |
| `src/config/brand.ts`         | NEW      | Brand constants (authoritative) |
| `src/index.css`               | MODIFIED | CSS variables for brand tokens  |
| `tailwind.config.ts`          | MODIFIED | Tailwind theme extension        |
| `scripts/lint-brand-lock.mjs` | NEW      | Brand enforcement script        |
| `package.json`                | MODIFIED | Added `lint:brand` script       |

---

## 🎨 Brand Token Categories

### Colors

| Category   | Token              | Value             |
| ---------- | ------------------ | ----------------- |
| Primary    | `brand-primary`    | #4F46E5 (Indigo)  |
| Secondary  | `brand-secondary`  | #10B981 (Emerald) |
| Accent     | `brand-accent`     | #F59E0B (Amber)   |
| Background | `brand-background` | #F9FAFB (Gray 50) |
| Surface    | `brand-surface`    | #FFFFFF           |

### Text Colors

| Token            | Value   | Usage           |
| ---------------- | ------- | --------------- |
| `text-primary`   | #111827 | Main text       |
| `text-secondary` | #6B7280 | Secondary text  |
| `text-inverse`   | #FFFFFF | Text on dark bg |

### Status Colors

| Token            | Value   | Usage          |
| ---------------- | ------- | -------------- |
| `status-success` | #10B981 | Success states |
| `status-warning` | #F59E0B | Warning states |
| `status-error`   | #EF4444 | Error states   |
| `status-info`    | #3B82F6 | Info states    |

---

## 🔧 Usage Examples

### In Tailwind Classes

```jsx
<div className="bg-brand-primary text-brand-inverse">Primary button</div>
```

### In CSS

```css
.custom-element {
  background: var(--brand-primary);
  color: var(--brand-text-inverse);
}
```

### In TypeScript

```typescript
import { BRAND } from "@/config/brand";

const primaryColor = BRAND.colors.primary;
```

---

## 🔍 Verification

```bash
# Run brand lint check
npm run lint:brand

# Expected output (clean):
# ✓ No brand violations found
```

---

## 📋 Day 2 Checklist

- [x] Brand configuration file created
- [x] CSS custom properties defined
- [x] Tailwind configuration extended
- [x] Brand enforcement script created
- [x] Package.json updated with lint script
- [x] All colors use brand tokens

---

## 🏗️ Architecture Decisions

| Decision                    | Rationale                  |
| --------------------------- | -------------------------- |
| CSS variables for brand     | Runtime theming capability |
| Single config file          | Single source of truth     |
| Lint script for enforcement | Prevent hardcoded values   |
| `as const` assertion        | Type-safe brand values     |

---

## 🚀 Next Steps (Day 3)

1. Create Button component with brand tokens
2. Create Card component
3. Create Page wrapper component
4. Establish UI primitive patterns

---

_Document generated: January 31, 2026_
_MindMosaic v0.1.0 - Day 2_
