# CLAUDE_DESIGN_PROMPTS.md — Claude Design Prompt Catalogue (v1.0)

> Companion to `CLAUDE_PROMPTS.md` (Claude Code) and `UI_CONTRACT.md` / `SCREEN_SPECS.md`. Decision authority: ADR-0025.
>
> **What this file is:** the full set of prompts for using Claude Design (`claude.ai/design`) as the high-fidelity prototyping tool for MindMosaic v1 frontend stages. Output of Claude Design feeds into Claude Code's existing C-C-D-V flow as a *visual reference*, in line with `UI_CONTRACT.md §1.1`.
>
> **What this file is NOT:** an implementation guide. Claude Design produces visual prototypes; Claude Code produces production code. The contracts in `BUILD_CONTRACT.md` apply to code, not to prototypes.

---

## 0. How this file works

### 0.1 Tool split

| Tool | Owns | Output |
|---|---|---|
| **Opus (claude.ai chat)** | Planning, prompt authoring, ADR review, audits, evening rituals | Prompts, decisions, audit notes |
| **Claude Design** | Design-system grooming (auto-derived from repo), high-fidelity screen prototypes | Visual prototypes (interactive HTML/React, exported) consumed as **visual reference only** per `UI_CONTRACT §1.1` |
| **Claude Code** | Production implementation per stage | Code, tests, migrations, commits |

Claude Design **does not replace** the existing `docs/mockups/` HTML mockups during Phase 0 (they are the locked visual reference for Stages 1–14). Claude Design is introduced from **Stage 22** onward to raise the quality of in-flight Phase 1 / Phase 2 / Phase 4-slice screens, and to fill any visual gap where the original 17 HTML mockups are weaker than the production bar.

### 0.2 Why this split

`UI_CONTRACT §1.1` already says: "Mockups are visual reference only — they are not implementation source." Claude Design fits this contract by producing *better* visual references — interactive, themed against the live `packages/ui` source of truth, and easier to iterate on — without changing the implementation pipeline. Code still flows through `BUILD_CONTRACT`, `DEV_PLAN`, and Claude Code C-C-D-V prompts.

### 0.3 Files this catalogue produces

For each frontend stage from Stage 22 onward, one prototype is created in Claude Design and a screenshot/export is committed to:

```
docs/design/prototypes/
├── stage-22_session-selection.png
├── stage-22_practice.png
├── stage-23_exam-engine.png
├── stage-23_exam-engine_warn-state.png
├── stage-23_exam-engine_offline-state.png
├── stage-24_results_scored.png
├── stage-24_results_practice.png
├── stage-24_results_diagnostic.png
├── stage-25_student-dashboard.png
├── stage-36_parent-dashboard.png
├── stage-37_teacher-dashboard.png
├── stage-38_teacher-student-detail.png
├── stage-39_assignment-engine.png
├── stage-40_student-assignments.png
└── stage-45_billing.png
```

Plus an `INDEX.md` listing the prototype URL inside Claude Design and the SCREEN_SPECS section it implements.

---

## 1. One-time setup — MindMosaic Design System in Claude Design

### 1.1 Primary path — auto-derive via repo connection

Per ADR-0025, the design system is configured by connecting the MindMosaic repository to Claude Design and letting it read `apps/web` + `packages/ui` directly. This avoids manual token transcription and keeps `packages/ui/src/tokens.css` + `packages/ui/src/tailwind.preset.ts` as the single source of truth.

Procedure (~30 minutes total):

1. Open `claude.ai/design`.
2. Create a new project / design system named `MindMosaic v1`.
3. Use the **import from codebase** option.
4. Connect repository `Vishwas2018/mindmosaic`, branch `main`.
5. **Scope: `apps/web` and `packages/ui` only.** Do NOT connect the full monorepo — Anthropic explicitly recommends subdirectory scoping for large repos, and `supabase/`, `packages/types`, `packages/sdk`, `packages/core`, `packages/engines` are noise for visual work.
6. Walk Claude Design through the auto-derived system. It will likely correctly extract: brand purple `#5D3FD3` and accent orange `#ef6843`, slate scale, semantic colors (correct/incorrect/warn), DM Sans / DM Serif Display, radii, shadow tokens, Tailwind preset color names, existing primitives in `packages/ui/src/`.
7. Refine via chat for anything missing (e.g. wordmark composition rules, slogan, shell variants if not picked up from layout files, voice/tone rules from `UI_CONTRACT §9.1`). Use the prompt at §1.2 as a refinement reference — paste only the lines that auto-derive missed.
8. Run the §1.3 verification checklist. Re-prompt for any failures.
9. Update `docs/design/prototypes/INDEX.md` Design system section: configured date, Claude Design URL.
10. Commit: `docs(design): MindMosaic v1 design system configured in Claude Design`.

Re-sync the repo connection whenever `packages/ui/src/tokens.css`, `tailwind.preset.ts`, `index.ts` (component exports), or shell layouts change materially. INDEX.md "Re-sync triggers" section is the source of truth for when.

### 1.2 Fallback / refinement prompt — manual paste

Use this only as a fallback if Claude Design's auto-derive misses tokens or rules, or to refine specific sections (voice/tone, shell rules) that aren't fully expressible in CSS. Paste only the relevant subsections.

