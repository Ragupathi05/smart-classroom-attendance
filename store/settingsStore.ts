import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type { AppSettings } from "@/types"
import { DEFAULT_APP_SETTINGS } from "@/constants"

interface SettingsState {
  appSettings: AppSettings
  updateAppSettings: (settings: Partial<AppSettings>) => void
}

const getLegacySettingsState = () => {
  if (typeof window === "undefined") return { appSettings: DEFAULT_APP_SETTINGS }
  try {
    const raw = localStorage.getItem("attendance-app-store-v1")
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.state?.appSettings) {
        return { appSettings: parsed.state.appSettings }
      }
    }
  } catch {}
  return { appSettings: DEFAULT_APP_SETTINGS }
}

const legacy = getLegacySettingsState()

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      appSettings: legacy.appSettings,
      updateAppSettings: (settings) =>
        set((state) => ({
          appSettings: {
            ...state.appSettings,
            ...settings,
          },
        })),
    }),
    {
      name: "attendance-settings-store",
      storage: createJSONStorage(() => localStorage),
    }
  )
)
