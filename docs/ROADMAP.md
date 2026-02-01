# MindMosaic – Roadmap

## Completed Phases

### Days 1-9: Foundation

| Day   | Focus                                                 | Status      |
| ----- | ----------------------------------------------------- | ----------- |
| Day 1 | Project scaffolding, routing, layouts                 | ✅ Complete |
| Day 2 | Brand system, CSS variables, lint script              | ✅ Complete |
| Day 3 | UI primitives (Button, Card, Page)                    | ✅ Complete |
| Day 4 | Layout foundation (AppShell, Header, Footer, Sidebar) | ✅ Complete |
| Day 5 | Auth and role guard placeholders                      | ✅ Complete |
| Day 6 | Gap fix, consolidation, documentation                 | ✅ Complete |
| Day 7 | Exam Package Contract (Zod + JSON Schema)             | ✅ Complete |
| Day 8 | Supabase Schema Design (contract-to-database)         | ✅ Complete |
| Day 9 | Row Level Security policies                           | ✅ Complete |

## Current State Summary

The application has:

- Complete routing structure
- Consistent brand system
- Reusable UI primitives
- Layout hierarchy with guard placeholders
- Comprehensive documentation
- **Exam Package Contract** (Zod + JSON Schema)
- Validated example exam packages
- **Database Schema** (PostgreSQL migration ready)
- **Row Level Security** (JWT-based, covers Day 8 tables)

The application does NOT have:

- Backend integration (Supabase not connected)
- Real authentication
- Identity tables (profiles, parent_student — deferred)
- Business logic
- Exam runtime or rendering

## Upcoming Phases (Planned)

### Phase 2: Authentication

- [ ] Supabase project setup
- [ ] Authentication implementation
- [ ] Login/Signup forms
- [ ] Session management
- [ ] Guard integration

### Phase 3: Database & Auth

- [x] Schema design (Day 8)
- [x] Row Level Security (Day 9)
- [ ] Supabase project setup
- [ ] Schema deployment
- [ ] User profiles table
- [ ] Parent-student linking table
- [ ] JWT role claims configuration
- [ ] Initial seed data
- [ ] API layer

### Phase 4: Student Core

- [ ] Student dashboard
- [ ] Basic question display
- [ ] Answer submission
- [ ] Simple results view

### Phase 5: Content Engine

- [ ] Content management (admin)
- [ ] Question creation
- [ ] Topic organisation
- [ ] Content delivery

### Phase 6: Exam Engine

- [ ] Practice sessions
- [ ] Timed assessments
- [ ] Scoring system
- [ ] Results analysis

### Phase 7: Parent Features

- [ ] Parent dashboard
- [ ] Child linking
- [ ] Progress visibility
- [ ] Reports

### Phase 8: Polish

- [ ] Responsive design
- [ ] Accessibility audit
- [ ] Performance optimisation
- [ ] Error handling

## Technical Debt Register

| Item           | Priority | Notes               |
| -------------- | -------- | ------------------- |
| None currently | -        | Foundation is clean |

## Decision Log

| Date  | Decision                                          | Rationale                                             |
| ----- | ------------------------------------------------- | ----------------------------------------------------- |
| Day 1 | React Router data APIs                            | Future-proof for loaders/actions                      |
| Day 2 | CSS variables for brand                           | Runtime theming capability                            |
| Day 4 | AppShell pattern                                  | Consistent layout composition                         |
| Day 5 | Placeholder guards                                | Structure before implementation                       |
| Day 6 | Remove Shell.tsx                                  | Dead code elimination                                 |
| Day 7 | Zod + JSON Schema dual contracts                  | Type-safe frontend, language-agnostic backend         |
| Day 7 | Structured prompt blocks (not HTML)               | Render-agnostic, secure, portable content             |
| Day 7 | UUID for all IDs                                  | Globally unique, no central coordination              |
| Day 8 | JSONB for nested contract objects                 | Preserves structure, enables future querying          |
| Day 8 | Separate tables for options/answers               | Normalised design, enables FK constraints             |
| Day 8 | No soft deletes                                   | Contract specifies hard boundaries                    |
| Day 8 | CASCADE delete for content, RESTRICT for attempts | Preserve exam history, allow content updates          |
| Day 9 | JWT claims for role source                        | No new tables, Supabase standard pattern              |
| Day 9 | Published status enforced at DB level             | Cannot bypass via application bugs                    |
| Day 9 | No parent access to responses                     | Student privacy                                       |
| Day 9 | Correct answers blocked for students              | Strict assessment integrity, expose via edge function |
| Day 9 | Parent attempt access deferred                    | Requires identity tables, out of Day 9 scope          |

## Open Questions

1. **State management**: Context vs Zustand vs other?
2. **Form handling**: React Hook Form vs Formik vs native?
3. **Testing strategy**: Vitest + Testing Library?
4. **Deployment target**: Vercel, Netlify, or other?

These will be resolved when relevant phases begin.
