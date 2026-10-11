import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['packages/**/*.test.ts', 'apps/client/src/**/*.test.ts', 'apps/server/src/**/*.test.ts'], maxWorkers: 2 } });
