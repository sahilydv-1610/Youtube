import React, { createContext, useContext, useState, useEffect } from "react";

/*
  ═══════════════════════════════════════════
  Two Theme Modes:  DARK  |  LIGHT
  ═══════════════════════════════════════════
*/

const themes = {
  dark: {
    name: "Dark",
    mode: "dark",
    // Backgrounds
    bg: "#0f0f0f",
    bgSecondary: "#181818",
    bgElevated: "#222222",
    bgHover: "#2a2a2a",
    bgCard: "#181818",
    bgInput: "#121212",
    // Borders
    border: "#333333",
    borderLight: "#272727",
    // Text
    text: "#f1f1f1",
    textSecondary: "#aaaaaa",
    textMuted: "#717171",
    textInverse: "#0f0f0f",
    // Chips
    chip: "#272727",
    chipHover: "#3a3a3a",
    chipActive: "#f1f1f1",
    chipActiveText: "#0f0f0f",
    // Accents
    accent: "#3ea6ff",
    accentHover: "#65b8ff",
    accentRed: "#ff0000",
    accentGreen: "#2ba640",
    // Buttons
    btnPrimary: "#ffffff",
    btnPrimaryText: "#0f0f0f",
    btnSecondary: "#272727",
    btnSecondaryText: "#f1f1f1",
    btnSecondaryHover: "#3a3a3a",
    // Subscribe
    subscribeBg: "#ffffff",
    subscribeText: "#0f0f0f",
    subscribedBg: "#272727",
    subscribedText: "#aaaaaa",
    // Shadows
    shadow: "rgba(0,0,0,0.4)",
    // Scrollbar
    scrollbar: "#333",
    scrollbarHover: "#555",
  },
  light: {
    name: "Light",
    mode: "light",
    // Backgrounds
    bg: "#ffffff",
    bgSecondary: "#f2f2f2",
    bgElevated: "#e5e5e5",
    bgHover: "#d9d9d9",
    bgCard: "#ffffff",
    bgInput: "#f0f0f0",
    // Borders
    border: "#d4d4d4",
    borderLight: "#e8e8e8",
    // Text
    text: "#0f0f0f",
    textSecondary: "#606060",
    textMuted: "#909090",
    textInverse: "#ffffff",
    // Chips
    chip: "#f2f2f2",
    chipHover: "#e5e5e5",
    chipActive: "#0f0f0f",
    chipActiveText: "#ffffff",
    // Accents
    accent: "#065fd4",
    accentHover: "#0b57c9",
    accentRed: "#cc0000",
    accentGreen: "#1e7e34",
    // Buttons
    btnPrimary: "#0f0f0f",
    btnPrimaryText: "#ffffff",
    btnSecondary: "#f2f2f2",
    btnSecondaryText: "#0f0f0f",
    btnSecondaryHover: "#e5e5e5",
    // Subscribe
    subscribeBg: "#0f0f0f",
    subscribeText: "#ffffff",
    subscribedBg: "#f2f2f2",
    subscribedText: "#606060",
    // Shadows
    shadow: "rgba(0,0,0,0.1)",
    // Scrollbar
    scrollbar: "#ccc",
    scrollbarHover: "#aaa",
  },
};

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [themeKey, setThemeKey] = useState(() => {
    return localStorage.getItem("yt-theme") || "dark";
  });

  const theme = themes[themeKey] || themes.dark;

  useEffect(() => {
    localStorage.setItem("yt-theme", themeKey);
    document.body.style.backgroundColor = theme.bg;
    document.body.style.color = theme.text;
    // Update scrollbar colors via CSS custom properties
    document.documentElement.style.setProperty("--scrollbar-color", theme.scrollbar);
    document.documentElement.style.setProperty("--scrollbar-hover", theme.scrollbarHover);
    document.documentElement.style.setProperty("--bg-color", theme.bg);
  }, [themeKey, theme]);

  const toggleTheme = () => {
    setThemeKey((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <ThemeContext.Provider value={{ theme, themeKey, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
