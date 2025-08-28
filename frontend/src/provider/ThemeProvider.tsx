import React, { useEffect, useMemo, useState } from "react";
import type { Theme, ResolvedTheme } from "./theme.types";
import { ThemeContext } from "./ThemeContext";
import { useMediaQuery } from "./useMediaQuery";

const STORAGE_KEY = "theme";

function applyToDOM(resolved: ResolvedTheme): void {
    const root = document.documentElement;
    root.classList.toggle("dark", resolved === "dark");
    root.setAttribute("data-theme", resolved);
    root.style.colorScheme = resolved;
}

export default function ThemeProvider({
    children,
    defaultTheme = "system",
}: {
    children: React.ReactNode;
    defaultTheme?: Theme;
}) {
    const [theme, setTheme] = useState<Theme>(() => {
        if (typeof window === "undefined") return defaultTheme;
        const saved = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
        return saved ?? defaultTheme;
    });

    const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");

    const resolvedTheme: ResolvedTheme = useMemo(() => {
        return theme === "system" ? (prefersDark ? "dark" : "light") : theme;
    }, [theme, prefersDark]);

    useEffect(() => {
        applyToDOM(resolvedTheme);
        if (typeof window !== "undefined") {
            window.localStorage.setItem(STORAGE_KEY, theme);
        }
    }, [resolvedTheme, theme]);

    useEffect(() => {
        const onStorage = (e: StorageEvent) => {
            if (e.key === STORAGE_KEY && e.newValue) {
                setTheme(e.newValue as Theme);
            }
        };
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, []);

    const toggle = () => setTheme(resolvedTheme === "dark" ? "light" : "dark");

    return (
        <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggle }}>
            {children}
        </ThemeContext.Provider>
    );
}
