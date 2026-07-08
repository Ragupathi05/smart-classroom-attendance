# AttendEase Technical Architecture

This document describes the architectural layout, directory organization, and separation of concerns principles implemented in AttendEase.

---

## 1. Screaming Architecture (Feature-First)

The codebase is organized by business feature rather than technical layer. This keeps related code files close together, making the code much easier to navigate and maintain.

```
├── app/                        # Next.js App Router Page Entrypoints & Global Style
├── components/                 # Shared Cross-Feature Layouts & UI Primitives
│   ├── layout/                 # Layout structure shells (Sidebar, Header, AppShell)
│   ├── shared/                 # Reusable domain components (StatisticsCard, PageHeader)
│   └── ui/                     # Shadcn/ui visual elements (buttons, inputs)
├── features/                   # Core Feature Domains (Self-contained)
│   ├── [feature_name]/         
│   │   ├── pages/              # Primary view page containers (e.g. LoginPage, AttendancePage)
│   │   ├── components/         # Sub-components private to this feature
│   │   ├── hooks/              # Custom hooks private to this feature
│   │   └── utils/              # Helper functions private to this feature
├── services/                   # Service API Data Access Layer (Wraps storage/network APIs)
├── store/                      # Zustand State Stores (Separated by domain responsibility)
├── types/                      # Central TypeScript interface declarations
├── constants/                  # Constant configuration sets (Subject names, timetables)
├── utils/                      # Central helper functions
└── hooks/                      # Central custom hooks (useClock, useIsMobile)
```

---

## 2. Technical Layers & Separation of Concerns

To guarantee that business logic is separated from visual representation:

```
┌─────────────────────────────────────────────────────────┐
│                       Pages & UI                        │
│   (features/*/pages/ -> Render components, bind state)  │
└────────────────────────────┬────────────────────────────┘
                             │ Uses state hook
┌────────────────────────────▼────────────────────────────┐
│                    Zustand Stores                       │
│    (store/*Store.ts -> Manages in-memory state hooks)   │
└────────────────────────────┬────────────────────────────┘
                             │ Calls
┌────────────────────────────▼────────────────────────────┐
│                   Services Interface                    │
│    (services/*Service.ts -> Handles data I/O requests)   │
└────────────────────────────┬────────────────────────────┘
                             │ Queries
┌────────────────────────────▼────────────────────────────┐
│                   LocalStorage / network                │
│    (Database, client APIs, browser storage cache)       │
└─────────────────────────────────────────────────────────┘
```

### Components Rules
- **Pages** (`features/*/pages/`): Responsible for subscribing to stores, parsing query params, showing headers, and loading layout sub-components.
- **Sub-components** (`features/*/components/`): Dumb components receiving data via props or local hooks. Max target size is 250-300 lines of code.
- **Shared Components** (`components/shared/`): Global widgets (like statistics cards) imported by multiple features.

---

## 3. Storage Layer Abstraction (Supabase Ready)

All database, networking, and localStorage calls are banned from components and stores. They must be routed through class services under `services/`.
- This ensures that when we replace LocalStorage with Supabase:
  - We **do not** modify any UI files.
  - We **do not** modify the core Zustand stores.
  - We **only** update the code inside the corresponding `services/` file.
