import { readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// The dev fixture lives in public/data so `npm run dev:fixture` can serve it,
// but it must never ship in a production build.
function dropDevFixture(): Plugin {
  let outDir = 'dist';
  return {
    name: 'drop-dev-fixture',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      const dataDir = join(outDir, 'data');
      for (const f of readdirSync(dataDir)) {
        if (f.endsWith('.dev.json')) rmSync(join(dataDir, f));
      }
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), dropDevFixture()],
  build: { target: 'es2022' },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