```
Configure a design system named "MindMosaic v1" for an Australian
adaptive-learning SaaS targeting NAPLAN Year 5 Numeracy and ICAS
Math Paper C. Audience: students aged 9–12, parents, teachers,
platform admins. Tone: warm, calm, focused, encouraging — never
playful-cute, never austere-corporate.

This system is binding. Every screen prototype in this project
will reference it. Do NOT introduce ad-hoc colors, fonts, radii,
or shadows outside this system.

# COLOR TOKENS

Brand purple (canonical):
  brand-50  #F5F3FF
  brand-100 #EDE9FE
  brand-200 #DDD6FE
  brand-300 #C4B5FD
  brand-400 #9580E5
  brand-500 #5D3FD3   — primary brand
  brand-600 #4A2BBA   — hover
  brand-700 #3A1FA0   — active
  brand-800 #2A1583
  brand-900 #1a1a60   — deep brand text

Slate (cool neutral, biased toward brand):
  slate-25  #FDFCFE
  slate-50  #FAF8FF   — page background
  slate-75  #F0EDF8   — hovered surfaces
  slate-100 #E9E5F5   — default border
  slate-150 #D6D0E8   — strong border
  slate-300 #A8A0C0   — muted icons
  slate-500 #7C7399   — muted text
  slate-600 #3B3566   — secondary text
  slate-800 #1E1B4B   — primary text
  slate-950 #0e1118   — admin dark sidebar ONLY

Semantic:
  correct-50/100/200/500/600/700: greens (#f0fdf4 → #15803d)
    correct-600 #16a34a is the success-text-on-light token
  incorrect-50/100/200/500/600/700: reds (#fef2f2 → #b91c1c)
    incorrect-600 #dc2626 is the error-text-on-light token
  warn-50/100/200/500/600/700: ambers (#fffbeb → #b45309)
    warn-600 #d97706 is the warning-text-on-light token

Accent orange ("Mosaic" wordmark + results hero glow):
  accent-300 #f9a825   — marketing landing page ONLY
  accent-400 #ef8c56   — on purple surfaces (auth overlay)
  accent-500 #ef6843   — canonical in-app accent

Surfaces:
  bg            slate-50
  surface       #FFFFFF
  surface-alt   slate-25
  field-bg      slate-25
  border        slate-100
  border-strong slate-150

# TYPOGRAPHY

Fonts: DM Sans (UI default, all weights 400/500/600/700) and
DM Serif Display (reserved for hero moments only).

Scale:
  text-xs   12px / 1.4   pills, microcopy
  text-sm   14px / 1.5   nav, button labels, secondary body
  text-base 15px / 1.65  body default (NOT 16 — base is 15)
  text-lg   17px / 1.5   card titles
  text-xl   20px / 1.4   section headings
  text-2xl  24px / 1.3   page headings (and serif auth title)
  text-3xl  30px / 1.2   hero numbers (tabular)
  text-[42px] 42px / 1.1 serif hero (results ring, landing H1)

Serif rules — hard:
  USE serif for: auth form titles, results hero ("Well Done,
  Sarah!"), landing H1, dashboard page heroes if called out.
  NEVER use serif for: body text, labels, button text, nav,
  data values, table headers.

Numerals: timer, score, percentages, countdowns ALWAYS use
tabular-nums.

# SHAPE

Radius:
  --r-btn      8px   buttons
  --r-card     12px  cards, modal content
  --r-card-lg  16px  auth form, hero cards
  --r-field    10px  inputs
  --r-opt      10px  question option buttons
  --r-pill     9999px

Border:
  default       1px
  strong        1.5px (option buttons, secondary buttons)

# SHADOW

shadow-card        0 0 0 1px rgba(26,26,96,.03), 0 1px 2px rgba(93,63,211,.04), 0 4px 12px -4px rgba(93,63,211,.06)
shadow-card-hover  0 0 0 1px rgba(26,26,96,.03), 0 4px 12px rgba(93,63,211,.08), 0 8px 24px -8px rgba(93,63,211,.12)
shadow-elevated    0 8px 24px rgba(93,63,211,.10), 0 2px 6px rgba(93,63,211,.06)
shadow-modal       0 24px 56px -12px rgba(26,26,96,.25)
shadow-form        0 2px 6px rgba(93,63,211,.05), 0 8px 24px -8px rgba(93,63,211,.08)
shadow-focus       0 0 0 3px rgba(93,63,211,.25)

# MOTION

fast 150ms cubic-bezier(0.4,0,0.2,1)  hover, focus, tap
base 200ms cubic-bezier(0.4,0,0.2,1)  card / modal
slow 400ms cubic-bezier(0.4,0,0.2,1)  progress, ring fills
duration-progress 800ms (one-shot on mount)
duration-ring     1000ms (one-shot on mount, results ring)

Rules:
- prefers-reduced-motion: reduce — all transitions become 0.01ms
- Hover translate max -1px, scale max 1.01, never rotate
- No parallax, no scroll-linked animations, no autoplay video

# SPACING

Use a 4px base. Card interior p-6 (24px) default, p-4 (16px) for
dense cards. Card grid gap: gap-4 (16) mobile, gap-6 (24) desktop.
Section vertical rhythm space-y-8 (32). Auth form p-8 (32).

# BRAND WORDMARK

The wordmark is "Mind" in brand-500 purple + "Mosaic" in
accent-500 orange (#ef6843). Both DM Sans semibold. Used in:
  - Public auth header (left)
  - In-app TopNav (left)
  - Landing page header
  - Email templates

Slogan "Turning practice into mastery" appears below the wordmark
on landing and auth screens, DM Sans regular, slate-600,
text-sm. Never used in-app once authenticated.

# SHELLS (5 LAYOUT VARIANTS)

1. PUBLIC — auth + landing.
   No global nav. Auth: centered max-w-[420px] form, r-card-lg,
   shadow-form, p-8. Landing: own marketing header (logo + Login
   + Sign up buttons), full-bleed sections.

2. STUDENT-PARENT — student or parent role.
   TopNav 64px sticky, bg-white/80 backdrop-blur-xl, border-b
   slate-100. Logo left, nav center, user menu right. Content
   max-w-6xl mx-auto px-6 py-8.

3. TEACHER — teacher role.
   Sidebar 260px sticky full-height (light, not dark) +
   minimal top bar 48px (search + user menu). Content fills
   remaining width, px-8 py-6. Below lg (1024), sidebar →
   drawer triggered by hamburger.

4. ADMIN — platform_admin only.
   Dark sidebar 220px (slate-950 bg, brand-400 active state) +
   light top bar. Content white surface. Read-only + jobs in
   v1; no tenant self-serve UI.

5. FOCUS — exam + practice only.
   Custom minimal header: logo left, timer center, exit right.
   No user menu. Left sidebar 240px showing question map.
   Below lg, question map → bottom sheet.

# COMPONENT INVENTORY (primitives)

Render preview tiles for each so I can verify them visually.

Layout: AppShell, TopNav, Sidebar, FocusHeader, PageHeader,
        Card, EmptyState
Data:   StatTile, ProgressBar (6px track), SkillBar, StatRing
        (120px hero / 48px compact, stroke 5), Pill, Avatar
        (24/32/40/64), Table, Breadcrumbs, Tabs (with count
        pills)
Forms:  Input (44px tall, floating label, r-field), Select,
        Textarea (min-h 120), Checkbox (18px, brand-500
        checked), RadioGroup, Button (primary/secondary/ghost/
        danger/submit; sm/md/lg), IconButton (44×44 tap target),
        FormField, PasswordRulesChecklist (10+ chars, letter,
        number — NIST aligned, only 3 rules)
Overlay:Dialog (max-w 420 default, r-card-lg, shadow-modal),
        ConfirmDialog, Toast (top-right desktop, bottom-center
        mobile, auto-dismiss 5s), Tooltip, Banner (info/success/
        warn/error/dismissible), LoadingState (skeletons, NO
        spinners inside cards), ErrorBoundary, OfflineBanner
Nav:    NavLink, SidebarNavLink, UserMenu, Bell (0 / 1–9 / 9+)

# STATES MATRIX

Every data-bound component MUST render five states:
  Loading — skeleton matching final shape, NO spinner in card
  Empty   — EmptyState primitive: icon + title + description
            + optional CTA
  Error   — widget-level card: icon + retry, never page-level
  402     — Upgrade prompt: "Upgrade to {tier}" → /billing
  Content — normal data render

Show the state matrix as a 5-column comparison grid for a
representative widget (e.g. StatTile + recent-sessions list).

# A11Y BASELINE

- Visible focus ring on every interactive element (shadow-focus)
- 44×44px minimum tap target on all icon-only buttons
- Color contrast AA on all body and label text
- aria-live="polite" on timer, autosave indicator, password
  checklist
- aria-live="assertive" on timer-expiry warnings
- Screen-reader labels on every icon-only button

# VOICE & TONE (microcopy rules)

- Direct, never cute. Never "Whoops!" or "Oops!".
- On error: say what happened. "We couldn't save your answer.
  Trying again."
- Never congratulate a wrong answer. "Not quite — here's what
  tripped you up."
- Parent explanations: observation → interpretation → suggestion.
  "Aria has been pausing on multi-step problems. This often
  means she's strong on the steps but losing her place in
  longer questions. A short practice on two-step word problems
  might help."
- Teacher analytics: plain English over statistics.
  "5 students struggling with fractions" — never "5 students
  with mastery <0.4 on σ1.2".

# CONFIRMATION

Render the following confirmation grid so I can verify the
system loaded correctly:

  Row 1: Button primary | Button secondary | Button ghost
         | Button danger | Button submit (size md)
  Row 2: Input idle | Input focused | Input error
         | Input success | Input disabled
  Row 3: Card default | Card interactive hover
         | EmptyState | StatTile positive | StatRing 75%
  Row 4: Brand wordmark | Slogan beneath wordmark
         | TopNav (logged-in) | Sidebar teacher (item active)
         | FocusHeader (timer warn state)
  Row 5: Toast success | Banner error | Dialog confirmation
         | Tabs with count pills | LoadingState skeleton (card)

Use the canonical brand purple #5D3FD3 and orange #ef6843
visibly in the wordmark. The slogan "Turning practice into
mastery" should appear once.
```

### 1.3 Verification checklist (run after auto-derive or manual paste)

After Claude Design renders the system, check each line. Re-prompt only the lines that fail. Do not proceed to per-screen prompts until all green.

- [ ] Brand purple `#5D3FD3` appears as the primary button fill
- [ ] Hover state on primary button uses `#4A2BBA` (brand-600), not a generic darken
- [ ] Wordmark renders "Mind" purple + "Mosaic" orange (`#ef6843`), DM Sans semibold
- [ ] Slogan "Turning practice into mastery" appears once, slate-600, text-sm
- [ ] DM Serif Display is used **only** in the auth-form-title preview if shown — never on a button or label
- [ ] Page background is slate-50 (`#FAF8FF`), not pure white
- [ ] Cards have `--r-card` (12px) radius, not 8px or 16px
- [ ] StatRing renders 120px hero with stroke-5
- [ ] Sidebar (admin) is dark (`slate-950 #0e1118`); sidebar (teacher) is light
- [ ] Focus ring visible on a focused Button preview
- [ ] PasswordRulesChecklist shows exactly 3 rules (10+ chars, letter, number) — NOT 5
- [ ] LoadingState examples are skeletons, not spinners
- [ ] Wordmark + slogan do **not** appear inside in-app shell previews (TopNav, Sidebar) — only in public/auth/landing
- [ ] No emoji, no rounded-full avatars on buttons, no neon gradients
- [ ] Component primitives render with the same names as `packages/ui/src/index.ts` exports (Button, Card, Input, etc. — not "PrimaryButton" or "FilledCard")

