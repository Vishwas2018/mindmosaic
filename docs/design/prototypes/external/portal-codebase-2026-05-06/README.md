# MindMosaic — portal codebase

Production-shaped React/Tailwind components for the full MindMosaic portal.
Single shared shell + 17 page components, each a drop-in for a route.

## Brand

- **Royal Purple** — `violet-700` (`#5B21B6`)
- **Royal Orange** — `orange-600` (`#EA580C`)
- **Score-tone semantics carry the brand**: 80%+ emerald, 60–79% violet (brand), 40–59% orange (brand accent), <40% rose. The brand colours do real semantic work — they aren't decoration.
- **Flat colours only**, no gradients anywhere in the UI.
- **Logo** — original SVG mark in `shell.jsx` capturing the two-half motif from the reference image (violet circuit half / orange organic half). Not a trace of the supplied artwork; safe for production use without licensing review.
- **Wordmark** — "Mind" in `text-violet-700`, "Mosaic" in `text-orange-600`.
- **Favicon** — `<Favicon />` injects an inline SVG data-URL favicon at runtime (works in modern browsers without a build step). For Apple-touch / older-browser fallback, drop your `favicon.png` into `public/favicon.png` and add a normal `<link>` in your HTML shell.

## File layout

```
mindmosaic/
├── shell.jsx                              shared brand + AppShell + primitives
├── pages/
│   ├── Authentication.jsx                 standalone (no shell)
│   ├── Landing.jsx                        standalone (no shell)
│   ├── StudentDashboard.jsx               role: student
│   ├── StudentHome.jsx                    role: student (kid-friendly variant)
│   ├── StudentResults.jsx                 role: student
│   ├── StudentLearningHub.jsx             role: student
│   ├── StudentPractice.jsx                role: student (mid-session UI)
│   ├── StudentAssignments.jsx             role: student
│   ├── StudentEngagement.jsx              role: student (gamification)
│   ├── ExamEngine.jsx                     special: full-screen, no portal shell
│   ├── ParentDashboard.jsx                role: parent
│   ├── ParentBilling.jsx                  role: parent
│   ├── TeacherDashboard.jsx               role: teacher
│   ├── TeacherStudentDetail.jsx           role: teacher
│   ├── TeacherAnalytics.jsx               role: teacher
│   ├── TeacherAssignmentEngine.jsx        role: teacher
│   └── AdminIntelligence.jsx              role: admin
└── README.md
```

## Architecture

### `shell.jsx` exports

| Export | Type | Purpose |
| --- | --- | --- |
| `Logo` | component | Brain SVG mark, sized via `size` prop |
| `Wordmark` | component | "MindMosaic" two-colour wordmark |
| `BrandLockup` | component | Logo + wordmark + optional sub-line |
| `Favicon` | component | Injects inline SVG favicon at runtime |
| `AppShell` | component | Top-level layout: sidebar + topbar + main |
| `Card`, `CardHeader` | component | Surface primitives |
| `Pill`, `SectionTitle`, `Skeleton` | component | UI primitives |
| `CheckMark`, `CrossMark`, `QuestionMark` | component | Marker-pen mark SVGs |
| `useCountUp` | hook | Tween number → display, eased |
| `pctTone`, `trendIcon`, `trendText` | helper | Map values to tones / icons |
| `TONE_HEX`, `TONE_BADGE`, `TONE_TEXT`, `TONE_BAR_BG`, `TONE_ICON_BG` | object | Tone tables |

### `<AppShell>` API

```jsx
<AppShell
  role="student" | "parent" | "teacher" | "admin"     // determines main nav
  active="dashboard"                                  // id of active main-nav item
  pageTitle="Dashboard"                               // breadcrumb / topbar title
  breadcrumbs={["Results"]}                           // optional ancestors
  contextualSection={{                                // PER-PAGE sidebar action group
    title: "Quick start",
    items: [{ id, icon, label, hint?, tone? }],
  }}
  recentSection={{                                    // optional recent items list
    title: "Recent results",
    actionLabel: "See all",
    items: [{ id, title, date, score?, current? }],
  }}
  topBarSlot={<...>}                                  // optional extra topbar content
  user={{ name, role, plan }}
  contentMaxWidth="max-w-[1200px]"                    // optional; default shown
>
  {pageContent}
</AppShell>
```

The **per-page sidebar** is the architectural commitment of this build. Every portal page declares its own `contextualSection` (a small action group below the main nav) and optionally its own `recentSection`. The main nav set is derived from `role`. The shell handles the mobile drawer, escape-to-close, focus rings, and active states.

## Peer dependencies

```
react ^18
framer-motion ^11
recharts ^2.12
lucide-react
tailwindcss ^3   (default config — no custom theme tokens required)
```

Install:

```bash
npm install react framer-motion recharts lucide-react
npm install -D tailwindcss postcss autoprefixer
```

Tailwind config: the default `content` paths must include wherever you drop these files. No theme extension needed — every colour used is in the default palette.

## Integration

1. Drop `shell.jsx` into `src/components/shell.jsx` (or split it into `src/components/shell/` if you prefer one file per export — the module is self-contained).
2. Drop the 17 page files into `src/pages/`.
3. Wire your router. Every page is a default export with sensible default props, so you can mount any of them in isolation.
4. Replace the inline dummy data exports (e.g. `dashboardData`, `examResult`, `parentData`, …) with your real data. Each page accepts `data` (or `result` / `session` / `exam`) as a prop with the same shape.
5. Drop your `favicon.png` into `public/favicon.png` for browser fallback. The runtime SVG favicon is automatic.

## Demo state switcher (dev-only)

`StudentDashboard.jsx` exposes a small floating "Demo state" switcher (active / loading / empty). It's gated by `showStateSwitcher` (defaults to `true` for the demo). **Set it to `false` in production**:

```jsx
<StudentDashboardPage showStateSwitcher={false} />
```

## Known deferred items

Things that are intentionally not in this codebase. They're out of scope for the design system but worth knowing about before shipping:

- **Routing** — every page renders standalone; you bring the router.
- **Data layer** — all pages use inline dummy data. Swap in your queries / fetchers via props.
- **Auth flow** — `Authentication.jsx` calls `onSubmit({ kind, email, password })`; no actual auth is wired.
- **Persistence** — the in-memory state in `StudentPractice.jsx` and `ExamEngine.jsx` resets on remount. Production needs server-side answer persistence and timer validation (the exam timer is a plain `setInterval` and is trivially defeatable).
- **Focus trap** in mobile drawer — escape closes it, but tab can leave it. Add `focus-trap-react` or similar before shipping.
- **Dark mode** — not implemented.
- **i18n** — copy is English-only and inline. Pull strings out before localising.
- **Tests** — none yet.
- **Real export / share / PDF** in `StudentResults.jsx` — buttons are inert.
- **Real submission grading** in `TeacherAssignmentEngine.jsx` — auto-scores are mocked.
- **The `pages/` directory imports `../shell.jsx`** — if you move files, update those imports together.

## File-size note

A few pages (`StudentDashboard`, `StudentResults`, `Landing`) are heavier; most are 200–400 lines. Each is a single self-contained file deliberately, to keep grep'ability and hand-off simple. If your team prefers smaller modules, split each page along the obvious section boundaries (the comment headers like `/* === SCORE RING === */` mark them).
