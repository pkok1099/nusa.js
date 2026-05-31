// ============================================================
// camera.js — 3D Camera System with lock-on targeting
// Phase 3: PerspectiveCamera, smooth follow, lock-on, collision
// ============================================================

import * as THREE from 'three';
import {
  GAME_W, GAME_H, TILE,
  CAMERA_FOV, CAMERA_NEAR, CAMERA_FAR, CAMERA_DISTANCE,
  CAMERA_PITCH, CAMERA_HEIGHT_OFFSET,
  CAMERA_FOLLOW_SPEED, CAMERA_LOCKON_FOLLOW_SPEED, CAMERA_PREDICTION,
  LOCKON_RANGE, LOCKON_SWITCH_ANGLE, LOCKON_BREAK_DISTANCE, LOCKON_DEAD_ZONE,
  CAMERA_COLLISION_MARGIN, CAMERA_MIN_DISTANCE, CAMERA_COLLISION_SAMPLES,
  CAMERA_SHAKE_DECAY, CAMERA_SHAKE_OFFSET_MULT,
} from './config.js';

// ============================================================
// PUBLIC STATE
// ============================================================

/** Camera object — backward-compatible 2D position + 3D properties */
export const camera = {
  // 2D position (game coords) — used by draw-game.js tile visibility
  x: 0,
  y: 0,
  // 3D state — used by renderer.js
  focusX: 0,        // Game-space focus X (center of view)
  focusY: 0,        // Game-space focus Y (center of view)
  distance: CAMERA_DISTANCE,
  pitch: CAMERA_PITCH,
  shakeX: 0,
  shakeY: 0,
};

/** Lock-on state */
export const lockOn = {
  active: false,
  target: null,      // Reference to locked entity { x, y, w, h, alive, ... }
  targetType: '',    // 'enemy' | 'boss'
  targetIndex: -1,   // Index in entities array (for enemies)
  candidates: [],    // All lock-on-able entities in range
};

// ---- Internal state ----
let cam3D = null;             // THREE.PerspectiveCamera (created by initCamera3D)
let smoothFocusX = 0;
let smoothFocusY = 0;
let smoothDistance = CAMERA_DISTANCE;

// ============================================================
// INITIALIZATION
// ============================================================

/** Create and return a PerspectiveCamera */
export function initCamera3D() {
  const aspect = GAME_W / GAME_H;
  cam3D = new THREE.PerspectiveCamera(CAMERA_FOV, aspect, CAMERA_NEAR, CAMERA_FAR);

  // Initial position: center of game world, at default distance
  cam3D.position.set(GAME_W / 2, -(GAME_H / 2), CAMERA_DISTANCE);
  cam3D.lookAt(GAME_W / 2, -GAME_H / 2, 0);

  return cam3D;
}

/** Get the Three.js PerspectiveCamera */
export function getCamera3D() { return cam3D; }

// ============================================================
// COORDINATE CONVERSION
// ============================================================

/** Convert game-space position to Three.js world-space */
function gameToThree(gx, gy) {
  return { x: gx, y: -gy };
}

// ============================================================
// LOCK-ON TARGETING
// ============================================================

/**
 * Find all lock-on candidates within range of the player.
 * @param {Object} player — Player entity
 * @param {Array} entities — All game entities
 * @param {Object|null} boss — Boss entity
 * @param {boolean} bossActive — Whether boss fight is active
 */
function findLockOnCandidates(player, entities, boss, bossActive) {
  const pcx = player.x + player.w / 2;
  const pcy = player.y + player.h / 2;
  const candidates = [];

  // Check enemies
  if (entities) {
    entities.forEach((e, idx) => {
      if (e.type !== 'enemy' || !e.alive) return;
      const ecx = e.x + e.w / 2;
      const ecy = e.y + e.h / 2;
      const dist = Math.hypot(pcx - ecx, pcy - ecy);
      if (dist <= LOCKON_RANGE) {
        candidates.push({
          entity: e,
          type: 'enemy',
          index: idx,
          dist,
          angle: Math.atan2(ecy - pcy, ecx - pcx),
        });
      }
    });
  }

  // Check boss
  if (boss && boss.alive && bossActive) {
    const bcx = boss.x + boss.w / 2;
    const bcy = boss.y + boss.h / 2;
    const dist = Math.hypot(pcx - bcx, pcy - bcy);
    if (dist <= LOCKON_RANGE) {
      candidates.push({
        entity: boss,
        type: 'boss',
        index: -1,
        dist,
        angle: Math.atan2(bcy - pcy, bcx - pcx),
      });
    }
  }

  // Sort by distance (nearest first)
  candidates.sort((a, b) => a.dist - b.dist);
  return candidates;
}

/**
 * Toggle lock-on targeting.
 * - If not locked on: lock onto nearest enemy.
 * - If locked on: release lock.
 */
