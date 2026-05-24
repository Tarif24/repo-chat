'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function NavLink({
    href,
    children,
    classActive,
    classInactive,
    onClick,
}: {
    href: string;
    children: React.ReactNode;
    classActive: string;
    classInactive: string;
    onClick?: () => void;
}) {
    const pathname = usePathname();
    const isActive = pathname === href;

    const finalOnClick = onClick ? onClick : () => {};

    return (
        <Link
            onClick={finalOnClick}
            href={href}
            className={isActive ? classActive : classInactive}
        >
            {children}
        </Link>
    );
}
