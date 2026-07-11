import { useCallback, useEffect, useState } from "react";

const KEY = "abigail-theme";

const readTheme = () => {
  if (typeof document !== "undefined" && document.documentElement.dataset.theme) {
    return document.documentElement.dataset.theme;
  }
  return "dark";
};

export function useTheme() {
  const [theme, setTheme] = useState(readTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* storage may be unavailable */
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === "dark" ? "#05060b" : "#eceef5";
  }, [theme]);

  const toggle = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), []);

  return { theme, toggle };
}
