// ============================================================
// stage-lighting.js — Per-stage lighting, fog, shadow system
// Phase 5: Distinct atmosphere for each Nusantara stage
// ============================================================

import * as THREE from 'three';
import { getScene, getRenderer, getCamera } from './renderer.js';

// ============================================================
// STAGE ATMOSPHERE PRESETS
// Each stage has unique lighting, fog, and ambient properties
// that reflect Indonesian cultural themes
// ============================================================

export const STAGE_ATMOSPHERE = {
  // Stage 0: Candi Borobudur — Warm torchlight in ancient stone temple
  0: {
    name: 'Candi Borobudur',
    // Fog — warm, dusty temple interior
    fog: { color: 0x0D0A1A, near: 400, far: 2000 },
    // Ambient light — dim warm torchlight
    ambient: { color: 0xE8D5A3, intensity: 0.35 },
    // Main directional — warm sunlight filtering through temple openings
    mainLight: { color: 0xFFF5E0, intensity: 0.7, pos: [200, -300, 400] },
    // Fill light — cool stone reflection
    fillLight: { color: 0x8899BB, intensity: 0.2, pos: [-100, 50, 200] },
    // Rim/accent — golden Indonesian temple glow
    rimLight: { color: 0xD4AF37, intensity: 0.2, pos: [0, 0, -100] },
    // Point lights — torches at specific positions
    pointLights: [
      { color: 0xFF8844, intensity: 0.6, distance: 300, pos: [0, -40, 50] },
      { color: 0xFF8844, intensity: 0.4, distance: 250, pos: [400, -40, 50] },
    ],
    // Shadow settings
    shadow: {
      mapSize: 1024,
      bias: -0.001,
      normalBias: 0.02,
    },
    // Tone mapping exposure
    exposure: 0.9,
    // Background gradient
    bg1: '#0D0A1A',
    bg2: '#1A0A2E',
  },

  // Stage 1: Hutan Borneo — Dappled green moonlight through canopy
  1: {
    name: 'Hutan Borneo',
    fog: { color: 0x081A0D, near: 300, far: 1600 },
    ambient: { color: 0x4A8A5A, intensity: 0.25 },
    mainLight: { color: 0xAAFFAA, intensity: 0.5, pos: [150, -400, 500] },
    fillLight: { color: 0x336644, intensity: 0.3, pos: [-200, -100, 300] },
    rimLight: { color: 0x88CC88, intensity: 0.15, pos: [0, 50, -100] },
    pointLights: [
      { color: 0x44FF88, intensity: 0.3, distance: 200, pos: [100, -20, 30] },
      { color: 0xAAFFAA, intensity: 0.2, distance: 350, pos: [500, -60, 80] },
    ],
    shadow: { mapSize: 1024, bias: -0.001, normalBias: 0.02 },
    exposure: 0.85,
    bg1: '#0A1A0D',
    bg2: '#0A2E15',
  },

  // Stage 2: Gunung Bromo — Red/orange fire glow, ash clouds
  2: {
    name: 'Gunung Bromo',
    fog: { color: 0x1A0A08, near: 250, far: 1400 },
    ambient: { color: 0xAA6644, intensity: 0.3 },
    mainLight: { color: 0xFF8844, intensity: 0.8, pos: [100, -250, 350] },
    fillLight: { color: 0x884422, intensity: 0.25, pos: [-150, 100, 200] },
    rimLight: { color: 0xFF4400, intensity: 0.25, pos: [0, 0, -100] },
    pointLights: [
      { color: 0xFF4400, intensity: 0.8, distance: 400, pos: [0, 20, 30] },
      { color: 0xFF6600, intensity: 0.5, distance: 300, pos: [300, -30, 20] },
      { color: 0xFF2200, intensity: 0.6, distance: 350, pos: [600, 10, 40] },
    ],
    shadow: { mapSize: 1024, bias: -0.001, normalBias: 0.02 },
    exposure: 1.1,
    bg1: '#1A0A0A',
    bg2: '#2E150A',
  },

  // Stage 3: Laut Bali — Blue underwater caustics, bioluminescence
  3: {
    name: 'Laut Bali',
    fog: { color: 0x051020, near: 200, far: 1200 },
    ambient: { color: 0x2244AA, intensity: 0.3 },
    mainLight: { color: 0x4488FF, intensity: 0.6, pos: [0, -500, 300] },
    fillLight: { color: 0x1144AA, intensity: 0.3, pos: [-100, 200, 150] },
    rimLight: { color: 0x00CED1, intensity: 0.2, pos: [0, 0, -100] },
    pointLights: [
      { color: 0x00CED1, intensity: 0.4, distance: 250, pos: [200, -30, 20] },
      { color: 0x0088FF, intensity: 0.3, distance: 300, pos: [600, -50, 40] },
      { color: 0x00FFAA, intensity: 0.25, distance: 200, pos: [400, 20, 30] },
    ],
    shadow: { mapSize: 1024, bias: -0.001, normalBias: 0.02 },
    exposure: 0.8,
    bg1: '#0A0A1A',
    bg2: '#0A152E',
  },

  // Stage 4: Candi Prambanan — Golden divine light, dramatic shadows
  4: {
    name: 'Candi Prambanan',
    fog: { color: 0x1A1A08, near: 350, far: 1800 },
    ambient: { color: 0xD4AF37, intensity: 0.3 },
    mainLight: { color: 0xFFDD88, intensity: 0.9, pos: [0, -400, 500] },
    fillLight: { color: 0xAA8833, intensity: 0.25, pos: [-200, 100, 250] },
    rimLight: { color: 0xFFD700, intensity: 0.3, pos: [0, 0, -100] },
    pointLights: [
      { color: 0xFFD700, intensity: 0.7, distance: 400, pos: [0, -40, 60] },
      { color: 0xD4AF37, intensity: 0.5, distance: 350, pos: [400, -60, 40] },
      { color: 0xFFCC00, intensity: 0.4, distance: 300, pos: [800, -30, 50] },
    ],
    shadow: { mapSize: 2048, bias: -0.0005, normalBias: 0.01 },
    exposure: 1.0,
    bg1: '#1A1A0A',
    bg2: '#2E2E0A',
  },
};

