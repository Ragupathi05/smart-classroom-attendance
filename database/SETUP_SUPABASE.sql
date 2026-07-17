-- ============================================================
-- MITS AttendEase — Complete Supabase Setup SQL
-- Run this ONCE in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ============================================================
-- STEP 1: Fix RLS on existing tables (departments, users, etc.)
-- ============================================================

-- Allow anon to READ departments (needed for login check)
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon read departments" ON departments;
CREATE POLICY "anon read departments" ON departments
  FOR SELECT TO anon USING (true);

-- Allow authenticated users to insert/update departments
DROP POLICY IF EXISTS "auth insert departments" ON departments;
CREATE POLICY "auth insert departments" ON departments
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth update departments" ON departments;
CREATE POLICY "auth update departments" ON departments
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Allow anon to READ users (needed for role lookup on login)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon read users" ON users;
CREATE POLICY "anon read users" ON users
  FOR SELECT TO anon USING (true);

-- Allow authenticated to insert their own user record
DROP POLICY IF EXISTS "auth insert own user" ON users;
CREATE POLICY "auth insert own user" ON users
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "auth update own user" ON users;
CREATE POLICY "auth update own user" ON users
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- ============================================================
-- STEP 2: Create app flat tables (attendance, timetable, etc.)
-- ============================================================

-- Attendance records table
CREATE TABLE IF NOT EXISTS app_attendance_records (
  id TEXT PRIMARY KEY,
  section_id TEXT NOT NULL,
  session_date TEXT NOT NULL,
  time_slot TEXT NOT NULL,
  subject_code TEXT,
  subject_name TEXT,
  faculty_name TEXT,
  records JSONB NOT NULL DEFAULT '[]',
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Timetable cells per section
CREATE TABLE IF NOT EXISTS app_timetable_cells (
  id TEXT PRIMARY KEY,
  section_id TEXT NOT NULL,
  day TEXT NOT NULL,
  time_slot TEXT NOT NULL,
  subject_code TEXT,
  subject_name TEXT,
  faculty_name TEXT,
  room_name TEXT,
  type TEXT DEFAULT 'regular',
  attendance_required TEXT DEFAULT 'Required',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Special days calendar
CREATE TABLE IF NOT EXISTS app_special_days (
  date TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  reason TEXT,
  scope_type TEXT DEFAULT 'all',
  scope_target_ids JSONB DEFAULT '[]',
  periods JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STEP 3: Enable RLS and open anon access for app tables
-- ============================================================

ALTER TABLE app_attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_timetable_cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_special_days ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read/write for all 3 app tables
-- (These tables store class data, not personal data — safe for anon access)

DROP POLICY IF EXISTS "anon all app_attendance_records" ON app_attendance_records;
CREATE POLICY "anon all app_attendance_records" ON app_attendance_records
  FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth all app_attendance_records" ON app_attendance_records;
CREATE POLICY "auth all app_attendance_records" ON app_attendance_records
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon all app_timetable_cells" ON app_timetable_cells;
CREATE POLICY "anon all app_timetable_cells" ON app_timetable_cells
  FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth all app_timetable_cells" ON app_timetable_cells;
CREATE POLICY "auth all app_timetable_cells" ON app_timetable_cells
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon all app_special_days" ON app_special_days;
CREATE POLICY "anon all app_special_days" ON app_special_days
  FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth all app_special_days" ON app_special_days;
CREATE POLICY "auth all app_special_days" ON app_special_days
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- STEP 4: Fix RLS for other existing tables
-- ============================================================

-- academic_sessions
ALTER TABLE academic_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon all academic_sessions" ON academic_sessions;
CREATE POLICY "anon all academic_sessions" ON academic_sessions
  FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth all academic_sessions" ON academic_sessions;
CREATE POLICY "auth all academic_sessions" ON academic_sessions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- programs
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon all programs" ON programs;
CREATE POLICY "anon all programs" ON programs
  FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth all programs" ON programs;
CREATE POLICY "auth all programs" ON programs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- sections
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon all sections" ON sections;
CREATE POLICY "anon all sections" ON sections
  FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth all sections" ON sections;
CREATE POLICY "auth all sections" ON sections
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- faculty (if exists)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'faculty') THEN
    ALTER TABLE faculty ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "anon all faculty" ON faculty;
    CREATE POLICY "anon all faculty" ON faculty
      FOR ALL TO anon USING (true) WITH CHECK (true);
    DROP POLICY IF EXISTS "auth all faculty" ON faculty;
    CREATE POLICY "auth all faculty" ON faculty
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- students
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon all students" ON students;
CREATE POLICY "anon all students" ON students
  FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth all students" ON students;
CREATE POLICY "auth all students" ON students
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- student_section_assignments (enrollments)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'student_section_assignments') THEN
    ALTER TABLE student_section_assignments ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "anon all ssa" ON student_section_assignments;
    CREATE POLICY "anon all ssa" ON student_section_assignments
      FOR ALL TO anon USING (true) WITH CHECK (true);
    DROP POLICY IF EXISTS "auth all ssa" ON student_section_assignments;
    CREATE POLICY "auth all ssa" ON student_section_assignments
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================================
-- Done! After running this:
-- 1. Go to your live site
-- 2. You should see the Login page (no auto-login)
-- 3. Click "Need to set up the HOD account? Register here"
-- 4. Fill in HOD details and create the account
-- 5. Log in with your HOD email and password
-- ============================================================
