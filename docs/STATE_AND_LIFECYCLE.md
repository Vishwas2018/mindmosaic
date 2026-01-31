# State and Lifecycle

This document defines the lifecycle of an exam attempt.

## Attempt States

- `not_started`
- `in_progress`
- `submitted`
- `expired`

## Lifecycle Flow

1. Student opens paper
2. Attempt created in `not_started`
3. Timer starts → `in_progress`
4. Responses saved incrementally
5. Student submits OR time expires
6. Attempt transitions to `submitted` or `expired`

## Guardrails

- Submitted attempts cannot be modified
- Expired attempts cannot be resumed
- Attempts always reference a paper version
- State transitions are one-way

## Failure Scenarios

- Network loss → local buffer + retry
- Refresh → resume from persisted state
- Tab close → timer continues server-side
