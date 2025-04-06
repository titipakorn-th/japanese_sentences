import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.{test,spec}.{js,ts,svelte}', 'src/**/*.{test,spec}.{js,ts,svelte}'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['**/*.config.js', '**/*.d.ts', 'src/app.html']
    }
  }
}); 