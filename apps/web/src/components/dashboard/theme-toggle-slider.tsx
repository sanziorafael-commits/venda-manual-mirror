"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Moon, Sun } from "lucide-react";

export function ThemeToggleSlider() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const isDark = theme === "dark";

  return (
    <div className="flex items-center gap-2">
      <Sun className={`h-4 w-4 text-muted-foreground`} />
      <Switch
        checked={isDark}
        onCheckedChange={(val) => setTheme(val ? "dark" : "light")}
        className="data-[state=checked]:bg-black"
      />
      <Moon className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}
