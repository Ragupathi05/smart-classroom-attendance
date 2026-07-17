-- =========================================================================
-- AttendEase Complete Production Database Schema
-- Institution: Madanapalle Institute of Technology & Science (MITS)
-- Platform: Supabase / PostgreSQL
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================================
-- REUSABLE TRIGGERS & FUNCTIONS
-- =========================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================================================
-- 1. DEPARTMENTS
-- =========================================================================
-- Stores the academic departments within MITS (e.g., CSE, ECE, AIML).
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_departments_updated_at
    BEFORE UPDATE ON departments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================================================================
-- 2. PROGRAMS
-- =========================================================================
-- Stores the degree programs offered by the institution (e.g., B.Tech, M.Tech, MBA, MCA).
CREATE TABLE programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_programs_updated_at
    BEFORE UPDATE ON programs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================================================================
-- 3. ACADEMIC SESSIONS
-- =========================================================================
-- Tracks distinct academic years and active sessions (e.g., 2025-2026).
CREATE TABLE academic_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_name VARCHAR(100) NOT NULL UNIQUE,
    start_year INT NOT NULL,
    end_year INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_academic_years CHECK (end_year >= start_year),
    CONSTRAINT chk_academic_dates CHECK (end_date >= start_date)
);

CREATE TRIGGER trg_academic_sessions_updated_at
    BEFORE UPDATE ON academic_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================================================================
-- 4. USERS
-- =========================================================================
-- Core permanent application users map directly to Supabase auth.users. 
-- Role designations control administrative hierarchy boundaries (HOD and Faculty only).
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20),
    faculty_code VARCHAR(50) NOT NULL UNIQUE,
    role VARCHAR(20) NOT NULL,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    profile_photo TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_user_role CHECK (role IN ('HOD', 'Faculty'))
);

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================================================================
-- 5. DEPARTMENT SETTINGS
-- =========================================================================
-- Configuration parameters defining operational controls per department.
CREATE TABLE department_settings (
    department_id UUID PRIMARY KEY REFERENCES departments(id) ON DELETE CASCADE,
    working_day_pattern VARCHAR(50) NOT NULL,
    college_start_time TIME NOT NULL,
    college_end_time TIME NOT NULL,
    period_duration INT NOT NULL,
    lunch_start TIME NOT NULL,
    lunch_end TIME NOT NULL,
    attendance_cutoff_minutes INT NOT NULL DEFAULT 15,
    current_academic_session UUID REFERENCES academic_sessions(id) ON DELETE SET NULL,
    current_semester INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_dept_semester CHECK (current_semester BETWEEN 1 AND 10)
);

CREATE TRIGGER trg_department_settings_updated_at
    BEFORE UPDATE ON department_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================================================================
-- 6. SECTIONS
-- =========================================================================
-- Captures specific classroom cohorts associated with a specific program.
CREATE TABLE sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE RESTRICT,
    academic_session_id UUID NOT NULL REFERENCES academic_sessions(id) ON DELETE RESTRICT,
    year INT NOT NULL,
    semester INT NOT NULL,
    section_name VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_section_year CHECK (year BETWEEN 1 AND 5),
    CONSTRAINT chk_section_semester CHECK (semester BETWEEN 1 AND 10),
    CONSTRAINT uq_section_combination UNIQUE (department_id, program_id, academic_session_id, year, semester, section_name)
);

CREATE TRIGGER trg_sections_updated_at
    BEFORE UPDATE ON sections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================================================================
-- 7. STUDENTS
-- =========================================================================
-- Stores detailed student academic profiles. Does not exist in the users table.
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    roll_number VARCHAR(50) NOT NULL UNIQUE,
    register_number VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    gender VARCHAR(20) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    admission_year INT NOT NULL,
    regulation VARCHAR(20) NOT NULL,
    profile_photo TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_student_gender CHECK (gender IN ('Male', 'Female', 'Other'))
);

