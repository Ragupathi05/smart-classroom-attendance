import type { AppSettings } from "@/types"
import { DEFAULT_APP_SETTINGS } from "@/constants"

export class SettingsService {
  static getDefaultSettings(): AppSettings {
    return { ...DEFAULT_APP_SETTINGS }
  }
}
