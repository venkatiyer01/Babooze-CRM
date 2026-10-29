import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { environment: 'jsdom', include: ['tests/**/*.test.{ts,tsx}'], exclude: ['tests/rules.test.ts'], setupFiles: ['./tests/setup.ts'] } });
