// ============================================================
// combat-physics.js — High-level combat collision system
// Bridges Rapier physics with game combat mechanics.
//
// ARCHITECTURE: Shadow-body pattern
// - Game entities (player, enemies, boss) are managed by game logic
// - Rapier bodies MIRROR entity positions for collision queries
// - Combat collision (hitbox/hurtbox) uses Rapier intersection events
// - Tile collision still uses manual AABB (efficient for tilemaps)
// - Movement is NOT driven by Rapier (kinematic bodies, manual resolution)
//
// PHASE 2 SCOPE:
// - Player hurtbox with i-frames during dodge
// - Enemy hurtboxes
// - Player hitbox during attack frames
// - Enemy hitboxes during attack frames
// - Boss hitboxes during attack frames
// - Collision event processing → damage application
// ============================================================

import {
  registerEntity, unregisterEntity, unregisterAllEntities,
  syncEntityPosition, enableHitbox, disableHitbox,
  setHurtboxEnabled, isHitboxActive, isEntityRegistered,
  createTileColliders, removeTileColliders,
  stepWorld, drainCollisionEvents, getEntityData,
  isRapierReady,
} from './rapier-world.js';
import { DODGE_I_FRAMES, DODGE_I_FRAME_START, DODGE_DURATION, ATTACK_RANGE } from './config.js';

// ---- Combat state ----
let playerIframeTimer = 0;  // Frames remaining of i-frames
let combatLog = [];          // Recent combat events for debugging

// ============================================================
// PLAYER COMBAT PHYSICS
// ============================================================

/**
 * Register the player entity in the combat physics system.
 * Called once at game start / map load.
 */
export function registerPlayer() {
  if (!isRapierReady()) return;
  unregisterEntity('player');
  // Player body registered with default size; will be synced each frame
  registerEntity('player', 0, 0, 24, 36, { isPlayer: true });
}

/**
 * Sync player position to Rapier body each frame.
 * Called after player movement is resolved.
 */
export function syncPlayer(px, py) {
  syncEntityPosition('player', px, py);
}

/**
 * Handle player dodge i-frames.
 * Call this each frame during gameplay.
 *
 * @param {object} player — Player game object
 * @returns {boolean} Whether player is currently in i-frames
 */
export function updatePlayerIframes(player) {
  // Check if player is dodging
  if (player.dodging) {
    const dodgeFrame = DODGE_DURATION - player.dodgeTimer;
    if (dodgeFrame >= DODGE_I_FRAME_START && dodgeFrame < DODGE_I_FRAME_START + DODGE_I_FRAMES) {
      // Within i-frame window — disable hurtbox
      setHurtboxEnabled('player', false);
      playerIframeTimer = DODGE_I_FRAMES - (dodgeFrame - DODGE_I_FRAME_START);
      return true;
    }
  }

  // Check invincibility from taking damage (INV_FRAMES)
  if (player.invincible > 0) {
    setHurtboxEnabled('player', false);
    playerIframeTimer = player.invincible;
    return true;
  }

  // Not in i-frames — re-enable hurtbox
  if (playerIframeTimer > 0) {
    playerIframeTimer--;
    if (playerIframeTimer <= 0) {
      setHurtboxEnabled('player', true);
    }
  }

  return playerIframeTimer > 0;
}

/**
 * Activate player hitbox during attack frames.
 * Called when player attacks (light combo, heavy, visceral, weapon art).
 *
 * @param {object} player — Player game object
 * @param {number} facing — 1 = right, -1 = left
 * @param {string} attackType — 'light', 'heavy', 'visceral', 'weaponArt', 'skill'
 */
export function activatePlayerHitbox(player, facing, attackType = 'light') {
  if (!isRapierReady()) return;

  // Hitbox offset and size depends on attack type
  let offsetX, offsetY, width, height;

  switch (attackType) {
    case 'light':
      offsetX = facing * 20;
      offsetY = 0;
      width = ATTACK_RANGE;
      height = player.h;
      break;
    case 'heavy':
      offsetX = facing * 15;
      offsetY = -5;
      width = ATTACK_RANGE + 10;
      height = player.h + 10;
      break;
    case 'visceral':
      offsetX = facing * 15;
      offsetY = 0;
      width = 60;
      height = player.h + 10;
      break;
    case 'weaponArt':
    case 'skill':
      offsetX = 0;
      offsetY = -10;
      width = ATTACK_RANGE + 40;
      height = player.h + 20;
      break;
    default:
      offsetX = facing * 20;
      offsetY = 0;
      width = ATTACK_RANGE;
      height = player.h;
  }

  enableHitbox('player', { offsetX, offsetY, width, height });
}

/**
 * Deactivate player hitbox after attack.
 */
export function deactivatePlayerHitbox() {
  disableHitbox('player');
}

// ============================================================
// ENEMY COMBAT PHYSICS
// ============================================================

/**
 * Register an enemy entity in the combat physics system.
 * @param {number} idx — Enemy index in entities array
 * @param {number} x — Game X position
 * @param {number} y — Game Y position
 * @param {number} w — Width
 * @param {number} h — Height
 */
export function registerEnemy(idx, x, y, w, h) {
  if (!isRapierReady()) return;
  const key = `enemy_${idx}`;
  unregisterEntity(key);
  registerEntity(key, x, y, w, h, { isEnemy: true });
}

/**
 * Sync enemy position to Rapier body.
 */
export function syncEnemy(idx, x, y) {
  syncEntityPosition(`enemy_${idx}`, x, y);
}

/**
 * Activate enemy hitbox during attack frames.
 */
export function activateEnemyHitbox(idx, enemy, facing) {
  if (!isRapierReady()) return;
  const key = `enemy_${idx}`;
  enableHitbox(key, {
    offsetX: facing * 15,
    offsetY: 0,
    width: enemy.w + 20,
    height: enemy.h,
  });
}

