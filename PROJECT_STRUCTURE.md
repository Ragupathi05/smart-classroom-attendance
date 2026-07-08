# AttendEase - Architectural Project Structure

This document outlines the final directory structure of the **AttendEase** codebase, detailing the purpose of each directory and the architectural layers.

---

## 1. Complete Folder Hierarchy

```
├── app/                        # Next.js App Router entrypoints & CSS
│   ├── layout.tsx              # Main HTML container & providers
│   ├── page.tsx                # Client-side shell loading AppShell
│   └── globals.css             # TailwindCSS v4 design tokens
├── components/                 # Reusable cross-feature layout & components
│   ├── layout/                 # Main shell layouts
│   │   ├── Sidebar.tsx         # Collapsible sidebar navigation drawer
│   │   └── Header.tsx          # Navigation header with date, clock, notifications
│   ├── shared/                 # Reusable domain-specific widgets
│   │   ├── StatisticsCard.tsx  # General stats block wrapper (used in home/analytics)
│   │   └── PageHeader.tsx      # Standard title + sub-header + actions shell
│   └── ui/                     # Primtives (Shadcn UI buttons, inputs, tables)
├── features/                   # Core business features (isolated folders)
│   ├── analytics/              
│   │   └── pages/              # AnalyticsPage.tsx (visual summaries & chart tabs)
│   ├── attendance/             
│   │   ├── pages/              # AttendancePage.tsx (marking spreadsheet)
│   │   └── components/         # AttendanceBar, AttendanceSummary, StudentList, ShareAttendanceModal
│   ├── auth/                   
│   │   └── pages/              # LoginPage.tsx (credentials form)
│   ├── corrections/            
│   │   └── pages/              # CorrectionRequestsPage.tsx (CR/LR request list & approvals)
│   ├── dashboard/              
│   │   └── pages/              # DashboardPage.tsx (recent records list & home stats), AppShell.tsx
│   ├── history/                
│   │   ├── pages/              # AttendanceHistoryPage.tsx (long-press logs, search, filter)
│   │   └── components/         # AttendanceHistoryDetail.tsx (modal edit roster roster)
│   ├── profile/                
│   │   └── pages/              # ProfilePage.tsx (user profile configuration card)
│   ├── settings/               
│   │   └── pages/              # SettingsPage.tsx (system toggles & profile card)
│   ├── student-manager/        
│   │   └── pages/              # StudentManagerPage.tsx (student table, CRUD dialogs, Excel parsing)
│   └── timetable/              
│       ├── pages/              # TimetableEditorPage.tsx (schedule editor table)
│       └── components/         # TimetableGrid.tsx (main dashboard timetable grid)
├── services/                   # Storage abstraction classes
│   ├── AuthService.ts          # Session mock data provider
│   ├── AttendanceService.ts    # LocalStorage loader & writer
│   ├── StudentService.ts       # Roster data seeder
│   ├── TimetableService.ts     # Week resetters & grid generators
│   ├── SettingsService.ts      # App configurations mock loader
│   ├── CorrectionService.ts    # Duplicate request checker
│   └── index.ts                # Central service exporter
├── store/                      # Zustand state store managers
│   ├── authStore.ts            # Authentications & profile updates
│   ├── attendanceStore.ts      # Active attendance sheets, records, corrections
│   ├── studentStore.ts         # Class roster CRUD
│   ├── timetableStore.ts       # Timetable custom slots & cell selects
│   ├── settingsStore.ts        # User settings toggle maps
│   ├── sharedStore.ts          # Page routing, notifications queue
│   ├── profileStore.ts         # Profile store proxy
│   ├── analyticsStore.ts       # Analytics records proxy
│   └── index.ts                # Central store exporter
├── types/                      # Domain typescript types
│   ├── Role.ts                 # CR, LR, Faculty roles
│   ├── User.ts                 # User credentials metadata interface
│   ├── Settings.ts             # AppSettings configuration
│   ├── Student.ts              # Class student status
│   ├── Attendance.ts           # MarkStatus & AttendanceRecord definitions
│   ├── Notification.ts         # System notifications log
│   ├── Correction.ts           # CorrectionRequest & Changes payloads
│   ├── Timetable.ts            # TimetableCell status
│   ├── Profile.ts              # Profile settings updates
│   └── index.ts                # Central types exporter
├── constants/                  
│   └── index.ts                # App title, time slots, subject codes, weekly schedules
├── utils/                      
│   ├── date-helpers.ts         # date, datetime, 12h-time formatters, week ISO keyers
│   ├── share-helpers.ts        # robust text copy wrappers & window open redirects
│   └── attendance-helpers.ts   # roll abbreviations, edit time limits, status counters
├── hooks/                      
│   ├── useClock.ts             # Interval clock trigger
│   ├── useMobile.ts            # Mobile responsive window query
│   └── useToast.ts             # Toast display logic
└── package.json                # Project build commands & dependencies
```
