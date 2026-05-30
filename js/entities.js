// ============================================================
// entities.js — Entity factory functions (enemies, items, NPCs, puzzles, boss)
// ============================================================

import { TILE, BOSS_MAX_POSTURE, STAGES } from './config.js';

// Enemy stat definitions per type
const ENEMY_DEFS = {
  batu_kecil:    { w: 20, h: 24, hp: 20, speed: 1, damage: 10, contactDmg: 5, exp: 10, rupiahDrop: 10 },
  patung:        { w: 28, h: 34, hp: 35, speed: 1.5, damage: 15, contactDmg: 8, exp: 20, rupiahDrop: 15 },
  harimau:       { w: 30, h: 22, hp: 25, speed: 2.5, damage: 18, contactDmg: 10, exp: 15, rupiahDrop: 15 },
  ular:          { w: 24, h: 16, hp: 18, speed: 0.8, damage: 12, contactDmg: 5, exp: 12, rupiahDrop: 10 },
  iblis_kecil:   { w: 20, h: 24, hp: 22, speed: 1.2, damage: 14, contactDmg: 5, exp: 18, rupiahDrop: 20 },
  golem_api:     { w: 32, h: 36, hp: 60, speed: 0.6, damage: 20, contactDmg: 12, exp: 25, rupiahDrop: 25 },
  ikan_pedang:   { w: 24, h: 18, hp: 20, speed: 3.0, damage: 16, contactDmg: 8, exp: 14, rupiahDrop: 12 },
  ubur_ubur:     { w: 22, h: 28, hp: 15, speed: 0.3, damage: 10, contactDmg: 6, exp: 10, rupiahDrop: 8 },
  prajurit_jahat: { w: 24, h: 34, hp: 40, speed: 1.8, damage: 20, contactDmg: 10, exp: 22, rupiahDrop: 20 },
  raksasa_kecil: { w: 28, h: 32, hp: 50, speed: 1.0, damage: 22, contactDmg: 12, exp: 20, rupiahDrop: 25 },
};

// Stage-appropriate equipment drop tables
// Each entry: { weapons: [], armors: [], accessories: [] }
const STAGE_DROPS = [
  // Stage 0: Candi Borobudur — basic tier
  { weapons: ['keris'], armors: ['kain'], accessories: ['cincin_besi'] },
  // Stage 1: Hutan Borneo — forest tier
  { weapons: ['pedang'], armors: ['kulit'], accessories: ['kalung_batu'] },
  // Stage 2: Gunung Bromo — fire tier
  { weapons: ['tombak'], armors: ['besi'], accessories: ['gelang_emas'] },
  // Stage 3: Laut Bali — water tier
  { weapons: ['panah_api'], armors: ['perak'], accessories: ['cincin_naga'] },
  // Stage 4: Candi Prambanan — endgame
  { weapons: ['keris_emas', 'trisula'], armors: ['emas', 'naga'], accessories: ['kalung_dewa', 'gelang_angin'] },
];

// Boss guaranteed drops per stage
const BOSS_DROPS = [
  { type: 'equipment', subType: 'weapon_pedang' },     // Stage 0 boss drops pedang
  { type: 'equipment', subType: 'armor_kulit' },       // Stage 1 boss drops kulit
  { type: 'equipment', subType: 'accessory_gelang_emas' }, // Stage 2 boss drops gelang_emas
  { type: 'equipment', subType: 'armor_perak' },       // Stage 3 boss drops perak
  { type: 'equipment', subType: 'weapon_trisula' },    // Stage 4 boss drops trisula
];

// Drop rate constants
const COMMON_DROP_RATE = 0.05;   // 5% for common enemies
const ELITE_DROP_RATE = 0.15;    // 15% for elite enemies (patung, golem_api, prajurit_jahat, raksasa_kecil)
const BOSS_DROP_RATE = 1.0;      // 100% for bosses

const ELITE_TYPES = ['patung', 'golem_api', 'prajurit_jahat', 'raksasa_kecil'];

