// ============================================================
// map/map3.js — Gunung Bromo (Neraka Api)
// ============================================================
// IMPORTANT: Lava (tile 3) is SOLID — only place at ground level (y=H-3)
//            Max 2 tiles wide so player can jump over.
//            Use tile 8 (decoration) for visual lava glow above ground.

import { TILE } from '../js/config.js';
import { createEnemy, createItem, createNPC, createPuzzleTrigger } from '../js/entities.js';

export const MAP_DATA = {
  id: 2,
  name: 'Gunung Bromo',
  subtitle: 'Neraka Api',
  width: 100, height: 24,
  bg1: '#1A0A0A', bg2: '#2E150A',
  artifact: 'Artefak Api',
  bossName: 'Naga Api',
  bossHp: 700, bossSpeed: 2.5, bossW: 56, bossH: 64,
  bossSummonX: 90,
  bossSummonY: 20, // H-4 = 24-4
  enemyTypes: ['iblis_kecil', 'golem_api'],
  introDialog: [
    'Gunung Bromo... gerbang dunia bawah.',
    'Naga Api bangkit dari kawah.',
    'Api membakar segalanya — kecuali yang paling kuat.',
    'Artefak Api tersembunyi di puncak kawah.',
  ],
  bossDefeatDialog: [
    'Naga Api runtuh ke dalam kawah...',
    'Artefak Api menyala di tanganmu.',
    'Laut Bali membentang di balik gunung.',
  ],
  unlockNextDialog: [
    'Kawah terbelah... jalan ke lautan terbuka!',
  ],
  playerStartX: 2,
  playerStartY: 20, // H-4
  doors: [
    { x: 52, y: 19, type: 'puzzle', puzzleId: 3, reward: 'Gamelan Gong Sequence — Ramuan Kesehatan & 120 Rupiah' },
  ],
  exitDoor: { x: 99, y: 19, targetMap: 4 },
  bossAltar: { x: 90, y: 20 },
};

export function generateMap(fillRect) {
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

  // ===== SECTION 1: Mountain Base (x: 0–19) =====
  fillRect(map, 0, H - 3, 20, 2, 1);
  // Stepping platforms
  fillRect(map, 4, H - 5, 3, 1, 2);
  fillRect(map, 10, H - 7, 4, 1, 2);
  fillRect(map, 16, H - 5, 3, 1, 2);
  // Ground-level lava pool (2 tiles wide — jumpable)
  fillRect(map, 8, H - 3, 2, 1, 3);
  // Lava glow decoration above pool
  map[H - 4][8] = 8;
  map[H - 4][9] = 8;
  // Rock formations
  fillRect(map, 2, H - 6, 1, 3, 1);
  fillRect(map, 14, H - 6, 1, 3, 1);

  // ===== SECTION 2: Lava Caves (x: 20–41) =====
  fillRect(map, 20, H - 3, 22, 2, 1);
  // Platforms above
  fillRect(map, 24, H - 6, 3, 1, 2);
  fillRect(map, 34, H - 8, 3, 1, 2);
  fillRect(map, 38, H - 10, 3, 1, 2);
  // Ground-level lava gaps (2 tiles wide — jumpable)
  fillRect(map, 28, H - 3, 2, 1, 3);
  fillRect(map, 37, H - 3, 2, 1, 3);
  // Lava glow decorations
  map[H - 4][28] = 8;
  map[H - 4][29] = 8;
  map[H - 4][37] = 8;
  map[H - 4][38] = 8;
  // Small rock pillars (1 tile — player can walk around)
  map[H - 4][22] = 1;
  map[H - 4][31] = 1;
  // High cave ceiling decorations
  fillRect(map, 25, H - 12, 1, 2, 8);
  fillRect(map, 33, H - 13, 1, 3, 8);

  // ===== SECTION 3: Volcano Ascent (x: 42–61) =====
  fillRect(map, 42, H - 3, 20, 2, 1);
  // Stepping-stone platforms climbing upward
  fillRect(map, 44, H - 5, 3, 1, 2);
  fillRect(map, 48, H - 7, 3, 1, 2);
  fillRect(map, 52, H - 9, 3, 1, 2);
  fillRect(map, 56, H - 7, 3, 1, 2);
  // Small lava pool at ground level (2 tiles)
  fillRect(map, 50, H - 3, 2, 1, 3);
  map[H - 4][50] = 8;
  map[H - 4][51] = 8;
  // Volcanic rock walls
  fillRect(map, 42, H - 3, 1, 8, 1);   // left wall
  fillRect(map, 42, H - 10, 3, 1, 1);  // top lintel
  // Decorative magma veins
  fillRect(map, 46, H - 11, 1, 2, 8);
  fillRect(map, 54, H - 12, 1, 3, 8);
  fillRect(map, 58, H - 10, 1, 2, 8);

  // ===== SECTION 4: Puzzle Area — Gamelan Chamber (x: 52–51 area, door at 52) =====
  // The puzzle door is at x=52, y=H-5. Make an ornate volcanic frame.
  fillRect(map, 51, H - 7, 1, 4, 1);   // left frame
  fillRect(map, 54, H - 7, 1, 4, 1);   // right frame
  fillRect(map, 50, H - 7, 6, 1, 1);   // top lintel
  // Puzzle door tile (tile 10)
  map[H - 5][52] = 10;
  // Note: puzzle door is placed in the volcano ascent section,
  // accessible via the platforms at x=52, y=H-9
  // Platform above puzzle door
  fillRect(map, 50, H - 11, 5, 1, 2);

  // ===== SECTION 5: Crater Rim (x: 62–79) =====
  fillRect(map, 62, H - 3, 18, 2, 1);
  // Platforms at various heights
  fillRect(map, 66, H - 6, 3, 1, 2);
  fillRect(map, 70, H - 8, 3, 1, 2);
  fillRect(map, 74, H - 5, 3, 1, 2);
  // Ground-level lava gap (2 tiles — jumpable)
  fillRect(map, 70, H - 3, 2, 1, 3);
  map[H - 4][70] = 8;
  map[H - 4][71] = 8;
  // Volcanic columns
  fillRect(map, 64, H - 8, 1, 5, 1);
  fillRect(map, 72, H - 10, 1, 7, 1);
  fillRect(map, 77, H - 7, 1, 4, 1);
  // Decorative smoke/steam
  fillRect(map, 65, H - 11, 1, 2, 8);
  fillRect(map, 73, H - 13, 1, 3, 8);

  // ===== SECTION 6: Boss Arena — Kawah Naga (x: 80–99) =====
  fillRect(map, 80, H - 3, 20, 2, 1);
  // Arena walls
  fillRect(map, 80, H - 3, 1, 10, 1);  // left wall
  fillRect(map, 99, H - 3, 1, 10, 1);  // right wall
  // Platforms for dodging Naga Api attacks
  fillRect(map, 84, H - 7, 2, 1, 2);
  fillRect(map, 92, H - 7, 2, 1, 2);
  fillRect(map, 88, H - 10, 3, 1, 2);  // high center platform
  // Decorative lava pool at ground level (not blocking path)
  fillRect(map, 87, H - 3, 3, 1, 3);
  map[H - 4][87] = 8;
  map[H - 4][88] = 8;
  map[H - 4][89] = 8;
  // Volcanic rock pillars
  fillRect(map, 82, H - 9, 1, 6, 1);
  fillRect(map, 97, H - 9, 1, 6, 1);
  // Smoke decorations
  fillRect(map, 83, H - 12, 1, 3, 8);
  fillRect(map, 96, H - 11, 1, 2, 8);

  // ===== SPECIAL TILES =====
  // Boss altar (tile 12) — glowing summoning circle at crater center
  map[H - 4][90] = 12;

  // Exit door (tile 11) — blocked until boss defeated
  map[H - 5][99] = 11;

  // Checkpoints (tile 9)
  map[H - 4][20] = 9;
  map[H - 4][42] = 9;
  map[H - 4][62] = 9;

  return map;
}

