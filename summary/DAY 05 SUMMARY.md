# MindMosaic Day 05: Auth & Role Guards

## 📅 Date: January 31, 2026

---

## 🎯 Objective

Create placeholder authentication and role-based guards to establish the security pattern before backend implementation.

---

## ✅ What Was Accomplished

### Role Constants

Created `src/constants/roles.ts`:

```typescript
export const ROLES = {
  STUDENT: "student",
  PARENT: "parent",
  ADMIN: "admin",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
```

### AuthGuard Component

Created placeholder authentication guard:

```typescript
interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

function AuthGuard({ children, fallback }: AuthGuardProps) {
  const isAuthenticated = true; // Placeholder - hardcoded

  if (!isAuthenticated) {
    return fallback || <Navigate to="/login" />;
  }

  return children;
}
```

**Current Behavior:**

- Always returns `true` (placeholder)
- Structure ready for Supabase Auth integration

### RoleGuard Component

Created role-based access control guard:

```typescript
interface RoleGuardProps {
  children: React.ReactNode;
  allowed: Role[];
  fallback?: React.ReactNode;
}

function RoleGuard({ children, allowed, fallback }: RoleGuardProps) {
  const currentRole: Role = "student"; // Placeholder - hardcoded

  if (!allowed.includes(currentRole)) {
    return fallback || <AccessDenied />;
  }

  return children;
}
```

**Current Behavior:**

- Always assumes "student" role (placeholder)
- Blocks access if role not in `allowed` array

---

## 📁 Files Created/Modified

| File                                | Status   | Purpose               |
| ----------------------------------- | -------- | --------------------- |
| `src/constants/roles.ts`            | NEW      | Role type definitions |
| `src/guards/AuthGuard.tsx`          | NEW      | Authentication guard  |
| `src/guards/RoleGuard.tsx`          | NEW      | Role-based guard      |
| `src/app/layouts/StudentLayout.tsx` | MODIFIED | Added guards          |
| `src/app/layouts/ParentLayout.tsx`  | MODIFIED | Added guards          |
| `src/app/layouts/AdminLayout.tsx`   | MODIFIED | Added guards          |

---

## 🔐 Guard Configuration by Layout

| Layout        | AuthGuard | RoleGuard     |
| ------------- | --------- | ------------- |
| PublicLayout  | ❌        | ❌            |
| AuthLayout    | ❌        | ❌            |
| StudentLayout | ✅        | `["student"]` |
| ParentLayout  | ✅        | `["parent"]`  |
| AdminLayout   | ✅        | `["admin"]`   |

---

## 🏗️ Usage Pattern

```jsx
// StudentLayout.tsx
<AuthGuard>
  <RoleGuard allowed={["student"]}>
    <AppShell
      header={<Header />}
      sidebar={<Sidebar />}
      footer={<Footer />}
    >
      <Outlet />
    </RoleGuard>
  </AuthGuard>
</AuthGuard>
```

---

## 🔄 Planned Authentication Flow

```
1. User enters credentials
2. Supabase Auth validates
3. Session created with JWT
4. JWT contains role claim
5. Guards check JWT on protected routes
6. Unauthorized → redirect to login
```

---

## 👤 Role Permissions (Planned)

### Student

- View own dashboard
- Take practice tests
- View own results
- Update own profile

### Parent

- View own dashboard
- View linked children's progress
- View children's results
- Manage linked children

### Admin

- Full system access
- Manage content
- Manage users
- View analytics

---

## 📋 Day 5 Checklist

- [x] Role constants defined with TypeScript types
- [x] AuthGuard placeholder created
- [x] RoleGuard placeholder created
- [x] StudentLayout wrapped with guards
- [x] ParentLayout wrapped with guards
- [x] AdminLayout wrapped with guards
- [x] PublicLayout unchanged (no guards)
- [x] AuthLayout unchanged (no guards)

---

## ⚠️ Current Limitations

| Limitation                  | Reason      | Resolution                |
| --------------------------- | ----------- | ------------------------- |
| `isAuthenticated = true`    | No backend  | Supabase Auth integration |
| `currentRole = "student"`   | No backend  | JWT role claim            |
| No redirect on unauthorized | Placeholder | Implement after auth      |

---

## 🔍 Verification

```bash
npm run dev

# Test guard behavior:
# - /student → renders (currentRole is "student")
# - /parent → shows "Access Denied" (currentRole is not "parent")
# - /admin → shows "Access Denied" (currentRole is not "admin")
```

---

## 🚀 Next Steps (Day 6)

1. Review and consolidate codebase
2. Remove any dead code
3. Complete documentation
4. Verify all components working

---

_Document generated: January 31, 2026_
_MindMosaic v0.1.0 - Day 5_
