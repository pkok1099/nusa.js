// ============================================================
// asset-manager.js — 3D model cache, GLTF loader, texture gen
// Phase 4: Centralized asset loading & caching system
// ============================================================

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { C } from './config.js';

// ---- Model cache ----
const modelCache = new Map();      // key → THREE.Group (cloned from base)
const baseModels = new Map();      // key → THREE.Group (original, never modified)
const textureCache = new Map();    // key → THREE.Texture

// ---- GLTF Loader (for future .glb model loading) ----
let gltfLoader = null;

function getGLTFLoader() {
  if (!gltfLoader) {
    gltfLoader = new GLTFLoader();
  }
  return gltfLoader;
}

// ============================================================
// PUBLIC API — Model Management
// ============================================================

/**
 * Register a base model (usually from procedural builder).
 * Base models are never modified — they serve as templates for cloning.
 * @param {string} key — Model identifier (e.g., 'player', 'batu_kecil')
 * @param {THREE.Group} model — The base model group
 */
export function registerBaseModel(key, model) {
  baseModels.set(key, model);
}

/**
 * Get a clone of a registered base model.
 * Each entity gets its own clone so animations can run independently.
 * @param {string} key — Model identifier
 * @returns {THREE.Group|null} — Cloned model or null if not found
 */
export function cloneModel(key) {
  const base = baseModels.get(key);
  if (!base) {
    console.warn(`[AssetManager] Model not found: ${key}`);
    return null;
  }
  // Deep clone with skeleton sharing (animations work independently)
  const clone = base.clone(true);

  // Assign unique IDs to each mesh for independent material control
  clone.traverse((child) => {
    if (child.isMesh) {
      // Clone material so each instance can change color independently
      if (child.material) {
        child.material = child.material.clone();
      }
    }
  });

  return clone;
}

/**
 * Load a GLB/GLTF model from URL.
 * For Phase 4, this is the pathway for future artist-created assets.
 * @param {string} key — Model identifier
 * @param {string} url — URL to .glb file
 * @returns {Promise<THREE.Group>}
 */
export async function loadGLBModel(key, url) {
  // Check cache first
  if (baseModels.has(key)) {
    return baseModels.get(key);
  }

  try {
    const loader = getGLTFLoader();
    const gltf = await new Promise((resolve, reject) => {
      loader.load(url, resolve, undefined, reject);
    });

    const model = gltf.scene;
    registerBaseModel(key, model);
    return model;
  } catch (err) {
    console.warn(`[AssetManager] Failed to load GLB: ${key} from ${url}`, err);
    return null;
  }
}

/**
 * Check if a model is registered.
 * @param {string} key
 * @returns {boolean}
 */
export function hasModel(key) {
  return baseModels.has(key);
}

/**
 * Get all registered model keys.
 * @returns {string[]}
 */
export function getModelKeys() {
  return Array.from(baseModels.keys());
}

// ============================================================
// TEXTURE GENERATION — Canvas-based procedural textures
// ============================================================

/**
 * Generate a procedural texture from a canvas drawing.
 * @param {string} key — Texture cache key
 * @param {number} width — Canvas width
 * @param {number} height — Canvas height
 * @param {function(CanvasRenderingContext2D): void} drawFn — Draw function
 * @returns {THREE.CanvasTexture}
 */
