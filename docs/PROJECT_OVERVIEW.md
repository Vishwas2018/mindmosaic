# MindMosaic — Project Overview

MindMosaic is a production-grade Australian education platform designed to help students build mastery through structured practice, assessment, and feedback.

The platform supports NAPLAN- and ICAS-style assessments for Years 1–9, with distinct experiences for students, parents, and administrators.

## Core Principles

- **Immutability**: Published assessment papers never change. Corrections create new versions.
- **Reusability**: Questions and media are reusable across multiple papers.
- **Accessibility-first**: Structured content enables screen readers, keyboard navigation, and responsive layouts.
- **Auditability**: All attempts, versions, and roles are explicit and traceable.
- **Separation of concerns**: Layout, logic, data, and rendering are decoupled.

## High-Level Architecture

- Frontend: React + TypeScript + Tailwind
- Routing: React Router with role-based layouts
- Auth: Placeholder guards (Supabase integration planned)
- Content Engine: Structured questions, media references, paper composition
- Storage: Supabase (database + media storage)

This document describes the shape and intent of the system, not implementation details.
