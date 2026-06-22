'use client';

import React, { useState } from 'react';
import { Menu, X, Github, SearchCode } from 'lucide-react';
import NavLink from './navLink';
import { ThemeToggle } from '../components/themeToggle';

const HamburgerNav = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="flex lg:hidden">
            {/* Hamburger trigger */}
            <button
                onClick={() => setIsOpen(true)}
                aria-label="Open menu"
                className="rounded-md p-1 text-white transition-colors hover:bg-white/10"
            >
                <Menu className="h-7 w-7" />
            </button>

            {/* Backdrop */}
            <div
                onClick={() => setIsOpen(false)}
                aria-hidden="true"
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 40,
                    background: 'rgba(0,0,0,0.4)',
                    opacity: isOpen ? 1 : 0,
                    pointerEvents: isOpen ? 'auto' : 'none',
                    transition: 'opacity 200ms',
                }}
            />

            {/* Drawer — portalled via inline fixed, slides in from right */}
            <div
                aria-modal="true"
                role="dialog"
                style={{
                    position: 'fixed',
                    top: 0,
                    right: 0,
                    bottom: 0,
                    width: 'min(280px, 85vw)',
                    zIndex: 50,
                    transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
                    transition: 'transform 220ms ease',
                    display: 'flex',
                    flexDirection: 'column',
                }}
                className="bg-slate-800 dark:bg-slate-950"
            >
                {/* Drawer header — mirrors the nav brand */}
                <div className="flex items-center justify-between border-b border-slate-700 px-5 py-4">
                    <NavLink
                        href="/"
                        classInactive="flex items-center gap-2"
                        classActive="flex items-center gap-2"
                        onClick={() => setIsOpen(false)}
                    >
                        <SearchCode className="h-6 w-6 text-blue-300" />
                        <span className="text-lg font-medium text-white">
                            Repo Chat
                        </span>
                    </NavLink>
                    <button
                        onClick={() => setIsOpen(false)}
                        aria-label="Close menu"
                        className="rounded-md p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Nav links */}
                <nav className="flex flex-col gap-1 px-3 py-4">
                    <NavLink
                        href="/"
                        classInactive="rounded-md px-3 py-2.5 text-[15px] text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                        classActive="rounded-md px-3 py-2.5 text-[15px] font-medium text-white bg-white/10"
                        onClick={() => setIsOpen(false)}
                    >
                        Home
                    </NavLink>
                    <NavLink
                        href="/chat"
                        classInactive="rounded-md px-3 py-2.5 text-[15px] text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                        classActive="rounded-md px-3 py-2.5 text-[15px] font-medium text-white bg-white/10"
                        onClick={() => setIsOpen(false)}
                    >
                        Chat
                    </NavLink>
                </nav>

                {/* Bottom row — GitHub + theme toggle */}
                <div className="mt-auto flex items-center justify-between border-t border-slate-700 px-5 py-4">
                    <NavLink
                        href="https://github.com/Tarif24/repo-chat"
                        classInactive="flex items-center gap-2 text-[13px] text-slate-400 transition-colors hover:text-white"
                        classActive="flex items-center gap-2 text-[13px] text-slate-400 transition-colors hover:text-white"
                    >
                        <Github className="h-5 w-5" />
                        <span>View on GitHub</span>
                    </NavLink>
                    <ThemeToggle />
                </div>
            </div>
        </div>
    );
};

export default HamburgerNav;
