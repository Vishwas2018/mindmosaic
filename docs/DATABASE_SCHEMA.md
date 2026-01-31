# Database Schema

This document defines the authoritative data model.

## papers
- id (uuid, pk)
- year (int)
- assessment_type (enum)
- subject (enum)
- level (int)
- title (text)
- duration_minutes (int)
- version (int)
- status (draft | published | archived)
- created_at
- published_at

## questions
- id (uuid, pk)
- subject (enum)
- level (int)
- difficulty (enum)
- response_type (enum)
- prompt_blocks (jsonb)
- tags (text[])
- created_at

## paper_questions
- paper_id (fk)
- question_id (fk)
- order (int)
- marks (int)
- optional (boolean)

## media
- id (uuid, pk)
- type (image | diagram | graph)
- storage_path (text)
- alt_text (text)
- caption (text)
- created_at
