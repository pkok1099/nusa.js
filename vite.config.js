// ============================================================
// vite.config.js — Vite configuration for NUSANTARA 3D
// Phase 2: Rapier3D WASM support active
// ============================================================

import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    target: 'esnext',
    // Ensure WASM files are properly handled
    rollupOptions: {
      output: {
        // Ensure WASM can be loaded as URL
        format: 'es',
      },
    },
  },
  server: {
    port: 3000,
    open: true,
    // Required headers for WASM
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  // Optimize deps — pre-bundle Three.js and handle Rapier WASM
  optimizeDeps: {
    include: ['three'],
    // Rapier WASM needs special handling — exclude from optimization
    exclude: ['@dimforge/rapier3d-compat'],
  },
  // WASM support
  assetsInclude: ['**/*.wasm'],
});