export function spawnEntities(H) {
  const enemies = [];
  const items = [];
  const npcs = [];
  const puzzleTriggers = [];

  // --- Enemies ---
  // Section 1: Mountain base
  enemies.push(createEnemy(15, H - 4, 'iblis_kecil'));
  // Section 2: Lava caves
  enemies.push(createEnemy(25, H - 4, 'golem_api'));
  enemies.push(createEnemy(35, H - 6, 'iblis_kecil'));
  // Section 3: Volcano ascent
  enemies.push(createEnemy(45, H - 4, 'iblis_kecil'));
  enemies.push(createEnemy(55, H - 4, 'golem_api'));
  // Section 5: Crater rim
  enemies.push(createEnemy(65, H - 6, 'iblis_kecil'));
  enemies.push(createEnemy(75, H - 4, 'golem_api'));
  // Section 6: Boss approach
  enemies.push(createEnemy(82, H - 4, 'iblis_kecil'));

  // --- Items ---
  // Health potions
  items.push(createItem(10, H - 8, 'potion', 'health'));
  items.push(createItem(50, H - 10, 'potion', 'health'));
  // Stamina potion
  items.push(createItem(30, H - 9, 'potion', 'stamina'));
  // Kristal
  items.push(createItem(50, H - 12, 'kristal'));
  // Rupiah drops
  items.push(createItem(40, H - 8, 'rupiah'));
  items.push(createItem(70, H - 8, 'rupiah'));
  // Equipment drop
  items.push(createItem(60, H - 10, 'equipment', 'armor_kulit'));

  // --- NPCs ---
  npcs.push(createNPC(5, H - 4, 'Pak Pandu', [
    'Gunung Bromo... tanah api yang membara.',
    'Iblis kecil menyerang dari jauh — hindari bola apinya!',
    'Golem api lambat tapi kuat — serang dari belakang.',
    'Aku punya ramuan tahan api.',
  ], 'pedagang'));

  // --- Puzzle Triggers ---
  puzzleTriggers.push(createPuzzleTrigger(52, H - 4));

  return { enemies, items, npcs, puzzleTriggers };
}
