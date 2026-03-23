import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    root: '.',
    resolve: {
        alias: {
            'child_process': resolve(__dirname, './stub.ts'),
            'vm': resolve(__dirname, './stub.ts'),
            'path': resolve(__dirname, './stub.ts'),
            'crypto': resolve(__dirname, './stub.ts'),
            'fs/promises': resolve(__dirname, './stub.ts'),
            'fs': resolve(__dirname, './stub.ts'),
        },
    },
    define: {
        // Node globals needed by some modules
        global: 'globalThis',
        'process.env.NODE_ENV': '"development"',
        'process.env': '{}'
    },
    optimizeDeps: {
        include: ['@xterm/xterm', '@xterm/addon-fit'],
    },
    build: {
        target: 'esnext',
    },
});
