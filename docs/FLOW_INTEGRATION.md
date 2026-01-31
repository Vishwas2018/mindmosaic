# Flow Integration

This document describes how the system behaves at runtime.

## Student Access Flow

1. Route resolves to StudentLayout
2. AuthGuard checks authentication (placeholder)
3. RoleGuard validates student role
4. AppShell renders Header, Sidebar, Footer
5. Page content renders via Outlet

## Future: Student Attempt Flow

1. Student selects a paper
2. Paper metadata loads
3. QuestionRenderer renders current question
4. MediaResolver loads referenced media
5. Student response is captured
6. Progress and timing are tracked

## Admin Authoring Flow (Planned)

1. Admin accesses AdminLayout
2. AuthGuard and RoleGuard enforce access
3. Admin creates or edits questions
4. Media is uploaded separately
5. Papers are composed from questions
6. Paper is published as immutable version
