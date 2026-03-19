import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

import NavBar from '../components/navBar';

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
});

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
});

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
        <html lang="en">
            <body
                className={`${geistSans.variable} ${geistMono.variable} flex h-screen w-screen flex-col antialiased`}
            >
                <NavBar />
                {children}
            </body>
        </html>
    );
}
