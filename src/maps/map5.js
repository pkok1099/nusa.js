// ============================================================
// map/map5.js — Candi Prambanan (Akhir Segala Awal)
// ============================================================
// This is the FINAL map — there is NO exit door.
// Defeating the boss here completes the game.

import { TILE } from '../config.js';
import { createEnemy, createItem, createNPC, createPuzzleTrigger } from '../entities.js';

export const MAP_DATA = {
  id: 4,
  name: 'Candi Prambanan',
  subtitle: 'Akhir Segala Awal',
  width: 120, height: 28,
  bg1: '#1A1A0A', bg2: '#2E2E0A',
  artifact: 'Artefak Langit',
  bossName: 'Raksasa Terakhir',
  bossHp: 1200, bossSpeed: 2.8, bossW: 64, bossH: 72,
  bossSummonX: 110,
  bossSummonY: 24, // H-4 = 28-4
  enemyTypes: ['prajurit_jahat', 'raksasa_kecil'],
  introDialog: [
    'Candi Prambanan... tempat terakhir.',
    'Raksasa Terakhir menunggu di puncak.',
    'Semua artefak harus dikumpulkan.',
    'Ini akhir dari segala awal, Arjuna.',
  ],
  bossDefeatDialog: [
    'Raksasa Terakhir telah dikalahkan!',
    'Semua artefak telah dikumpulkan!',
    'Nusantara selamat berkat pengorbananmu, Arjuna.',
  ],
  unlockNextDialog: [
    'Dewa-dewa tersenyum... perdamaian telah datang.',
  ],
  playerStartX: 2,
  playerStartY: 24, // H-4
  doors: [
    { x: 60, y: 23, type: 'puzzle', puzzleId: 5, reward: 'Dewata Riddle Shrine — Ramuan Kesehatan & 300 Rupiah' },
  ],
  exitDoor: null, // NO exit door — this is the final map
  bossAltar: { x: 110, y: 24 },
};

