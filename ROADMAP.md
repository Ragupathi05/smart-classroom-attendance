# AttendEase Product Roadmap

This document outlines the phased plan to transition AttendEase from a client-side prototype into an enterprise campus attendance platform.

---

## Phase 0: Cleanup & Architecture Refactoring (Completed)
- [x] Reorganize folder structure into a screaming feature-based architecture.
- [x] Split the monolithic Zustand store into domain-focused sub-stores (`authStore`, `attendanceStore`, etc.).
- [x] Abstract all data access operations into a dedicated Services layer (`services/`).
- [x] Isolate global types, constants, custom hooks, and utility functions.
- [x] Validate all changes with Next.js Turbopack compiler.

---

## Phase 1: Database Migration & Schema Design (Next Up)
- [ ] Set up Supabase project and map PostgreSQL schema:
  - `users` table (ID, Name, Email, Role, ClassName).
  - `students` table (ID, RollNumber, Name, ClassName).
  - `attendance_records` table (ID, Subject, SubjectCode, Date, TimeSlot, ClassName, SubmittedBy, SubmittedAt, EditedBy, EditedAt).
  - `attendance_students` join table (RecordID, StudentID, Status).
  - `correction_requests` table (ID, RecordID, StudentID, Reason, Status, RequestedBy, RequestedAt).
  - `timetable` table (ID, Day, TimeSlot, SubjectCode, FacultyName).
- [ ] Swap LocalStorage logic inside `services/` for Supabase client calls.
- [ ] Implement database transactions for transactional attendance marking (inserting records and joint statuses together).

---

## Phase 2: Authentication & Role-Based Access Control (RBAC)
- [ ] Integrate Supabase Auth (Sign In / Sign Out / Password resets).
- [ ] Enforce PostgreSQL Row-Level Security (RLS) policies:
  - CRs/LRs can only view/mark attendance for their own classes.
  - Faculty can view all class records and modify their specific schedules.
  - Admins can edit timetables and class rosters.
- [ ] Set up session hydration and token validation middleware in Next.js.

---

## Phase 3: Realtime Database Sync & Corrections Approval
- [ ] Enable Supabase Realtime channels for instant notification triggers.
- [ ] Connect faculty dashboards to live correction requests (approvals automatically rewrite target student statuses).
- [ ] Add loading indicators, offline caching, and optimistic state updates for slow network connections.

---

## Phase 4: Push Notifications & Reports
- [ ] Implement browser web push notifications for class reminders and correction responses.
- [ ] Integrate email notifications (using Resend or SendGrid) for weekly summaries to department HODs.
- [ ] Add PDF and Excel export services for department compliance reviews.

---

## Phase 5: AI Insights & Campus Expansion
- [ ] Build ML models to predict student attendance drops and alert mentors automatically.
- [ ] Expand student portals allowing individual students to view their attendance metrics and verify stats.
- [ ] Deploy multi-tenant department routing to support multiple college branches simultaneously.
