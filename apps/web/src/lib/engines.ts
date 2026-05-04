// Stage 15 smoke surface for @mm/engines-client.
//
// Verifies the engine contracts package resolves end-to-end from apps/web,
// per Stage 15 exit criterion. Stage 22+ (session screens) consumes
// LinearEngine at runtime via assessment-svc; until then, type-only imports
// keep this file zero-runtime-cost and erased from the bundle.
export type {
  AssessmentEngine,
  EngineState,
  FrameworkConfig,
  ScoreResult,
  SessionContext,
  TerminationReason,
} from '@mm/engines-client'
