# Content Engine

MindMosaic uses a composition-based content engine.

## Key Concepts

- Questions are independent, reusable entities.
- Papers are ordered compositions of questions.
- Media is referenced, not embedded.
- Prompt content is structured, not HTML.

## Prompt Blocks

Questions use structured prompt blocks:

- text
- math (LaTeX)
- symbol

This enables flexible rendering across devices and accessibility modes.

## Media Strategy

- Images and diagrams stored in Supabase Storage
- Referenced by ID
- Alt text mandatory
- Placement controlled by metadata

## Versioning

- Published papers are immutable
- Corrections create new versions
- Student attempts reference a specific version
