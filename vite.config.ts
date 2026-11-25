import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  worker: { format: 'es' },
  build: {
    rolldownOptions: {
      input: { main: 'index.html', 'engine-check': 'engine-check.html' },
    },
  },
});
