import { useState } from "react";
import { useColorScheme } from "react-native";
import { DarkTheme, LightTheme, ThemeType } from "./theme";

export type ThemeMode = "system" | "light" | "dark";

export function useTheme() {
  const systemScheme = useColorScheme(); // light | dark
  const [mode, setMode] = useState<ThemeMode>("system");

  const effectiveMode =
    mode === "system" ? systemScheme ?? "light" : mode;

  const theme: ThemeType =
    effectiveMode === "dark" ? DarkTheme : LightTheme;

  return {
    theme,
    mode,
    effectiveMode,
    setLight: () => setMode("light"),
    setDark: () => setMode("dark"),
    setSystem: () => setMode("system"),
  };
}
