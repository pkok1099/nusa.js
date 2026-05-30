// ============================================================
// physics.js — Collision detection and tile physics
// ============================================================

import { TILE } from './config.js';

let tileMap = [];

export function setTileMap(map) { tileMap = map; }
export function getTileMap() { return tileMap; }

export function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// Solid tiles: 1 (stone), 3 (lava - solid but damaging), 5 (tree trunk), 7 (wall)
// One-way platforms: 2, 6 (vine platform)
// Non-solid: 0 (air), 4 (water), 8 (decoration), 9 (checkpoint)
export function tileCollision(x, y, w, h, previousY) {
  if (!tileMap || tileMap.length === 0 || !tileMap[0] || tileMap[0].length === 0) return [];
  const checks = [];
  const left = Math.floor(x / TILE);
  const right = Math.floor((x + w - 1) / TILE);
  const top = Math.floor(y / TILE);
  const bottom = Math.floor((y + h - 1) / TILE);
  for (let ty = top; ty <= bottom; ty++) {
    for (let tx = left; tx <= right; tx++) {
      if (ty >= 0 && ty < tileMap.length && tx >= 0 && tx < tileMap[0].length) {
        const tile = tileMap[ty][tx];
        // Solid tiles: 1, 3 (lava), 5 (tree), 7
        if (tile === 1 || tile === 3 || tile === 5 || tile === 7) {
          checks.push({ x: tx * TILE, y: ty * TILE, w: TILE, h: TILE, tx, ty, tileType: tile });
        }
        // One-way platforms: 2, 6 (vine)
        else if (tile === 2 || tile === 6) {
          const prevBottom = previousY !== undefined ? previousY + h : y + h;
          const platTop = ty * TILE;
          if (prevBottom <= platTop + 4 && y + h > platTop) {
            checks.push({ x: tx * TILE, y: ty * TILE, w: TILE, h: TILE / 2, tx, ty, oneway: true, tileType: tile });
          }
        }
      }
    }
  }
  return checks;
}

export function isSolid(tx, ty) {
  if (!tileMap || tileMap.length === 0) return true;
  if (ty < 0) return false;
  if (ty >= tileMap.length || tx < 0 || tx >= tileMap[0].length) return true;
  const t = tileMap[ty][tx];
  return t === 1 || t === 3 || t === 5 || t === 7;
}

// Check if a specific tile is hazardous (lava, water)
export function getTileType(tx, ty) {
  if (!tileMap || tileMap.length === 0) return 0;
  if (ty < 0 || ty >= tileMap.length || tx < 0 || tx >= tileMap[0].length) return 0;
  return tileMap[ty][tx];
}
