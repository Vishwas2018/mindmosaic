-- =============================================================================
-- MindMosaic Day 11: Test Users Setup
-- 
-- Run this AFTER creating users in Supabase Auth Dashboard.
-- This script adds the corresponding profiles entries.
--
-- IMPORTANT: This is for DEVELOPMENT/TESTING only. 
-- Do NOT run in production.
-- =============================================================================

-- =============================================================================
-- Step 1: Create users in Supabase Auth Dashboard FIRST
-- 
-- Go to: Authentication → Users → Add user
-- 
-- Create these users:
--   1. student@test.com (password: TestStudent123!)
--   2. parent@test.com (password: TestParent123!)
--   3. Your admin already exists: jvishu21@gmail.com
-- =============================================================================

-- =============================================================================
-- Step 2: After creating Auth users, get their UUIDs and run this:
-- =============================================================================

-- Replace these UUIDs with the actual UUIDs from Auth Dashboard
-- You can find them in Authentication → Users

-- Example (UPDATE THESE):
-- INSERT INTO public.profiles (id, role) VALUES 
--   ('STUDENT_UUID_HERE', 'student'),
--   ('PARENT_UUID_HERE', 'parent');

-- =============================================================================
-- Step 3: Create a PUBLISHED exam package for testing
-- =============================================================================

-- First, let's update our test package to be published so students can see it
UPDATE exam_packages 
SET status = 'published' 
WHERE id = '11111111-1111-1111-1111-111111111111';

-- Verify
SELECT id, title, status FROM exam_packages;