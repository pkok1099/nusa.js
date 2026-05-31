// ============================================================
// main.js — Vite entry point for NUSANTARA 3D
// Phase 5: Full atmosphere pipeline (lighting, audio, particles, post-fx)
// ============================================================

import { initRapier, isRapierReady } from './rapier-world.js';
import { buildAllModels } from './model-builder.js';
import { initAssetManager } from './asset-manager.js';
import { initSpatialAudio, resumeAudioContext } from './spatial-audio.js';
import { initPostProcessing } from './post-processing.js';
import { initStageParticles } from './particles3d.js';

// Show loading status
const loadingEl = document.getElementById('loading');
const loadProgressEl = document.getElementById('loadProgress');

async function boot() {
  try {
    // Step 1: Initialize Rapier WASM (async)
    if (loadProgressEl) loadProgressEl.textContent = 'Loading physics engine...';
    await initRapier();
    if (loadProgressEl) loadProgressEl.textContent = 'Rapier3D loaded ✓';

    // Step 2: Build procedural 3D models (Phase 4)
    if (loadProgressEl) loadProgressEl.textContent = 'Building 3D models...';
    buildAllModels();
    initAssetManager();
    if (loadProgressEl) loadProgressEl.textContent = '3D models ready ✓';

    // Step 3: Initialize Phase 5 — Spatial Audio
    if (loadProgressEl) loadProgressEl.textContent = 'Initializing spatial audio...';
    initSpatialAudio();
    if (loadProgressEl) loadProgressEl.textContent = 'Spatial audio ready ✓';

    // Step 4: Import game.js (which starts the game loop and calls initRenderer)
    if (loadProgressEl) loadProgressEl.textContent = 'Initializing game...';
    await import('./game.js');

    // Step 5: Initialize Phase 5 — Post-Processing
    // MUST be called AFTER game.js imports, because initRenderer() runs
    // at game.js module-load time, creating the renderer/scene/camera that
    // post-processing depends on.
    if (loadProgressEl) loadProgressEl.textContent = 'Setting up post-processing...';
    initPostProcessing();
    if (loadProgressEl) loadProgressEl.textContent = 'Post-processing ready ✓';

    // Step 6: Hide loading screen
    if (loadingEl) loadingEl.style.display = 'none';
    if (typeof window.__nusaLoaded === 'function') window.__nusaLoaded();

    // Resume audio on first user interaction
    const resumeHandler = () => {
      resumeAudioContext();
      document.removeEventListener('click', resumeHandler);
      document.removeEventListener('keydown', resumeHandler);
    };
    document.addEventListener('click', resumeHandler);
    document.addEventListener('keydown', resumeHandler);

    console.log('[NUSANTARA 3D] Phase 5 loaded — Three.js + Rapier3D + 3D Models + Procedural Animation + Atmosphere');
    console.log('[NUSANTARA 3D] Rapier ready:', isRapierReady());
  } catch (err) {
    console.error('[NUSANTARA 3D] Boot failed:', err);
    if (loadProgressEl) loadProgressEl.textContent = `Error: ${err.message}`;

    // Fallback: try loading game without Phase 5 systems
    console.warn('[NUSANTARA 3D] Attempting fallback without Phase 5...');
    try {
      buildAllModels();
      initAssetManager();
      await import('./game.js');
      if (loadingEl) loadingEl.style.display = 'none';
      if (typeof window.__nusaLoaded === 'function') window.__nusaLoaded();
      console.log('[NUSANTARA 3D] Fallback loaded — game running without Phase 5 atmosphere');
    } catch (fallbackErr) {
      console.error('[NUSANTARA 3D] Fallback also failed:', fallbackErr);
    }
  }
}

boot();
