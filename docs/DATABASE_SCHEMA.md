# MindMosaic – Database Schema

## Current Status

The database is **not yet implemented**. This document describes the planned schema.

## Technology

- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage (for media)

## Planned Tables

### Users and Authentication

```sql
-- Managed by Supabase Auth
-- auth.users (built-in)

-- Extended user profile
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  role TEXT NOT NULL CHECK (role IN ('student', 'parent', 'admin')),
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Parent-Student Relationships

```sql
CREATE TABLE public.parent_student (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES public.profiles(id),
  student_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parent_id, student_id)
);
```

### Content Tables

```sql
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES public.subjects(id),
  name TEXT NOT NULL,
  description TEXT,
  year_level INTEGER,
  order_index INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES public.topics(id),
  type TEXT NOT NULL CHECK (type IN ('multiple-choice', 'short-answer', 'extended-response')),
  stem TEXT NOT NULL,
  options JSONB, -- for multiple choice
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Session Tables

```sql
CREATE TABLE public.exam_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.profiles(id),
  type TEXT NOT NULL CHECK (type IN ('practice', 'quiz', 'mock-exam')),
  status TEXT NOT NULL CHECK (status IN ('created', 'started', 'submitted', 'scored')),
  time_limit INTEGER, -- minutes
  started_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  score JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.session_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.exam_sessions(id),
  question_id UUID REFERENCES public.questions(id),
  answer TEXT,
  is_correct BOOLEAN,
  time_spent INTEGER, -- seconds
  answered_at TIMESTAMPTZ
);
```

### Progress Tracking

```sql
CREATE TABLE public.topic_mastery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.profiles(id),
  topic_id UUID REFERENCES public.topics(id),
  mastery_level DECIMAL(3,2) DEFAULT 0, -- 0.00 to 1.00
  questions_attempted INTEGER DEFAULT 0,
  questions_correct INTEGER DEFAULT 0,
  last_practiced_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, topic_id)
);
```

## Row Level Security (Planned)

All tables will have RLS policies:
- Students: Own data only
- Parents: Own data + linked children
- Admins: All data

## Implementation Notes

Database implementation will begin when:
1. Authentication flow is defined
2. Core user journeys are mapped
3. Content structure is finalised
