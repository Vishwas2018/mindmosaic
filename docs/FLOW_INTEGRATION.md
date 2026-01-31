# MindMosaic – Flow Integration

## Current Status

Flow integration is **not yet implemented**. This document describes the planned architecture.

## Planned User Flows

### Public Flow

```
Landing Page → Pricing → Signup/Login
```

| Route | Layout | Purpose |
|-------|--------|---------|
| `/` | PublicLayout | Landing page |
| `/pricing` | PublicLayout | Pricing information |
| `/login` | PublicLayout | User login |
| `/signup` | PublicLayout | User registration |
| `/forgot-password` | PublicLayout | Password recovery |

### Student Flow

```
Login → Dashboard → Practice → Results
```

| Route | Layout | Purpose |
|-------|--------|---------|
| `/student` | StudentLayout | Student dashboard |
| `/student/practice/*` | StudentLayout | Practice sessions (planned) |
| `/student/results/*` | StudentLayout | Results review (planned) |

### Parent Flow

```
Login → Dashboard → Child Progress → Reports
```

| Route | Layout | Purpose |
|-------|--------|---------|
| `/parent` | ParentLayout | Parent dashboard |
| `/parent/children/*` | ParentLayout | Child management (planned) |
| `/parent/reports/*` | ParentLayout | Progress reports (planned) |

### Admin Flow

```
Login → Dashboard → Content Management → User Management
```

| Route | Layout | Purpose |
|-------|--------|---------|
| `/admin` | AdminLayout | Admin dashboard |
| `/admin/content/*` | AdminLayout | Content management (planned) |
| `/admin/users/*` | AdminLayout | User management (planned) |

## Guard Integration

### Current Implementation (Placeholder)

```tsx
// StudentLayout.tsx
<AuthGuard>
  <RoleGuard allowed={["student"]}>
    <Outlet />
  </RoleGuard>
</AuthGuard>
```

Guards currently use hardcoded values:
- `AuthGuard`: `isAuthenticated = true`
- `RoleGuard`: `currentRole = "student"`

### Future Implementation

When authentication is implemented:
1. `AuthGuard` will check actual auth state
2. `RoleGuard` will check user's actual role
3. Unauthorized access will redirect to `/login`

## Integration Points (Planned)

| Integration | Status | Notes |
|-------------|--------|-------|
| Authentication | Placeholder | Will integrate with Supabase Auth |
| Database | Not started | Will integrate with Supabase |
| Content Engine | Not started | See CONTENT_ENGINE.md |
| Exam Engine | Not started | See EXAM_ENGINE.md |
