// frontend/vite.config.js
// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM DESIGN: Vite is our build tool and dev server.
// WHY Vite over Create React App (CRA)?
//   - Uses native ES modules in dev → instant server start (no bundling)
//   - Hot Module Replacement (HMR) is near-instant vs CRA's seconds-long rebuilds
//   - Build output uses Rollup → optimized chunks, tree-shaking
// ─────────────────────────────────────────────────────────────────────────────
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],

  // Path aliases — import from '@/' instead of '../../../'
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  // Dev server config
  server: {
    port: 5173,
    // Proxy API calls to Django — avoids CORS in development
    // /api/* → http://localhost:8000/api/*
    // WHY: Cleaner than configuring CORS on every endpoint during dev.
    proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
    },
  },
})