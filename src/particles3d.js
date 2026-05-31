// ============================================================
// particles3d.js — 3D Particle System with per-stage elements
// Phase 5: Replaces flat particles.js with stage-themed 3D particles
// Maintains backward compatibility with particles.js interface
// ============================================================

import * as THREE from 'three';
import { getScene } from './renderer.js';
import { GAME_W, GAME_H } from './config.js';

// ============================================================
// PARTICLE TYPES PER STAGE
// ============================================================

export const STAGE_PARTICLES = {
  // Candi Borobudur — Golden dust motes, ancient stone sparkles
  0: {
    ambient: {
      count: 40,
      color: 0xD4AF37,
      size: 1.5,
      speed: 0.3,
      lifetime: 300,
      pattern: 'float_up',     // Gentle upward drift
      spread: GAME_W,
      emissive: 0xD4AF37,
      emissiveIntensity: 0.3,
    },
    combat: {
      color: 0xFFD700,
      size: 2.0,
      speed: 3,
      lifetime: 40,
      pattern: 'burst',
    },
  },

  // Hutan Borneo — Fireflies, falling leaves
  1: {
    ambient: {
      count: 25,
      color: 0x88FF44,
      size: 2.0,
      speed: 0.5,
      lifetime: 400,
      pattern: 'firefly',      // Random wander with glow pulse
      spread: GAME_W,
      emissive: 0x44FF44,
      emissiveIntensity: 0.6,
    },
    combat: {
      color: 0x88FF44,
      size: 2.5,
      speed: 3,
      lifetime: 35,
      pattern: 'burst',
    },
  },

  // Gunung Bromo — Embers, smoke, ash falling
  2: {
    ambient: {
      count: 60,
      color: 0xFF6600,
      size: 1.2,
      speed: 0.8,
      lifetime: 200,
      pattern: 'ember_rise',   // Rising embers with flicker
      spread: GAME_W,
      emissive: 0xFF3300,
      emissiveIntensity: 0.8,
    },
    combat: {
      color: 0xFF4400,
      size: 3.0,
      speed: 4,
      lifetime: 30,
      pattern: 'burst',
    },
  },

  // Laut Bali — Bubbles, light rays
  3: {
    ambient: {
      count: 30,
      color: 0x00CED1,
      size: 1.8,
      speed: 0.4,
      lifetime: 350,
      pattern: 'bubble_rise',  // Bubbles rising with wobble
      spread: GAME_W,
      emissive: 0x00CED1,
      emissiveIntensity: 0.4,
    },
    combat: {
      color: 0x00CED1,
      size: 2.0,
      speed: 3,
      lifetime: 40,
      pattern: 'burst',
    },
  },

  // Candi Prambanan — Golden motes, divine sparks
  4: {
    ambient: {
      count: 50,
      color: 0xFFD700,
      size: 1.5,
      speed: 0.3,
      lifetime: 350,
      pattern: 'divine_spiral', // Slow spiral upward
      spread: GAME_W,
      emissive: 0xD4AF37,
      emissiveIntensity: 0.5,
    },
    combat: {
      color: 0xFFD700,
      size: 2.5,
      speed: 3.5,
      lifetime: 35,
      pattern: 'burst',
    },
  },
};

// ============================================================
// 3D PARTICLE SYSTEM
// ============================================================

const MAX_PARTICLES = 500;

let ambientParticles = [];
let combatParticles = [];
let projectileParticles = [];

let particleGeometry = null;
let particleMaterial = null;
let particleMesh = null;

let currentStageId = -1;

// ============================================================
// PARTICLE DATA STRUCTURE
// ============================================================

class Particle3D {
  constructor(x, y, z, vx, vy, vz, color, size, life, type = 'default') {
    this.x = x;
    this.y = y;
    this.z = z;
    this.vx = vx;
    this.vy = vy;
    this.vz = vz;
    this.color = color;
    this.size = size;
    this.life = life;
    this.maxLife = life;
    this.type = type;
    this.active = true;
    // For special patterns
    this.phase = Math.random() * Math.PI * 2;
    this.amplitude = 0.5 + Math.random() * 1.5;
    // Projectile data
    this.isProjectile = false;
    this.damage = 0;
    this.isPlayerArrow = false;
  }
}

