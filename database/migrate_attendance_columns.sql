-- === MIGRATE ATTENDANCE COLUMNS ===
-- This script adds missing columns to the app_attendance_records table
-- so that these fields are synced and loaded correctly.
-- You can run this in your Supabase SQL Editor.

ALTER TABLE public.app_attendance_records 
ADD COLUMN IF NOT EXISTS cell_ids JSONB DEFAULT '[]';

ALTER TABLE public.app_attendance_records 
ADD COLUMN IF NOT EXISTS class_name TEXT;

ALTER TABLE public.app_attendance_records 
ADD COLUMN IF NOT EXISTS academic_session_id TEXT;