If Claude Design's design-system editor doesn't expose all token primitives directly, ask for them rendered as a "tokens demo screen" prototype the first time, then reference that demo in subsequent screen prompts.

---

## 2. Per-screen prototype prompt template (reusable)

Use this for every screen prototype. Fields in `<…>` are filled per stage. Sections marked with ★ are mandatory in every output. With repo connection active, Claude Design already knows the shells and primitives — keep prompts focused on screen-specific content, states, and variants.

```
Project: MindMosaic v1
Design system: MindMosaic v1 (already configured via repo
connection — do NOT redefine tokens)

Generate a high-fidelity prototype for the following screen.

# 1. Identity
- Screen: <e.g. "Session Selection">
- Route: <e.g. /session-selection>
- Shell variant: <one of: public | student-parent | teacher | admin | focus>
- Stage in DEV_PLAN: <e.g. Stage 22>
- Mockup reference: <e.g. 05-student-home.html — already locked
  in repo; you do NOT need to access it; visual goal is described
  below>
- SCREEN_SPECS section: <e.g. "Screen 8 — Session Selection">

# 2. Audience and intent
<2–3 sentences. Who looks at this screen, what they are trying
to do, what success looks like in 5 seconds of viewing.>

# 3. Content (locked) ★

<Bullet list: every block on the page in render order. For each,
specify: heading copy (verbatim where SCREEN_SPECS provides it),
data shape, primitive used. Example:

- PageHeader: title "Start a session" (DM Sans, NOT serif),
  subtitle "Pick what you want to focus on today",
  no action slot.
- Pathway tiles grid (3 columns desktop, 1 mobile) — each tile:
  Card-interactive with pathway icon (40px brand-500), name
  (text-lg), 1-line description (text-sm slate-600), bottom
  meta row (Pill: "NAPLAN" or "ICAS" or "Practice"; small text
  est. duration).
- Locked pathway treatment: same Card but with a Pill
  variant="warn" "Premium" overlay top-right and a 0.6 opacity
  on the card body. Click → upgrade dialog (do not navigate).
- Recent sessions list (4 most recent) — Table with columns:
  Pathway, Score, When, Action ("Resume" if interrupted /
  "Review" if completed).
- Empty-state (no recent sessions): EmptyState primitive
  centered below tiles, copy "No sessions yet. Pick a pathway
  to start.">

# 4. Fields and actions ★

<For each interactive element list: label, what it does, target,
disabled conditions. Pull verbatim from SCREEN_SPECS where
present.>

# 5. States to render ★ (mandatory — render all five as separate frames)

a. Loading — skeletons matching final layout (no spinners)
b. Empty — <which empty state applies; what the user sees>
c. Error (general 5xx) — widget-level error card with retry
d. Error (402 upgrade) — <only if applicable; if not, write "n/a">
e. Content — normal data populated

For data-heavy screens, also render any state-specific variants
called out below in §6.

# 6. Variants and edge cases ★

<List ALL variants required. Example for the exam engine:
  - Timer normal
  - Timer warn (≤5 min remaining; warn-* tokens)
  - Timer danger (≤1 min remaining; incorrect-* tokens)
  - Offline banner active (OfflineBanner at bottom)
  - Saving indicator visible (pill "Saved" top-right)
  - Submit confirmation dialog (with N unanswered)
  - Question map: answered + flagged + current + unanswered>

# 7. Responsive ★

Render at three breakpoints:
  - Desktop 1280px (primary)
  - Tablet 1024px (functional)
  - Mobile 768px (functional, not polished)

Mobile-first polish below 768 is deferred to v1.1 — render
mobile in a "works but unpolished" form. Do NOT invent a
mobile-only nav pattern not in §1.1 §1.2 shells (mobile uses
the desktop shell with the documented drawer/bottom-sheet
behaviour, not a bottom-tab bar).

# 8. Accessibility annotations ★

Annotate the desktop frame with:
  - Focus order on Tab (numbered 1, 2, 3, …)
  - aria-live regions (mark with a small badge)
  - Headings outline (h1 / h2 / h3 indicated)
  - Any interactive surface that needs explicit aria-label

# 9. Microcopy ★

<List every string the screen contains with its source: either
a literal from SCREEN_SPECS, or marked NEW (in which case
follow §9 voice rules from UI_CONTRACT — direct, warm, no
"Whoops"/"Oops", parent observation→interpretation→suggestion).
NEW strings will be reviewed in the handoff and committed to
apps/web/src/lib/copy.ts; do not freeform them at code time.>

# 10. Out of scope (do NOT render)

<Anything explicitly deferred per SCREEN_SPECS "Out of scope
for v1". Confirm by listing — this prevents scope creep into
the prototype.>

# 11. Output format

- One frame per state in §5 and per variant in §6 (so a
  3-state + 4-variant screen yields 7 frames at desktop, plus
  2 frames at tablet/mobile of the Content state only — total
  9 frames).
- Each frame labelled with its state/variant name in the
  bottom-left.
- Use only tokens from MindMosaic v1 design system. If a
  decision is required that the design system does not cover,
  STOP and ask before proceeding.

# 12. Handoff note

When done, summarise:
  - Frames produced (count + names)
  - Any token gaps you hit (and how you resolved them)
  - Any SCREEN_SPECS ambiguity you noticed (file as Q-NNNN
    in the handoff comment so the implementing engineer can
    raise it in QUESTIONS.md)
```

---

## 3. Phase 1 frontend prompts (Stages 22–25)

These are the immediate-use prompts. Vish executes them between Day 27 and Day 32 (per `DEV_PLAN.md §2`). Each prompt is a fully-populated instance of the §2 template, ready to paste into Claude Design.

### 3.1 Stage 22 — Session Selection (Day 27)