// ============================================================
// AMBIENT PARTICLE SPAWNING
// ============================================================

/**
 * Initialize ambient particles for a stage.
 * @param {number} stageId
 */
export function initStageParticles(stageId) {
  ambientParticles = [];
  currentStageId = stageId;

  const config = STAGE_PARTICLES[stageId];
  if (!config) return;

  const ambient = config.ambient;
  for (let i = 0; i < ambient.count; i++) {
    const p = createAmbientParticle(ambient, i);
    if (p) ambientParticles.push(p);
  }

  console.log(`[Particles3D] Initialized ${ambientParticles.length} ambient particles for stage ${stageId}`);
}

/**
 * Create a single ambient particle based on stage pattern.
 */
function createAmbientParticle(config, index) {
  const spreadX = config.spread || GAME_W;
  const x = Math.random() * spreadX;
  const y = Math.random() * GAME_H;
  const z = Math.random() * 10 + 1;

  let vx = 0, vy = 0, vz = 0;

  switch (config.pattern) {
    case 'float_up':
      vy = -config.speed * (0.5 + Math.random() * 0.5);
      vx = (Math.random() - 0.5) * config.speed * 0.3;
      break;
    case 'firefly':
      vx = (Math.random() - 0.5) * config.speed;
      vy = (Math.random() - 0.5) * config.speed;
      break;
    case 'ember_rise':
      vy = -config.speed * (0.8 + Math.random() * 0.4);
      vx = (Math.random() - 0.5) * config.speed * 0.5;
      vz = Math.random() * 0.5;
      break;
    case 'bubble_rise':
      vy = -config.speed * (0.3 + Math.random() * 0.3);
      vx = 0;
      break;
    case 'divine_spiral':
      vy = -config.speed * 0.3;
      vx = 0;
      break;
    default:
      vy = -config.speed * 0.5;
      vx = (Math.random() - 0.5) * config.speed * 0.2;
  }

  const p = new Particle3D(x, y, z, vx, vy, vz, config.color, config.size,
    config.lifetime + Math.random() * 100, config.pattern);
  p.phase = (index / config.count) * Math.PI * 2;
  return p;
}

/**
 * Respawn an ambient particle that has expired.
 */
function respawnAmbientParticle(p, config) {
  const spreadX = config.spread || GAME_W;

  // Reset position
  switch (config.pattern) {
    case 'float_up':
    case 'ember_rise':
    case 'bubble_rise':
    case 'divine_spiral':
      p.x = Math.random() * spreadX;
      p.y = GAME_H + Math.random() * 50; // Spawn above view
      p.z = Math.random() * 10 + 1;
      break;
    case 'firefly':
      p.x = Math.random() * spreadX;
      p.y = Math.random() * GAME_H;
      p.z = Math.random() * 10 + 1;
      break;
    default:
      p.x = Math.random() * spreadX;
      p.y = GAME_H + Math.random() * 50;
      p.z = Math.random() * 10 + 1;
  }

  p.life = config.lifetime + Math.random() * 100;
  p.maxLife = p.life;
  p.active = true;
}

// ============================================================
// COMBAT PARTICLE SPAWNING (backward-compatible with particles.js)
// ============================================================

/**
 * Spawn combat particles at a position.
 * Backward-compatible with particles.js spawnParticle().
 */
export function spawnParticle3D(x, y, color, count = 5, speed = 3, life = 30) {
  if (combatParticles.length > 300) count = Math.min(count, 1);

  const stageConfig = STAGE_PARTICLES[currentStageId];
  const combatColor = stageConfig?.combat?.color || color;

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd = Math.random() * speed + 0.5;
    const p = new Particle3D(
      x, y, 2,
      Math.cos(angle) * spd,
      Math.sin(angle) * spd - 1,
      (Math.random() - 0.5) * 2,
      combatColor,
      Math.random() * 3 + 1,
      life
    );
    combatParticles.push(p);
  }
}

/**
 * Spawn a floating text effect (kept as 2D overlay via particles.js).
 */
export function spawnFloatingText3D(x, y, text, color) {
  // Floating text remains 2D (HUD overlay) — no 3D version needed
  // This function exists for API compatibility
}

/**
 * Spawn a projectile particle.
 */