CREATE TRIGGER trg_students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================================================================
-- 8. STUDENT SECTION ASSIGNMENTS
-- =========================================================================
-- Maps students to sections while tracking historical timeline placements.
CREATE TABLE student_section_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    section_id UUID NOT NULL REFERENCES sections(id) ON DELETE RESTRICT,
    academic_session_id UUID NOT NULL REFERENCES academic_sessions(id) ON DELETE RESTRICT,
    roll_no_in_class VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_student_session_assignment UNIQUE (student_id, academic_session_id)
);

CREATE TRIGGER trg_student_section_assignments_updated_at
    BEFORE UPDATE ON student_section_assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================================================================
-- 9. SUBJECTS
-- =========================================================================
-- Holds course syllabi structures linked to departments and semesters.
CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    subject_code VARCHAR(50) NOT NULL UNIQUE,
    subject_name VARCHAR(255) NOT NULL,
    semester INT NOT NULL,
    credits INT NOT NULL DEFAULT 0,
    is_lab BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_subject_semester CHECK (semester BETWEEN 1 AND 10),
    CONSTRAINT chk_subject_credits CHECK (credits >= 0)
);

CREATE TRIGGER trg_subjects_updated_at
    BEFORE UPDATE ON subjects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================================================================
-- 10. FACULTY ASSIGNMENTS
-- =========================================================================
-- Tracks temporary or permanent faculty subject mappings over a semester timeline.
CREATE TABLE faculty_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    faculty_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
    section_id UUID NOT NULL REFERENCES sections(id) ON DELETE RESTRICT,
    academic_session_id UUID NOT NULL REFERENCES academic_sessions(id) ON DELETE RESTRICT,
    effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    effective_to TIMESTAMPTZ,
    assigned_by UUID REFERENCES users(id) ON DELETE RESTRICT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_faculty_assignment_dates CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE TRIGGER trg_faculty_assignments_updated_at
    BEFORE UPDATE ON faculty_assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================================================================
-- 11. SECTION ROLE ASSIGNMENTS
-- =========================================================================
-- Maps transient leadership appointments for Class Representatives (CR/LR) inside sections.
CREATE TABLE section_role_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES sections(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(10) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    assigned_by UUID REFERENCES users(id) ON DELETE RESTRICT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_section_assigned_role CHECK (role IN ('CR', 'LR')),
    CONSTRAINT chk_section_role_dates CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE TRIGGER trg_section_role_assignments_updated_at
    BEFORE UPDATE ON section_role_assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================================================================
-- 12. TIMETABLE
-- =========================================================================
-- Holds weekly recurring structural schedule frameworks.
CREATE TABLE timetable (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    faculty_assignment_id UUID NOT NULL REFERENCES faculty_assignments(id) ON DELETE RESTRICT,
    day_of_week INT NOT NULL,
    period_number INT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room_number VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_timetable_day CHECK (day_of_week BETWEEN 1 AND 7),
    CONSTRAINT chk_timetable_period CHECK (period_number BETWEEN 1 AND 15),
    CONSTRAINT chk_timetable_time CHECK (end_time > start_time)
);

CREATE TRIGGER trg_timetable_updated_at
    BEFORE UPDATE ON timetable
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================================================================
-- 13. TIMETABLE PERIOD OVERRIDES
-- =========================================================================
-- Manages specialized calendar exceptions targeting singular execution nodes.
CREATE TABLE timetable_period_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timetable_id UUID REFERENCES timetable(id) ON DELETE CASCADE,
    section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    override_date DATE NOT NULL,
    period_number INT NOT NULL,
    faculty_assignment_id UUID REFERENCES faculty_assignments(id) ON DELETE RESTRICT,
    override_type VARCHAR(30) NOT NULL,
    start_time TIME,
    end_time TIME,
    room_number VARCHAR(50),
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_override_period CHECK (period_number BETWEEN 1 AND 15),
    CONSTRAINT chk_override_type CHECK (override_type IN (
        'REGULAR', 'LAB', 'SEMINAR', 'WORKSHOP', 'GUEST_LECTURE', 
        'INDUSTRIAL_VISIT', 'EXAMINATION', 'HOLIDAY', 'CANCELLED', 
        'FREE_HOUR', 'EXTRA_CLASS'
    ))
);