export function toggleLockOn(player, entities, boss, bossActive) {
  if (lockOn.active) {
    releaseLockOn();
    return;
  }

  const candidates = findLockOnCandidates(player, entities, boss, bossActive);
  if (candidates.length === 0) return;

  lockOn.candidates = candidates;
  lockOn.active = true;
  lockOn.target = candidates[0].entity;
  lockOn.targetType = candidates[0].type;
  lockOn.targetIndex = candidates[0].index;
}

/** Release lock-on */
export function releaseLockOn() {
  lockOn.active = false;
  lockOn.target = null;
  lockOn.targetType = '';
  lockOn.targetIndex = -1;
  lockOn.candidates = [];
}

/**
 * Switch lock-on target to the next candidate (based on angle from player).
 * @param {number} direction — 1 for clockwise, -1 for counter-clockwise
 */
export function switchLockOnTarget(player, entities, boss, bossActive, direction = 1) {
  if (!lockOn.active) return;

  const candidates = findLockOnCandidates(player, entities, boss, bossActive);
  if (candidates.length <= 1) return;

  lockOn.candidates = candidates;

  // Find current target angle
  const pcx = player.x + player.w / 2;
  const pcy = player.y + player.h / 2;
  const currentAngle = Math.atan2(
    (lockOn.target.y + lockOn.target.h / 2) - pcy,
    (lockOn.target.x + lockOn.target.w / 2) - pcx
  );

  // Find the nearest candidate in the switch direction
  let bestCandidate = null;
  let bestAngleDiff = Infinity;

  for (const c of candidates) {
    if (c.entity === lockOn.target) continue;
    let angleDiff = c.angle - currentAngle;
    // Normalize to [-PI, PI]
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    // Check direction
    if (direction > 0 && angleDiff > 0 && angleDiff < bestAngleDiff) {
      bestAngleDiff = angleDiff;
      bestCandidate = c;
    } else if (direction < 0 && angleDiff < 0 && Math.abs(angleDiff) < bestAngleDiff) {
      bestAngleDiff = Math.abs(angleDiff);
      bestCandidate = c;
    }
  }

  // If no candidate found in the preferred direction, wrap around
  if (!bestCandidate && candidates.length > 1) {
    const idx = candidates.findIndex(c => c.entity === lockOn.target);
    const nextIdx = (idx + direction + candidates.length) % candidates.length;
    bestCandidate = candidates[nextIdx];
  }

  if (bestCandidate) {
    lockOn.target = bestCandidate.entity;
    lockOn.targetType = bestCandidate.type;
    lockOn.targetIndex = bestCandidate.index;
  }
}

// ============================================================
// CAMERA COLLISION
// ============================================================

/**
 * Check if a line from focus to desired camera position passes through solid tiles.
 * Returns the adjusted (closer) distance if collision detected.
 * @param {number} fx — Focus X in game coords
 * @param {number} fy — Focus Y in game coords
 * @param {number} desiredDist — Desired camera distance
 * @param {Array} tileMap — The level tile map
 */
function checkCameraCollision(fx, fy, desiredDist, tileMap) {
  if (!tileMap || tileMap.length === 0) return desiredDist;

  // Camera is always in front of the game plane (positive Z in Three.js),
  // so collision only matters for X/Y displacement from focus.
  // For a 2.5D side-scroller, the camera doesn't move behind walls
  // because it's always facing the game plane from the front.
  // The main collision case is when the camera's look-at point
  // is near a wall edge and the camera tries to see past it.

  // Simple approach: check if focus point is too close to wall edges
  // For Phase 3, we keep camera collision minimal — the camera
  // stays at a fixed Z distance and only moves in X/Y.
  // Camera collision will be fully implemented when we add 3D level geometry.

  return desiredDist;
}

// ============================================================
// MAIN CAMERA UPDATE
// ============================================================

/**
 * Update camera position for the current frame.
 * Called from fixedStep() at 60Hz.
 *
 * @param {Object} player — Player entity
 * @param {Array} tileMap — Current level tile map
 * @param {Array} entities — All game entities (for lock-on)
 * @param {Object|null} boss — Boss entity
 * @param {boolean} bossActive — Whether boss fight is active
 */