export function createEnemy(x, y, type) {
  const def = ENEMY_DEFS[type] || ENEMY_DEFS.batu_kecil;
  return {
    type: 'enemy', enemyType: type,
    x: x * TILE, y: y * TILE,
    w: def.w, h: def.h,
    hp: def.hp, maxHp: def.hp,
    vx: def.speed, vy: 0,
    facing: 1, grounded: false,
    patrol: { left: (x - 3) * TILE, right: (x + 3) * TILE },
    attackTimer: 0, hurtTimer: 0, alive: true,
    animFrame: 0, animTimer: 0,
    prevY: y * TILE,
    attackCooldown: 0,
    isTelegraphing: false, telegraphTimer: 0,
    isAttacking: false, attackAnimTimer: 0,
    staggered: false, staggerTimer: 0,
    // Extra properties for specific enemy types
    damage: def.damage,
    contactDmg: def.contactDmg,
    exp: def.exp,
    rupiahDrop: def.rupiahDrop,
    // Special states
    poisonTimer: 0,      // for ular poison
    fireballTimer: 0,     // for iblis_kecil ranged
    stunTimer: 0,         // for ubur_ubur stun
    blockTimer: 0,        // for prajurit_jahat blocking
    rockTimer: 0,         // for raksasa_kecil rock throw
  };
}

export function createItem(x, y, type, subType) {
  return {
    type: 'item', itemType: type, subType: subType || null,
    x: x * TILE, y: y * TILE,
    w: 16, h: 16, collected: false, bobOffset: Math.random() * Math.PI * 2,
  };
}

export function createNPC(x, y, name, dialog, npcType) {
  return {
    type: 'npc', npcType, name, x: x * TILE, y: (y - 1) * TILE,
    w: 24, h: 36, dialog, dialogIndex: 0,
    interacted: false, bobOffset: Math.random() * Math.PI * 2,
  };
}

export function createPuzzleTrigger(x, y) {
  return {
    type: 'puzzleTrigger', x: x * TILE, y: y * TILE, w: 32, h: 48,
    activated: false,
  };
}

export function createBoss(x, y, stageId) {
  const stage = STAGES[stageId] || STAGES[0];
  return {
    type: 'boss', stageId: stageId || 0,
    x: x * TILE, y: y * TILE,
    w: stage.bossW, h: stage.bossH,
    hp: stage.bossHp, maxHp: stage.bossHp,
    vx: stage.bossSpeed, vy: 0,
    facing: -1, grounded: false, alive: true,
    phase: 1, attackTimer: 0, attackPattern: 0,
    hurtTimer: 0, invincible: 0,
    animFrame: 0, animTimer: 0,
    patrol: { left: (x - 5) * TILE, right: (x + 5) * TILE },
    prevY: y * TILE,
    telegraphTimer: 0, telegraphType: '', isTelegraphing: false,
    posture: 0, maxPosture: BOSS_MAX_POSTURE,
    staggered: false, staggerTimer: 0,
    recoveryTimer: 0,
    attackExecuted: false,
    // Boss name for display
    bossName: stage.bossName,
    // Special attack states
    specialTimer: 0,
    summonCount: 0,
    projectileAngle: 0,
  };
}

// Get a random equipment drop for a given stage
function getRandomEquipmentDrop(stageId) {
  const drops = STAGE_DROPS[stageId] || STAGE_DROPS[0];
  const roll = Math.random();
  if (roll < 0.5) {
    // Weapon
    const weapons = drops.weapons;
    const pick = weapons[Math.floor(Math.random() * weapons.length)];
    return { type: 'equipment', subType: `weapon_${pick}` };
  } else if (roll < 0.85) {
    // Armor
    const armors = drops.armors;
    const pick = armors[Math.floor(Math.random() * armors.length)];
    return { type: 'equipment', subType: `armor_${pick}` };
  } else {
    // Accessory
    const accessories = drops.accessories;
    const pick = accessories[Math.floor(Math.random() * accessories.length)];
    return { type: 'equipment', subType: `accessory_${pick}` };
  }
}

// Create an equipment item entity from a drop spec
function createEquipmentDrop(x, y, subType) {
  return createItem(x, y, 'equipment', subType);
}