CREATE TRIGGER trg_timetable_period_overrides_updated_at
    BEFORE UPDATE ON timetable_period_overrides
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================================================================
-- 14. ATTENDANCE SESSIONS
-- =========================================================================
-- Context entry point tracking class session metrics. Implements a "Last Saved Wins" workflow.
CREATE TABLE attendance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES sections(id) ON DELETE RESTRICT,
    faculty_assignment_id UUID NOT NULL REFERENCES faculty_assignments(id) ON DELETE RESTRICT,
    timetable_id UUID REFERENCES timetable(id) ON DELETE SET NULL,
    session_date DATE NOT NULL,
    period_number INT NOT NULL,
    session_type VARCHAR(30) NOT NULL DEFAULT 'REGULAR',
    status VARCHAR(20) NOT NULL DEFAULT 'SUBMITTED',
    taken_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_modified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    last_modified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_session_period CHECK (period_number BETWEEN 1 AND 15),
    CONSTRAINT chk_session_status CHECK (status IN ('PENDING', 'SUBMITTED', 'MODIFIED', 'CANCELLED')),
    CONSTRAINT uq_session_occurrence UNIQUE (section_id, session_date, period_number)
);

CREATE TRIGGER trg_attendance_sessions_updated_at
    BEFORE UPDATE ON attendance_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================================================================
-- 15. ATTENDANCE RECORDS
-- =========================================================================
-- Stores verified personal indicators confirming individual student status.
CREATE TABLE attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attendance_session_id UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    attendance_status VARCHAR(20) NOT NULL,
    remarks TEXT,
    marked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_record_status CHECK (attendance_status IN ('Present', 'Absent', 'Permission')),
    CONSTRAINT uq_student_attendance_session UNIQUE (attendance_session_id, student_id)
);

CREATE TRIGGER trg_attendance_records_updated_at
    BEFORE UPDATE ON attendance_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================================================================
-- 16. HOLIDAYS
-- =========================================================================
-- Registers calendar institutional closures with selective department scopes.
CREATE TABLE holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    holiday_date DATE NOT NULL,
    holiday_name VARCHAR(255) NOT NULL,
    holiday_type VARCHAR(30) NOT NULL,
    description TEXT,
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    is_college_wide BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_holiday_type CHECK (holiday_type IN ('National', 'College', 'Department'))
);

CREATE TRIGGER trg_holidays_updated_at
    BEFORE UPDATE ON holidays
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================================================================
-- 17. WORKING DAY EXCEPTIONS
-- =========================================================================
-- Tracks structured variations amending the baseline operational calendar.
CREATE TABLE working_day_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exception_date DATE NOT NULL UNIQUE,
    exception_type VARCHAR(50) NOT NULL,
    description TEXT,
    alternative_timetable_id UUID REFERENCES timetable(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_exception_type CHECK (exception_type IN (
        'Saturday Working', 'Half Day', 'Exam Day', 'Holiday Converted to Working Day', 'Alternative Timetable'
    ))
);

CREATE TRIGGER trg_working_day_exceptions_updated_at
    BEFORE UPDATE ON working_day_exceptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================================================================
-- 18. NOTIFICATIONS
-- =========================================================================
-- Dispatches and schedules communication alerts targeted at specific platform actors.
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    scheduled_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_notification_type CHECK (type IN ('ATTENDANCE', 'REMINDER', 'SYSTEM'))
);

CREATE TRIGGER trg_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================================================================
-- 19. ACTIVITY LOGS
-- =========================================================================
-- Consolidated database transaction log that tracks system-wide mutations.
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    description TEXT NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    device VARCHAR(100),
    browser VARCHAR(100),
    payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- =========================================================================

