# AttendEase Contributing Guidelines

Welcome! This document outlines coding standards and guidelines to keep the codebase clean, uniform, and maintainable.

---

## 1. Naming Conventions

- **Feature Folders:** kebab-case (e.g., `student-manager/`, `correction-requests/`).
- **React Components / Pages:** PascalCase (e.g., `DashboardPage.tsx`, `StatisticsCard.tsx`).
- **Custom Hooks:** camelCase prefixed with `use` (e.g., `useClock.ts`, `useMobile.ts`).
- **Utility / Service files:** camelCase or kebab-case (e.g., `date-helpers.ts`, `AuthService.ts`).
- **Constants:** UPPER_CASE (e.g., `STORAGE_KEYS`, `WEEKLY_SCHEDULE`).

---

## 2. Code Quality & Standards

- **Maximum File Length:** Keep page and component files under **250–300 lines**. If a file grows larger, extract nested elements into local sub-components.
- **No Magic Strings:** Values like time slots, storage keys, and subject codes must reside in `constants/index.ts`.
- **Absolute Import Aliases:** Always use absolute imports with the `@/` path alias.
  - **Correct:** `import { useAuthStore } from "@/store"`
  - **Incorrect:** `import { useAuthStore } from "../../../../store/authStore"`
- **Strict Data Flow:** Never call `localStorage` or `fetch` inside components. All database, networking, and storage actions must be encapsulated within a Service class under `services/`.

---

## 3. Pull Request Checklist

Before submitting changes, run these verification checks:

1. **TypeScript Compile Check:**
   ```bash
   npm run build
   ```
   Ensure there are no compilation or import errors.
2. **Clean Imports Check:**
   Remove unused, duplicate, or circular imports.
3. **No Unhandled States:**
   Verify client-side hydration doesn't produce screen flashes or mismatch hydration warnings (use mounting checks).
