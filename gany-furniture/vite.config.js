import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // During development the React app talks to the Express API through this proxy.
    proxy: { '/api': 'http://localhost:4000' },
  },
});
