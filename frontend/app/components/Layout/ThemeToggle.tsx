"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="theme-toggle-skeleton" />;

  const isDark = theme === "dark";

  return (
    <button
      className="theme-toggle"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Toggle theme"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <span className={`theme-icon ${isDark ? "active" : ""}`}>
        <Moon size={16} />
      </span>
      <span className={`theme-icon ${!isDark ? "active" : ""}`}>
        <Sun size={16} />
      </span>
    </button>
  );
}
