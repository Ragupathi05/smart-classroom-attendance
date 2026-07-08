# AttendEase Data Flow

This document details the lifecycle and sequence of data transformations during primary operations.

---

## 1. Attendance Marking & Submission Flow

```
[ Timetable Grid Click ]
       │
       ▼
[ TimetableStore: Set SelectedCell ]
       │
       ▼ (Zustand subscriber fires)
[ AttendanceStore: Load students roster list, status = "present" ]
       │
       ▼ (User updates absent/permission radio toggles)
[ AttendanceStore: updateStudentStatus(id, status) ]
       │
       ▼ (User clicks Submit Attendance)
[ AttendanceStore: submitAttendance(cell) ]
       ├─► Check if requireConfirmation Settings is active
       ├─► Merge contiguous hours into a single time slot (e.g. 2:00-4:00)
       ├─► Write new AttendanceRecord to LocalStorage via AttendanceService
       ├─► Update Timetable Cell status to "submitted" in TimetableStore
       └─► Return result -> Redirect to Dashboard Page -> Show Share Dialog
```

---

## 2. Correction Request Lifecycle

```
[ CR/LR: Open submitted record in History Detail View ]
       │
       ▼
[ Click "Request Correction" for a specific student ]
       │
       ▼
[ AttendanceStore: submitCorrectionRequest({ recordId, studentId, reason }) ]
       ├─► Validate reason text is not empty
       ├─► Check that no duplicate pending request exists
       ├─► Write new CorrectionRequest (status: "pending") to store
       └─► Add notification in SharedStore targeting "faculty" role
       
                                   │
                                   ▼
                [ Faculty Logs In -> Opens Corrections Screen ]
                                   │
                                   ▼
                    [ Clicks Approve on request ID ]
                                   │
                                   ▼
                [ AttendanceStore: approveCorrectionRequest(id) ]
                       ├─► Update request status = "approved"
                       ├─► Locate target AttendanceRecord in store
                       ├─► Modify student status to requested status
                       └─► Save updated records array to LocalStorage
```
