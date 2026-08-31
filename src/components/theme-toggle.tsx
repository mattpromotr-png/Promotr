"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      type="button"
      className="focus-ring border-border bg-surface text-muted hover:text-foreground inline-flex size-10 items-center justify-center rounded-xl border transition-colors"
      aria-label="Toggle color theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Sun className="hidden dark:block" aria-hidden="true" size={18} />
      <Moon className="block dark:hidden" aria-hidden="true" size={18} />
    </button>
  );
}
