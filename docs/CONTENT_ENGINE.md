# MindMosaic – Content Engine

## Current Status

The content engine is **not yet implemented**. This document describes the planned architecture.

## Purpose

The content engine manages educational content including:
- Question banks
- Practice materials
- Study resources
- Curriculum alignment

## Planned Architecture

### Content Types

| Type | Description |
|------|-------------|
| Question | Individual assessment item |
| QuestionSet | Grouped questions for practice |
| Topic | Curriculum topic/concept |
| Subject | Academic subject area |

### Content Hierarchy

```
Subject
└── Topic
    └── QuestionSet
        └── Question
```

### Question Structure (Planned)

```typescript
interface Question {
  id: string;
  type: 'multiple-choice' | 'short-answer' | 'extended-response';
  stem: string;
  options?: string[];
  correctAnswer: string | string[];
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topicId: string;
  metadata: {
    yearLevel: number;
    curriculum: string;
    tags: string[];
  };
}
```

## Content Delivery (Planned)

### Selection Algorithm

Content selection will consider:
1. Student's current mastery level
2. Time since last practice
3. Spaced repetition principles
4. Curriculum requirements

### Adaptive Difficulty

The system will adjust difficulty based on:
- Recent performance
- Historical accuracy
- Time taken per question

## Integration Points

| Component | Integration |
|-----------|-------------|
| Database | Content stored in Supabase |
| Exam Engine | Provides questions for exams |
| Progress Tracking | Records student interactions |
| Admin Interface | Content management |

## Implementation Notes

This component will be implemented when:
1. Database schema is defined
2. Authentication is working
3. Basic student flow is complete
