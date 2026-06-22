'use client';

import NavLink from './navLink';
import HamburgerNav from './hamburgerNav';
import { SearchCode, Github } from 'lucide-react';
import { ThemeToggle } from '../components/themeToggle';
import { useNavVisibility } from './navVisibility';

const NavBar = () => {
    const { visible } = useNavVisibility();

    if (!visible) {
        return null;
    }

    return (
        <header className="flex items-center justify-between border-b border-gray-200 bg-slate-700 px-6 py-5 text-white dark:border-slate-700 dark:bg-slate-950">
            <NavLink
                href="/"
                classInactive="flex items-center gap-2.5"
                classActive="flex items-center gap-2.5"
            >
                <SearchCode className="h-8 w-8 text-blue-300" />
                <span className="text-2xl font-medium">Repo Chat</span>
            </NavLink>
            <nav className="hidden items-center gap-8 text-sm lg:flex">
                <NavLink
                    href="/"
                    classInactive="text-gray-300 transition-colors hover:text-white text-[20px]"
                    classActive="font-medium underline underline-offset-4 text-[20px]"
                >
                    Home
                </NavLink>
                <NavLink
                    href="/chat"
                    classInactive="text-gray-300 transition-colors hover:text-white text-[20px]"
                    classActive="font-medium underline underline-offset-4 text-[20px]"
                >
                    Chat
                </NavLink>
                <NavLink
                    href="https://github.com/Tarif24/repo-chat"
                    classInactive="text-gray-300 transition-colors hover:text-white"
                    classActive="text-gray-300 transition-colors hover:text-white"
                >
                    <Github className="h-6 w-6" />
                </NavLink>
                <ThemeToggle />
            </nav>

            <HamburgerNav />
        </header>
    );
};

export default NavBar;