export function generateTexture(key, width, height, drawFn) {
  if (textureCache.has(key)) {
    return textureCache.get(key);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  drawFn(ctx, width, height);

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  textureCache.set(key, tex);
  return tex;
}

/**
 * Get a cached texture by key.
 * @param {string} key
 * @returns {THREE.Texture|undefined}
 */
export function getTexture(key) {
  return textureCache.get(key);
}

// ============================================================
// MATERIAL HELPERS — Common materials with Indonesian themes
// ============================================================

// Shared material cache (materials that don't need per-instance colors)
const materialCache = new Map();

/**
 * Get or create a standard material.
 * @param {string} key — Material identifier
 * @param {Object} opts — Material options
 * @returns {THREE.MeshStandardMaterial}
 */
export function getMaterial(key, opts = {}) {
  if (materialCache.has(key) && !opts.forceNew) {
    return materialCache.get(key);
  }
  const mat = new THREE.MeshStandardMaterial({
    color: opts.color || 0xffffff,
    roughness: opts.roughness !== undefined ? opts.roughness : 0.7,
    metalness: opts.metalness !== undefined ? opts.metalness : 0.1,
    transparent: opts.transparent || false,
    opacity: opts.opacity !== undefined ? opts.opacity : 1.0,
    emissive: opts.emissive || 0x000000,
    emissiveIntensity: opts.emissiveIntensity || 0,
    flatShading: opts.flatShading !== undefined ? opts.flatShading : true,
    side: opts.side || THREE.FrontSide,
  });
  materialCache.set(key, mat);
  return mat;
}

/** Common material presets for Nusantara theme */
export const MATERIALS = {
  // Organic
  skin: () => getMaterial('skin', { color: 0xD4A574, roughness: 0.8 }),
  skinDark: () => getMaterial('skin_dark', { color: 0xB8845A, roughness: 0.8 }),
  // Metals
  gold: () => getMaterial('gold', { color: 0xD4AF37, metalness: 0.6, roughness: 0.3 }),
  goldLight: () => getMaterial('gold_light', { color: 0xF5E6A3, metalness: 0.5, roughness: 0.4 }),
  goldDark: () => getMaterial('gold_dark', { color: 0x8B6914, metalness: 0.5, roughness: 0.4 }),
  iron: () => getMaterial('iron', { color: 0x7A7A8A, metalness: 0.7, roughness: 0.4 }),
  steel: () => getMaterial('steel', { color: 0x9A9AAA, metalness: 0.8, roughness: 0.3 }),
  silver: () => getMaterial('silver', { color: 0xC0C0C0, metalness: 0.8, roughness: 0.2 }),
  // Stone
  stone: () => getMaterial('stone', { color: 0x8B8682, roughness: 0.9 }),
  stoneDark: () => getMaterial('stone_dark', { color: 0x6B6662, roughness: 0.9 }),
  stoneLight: () => getMaterial('stone_light', { color: 0xA09A94, roughness: 0.9 }),
  // Nature
  wood: () => getMaterial('wood', { color: 0x6B4226, roughness: 0.85 }),
  grass: () => getMaterial('grass', { color: 0x2D5A1E, roughness: 0.9 }),
  leaf: () => getMaterial('leaf', { color: 0x3D7A2E, roughness: 0.85 }),
  // Water
  water: () => getMaterial('water', { color: 0x1E5A8E, transparent: true, opacity: 0.7, roughness: 0.2, metalness: 0.1 }),
  // Fire
  lava: () => getMaterial('lava', { color: 0xCC3300, emissive: 0x661100, emissiveIntensity: 0.5 }),
  fire: () => getMaterial('fire', { color: 0xFF6600, emissive: 0xFF3300, emissiveIntensity: 0.8 }),
  ember: () => getMaterial('ember', { color: 0xFF3300, emissive: 0xFF0000, emissiveIntensity: 1.0 }),
  // Cloth
  clothBrown: () => getMaterial('cloth_brown', { color: 0x8B4513, roughness: 0.95 }),
  clothGreen: () => getMaterial('cloth_green', { color: 0x4A6B42, roughness: 0.95 }),
  clothGold: () => getMaterial('cloth_gold', { color: 0x8B7514, roughness: 0.85 }),
  clothRed: () => getMaterial('cloth_red', { color: 0x8A2A2A, roughness: 0.9 }),
  // Enemy-specific
  demonRed: () => getMaterial('demon_red', { color: 0x8A2A2A, roughness: 0.8 }),
  demonDark: () => getMaterial('demon_dark', { color: 0x6A1A0A, roughness: 0.85 }),
  tiger: () => getMaterial('tiger', { color: 0xCC8833, roughness: 0.85 }),
  tigerDark: () => getMaterial('tiger_dark', { color: 0x884411, roughness: 0.85 }),
  snake: () => getMaterial('snake', { color: 0x2A8A2A, roughness: 0.8 }),
  snakeLight: () => getMaterial('snake_light', { color: 0x3AAA3A, roughness: 0.8 }),
  jellyfish: () => getMaterial('jellyfish', { color: 0x4A2A6A, transparent: true, opacity: 0.8, emissive: 0x2A1A4A, emissiveIntensity: 0.3 }),
  fishBlue: () => getMaterial('fish_blue', { color: 0x2A6A8A, roughness: 0.5, metalness: 0.2 }),
  soldier: () => getMaterial('soldier', { color: 0x4A4A5A, metalness: 0.3, roughness: 0.6 }),
  soldierDark: () => getMaterial('soldier_dark', { color: 0x3A3A4A, metalness: 0.3, roughness: 0.6 }),
  giant: () => getMaterial('giant', { color: 0x6A5A4A, roughness: 0.9 }),
  giantDark: () => getMaterial('giant_dark', { color: 0x5A4A3A, roughness: 0.9 }),
  // Effects
  glow: (color) => getMaterial(`glow_${color.toString(16)}`, { color, emissive: color, emissiveIntensity: 0.6, transparent: true, opacity: 0.5 }),
  hurtFlash: () => new THREE.MeshStandardMaterial({ color: 0xFF4444, emissive: 0xFF0000, emissiveIntensity: 1.0 }),
  poison: () => getMaterial('poison', { color: 0x44FF44, transparent: true, opacity: 0.3, emissive: 0x22AA22, emissiveIntensity: 0.3 }),
  heal: () => getMaterial('heal', { color: 0x44FF44, transparent: true, opacity: 0.4, emissive: 0x22CC22, emissiveIntensity: 0.5 }),
  dodgeGhost: () => getMaterial('dodge_ghost', { color: 0xD4AF37, transparent: true, opacity: 0.3, emissive: 0xD4AF37, emissiveIntensity: 0.4 }),
  parryRing: () => getMaterial('parry_ring', { color: 0xFFD700, transparent: true, opacity: 0.5, emissive: 0xFFD700, emissiveIntensity: 0.6 }),
  // Hair
  hair: () => getMaterial('hair', { color: 0x3D2B1F, roughness: 0.95 }),
  headband: () => getMaterial('headband', { color: 0x3D2B1F, roughness: 0.9 }),
  // Crown
  crown: () => getMaterial('crown', { color: 0xD4AF37, metalness: 0.7, roughness: 0.2, emissive: 0x8B6914, emissiveIntensity: 0.2 }),
  // Armor
  armorNaga: () => getMaterial('armor_naga', { color: 0x2A4A2A, metalness: 0.4, roughness: 0.5 }),
  armorEmas: () => getMaterial('armor_emas', { color: 0x8B7514, metalness: 0.5, roughness: 0.4 }),
  armorPerak: () => getMaterial('armor_perak', { color: 0x707080, metalness: 0.6, roughness: 0.35 }),
  armorBesi: () => getMaterial('armor_besi', { color: 0x505050, metalness: 0.5, roughness: 0.5 }),
  armorKulit: () => getMaterial('armor_kulit', { color: 0x6B4226, roughness: 0.9 }),
  // Eye
  eyeRed: () => getMaterial('eye_red', { color: 0xFF4444, emissive: 0xFF0000, emissiveIntensity: 0.8 }),
  eyeGold: () => getMaterial('eye_gold', { color: 0xD4AF37, emissive: 0xAA8800, emissiveIntensity: 0.5 }),
  eyeOrange: () => getMaterial('eye_orange', { color: 0xFF6600, emissive: 0xCC4400, emissiveIntensity: 0.6 }),
  eyeCyan: () => getMaterial('eye_cyan', { color: 0x00CED1, emissive: 0x008888, emissiveIntensity: 0.5 }),
  eyeBlue: () => getMaterial('eye_blue', { color: 0x44AAFF, emissive: 0x2266CC, emissiveIntensity: 0.5 }),
  eyeWhite: () => getMaterial('eye_white', { color: 0xFFFFEE, emissive: 0xCCCCAA, emissiveIntensity: 0.3 }),
  // Weapon
  keris: () => getMaterial('keris', { color: 0x8B6914, metalness: 0.6, roughness: 0.3 }),
  pedang: () => getMaterial('pedang', { color: 0x9A9AAA, metalness: 0.8, roughness: 0.2 }),
  tombak: () => getMaterial('tombak', { color: 0x7A7A8A, metalness: 0.7, roughness: 0.3 }),
  kerisEmas: () => getMaterial('keris_emas', { color: 0xD4AF37, metalness: 0.7, roughness: 0.2 }),
  panahApi: () => getMaterial('panah_api', { color: 0xFF6600, metalness: 0.4, roughness: 0.4, emissive: 0xFF3300, emissiveIntensity: 0.4 }),
  trisula: () => getMaterial('trisula', { color: 0xF5E6A3, metalness: 0.8, roughness: 0.1, emissive: 0xD4AF37, emissiveIntensity: 0.3 }),
  swordGuard: () => getMaterial('sword_guard', { color: 0xD4AF37, metalness: 0.5, roughness: 0.4 }),
  shield: () => getMaterial('shield', { color: 0xD4AF37, metalness: 0.4, roughness: 0.5, transparent: true, opacity: 0.5 }),
};

// ============================================================
// CLEANUP — Dispose all cached assets
// ============================================================

export function disposeAllAssets() {
  // Dispose models
  for (const [key, model] of baseModels) {
    model.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }
  baseModels.clear();
  modelCache.clear();

  // Dispose textures
  for (const [key, tex] of textureCache) {
    tex.dispose();
  }
  textureCache.clear();

  // Dispose materials
  for (const [key, mat] of materialCache) {
    mat.dispose();
  }
  materialCache.clear();
}

// ============================================================
// INITIALIZATION — Pre-register procedural models
// ============================================================

let initialized = false;

/**
 * Initialize the asset manager.
 * Registers all procedural models built by model-builder.js.
 * Must be called AFTER model-builder.js has set up its models.
 */
export function initAssetManager() {
  if (initialized) return;
  initialized = true;
  console.log('[AssetManager] Initialized — procedural models ready');
}
