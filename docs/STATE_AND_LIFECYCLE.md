# MindMosaic – State and Lifecycle

## Current Status

State management is **not yet implemented**. The application currently uses no state management library.

## Current State Handling

| State Type | Current Approach |
|------------|------------------|
| Auth state | Hardcoded placeholder (`isAuthenticated = true`) |
| User role | Hardcoded placeholder (`currentRole = "student"`) |
| UI state | None |
| Form state | None (no forms exist) |

## Planned State Architecture

### State Categories

| Category | Scope | Persistence |
|----------|-------|-------------|
| Auth | Global | Session + Token |
| User | Global | Cached from DB |
| Session | Route-scoped | Memory only |
| Form | Component-scoped | Memory only |

### Auth State (Planned)

```typescript
interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  role: Role | null;
  loading: boolean;
}
```

### User State (Planned)

```typescript
interface User {
  id: string;
  email: string;
  role: Role;
  profile: UserProfile;
}

interface UserProfile {
  firstName: string;
  lastName: string;
  avatarUrl?: string;
}
```

## Component Lifecycle

### Layout Lifecycle

```
Mount → Render Header/Footer/Sidebar → Render Children → Unmount
```

### Guard Lifecycle

```
Mount → Check Auth → Check Role → Render Children OR Fallback
```

### Page Lifecycle

```
Mount → Fetch Data (future) → Render → User Interaction → Unmount
```

## Data Flow (Planned)

```
Supabase → API Layer → State Store → Components → UI
                ↑                         |
                └─────── Actions ─────────┘
```

## Implementation Approach

When state management is needed:

1. **Start simple**: React Context + useReducer
2. **Evaluate**: If complexity grows, consider Zustand
3. **Avoid**: Redux unless absolutely necessary

## Current Constraints

- No global state store
- No context providers (except React Router)
- No side effects in components
- No data fetching logic
