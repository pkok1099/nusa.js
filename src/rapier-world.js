// ============================================================
// rapier-world.js — Rapier3D World singleton, initialization,
// and helper functions for the NUSANTARA physics system.
// Phase 2: Shadow-body pattern — Rapier bodies mirror game
// entities for collision detection, NOT movement resolution.
// ============================================================

import RAPIER from '@dimforge/rapier3d-compat';
import { INTERACTION, COLLISION_GROUPS, interactionGroups } from './config.js';

// ---- Rapier World singleton ----
let world = null;
let rapierReady = false;

// ---- Entity body registry ----
// Maps game entity IDs → Rapier RigidBody + Collider handles
const bodies = new Map(); // key: string → { body, hurtbox, hitbox }

// ---- Collision event queue ----
// Filled each physics step with intersection pairs
const collisionEvents = [];

// ============================================================
// INITIALIZATION (async — must be called before game starts)
// ============================================================

export async function initRapier() {
  if (rapierReady) return;

  try {
    await RAPIER.init();
    console.log('[NUSANTARA 3D] Rapier3D initialized successfully');

    // Create physics world with gravity pointing down (Y-down coordinate system)
    // Game uses Y-down, but Rapier uses Y-up. We set gravity to 0 because
    // movement/collision is driven by game logic, not physics simulation.
    // Rapier is used ONLY for collision detection queries.
    const gravity = { x: 0.0, y: 0.0, z: 0.0 };
    world = new RAPIER.World(gravity);

    rapierReady = true;
  } catch (err) {
    console.error('[NUSANTARA 3D] Failed to initialize Rapier3D:', err);
    throw err;
  }
}

export function isRapierReady() { return rapierReady; }
export function getWorld() { return world; }

// ============================================================
// PHYSICS STEP
// ============================================================

/** Step the Rapier world. Called at fixed timestep (60Hz). */
export function stepWorld() {
  if (!world) return;

  // Clear previous collision events
  collisionEvents.length = 0;

  // Step the simulation — this computes all contacts/intersections
  world.step();

  // Query all intersection pairs between hitbox and hurtbox groups
  collectCollisionEvents();
}

// ============================================================
// COLLISION EVENT COLLECTION
// ============================================================

function collectCollisionEvents() {
  if (!world) return;

  // Strategy: for each entity with an active hitbox, check all other entities'
  // hurtboxes for intersection using world.intersectionPairsWith().
  //
  // Rapier 0.14 API:
  //   world.intersectionPairsWith(collider, callback) — iterates all
  //   intersection pairs involving the given collider.
  //
  // Note: both hitbox and hurtbox are sensor colliders. In Rapier 0.14,
  // sensor-sensor intersections ARE detected when collision groups overlap.

  for (const [key, data] of bodies) {
    if (!data.hitboxActive) continue;

    const hitboxCollider = world.getCollider(data.hitbox);
    if (!hitboxCollider) continue;

    // Query intersections with this hitbox collider
    try {
      world.intersectionPairsWith(hitboxCollider, (otherCollider) => {
        const otherHandle = otherCollider.handle;

        // Find which entity owns this other collider (check hurtbox, body collider)
        for (const [otherKey, otherData] of bodies) {
          if (otherKey === key) continue; // Skip self
          if (otherData.hurtbox === otherHandle) {
            collisionEvents.push({
              attacker: key,
              victim: otherKey,
              type: 'hitbox_hurtbox',
            });
            break; // One event per pair per frame
          }
        }
      });
    } catch (err) {
      // Graceful fallback — if intersectionPairsWith fails for any reason,
      // don't crash the game loop. Combat still works via game.js distance checks.
      console.warn('[Rapier] intersectionPairsWith error:', err.message);
    }
  }
}

/** Get and clear collision events from the last physics step */
export function drainCollisionEvents() {
  const events = [...collisionEvents];
  collisionEvents.length = 0;
  return events;
}

// ============================================================
// ENTITY BODY MANAGEMENT
// ============================================================

/**
 * Register a kinematic body for a game entity (player, enemy, boss).
 * Uses "shadow body" pattern: Rapier body mirrors entity position
 * for collision detection, but does NOT drive movement.
 *
 * @param {string} key — Unique identifier (e.g., 'player', 'enemy_0', 'boss')
 * @param {number} x — Game X position (pixels)
 * @param {number} y — Game Y position (pixels)
 * @param {number} w — Width (pixels)
 * @param {number} h — Height (pixels)
 * @param {object} options — { isPlayer, isEnemy, isBoss }
 * @returns {object} Body handle data
 */
