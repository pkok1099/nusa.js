// ============================================================
// map/map1.js — Candi Borobudur (Bangkit dari Debu Waktu)
// ============================================================

import { TILE } from '../js/config.js';
import { createEnemy, createItem, createNPC, createPuzzleTrigger } from '../js/entities.js';

export const MAP_DATA = {
  id: 0,
  name: 'Candi Borobudur',
  subtitle: 'Bangkit dari Debu Waktu',
  width: 80, height: 20,
  bg1: '#0D0A1A', bg2: '#1A0A2E',
  artifact: 'Artefak Tanah',
  bossName: 'Penjaga Batu',
  bossHp: 350, bossSpeed: 1.5, bossW: 48, bossH: 56,
  bossSummonX: 73,
  bossSummonY: 16, // H-4 = 20-4
  enemyTypes: ['batu_kecil', 'patung'],
  introDialog: [
    'Arjuna... kamu telah memilih untuk memulai perjalanan ini.',
    'Candi Borobudur adalah tempat pertamamu.',
    'Artefak Tanah tersembunyi di dalam candi ini, dijaga oleh Penjaga Batu.',
    'Gunakan kerisku untuk melawan, dan cari jalan melalui puzzle kuno.',
    'Semoga leluhur membimbingmu, Anak Jawa.',
  ],
  bossDefeatDialog: [
    'Penjaga Batu telah jatuh...',
    'Artefak Tanah adalah milikmu sekarang.',
    'Jalan menuju Hutan Borneo telah terbuka di sebelah timur.',
  ],
  unlockNextDialog: [
    'Pintu kuno bergetar... jalan ke timur terbuka!',
  ],
  playerStartX: 2,
  playerStartY: 16, // H-4
  doors: [
    { x: 45, y: 15, type: 'puzzle', puzzleId: 1, reward: 'Kawi Script Deciphering — Ramuan Kesehatan & 50 Rupiah' },
  ],
  exitDoor: { x: 79, y: 15, targetMap: 2 },
  bossAltar: { x: 73, y: 16 },
};