-- Foreign Key & Key Relationship Mapping Indexes
CREATE INDEX idx_users_department_id ON users(department_id);
CREATE INDEX idx_sections_department_id ON sections(department_id);
CREATE INDEX idx_sections_program_id ON sections(program_id);
CREATE INDEX idx_sections_academic_session_id ON sections(academic_session_id);
CREATE INDEX idx_student_section_assignments_student_id ON student_section_assignments(student_id);
CREATE INDEX idx_student_section_assignments_section_id ON student_section_assignments(section_id);
CREATE INDEX idx_student_section_assignments_academic_session_id ON student_section_assignments(academic_session_id);
CREATE INDEX idx_subjects_department_id ON subjects(department_id);
CREATE INDEX idx_faculty_assignments_faculty_id ON faculty_assignments(faculty_id);
CREATE INDEX idx_faculty_assignments_subject_id ON faculty_assignments(subject_id);
CREATE INDEX idx_faculty_assignments_section_id ON faculty_assignments(section_id);
CREATE INDEX idx_faculty_assignments_academic_session_id ON faculty_assignments(academic_session_id);
CREATE INDEX idx_faculty_assignments_assigned_by ON faculty_assignments(assigned_by);
CREATE INDEX idx_section_role_assignments_section_id ON section_role_assignments(section_id);
CREATE INDEX idx_section_role_assignments_user_id ON section_role_assignments(user_id);
CREATE INDEX idx_section_role_assignments_assigned_by ON section_role_assignments(assigned_by);
CREATE INDEX idx_timetable_section_id ON timetable(section_id);
CREATE INDEX idx_timetable_faculty_assignment_id ON timetable(faculty_assignment_id);
CREATE INDEX idx_timetable_period_overrides_timetable_id ON timetable_period_overrides(timetable_id);
CREATE INDEX idx_timetable_period_overrides_section_id ON timetable_period_overrides(section_id);
CREATE INDEX idx_timetable_period_overrides_faculty_assignment_id ON timetable_period_overrides(faculty_assignment_id);
CREATE INDEX idx_attendance_sessions_section_id ON attendance_sessions(section_id);
CREATE INDEX idx_attendance_sessions_faculty_assignment_id ON attendance_sessions(faculty_assignment_id);
CREATE INDEX idx_attendance_sessions_timetable_id ON attendance_sessions(timetable_id);
CREATE INDEX idx_attendance_sessions_taken_by ON attendance_sessions(taken_by);
CREATE INDEX idx_attendance_records_attendance_session_id ON attendance_records(attendance_session_id);
CREATE INDEX idx_attendance_records_student_id ON attendance_records(student_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_holidays_department_id ON holidays(department_id);

-- Lookup Performance Optimization Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_students_roll_number ON students(roll_number);
CREATE INDEX idx_students_register_number ON students(register_number);
CREATE INDEX idx_attendance_sessions_date ON attendance_sessions(session_date);
CREATE INDEX idx_subjects_subject_code ON subjects(subject_code);

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES & HELPER FUNCTIONS
-- =========================================================================

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_section_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE faculty_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE section_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_period_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE working_day_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Context Resolution Identity Decouplers
CREATE OR REPLACE FUNCTION get_auth_user_role()
RETURNS VARCHAR AS $$
    SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_auth_user_dept()
RETURNS UUID AS $$
    SELECT department_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- 1. DEPARTMENTS POLICIES
CREATE POLICY "Departments select visibility" ON departments
    FOR SELECT TO authenticated 
    USING (
        get_auth_user_dept() = id
    );

CREATE POLICY "Departments administrative management" ON departments
    FOR ALL TO authenticated 
    USING (get_auth_user_role() = 'HOD' AND id = get_auth_user_dept());

-- 2. PROGRAMS POLICIES
CREATE POLICY "Programs visibility mapping" ON programs
    FOR SELECT TO authenticated 
    USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid())
    );

CREATE POLICY "Programs control" ON programs
    FOR ALL TO authenticated USING (get_auth_user_role() = 'HOD');

-- 3. ACADEMIC SESSIONS POLICIES
CREATE POLICY "Academic sessions viewing rights" ON academic_sessions
    FOR SELECT TO authenticated 
    USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid())
    );

