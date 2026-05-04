/**
 * @mm/engines-client — browser-safe re-export of engine contracts (Stage 15).
 *
 * Resolves DEV-20260430-1 (deferred from Stage 1 per ADR-0001).
 *
 * This package is a thin lens over `@mm/engines`. Engines are pure TypeScript
 * (zod + @mm/types only) so re-exporting verbatim is safe for browser bundles.
 * If `@mm/engines` ever grows a Node-only dependency, this barrel must narrow
 * to a subset.
 */
export * from '@mm/engines';