export function spawnProjectile3D(x, y, vx, vy, damage, isPlayerArrow = false, color = 0xFF4444, size = 4) {
  const p = new Particle3D(x, y, 2, vx, vy, 0, color, size, 200);
  p.isProjectile = true;
  p.damage = damage;
  p.isPlayerArrow = isPlayerArrow;
  projectileParticles.push(p);
}

// ============================================================
// PARTICLE UPDATE
// ============================================================

/**
 * Update all particles per frame.
 * @param {number} hitStopTimer — If > 0, combat particles freeze
 * @param {Object} player — Player entity (for projectile collision)
 * @param {Function} damagePlayer — Damage callback
 */
export function updateParticles3D(hitStopTimer, player, damagePlayer) {
  const stageConfig = STAGE_PARTICLES[currentStageId];
  const ambientConfig = stageConfig?.ambient;

  // ---- Update ambient particles ----
  ambientParticles.forEach(p => {
    if (!p.active) return;

    // Pattern-specific movement
    switch (p.type) {
      case 'float_up':
        p.x += p.vx;
        p.y += p.vy;
        // Gentle horizontal sway
        p.x += Math.sin(p.life * 0.02 + p.phase) * 0.3;
        break;

      case 'firefly':
        // Random walk with smooth direction changes
        p.vx += (Math.random() - 0.5) * 0.1;
        p.vy += (Math.random() - 0.5) * 0.1;
        p.vx = Math.max(-1, Math.min(1, p.vx));
        p.vy = Math.max(-1, Math.min(1, p.vy));
        p.x += p.vx;
        p.y += p.vy;
        // Glow pulse (size variation)
        p.size = 1.5 + Math.sin(p.life * 0.05 + p.phase) * 1.0;
        break;

      case 'ember_rise':
        p.x += p.vx + Math.sin(p.life * 0.03 + p.phase) * 0.5;
        p.y += p.vy;
        p.z += p.vz;
        // Flicker
        p.size = 1.0 + Math.random() * 0.5;
        break;

      case 'bubble_rise':
        p.y += p.vy;
        // Wobble horizontally
        p.x += Math.sin(p.life * 0.02 + p.phase) * p.amplitude;
        // Vary size slightly
        p.size = 1.5 + Math.sin(p.life * 0.03) * 0.5;
        break;

      case 'divine_spiral':
        // Slow spiral upward
        const spiralSpeed = 0.01;
        p.x += Math.cos(p.life * spiralSpeed + p.phase) * p.amplitude * 0.5;
        p.y += p.vy;
        p.z += Math.sin(p.life * spiralSpeed + p.phase) * 0.3;
        break;

      default:
        p.x += p.vx;
        p.y += p.vy;
    }

    p.life--;
    if (p.life <= 0) {
      if (ambientConfig) respawnAmbientParticle(p, ambientConfig);
    }
  });

  // ---- Update combat particles (freeze during hit-stop) ----
  if (hitStopTimer <= 0) {
    combatParticles = combatParticles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05; // Gravity
      p.life--;
      return p.life > 0;
    });

    // ---- Update projectile particles ----
    projectileParticles = projectileParticles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.isProjectile) p.vy += 0.1;
      p.life--;
      return p.life > 0;
    });
  }
}

/**
 * Clear all combat and projectile particles.
 */
export function clearCombatParticles() {
  combatParticles = [];
  projectileParticles = [];
}

/**
 * Clear all particles.
 */
export function clearAllParticles3D() {
  ambientParticles = [];
  combatParticles = [];
  projectileParticles = [];
}

// ============================================================
// RENDER PARTICLES — Convert to THREE.Points
// ============================================================

/**
 * Build and return a THREE.Points object containing all active particles.
 * Called from the render pipeline each frame.
 * @returns {THREE.Points|null}
 */
