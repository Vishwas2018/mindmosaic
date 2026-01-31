# Exam Engine

The Exam Engine governs how assessment papers are delivered, interacted with, and submitted by students.

It is intentionally decoupled from the Content Engine.

## Core Principles

- Exams are **stateful sessions**
- Content is **read-only**
- Student responses are **incrementally persisted**
- Exams are **resumable**
- Submission is **explicit and final**

## Key Concepts

### Exam Attempt
An attempt represents a student taking a specific version of a paper.

- One attempt per student per paper version
- Attempts reference immutable paper versions
- Attempts track progress, timing, and responses

### Timing Model

- Exams have a fixed duration
- Timer starts on first interaction
- Remaining time is persisted
- Expiry is enforced server-side

### Navigation Model

- Questions are ordered
- Students may move forward/backward
- Optional question flagging supported
- Question list navigation supported

### Autosave Strategy

- Responses saved on change
- Timer state saved periodically
- Page refresh resumes attempt state

### Submission

- Submission is explicit
- Confirmation required
- Once submitted:
  - Responses are locked
  - Attempt becomes read-only
