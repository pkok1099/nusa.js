// ============================================================
// map/map2.js — Hutan Borneo (Rimba Kehilangan)
// ============================================================

import { TILE } from '../js/config.js';
import { createEnemy, createItem, createNPC, createPuzzleTrigger } from '../js/entities.js';

export const MAP_DATA = {
  id: 1,
  name: 'Hutan Borneo',
  subtitle: 'Rimba Kehilangan',
  width: 90, height: 22,
  bg1: '#0A1A0D', bg2: '#0A2E15',
  artifact: 'Artefak Kayu',
  bossName: 'Raja Hutan',
  bossHp: 500, bossSpeed: 2.0, bossW: 52, bossH: 60,
  bossSummonX: 80,
  bossSummonY: 18, // H-4 = 22-4
  enemyTypes: ['harimau', 'ular'],
  introDialog: [
    'Hutan Borneo menyimpan rahasia kuno...',
    'Raja Hutan menjaga Artefak Kayu.',
    'Waspadai serangan cepat dari bayangan pohon.',
    'Artefak Kayu adalah kunci kekuatan alam.',
  ],
  bossDefeatDialog: [
    'Raja Hutan tunduk di hadapanmu...',
    'Artefak Kayu kini milikmu.',
    'Gunung Bromo menunggu di balik kabut hutan.',
  ],
  unlockNextDialog: [
    'Pohon-pohon berbelah... jalan ke gunung terbuka!',
  ],
  playerStartX: 2,
  playerStartY: 18, // H-4
  doors: [
    { x: 38, y: 17, type: 'puzzle', puzzleId: 2, reward: 'Batik Pattern Completion — Ramuan Stamina & 80 Rupiah' },
  ],
  exitDoor: { x: 89, y: 17, targetMap: 3 },
  bossAltar: { x: 80, y: 18 },
};

export function generateMap(fillRect) {
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

  // ===== SECTION 1: Forest Entrance (x: 0–17) =====
  fillRect(map, 0, H - 3, 18, 2, 1);
  // Trees — trunks (5) and canopy
  fillRect(map, 8, H - 7, 2, 4, 5);    // tree trunk
  fillRect(map, 6, H - 9, 6, 2, 5);    // canopy top
  fillRect(map, 14, H - 6, 2, 3, 5);   // tree trunk
  fillRect(map, 12, H - 8, 6, 2, 5);   // canopy top
  // Vine platforms (6)
  fillRect(map, 3, H - 5, 4, 1, 6);
  fillRect(map, 16, H - 6, 3, 1, 6);
  // Low stone platforms
  fillRect(map, 10, H - 4, 2, 1, 1);

  // ===== SECTION 2: Deep Jungle (x: 18–37) =====
  fillRect(map, 18, H - 3, 20, 2, 1);
  // Multi-level platforms — vertical exploration
  fillRect(map, 20, H - 5, 3, 1, 2);   // low platform
  fillRect(map, 26, H - 7, 3, 1, 2);   // mid platform
  fillRect(map, 30, H - 9, 3, 1, 6);   // vine platform high
  fillRect(map, 34, H - 6, 3, 1, 2);   // mid-low platform
  // More trees
  fillRect(map, 22, H - 8, 2, 5, 5);   // trunk
  fillRect(map, 20, H - 10, 6, 2, 5);  // canopy
  fillRect(map, 32, H - 10, 2, 7, 5);  // trunk
  fillRect(map, 30, H - 12, 6, 2, 5);  // canopy
  // Decorative undergrowth
  fillRect(map, 24, H - 4, 1, 1, 8);
  fillRect(map, 28, H - 4, 1, 1, 8);
  fillRect(map, 36, H - 4, 1, 1, 8);

  // ===== SECTION 3: Puzzle Room Door & Swamp Area (x: 38–55) =====
  fillRect(map, 38, H - 3, 18, 2, 1);
  // Puzzle door frame — vine-covered stone arch
  fillRect(map, 37, H - 7, 1, 4, 1);   // left frame
  fillRect(map, 39, H - 7, 1, 4, 1);   // right frame
  fillRect(map, 36, H - 7, 5, 1, 1);   // top lintel
  // Puzzle door tile (tile 10)
  map[H - 5][38] = 10;
  // Water on ground (swamp)
  fillRect(map, 42, H - 4, 8, 1, 4);
  // Platforms over swamp
  fillRect(map, 42, H - 6, 3, 1, 2);
  fillRect(map, 48, H - 8, 3, 1, 2);
  fillRect(map, 52, H - 5, 3, 1, 6);   // vine platform
  // More tree cover
  fillRect(map, 44, H - 10, 2, 6, 5);  // trunk
  fillRect(map, 42, H - 12, 6, 2, 5);  // canopy
  fillRect(map, 50, H - 9, 2, 5, 5);   // trunk
  fillRect(map, 48, H - 11, 6, 2, 5);  // canopy

  // ===== SECTION 4: Ancient Grove (x: 56–73) =====
  fillRect(map, 56, H - 3, 18, 2, 1);
  // Left wall of the grove
  fillRect(map, 56, H - 3, 1, 8, 1);
  fillRect(map, 56, H - 10, 3, 1, 1);  // top lintel
  // Platforms leading up through the canopy
  fillRect(map, 60, H - 6, 3, 1, 2);
  fillRect(map, 64, H - 8, 3, 1, 6);   // vine platform
  fillRect(map, 68, H - 5, 3, 1, 2);
  fillRect(map, 70, H - 9, 3, 1, 2);
  // Ancient tree
  fillRect(map, 62, H - 11, 2, 8, 5);  // massive trunk
  fillRect(map, 59, H - 13, 8, 2, 5);  // wide canopy
  // Roots on ground
  fillRect(map, 58, H - 4, 1, 1, 5);
  fillRect(map, 63, H - 4, 1, 1, 5);

  // ===== SECTION 5: Boss Arena — Raja Hutan's Clearing (x: 74–89) =====
  fillRect(map, 74, H - 3, 16, 2, 1);
  // Arena walls
  fillRect(map, 74, H - 3, 1, 10, 1);  // left wall
  fillRect(map, 89, H - 3, 1, 10, 1);  // right wall
  // Platforms for vertical combat
  fillRect(map, 78, H - 7, 2, 1, 2);
  fillRect(map, 84, H - 7, 2, 1, 2);
  // Side trees
  fillRect(map, 76, H - 9, 2, 6, 5);   // tree trunk
  fillRect(map, 74, H - 11, 6, 2, 5);  // canopy
  fillRect(map, 86, H - 8, 2, 5, 5);   // tree trunk
  fillRect(map, 84, H - 10, 6, 2, 5);  // canopy

  // ===== SPECIAL TILES =====
  // Boss altar (tile 12)
  map[H - 4][80] = 12;

  // Exit door (tile 11) — blocked until boss defeated
  map[H - 5][89] = 11;

  // Checkpoints (tile 9)
  map[H - 4][18] = 9;
  map[H - 4][40] = 9;
  map[H - 4][56] = 9;

  return map;
}

