import type { Metadata } from 'next';
import { ThemeProvider } from '../components/themeProvider';
import { sans, mono } from './fonts';
import './globals.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import NavBar from '../components/navBar';
import { NavVisibilityProvider } from '../components/navVisibility';

export const metadata: Metadata = {
    title: 'Repo Chat',
    description:
        'RepoChat - AI-powered GitHub repository assistant that ingests code, performs vector search with metadata filtering, and uses a RAG pipeline to answer questions about codebases.',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html
            lang="en"
            suppressHydrationWarning
            className={`${sans.variable} ${mono.variable}`}
        >
            <body className={`flex h-screen w-screen flex-col antialiased`}>
                <ThemeProvider>
                    <NavVisibilityProvider>
                        <NavBar />
                        <main className="min-h-0 flex-1 overflow-hidden">
                            {children}
                        </main>
                        <ToastContainer />
                    </NavVisibilityProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