export function registerEntity(key, x, y, w, h, options = {}) {
  if (!world) return null;

  // Remove existing body if re-registering
  unregisterEntity(key);

  const halfW = w / 2;
  const halfH = h / 2;

  // Create kinematic rigid body at entity position
  // Game uses Y-down, Rapier uses Y-up. We convert:
  // Rapier X = game X, Rapier Y = -game Y (flipped)
  const rapierX = x + halfW;
  const rapierY = -(y + halfH);
  const rapierZ = 0;

  const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
    .setTranslation(rapierX, rapierY, rapierZ);
  const body = world.createRigidBody(bodyDesc);

  // Determine collision groups based on entity type
  const bodyGroups = options.isPlayer
    ? INTERACTION.PLAYER_BODY
    : INTERACTION.ENEMY_BODY;

  // Create body collider (for entity-entity overlap detection)
  const colliderDesc = RAPIER.ColliderDesc.cuboid(halfW, halfH, 1)
    .setCollisionGroups(bodyGroups)
    .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
  const bodyCollider = world.createCollider(colliderDesc, body);

  // Create hurtbox collider (slightly larger than body)
  // This is the area that can receive damage
  const hurtboxGroups = options.isPlayer
    ? INTERACTION.PLAYER_HURTBOX
    : INTERACTION.ENEMY_HURTBOX;

  const hurtboxDesc = RAPIER.ColliderDesc.cuboid(halfW + 2, halfH + 2, 1)
    .setCollisionGroups(hurtboxGroups)
    .setActiveEvents(RAPIER.ActiveEvents.INTERSECTION_EVENTS)
    .setSensor(true); // Sensor = no physical response, just detection
  const hurtbox = world.createCollider(hurtboxDesc, body);

  // Create hitbox collider (disabled by default)
  // This is the area that deals damage during attacks
  const hitboxGroups = options.isPlayer
    ? INTERACTION.PLAYER_HITBOX
    : INTERACTION.ENEMY_HITBOX;

  const hitboxDesc = RAPIER.ColliderDesc.cuboid(halfW + 10, halfH + 4, 1)
    .setCollisionGroups(hitboxGroups)
    .setActiveEvents(RAPIER.ActiveEvents.INTERSECTION_EVENTS)
    .setSensor(true)
    .setEnabled(false); // Disabled until attack frame
  const hitbox = world.createCollider(hitboxDesc, body);

  const data = {
    body: body.handle,
    bodyCollider: bodyCollider.handle,
    hurtbox: hurtbox.handle,
    hitbox: hitbox.handle,
    hitboxActive: false,
    isPlayer: !!options.isPlayer,
    isEnemy: !!options.isEnemy,
    isBoss: !!options.isBoss,
    width: w,
    height: h,
  };

  bodies.set(key, data);
  return data;
}

/** Unregister an entity from the physics world */
export function unregisterEntity(key) {
  const data = bodies.get(key);
  if (!data || !world) return;

  const body = world.getRigidBody(data.body);
  if (body) {
    world.removeRigidBody(body);
  }

  bodies.delete(key);
}

/** Unregister all entities */
export function unregisterAllEntities() {
  for (const key of bodies.keys()) {
    unregisterEntity(key);
  }
}

// ============================================================
// POSITION SYNC (Shadow body pattern)
// ============================================================

/**
 * Update a Rapier body position to match game entity position.
 * Called each frame after game logic updates entity positions.
 */
export function syncEntityPosition(key, x, y) {
  const data = bodies.get(key);
  if (!data || !world) return;

  const body = world.getRigidBody(data.body);
  if (!body) return;

  const halfW = data.width / 2;
  const halfH = data.height / 2;

  // Convert game coords (Y-down) to Rapier coords (Y-up)
  const rapierX = x + halfW;
  const rapierY = -(y + halfH);
  const rapierZ = 0;

  body.setTranslation({ x: rapierX, y: rapierY, z: rapierZ }, true);
}

// ============================================================
// HITBOX / HURTBOX CONTROL
// ============================================================

/**
 * Enable hitbox for an entity (during attack frames).
 * @param {string} key — Entity key
 * @param {object} options — { offsetX, offsetY, width, height } for hitbox position/size
 */