export function spawnEntities(H) {
  const enemies = [];
  const items = [];
  const npcs = [];
  const puzzleTriggers = [];

  // --- Enemies ---
  // Section 1: Forest entrance
  enemies.push(createEnemy(15, H - 4, 'harimau'));
  // Section 2: Deep jungle
  enemies.push(createEnemy(25, H - 4, 'ular'));
  enemies.push(createEnemy(35, H - 6, 'harimau'));
  // Section 3: Swamp area
  enemies.push(createEnemy(45, H - 4, 'ular'));
  enemies.push(createEnemy(53, H - 4, 'harimau'));
  // Section 4: Ancient grove
  enemies.push(createEnemy(60, H - 6, 'ular'));
  enemies.push(createEnemy(68, H - 4, 'harimau'));
  // Section 5: Boss approach
  enemies.push(createEnemy(75, H - 4, 'ular'));

  // --- Items ---
  // Health potions
  items.push(createItem(10, H - 7, 'potion', 'health'));
  items.push(createItem(30, H - 8, 'potion', 'health'));
  // Stamina potion
  items.push(createItem(65, H - 9, 'potion', 'stamina'));
  // Kristal
  items.push(createItem(50, H - 9, 'kristal'));
  // Rupiah drops
  items.push(createItem(20, H - 10, 'rupiah'));
  items.push(createItem(40, H - 7, 'rupiah'));
  items.push(createItem(65, H - 7, 'rupiah'));
  // Equipment drop
  items.push(createItem(20, H - 10, 'equipment', 'weapon_pedang'));

  // --- NPCs ---
  npcs.push(createNPC(5, H - 4, 'Siti Hutan', [
    'Hutan ini berbahaya, Anak Muda.',
    'Harimau-harimau menyerang dengan cepat.',
    'Ular bisa meracumimu — waspadai gigitannya!',
    'Aku punya ramuan jika kamu butuh.',
  ], 'pedagang'));

  // --- Puzzle Triggers ---
  puzzleTriggers.push(createPuzzleTrigger(38, H - 4));

  return { enemies, items, npcs, puzzleTriggers };
}