```
Project: MindMosaic v1
Design system: MindMosaic v1

Generate a high-fidelity prototype for the following screen.

# 1. Identity
- Screen: Session Selection
- Route: /session-selection
- Shell variant: student-parent
- Stage: 22 (DEV_PLAN.md §2)
- SCREEN_SPECS section: "Screen 8 — Session Selection (/session-selection)"
- Mockup reference: docs/mockups/05-student-home.html (titled
  "Start a Session" despite filename)

# 2. Audience and intent
A 9–12-year-old student, logged in, choosing what to do next:
either an entitled assessment pathway (NAPLAN / ICAS), a
practice run, or a diagnostic. Success in 5 seconds: the
student clearly sees what's available, what's locked behind
upgrade, and what they did most recently.

# 3. Content (locked)

- TopNav (student-parent shell): Wordmark left, NavLinks
  ("Home", "Practice" active, "Learn", "Assignments"),
  Bell (count 0), UserMenu right.
- PageHeader: title "Start a session" (DM Sans), subtitle
  "Pick what you want to focus on today".
- Pathway tiles grid:
  - 3 columns desktop, 1 mobile
  - Each tile is a Card-interactive
  - Tile content: pathway icon (40px brand-500 outline), name
    (text-lg semibold slate-800), 1-line description (text-sm
    slate-600), bottom meta row with Pill (variant brand:
    "NAPLAN", "ICAS", or "Practice") and est. duration
    (text-xs slate-500).
  - Tiles to render:
      1. NAPLAN Y5 Numeracy — adaptive — "~40 min" — entitled
      2. ICAS Math Paper C — linear — "~50 min" — entitled
      3. Skill Practice — practice — "~15 min" — entitled
      4. Diagnostic Check-in — diagnostic — "~20 min" — entitled
      5. Olympiad Practice — practice — "~30 min" — LOCKED (Premium)
      6. Selective Schools Prep — adaptive — "~60 min" — LOCKED (Premium)
- Locked tile treatment:
  - Card body opacity 0.6
  - Top-right corner Pill variant="warn" "Premium"
  - Hover shows tooltip: "Upgrade to Premium to unlock"
  - Click does NOT navigate; opens upgrade dialog
- Recent sessions section:
  - Heading text-xl "Recent sessions"
  - Table (4 most recent rows): columns Pathway / Score /
    When (relative, e.g. "2 hours ago") / Action
  - Action column: "Resume" Button (primary, size sm) if
    session.state === 'in_progress' or 'interrupted',
    "Review" Button (ghost, size sm) if 'completed'
- Empty state for Recent sessions: EmptyState centered,
  copy "No sessions yet. Pick a pathway above to start."

# 4. Fields and actions

| Element | Action |
|---|---|
| Pathway tile (entitled) | Navigate /session/new?pathway={slug} |
| Pathway tile (locked) | Open upgrade dialog (do not navigate) |
| Resume button | Navigate /session/{id}/exam (or /practice) |
| Review button | Navigate /results/{id} |
| Upgrade dialog primary | Navigate /billing |

# 5. States to render

a. Loading — page header, then 6 skeleton tiles
   (Card-shaped slate-100 fills, no shimmer description),
   then 4 skeleton table rows.
b. Empty (recent sessions) — EmptyState replaces the table.
   Tiles still render normally above.
c. Error (5xx loading pathways) — widget-level error card
   replacing the tile grid: "Couldn't load pathways. Try
   again." + Retry button. Recent sessions still render.
d. Error (402 upgrade) — render upgrade dialog open over the
   page, triggered by clicking a locked tile. Title "Premium
   pathways", body "Olympiad Practice is part of MindMosaic
   Premium. Upgrade to unlock all pathways and remove
   session limits." Primary button "Upgrade to Premium" →
   /billing. Ghost "Maybe later" closes.
e. Content — full populated (default).

# 6. Variants and edge cases

- Variant: free-tier user with no recent sessions and no
  entitled pathways beyond Practice + Diagnostic — render
  with locked styling on tiles 1, 2, 5, 6 and EmptyState
  for recent sessions.

# 7. Responsive

Render Content state at 1280, 1024, 768.

# 8. Accessibility annotations

- Focus order: TopNav links 1–4, Bell 5, UserMenu 6,
  PageHeader (no focus), each Pathway tile 7–12,
  each Recent session row's primary action 13+.
- Pathway tile interactive: must be a <button> or <a>
  with full card area as the click target. aria-label
  includes the pathway name + status ("Premium — locked"
  if locked).
- Upgrade dialog: focus trap; first-focus on primary button;
  ESC closes; aria-labelledby points to title.

# 9. Microcopy

All copy above is from SCREEN_SPECS or NEW. NEW strings:
  - "Pick what you want to focus on today" — propose to
    SCREEN_SPECS update
  - Upgrade dialog body — propose to copy.ts
Mark all NEW strings clearly so they can be reviewed.

# 10. Out of scope (do NOT render)

- Search/filter pathways (deferred)
- Pathway favourites or pinning (deferred)
- Estimated time-to-completion-from-now ML estimate (deferred)
- Personalised recommendation banner (Stage 25 / Stage 40)
- Continue-last-session callout (this lives on Student Home,
  not here — Stage 25)

# 11. Output format

One frame per state in §5 (a–e) plus the variant in §6, all at
desktop 1280. Then frames d. tablet 1024 and e. mobile 768 of
the Content state only.

# 12. Handoff note

Summarise frames produced + any SCREEN_SPECS ambiguity caught.
```

### 3.2 Stage 22 — Practice (Day 27, second screen)

```
Project: MindMosaic v1
Design system: MindMosaic v1

Generate a high-fidelity prototype for the following screen.

# 1. Identity
- Screen: Practice
- Route: /session/[id]/practice
- Shell variant: focus
- Stage: 22 (DEV_PLAN.md §2)
- SCREEN_SPECS section: "Screen 10 — Practice"
- Mockup reference: docs/mockups/08-practice.html

# 2. Audience and intent
Same student as Session Selection, now mid-practice. Practice
differs from Exam in two ways: immediate feedback after each
answer, and an in-session summary modal. Success: the student
focuses on the question, gets clear correct/incorrect
feedback, and feels progress.

# 3. Content (locked)

- FocusHeader (focus shell): wordmark left (smaller, no
  slogan), session-progress dots center (e.g. "3 / 12" with
  small dot row visualizing answered), Exit button right
  (ghost, "Exit" text + arrow icon).
- Question card (centered, max-w-3xl, surface, r-card,
  shadow-card, p-8):
    - Question heading (h1, text-xl semibold slate-800)
    - Stimulus (optional: image / table / passage —
      render an example with a small math diagram)
    - Options grid: 4 options as Card-like buttons
      (r-opt 10px, border 1.5px slate-100, hover border
      brand-500 + bg slate-50, selected: border brand-500
      + bg brand-50)
    - Each option: letter chip (A/B/C/D) on left, option
      text right, both DM Sans
- Footer: ghost "Skip" left, primary "Submit answer" right
  (disabled until selection made).
- Right side: small QuestionMap (140px wide) showing
  answered (correct = correct-500, incorrect = incorrect-500),
  unanswered (slate-100), current (brand-500 ring).

# 4. Fields and actions

| Element | Action |
|---|---|
| Option card | Selects (single-select), enables Submit |
| Submit answer | POST /sessions/{id}/respond, opens feedback panel |
| Skip | Mark unanswered, advance |
| Exit | Confirmation dialog → /session-selection |
| QuestionMap item | Jump to that question (back-nav allowed in practice) |

# 5. States to render

a. Loading — skeleton question card with 4 skeleton options,
   skeleton QuestionMap.
b. Empty — n/a (a session always has at least one item).
c. Error (5xx on respond) — Toast bottom-right "Couldn't save
   your answer. Trying again." Continue rendering question.
d. Error (402) — n/a here (entitlement checked at session
   create).
e. Content (default) — populated.

# 6. Variants and edge cases (CRITICAL — render all)

- Variant: question idle (no option selected, Submit disabled)
- Variant: question with option B selected (Submit enabled,
  primary)
- Variant: feedback CORRECT — under the question card, a
  feedback panel slides in (correct-50 bg, correct-200
  border, correct-700 heading "Nice work!", explanation
  text, primary "Next question" button)
- Variant: feedback INCORRECT — feedback panel (incorrect-50
  bg, incorrect-200 border, incorrect-700 heading "Not quite
  — here's what tripped you up.", explanation referencing
  the misconception in plain English, primary "Next question"
  button. Show the user's chosen option crossed-through with
  the correct option highlighted.)
- Variant: in-session summary modal — triggered every 5
  questions, Dialog (max-w 480, r-card-lg, shadow-modal):
  "Quick check-in" heading (DM Sans, NOT serif — practice is
  not a hero moment), 3 stat tiles (questions done,
  accuracy, time spent), primary "Keep going" + ghost "Take
  a break" (closes modal and goes to /session-selection).
- Variant: exit-confirmation dialog — "Leave practice?",
  "Your progress is saved. You can resume from Recent
  sessions.", primary "Leave" + ghost "Stay".

# 7. Responsive

Render desktop 1280 + tablet 1024 + mobile 768 (Content
state). On mobile, QuestionMap collapses into a small bar
above the question card.

# 8. Accessibility annotations

- Focus order: Exit (1), Option A (2), B (3), C (4), D (5),
  Skip (6), Submit (7).
- Options use role="radio" inside role="radiogroup".
  Keyboard: arrow keys move selection, Space/Enter selects.
- Feedback panel uses aria-live="polite".
- Exit confirmation dialog: focus trap; first-focus ghost
  "Stay" (defensive default).

# 9. Microcopy

- Heading "Nice work!" — NEW, NIST tone-aligned, propose to
  copy.ts
- Heading "Not quite — here's what tripped you up." —
  literal from UI_CONTRACT §9.1; verbatim
- Modal title "Quick check-in" — NEW, propose
- "Take a break" / "Keep going" — NEW, propose
- "Your progress is saved. You can resume from Recent
  sessions." — NEW, propose

# 10. Out of scope

- Voice narration (deferred)
- Hint system / guided steps (deferred)
- Adaptive difficulty mid-session for practice
  (SkillEngine handles this server-side; no UI affordance)
- Show/hide question map (always visible in v1)

# 11. Output format

Frames at desktop 1280: idle, B-selected, feedback-correct,
feedback-incorrect, in-session summary modal, exit-confirm
dialog, loading. Plus tablet 1024 and mobile 768 of the
content/B-selected state.

# 12. Handoff note

Confirm feedback panel transitions are <300ms, QuestionMap
is non-interactive only as a status indicator (in practice,
clicks DO navigate; in exam they DO NOT cross stages — flag
this divergence).
```