export function enableHitbox(key, options = {}) {
  const data = bodies.get(key);
  if (!data || !world) return;

  const hitbox = world.getCollider(data.hitbox);
  if (!hitbox) return;

  // Update hitbox size if specified
  if (options.width && options.height) {
    hitbox.setHalfExtents({
      x: options.width / 2,
      y: options.height / 2,
      z: 1,
    });
  }

  // Update hitbox position offset if specified
  if (options.offsetX !== undefined || options.offsetY !== undefined) {
    const ox = options.offsetX || 0;
    const oy = options.offsetY || 0;
    hitbox.setPosition({
      x: ox,
      y: -oy, // Flip Y for Rapier
      z: 0,
    });
  }

  hitbox.setEnabled(true);
  data.hitboxActive = true;
}

/** Disable hitbox for an entity (after attack frames) */
export function disableHitbox(key) {
  const data = bodies.get(key);
  if (!data || !world) return;

  const hitbox = world.getCollider(data.hitbox);
  if (hitbox) {
    hitbox.setEnabled(false);
  }
  data.hitboxActive = false;
}

/**
 * Enable or disable hurtbox (for i-frames during dodge).
 * @param {string} key — Entity key (usually 'player')
 * @param {boolean} enabled — true to enable, false to disable
 */
export function setHurtboxEnabled(key, enabled) {
  const data = bodies.get(key);
  if (!data || !world) return;

  const hurtbox = world.getCollider(data.hurtbox);
  if (!hurtbox) return;

  if (enabled) {
    // Restore normal hurtbox collision groups
    const groups = data.isPlayer
      ? INTERACTION.PLAYER_HURTBOX
      : INTERACTION.ENEMY_HURTBOX;
    hurtbox.setCollisionGroups(groups);
  } else {
    // Disable hurtbox interactions (i-frames!)
    hurtbox.setCollisionGroups(
      data.isPlayer
        ? INTERACTION.PLAYER_HURTBOX_DISABLED
        : interactionGroups(COLLISION_GROUPS.HURTBOX, 0)
    );
  }
}

/**
 * Quick check: is a hitbox currently active for an entity?
 */
export function isHitboxActive(key) {
  const data = bodies.get(key);
  return data ? data.hitboxActive : false;
}

// ============================================================
// TILE COLLIDERS (Environment)
// ============================================================

let tileColliders = [];

/**
 * Create static colliders for all solid tiles in the tilemap.
 * Called when a new map is loaded.
 */
export function createTileColliders(tileMap) {
  // Remove old tile colliders
  removeTileColliders();
  if (!world || !tileMap || tileMap.length === 0) return;

  const H = tileMap.length;
  const W = tileMap[0].length;

  for (let ty = 0; ty < H; ty++) {
    for (let tx = 0; tx < W; tx++) {
      const tile = tileMap[ty][tx];
      if (tile === 0) continue; // Air

      // Only create colliders for solid tiles (1=stone, 3=lava, 5=tree, 7=wall)
      // One-way platforms (2, 6) are handled by game logic, not Rapier
      if (tile !== 1 && tile !== 3 && tile !== 5 && tile !== 7) continue;

      const px = tx * 32 + 16; // Center of tile
      const py = -(ty * 32 + 16); // Flip Y

      const desc = RAPIER.RigidBodyDesc.fixed()
        .setTranslation(px, py, 0);
      const body = world.createRigidBody(desc);

      const colliderDesc = RAPIER.ColliderDesc.cuboid(16, 16, 1)
        .setCollisionGroups(INTERACTION.ENVIRONMENT);
      world.createCollider(colliderDesc, body);

      tileColliders.push(body.handle);
    }
  }
}

/** Remove all tile colliders from the world */
export function removeTileColliders() {
  if (!world) return;

  for (const handle of tileColliders) {
    const body = world.getRigidBody(handle);
    if (body) {
      world.removeRigidBody(body);
    }
  }
  tileColliders = [];
}

// ============================================================
// UTILITY
// ============================================================

/** Get body data for an entity */
export function getEntityData(key) {
  return bodies.get(key);
}

/** Check if entity is registered */
export function isEntityRegistered(key) {
  return bodies.has(key);
}

/** Get total number of registered entities */
export function getEntityCount() {
  return bodies.size;
}

/** Debug: log all registered bodies */
export function debugLogBodies() {
  console.log('[Rapier] Registered bodies:');
  for (const [key, data] of bodies) {
    console.log(`  ${key}: body=${data.body}, hurtbox=${data.hurtbox}, hitbox=${data.hitbox}, hitboxActive=${data.hitboxActive}`);
  }
  console.log(`  Tile colliders: ${tileColliders.length}`);
  console.log(`  Total RigidBodies in world: ${world ? world.bodies.len() : 0}`);
  console.log(`  Total Colliders in world: ${world ? world.colliders.len() : 0}`);
}
