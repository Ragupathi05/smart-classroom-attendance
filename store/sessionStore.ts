import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type { SessionRecord } from "@/types"

interface SessionState {
  sessionRecords: Record<string, SessionRecord>
  saveSession: (id: string, record: SessionRecord) => void
  resetSession: (id: string) => void
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      sessionRecords: {},
      saveSession: (id, record) =>
        set((state) => ({
          sessionRecords: {
            ...state.sessionRecords,
            [id]: record,
          },
        })),
      resetSession: (id) =>
        set((state) => {
          const updated = { ...state.sessionRecords }
          delete updated[id]
          return { sessionRecords: updated }
        }),
    }),
    {
      name: "attendance-sessions-store",
      storage: createJSONStorage(() => localStorage),
    }
  )
)
