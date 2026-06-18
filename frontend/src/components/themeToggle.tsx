'use client';

import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // Avoid rendering theme-dependent UI until mounted (prevents hydration mismatch)
    useEffect(() => setMounted(true), []);

    if (!mounted) {
        // Reserve the final size so nothing shifts once this mounts.
        return <div className="h-7 w-14 rounded-full" />;
    }

    const isDark = theme === 'dark';

    return (
        <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            role="switch"
            aria-checked={isDark}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className={`relative flex h-7 w-14 items-center rounded-full px-1 transition-colors duration-300 hover:cursor-pointer ${
                isDark ? 'bg-blue-950' : 'bg-yellow-500'
            }`}
        >
            <Sun
                aria-hidden="true"
                className={`absolute left-1.5 h-3.5 w-3.5 text-white transition-opacity duration-300 ${
                    isDark ? 'opacity-40' : 'opacity-0'
                }`}
            />
            <Moon
                aria-hidden="true"
                className={`absolute right-1.5 h-3.5 w-3.5 text-white transition-opacity duration-300 ${
                    isDark ? 'opacity-0' : 'opacity-40'
                }`}
            />

            {/* Sliding thumb, carrying the active icon */}
            <span
                className={`relative z-10 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow transition-transform duration-300 ${
                    isDark ? 'translate-x-7' : 'translate-x-0'
                }`}
            >
                {isDark ? (
                    <Moon className="h-3 w-3 text-blue-900" />
                ) : (
                    <Sun className="h-3 w-3 text-yellow-500" />
                )}
            </span>
        </button>
    );
}
