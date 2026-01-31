# Authentication and Roles

## Roles

- student
- parent
- admin

Roles are defined centrally and enforced at layout level.

## Guards

AuthGuard:
- Placeholder authentication check
- No redirects or side effects

RoleGuard:
- Placeholder role enforcement
- Restricts access based on allowed roles

## Future Integration

Supabase authentication will replace placeholders.
Guard interfaces will remain unchanged.