export function generateMap(fillRect) {
  const W = 80, H = 20;
  const map = [];
  for (let y = 0; y < H; y++) {
    map[y] = [];
    for (let x = 0; x < W; x++) {
      // Bottom 2 rows = solid stone floor
      if (y >= H - 2) { map[y][x] = 1; continue; }
      // Left and right walls
      if (x === 0 || x === W - 1) { map[y][x] = 1; continue; }
      // Ground level platforms at entrance and far right
      if (y === H - 3 && (x < 5 || x > W - 6)) { map[y][x] = 1; continue; }
      map[y][x] = 0;
    }
  }

  // ===== SECTION 1: Entrance (x: 0–14) =====
  // Solid ground floor
  fillRect(map, 0, H - 3, 15, 2, 1);
  // Low platforms leading inward
  fillRect(map, 5, H - 5, 3, 1, 2);   // one-way platform
  fillRect(map, 10, H - 6, 4, 1, 2);  // one-way platform
  // Stone steps going up (candi-style)
  for (let i = 0; i < 4; i++) fillRect(map, 14 + i, H - 4 - i, 2, 1, 1);
  // Decorative stone column
  fillRect(map, 3, H - 6, 1, 3, 1);
  fillRect(map, 12, H - 7, 1, 4, 1);

  // ===== SECTION 2: Candi Interior (x: 15–44) =====
  // Main floor
  fillRect(map, 15, H - 3, 30, 2, 1);
  // Interior platforms — vertical exploration
  fillRect(map, 17, H - 6, 3, 1, 2);   // mid platform
  fillRect(map, 22, H - 8, 6, 1, 2);   // upper platform
  fillRect(map, 22, H - 8, 1, 5, 1);   // left pillar
  fillRect(map, 27, H - 8, 1, 5, 1);   // right pillar
  fillRect(map, 30, H - 6, 3, 1, 2);   // mid platform
  fillRect(map, 35, H - 7, 3, 1, 2);   // another platform
  fillRect(map, 40, H - 9, 3, 1, 2);   // high platform
  // Stone obstacles on ground (statue bases)
  fillRect(map, 20, H - 4, 1, 1, 1);
  fillRect(map, 33, H - 4, 1, 1, 1);
  fillRect(map, 38, H - 4, 1, 1, 1);
  // Decorative carved walls
  fillRect(map, 18, H - 10, 1, 3, 8);  // decoration
  fillRect(map, 42, H - 8, 1, 2, 8);   // decoration

  // ===== SECTION 3: Puzzle Room Door & Side Area (x: 45–51) =====
  // Floor continues
  fillRect(map, 45, H - 3, 7, 2, 1);
  // Puzzle door frame — ornate stone archway
  fillRect(map, 44, H - 7, 1, 4, 1);   // left door frame
  fillRect(map, 46, H - 7, 1, 4, 1);   // right door frame
  fillRect(map, 43, H - 7, 5, 1, 1);   // top of door frame
  // Puzzle door tile (tile 10)
  map[H - 5][45] = 10;
  // Platform above puzzle door
  fillRect(map, 43, H - 9, 5, 1, 2);   // one-way platform above door
  // Side platforms
  fillRect(map, 48, H - 6, 3, 1, 2);
  fillRect(map, 48, H - 8, 2, 1, 2);

  // ===== SECTION 4: Passage to Boss Arena (x: 52–66) =====
  fillRect(map, 52, H - 3, 15, 2, 1);
  // Rising stone steps
  fillRect(map, 52, H - 3, 1, 8, 1);   // left wall
  fillRect(map, 52, H - 10, 4, 1, 1);  // top lintel
  // Platforms at various heights
  fillRect(map, 55, H - 6, 3, 1, 2);
  fillRect(map, 59, H - 8, 3, 1, 2);
  fillRect(map, 63, H - 6, 3, 1, 2);
  // Stone columns
  fillRect(map, 57, H - 9, 1, 6, 1);
  fillRect(map, 62, H - 7, 1, 4, 1);
  // Decorative reliefs
  fillRect(map, 54, H - 11, 1, 3, 8);
  fillRect(map, 60, H - 11, 1, 3, 8);

  // ===== SECTION 5: Boss Arena (x: 67–79) =====
  // Open flat arena floor
  fillRect(map, 67, H - 3, 13, 2, 1);
  // Arena walls
  fillRect(map, 67, H - 3, 1, 10, 1);  // left wall
  fillRect(map, 79, H - 3, 1, 10, 1);  // right wall
  // Small platforms for dodging
  fillRect(map, 70, H - 7, 2, 1, 2);
  fillRect(map, 76, H - 7, 2, 1, 2);
  // Corner pillars
  fillRect(map, 68, H - 8, 1, 5, 1);
  fillRect(map, 78, H - 8, 1, 5, 1);
  // Decorative stone heads
  fillRect(map, 69, H - 9, 1, 1, 8);
  fillRect(map, 77, H - 9, 1, 1, 8);

  // ===== SPECIAL TILES =====
  // Boss altar (tile 12) — glowing summoning circle
  map[H - 4][73] = 12;

  // Exit door (tile 11) — large gate, blocked until boss defeated
  map[H - 5][79] = 11;

  // Checkpoints (tile 9)
  map[H - 4][28] = 9;
  map[H - 4][50] = 9;

  return map;
}

export function spawnEntities(H) {
  const enemies = [];
  const items = [];
  const npcs = [];
  const puzzleTriggers = [];

  // --- Enemies ---
  // Section 1: Entrance
  enemies.push(createEnemy(14, H - 4, 'batu_kecil'));
  // Section 2: Candi Interior
  enemies.push(createEnemy(24, H - 4, 'batu_kecil'));
  enemies.push(createEnemy(35, H - 7, 'batu_kecil'));
  enemies.push(createEnemy(42, H - 4, 'patung'));
  // Section 4: Passage
  enemies.push(createEnemy(57, H - 4, 'patung'));
  enemies.push(createEnemy(62, H - 4, 'batu_kecil'));
  // Section 5: Boss arena approach
  enemies.push(createEnemy(68, H - 4, 'batu_kecil'));

  // --- Items ---
  // Health potions
  items.push(createItem(11, H - 8, 'potion', 'health'));
  items.push(createItem(56, H - 9, 'potion', 'health'));
  // Kristal
  items.push(createItem(41, H - 9, 'kristal'));
  // Rupiah drops
  items.push(createItem(7, H - 7, 'rupiah'));
  items.push(createItem(36, H - 7, 'rupiah'));
  items.push(createItem(60, H - 8, 'rupiah'));
  // Key
  items.push(createItem(60, H - 10, 'kunci'));

  // --- NPCs ---
  npcs.push(createNPC(6, H - 4, 'Mbah Darmo', [
    'Selamat datang, Anak Muda!',
    'Aku sudah lama menunggu keturunan pahlawan ini.',
    'Aku bisa menjual perlengkapan untuk perjalananmu.',
    'Hati-hati di dalam candi... Penjaga Batu tidak berkompromi.',
  ], 'pedagang'));

  // --- Puzzle Triggers ---
  puzzleTriggers.push(createPuzzleTrigger(45, H - 4));

  return { enemies, items, npcs, puzzleTriggers };
}
