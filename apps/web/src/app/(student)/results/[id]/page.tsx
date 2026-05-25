'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell, Brand, Button, Card, ErrorState, IconButton, LoadingState, TopBar } from '@mm/ui';
import { useSessionSummary } from '@mm/sdk';
import { HeroRing } from '@/components/results/HeroRing';

function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || ms <= 0) return '—';
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

function ResultsFocusHeader({ pathwayName, onExit }: { pathwayName: string | null; onExit: () => void }) {
  return (
    <TopBar>
      <Brand logoSrc="/logo.svg" size="sm" />
      {pathwayName !== null && pathwayName.length > 0 && (
        <span className="ml-4 text-sm font-medium text-[var(--text-2)] truncate max-w-xs print:block">
          {pathwayName}
        </span>
      )}
      <div className="ml-auto print:hidden">
        <IconButton
          label="Back to session selection"
          icon={<span aria-hidden="true">×</span>}
          onClick={onExit}
        />
      </div>
    </TopBar>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center text-sm py-2 border-b border-[var(--border)] last:border-0">
      <span className="text-[var(--muted)]">{label}</span>
      <span className="font-medium tabular-nums text-[var(--text)]">{value}</span>
    </div>
  );
}

export default function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: sessionId } = use(params);
  const router = useRouter();
  const sessionQuery = useSessionSummary(sessionId);
  const { data, isPending, isError } = sessionQuery;
  const refetch = sessionQuery.refetch;

  function handleExit() {
    router.push('/session-selection');
  }

  if (isPending) {
    return (
      <AppShell variant="focus">
        <TopBar>
          <Brand logoSrc="/logo.svg" size="sm" />
        </TopBar>
        <main id="results-main" className="max-w-2xl mx-auto px-6 py-12">
          <LoadingState />
        </main>
      </AppShell>
    );
  }

  if (isError) {
    return (
      <AppShell variant="focus">
        <TopBar>
          <Brand logoSrc="/logo.svg" size="sm" />
        </TopBar>
        <main id="results-main" className="max-w-2xl mx-auto px-6 py-12">
          <ErrorState
            title="Could not load results"
            description="Something went wrong fetching this session."
            onRetry={() => void refetch()}
          />
        </main>
      </AppShell>
    );
  }
  if (!data) {
    return (
      <AppShell variant="focus">
        <TopBar>
          <Brand logoSrc="/logo.svg" size="sm" />
        </TopBar>
        <main id="results-main" className="max-w-2xl mx-auto px-6 py-12">
          <Card>
            <h1 className="text-lg font-semibold text-[var(--text)]">Could not load results</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Something went wrong fetching this session.
            </p>
            <div className="mt-4 flex gap-2">
              <Button variant="secondary" onClick={() => void refetch()}>
                Try again
              </Button>
              <Button variant="ghost" onClick={handleExit}>
                Back to session selection
              </Button>
            </div>
          </Card>
        </main>
      </AppShell>
    );
  }

  const { mode, pathway_name, raw_score, score_band, skills_touched_count, duration_ms, active_duration_ms } = data;

  // Repair mode — v1.1 stub (PHASE-2: RepairEngine not built until v1.1)
  if (mode === 'repair') {
    return (
      <AppShell variant="focus">
        <a
          href="#results-main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-btn focus:bg-[var(--primary)] focus:px-3 focus:py-2 focus:text-sm focus:text-white"
        >
          Skip to main content
        </a>
        <ResultsFocusHeader pathwayName={pathway_name} onExit={handleExit} />
        <main id="results-main" className="max-w-2xl mx-auto px-6 py-12">
          <Card>
            <h1 className="text-lg font-semibold text-[var(--text)]">Session complete</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Repair session results — available in a future release.
            </p>
            <div className="mt-4">
              <Button variant="secondary" onClick={handleExit}>
                Back to session selection
              </Button>
            </div>
          </Card>
        </main>
      </AppShell>
    );
  }

  // Diagnostic mode — proficiency map stub (ISSUE-0011e: analytics-svc not built yet)
  if (mode === 'diagnostic') {
    return (
      <AppShell variant="focus">
        <a
          href="#results-main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-btn focus:bg-[var(--primary)] focus:px-3 focus:py-2 focus:text-sm focus:text-white"
        >
          Skip to main content
        </a>
        <ResultsFocusHeader pathwayName={pathway_name} onExit={handleExit} />
        <main id="results-main" className="max-w-2xl mx-auto px-6 py-12 space-y-6">
          <div>
            <h1
              tabIndex={-1}
              className="text-2xl font-bold text-[var(--text)]"
            >
              Your proficiency profile
            </h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Based on {skills_touched_count} skill
              {skills_touched_count !== 1 ? 's' : ''} assessed
            </p>
          </div>

          {/* TODO: ISSUE-0011e — replace placeholder rows with real ProficiencyMapDTO data from analytics-svc */}
          <Card>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] mb-4">
              Skill levels
            </p>
            {(['Advanced', 'Proficient', 'Developing'] as const).map((band) => (
              <div key={band} className="mb-4 last:mb-0">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-[var(--text)]">{band}</span>
                  <span className="text-xs text-[var(--muted)]">—</span>
                </div>
                <div
                  className="h-2 rounded-full bg-[var(--border)]"
                  role="progressbar"
                  aria-label={`${band} proficiency`}
                  aria-valuenow={0}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
            ))}
            <p className="mt-4 text-xs text-[var(--muted)]">
              Detailed proficiency data available after more sessions.
            </p>
          </Card>

          <div className="flex flex-wrap gap-2 print:hidden">
            <Button variant="secondary" onClick={handleExit}>
              Back to session selection
            </Button>
          </div>
        </main>
      </AppShell>
    );
  }

  // Practice mode — no hero ring (UI_CONTRACT §5.2)
  if (mode === 'practice') {
    return (
      <AppShell variant="focus">
        <a
          href="#results-main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-btn focus:bg-[var(--primary)] focus:px-3 focus:py-2 focus:text-sm focus:text-white"
        >
          Skip to main content
        </a>
        <ResultsFocusHeader pathwayName={pathway_name} onExit={handleExit} />
        <main id="results-main" className="max-w-2xl mx-auto px-6 py-12 space-y-6">
          <h1
            tabIndex={-1}
            className="text-2xl font-bold text-[var(--text)]"
          >
            Practice complete
          </h1>

          <Card>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] mb-3">
              Session summary
            </p>
            <StatRow label="Duration" value={formatDuration(active_duration_ms ?? duration_ms)} />
            <StatRow label="Skills practised" value={String(skills_touched_count)} />
          </Card>

          {/* Mastery delta — TODO: ISSUE-0011d (intelligence-svc Stage 28+) */}
          <Card>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] mb-2">
              Skill progress
            </p>
            <p className="text-sm text-[var(--muted)]">
              Available after more sessions.
            </p>
          </Card>

          {/* Question review — TODO: ISSUE-0011c (useSessionResponses hook not yet built) */}

          <div className="flex flex-wrap gap-2 print:hidden">
            <Button
              variant="primary"
              onClick={() => router.push('/session-selection')}
            >
              Practice again
            </Button>
            <Button variant="ghost" onClick={handleExit}>
              Back to session selection
            </Button>
          </div>
        </main>
      </AppShell>
    );
  }

  // Scored mode — default branch (covers 'scored' + any unknown future mode)
  // UI_CONTRACT §5.2; hero ring per Q-24.6: raw_score is 0–100 percentage
  const score = raw_score ?? 0;

  return (
    <AppShell variant="focus">
      <a
        href="#results-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-btn focus:bg-[var(--primary)] focus:px-3 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to main content
      </a>
      <ResultsFocusHeader pathwayName={pathway_name} onExit={handleExit} />
      <main id="results-main" className="max-w-2xl mx-auto px-6 py-12 space-y-8">
        {/* Hero ring */}
        <div className="flex justify-center py-4">
          <HeroRing score={score} scoreBand={score_band} />
        </div>

        {/* Stats */}
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] mb-3">
            Session summary
          </p>
          <StatRow label="Score" value={`${score}%`} />
          <StatRow label="Skills assessed" value={String(skills_touched_count)} />
          <StatRow label="Duration" value={formatDuration(active_duration_ms ?? duration_ms)} />
        </Card>

        {/* Topic breakdown — TODO: ISSUE-0011a (SessionSummaryDTO has no topic_breakdown field yet) */}

        {/* Performance insights — TODO: ISSUE-0011b (ExplanationDTO SDK hook not built; packages/core/src/explain-format.ts does not exist) */}

        <div className="flex flex-wrap gap-2 print:hidden">
          <Button
            variant="primary"
            onClick={() => router.push('/session-selection')}
          >
            Start new session
          </Button>
        </div>
      </main>
    </AppShell>
  );
}