### 3.3 Stage 23 — Exam Engine (Days 28–30) — CRITICAL

This is the highest UX-risk screen in v1 per `DEV_PLAN.md §2 Stage 23` and `UI_CONTRACT.md §5.1`. The prompt is correspondingly comprehensive.

```
Project: MindMosaic v1
Design system: MindMosaic v1

Generate a high-fidelity prototype for the following screen.
This screen is the single most scrutinised UI surface in v1
per UI_CONTRACT §5.1. Render every state and variant called
out — incomplete coverage will be rejected.

# 1. Identity
- Screen: Exam Engine
- Route: /session/[id]/exam
- Shell variant: focus
- Stage: 23 (DEV_PLAN.md §2 Days 28–30)
- SCREEN_SPECS section: "Screen 9 — Exam Engine"
- Mockup reference: docs/mockups/07-exam-engine.html
- UI_CONTRACT critical-screen contract: §5.1

# 2. Audience and intent
A 9–12-year-old student under timed conditions completing a
NAPLAN-style adaptive exam (or ICAS linear). Three things
must be unmistakably clear in the first second: time
remaining, current question position, and how to answer.
Nothing else competes for attention.

# 3. Content (locked)

- FocusHeader (custom for exam):
    - Logo small (28px) left
    - Center: timer pill — large tabular-nums (text-2xl),
      label "Time remaining" above (text-xs uppercase
      slate-500). Pill background slate-50, border
      slate-100. State changes per §6 below.
    - Right: Exit IconButton (ghost, slate-600).
- Left sidebar (240px, sticky, full-height): QuestionMap
    - Heading text-xs uppercase "Questions"
    - Grid 4-wide of 30 IconButtons (44×44):
        - Unanswered: bg slate-50, border slate-100,
          text slate-500, the question number inside
        - Answered: bg correct-50, border correct-200,
          text correct-700 (no correct/incorrect color
          here — exam doesn't reveal correctness)
        - Flagged: bg warn-50 border warn-200 + small
          flag icon top-right
        - Current: ring brand-500 outside border
    - Below: legend mini-chips (Unanswered / Answered /
      Flagged)
    - Below: Submit button (primary, full-width, "Submit
      session", visible only on the last item or when
      all-answered)
- Main area:
    - Question card (max-w-3xl mx-auto, surface, r-card,
      shadow-card, p-8):
        - Question heading h1 (text-xl semibold slate-800)
        - Optional stimulus (image / table)
        - Options as radiogroup of 4 (same styling as
          Practice §3)
    - Footer (sticky bottom inside main area):
        - Left: Flag button (IconButton ghost, flag icon
          + "Flag" label)
        - Right: Previous (ghost) + Next (primary) buttons
        - Center small text: "Question 7 of 30 —
          Numeracy"
- Saved indicator: small Pill "Saved" top-right, fades in
  on autosave success and out 2s later. Never blocks UI.

# 4. Fields and actions

| Element | Action |
|---|---|
| Option | Selects, fires autosave, enables Next |
| Next | POST /sessions/{id}/respond, advance to next |
| Previous | Navigate within current testlet only (back-nav blocked across stages — adaptive constraint) |
| Flag | Toggle flag on current question (visible in QuestionMap) |
| Exit | Confirmation dialog → /session-selection |
| Submit (last item / all-answered) | Confirmation dialog → POST /sessions/{id}/submit → /results/{id} |
| QuestionMap item | Jump to that question (within current testlet only) |

# 5. States to render

a. Loading — full-page skeleton: FocusHeader with skeleton
   timer, skeleton question card (heading + 4 options),
   skeleton QuestionMap (30 grey squares).
b. Empty — n/a.
c. Error (5xx on respond) — inline toast top-right "Couldn't
   save. Trying again." Question stays interactive. Retry is
   automatic; do not block the user.
d. Error (version conflict 409) — Banner top of question
   card: "Session updated elsewhere. Refreshing." Then refetch
   silently. Do not lose the user's selection visually if
   already made.
e. Content — default, mid-session, item 7 of 30, option B
   selected, no flag.

# 6. Variants and edge cases (ALL MANDATORY)

CRITICAL — render every one of these:

- Timer normal: timer pill slate-50 / slate-100 / slate-500
- Timer warn (≤5 min remaining): timer pill warn-50 / warn-200 /
  warn-600. SR-only text "5 minutes remaining."
- Timer danger (≤1 min remaining): timer pill incorrect-50 /
  incorrect-200 / incorrect-600. SR-only text "1 minute
  remaining."
- Saved pill visible (just-autosaved, faded in)
- OfflineBanner active: fixed-bottom Banner variant="warn"
  "Working offline — your answers are saved here and will
  sync when you're back online." Question still answerable.
- Synced toast (just back online): top-right Toast success
  "Synced." 5s auto-dismiss.
- Submit confirmation dialog (variant: with unanswered):
  Dialog "You have 3 unanswered questions. Submit anyway?"
  primary "Submit anyway" + ghost "Go back".
- Submit confirmation dialog (variant: all-answered):
  Dialog "Submit your answers?" primary "Submit" + ghost
  "Go back".
- Exit confirmation dialog: "Leave the session?", "Your
  progress is saved. You can resume from Recent sessions."
  primary destructive "Leave" + ghost "Stay".
- QuestionMap fully answered (all 30 squares green) +
  Submit button visible.
- Adaptive stage boundary: a small banner at top of question
  area "Now starting Section 2 of 3" appears for the first
  3 seconds of the new section, then fades. (Adaptive only —
  not on linear ICAS.)

# 7. Responsive

- Desktop 1280: as above.
- Tablet 1024: QuestionMap shrinks to 200px.
- Mobile 768: QuestionMap becomes a bottom sheet
  (collapsed by default showing a "Q 7 of 30" summary bar,
  expand drawer on tap).

Render Content + Timer-warn at desktop. Render Content at
tablet + mobile.

# 8. Accessibility annotations (NON-NEGOTIABLE)

This is the merge-blocker contract from UI_CONTRACT §5.1
and §7.1.4. Annotate the desktop frame with:

- Focus order: Exit (1), QuestionMap items (2–31, arrow
  keys to traverse, Enter to jump), Question heading
  (skipped, headings aren't tabbable), Option A (32),
  B (33), C (34), D (35), Flag (36), Previous (37),
  Next (38), Submit if visible (39).
- aria-live="polite" badge on the Saved pill, the timer
  warn/danger transitions (NOT every second), and any
  feedback after submit.
- aria-live="assertive" badge on timer-expiry message
  (separate from the timer itself).
- Question heading is the h1; focus moves to it on
  question transition (mark with a "focus moves here"
  arrow).
- Options inside role="radiogroup"; each option is
  role="radio". Mark this on the desktop frame.
- Visible focus ring (shadow-focus) on every interactive
  element — show on Option B in one frame.
- 44×44 tap target on every IconButton (Flag, Exit,
  QuestionMap items).
- Color is not the only indicator: timer warn includes a
  small clock-warn icon in addition to the warn color.

# 9. Microcopy

All literals are from UI_CONTRACT §9.2 microcopy inventory
or SCREEN_SPECS Screen 9. Notably:

- "Working offline — your answers are saved here and will
  sync when you're back online." (verbatim from
  UI_CONTRACT §9.2)
- "Synced." (verbatim)
- "Saved" (verbatim)
- "You have {count} unanswered questions. Submit anyway?"
  (verbatim)
- "5 minutes remaining." / "1 minute remaining." — SR-only

NEW (propose for copy.ts):
- "Now starting Section 2 of 3" — adaptive section banner
- "Leave the session?" + "Your progress is saved. You can
  resume from Recent sessions." — exit confirmation

# 10. Out of scope (do NOT render)

- Calculator (deferred — not in v1 numeracy spec)
- Highlight / annotate text on stimulus (deferred)
- Eliminate option (cross-out distractors) (deferred)
- Voice-over narration (deferred)
- Custom font sizing (uses browser/OS settings only)
- Multi-language support (en-AU only)

# 11. Output format

Render at desktop 1280 every state and variant from §5–§6.
Render Content at tablet 1024 and mobile 768. Total expected:
~14 frames.

Each frame must be labelled clearly in the bottom-left.
Group frames by category (states, timer variants, dialogs,
offline, responsive).

# 12. Handoff note

Summarise:
  - Frame count by category
  - Any UI_CONTRACT §5.1 requirement you weren't sure how
    to render visually (file as Q-NNNN candidates)
  - Any tension between mockup 07-exam-engine.html and
    this spec (these become DAILY_LOG UI-DIVERGENCE
    candidates)
  - Confirmation that NO color was introduced outside the
    MindMosaic v1 palette
```

