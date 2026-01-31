# MindMosaic – Roadmap

## Completed Phases

### Days 1-6: Foundation

| Day | Focus | Status |
|-----|-------|--------|
| Day 1 | Project scaffolding, routing, layouts | ✅ Complete |
| Day 2 | Brand system, CSS variables, lint script | ✅ Complete |
| Day 3 | UI primitives (Button, Card, Page) | ✅ Complete |
| Day 4 | Layout foundation (AppShell, Header, Footer, Sidebar) | ✅ Complete |
| Day 5 | Auth and role guard placeholders | ✅ Complete |
| Day 6 | Gap fix, consolidation, documentation | ✅ Complete |

## Current State Summary

The application has:
- Complete routing structure
- Consistent brand system
- Reusable UI primitives
- Layout hierarchy with guard placeholders
- Comprehensive documentation

The application does NOT have:
- Backend integration
- Real authentication
- Database
- Business logic
- Exam or content functionality

## Upcoming Phases (Planned)

### Phase 2: Authentication

- [ ] Supabase project setup
- [ ] Authentication implementation
- [ ] Login/Signup forms
- [ ] Session management
- [ ] Guard integration

### Phase 3: Database

- [ ] Schema implementation
- [ ] Row Level Security
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

| Item | Priority | Notes |
|------|----------|-------|
| None currently | - | Foundation is clean |

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| Day 1 | React Router data APIs | Future-proof for loaders/actions |
| Day 2 | CSS variables for brand | Runtime theming capability |
| Day 4 | AppShell pattern | Consistent layout composition |
| Day 5 | Placeholder guards | Structure before implementation |
| Day 6 | Remove Shell.tsx | Dead code elimination |

## Open Questions

1. **State management**: Context vs Zustand vs other?
2. **Form handling**: React Hook Form vs Formik vs native?
3. **Testing strategy**: Vitest + Testing Library?
4. **Deployment target**: Vercel, Netlify, or other?

These will be resolved when relevant phases begin.
