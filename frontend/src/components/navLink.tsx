'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function NavLink({
    href,
    children,
    classActive,
    classInactive,
}: {
    href: string;
    children: React.ReactNode;
    classActive: string;
    classInactive: string;
}) {
    const pathname = usePathname();
    const isActive = pathname === href;

    return (
        <Link href={href} className={isActive ? classActive : classInactive}>
            {children}
        </Link>
    );
}
