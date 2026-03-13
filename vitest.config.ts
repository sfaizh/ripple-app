import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['app/api/webhooks/**', 'app/api/workers/moderation/**'],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
    },
  },
});
