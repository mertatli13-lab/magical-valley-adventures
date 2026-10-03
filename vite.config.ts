/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * GitHub Pages serves the game from /<repository name>/. Set BASE_PATH to
 * build for another host, e.g. BASE_PATH=/ for the root of a domain.
 */
const REPOSITORY_BASE = '/magical-valley-adventures/';

export default defineConfig(({ command, isPreview }) => ({
  // Builds and `vite preview` use the published path; the dev server uses the root.
  base: command === 'build' || isPreview ? (process.env.BASE_PATH ?? REPOSITORY_BASE) : '/',
  plugins: [react()],
  server: { host: true },
  build: {
    rolldownOptions: {
      output: {
        // three.js and the other libraries change rarely, so they get their own long-cached files.
        codeSplitting: {
          groups: [
            { name: 'three', test: /node_modules[\\/](three|@react-three)[\\/]/ },
            { name: 'vendor', test: /node_modules[\\/]/ },
          ],
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
}));
