"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Switch } from "@/components/ui/switch";
import { Moon, Sun } from "lucide-react";

export function ThemeToggleSlider() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !resolvedTheme) return null;
  const isDark = resolvedTheme === "dark";

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