export function buildParticlesPoints() {
  const scene = getScene();
  if (!scene) return null;

  // Combine all particles
  const allParticles = [...ambientParticles.filter(p => p.active), ...combatParticles, ...projectileParticles];
  const count = Math.min(allParticles.length, MAX_PARTICLES);

  if (count === 0) return null;

  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  const colorObj = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const p = allParticles[i];

    // Game coords → Three.js world coords
    positions[i * 3] = p.x;
    positions[i * 3 + 1] = -p.y; // Flip Y
    positions[i * 3 + 2] = p.z;

    // Color with alpha fade
    const alpha = p.life / p.maxLife;
    colorObj.set(p.color);
    colors[i * 3] = colorObj.r * alpha;
    colors[i * 3 + 1] = colorObj.g * alpha;
    colors[i * 3 + 2] = colorObj.b * alpha;

    sizes[i] = p.size * 4;
  }

  // Reuse geometry
  if (!particleGeometry) {
    particleGeometry = new THREE.BufferGeometry();
  }
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  // Material (create once)
  if (!particleMaterial) {
    particleMaterial = new THREE.PointsMaterial({
      size: 4,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      sizeAttenuation: false,
      blending: THREE.AdditiveBlending, // Glow effect
    });
  }

  const points = new THREE.Points(particleGeometry, particleMaterial);
  points.renderOrder = 100;
  points.frustumCulled = false;

  return points;
}

// ============================================================
// BACKWARD COMPATIBILITY — particles.js interface
// ============================================================

// These exports maintain compatibility with game.js and draw-game.js
// which import from particles.js

export let particles = []; // Still exported for backward compat
export let floatingTexts = [];

let damageEnemyFn = null;
let damageBossFn = null;
let getEntitiesFn = null;
let getBossFn = null;
let getBossActiveFn = null;

export function setDamageCallbacks(dmgEnemy, dmgBoss, getEnts, getBoss, getBossActive) {
  damageEnemyFn = dmgEnemy;
  damageBossFn = dmgBoss;
  getEntitiesFn = getEnts;
  getBossFn = getBoss;
  getBossActiveFn = getBossActive;
}

export function spawnParticle(x, y, color, count = 5, speed = 3, life = 30) {
  if (particles.length > 500) count = Math.min(count, 1);
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd = Math.random() * speed + 0.5;
    particles.push({
      x, y, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd - 1,
      life, maxLife: life, color, size: Math.random() * 3 + 1,
    });
  }
  // Also spawn 3D particles
  spawnParticle3D(x, y, color, count, speed, life);
}

export function spawnFloatingText(x, y, text, color) {
  floatingTexts.push({ x, y, text, color, life: 60, vy: -1.5 });
}

export function updateParticles(hitStopTimer, player, damagePlayer) {
  if (hitStopTimer > 0) return;
  particles = particles.filter(p => {
    p.x += p.vx; p.y += p.vy;
    if (p.isProjectile) p.vy += 0.1;
    else p.vy += 0.05;
    p.life--;

    if (p.isProjectile && p.damage) {
      const pb = { x: p.x - p.size, y: p.y - p.size, w: p.size * 2, h: p.size * 2 };
      if (p.isPlayerArrow) {
        if (getEntitiesFn && damageEnemyFn) {
          const ents = getEntitiesFn();
          let hitSomething = false;
          for (let i = 0; i < ents.length; i++) {
            const e = ents[i];
            if (e.type === 'enemy' && e.alive && rectsOverlapCheck(e, pb)) {
              let dmg = p.damage;
              if (e.staggered) dmg = Math.floor(dmg * 1.5);
              damageEnemyFn(e, dmg, ents);
              hitSomething = true;
              break;
            }
          }
          if (hitSomething) return false;
        }
        if (getBossActiveFn && getBossFn && damageBossFn) {
          const boss = getBossFn();
          const bossActive = getBossActiveFn();
          if (bossActive && boss && boss.alive && boss.invincible <= 0 && rectsOverlapCheck(boss, pb)) {
            let dmg = p.damage;
            if (boss.staggered) dmg = Math.floor(dmg * 1.5);
            damageBossFn(boss, dmg);
            return false;
          }
        }
      } else {
        if (player.invincible <= 0 && rectsOverlapCheck(player, pb)) {
          damagePlayer(p.damage);
          return false;
        }
      }
    }
    return p.life > 0;
  });
  floatingTexts = floatingTexts.filter(ft => {
    ft.y += ft.vy;
    ft.life--;
    return ft.life > 0;
  });

  // Also update 3D particles
  updateParticles3D(hitStopTimer, player, damagePlayer);
}

function rectsOverlapCheck(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function clearParticles() {
  particles = [];
  floatingTexts = [];
  clearCombatParticles();
}
