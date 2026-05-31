// ============================================================
// map/map4.js — Laut Bali (Kedalaman Tanpa Dasar)
// ============================================================
// IMPORTANT: Water tiles (4) at bottom (y >= H-2).
//            Water is non-solid — player swims through it.
//            Ground platforms (1) provide walkable surfaces above water.

import { TILE } from '../config.js';
import { createEnemy, createItem, createNPC, createPuzzleTrigger } from '../entities.js';

export const MAP_DATA = {
  id: 3,
  name: 'Laut Bali',
  subtitle: 'Kedalaman Tanpa Dasar',
  width: 110, height: 26,
  bg1: '#0A0A1A', bg2: '#0A152E',
  artifact: 'Artefak Air',
  bossName: 'Raksasa Laut',
  bossHp: 900, bossSpeed: 1.8, bossW: 60, bossH: 70,
  bossSummonX: 100,
  bossSummonY: 22, // H-4 = 26-4
  enemyTypes: ['ikan_pedang', 'ubur_ubur'],
  introDialog: [
    'Laut Bali menyimpan misteri purba.',
    'Raksasa Laut terbangun dari tidurnya.',
    'Jangan biarkan ombak menelanmu.',
    'Artefak Air ada di dasar lautan.',
  ],
  bossDefeatDialog: [
    'Raksasa Laut kembali ke kedalaman...',
    'Artefak Air berpendar di tanganmu.',
    'Candi Prambanan menanti di ujung lautan.',
  ],
  unlockNextDialog: [
    'Ombak berpisah... jalan ke candi terakhir terbuka!',
  ],
  playerStartX: 2,
  playerStartY: 22, // H-4
  doors: [
    { x: 56, y: 21, type: 'puzzle', puzzleId: 4, reward: 'Airlangga Water Channels — Ramuan Stamina & 200 Rupiah' },
  ],
  exitDoor: { x: 109, y: 21, targetMap: 5 },
  bossAltar: { x: 100, y: 22 },
};

export function generateMap(fillRect) {
  const W = 110, H = 26;
  const map = [];
  for (let y = 0; y < H; y++) {
    map[y] = [];
    for (let x = 0; x < W; x++) {
      // Water at bottom rows
      if (y >= H - 2) { map[y][x] = 4; continue; }
      // Side walls are stone
      if (x === 0 || x === W - 1) { map[y][x] = 1; continue; }
      map[y][x] = 0;
    }
  }

  // ===== SECTION 1: Beach Entry (x: 0–19) =====
  // Sand/stone ground
  fillRect(map, 0, H - 3, 20, 1, 1);
  // Coral platforms
  fillRect(map, 4, H - 5, 3, 1, 2);
  fillRect(map, 10, H - 7, 4, 1, 2);
  fillRect(map, 15, H - 5, 3, 1, 2);
  // Coral decorations (8)
  fillRect(map, 6, H - 8, 2, 3, 8);
  fillRect(map, 12, H - 9, 2, 2, 8);
  // Shallow water near shore
  fillRect(map, 14, H - 4, 6, 1, 4);
  // High cliff platform
  fillRect(map, 2, H - 9, 3, 1, 2);

  // ===== SECTION 2: Shallow Waters (x: 20–41) =====
  fillRect(map, 20, H - 3, 22, 1, 1);
  // Shallow water
  fillRect(map, 22, H - 4, 4, 1, 4);
  fillRect(map, 26, H - 4, 3, 1, 4);
  // Coral platforms above water
  fillRect(map, 28, H - 6, 3, 1, 2);
  fillRect(map, 33, H - 8, 3, 1, 2);
  fillRect(map, 38, H - 5, 3, 1, 2);
  // High platform
  fillRect(map, 22, H - 10, 4, 1, 2);
  fillRect(map, 35, H - 11, 3, 1, 2);
  // More coral decorations
  fillRect(map, 30, H - 9, 1, 2, 8);
  fillRect(map, 36, H - 6, 1, 2, 8);

  // ===== SECTION 3: Puzzle Room Door — Airlangga Ruins (x: 42–55) =====
  fillRect(map, 42, H - 3, 14, 1, 1);
  // Water on ground
  fillRect(map, 44, H - 4, 8, 1, 4);
  // Puzzle door frame — sunken stone archway
  fillRect(map, 55, H - 7, 1, 4, 1);   // left frame
  fillRect(map, 57, H - 7, 1, 4, 1);   // right frame
  fillRect(map, 54, H - 7, 5, 1, 1);   // top lintel
  // Puzzle door tile (tile 10)
  map[H - 5][56] = 10;
  // Platforms above puzzle door
  fillRect(map, 45, H - 5, 3, 1, 2);
  fillRect(map, 50, H - 7, 3, 1, 2);
  fillRect(map, 52, H - 9, 3, 1, 2);
  // Decorative ancient columns
  fillRect(map, 43, H - 8, 1, 5, 1);
  fillRect(map, 48, H - 9, 1, 6, 1);
  // Seaweed decorations
  fillRect(map, 46, H - 6, 1, 2, 8);
  fillRect(map, 53, H - 5, 1, 1, 8);

  // ===== SECTION 4: Deep Sea (x: 56–83) =====
  fillRect(map, 56, H - 3, 28, 1, 1);
  // Deep water areas
  fillRect(map, 58, H - 4, 10, 1, 4);
  fillRect(map, 72, H - 4, 8, 1, 4);
  // Underwater platforms — multiple heights for vertical exploration
  fillRect(map, 60, H - 6, 3, 1, 2);
  fillRect(map, 64, H - 8, 3, 1, 2);
  fillRect(map, 68, H - 6, 3, 1, 2);
  fillRect(map, 72, H - 9, 3, 1, 2);
  fillRect(map, 76, H - 7, 3, 1, 2);
  fillRect(map, 80, H - 5, 4, 1, 2);
  // High aerial platforms (above water)
  fillRect(map, 62, H - 11, 3, 1, 2);
  fillRect(map, 70, H - 12, 3, 1, 2);
  fillRect(map, 78, H - 10, 3, 1, 2);
  // Coral formations
  fillRect(map, 59, H - 8, 1, 3, 8);
  fillRect(map, 66, H - 10, 1, 2, 8);
  fillRect(map, 74, H - 11, 1, 3, 8);
  fillRect(map, 82, H - 7, 1, 2, 8);

  // ===== SECTION 5: Boss Arena — Ocean Depths (x: 84–109) =====
  fillRect(map, 84, H - 3, 26, 1, 1);
  // Arena walls
  fillRect(map, 84, H - 3, 1, 10, 1);  // left wall
  fillRect(map, 109, H - 3, 1, 10, 1); // right wall
  // Water floor in boss arena
  fillRect(map, 86, H - 4, 22, 1, 4);
  // Platforms for dodging Raksasa Laut
  fillRect(map, 88, H - 7, 2, 1, 2);
  fillRect(map, 96, H - 7, 2, 1, 2);
  fillRect(map, 102, H - 7, 2, 1, 2);
  // High central platform
  fillRect(map, 93, H - 10, 4, 1, 2);
  // Coral pillars
  fillRect(map, 86, H - 9, 1, 6, 1);
  fillRect(map, 91, H - 8, 1, 5, 1);
  fillRect(map, 99, H - 8, 1, 5, 1);
  fillRect(map, 107, H - 9, 1, 6, 1);
  // Decorative sea creatures
  fillRect(map, 85, H - 12, 1, 2, 8);
  fillRect(map, 108, H - 11, 1, 2, 8);

  // ===== SPECIAL TILES =====
  // Boss altar (tile 12) — glowing summoning circle on the ocean floor
  map[H - 4][100] = 12;

  // Exit door (tile 11) — blocked until boss defeated
  map[H - 5][109] = 11;

  // Checkpoints (tile 9)
  map[H - 4][20] = 9;
  map[H - 4][42] = 9;
  map[H - 4][64] = 9;

  return map;
}

