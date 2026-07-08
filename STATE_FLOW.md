# AttendEase State Flow & Store Management

This document describes how state is managed and synchronized across our decomposed Zustand stores.

---

## 1. Decomposed Store Layout

Instead of a single monolithic state container, the state is split into specialized stores:

```
                  ┌──────────────────────┐
                  │     SharedStore      │ (Current page, notifications)
                  └──────────────────────┘
                             ▲
                             │
     ┌───────────────────────┼───────────────────────┐
     │                       │                       │
┌────▼───────┐          ┌────▼───────┐          ┌────▼───────┐
│  AuthStore │          │StudentStore│          │SettingsStore│
│ (Sessions) │          │ (Rosters)  │          │(Preferences)│
└────────────┘          └────┬───────┘          └────────────┘
                             │
                             ▼
                        ┌────▼───────┐          ┌────────────┐
                        │TimetableSt.│◄────────►│Attend.Store│ (Records & marking sheets)
                        │ (Grid cells│          └────────────┘
                        └────────────┘
```

- **`useAuthStore`** (Persisted: `attendance-auth-store`): Manages authentication state (`user`, `isAuthenticated`), profile updates, and login/logout lifecycles.
- **`useSettingsStore`** (Persisted: `attendance-settings-store`): Manages app behavior switches (`autoSelectPresent`, `requireConfirmation`, etc.).
- **`useSharedStore`** (Persisted: `attendance-shared-store`): Manages the current screen routing path (`currentPage`) and the global notifications log.
- **`useStudentStore`** (Persisted: `attendance-student-store`): Manages the student class roster, student creation, updates, deletions, and Excel imports.
- **`useTimetableStore`** (Persisted: `attendance-timetable-store`): Manages custom timetable cells, selected cell grids, and weekly resets.
- **`useAttendanceStore`** (Persisted: `attendance-records-store`): Manages the attendance marking list (`students` with status present/absent/permission), submitted historical records, and student correction requests.

---

## 2. Cross-Store Reactivity (Subscribers)

Because Zustand stores are independent hook states, we coordinate cross-store synchronization using **store subscribers** declared at the bottom of the store definitions:

### A. Selected Cell Change Sync (Timetable -> Attendance)
When a cell is selected on the grid in `useTimetableStore`:
1. If the cell is **unsubmitted**, we copy the current roster from `useStudentStore` into the marking sheet in `useAttendanceStore` and set all student statuses to "present".
2. If the cell is **submitted**, we locate the corresponding historical record in `useAttendanceStore` and load the saved student list into memory for viewing.

```typescript
useTimetableStore.subscribe((state) => {
  const cell = state.selectedCell
  // Set appropriate students lists, active record IDs, and viewing mode flags
  // in useAttendanceStore...
})
```

### B. Student CRUD Sync (Roster -> Attendance Sheet)
When a student is added, edited, or deleted in the student manager (`useStudentStore`), we immediately sync the changes to the active attendance marking sheet:

```typescript
useStudentStore.subscribe((state) => {
  useAttendanceStore.getState().syncWithRoster(state.classStudents)
})
```
