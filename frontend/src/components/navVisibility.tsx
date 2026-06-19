'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

type NavVisibilityContextValue = {
    visible: boolean;
    setVisible: (visible: boolean) => void;
};

const NavVisibilityContext = createContext<NavVisibilityContextValue | null>(null);

export function NavVisibilityProvider({ children }: { children: ReactNode }) {
    const [visible, setVisible] = useState(true);

    return (
        <NavVisibilityContext.Provider value={{ visible, setVisible }}>
            {children}
        </NavVisibilityContext.Provider>
    );
}

export function useNavVisibility() {
    const context = useContext(NavVisibilityContext);
    if (!context) {
        throw new Error('useNavVisibility must be used within NavVisibilityProvider');
    }
    return context;
}