### 3.4 Stage 24 — Results (Day 31)

```
Project: MindMosaic v1
Design system: MindMosaic v1

Generate a high-fidelity prototype for the following screen,
WITH ALL THREE MODE VARIANTS.

# 1. Identity
- Screen: Results
- Route: /results/[id]
- Shell variant: student-parent
- Stage: 24 (DEV_PLAN.md §2)
- SCREEN_SPECS section: "Screen 11 — Results"
- Mockup reference: docs/mockups/09-results.html
- UI_CONTRACT critical-screen contract: §5.2

# 2. Audience and intent
Student finishing a session sees their result. The screen
is mode-aware: scored (NAPLAN/ICAS), practice, or diagnostic.
Different cognitive frame for each — scored is achievement,
practice is reflection, diagnostic is map-of-strengths.

# 3. Content (locked) — VARIANT-DEPENDENT

VARIANT A — scored:
  - Hero ring (StatRing 120px hero, stroke 5, animate
    stroke-dashoffset over 1000ms on mount). Track slate-100,
    fill semantic by score band:
      ≥80% → correct-500 + accent-500 outer glow
      60–80% → warn-500
      <60% → incorrect-500
  - Hero text DM Serif Display text-3xl above ring:
    "Well done, {firstName}!" if ≥60%, else "Good effort,
    {firstName}." (NEVER congratulate failure — UI_CONTRACT
    §9.1)
  - Below ring, three StatTiles in a row: Accuracy %,
    Questions correct (e.g. "24 / 30"), Time taken
    (mm:ss tabular).
  - Topic breakdown: Card with SkillBars listing each topic
    + percentage + delta vs last attempt.
  - Insights card: ExplanationCard (Card variant) with
    "What we noticed" heading + 1–2 sentence plain-English
    summary from ExplanationDTO.
  - Question review accordion: Tabs (All / Correct /
    Incorrect / Unanswered) with count Pills. Expanded
    item shows: question, your answer, correct answer,
    misconception explanation if applicable.
  - Next-action card at bottom: primary CTA "Practice
    {weakestSkill}" or "Take another practice exam".

VARIANT B — practice:
  - NO hero ring, NO score.
  - Headline: "Practice complete" (DM Serif Display
    text-2xl). Sub-line "Here's what changed."
  - Mastery delta card: list of skills practised + before /
    after mastery bar + delta arrow (correct-600 if up,
    slate-500 if same, incorrect-600 if down — though
    practice rarely goes down).
  - Question summary table: Question, Result (✓ / ✗),
    Time, Misconception (if any).
  - Next-action card: "Try another practice on
    {nextSuggestedSkill}".

VARIANT C — diagnostic (proficiency map, NO score):
  - Headline: "Here's your map" (DM Serif Display text-2xl).
  - Sub-line "We've checked where you're strong and where
    you can grow. There's no score on a diagnostic."
  - Proficiency map: vertical list of skills, each with a
    horizontal bar showing the confidence interval as a
    semi-transparent band, and a notch indicating point
    estimate. Bars colored by status band:
      Developing → slate-400
      Proficient → brand-400
      Advanced → accent-500
  - Status legend below.
  - Next-action card: "Start a focused practice on
    {weakestSkill}".

VARIANT D — repair: stub only.
  - Empty state: "Repair sessions launching soon."
  - Mark as v1.1.

# 4. Fields and actions

| Element | Action |
|---|---|
| Practice CTA | Navigate /session-selection?pathway=practice&skill={id} |
| Review accordion | Toggle expand/collapse |
| Print | window.print(); page must print-safely (no bg) |
| Share | n/a — deferred to v1.1 |

# 5. States to render

a. Loading — skeleton ring + 3 skeleton stat tiles + 3
   skeleton bars + skeleton accordion rows.
b. Empty — n/a (results always have data).
c. Error — full-page error: "We couldn't load your results.
   Try again or come back in a moment." Retry button.
d. Error 402 — n/a here.
e. Content — populated for each variant.

# 6. Variants and edge cases (ALL MANDATORY)

- Variant A.1: scored ≥80% (correct-500 + accent glow)
- Variant A.2: scored 60–80% (warn-500)
- Variant A.3: scored <60% (incorrect-500, "Good effort"
  hero copy)
- Variant B: practice (mastery delta)
- Variant C: diagnostic (proficiency map)
- Variant D: repair stub
- Variant: question review accordion expanded with
  misconception explanation visible
- Variant: print preview (no background, ring outlined,
  tabs all expanded)

# 7. Responsive

Variant A.1 at 1280 / 1024 / 768. Variants B, C, D at 1280
only.

# 8. Accessibility annotations

- Hero ring: aria-label "Score 80%, 24 of 30 correct".
  The ring itself is decorative aria-hidden.
- Stat tiles use proper heading structure.
- Accordion items: button role with aria-expanded.
- Status band colors must not be the only signal — the
  status word ("Developing"/"Proficient"/"Advanced") is
  always present next to the bar.
- Print: ring renders as outlined circle with text "80%"
  inside; no fill animation in print.

# 9. Microcopy

All from UI_CONTRACT §9.1 and SCREEN_SPECS Screen 11.

NEW:
- "Here's your map." (diagnostic) — propose
- "We've checked where you're strong and where you can
  grow. There's no score on a diagnostic." — propose
- "Repair sessions launching soon." — propose

# 10. Out of scope

- Social share buttons (deferred)
- Email me my results (deferred)
- Compare with class average (parent/teacher view only,
  not student)
- Animated confetti on high score (UI_CONTRACT §2.5
  forbids this kind of motion)

# 11. Output format

Frames as listed in §6 + §7. Group by variant.

# 12. Handoff note

Confirm:
  - No serif used outside the hero text
  - Color band thresholds match UI_CONTRACT §5.2
  - Diagnostic confidence interval bar is visible but not
    over-decorated
```

### 3.5 Stage 25 — Minimal Student Dashboard (Day 32)