CREATE POLICY "Academic sessions control" ON academic_sessions
    FOR ALL TO authenticated USING (get_auth_user_role() = 'HOD');

-- 4. USERS POLICIES
CREATE POLICY "Users internal lookup visibility" ON users
    FOR SELECT TO authenticated 
    USING (
        department_id = get_auth_user_dept()
    );

CREATE POLICY "HOD update execution within matching department context" ON users
    FOR ALL TO authenticated 
    USING (get_auth_user_role() = 'HOD' AND department_id = get_auth_user_dept());

-- 5. DEPARTMENT SETTINGS POLICIES
CREATE POLICY "Department settings tracking visibility" ON department_settings
    FOR SELECT TO authenticated 
    USING (
        department_id = get_auth_user_dept()
    );

CREATE POLICY "HOD setting configuration permission" ON department_settings
    FOR ALL TO authenticated 
    USING (get_auth_user_role() = 'HOD' AND department_id = get_auth_user_dept());

-- 6. SECTIONS POLICIES
CREATE POLICY "Sections data access tracking scope" ON sections
    FOR SELECT TO authenticated 
    USING (
        department_id = get_auth_user_dept()
        OR EXISTS (
            SELECT 1 FROM public.faculty_assignments fa 
            WHERE fa.faculty_id = auth.uid() AND fa.section_id = sections.id AND fa.is_active = TRUE
        )
        OR EXISTS (
            SELECT 1 FROM public.section_role_assignments sra 
            WHERE sra.user_id = auth.uid() AND sra.section_id = sections.id AND sra.is_active = TRUE
        )
    );

CREATE POLICY "HOD section mutation control structure" ON sections
    FOR ALL TO authenticated 
    USING (get_auth_user_role() = 'HOD' AND department_id = get_auth_user_dept());

-- 7. STUDENTS POLICIES
CREATE POLICY "Students academic list lookup filtering" ON students
    FOR SELECT TO authenticated 
    USING (
        get_auth_user_role() IN ('Faculty', 'HOD')
        OR EXISTS (
            SELECT 1 FROM public.student_section_assignments ssa
            JOIN public.sections s ON ssa.section_id = s.id
            WHERE ssa.student_id = students.id AND (
                s.department_id = get_auth_user_dept()
                OR EXISTS (
                    SELECT 1 FROM public.section_role_assignments sra 
                    WHERE sra.user_id = auth.uid() && sra.section_id = s.id AND sra.is_active = TRUE
                )
            )
        )
    );

CREATE POLICY "HOD student profile write permissions" ON students
    FOR ALL TO authenticated USING (get_auth_user_role() = 'HOD');

-- 8. STUDENT SECTION ASSIGNMENTS POLICIES
CREATE POLICY "Student section maps observation window" ON student_section_assignments
    FOR SELECT TO authenticated 
    USING (
        get_auth_user_role() IN ('Faculty', 'HOD')
        OR EXISTS (
            SELECT 1 FROM public.sections s 
            WHERE s.id = section_id AND s.department_id = get_auth_user_dept()
        )
        OR EXISTS (
            SELECT 1 FROM public.section_role_assignments sra 
            WHERE sra.user_id = auth.uid() AND sra.section_id = section_id AND sra.is_active = TRUE
        )
    );

CREATE POLICY "HOD student enrollment structural assignment management" ON student_section_assignments
    FOR ALL TO authenticated USING (get_auth_user_role() = 'HOD');

-- 9. SUBJECTS POLICIES
CREATE POLICY "Subjects curriculum space reading mapping" ON subjects
    FOR SELECT TO authenticated 
    USING (
        department_id = get_auth_user_dept()
    );

CREATE POLICY "HOD subject dictionary modification control" ON subjects
    FOR ALL TO authenticated 
    USING (get_auth_user_role() = 'HOD' AND department_id = get_auth_user_dept());

