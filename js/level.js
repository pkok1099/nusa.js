// ============================================================
// level.js — Level generation and tile map management
// ============================================================

import { TILE, LEVEL_H } from './config.js';

export const levelData = [
  {
    name: 'Candi Borobudur',
    subtitle: 'Bangkit dari Debu Waktu',
    bg1: '#0D0A1A', bg2: '#1A0A2E',
    artifact: 'Artefak Tanah',
    width: 80, height: 20,
  },
];

export function generateLevel1() {
  const W = 80, H = 20;
  const map = [];
  for (let y = 0; y < H; y++) {
    map[y] = [];
    for (let x = 0; x < W; x++) {
      if (y >= H - 2) { map[y][x] = 1; continue; }
      if (x === 0 || x === W - 1) { map[y][x] = 1; continue; }
      if (y === H - 3 && (x < 5 || x > W - 6)) { map[y][x] = 1; continue; }
      map[y][x] = 0;
    }
  }

  // Section 1: Entrance area
  fillRect(map, 0, H - 3, 15, 2, 1);
  fillRect(map, 5, H - 5, 3, 1, 2);
  fillRect(map, 10, H - 6, 4, 1, 2);
  fillRect(map, 16, H - 3, 20, 2, 1);
  for (let i = 0; i < 4; i++) fillRect(map, 18 + i, H - 4 - i, 2, 1, 1);
  fillRect(map, 22, H - 8, 6, 1, 2);
  fillRect(map, 22, H - 8, 1, 5, 1);
  fillRect(map, 27, H - 8, 1, 5, 1);

  // Section 2: Candi interior
  fillRect(map, 30, H - 3, 22, 2, 1);
  fillRect(map, 30, H - 3, 1, 8, 1);
  fillRect(map, 30, H - 8, 3, 1, 1);
  fillRect(map, 35, H - 6, 3, 1, 2);
  fillRect(map, 40, H - 8, 3, 1, 2);
  fillRect(map, 44, H - 10, 3, 1, 2);
  fillRect(map, 33, H - 4, 1, 1, 1);
  fillRect(map, 38, H - 4, 1, 1, 1);
  fillRect(map, 43, H - 4, 1, 1, 1);

  // Section 3: Puzzle room
  fillRect(map, 52, H - 3, 15, 2, 1);
  fillRect(map, 52, H - 3, 1, 8, 1);
  fillRect(map, 52, H - 10, 4, 1, 1);
  fillRect(map, 55, H - 7, 3, 1, 2);
  fillRect(map, 59, H - 9, 3, 1, 2);
  fillRect(map, 63, H - 6, 3, 1, 2);

  // Section 4: Boss arena
  fillRect(map, 67, H - 3, 13, 2, 1);
  fillRect(map, 67, H - 3, 1, 10, 1);
  fillRect(map, 79, H - 3, 1, 10, 1);
  fillRect(map, 70, H - 7, 2, 1, 2);
  fillRect(map, 76, H - 7, 2, 1, 2);

  // Checkpoints
  map[H - 4][28] = 9;
  map[H - 4][50] = 9;

  return map;
}

export function fillRect(map, sx, sy, w, h, tile) {
  for (let y = sy; y < sy + h && y < map.length; y++)
    for (let x = sx; x < sx + w && x < map[0].length; x++)
      if (y >= 0 && x >= 0) map[y][x] = tile;
}