export function updateCamera(player, tileMap, entities, boss, bossActive) {
  if (!cam3D) return;

  // ---- Validate lock-on ----
  if (lockOn.active) {
    // Check if target is still alive
    if (!lockOn.target || !lockOn.target.alive) {
      releaseLockOn();
    } else {
      // Check if target is too far away
      const pcx = player.x + player.w / 2;
      const pcy = player.y + player.h / 2;
      const tcx = lockOn.target.x + lockOn.target.w / 2;
      const tcy = lockOn.target.y + lockOn.target.h / 2;
      const dist = Math.hypot(pcx - tcx, pcy - tcy);
      if (dist > LOCKON_BREAK_DISTANCE) {
        releaseLockOn();
      }
    }

    // If still locked, try to switch to nearest alive candidate
    if (lockOn.active && !lockOn.target.alive) {
      releaseLockOn();
    }
  }

  // ---- Compute target focus point ----
  const pcx = player.x + player.w / 2;
  const pcy = player.y + player.h / 2;

  let targetFocusX = pcx;
  let targetFocusY = pcy;

  if (lockOn.active && lockOn.target && lockOn.target.alive) {
    // Lock-on: focus on midpoint between player and target
    const tcx = lockOn.target.x + lockOn.target.w / 2;
    const tcy = lockOn.target.y + lockOn.target.h / 2;

    // Weighted midpoint — camera focuses more on the player,
    // but includes the target in view
    const dx = tcx - pcx;
    const dy = tcy - pcy;
    const dist = Math.hypot(dx, dy);

    // Pull camera toward midpoint, but don't move too far from player
    const maxShift = GAME_W * 0.2; // Don't shift more than 20% of screen width
    const shiftFactor = Math.min(0.3, maxShift / Math.max(1, dist));
    targetFocusX = pcx + dx * shiftFactor;
    targetFocusY = pcy + dy * shiftFactor;
  } else {
    // Normal follow: add look-ahead based on player velocity
    targetFocusX = pcx + player.vx * CAMERA_PREDICTION;
    targetFocusY = pcy + player.vy * CAMERA_PREDICTION * 0.5; // Less Y prediction
  }

  // ---- Smooth follow ----
  const followSpeed = lockOn.active ? CAMERA_LOCKON_FOLLOW_SPEED : CAMERA_FOLLOW_SPEED;
  smoothFocusX += (targetFocusX - smoothFocusX) * followSpeed;
  smoothFocusY += (targetFocusY - smoothFocusY) * followSpeed;

  // ---- Clamp to map bounds ----
  if (tileMap && tileMap.length > 0) {
    const mapW = tileMap[0].length * TILE;
    const mapH = tileMap.length * TILE;

    // Compute visible area based on camera distance and FOV
    const vFov = CAMERA_FOV * Math.PI / 180;
    const visibleH = 2 * smoothDistance * Math.tan(vFov / 2);
    const visibleW = visibleH * (GAME_W / GAME_H);

    // Clamp focus so camera doesn't show beyond map edges
    const halfVisW = visibleW / 2;
    const halfVisH = visibleH / 2;
    smoothFocusX = Math.max(halfVisW, Math.min(mapW - halfVisW, smoothFocusX));
    smoothFocusY = Math.max(halfVisH, Math.min(mapH - halfVisH, smoothFocusY));
  }

  // ---- Update camera 2D position (backward compat) ----
  // These are used by draw-game.js for tile visibility culling
  const vFov = CAMERA_FOV * Math.PI / 180;
  const visibleH = 2 * smoothDistance * Math.tan(vFov / 2);
  const visibleW = visibleH * (GAME_W / GAME_H);
  camera.x = smoothFocusX - visibleW / 2;
  camera.y = smoothFocusY - visibleH / 2;

  // ---- Update 3D camera properties ----
  camera.focusX = smoothFocusX;
  camera.focusY = smoothFocusY;
  camera.distance = smoothDistance;

  // ---- Position Three.js camera ----
  const focusThree = gameToThree(smoothFocusX, smoothFocusY);

  // Camera position: in front of and slightly above the focus point
  // Z = camera distance (looking at the game plane from the front)
  // Y = slightly above (pitch offset)
  const heightOffset = CAMERA_HEIGHT_OFFSET;
  const pitchAngle = CAMERA_PITCH;

  cam3D.position.set(
    focusThree.x + camera.shakeX,
    focusThree.y + heightOffset + camera.shakeY + Math.sin(pitchAngle) * smoothDistance * 0.01,
    smoothDistance
  );

  // Look-at point: the focus position on the game plane (Z=0)
  cam3D.lookAt(
    focusThree.x + camera.shakeX * 0.5,
    focusThree.y + camera.shakeY * 0.5,
    0
  );

  cam3D.updateProjectionMatrix();

  // ---- Decay camera shake ----
  camera.shakeX *= CAMERA_SHAKE_DECAY;
  camera.shakeY *= CAMERA_SHAKE_DECAY;
  if (Math.abs(camera.shakeX) < 0.1) camera.shakeX = 0;
  if (Math.abs(camera.shakeY) < 0.1) camera.shakeY = 0;
}

// ============================================================
// CAMERA EFFECTS
// ============================================================

/** Set camera shake offset (called from renderer's setShakeOffset) */
export function setCameraShake(x, y) {
  camera.shakeX = x * CAMERA_SHAKE_OFFSET_MULT;
  camera.shakeY = -y * CAMERA_SHAKE_OFFSET_MULT; // Flip Y for Three.js
}

/** Reset camera to initial position (called on map load) */
export function resetCamera(playerX, playerY) {
  smoothFocusX = playerX;
  smoothFocusY = playerY;
  camera.x = playerX - GAME_W / 2;
  camera.y = playerY - GAME_H / 2;
  camera.shakeX = 0;
  camera.shakeY = 0;
  releaseLockOn();
}

/** Resize camera aspect ratio */
export function resizeCamera() {
  if (!cam3D) return;
  cam3D.aspect = GAME_W / GAME_H;
  cam3D.updateProjectionMatrix();
}