-- 10. FACULTY ASSIGNMENTS POLICIES
CREATE POLICY "Faculty resources layout verification trace" ON faculty_assignments
    FOR SELECT TO authenticated 
    USING (
        faculty_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.sections s 
            WHERE s.id = section_id AND s.department_id = get_auth_user_dept()
        )
    );

CREATE POLICY "HOD allocation mapping capability matrix" ON faculty_assignments
    FOR ALL TO authenticated 
    USING (
        get_auth_user_role() = 'HOD' 
        AND EXISTS (
            SELECT 1 FROM public.sections s 
            WHERE s.id = section_id AND s.department_id = get_auth_user_dept()
        )
    );

-- 11. SECTION ROLE ASSIGNMENTS POLICIES
CREATE POLICY "Transient leadership maps review capability" ON section_role_assignments
    FOR SELECT TO authenticated 
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.sections s 
            WHERE s.id = section_id AND s.department_id = get_auth_user_dept()
        )
    );

CREATE POLICY "HOD exclusive section role assignments authorization" ON section_role_assignments
    FOR ALL TO authenticated 
    USING (
        get_auth_user_role() = 'HOD' 
        AND EXISTS (
            SELECT 1 FROM public.sections s 
            WHERE s.id = section_id AND s.department_id = get_auth_user_dept()
        )
    );

-- 12. TIMETABLE POLICIES
CREATE POLICY "Timetable dynamic schedule track overview" ON timetable
    FOR SELECT TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.sections s 
            WHERE s.id = section_id AND s.department_id = get_auth_user_dept()
        )
        OR EXISTS (
            SELECT 1 FROM public.faculty_assignments fa 
            WHERE fa.id = faculty_assignment_id AND fa.faculty_id = auth.uid() AND fa.is_active = TRUE
        )
        OR EXISTS (
            SELECT 1 FROM public.section_role_assignments sra 
            WHERE sra.user_id = auth.uid() AND sra.section_id = section_id AND sra.is_active = TRUE
        )
    );

CREATE POLICY "HOD matrix scheduling update configurations" ON timetable
    FOR ALL TO authenticated 
    USING (
        get_auth_user_role() = 'HOD' 
        AND EXISTS (
            SELECT 1 FROM public.sections s 
            WHERE s.id = timetable.section_id AND s.department_id = get_auth_user_dept()
        )
    );

-- 13. TIMETABLE PERIOD OVERRIDES POLICIES
CREATE POLICY "Timetable calendar variations inspection line" ON timetable_period_overrides
    FOR SELECT TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.sections s 
            WHERE s.id = section_id AND s.department_id = get_auth_user_dept()
        )
        OR EXISTS (
            SELECT 1 FROM public.faculty_assignments fa 
            WHERE fa.id = faculty_assignment_id AND fa.faculty_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.section_role_assignments sra 
            WHERE sra.user_id = auth.uid() AND sra.section_id = section_id AND sra.is_active = TRUE
        )
    );

CREATE POLICY "HOD temporal exception allocation adjustment authority" ON timetable_period_overrides
    FOR ALL TO authenticated 
    USING (
        get_auth_user_role() = 'HOD' 
        AND EXISTS (
            SELECT 1 FROM public.sections s 
            WHERE s.id = section_id AND s.department_id = get_auth_user_dept()
        )
    );

-- 14. ATTENDANCE SESSIONS POLICIES
CREATE POLICY "Attendance transaction sessions visibility map" ON attendance_sessions
    FOR SELECT TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.sections s 
            WHERE s.id = section_id AND s.department_id = get_auth_user_dept()
        )
        OR EXISTS (
            SELECT 1 FROM public.faculty_assignments fa 
            WHERE fa.id = faculty_assignment_id AND fa.faculty_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.section_role_assignments sra 
            WHERE sra.user_id = auth.uid() AND sra.section_id = section_id AND sra.is_active = TRUE
        )
    );