// Spawn entities per stage
export function spawnEntities(stageId) {
  const entities = [];
  const sid = stageId || 0;
  const stage = STAGES[sid];
  const H = stage ? stage.height : 20;

  if (sid === 0) {
    // Stage 0: Candi Borobudur
    entities.push(createEnemy(14, H - 4, 'batu_kecil'));
    entities.push(createEnemy(24, H - 4, 'batu_kecil'));
    entities.push(createEnemy(35, H - 7, 'batu_kecil'));
    entities.push(createEnemy(42, H - 4, 'patung'));
    entities.push(createEnemy(57, H - 4, 'patung'));
    entities.push(createEnemy(62, H - 4, 'batu_kecil'));

    // Items
    entities.push(createItem(11, H - 8, 'potion', 'health'));
    entities.push(createItem(41, H - 9, 'kristal'));
    entities.push(createItem(60, H - 10, 'kunci'));
    entities.push(createItem(7, H - 7, 'rupiah'));
    entities.push(createItem(36, H - 7, 'rupiah'));
    entities.push(createItem(56, H - 8, 'rupiah'));

    // NPC
    entities.push(createNPC(6, H - 4, 'Mbah Darmo', [
      'Selamat datang, Anak Muda!',
      'Aku sudah lama menunggu keturunan pahlawan ini.',
      'Aku bisa menjual perlengkapan untuk perjalananmu.',
      'Hati-hati di dalam candi... Penjaga Batu tidak berkompromi.',
    ], 'pedagang'));

    // Puzzle trigger
    entities.push(createPuzzleTrigger(54, H - 4));
  } else if (sid === 1) {
    // Stage 1: Hutan Borneo
    entities.push(createEnemy(15, H - 4, 'harimau'));
    entities.push(createEnemy(25, H - 4, 'ular'));
    entities.push(createEnemy(35, H - 6, 'harimau'));
    entities.push(createEnemy(45, H - 4, 'ular'));
    entities.push(createEnemy(55, H - 4, 'harimau'));
    entities.push(createEnemy(60, H - 6, 'ular'));
    entities.push(createEnemy(68, H - 4, 'harimau'));
    entities.push(createEnemy(75, H - 4, 'ular'));

    // Items
    entities.push(createItem(10, H - 7, 'potion', 'health'));
    entities.push(createItem(30, H - 8, 'potion', 'health'));
    entities.push(createItem(50, H - 9, 'kristal'));
    entities.push(createItem(65, H - 7, 'rupiah'));
    entities.push(createItem(40, H - 7, 'rupiah'));
    entities.push(createItem(20, H - 10, 'equipment', 'weapon_pedang'));

    // NPC
    entities.push(createNPC(5, H - 4, 'Siti Hutan', [
      'Hutan ini berbahaya, Anak Muda.',
      'Harimau-harimau menyerang dengan cepat.',
      'Ular bisa meracumimu — waspadai gigitannya!',
      'Aku punya ramuan jika kamu butuh.',
    ], 'pedagang'));

    entities.push(createPuzzleTrigger(58, H - 4));
  } else if (sid === 2) {
    // Stage 2: Gunung Bromo
    entities.push(createEnemy(15, H - 4, 'iblis_kecil'));
    entities.push(createEnemy(25, H - 4, 'golem_api'));
    entities.push(createEnemy(35, H - 6, 'iblis_kecil'));
    entities.push(createEnemy(45, H - 4, 'iblis_kecil'));
    entities.push(createEnemy(55, H - 4, 'golem_api'));
    entities.push(createEnemy(65, H - 6, 'iblis_kecil'));
    entities.push(createEnemy(75, H - 4, 'golem_api'));
    entities.push(createEnemy(80, H - 4, 'iblis_kecil'));

    // Items
    entities.push(createItem(10, H - 8, 'potion', 'health'));
    entities.push(createItem(30, H - 9, 'potion', 'stamina'));
    entities.push(createItem(50, H - 10, 'kristal'));
    entities.push(createItem(70, H - 8, 'rupiah'));
    entities.push(createItem(40, H - 8, 'rupiah'));
    entities.push(createItem(60, H - 10, 'equipment', 'armor_kulit'));

    // NPC
    entities.push(createNPC(5, H - 4, 'Pak Pandu', [
      'Gunung Bromo... tanah api yang membara.',
      'Iblis kecil menyerang dari jauh — hindari bola apinya!',
      'Golem api lambat tapi kuat — serang dari belakang.',
      'Aku punya ramuan tahan api.',
    ], 'pedagang'));

    entities.push(createPuzzleTrigger(62, H - 4));
  } else if (sid === 3) {
    // Stage 3: Laut Bali
    entities.push(createEnemy(15, H - 4, 'ikan_pedang'));
    entities.push(createEnemy(25, H - 4, 'ubur_ubur'));
    entities.push(createEnemy(35, H - 6, 'ikan_pedang'));
    entities.push(createEnemy(45, H - 4, 'ubur_ubur'));
    entities.push(createEnemy(55, H - 4, 'ikan_pedang'));
    entities.push(createEnemy(65, H - 6, 'ubur_ubur'));
    entities.push(createEnemy(75, H - 4, 'ikan_pedang'));
    entities.push(createEnemy(80, H - 4, 'ikan_pedang'));
    entities.push(createEnemy(85, H - 4, 'ubur_ubur'));

    // Items
    entities.push(createItem(10, H - 8, 'potion', 'health'));
    entities.push(createItem(30, H - 9, 'potion', 'health'));
    entities.push(createItem(50, H - 10, 'potion', 'stamina'));
    entities.push(createItem(70, H - 8, 'kristal'));
    entities.push(createItem(40, H - 8, 'rupiah'));
    entities.push(createItem(60, H - 10, 'equipment', 'accessory_kalung_batu'));

    // NPC
    entities.push(createNPC(5, H - 4, 'Nyi Roro Kidul', [
      'Laut ini milikku, tapi aku mengizinkanmu lewat.',
      'Ikan pedang sangat cepat — waspadai serangan baliknya.',
      'Ubur-ubur bisa melumpuhkanmu — hindari sentuhannya!',
      'Ambil ramuan ini sebelum terlambat.',
    ], 'pedagang'));

    entities.push(createPuzzleTrigger(65, H - 4));
  } else if (sid === 4) {
    // Stage 4: Candi Prambanan
    entities.push(createEnemy(15, H - 4, 'prajurit_jahat'));
    entities.push(createEnemy(25, H - 4, 'raksasa_kecil'));
    entities.push(createEnemy(35, H - 6, 'prajurit_jahat'));
    entities.push(createEnemy(45, H - 4, 'prajurit_jahat'));
    entities.push(createEnemy(55, H - 4, 'raksasa_kecil'));
    entities.push(createEnemy(65, H - 6, 'prajurit_jahat'));
    entities.push(createEnemy(75, H - 4, 'raksasa_kecil'));
    entities.push(createEnemy(80, H - 4, 'raksasa_kecil'));
    entities.push(createEnemy(85, H - 4, 'prajurit_jahat'));
    entities.push(createEnemy(90, H - 4, 'prajurit_jahat'));

    // Items
    entities.push(createItem(10, H - 8, 'potion', 'health'));
    entities.push(createItem(30, H - 9, 'potion', 'health'));
    entities.push(createItem(50, H - 10, 'potion', 'stamina'));
    entities.push(createItem(70, H - 8, 'kristal'));
    entities.push(createItem(40, H - 8, 'rupiah'));
    entities.push(createItem(60, H - 10, 'kunci'));
    entities.push(createItem(85, H - 10, 'equipment', 'weapon_keris_emas'));

    // NPC
    entities.push(createNPC(5, H - 4, 'Resi Wisrawa', [
      'Candi Prambanan... tempat terakhir perjuanganmu.',
      'Prajurit jahat bisa menangkis seranganmu — cari celah!',
      'Raksasa kecil melempar batu dari jauh.',
      'Raksasa Terakhir memiliki kekuatan semua boss sebelumnya.',
      'Semoga dewa melindungimu, Arjuna.',
    ], 'pedagang'));

    entities.push(createPuzzleTrigger(70, H - 4));
  }

  return entities;
}

// Export drop utility functions for use in player.js (enemy/boss kill drops)
export function getEquipmentDropRate(enemyType) {
  if (ELITE_TYPES.includes(enemyType)) return ELITE_DROP_RATE;
  return COMMON_DROP_RATE;
}

export function getRandomEquipmentDropForStage(stageId) {
  return getRandomEquipmentDrop(stageId);
}

export function getBossDrop(stageId) {
  return BOSS_DROPS[stageId] || BOSS_DROPS[0];
}

