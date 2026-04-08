"use client";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = (localStorage.getItem("kjs_theme") as "dark" | "light") || "dark";
    setTheme(saved);
    setMounted(true);
  }, []);

  const apply = (t: "dark" | "light") => {
    setTheme(t);
    localStorage.setItem("kjs_theme", t);
    const root = document.documentElement;
    if (t === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  };

  if (!mounted) {
    return (
      <div className="flex items-center gap-1 rounded-full border border-border bg-surface p-1">
        <div className="h-7 w-14" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 rounded-full border bg-surface p-1" style={{ borderColor: "var(--border)" }}>
      <button
        onClick={() => apply("dark")}
        className={`rounded-full px-3 py-1 text-xs font-medium transition ${
          theme === "dark"
            ? "text-white"
            : "text-muted hover:text-fg"
        }`}
        style={
          theme === "dark"
            ? { background: "linear-gradient(135deg, var(--primary), var(--accent))" }
            : undefined
        }
        aria-pressed={theme === "dark"}
      >
        🌙 다크
      </button>
      <button
        onClick={() => apply("light")}
        className={`rounded-full px-3 py-1 text-xs font-medium transition ${
          theme === "light"
            ? "text-white"
            : "text-muted hover:text-fg"
        }`}
        style={
          theme === "light"
            ? { background: "linear-gradient(135deg, var(--primary), var(--accent))" }
            : undefined
        }
        aria-pressed={theme === "light"}
      >
        ☀️ 라이트
      </button>
    </div>
  );
}
