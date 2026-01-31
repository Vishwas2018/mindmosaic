# MindMosaic – Exam Engine

## Current Status

The exam engine is **not yet implemented**. This document describes the planned architecture.

## Purpose

The exam engine manages:
- Practice test sessions
- Timed assessments
- Answer submission and validation
- Score calculation
- Results presentation

## Planned Architecture

### Session Types

| Type | Description | Time Limit |
|------|-------------|------------|
| Practice | Untimed, with hints | None |
| Quiz | Short assessment | 10-15 min |
| Mock Exam | Full exam simulation | 40-60 min |

### Session Lifecycle

```
Created → Started → In Progress → Submitted → Scored → Reviewed
```

### Session Structure (Planned)

```typescript
interface ExamSession {
  id: string;
  studentId: string;
  type: 'practice' | 'quiz' | 'mock-exam';
  status: 'created' | 'started' | 'submitted' | 'scored';
  questions: SessionQuestion[];
  startedAt?: Date;
  submittedAt?: Date;
  timeLimit?: number; // minutes
  score?: SessionScore;
}

interface SessionQuestion {
  questionId: string;
  order: number;
  answer?: string;
  answeredAt?: Date;
  timeSpent?: number; // seconds
}

interface SessionScore {
  correct: number;
  total: number;
  percentage: number;
  byTopic: Record<string, { correct: number; total: number }>;
}
```

## Scoring Rules (Planned)

### Multiple Choice
- 1 point for correct answer
- 0 points for incorrect or unanswered

### Short Answer
- Exact match or accepted alternatives
- Case-insensitive comparison

### Extended Response
- Manual marking required
- Rubric-based scoring

## Results Presentation (Planned)

Results will include:
1. Overall score and percentage
2. Breakdown by topic
3. Time analysis
4. Question-by-question review
5. Explanation for each answer

## Integration Points

| Component | Integration |
|-----------|-------------|
| Content Engine | Sources questions |
| Database | Persists sessions |
| Progress Tracking | Updates mastery data |
| Parent Dashboard | Shares results |

## Implementation Notes

This component will be implemented when:
1. Content engine is operational
2. Database schema is finalised
3. Student dashboard is functional
