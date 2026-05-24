import Icon from '../../public/logo.svg';
import NavLink from './navLink';
import Image from 'next/image';
import HamburgerNav from './hamburgerNav';

const NavBar = () => {
    const classActive =
        'text-white decoration-white underline underline-offset-[1rem] hover:-translate-y-2 hover:cursor-pointer transition duration-300 ease-in-out';
    const classInactive =
        'text-white hover:-translate-y-2 hover:cursor-pointer transition duration-200 ease-in-out';

    return (
        <nav
            id="home"
            className="flex h-[10vh] items-center justify-around bg-gray-600 p-4"
        >
            <NavLink
                href="/"
                classActive="flex justify-center items-center gap-2 lg:text-3xl text-2xl hover:cursor-pointer"
                classInactive="flex justify-center items-center gap-2 lg:text-3xl text-2xl hover:cursor-pointer"
            >
                <Image
                    src={Icon}
                    alt="Icon"
                    className="mb-1 size-12 sm:size-14"
                    style={{ filter: 'invert(1)' }}
                />
                <h1 className="font-bold text-white">Repo Chat</h1>
            </NavLink>
            <div className="hidden gap-10 text-2xl lg:flex">
                <NavLink
                    href="/"
                    classActive={classActive}
                    classInactive={classInactive}
                >
                    Home
                </NavLink>
                <NavLink
                    href="/chat"
                    classActive={classActive}
                    classInactive={classInactive}
                >
                    Chat
                </NavLink>
            </div>
            <HamburgerNav />
        </nav>
    );
};

export default NavBar;
