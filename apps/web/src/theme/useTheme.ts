import { useCallback, useEffect, useState } from "react";

export type ThemePreference = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "sageplan:ui:v1";
/** Where the theme lived while the app was called GradGuide. Read on load, removed on the next choice. */
const LEGACY_THEME_STORAGE_KEY = "gradguide:ui:v1";

function storedPreference(): ThemePreference {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY) ?? localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
    if (raw === "light" || raw === "dark" || raw === "system") return raw;
  } catch {
    // Storage unavailable: the system preference is a fine answer.
  }
  // Light, not system. The dark canvas people saw in v0 was the accident of a
  // System default on a dark-mode laptop; the design was always drawn for cream
  // (brief, v1 revision). "System" remains available, it is just not the default.
  return "light";
}

/**
 * Light by default. The toggle exists because this is read at 11pm as often as
 * at 9am, and a student on a bright screen in a dark room is the situation the
 * brief describes; but the document register is a cream page, so that is what
 * an unconfigured visitor sees.
 */
export function useTheme(): { preference: ThemePreference; setPreference: (p: ThemePreference) => void } {
  const [preference, setPreferenceState] = useState<ThemePreference>(storedPreference);

  useEffect(() => {
    const root = document.documentElement;
    if (preference === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", preference);
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
      localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
    } catch {
      // A theme we cannot remember is not worth an error message.
    }
  }, []);

  return { preference, setPreference };
}
