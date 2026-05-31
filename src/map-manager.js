// ============================================================
// map-manager.js — Map loading, transitions, and progress
// ============================================================

import { MAP_DATA as map1Data, generateMap as genMap1, spawnEntities as spawnMap1 } from './maps/map1.js';
import { MAP_DATA as map2Data, generateMap as genMap2, spawnEntities as spawnMap2 } from './maps/map2.js';
import { MAP_DATA as map3Data, generateMap as genMap3, spawnEntities as spawnMap3 } from './maps/map3.js';
import { MAP_DATA as map4Data, generateMap as genMap4, spawnEntities as spawnMap4 } from './maps/map4.js';
import { MAP_DATA as map5Data, generateMap as genMap5, spawnEntities as spawnMap5 } from './maps/map5.js';
import { TILE } from './config.js';
import { fillRect } from './level.js';
import { setTileMap } from './physics.js';
import { createBoss } from './entities.js';

// ---- Map Registry ----
export const MAP_REGISTRY = [map1Data, map2Data, map3Data, map4Data, map5Data];

// ---- Map generators (indexed by mapId) ----
const GENERATORS = [genMap1, genMap2, genMap3, genMap4, genMap5];

// ---- Entity spawners (indexed by mapId) ----
const SPAWNERS = [spawnMap1, spawnMap2, spawnMap3, spawnMap4, spawnMap5];

// ---- Progress tracking ----
export let currentMapId = 0;
export let clearedMaps = [false, false, false, false, false];
export let unlockedMaps = [true, false, false, false, false];
export let solvedPuzzles = new Set();

// ---- Map loading ----
export function loadMap(mapId) {
  const id = mapId || 0;
  const MAP_DATA = MAP_REGISTRY[id];
  const generateMap = GENERATORS[id];
  const spawnEntities = SPAWNERS[id];

  // Generate tile map using the map's generator with fillRect
  const tileMap = generateMap(fillRect);

  // Register tile map with physics system
  setTileMap(tileMap);

  // Spawn entities — map files return { enemies, items, npcs, puzzleTriggers }
  const H = MAP_DATA.height;
  const spawned = spawnEntities(H);

  // Flatten all entity categories into a single array
  const entities = [
    ...spawned.enemies,
    ...spawned.items,
    ...spawned.npcs,
    ...spawned.puzzleTriggers,
  ];

  // Create boss (dormant — alive=false until summoned at altar)
  const boss = createBoss(MAP_DATA.bossSummonX, MAP_DATA.bossSummonY, id);
  boss.alive = false;

  // Update current map tracking
  currentMapId = id;

  return { tileMap, entities, boss };
}

// ---- Boss summon mechanic ----
export function summonBoss(boss, mapId) {
  const MAP_DATA = MAP_REGISTRY[mapId];
  boss.alive = true;
  boss.hp = boss.maxHp;
  boss.posture = 0;
  boss.staggered = false;
  boss.staggerTimer = 0;
  boss.phase = 1;
  boss.phase2Transitioned = false;
  boss.attackTimer = 0;
  boss.attackPattern = 0;
  boss.hurtTimer = 0;
  boss.invincible = 0;
  boss.recoveryTimer = 0;
  boss.comboHits = 0;
  boss.comboHitTimer = 0;
  // Position boss at altar location
  boss.x = MAP_DATA.bossSummonX * TILE;
  boss.y = MAP_DATA.bossSummonY * TILE;
  return boss;
}

// ---- Boss / door state queries ----
export function isBossDefeated(mapId) {
  return clearedMaps[mapId] === true;
}

export function isDoorOpen(mapId) {
  // Exit door is open if the boss for this map has been defeated
  return clearedMaps[mapId] === true;
}

// ---- Map data accessor ----
export function getMapData(mapId) {
  return MAP_REGISTRY[mapId];
}

// ---- Progress tracking ----
export function markBossDefeated(mapId) {
  clearedMaps[mapId] = true;
  // Unlock the next map (if not the last one)
  if (mapId + 1 < unlockedMaps.length) {
    unlockedMaps[mapId + 1] = true;
  }
}

export function markPuzzleSolved(puzzleId) {
  solvedPuzzles.add(puzzleId);
}

export function isPuzzleSolved(puzzleId) {
  return solvedPuzzles.has(puzzleId);
}

// ---- Position helpers (return pixel coordinates) ----
export function getBossAltarPosition(mapId) {
  const MAP_DATA = MAP_REGISTRY[mapId];
  if (!MAP_DATA || !MAP_DATA.bossAltar) return { x: 0, y: 0 };
  return {
    x: MAP_DATA.bossAltar.x * TILE,
    y: MAP_DATA.bossAltar.y * TILE,
  };
}

export function getExitDoorPosition(mapId) {
  const MAP_DATA = MAP_REGISTRY[mapId];
  if (!MAP_DATA || !MAP_DATA.exitDoor) return { x: 0, y: 0 };
  return {
    x: MAP_DATA.exitDoor.x * TILE,
    y: MAP_DATA.exitDoor.y * TILE,
  };
}

// ---- Reset all progress ----
export function resetProgress() {
  currentMapId = 0;
  clearedMaps = [false, false, false, false, false];
  unlockedMaps = [true, false, false, false, false];
  solvedPuzzles = new Set();
}