```
Project: MindMosaic v1
Design system: MindMosaic v1

Generate a high-fidelity prototype.

# 1. Identity
- Screen: Student Home
- Route: /
- Shell variant: student-parent
- Stage: 25 (DEV_PLAN.md §2)
- SCREEN_SPECS section: "Screen 7 — Student Home"
- Mockup reference: docs/mockups/02-dashboard.html
- Note: this is the v1 minimal version. Full Dashboard v2
  (with Weekly Plan widget) is Stage 40. Do NOT include the
  Weekly Plan in this prototype.

# 2. Audience and intent
Student logged in. Above-the-fold goal: "what should I do
right now?" — that means continue-last-session OR a clear
start-something-new affordance. Below the fold: see how I'm
doing across topics.

# 3. Content (locked)

- TopNav (student-parent shell, default).
- Greeting: "Hi {firstName}." (DM Sans text-2xl semibold
  slate-800), subtitle "Ready to keep going?" (text-base
  slate-600).
- Continue-last card (only if active or interrupted session
  exists):
    - Card-interactive, accent-500 left border (4px),
      surface bg, p-6.
    - Heading "Pick up where you left off" (text-lg)
    - Body: "{pathwayName} — {questionsDone} of {total}
      done"
    - Action: Resume Button (primary, size md)
- Quick start tiles (if no continue-last shown, this is the
  hero block; otherwise it's below):
    - 2-column grid of Card-interactive tiles
    - Tile 1: "Start a session" → /session-selection
    - Tile 2: "Quick practice" → /session/new?pathway=practice
- Mastery snapshot card:
    - Heading "Your mastery" (text-xl)
    - List of 5–8 SkillBars (skill name + percentage)
    - Footer link "See all skills" → /learn
- Recent sessions table (4 rows): Pathway / Score / When /
  Action (Review).
- Engagement strip (display-only in v1):
    - Streak indicator (current streak count + flame icon)
    - 1 achievement chip if any earned this week (read-only,
      tooltip: "Earned 2 days ago")

# 4. Fields and actions

| Element | Action |
|---|---|
| Continue-last Resume | /session/{id}/exam|/practice |
| Quick start tiles | /session-selection or /session/new |
| Skill bar | /learn?skill={id} |
| Recent session Review | /results/{id} |
| Achievement chip | tooltip only (no nav in v1) |

# 5. States to render

a. Loading — skeleton greeting, then skeleton continue-last
   card, then skeleton tiles, then skeleton mastery list.
b. Empty (new student, no sessions yet) — no continue-last,
   quick-start tiles become the hero, mastery list shows
   EmptyState ("Your skills appear here once you've taken a
   diagnostic."), recent sessions show EmptyState ("Sessions
   you complete will show here.").
c. Error (5xx loading mastery) — widget-level error replacing
   the mastery card; tiles + recent sessions still render.
d. Error 402 — n/a on dashboard.
e. Content — populated.

# 6. Variants

- Variant: returning student WITH active session (continue-
  last visible at top)
- Variant: returning student WITHOUT active session
  (quick-start tiles at top)
- Variant: brand-new student (Empty state above)

# 7. Responsive

Content variant at 1280 / 1024 / 768.

# 8. Accessibility annotations

- Heading outline: h1 greeting → h2 per major section
- Continue-last card is a single button-like landmark
  (entire card area clickable; aria-label includes both the
  pathway name and the action)
- SkillBars include aria-label "{skill}, {percent} percent"

# 9. Microcopy

- "Hi {firstName}." (NEW; propose)
- "Ready to keep going?" (NEW; propose)
- "Pick up where you left off" (NEW; propose)
- "Your skills appear here once you've taken a diagnostic."
  (NEW; propose)
- "Sessions you complete will show here." (NEW; propose)

# 10. Out of scope

- Weekly Learning Plan widget — Stage 40
- Quick Insights card — Stage 40
- Plan overrides UI — Stage 35 (orchestration backend) +
  Stage 40 (UI)
- Notifications inbox — bell icon only (count badge); full
  inbox is Stage 34
- Calendar / streak history — display only, no interaction

# 11. Output format

3 variants × 1 desktop + 1 variant × tablet + 1 variant ×
mobile + Loading state + Error state. ~7 frames total.

# 12. Handoff note

Confirm engagement strip shows streak only (no claim button;
deferred). Confirm no Weekly Plan widget.
```

---

## 4. Phase 2 frontend prompts (Stages 36–40)

Stages 36–40 are dashboard-heavy, requiring composition primitives (`ChildSwitcher`, `MasterySnapshot`, `ExplanationCard`, `QuestionMap`, `AssignmentListItem`). Use the §2 template; here are the per-stage seeds.

### 4.1 Stage 36 — Parent Dashboard (Days 50–51)

Identity:
- Screen: Parent Dashboard, route `/parent`, shell `student-parent`, SCREEN_SPECS Screen 15, mockup `03-parent-dashboard.html`.

Critical content blocks:
- ChildSwitcher in TopNav center-left (variant of UserMenu, shows current child + dropdown).
- Hero: child readiness ring (StatRing 120px) with pathway label and date.
- Subject areas: 3-column grid of Card with SkillBar per area.
- "What we noticed" / "What would help" cards: ExplanationCard composed from `ExplanationDTO` via versioned templates (`packages/core/src/explain-format.ts`).
- Recent sessions table.

Variants required:
- Single-child parent (no switcher needed; show child name in greeting)
- Multi-child parent (switcher visible, switching animates)
- No-children-linked state ("Add your child" CTA)
- ExplanationCard with each of: low-confidence variant, high-confidence variant, "needs more sessions" variant.

### 4.2 Stage 37 — Teacher Dashboard (Days 52–53)

Identity:
- Screen: Teacher Dashboard, route `/teacher`, shell `teacher`, SCREEN_SPECS Screen 18, mockup `12-teacher-dashboard.html`.

Critical content blocks:
- Sidebar (260px light) with nav: Dashboard / Students / Analytics / Assignments / Settings.
- Top bar 48px (search field + Bell + UserMenu).
- KPI strip: 4 StatTiles (active students, avg mastery, alerts, assignments due).
- Intervention alerts banner (warn variant) listing top 3 alerts; click → student detail.
- Student performance table: name, mastery, last session, alert flag.
- Topic mastery bars per class.

Variants:
- No-classes empty state ("Contact your org admin")
- 1 class
- Multi-class (class switcher in top bar)
- Alert banner present vs cleared

### 4.3 Stage 38 — Teacher Student Detail (Day 54)

Identity:
- Screen: Teacher Student Detail, route `/teacher/students/[id]`, shell `teacher`, SCREEN_SPECS Screen 20, mockup `13-teacher-student-detail.html`.

Critical content blocks:
- Breadcrumbs: Students › {Name}.
- PageHeader with student name + class + action slot (Assign / View plan buttons).
- Strand performance: tabs per strand with SkillBars.
- Misconceptions list with ExplanationCard.
- Recent activity timeline.
- Notes section (teacher-private, simple textarea, save button — v1 simple).

### 4.4 Stage 39 — Assignment Engine (Day 55)

Identity:
- Screen: Teacher Assignment Engine, route `/teacher/assignments`, shell `teacher`, SCREEN_SPECS Screen 22, mockup `15-assignment-engine.html`.

Critical content blocks:
- List view: tabs Drafts / Published / Archived; rows with status, target (class/student), due date, completion stats.
- Creation wizard (4 steps in a Dialog or full-screen route — confirm with SCREEN_SPECS):
  1. Choose target (class or specific students)
  2. Choose content (skill / blueprint / auto-generate)
  3. Set timing (due date, time limit, late policy)
  4. Review + publish
- Tracking view per assignment: per-student progress bars + status pills.

### 4.5 Stage 40 — Student Assignments + Dashboard v2 (Day 56)

Identity:
- Screens: Student Assignments (`/assignments`, shell `student-parent`, SCREEN_SPECS Screen 13, mockup `10-student-assignments.html`) AND Dashboard v2 update.

Critical content blocks (Assignments):
- Tabs: Assigned / In Progress / Completed.
- AssignmentListItem cards with overdue marker variant.

Critical content blocks (Dashboard v2 deltas vs Stage 25):
- Add Weekly Learning Plan widget (Card with 5–7 plan items, each a SkillBar + recommended-time pill).
- Add Quick Insights card (composed from Causal + Behaviour DTOs).
- Bell with unread badge actually wired.

---

## 5. Phase 4 slice — Stage 45 Billing (Days 66–67)

Identity:
- Screen: Billing, route `/billing`, shell `student-parent` (parent-facing), SCREEN_SPECS Screen 17, mockup `04-billing.html`.
- UI_CONTRACT critical-screen contract: §5.4.

Critical content blocks:
- Tabs: Plans / Billing.
- Plans tab: 3 plan cards (Free / Standard / Premium) side-by-side with monthly/yearly toggle, current-tier brand pill, feature comparison table below.
- Billing tab: current plan summary, renewal date, payment method (last 4 + card icon), invoice history table, Cancel / Resume actions, link to Stripe Customer Portal.

Variants:
- Free user (Plans tab default, upgrade CTA prominent)
- Standard user (Plans tab default, "Upgrade to Premium" CTA, downgrade flow visible)
- Premium user (Billing tab default, "Manage subscription" link to portal)
- Failed payment banner (page-top error banner)
- Cancel-confirmation dialog with "You'll keep access until {period_end}" copy
- Post-cancel state with `undo` link visible until period end
- Trial-ending banner (3 days remaining)

---

## 6. Handoff — Claude Design → Claude Code

### 6.1 Workflow