CREATE POLICY "Workplace actors attendance generation boundaries" ON attendance_sessions
    FOR INSERT TO authenticated 
    WITH CHECK (
        get_auth_user_role() = 'HOD'
        OR (get_auth_user_role() = 'Faculty' AND EXISTS (
            SELECT 1 FROM public.faculty_assignments fa 
            WHERE fa.id = faculty_assignment_id AND fa.faculty_id = auth.uid()
        ))
        OR (EXISTS (
            SELECT 1 FROM public.section_role_assignments sra 
            WHERE sra.user_id = auth.uid() AND sra.section_id = attendance_sessions.section_id AND sra.is_active = TRUE
        ))
    );

CREATE POLICY "Workplace actors instant override permissions matrix" ON attendance_sessions
    FOR UPDATE TO authenticated 
    USING (
        get_auth_user_role() = 'HOD'
        OR (get_auth_user_role() = 'Faculty' AND EXISTS (
            SELECT 1 FROM public.faculty_assignments fa 
            WHERE fa.id = faculty_assignment_id AND fa.faculty_id = auth.uid()
        ))
        OR (EXISTS (
            SELECT 1 FROM public.section_role_assignments sra 
            WHERE sra.user_id = auth.uid() AND sra.section_id = attendance_sessions.section_id AND sra.is_active = TRUE
        ))
    );

-- 15. ATTENDANCE RECORDS POLICIES
CREATE POLICY "Granular attendance index query filtering" ON attendance_records
    FOR SELECT TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.attendance_sessions s
            JOIN public.sections sec ON s.section_id = sec.id
            WHERE s.id = attendance_records.attendance_session_id AND (
                sec.department_id = get_auth_user_dept()
                OR EXISTS (
                    SELECT 1 FROM public.faculty_assignments fa 
                    WHERE fa.id = s.faculty_assignment_id AND fa.faculty_id = auth.uid()
                )
                OR EXISTS (
                    SELECT 1 FROM public.section_role_assignments sra 
                    WHERE sra.user_id = auth.uid() AND sra.section_id = sec.id AND sra.is_active = TRUE
                )
            )
        )
    );

CREATE POLICY "Direct transactional mutations targeting attendance metrics" ON attendance_records
    FOR ALL TO authenticated 
    USING (
        get_auth_user_role() = 'HOD'
        OR EXISTS (
            SELECT 1 FROM public.attendance_sessions s
            WHERE s.id = attendance_records.attendance_session_id AND (
                s.taken_by = auth.uid() 
                OR EXISTS (
                    SELECT 1 FROM public.faculty_assignments fa 
                    WHERE fa.id = s.faculty_assignment_id AND fa.faculty_id = auth.uid()
                )
                OR EXISTS (
                    SELECT 1 FROM public.section_role_assignments sra 
                    WHERE sra.user_id = auth.uid() AND sra.section_id = s.section_id AND sra.is_active = TRUE
                )
            )
        )
    );

-- 16. HOLIDAYS POLICIES
CREATE POLICY "Holidays baseline review access" ON holidays
    FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Holidays administrative allocation adjustment" ON holidays
    FOR ALL TO authenticated 
    USING (
        get_auth_user_role() = 'HOD' AND (department_id = get_auth_user_dept() OR is_college_wide = TRUE)
    );

-- 17. WORKING DAY EXCEPTIONS POLICIES
CREATE POLICY "Exceptions operational layout monitoring view" ON working_day_exceptions
    FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Exceptions institutional execution changes" ON working_day_exceptions
    FOR ALL TO authenticated USING (get_auth_user_role() = 'HOD');

-- 18. NOTIFICATIONS POLICIES
CREATE POLICY "Secure personal communication filter matrix" ON notifications
    FOR ALL TO authenticated USING (user_id = auth.uid());

-- 19. ACTIVITY LOGS POLICIES
CREATE POLICY "Auditors trace observation interface" ON activity_logs
    FOR SELECT TO authenticated 
    USING (
        get_auth_user_role() = 'HOD' 
        AND EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.id = activity_logs.user_id AND u.department_id = get_auth_user_dept()
        )
    );

CREATE POLICY "Activity log dynamic entries capture engine" ON activity_logs
    FOR INSERT TO authenticated WITH CHECK (TRUE);