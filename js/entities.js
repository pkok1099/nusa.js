// ============================================================
// entities.js — Entity factory functions (enemies, items, NPCs, puzzles, boss)
// ============================================================

import { TILE, LEVEL_H, BOSS_MAX_POSTURE } from './config.js';

export function createEnemy(x, y, type, hp, speed) {
  return {
    type: 'enemy', enemyType: type, x: x * TILE, y: y * TILE,
    w: type === 'patung' ? 28 : 20, h: type === 'patung' ? 34 : 24,
    hp, maxHp: hp, vx: speed, vy: 0,
    facing: 1, grounded: false,
    patrol: { left: (x - 3) * TILE, right: (x + 3) * TILE },
    attackTimer: 0, hurtTimer: 0, alive: true,
    animFrame: 0, animTimer: 0,
    prevY: y * TILE,
    attackCooldown: 0,
    isTelegraphing: false, telegraphTimer: 0,
    isAttacking: false, attackAnimTimer: 0,
    staggered: false, staggerTimer: 0,
  };
}

export function createItem(x, y, type) {
  return {
    type: 'item', itemType: type, x: x * TILE, y: y * TILE,
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

export function createBoss(x, y) {
  return {
    type: 'boss', x: x * TILE, y: y * TILE, w: 48, h: 56,
    hp: 350, maxHp: 350, vx: 1.5, vy: 0,
    facing: -1, grounded: false, alive: true,
    phase: 1, attackTimer: 0, attackPattern: 0,
    hurtTimer: 0, invincible: 0,
    animFrame: 0, animTimer: 0,
    patrol: { left: 68 * TILE, right: 78 * TILE },
    prevY: y * TILE,
    telegraphTimer: 0, telegraphType: '', isTelegraphing: false,
    posture: 0, maxPosture: BOSS_MAX_POSTURE,
    staggered: false, staggerTimer: 0,
    recoveryTimer: 0,
    attackExecuted: false,
  };
}

export function spawnEntities() {
  const entities = [];
  const H = LEVEL_H;

  // Enemies
  entities.push(createEnemy(14, H - 4, 'batu_kecil', 20, 1));
  entities.push(createEnemy(24, H - 4, 'batu_kecil', 20, 1));
  entities.push(createEnemy(35, H - 7, 'batu_kecil', 25, 1));
  entities.push(createEnemy(42, H - 4, 'patung', 35, 1.5));
  entities.push(createEnemy(57, H - 4, 'patung', 35, 1.5));
  entities.push(createEnemy(62, H - 4, 'batu_kecil', 25, 1));

  // Items
  entities.push(createItem(11, H - 8, 'potion'));
  entities.push(createItem(41, H - 9, 'kristal'));
  entities.push(createItem(60, H - 10, 'kunci'));
  entities.push(createItem(7, H - 7, 'rupiah'));
  entities.push(createItem(36, H - 7, 'rupiah'));
  entities.push(createItem(56, H - 8, 'rupiah'));

  // NPC
  entities.push(createNPC(6, H - 4, 'Mbah Darmo', [
    'Selamat datang, Anak Muda!',
    'Aku sudah lama menunggu keturunan pahlawan ini.',
    'Ambil ramuan ini, kamu akan membutuhkannya.',
    'Hati-hati di dalam candi... Penjaga Batu tidak berkompromi.',
  ], 'pedagang'));

  // Puzzle trigger
  entities.push(createPuzzleTrigger(54, H - 4));

  return entities;
}