1. **Vish executes a §3–§5 prompt in Claude Design.** Output is a set of frames in the prototype.
2. **Vish exports frames** using Claude Design's built-in Claude Code handoff bundle (preferred — packages design intent for Claude Code consumption) or as PNGs. Place them in `docs/design/prototypes/stage-NN_*.png` (and `stage-NN_*_handoff/` directory for the bundle if applicable). Updates `docs/design/prototypes/INDEX.md` with: stage number, screen name, prototype URL inside Claude Design, frame count, date.
3. **Vish commits**: `chore(design): stage NN prototype — <screen>`. This is a docs-only commit; CI gates that don't apply to docs are skipped.
4. **Vish runs the Claude Code morning prompt for the stage** (per `CLAUDE_PROMPTS.md`). The C-C-D-V prompt that Claude Code generates references the prototypes via `docs/design/prototypes/stage-NN_*.png` in the **Context** section.

### 6.2 C-C-D-V addition for stages with Claude Design prototypes

Add this paragraph to the **Context** section of any C-C-D-V prompt for a stage that has a Claude Design prototype:

```
Visual references for this stage:
  - docs/design/prototypes/stage-NN_<screen>.png (and variants)
  - Source: Claude Design — see docs/design/prototypes/INDEX.md
  - Authority: PROTOTYPE IS VISUAL REFERENCE ONLY per
    UI_CONTRACT.md §1.1. Implement using packages/ui primitives
    and tokens.css; do NOT translate prototype HTML/CSS or
    React verbatim. Where prototype diverges from
    UI_CONTRACT.md or SCREEN_SPECS.md, the contract wins. File
    a UI-DIVERGENCE entry in DAILY_LOG.md noting the divergence
    and reason.
```

### 6.3 NEW microcopy lifecycle

Every prototype prompt asks Claude Design to flag NEW microcopy. The lifecycle is:

1. Prototype lists NEW strings in the §12 handoff note.
2. Vish adds them to `apps/web/src/lib/copy.ts` with the proposed wording.
3. If wording deviates from `UI_CONTRACT §9.1` voice rules, Vish revises and notes the change in `DAILY_LOG.md`.
4. New strings are reviewed against §9 at the stage close (evening ritual).

### 6.4 SCREEN_SPECS divergence lifecycle

If Claude Design surfaces a SCREEN_SPECS gap (a field not specified, an action not covered, an edge case unclear), it must file `Q-NNNN` candidates in §12 of its handoff. Vish adds them to `docs/dev/QUESTIONS.md` per `CLAUDE.md §Spec ambiguity discipline`. Resolution is via either:

- An ADR if the answer is non-obvious, or
- A `SCREEN_SPECS.md` patch (committed separately as `docs(screen-specs): clarify <screen> <field>`) if the answer is mechanical.

Never let the implementation answer a SCREEN_SPECS gap silently.

---

## 7. What Claude Design is NOT used for

- **Code generation.** Claude Design output is visual; production React lives in `apps/web` and `packages/ui` per `BUILD_CONTRACT`. Even if Claude Design outputs React/HTML, treat it as reference, not source.
- **Schema or API design.** Out of scope. Owned by spec / arch / `OWNERS.md`.
- **Token authoring.** `packages/ui/src/tokens.css` is authoritative. Claude Design renders the tokens; it does not invent them.
- **A11y compliance verification.** Claude Design renders annotations for review; the actual a11y gate runs `axe-core` against Storybook stories and Playwright routes per `BUILD_CONTRACT §10` and `UI_CONTRACT §7.1`.
- **Microcopy authority.** Final microcopy lives in `apps/web/src/lib/copy.ts`. Claude Design can propose, but the contract owner (Vish) approves.
- **Engagement / animation polish.** v1 motion rules in `UI_CONTRACT §2.5` are deliberately conservative. Do not let Claude Design's prototypes introduce motion that violates them.
- **Phase 0 stages (1–14).** The 17 HTML mockups remain the locked visual reference. Switching tools mid-Phase-0 risks contradiction.
- **Mobile-first redesign.** v1 mobile is "functional, not polished" per `UI_CONTRACT §10.2`. Do not let Claude Design imagine a mobile-first version of any screen.

---

## 8. Risks and limitations

- **Research Preview status.** Claude Design is in Research Preview as of 2026-05. Features (export formats, design-system editor, prototype URLs, repo connection scoping) may change. Pin a known-working configuration in `INDEX.md` and verify after any Anthropic update notice.
- **Token fidelity drift.** If Claude Design's renderer interprets tokens loosely (e.g. brand-500 rendered as a slightly different purple), the prototype is still authoritative for layout/structure but not for exact color sampling. Always pull color values from `packages/ui/src/tokens.css`, never from the prototype's pixel.
- **Repo drift.** Re-sync the Claude Design repo connection whenever `tokens.css`, `tailwind.preset.ts`, or `packages/ui/src/index.ts` changes materially. Document re-syncs in INDEX.md change log.
- **Prototype-to-code re-translation cost.** Even with prototypes and the handoff bundle, Claude Code still implements from primitives. Budget remains the same; the prototype reduces *visual ambiguity*, not implementation effort.
- **State coverage gaps.** It is easy to leave one of the 5 mandatory states out of a prototype prompt. The §2 template enforces this with the ★ markers — but a tired Vish at Day 27 could miss it. Consider an audit-day item.
- **Subscription token cost.** Per public reviews of Claude Design, high-fidelity prototypes can burn subscription tokens fast. Monitor first two prototypes; if usage spikes, scope frame counts tightly.
- **Adding screens not in `DEV_PLAN`.** Claude Design will happily prototype a screen that isn't in `DEV_PLAN`. Don't. Stick to the stage-by-stage sequencing.
- **Costing prototype work in DEV_PLAN buffer.** Each Phase 1 frontend stage's buffer assumes 1× the planned UI work, not 1× UI + 1× prototype. Either: (a) consume buffer; or (b) run prototypes one stage ahead of implementation (i.e. while Stage 22 implementation runs, Stage 23 prototype is being created — this is the cleaner pattern). Recommend pattern (b) starting at Stage 22.

---

## 9. Sequencing — when to do which prompt

Aligned to `DEV_PLAN.md §2` calendar. Stage day numbers are estimates within each phase window.

| When | Action |
|---|---|
| Now (Stage 18 close, Phase 0 already complete) | Land ADR-0025 + this catalogue + INDEX seed via single docs commit. **Do not redo Stages 1–14** — they are complete; switching now risks re-validation cost with no functional gain. |
| Day 19 evening (during Stage 19 backend work) | Connect repo to Claude Design per §1.1. Verify §1.3 checklist. |
| Day 22 evening | Run §3.1 (Stage 22 Session Selection) prototype |
| Day 23 evening | Run §3.2 (Stage 22 Practice) prototype |
| Day 24–25 evenings | Run §3.3 (Stage 23 Exam Engine) prototype — most expensive, run early |
| Day 26 evening | Run §3.4 (Stage 24 Results) prototype |
| Day 27 | Stage 22 implementation begins; visuals already in repo |
| Day 28 | Stage 23 begins; exam-engine prototype already in repo |
| Day 31 | Stage 24 implementation; visuals in repo |
| Day 32 | Run §3.5 (Stage 25 Dashboard) — and stop. Phase 1 prototypes complete. |
| Day 47 (Stage 33 backend done) | Run §4.1 Parent Dashboard prototype |
| Day 49 | Run §4.2 Teacher Dashboard prototype |
| Day 53 | Run §4.3 Teacher Student Detail prototype |
| Day 54 | Run §4.4 Assignment Engine prototype |
| Day 55 | Run §4.5 Student Assignments + Dashboard v2 prototype |
| Day 64 (Stage 43 backend done) | Run §5 Billing prototype |

This sequencing puts each prototype 2–4 days ahead of its implementation stage. That is the right cushion: late enough that backend DTOs are visible, early enough that implementation isn't blocked.

---

## 10. Change log

| Date | Change | Rationale |
|---|---|---|
| 2026-05-05 | Initial `CLAUDE_DESIGN_PROMPTS.md` v1.0 | Adds Claude Design as the prototype tool for Stage 22+ frontend work, complementing `CLAUDE_PROMPTS.md` for Claude Code. Decision authority: ADR-0025. |

---

*End of Claude Design Prompt Catalogue v1.0.*
