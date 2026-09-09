"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { MotionConfig } from "motion/react";

type Theme = "system" | "light" | "dark";
const AppearanceContext = createContext<{ theme: Theme; setTheme: (value: Theme) => void }>({ theme: "system", setTheme: () => {} });

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [theme, setValue] = useState<Theme>("system");
  useEffect(() => {
    const update = () => {
      const value = document.documentElement.dataset.theme;
      setValue(value === "light" || value === "dark" ? value : "system");
    };
    update();
    const onStorage = (event: StorageEvent) => {
      if (event.key !== "klasso-theme") return;
      document.documentElement.dataset.theme = event.newValue ?? "system";
      update();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  const setTheme = (value: Theme) => {
    document.documentElement.dataset.theme = value;
    setValue(value);
    try { localStorage.setItem("klasso-theme", value); } catch {}
  };
  return <AppearanceContext.Provider value={{ theme, setTheme }}>
    <MotionConfig reducedMotion="user" transition={{ duration: .22, ease: [.16, 1, .3, 1] }}>{children}</MotionConfig>
  </AppearanceContext.Provider>;
}
export const useAppearance = () => useContext(AppearanceContext);
