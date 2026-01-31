# MindMosaic – Authentication and Roles

## Current Status

Authentication is **placeholder only**. No real auth logic exists.

## Role Definitions

Roles are defined in `src/constants/roles.ts`:

```typescript
export const ROLES = {
  STUDENT: "student",
  PARENT: "parent",
  ADMIN: "admin",
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];
```

## Current Guard Implementation

### AuthGuard (Placeholder)

Location: `src/guards/AuthGuard.tsx`

```typescript
const isAuthenticated = true; // hardcoded
```

Behavior:
- Always returns `true`
- Never blocks access
- Displays placeholder message if `false`

### RoleGuard (Placeholder)

Location: `src/guards/RoleGuard.tsx`

```typescript
const currentRole: Role = "student"; // hardcoded
```

Behavior:
- Always assumes "student" role
- Blocks access if role not in `allowed` array
- Displays "Access denied" message

## Layout Guard Configuration

| Layout | AuthGuard | RoleGuard |
|--------|-----------|-----------|
| PublicLayout | ❌ | ❌ |
| AuthLayout | ❌ | ❌ |
| StudentLayout | ✅ | student |
| ParentLayout | ✅ | parent |
| AdminLayout | ✅ | admin |

## Planned Authentication Flow

### Login Flow

```
1. User enters credentials
2. Supabase Auth validates
3. Session created
4. User redirected to role-appropriate dashboard
```

### Session Management

```
1. Token stored in secure cookie
2. Supabase handles refresh
3. Guard checks token on protected routes
4. Expired sessions redirect to login
```

## Role Permissions (Planned)

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

## Implementation Plan

When authentication is implemented:

1. **Install Supabase client**
2. **Create AuthContext** with real state
3. **Update AuthGuard** to check Supabase session
4. **Update RoleGuard** to check user's actual role
5. **Add redirect logic** for unauthorized access
6. **Implement login/signup forms**

## Security Considerations

- All protected routes must have both guards
- Role verification happens on frontend AND backend
- Database RLS enforces role-based access
- Tokens are short-lived with refresh mechanism
