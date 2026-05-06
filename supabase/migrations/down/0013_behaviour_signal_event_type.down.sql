-- Rollback migration 0013 — DOCUMENTED NO-OP.
--
-- PostgreSQL has no `ALTER TYPE ... DROP VALUE`. Removing an enum value
-- requires DROP TYPE + CREATE TYPE, which would cascade-delete every
-- `learning_event` row that uses any value in the enum (not just the one
-- being removed). That is destructive and asymmetric vs. the forward
-- migration. ADR-0027 accepts this asymmetry: the forward migration is
-- safe; rollback is not. v1.1+ adding more L2 event_type values does NOT
-- require a fresh enum migration.
--
-- The empty body keeps the migration roundtrip script (`pnpm test:migration`)
-- working — it expects an `up`/`down` pair per migration. If a true rollback
-- ever becomes necessary (e.g. revising the enum design), file an ADR and
-- write a destructive migration explicitly.

SELECT 1; -- explicit no-op statement (avoids empty-file warnings in some tooling)
