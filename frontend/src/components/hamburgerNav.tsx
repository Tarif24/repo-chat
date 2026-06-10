'use client';

import React, { useState, useEffect } from 'react';
import NavLink from './navLink';
import { Menu } from 'lucide-react';
import { X } from 'lucide-react';

const HamburgerNav = () => {
    const [isActive, setIsActive] = useState(false);

    const linkClass =
        'hover:text-[#555555] decoration-[#8b8b8b] hover:underline underline-offset-[1rem] hover:cursor-pointer transition duration-300 ease-in-out';

    const hamburgerNavClass = `absolute left-0 top-0 transition duration-600 ease-in-out ${
        isActive ? 'translate-y-0' : '-translate-y-75'
    }`;
    const backgroundClass = `absolute left-0 top-0 bg-black w-[100vw] h-[100vh] opacity-40 ${
        isActive ? '' : 'hidden'
    }`;

    useEffect(() => {
        if (isActive) {
            window.scrollTo(0, 0);
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }

        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [isActive]);

    return (
        <div className="flex lg:hidden">
            <div
                className="hover:cursor-pointer"
                onClick={() => {
                    setIsActive(true);
                }}
            >
                <Menu size="2.5rem" color="white" />
            </div>
            <div className={backgroundClass}></div>
            <div id="nav" className={hamburgerNavClass}>
                <div className="flex w-screen flex-col items-center justify-center gap-8 rounded-b-2xl bg-white py-8 text-center">
                    <div
                        className="absolute top-4 right-4 hover:cursor-pointer"
                        onClick={() => {
                            setIsActive(false);
                        }}
                    >
                        <X size="2rem" />
                    </div>
                    <NavLink
                        href="/"
                        classActive={linkClass}
                        classInactive={linkClass}
                        onClick={() => {
                            setIsActive(false);
                        }}
                    >
                        Home
                    </NavLink>
                    <NavLink
                        href="/chat"
                        classActive={linkClass}
                        classInactive={linkClass}
                        onClick={() => {
                            setIsActive(false);
                        }}
                    >
                        Chat
                    </NavLink>
                </div>
            </div>
        </div>
    );
};

export default HamburgerNav;
