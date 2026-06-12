import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    reactCompiler: true,
    output: 'export',
    images: {
        unoptimized: true,
    },
    //output: "standalone"
};

export default nextConfig;
