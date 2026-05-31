// ============================================================
// level.js — Level generation and tile map management
// ============================================================

import { generateMap as genMap1 } from './maps/map1.js';
import { generateMap as genMap2 } from './maps/map2.js';
import { generateMap as genMap3 } from './maps/map3.js';
import { generateMap as genMap4 } from './maps/map4.js';
import { generateMap as genMap5 } from './maps/map5.js';

export function fillRect(map, sx, sy, w, h, tile) {
  for (let y = sy; y < sy + h && y < map.length; y++)
    for (let x = sx; x < sx + w && x < map[0].length; x++)
      if (y >= 0 && x >= 0) map[y][x] = tile;
}

// Main level generator — dispatches by stageId to map generators
export function generateLevel(stageId) {
  const sid = stageId || 0;
  switch (sid) {
    case 0: return genMap1(fillRect);
    case 1: return genMap2(fillRect);
    case 2: return genMap3(fillRect);
    case 3: return genMap4(fillRect);
    case 4: return genMap5(fillRect);
    default: return genMap1(fillRect);
  }
}
