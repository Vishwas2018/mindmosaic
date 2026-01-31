# File Map

This document explains the purpose of each major folder and file in the codebase.

## src/app/layouts/

### PublicLayout.tsx

Wraps public-facing pages.
Uses AppShell with Header and Footer.
No authentication or role enforcement.

### AuthLayout.tsx

Wraps authentication-related pages.
No guards applied.

### StudentLayout.tsx

Wraps student-facing pages.
Enforces AuthGuard and RoleGuard(STUDENT).
Provides Sidebar navigation.

### ParentLayout.tsx

Wraps parent-facing pages.
Enforces AuthGuard and RoleGuard(PARENT).
Provides Sidebar navigation.

### AdminLayout.tsx

Wraps admin-facing pages.
Enforces AuthGuard and RoleGuard(ADMIN).
Provides Sidebar navigation.

## src/shared/ui/

### AppShell.tsx

Top-level layout wrapper.
Composes Header, optional Sidebar, main content, and Footer.

### Header.tsx

Top navigation bar.
Displays brand identity only.

### Footer.tsx

Global footer.
Displays copyright and brand text.

### Sidebar.tsx

Static placeholder navigation for authenticated layouts.

### Button.tsx

Reusable button primitive.
Supports variants and sizes using brand tokens.

### Card.tsx

Reusable container primitive.

### Page.tsx

Standard page wrapper providing title and spacing.

### SectionHeader.tsx

Standard section heading component.

## src/guards/

### AuthGuard.tsx

Placeholder authentication guard.
Currently always allows access.

### RoleGuard.tsx

Placeholder role guard.
Restricts access based on allowed roles.

## src/constants/

### roles.ts

Defines canonical role identifiers and Role type.
