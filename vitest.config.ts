import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Minimal regression-test setup (none previously existed in this project).
// Deliberately lightweight: jsdom for the handful of consent/localStorage
// tests, a manual `@/*` alias mirroring tsconfig.json rather than pulling in
// an extra plugin, and no UI/component rendering harness (React Testing
// Library etc. was judged out of scope for this pass — see delivery notes).
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