export function generateMap(fillRect) {
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

  // ===== SECTION 1: Grand Entrance (x: 0–21) =====
  fillRect(map, 0, H - 3, 22, 2, 1);
  // Grand pillars — entrance hall
  fillRect(map, 5, H - 8, 2, 5, 1);    // pillar 1
  fillRect(map, 10, H - 8, 2, 5, 1);   // pillar 2
  fillRect(map, 15, H - 8, 2, 5, 1);   // pillar 3
  // Platform between pillars
  fillRect(map, 4, H - 9, 9, 1, 2);    // low platform
  fillRect(map, 12, H - 11, 6, 1, 2);  // higher platform
  // Steps leading up
  for (let i = 0; i < 3; i++) fillRect(map, 19 + i, H - 4 - i, 2, 1, 1);
  // Decorative golden reliefs
  fillRect(map, 3, H - 5, 1, 2, 8);
  fillRect(map, 17, H - 5, 1, 2, 8);
  // High alcove
  fillRect(map, 8, H - 13, 4, 1, 2);

  // ===== SECTION 2: Temple Corridors (x: 22–43) =====
  fillRect(map, 22, H - 3, 22, 2, 1);
  // Multi-level corridor — vertical exploration
  fillRect(map, 25, H - 5, 3, 1, 2);   // low platform
  fillRect(map, 30, H - 7, 3, 1, 2);   // mid platform
  fillRect(map, 35, H - 9, 3, 1, 2);   // high platform
  fillRect(map, 38, H - 5, 4, 1, 2);   // low platform
  // Corridor pillars
  fillRect(map, 28, H - 10, 2, 7, 1);  // pillar 1
  fillRect(map, 33, H - 10, 2, 7, 1);  // pillar 2
  fillRect(map, 38, H - 10, 2, 7, 1);  // pillar 3
  // Upper walkway
  fillRect(map, 24, H - 12, 18, 1, 2); // long upper platform
  // Golden decorations
  fillRect(map, 26, H - 14, 1, 2, 8);
  fillRect(map, 34, H - 14, 1, 2, 8);
  fillRect(map, 40, H - 13, 1, 3, 8);

  // ===== SECTION 3: Puzzle Room Door — Dewata Shrine (x: 44–59) =====
  fillRect(map, 44, H - 3, 16, 2, 1);
  // Grand puzzle door frame — ornate golden arch
  fillRect(map, 59, H - 7, 1, 4, 1);   // left frame
  fillRect(map, 61, H - 7, 1, 4, 1);   // right frame
  fillRect(map, 58, H - 7, 5, 1, 1);   // top lintel
  // Puzzle door tile (tile 10)
  map[H - 5][60] = 10;
  // Platforms flanking the puzzle door
  fillRect(map, 46, H - 6, 3, 1, 2);
  fillRect(map, 50, H - 8, 3, 1, 2);
  fillRect(map, 54, H - 10, 3, 1, 2);
  fillRect(map, 56, H - 6, 3, 1, 2);
  // Platform above puzzle door
  fillRect(map, 57, H - 11, 6, 1, 2);
  // Sacred columns
  fillRect(map, 45, H - 9, 1, 6, 1);
  fillRect(map, 55, H - 8, 1, 5, 1);
  // Divine decorations
  fillRect(map, 47, H - 12, 1, 2, 8);
  fillRect(map, 52, H - 13, 1, 3, 8);

  // ===== SECTION 4: Grand Hall (x: 60–89) =====
  fillRect(map, 60, H - 3, 30, 2, 1);
  // Multiple platform levels — extensive vertical exploration
  // Lower tier
  fillRect(map, 62, H - 5, 3, 1, 2);
  fillRect(map, 68, H - 5, 3, 1, 2);
  fillRect(map, 74, H - 5, 3, 1, 2);
  // Mid tier
  fillRect(map, 64, H - 8, 3, 1, 2);
  fillRect(map, 70, H - 8, 3, 1, 2);
  fillRect(map, 76, H - 8, 3, 1, 2);
  fillRect(map, 82, H - 6, 3, 1, 2);
  // Upper tier
  fillRect(map, 66, H - 11, 3, 1, 2);
  fillRect(map, 72, H - 11, 3, 1, 2);
  fillRect(map, 78, H - 10, 3, 1, 2);
  fillRect(map, 84, H - 9, 3, 1, 2);
  // Grand pillars
  fillRect(map, 63, H - 13, 2, 10, 1);
  fillRect(map, 69, H - 13, 2, 10, 1);
  fillRect(map, 75, H - 13, 2, 10, 1);
  fillRect(map, 81, H - 13, 2, 10, 1);
  fillRect(map, 87, H - 12, 2, 9, 1);
  // Upper gallery
  fillRect(map, 62, H - 15, 26, 1, 2);
  // Golden decorations throughout
  fillRect(map, 65, H - 17, 1, 2, 8);
  fillRect(map, 73, H - 17, 1, 2, 8);
  fillRect(map, 79, H - 16, 1, 2, 8);
  fillRect(map, 85, H - 15, 1, 2, 8);

  // ===== SECTION 5: Final Boss Arena — Puncak Prambanan (x: 90–119) =====
  fillRect(map, 90, H - 3, 30, 2, 1);
  // Arena walls — massive stone walls
  fillRect(map, 90, H - 3, 1, 12, 1);  // left wall
  // NO right wall at x=119 since it's the map edge (wall already placed at W-1)
  // Grand platforms for dodging Raksasa Terakhir
  fillRect(map, 95, H - 8, 3, 1, 2);
  fillRect(map, 102, H - 10, 3, 1, 2);
  fillRect(map, 110, H - 8, 3, 1, 2);
  // Side platforms
  fillRect(map, 92, H - 6, 2, 1, 2);
  fillRect(map, 116, H - 6, 2, 1, 2);
  // Grand pillars framing the arena
  fillRect(map, 92, H - 12, 2, 9, 1);
  fillRect(map, 100, H - 12, 2, 9, 1);
  fillRect(map, 108, H - 12, 2, 9, 1);
  fillRect(map, 116, H - 12, 2, 9, 1);
  // High gallery for the arena
  fillRect(map, 91, H - 14, 28, 1, 2);
  // Divine golden glow decorations
  fillRect(map, 94, H - 16, 1, 2, 8);
  fillRect(map, 104, H - 16, 1, 2, 8);
  fillRect(map, 112, H - 16, 1, 2, 8);
  // Central altar decorations
  fillRect(map, 108, H - 5, 1, 2, 8);
  fillRect(map, 112, H - 5, 1, 2, 8);

  // ===== SPECIAL TILES =====
  // Boss altar (tile 12) — the final summoning circle
  map[H - 4][110] = 12;

  // NO exit door (tile 11) — this is the final map!
  // Defeating the boss triggers the victory sequence instead.

  // Checkpoints (tile 9)
  map[H - 4][22] = 9;
  map[H - 4][44] = 9;
  map[H - 4][68] = 9;

  return map;
}