export function spawnEntities(H) {
  const enemies = [];
  const items = [];
  const npcs = [];
  const puzzleTriggers = [];

  // --- Enemies ---
  // Section 1: Beach entry
  enemies.push(createEnemy(15, H - 4, 'ikan_pedang'));
  // Section 2: Shallow waters
  enemies.push(createEnemy(25, H - 4, 'ubur_ubur'));
  enemies.push(createEnemy(35, H - 6, 'ikan_pedang'));
  // Section 3: Puzzle area
  enemies.push(createEnemy(48, H - 4, 'ubur_ubur'));
  // Section 4: Deep sea
  enemies.push(createEnemy(60, H - 4, 'ikan_pedang'));
  enemies.push(createEnemy(68, H - 4, 'ubur_ubur'));
  enemies.push(createEnemy(76, H - 6, 'ikan_pedang'));
  // Section 5: Boss approach
  enemies.push(createEnemy(85, H - 4, 'ikan_pedang'));
  enemies.push(createEnemy(90, H - 4, 'ubur_ubur'));

  // --- Items ---
  // Health potions
  items.push(createItem(10, H - 8, 'potion', 'health'));
  items.push(createItem(30, H - 9, 'potion', 'health'));
  // Stamina potion
  items.push(createItem(50, H - 10, 'potion', 'stamina'));
  // Kristal
  items.push(createItem(70, H - 8, 'kristal'));
  // Rupiah drops
  items.push(createItem(40, H - 8, 'rupiah'));
  items.push(createItem(65, H - 10, 'rupiah'));
  items.push(createItem(80, H - 6, 'rupiah'));
  // Equipment drop
  items.push(createItem(60, H - 10, 'equipment', 'accessory_kalung_batu'));

  // --- NPCs ---
  npcs.push(createNPC(5, H - 4, 'Nyi Roro Kidul', [
    'Laut ini milikku, tapi aku mengizinkanmu lewat.',
    'Ikan pedang sangat cepat — waspadai serangan baliknya.',
    'Ubur-ubur bisa melumpuhkanmu — hindari sentuhannya!',
    'Ambil ramuan ini sebelum terlambat.',
  ], 'pedagang'));

  // --- Puzzle Triggers ---
  puzzleTriggers.push(createPuzzleTrigger(56, H - 4));

  return { enemies, items, npcs, puzzleTriggers };
}