/**
 * Deactivate enemy hitbox.
 */
export function deactivateEnemyHitbox(idx) {
  disableHitbox(`enemy_${idx}`);
}

/**
 * Unregister an enemy from combat physics.
 */
export function unregisterEnemy(idx) {
  unregisterEntity(`enemy_${idx}`);
}

// ============================================================
// BOSS COMBAT PHYSICS
// ============================================================

/**
 * Register the boss entity.
 */
export function registerBoss(x, y, w, h) {
  if (!isRapierReady()) return;
  unregisterEntity('boss');
  registerEntity('boss', x, y, w, h, { isBoss: true, isEnemy: true });
}

/**
 * Sync boss position.
 */
export function syncBoss(x, y) {
  syncEntityPosition('boss', x, y);
}

/**
 * Activate boss hitbox during attack frames.
 */
export function activateBossHitbox(boss, facing) {
  if (!isRapierReady()) return;
  enableHitbox('boss', {
    offsetX: facing * 20,
    offsetY: 0,
    width: boss.w + 30,
    height: boss.h + 10,
  });
}

/**
 * Deactivate boss hitbox.
 */
export function deactivateBossHitbox() {
  disableHitbox('boss');
}

// ============================================================
// MAP LOAD / UNLOAD
// ============================================================

/**
 * Set up tile colliders when a new map is loaded.
 * @param {Array} tileMap — 2D tile array
 */
export function onMapLoad(tileMap) {
  if (!isRapierReady()) return;
  createTileColliders(tileMap);
}

/**
 * Clean up all combat physics when leaving a map.
 */
export function onMapUnload() {
  if (!isRapierReady()) return;
  removeTileColliders();
  unregisterAllEntities();
}

// ============================================================
// FRAME UPDATE — Sync all entities + process collisions
// ============================================================

/**
 * Update combat physics for one frame.
 * Called from the fixed timestep loop in game.js.
 *
 * @param {object} player — Player game object
 * @param {Array} entities — All game entities
 * @param {object|null} boss — Boss game object
 * @param {boolean} bossActive — Whether boss fight is active
 * @returns {Array} Collision events from this frame
 */
export function updateCombatPhysics(player, entities, boss, bossActive) {
  if (!isRapierReady()) return [];

  // ---- Sync positions ----
  // Player
  if (isEntityRegistered('player')) {
    syncPlayer(player.x, player.y);
  }

  // Enemies
  entities.forEach((e, idx) => {
    if (e.type === 'enemy' && e.alive) {
      const key = `enemy_${idx}`;
      if (!isEntityRegistered(key)) {
        registerEnemy(idx, e.x, e.y, e.w, e.h);
      }
      syncEnemy(idx, e.x, e.y);
    }
  });

  // Boss
  if (boss && boss.alive && bossActive) {
    if (!isEntityRegistered('boss')) {
      registerBoss(boss.x, boss.y, boss.w, boss.h);
    }
    syncBoss(boss.x, boss.y);
  }

  // ---- Sync hitbox states from game logic ----
  // Player hitbox: active during attack frames
  if (player.attacking || player.heavyAttacking || player.visceralActive) {
    const attackType = player.visceralActive ? 'visceral' :
      player.heavyAttacking ? 'heavy' : 'light';
    activatePlayerHitbox(player, player.facing, attackType);
  } else {
    deactivatePlayerHitbox();
  }

  // Enemy hitboxes: active during attack frames
  entities.forEach((e, idx) => {
    if (e.type === 'enemy' && e.alive && e.isAttacking) {
      activateEnemyHitbox(idx, e, e.facing);
    } else if (e.type === 'enemy' && e.alive) {
      deactivateEnemyHitbox(idx);
    }
  });

  // Boss hitbox: active during attack/recovery frames
  if (boss && boss.alive && bossActive) {
    if (boss.isAttacking || boss.isTelegraphing) {
      activateBossHitbox(boss, boss.facing);
    } else {
      deactivateBossHitbox();
    }
  }

  // ---- Update i-frames ----
  updatePlayerIframes(player);

  // ---- Step physics world ----
  stepWorld();

  // ---- Collect collision events ----
  const events = drainCollisionEvents();

  // ---- Process collision events ----
  // Convert Rapier collision events into game-level combat events
  const combatEvents = [];

  for (const evt of events) {
    if (evt.type === 'hitbox_hurtbox') {
      const attacker = evt.attacker;
      const victim = evt.victim;

      // Player hitbox → Enemy hurtbox
      if (attacker === 'player' && victim.startsWith('enemy_')) {
        combatEvents.push({
          type: 'player_hit_enemy',
          enemyIdx: parseInt(victim.split('_')[1]),
          isBoss: victim === 'boss',
        });
      }

      // Enemy/Boss hitbox → Player hurtbox
      if (victim === 'player' && (attacker.startsWith('enemy_') || attacker === 'boss')) {
        combatEvents.push({
          type: 'enemy_hit_player',
          attackerKey: attacker,
          isBoss: attacker === 'boss',
          enemyIdx: attacker === 'boss' ? -1 : parseInt(attacker.split('_')[1]),
        });
      }
    }
  }

  return combatEvents;
}

// ============================================================
// FIXED TIMESTEP CONSTANTS
// ============================================================

export const FIXED_DT = 1 / 60;  // 60Hz physics
export const MAX_ACCUMULATOR = 0.1; // Prevent spiral of death

// ============================================================
// CLEANUP
// ============================================================

/** Full cleanup on game shutdown */
export function shutdownCombatPhysics() {
  onMapUnload();
  playerIframeTimer = 0;
  combatLog = [];
}