export function spawnEntities(H) {
  const enemies = [];
  const items = [];
  const npcs = [];
  const puzzleTriggers = [];

  // --- Enemies ---
  // Section 1: Grand entrance
  enemies.push(createEnemy(15, H - 4, 'prajurit_jahat'));
  // Section 2: Temple corridors
  enemies.push(createEnemy(25, H - 4, 'raksasa_kecil'));
  enemies.push(createEnemy(35, H - 6, 'prajurit_jahat'));
  // Section 3: Puzzle area
  enemies.push(createEnemy(48, H - 4, 'prajurit_jahat'));
  // Section 4: Grand hall — heavy enemy presence
  enemies.push(createEnemy(55, H - 4, 'raksasa_kecil'));
  enemies.push(createEnemy(65, H - 6, 'prajurit_jahat'));
  enemies.push(createEnemy(75, H - 4, 'raksasa_kecil'));
  enemies.push(createEnemy(80, H - 4, 'raksasa_kecil'));
  enemies.push(createEnemy(85, H - 4, 'prajurit_jahat'));
  // Section 5: Boss arena approach
  enemies.push(createEnemy(92, H - 4, 'prajurit_jahat'));

  // --- Items ---
  // Health potions — generous for the final stage
  items.push(createItem(10, H - 8, 'potion', 'health'));
  items.push(createItem(30, H - 9, 'potion', 'health'));
  items.push(createItem(70, H - 8, 'potion', 'health'));
  // Stamina potions
  items.push(createItem(50, H - 10, 'potion', 'stamina'));
  // Kristal
  items.push(createItem(70, H - 12, 'kristal'));
  // Rupiah drops
  items.push(createItem(40, H - 8, 'rupiah'));
  items.push(createItem(60, H - 10, 'rupiah'));
  items.push(createItem(85, H - 10, 'rupiah'));
  // Key
  items.push(createItem(60, H - 12, 'kunci'));
  // Equipment drop — powerful endgame gear
  items.push(createItem(85, H - 10, 'equipment', 'weapon_keris_emas'));

  // --- NPCs ---
  npcs.push(createNPC(5, H - 4, 'Resi Wisrawa', [
    'Candi Prambanan... tempat terakhir perjuanganmu.',
    'Prajurit jahat bisa menangkis seranganmu — cari celah!',
    'Raksasa kecil melempar batu dari jauh.',
    'Raksasa Terakhir memiliki kekuatan semua boss sebelumnya.',
    'Semoga dewa melindungimu, Arjuna.',
  ], 'pedagang'));

  // --- Puzzle Triggers ---
  puzzleTriggers.push(createPuzzleTrigger(60, H - 4));

  return { enemies, items, npcs, puzzleTriggers };
}
