# MindMosaic – File Map

## Directory Structure

```
src/
├── app/                          # Application layer
│   ├── layouts/                  # Layout components
│   │   ├── AdminLayout.tsx       # Admin area layout (guarded)
│   │   ├── AuthLayout.tsx        # Authentication pages layout
│   │   ├── ParentLayout.tsx      # Parent area layout (guarded)
│   │   ├── PublicLayout.tsx      # Public pages layout
│   │   └── StudentLayout.tsx     # Student area layout (guarded)
│   ├── pages/                    # Page components
│   │   ├── admin/
│   │   │   └── AdminHome.tsx     # Admin dashboard placeholder
│   │   ├── auth/
│   │   │   └── AuthHome.tsx      # Auth home placeholder
│   │   ├── parent/
│   │   │   └── ParentHome.tsx    # Parent dashboard placeholder
│   │   ├── student/
│   │   │   └── StudentHome.tsx   # Student dashboard placeholder
│   │   ├── ForgotPassword.tsx    # Forgot password placeholder
│   │   ├── Home.tsx              # Public home page
│   │   ├── Login.tsx             # Login placeholder
│   │   ├── NotFound.tsx          # 404 page
│   │   ├── Pricing.tsx           # Pricing placeholder
│   │   └── Signup.tsx            # Signup placeholder
│   └── router.tsx                # Route definitions
├── config/                       # Configuration
│   └── brand.ts                  # Brand constants (authoritative)
├── constants/                    # Application constants
│   └── roles.ts                  # Role definitions
├── guards/                       # Route guards
│   ├── AuthGuard.tsx             # Authentication guard (placeholder)
│   └── RoleGuard.tsx             # Role-based guard (placeholder)
├── shared/                       # Shared utilities
│   └── ui/                       # UI primitives
│       ├── AppShell.tsx          # Layout wrapper
│       ├── Button.tsx            # Button component
│       ├── Card.tsx              # Card component
│       ├── Footer.tsx            # Footer component
│       ├── Header.tsx            # Header component
│       ├── Page.tsx              # Page wrapper
│       ├── SectionHeader.tsx     # Section header
│       └── Sidebar.tsx           # Sidebar component
├── index.css                     # Global styles + CSS variables
└── main.tsx                      # Application entry point

scripts/
└── lint-brand-lock.mjs           # Brand enforcement script

docs/                             # Documentation
├── PROJECT_OVERVIEW.md
├── FILE_MAP.md
├── FLOW_INTEGRATION.md
├── CONTENT_ENGINE.md
├── EXAM_ENGINE.md
├── STATE_AND_LIFECYCLE.md
├── DATABASE_SCHEMA.md
├── AUTH_AND_ROLES.md
└── ROADMAP.md
```

## File Responsibilities

### Configuration Files

| File | Purpose |
|------|---------|
| `src/config/brand.ts` | Single source of truth for brand values |
| `src/constants/roles.ts` | Role type definitions |
| `tailwind.config.ts` | Tailwind theme with brand token mappings |
| `src/index.css` | CSS variables for brand tokens |

### Layout Files

| File | Has Sidebar | Has Guards |
|------|-------------|------------|
| `PublicLayout.tsx` | No | No |
| `AuthLayout.tsx` | No | No |
| `StudentLayout.tsx` | Yes | AuthGuard + RoleGuard(student) |
| `ParentLayout.tsx` | Yes | AuthGuard + RoleGuard(parent) |
| `AdminLayout.tsx` | Yes | AuthGuard + RoleGuard(admin) |

### UI Primitives

| Component | Purpose |
|-----------|---------|
| `AppShell` | Layout wrapper with header/sidebar/footer slots |
| `Button` | Button with variants (primary, secondary, ghost) |
| `Card` | Content container with border |
| `Page` | Page wrapper with title |
| `SectionHeader` | Section heading |
| `Header` | Top navigation bar |
| `Footer` | Page footer |
| `Sidebar` | Side navigation (placeholder) |
