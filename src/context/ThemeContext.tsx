import React, { createContext, useContext, useState } from "react";

type Theme = "light" | "dark";

type ThemeColors = {
  background: string;
  card: string;
  text: string;
  border: string;
  primary: string;
  danger: string;
};

const lightColors: ThemeColors = {
  background: "#FFFFFF",
  card: "#F2F2F2",
  text: "#111111",
  border: "#DDDDDD",
  primary: "#4CAF50",
  danger: "#EF5350",
};

const darkColors: ThemeColors = {
  background: "#121212",
  card: "#1E1E1E",
  text: "#FFFFFF",
  border: "#333333",
  primary: "#81C784",
  danger: "#E57373",
};

type ThemeContextType = {
  theme: Theme;
  colors: ThemeColors;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  function toggleTheme() {
    setTheme(prev => (prev === "light" ? "dark" : "light"));
  }

  const colors = theme === "light" ? lightColors : darkColors;

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