// ============================================================
// LIGHTING STATE
// ============================================================

let currentLights = {
  ambient: null,
  main: null,
  fill: null,
  rim: null,
  points: [],
};

let currentStageId = -1;
let lightUpdateCallback = null; // For animated lights (flickering, etc.)

// ============================================================
// APPLY STAGE LIGHTING
// ============================================================

/**
 * Apply stage-specific lighting and atmosphere.
 * Called when a new map/stage is loaded.
 * @param {number} stageId — Stage ID (0–4)
 */
export function applyStageLighting(stageId) {
  const scene = getScene();
  const renderer = getRenderer();
  if (!scene || !renderer) return;

  const atm = STAGE_ATMOSPHERE[stageId];
  if (!atm) {
    console.warn(`[StageLighting] No atmosphere for stage ${stageId}`);
    return;
  }

  // ---- Remove existing lights ----
  removeCurrentLights(scene);

  // ---- Fog ----
  scene.fog = new THREE.Fog(atm.fog.color, atm.fog.near, atm.fog.far);

  // ---- Ambient light ----
  currentLights.ambient = new THREE.AmbientLight(atm.ambient.color, atm.ambient.intensity);
  scene.add(currentLights.ambient);

  // ---- Main directional light (with shadows) ----
  currentLights.main = new THREE.DirectionalLight(atm.mainLight.color, atm.mainLight.intensity);
  currentLights.main.position.set(...atm.mainLight.pos);
  currentLights.main.castShadow = true;
  currentLights.main.shadow.mapSize.set(atm.shadow.mapSize, atm.shadow.mapSize);
  currentLights.main.shadow.camera.near = 1;
  currentLights.main.shadow.camera.far = 2000;
  currentLights.main.shadow.camera.left = -600;
  currentLights.main.shadow.camera.right = 600;
  currentLights.main.shadow.camera.top = 400;
  currentLights.main.shadow.camera.bottom = -400;
  currentLights.main.shadow.bias = atm.shadow.bias;
  currentLights.main.shadow.normalBias = atm.shadow.normalBias;
  scene.add(currentLights.main);

  // ---- Fill light ----
  currentLights.fill = new THREE.DirectionalLight(atm.fillLight.color, atm.fillLight.intensity);
  currentLights.fill.position.set(...atm.fillLight.pos);
  scene.add(currentLights.fill);

  // ---- Rim light ----
  currentLights.rim = new THREE.DirectionalLight(atm.rimLight.color, atm.rimLight.intensity);
  currentLights.rim.position.set(...atm.rimLight.pos);
  scene.add(currentLights.rim);

  // ---- Point lights (torches, magical sources, etc.) ----
  atm.pointLights.forEach((pl, i) => {
    const pointLight = new THREE.PointLight(pl.color, pl.intensity, pl.distance);
    pointLight.position.set(...pl.pos);
    pointLight.castShadow = i === 0; // Only first point light casts shadow for perf
    pointLight.shadow.mapSize.set(512, 512);
    pointLight.shadow.bias = -0.002;
    pointLight.name = `point_light_${i}`;
    scene.add(pointLight);
    currentLights.points.push(pointLight);
  });

  // ---- Tone mapping exposure ----
  renderer.toneMappingExposure = atm.exposure;

  // ---- Enable shadow mapping ----
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // ---- Update shadow-dependent scene objects ----
  // Enable castShadow/receiveShadow on all scene children
  scene.traverse((child) => {
    if (child.isMesh) {
      if (child.name === 'shadow' || child.name === 'aura' || child.name === 'divine' ||
          child.name === 'water_aura') {
        child.castShadow = false;
        child.receiveShadow = false;
      } else {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    }
  });

  currentStageId = stageId;
  console.log(`[StageLighting] Applied atmosphere for: ${atm.name}`);
}

/**
 * Remove all current lights from the scene.
 */
function removeCurrentLights(scene) {
  if (currentLights.ambient) { scene.remove(currentLights.ambient); currentLights.ambient = null; }
  if (currentLights.main) { scene.remove(currentLights.main); currentLights.main = null; }
  if (currentLights.fill) { scene.remove(currentLights.fill); currentLights.fill = null; }
  if (currentLights.rim) { scene.remove(currentLights.rim); currentLights.rim = null; }
  currentLights.points.forEach(pl => scene.remove(pl));
  currentLights.points = [];
}

// ============================================================
// ANIMATED LIGHT UPDATES (per frame)
// ============================================================

/**
 * Update animated lighting effects per frame.
 * Called from the render loop.
 * @param {number} gameTime — Current game time (frame counter)
 * @param {number} stageId — Current stage ID
 */
export function updateStageLighting(gameTime, stageId) {
  const atm = STAGE_ATMOSPHERE[stageId];
  if (!atm) return;

  // ---- Torch flicker (point lights wobble intensity) ----
  currentLights.points.forEach((pl, i) => {
    const baseIntensity = atm.pointLights[i]?.intensity || 0.5;
    const flickerSpeed = 0.08 + i * 0.02;
    const flickerAmp = baseIntensity * 0.15;
    pl.intensity = baseIntensity + Math.sin(gameTime * flickerSpeed + i * 1.7) * flickerAmp
      + Math.sin(gameTime * flickerSpeed * 2.3 + i * 0.5) * flickerAmp * 0.5;

    // Subtle position wobble for torches
    const posBase = atm.pointLights[i]?.pos || [0, 0, 0];
    pl.position.x = posBase[0] + Math.sin(gameTime * 0.05 + i) * 3;
    pl.position.z = posBase[2] + Math.sin(gameTime * 0.07 + i * 2) * 2;
  });

  // ---- Stage-specific lighting animations ----
  switch (stageId) {
    case 0: // Borobudur — subtle golden pulse
      if (currentLights.rim) {
        currentLights.rim.intensity = atm.rimLight.intensity +
          Math.sin(gameTime * 0.03) * 0.05;
      }
      break;

    case 1: // Hutan Borneo — firefly-like green pulse
      if (currentLights.ambient) {
        currentLights.ambient.intensity = atm.ambient.intensity +
          Math.sin(gameTime * 0.02) * 0.03;
      }
      break;

    case 2: // Gunung Bromo — volcanic red pulse
      if (currentLights.rim) {
        const pulse = Math.sin(gameTime * 0.05) * 0.1;
        currentLights.rim.intensity = atm.rimLight.intensity + pulse;
        currentLights.main.intensity = atm.mainLight.intensity + pulse * 0.5;
      }
      // Lava glow — pulsing point lights
      if (currentLights.points.length >= 1) {
        const lavaPulse = Math.sin(gameTime * 0.06) * 0.15 + 0.1;
        currentLights.points[0].intensity = (atm.pointLights[0]?.intensity || 0.8) + lavaPulse;
      }
      break;

    case 3: // Laut Bali — caustic blue shimmer
      if (currentLights.main) {
        const caustic = Math.sin(gameTime * 0.04) * 0.08 + Math.sin(gameTime * 0.07) * 0.05;
        currentLights.main.intensity = atm.mainLight.intensity + caustic;
      }
      // Bioluminescent point lights pulse independently
      currentLights.points.forEach((pl, i) => {
        const bioPulse = Math.sin(gameTime * 0.03 + i * 2.1) * 0.2;
        pl.intensity = (atm.pointLights[i]?.intensity || 0.3) + bioPulse;
      });
      break;

    case 4: // Candi Prambanan — divine golden radiance
      if (currentLights.ambient) {
        const divine = Math.sin(gameTime * 0.025) * 0.05;
        currentLights.ambient.intensity = atm.ambient.intensity + divine;
      }
      // Main light slowly rotates around the stage for dramatic effect
      if (currentLights.main) {
        const angle = gameTime * 0.003;
        const radius = 400;
        currentLights.main.position.x = Math.sin(angle) * radius;
        currentLights.main.position.z = Math.cos(angle) * radius + 100;
      }
      break;
  }

  // ---- Update shadow camera to follow player roughly ----
  if (currentLights.main) {
    const cam = getCamera();
    if (cam) {
      // Center shadow camera on current camera view
      currentLights.main.target.position.set(cam.position.x, cam.position.y, 0);
      currentLights.main.target.updateMatrixWorld();
    }
  }
}

/**
 * Update directional light shadow camera to cover visible area.
 * Should be called when camera moves significantly.
 * @param {number} centerX — Camera focus X in Three.js coords
 * @param {number} centerY — Camera focus Y in Three.js coords
 */
export function updateShadowCamera(centerX, centerY) {
  if (!currentLights.main) return;
  currentLights.main.shadow.camera.left = centerX - 500;
  currentLights.main.shadow.camera.right = centerX + 500;
  currentLights.main.shadow.camera.top = centerY + 300;
  currentLights.main.shadow.camera.bottom = centerY - 300;
  currentLights.main.shadow.camera.updateProjectionMatrix();
}

/**
 * Reset lighting to default (for menu, loading screens).
 */
export function resetStageLighting() {
  const scene = getScene();
  const renderer = getRenderer();
  if (!scene || !renderer) return;

  removeCurrentLights(scene);

  // Default warm ambient
  currentLights.ambient = new THREE.AmbientLight(0xE8D5A3, 0.6);
  scene.add(currentLights.ambient);

  currentLights.main = new THREE.DirectionalLight(0xFFF5E0, 0.8);
  currentLights.main.position.set(200, -300, 400);
  scene.add(currentLights.main);

  scene.fog = null;
  currentStageId = -1;
}

/**
 * Get the current atmosphere config.
 * @returns {Object|null}
 */
export function getCurrentAtmosphere() {
  return currentStageId >= 0 ? STAGE_ATMOSPHERE[currentStageId] : null;
}
