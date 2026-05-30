// ============================================================
// level.js — Level generation and tile map management
// ============================================================

import { TILE, STAGES } from './config.js';

export const levelData = STAGES.map(s => ({
  name: s.name,
  subtitle: s.subtitle,
  bg1: s.bg1, bg2: s.bg2,
  artifact: s.artifact,
  width: s.width, height: s.height,
}));

export function fillRect(map, sx, sy, w, h, tile) {
  for (let y = sy; y < sy + h && y < map.length; y++)
    for (let x = sx; x < sx + w && x < map[0].length; x++)
      if (y >= 0 && x >= 0) map[y][x] = tile;
}

// Main level generator — dispatches by stageId
export function generateLevel(stageId) {
  const sid = stageId || 0;
  switch (sid) {
    case 0: return generateLevel0();
    case 1: return generateLevel1();
    case 2: return generateLevel2();
    case 3: return generateLevel3();
    case 4: return generateLevel4();
    default: return generateLevel0();
  }
}

// Stage 0: Candi Borobudur (stone, platforms, dark purple theme)
function generateLevel0() {
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

// Stage 1: Hutan Borneo (trees, vines, dark green theme)
function generateLevel1() {
  const W = 90, H = 22;
  const map = [];
  for (let y = 0; y < H; y++) {
    map[y] = [];
    for (let x = 0; x < W; x++) {
      if (y >= H - 2) { map[y][x] = 1; continue; }
      if (x === 0 || x === W - 1) { map[y][x] = 1; continue; }
      map[y][x] = 0;
    }
  }

  // Section 1: Forest entrance
  fillRect(map, 0, H - 3, 18, 2, 1);
  // Trees
  fillRect(map, 8, H - 7, 2, 4, 5);   // tree trunk
  fillRect(map, 6, H - 9, 6, 2, 5);   // tree canopy top
  fillRect(map, 14, H - 6, 2, 3, 5);  // tree trunk
  fillRect(map, 12, H - 8, 6, 2, 5);  // tree canopy top
  // Vine platforms
  fillRect(map, 3, H - 5, 4, 1, 6);
  fillRect(map, 16, H - 6, 3, 1, 6);

  // Section 2: Deep jungle
  fillRect(map, 18, H - 3, 20, 2, 1);
  fillRect(map, 20, H - 5, 3, 1, 2);
  fillRect(map, 26, H - 7, 3, 1, 2);
  fillRect(map, 30, H - 9, 3, 1, 6);  // vine platform
  fillRect(map, 34, H - 6, 3, 1, 2);
  // More trees
  fillRect(map, 22, H - 8, 2, 5, 5);
  fillRect(map, 32, H - 10, 2, 7, 5);

  // Section 3: Swamp area (water)
  fillRect(map, 38, H - 3, 18, 2, 1);
  fillRect(map, 42, H - 4, 8, 1, 4);  // water on ground
  fillRect(map, 42, H - 6, 3, 1, 2);
  fillRect(map, 48, H - 8, 3, 1, 2);
  fillRect(map, 52, H - 5, 3, 1, 6);

  // Section 4: Puzzle area
  fillRect(map, 56, H - 3, 18, 2, 1);
  fillRect(map, 56, H - 3, 1, 8, 1);
  fillRect(map, 56, H - 10, 3, 1, 1);
  fillRect(map, 60, H - 6, 3, 1, 2);
  fillRect(map, 64, H - 8, 3, 1, 6);
  fillRect(map, 68, H - 5, 3, 1, 2);

  // Section 5: Boss arena
  fillRect(map, 74, H - 3, 16, 2, 1);
  fillRect(map, 74, H - 3, 1, 10, 1);
  fillRect(map, 89, H - 3, 1, 10, 1);
  fillRect(map, 78, H - 7, 2, 1, 2);
  fillRect(map, 84, H - 7, 2, 1, 2);

  // Checkpoints
  map[H - 4][18] = 9;
  map[H - 4][40] = 9;
  map[H - 4][56] = 9;

  return map;
}

// Stage 2: Gunung Bromo (lava pools, rocks, red/orange theme)
// NOTE: Lava (tile 3) is SOLID — must be at ground level (H-3) only.
//       Placing lava at H-4 creates impassable walls because the player
//       hitbox (36px) extends into that row. Use tile 8 (decoration) for
//       visual lava glow above ground level.
function generateLevel2() {
  const W = 100, H = 24;
  const map = [];
  for (let y = 0; y < H; y++) {
    map[y] = [];
    for (let x = 0; x < W; x++) {
      if (y >= H - 2) { map[y][x] = 1; continue; }
      if (x === 0 || x === W - 1) { map[y][x] = 1; continue; }
      map[y][x] = 0;
    }
  }

  // Section 1: Mountain base — open area with small lava pool
  fillRect(map, 0, H - 3, 20, 2, 1);
  fillRect(map, 4, H - 5, 3, 1, 2);
  fillRect(map, 10, H - 7, 4, 1, 2);
  fillRect(map, 16, H - 5, 3, 1, 2);
  // Ground-level lava pool (2 tiles wide — easy to jump over)
  fillRect(map, 8, H - 3, 2, 1, 3);

  // Section 2: Lava caves — narrow lava gaps between walkable ground
  fillRect(map, 20, H - 3, 22, 2, 1);
  // Platforms above
  fillRect(map, 24, H - 6, 3, 1, 2);
  fillRect(map, 34, H - 8, 3, 1, 2);
  fillRect(map, 38, H - 10, 3, 1, 2);
  // Ground-level lava gaps (2 tiles wide — jumpable)
  fillRect(map, 28, H - 3, 2, 1, 3);
  fillRect(map, 37, H - 3, 2, 1, 3);
  // Small rock pillars (1 tile wide — player can walk around)
  map[H - 4][22] = 1;
  map[H - 4][31] = 1;

  // Section 3: Volcano ascent — platforms climbing upward
  fillRect(map, 42, H - 3, 20, 2, 1);
  // Stepping-stone platforms (one-way, can jump between them)
  fillRect(map, 44, H - 5, 3, 1, 2);
  fillRect(map, 48, H - 7, 3, 1, 2);
  fillRect(map, 52, H - 9, 3, 1, 2);
  fillRect(map, 56, H - 7, 3, 1, 2);
  // Small lava pool at ground level
  fillRect(map, 50, H - 3, 2, 1, 3);

  // Section 4: Puzzle area
  fillRect(map, 62, H - 3, 18, 2, 1);
  fillRect(map, 62, H - 3, 1, 8, 1);
  fillRect(map, 62, H - 10, 3, 1, 1);
  fillRect(map, 66, H - 6, 3, 1, 2);
  fillRect(map, 70, H - 8, 3, 1, 2);
  fillRect(map, 74, H - 5, 3, 1, 2);
  // Small lava gap (2 tiles — jumpable)
  fillRect(map, 70, H - 3, 2, 1, 3);

  // Section 5: Boss arena (crater) — open flat area
  fillRect(map, 80, H - 3, 20, 2, 1);
  fillRect(map, 80, H - 3, 1, 10, 1);
  fillRect(map, 99, H - 3, 1, 10, 1);
  fillRect(map, 84, H - 7, 2, 1, 2);
  fillRect(map, 92, H - 7, 2, 1, 2);
  // Small decorative lava pool at ground level (not blocking)
  fillRect(map, 87, H - 3, 3, 1, 3);

  // Checkpoints
  map[H - 4][20] = 9;
  map[H - 4][42] = 9;
  map[H - 4][62] = 9;

  return map;
}

// Stage 3: Laut Bali (water, coral platforms, blue theme)
function generateLevel3() {
  const W = 110, H = 26;
  const map = [];
  for (let y = 0; y < H; y++) {
    map[y] = [];
    for (let x = 0; x < W; x++) {
      if (y >= H - 2) { map[y][x] = 4; continue; } // water at bottom
      if (x === 0 || x === W - 1) { map[y][x] = 1; continue; }
      map[y][x] = 0;
    }
  }

  // Section 1: Beach entry
  fillRect(map, 0, H - 3, 20, 1, 1);  // sand
  fillRect(map, 4, H - 5, 3, 1, 2);   // coral platform
  fillRect(map, 10, H - 7, 4, 1, 2);
  fillRect(map, 15, H - 5, 3, 1, 2);
  // Coral decorations
  fillRect(map, 6, H - 8, 2, 3, 8);   // decoration
  fillRect(map, 12, H - 9, 2, 2, 8);

  // Section 2: Shallow waters
  fillRect(map, 20, H - 3, 22, 1, 1);
  fillRect(map, 22, H - 4, 4, 1, 4);  // shallow water
  fillRect(map, 28, H - 6, 3, 1, 2);
  fillRect(map, 33, H - 8, 3, 1, 2);
  fillRect(map, 38, H - 5, 3, 1, 2);
  fillRect(map, 26, H - 4, 3, 1, 4);

  // Section 3: Deep sea
  fillRect(map, 42, H - 3, 22, 1, 1);
  fillRect(map, 45, H - 5, 3, 1, 2);
  fillRect(map, 50, H - 7, 3, 1, 2);
  fillRect(map, 55, H - 9, 3, 1, 2);
  fillRect(map, 58, H - 5, 4, 1, 2);
  // Deep water areas
  fillRect(map, 46, H - 4, 10, 1, 4);

  // Section 4: Puzzle area
  fillRect(map, 64, H - 3, 20, 1, 1);
  fillRect(map, 64, H - 3, 1, 8, 1);
  fillRect(map, 64, H - 10, 3, 1, 1);
  fillRect(map, 68, H - 6, 3, 1, 2);
  fillRect(map, 72, H - 8, 3, 1, 2);
  fillRect(map, 76, H - 5, 3, 1, 2);
  fillRect(map, 70, H - 4, 6, 1, 4);

  // Section 5: Boss arena (ocean depths)
  fillRect(map, 84, H - 3, 26, 1, 1);
  fillRect(map, 84, H - 3, 1, 10, 1);
  fillRect(map, 109, H - 3, 1, 10, 1);
  fillRect(map, 88, H - 7, 2, 1, 2);
  fillRect(map, 96, H - 7, 2, 1, 2);
  fillRect(map, 102, H - 7, 2, 1, 2);
  fillRect(map, 86, H - 4, 22, 1, 4);

  // Checkpoints
  map[H - 4][20] = 9;
  map[H - 4][42] = 9;
  map[H - 4][64] = 9;

  return map;
}

// Stage 4: Candi Prambanan (grand temple, gold pillars, epic scale)
function generateLevel4() {
  const W = 120, H = 28;
  const map = [];
  for (let y = 0; y < H; y++) {
    map[y] = [];
    for (let x = 0; x < W; x++) {
      if (y >= H - 2) { map[y][x] = 1; continue; }
      if (x === 0 || x === W - 1) { map[y][x] = 1; continue; }
      map[y][x] = 0;
    }
  }

  // Section 1: Grand entrance
  fillRect(map, 0, H - 3, 22, 2, 1);
  // Grand pillars
  fillRect(map, 5, H - 8, 2, 5, 1);
  fillRect(map, 10, H - 8, 2, 5, 1);
  fillRect(map, 15, H - 8, 2, 5, 1);
  fillRect(map, 4, H - 9, 9, 1, 2);   // platform between pillars
  fillRect(map, 12, H - 11, 6, 1, 2);

  // Section 2: Temple corridors
  fillRect(map, 22, H - 3, 22, 2, 1);
  fillRect(map, 25, H - 5, 3, 1, 2);
  fillRect(map, 30, H - 7, 3, 1, 2);
  fillRect(map, 35, H - 9, 3, 1, 2);
  fillRect(map, 38, H - 5, 4, 1, 2);
  // Pillars
  fillRect(map, 28, H - 10, 2, 7, 1);
  fillRect(map, 33, H - 10, 2, 7, 1);
  fillRect(map, 38, H - 10, 2, 7, 1);

  // Section 3: Grand hall
  fillRect(map, 44, H - 3, 24, 2, 1);
  // Multiple platforms
  fillRect(map, 46, H - 6, 3, 1, 2);
  fillRect(map, 50, H - 8, 3, 1, 2);
  fillRect(map, 54, H - 10, 3, 1, 2);
  fillRect(map, 58, H - 8, 3, 1, 2);
  fillRect(map, 62, H - 6, 3, 1, 2);
  // Grand pillars
  fillRect(map, 48, H - 12, 2, 9, 1);
  fillRect(map, 55, H - 12, 2, 9, 1);
  fillRect(map, 62, H - 12, 2, 9, 1);

  // Section 4: Puzzle area
  fillRect(map, 68, H - 3, 22, 2, 1);
  fillRect(map, 68, H - 3, 1, 8, 1);
  fillRect(map, 68, H - 10, 3, 1, 1);
  fillRect(map, 72, H - 6, 3, 1, 2);
  fillRect(map, 76, H - 8, 3, 1, 2);
  fillRect(map, 80, H - 6, 3, 1, 2);
  fillRect(map, 84, H - 10, 3, 1, 2);

  // Section 5: Final boss arena
  fillRect(map, 90, H - 3, 30, 2, 1);
  fillRect(map, 90, H - 3, 1, 12, 1);
  fillRect(map, 119, H - 3, 1, 12, 1);
  // Grand platforms
  fillRect(map, 95, H - 8, 3, 1, 2);
  fillRect(map, 102, H - 10, 3, 1, 2);
  fillRect(map, 110, H - 8, 3, 1, 2);
  // Side pillars
  fillRect(map, 92, H - 12, 2, 9, 1);
  fillRect(map, 100, H - 12, 2, 9, 1);
  fillRect(map, 108, H - 12, 2, 9, 1);
  fillRect(map, 116, H - 12, 2, 9, 1);

  // Checkpoints
  map[H - 4][22] = 9;
  map[H - 4][44] = 9;
  map[H - 4][68] = 9;

  return map;
}


