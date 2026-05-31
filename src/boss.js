// ============================================================
// boss.js — Boss update logic and attack execution for 5 bosses
// ============================================================

import {
  GRAVITY, MAX_FALL, BOSS_MAX_POSTURE, BOSS_POSTURE_RECOVERY,
  BOSS_RECOVERY_FRAMES, BOSS_STAGGER_DURATION, C,
} from './config.js';
import { playSound } from './audio.js';
import { tileCollision } from './physics.js';
import { spawnParticle, spawnFloatingText, particles as particlesList } from './particles.js';
import { damagePlayer } from './player.js';

// Boss summon queue (consumed by game.js)
export const bossSummonQueue = [];

export function updateBoss(boss, bossActive, hitStopTimer, player) {
  if (!boss || !boss.alive || !bossActive) return;
  if (hitStopTimer > 0) return;

  if (boss.hurtTimer > 0) boss.hurtTimer--;
  if (boss.invincible > 0) boss.invincible--;

  // Posture recovery
  if (!boss.staggered && boss.posture > 0)
    boss.posture = Math.max(0, boss.posture - BOSS_POSTURE_RECOVERY);

  // Staggered
  if (boss.staggered) {
    boss.staggerTimer--;
    if (boss.staggerTimer <= 0) { boss.staggered = false; boss.posture = 0; }
    boss.vx = 0;
    applyBossGravity(boss);
    return;
  }

  boss.prevY = boss.y;
  // NOTE: Gravity is NOT applied here because applyBossGravity()
  // is called in ALL code paths below (recovery, telegraph, chase).
  // Adding it here would cause double gravity during recovery/telegraph.

  // Phase
  const hpPct = boss.hp / boss.maxHp;
  if (hpPct > 0.66) boss.phase = 1;
  else if (hpPct > 0.33) boss.phase = 2;
  else boss.phase = 3;

  // Souls-like v0.7.1: Phase 2 transition (dramatic pause at 50% HP)
  if (boss.phase >= 2 && !boss.phase2Transitioned) {
    boss.phase2Transitioned = true;
    boss.recoveryTimer = 60; // Long pause for dramatic effect
    boss.isTelegraphing = false;
    // Visual: burst of particles + screen shake
    spawnParticle(boss.x + boss.w / 2, boss.y + boss.h / 2, C.red, 30, 8, 50);
    spawnParticle(boss.x + boss.w / 2, boss.y + boss.h / 2, C.goldLight, 20, 6, 40);
    spawnFloatingText(boss.x + boss.w / 2, boss.y - 30, 'PHASE 2!', C.red);
    playSound('boss');
  }

  // Recovery
  if (boss.recoveryTimer > 0) {
    boss.recoveryTimer--;
    boss.vx = 0;

    // BUG FIX v0.6.2: Frame-based clawCombo hits instead of setTimeout
    if (boss.comboHits > 0) {
      boss.comboHitTimer++;
      if (boss.comboHitTimer % 10 === 0 && boss.alive) {
        const atkBox = {
          x: boss.facing > 0 ? boss.x + boss.w : boss.x - 60,
          y: boss.y, w: 60, h: boss.h,
        };
        const checkOverlapCb = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
        if (checkOverlapCb(player, atkBox) && player.invincible <= 0) {
          const dmgMult = boss.phase === 3 ? 1.5 : (boss.phase === 2 ? 1.2 : 1.0);
          damagePlayer(Math.floor(15 * dmgMult));
        }
        spawnParticle(boss.x + boss.w / 2 + boss.facing * 30, boss.y + boss.h / 2, C.goldDark, 5, 3);
        boss.comboHits--;
        if (boss.comboHits <= 0) {
          boss.comboHits = 0;
          boss.comboHitTimer = 0;
        }
      }
    }

    applyBossGravity(boss);
    return;
  }

  // Telegraphing
  if (boss.isTelegraphing) {
    boss.telegraphTimer--;
    boss.vx = 0;
    if (boss.telegraphTimer <= 0) {
      executeBossAttack(boss, player);
      boss.isTelegraphing = false;
      boss.recoveryTimer = BOSS_RECOVERY_FRAMES;
    }
    applyBossGravity(boss);
    return;
  }

  // Apply gravity for chase state
  boss.vy += GRAVITY;
  if (boss.vy > MAX_FALL) boss.vy = MAX_FALL;

  // Chase player
  const dx = (player.x + player.w / 2) - (boss.x + boss.w / 2);
  boss.facing = dx > 0 ? 1 : -1;

  // Boss-type specific chase speed
  let moveSpeed = getBossChaseSpeed(boss);
  boss.vx = boss.facing * moveSpeed;

  // Attack pattern selection
  boss.attackTimer++;
  let attackThreshold = getBossAttackThreshold(boss);

  if (boss.attackTimer > attackThreshold) {
    boss.attackTimer = 0;
    chooseBossAttack(boss, dx, player);
  }

  // Move X
  boss.x += boss.vx;
  const colsX = tileCollision(boss.x, boss.y, boss.w, boss.h, boss.prevY);
  colsX.forEach(c => {
    if (c.oneway) return;
    if (boss.vx > 0) boss.x = c.x - boss.w;
    else if (boss.vx < 0) boss.x = c.x + c.w;
  });

  // Move Y
  boss.y += boss.vy;
  boss.grounded = false;
  const colsY = tileCollision(boss.x, boss.y, boss.w, boss.h, boss.prevY);
  colsY.forEach(c => {
    if (boss.vy > 0) { boss.y = c.y - boss.h; boss.vy = 0; boss.grounded = true; }
    else if (boss.vy < 0 && !c.oneway) { boss.y = c.y + c.h; boss.vy = 0; }
  });

  // Contact damage
  const checkOverlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  if (!boss.isTelegraphing && boss.recoveryTimer <= 0 && checkOverlap(player, boss) && player.invincible <= 0) {
    damagePlayer(10 + boss.stageId * 3);
  }

  boss.animTimer++;
  if (boss.animTimer > 12) { boss.animTimer = 0; boss.animFrame = (boss.animFrame + 1) % 2; }
}

function applyBossGravity(boss) {
  // BUG FIX v0.6.2: Add gravity acceleration here too,
  // otherwise boss floats during stagger/recovery
  boss.vy += GRAVITY;
  if (boss.vy > MAX_FALL) boss.vy = MAX_FALL;
  boss.y += boss.vy;
  boss.grounded = false;
  const colsY = tileCollision(boss.x, boss.y, boss.w, boss.h, boss.prevY);
  colsY.forEach(c => {
    if (boss.vy > 0) { boss.y = c.y - boss.h; boss.vy = 0; boss.grounded = true; }
    else if (boss.vy < 0 && !c.oneway) { boss.y = c.y + c.h; boss.vy = 0; }
  });
}

function getBossChaseSpeed(boss) {
  const sid = boss.stageId || 0;
  const base = [1.2, 1.5, 1.8, 1.4, 2.0][sid] || 1.2;
  if (boss.phase === 3) return base * 1.5;
  if (boss.phase === 2) return base * 1.25;
  return base;
}

function getBossAttackThreshold(boss) {
  const sid = boss.stageId || 0;
  const base = [100, 80, 70, 75, 60][sid] || 100;
  if (boss.phase === 3) return base * 0.55;
  if (boss.phase === 2) return base * 0.75;
  return base;
}

// ---- Boss attack selection per type ----
function chooseBossAttack(boss, dx, player) {
  const sid = boss.stageId || 0;
  const absDx = Math.abs(dx);

  switch (sid) {
    case 0: choosePenjagaBatuAttack(boss, absDx); break;
    case 1: chooseRajaHutanAttack(boss, absDx); break;
    case 2: chooseNagaApiAttack(boss, absDx); break;
    case 3: chooseRaksasaLautAttack(boss, absDx); break;
    case 4: chooseRaksasaTerakhirAttack(boss, absDx); break;
    default: choosePenjagaBatuAttack(boss, absDx); break;
  }
}

// Boss 0: Penjaga Batu — armSwipe, groundPound, throwRocks, charge, aoeStomp
function choosePenjagaBatuAttack(boss, absDx) {
  if (boss.phase === 1) {
    if (absDx < 120) {
      if (Math.random() < 0.5) {
        boss.isTelegraphing = true; boss.telegraphType = 'armSwipe'; boss.telegraphTimer = 30;
      } else {
        boss.isTelegraphing = true; boss.telegraphType = 'groundPound'; boss.telegraphTimer = 40;
      }
    }
  } else if (boss.phase === 2) {
    const r = Math.random();
    if (r < 0.35) { boss.isTelegraphing = true; boss.telegraphType = 'armSwipe'; boss.telegraphTimer = 20; }
    else if (r < 0.7) { boss.isTelegraphing = true; boss.telegraphType = 'throwRocks'; boss.telegraphTimer = 25; }
    else { boss.isTelegraphing = true; boss.telegraphType = 'charge'; boss.telegraphTimer = 45; }
  } else {
    const r = Math.random();
    if (r < 0.25) { boss.isTelegraphing = true; boss.telegraphType = 'armSwipe'; boss.telegraphTimer = 15; }
    else if (r < 0.45) { boss.isTelegraphing = true; boss.telegraphType = 'throwRocks'; boss.telegraphTimer = 18; }
    else if (r < 0.65) { boss.isTelegraphing = true; boss.telegraphType = 'aoeStomp'; boss.telegraphTimer = 35; }
    else if (r < 0.85) { boss.isTelegraphing = true; boss.telegraphType = 'charge'; boss.telegraphTimer = 30; }
    else { boss.isTelegraphing = true; boss.telegraphType = 'throwRocks5'; boss.telegraphTimer = 18; }
  }
}

// Boss 1: Raja Hutan — pounce, clawCombo, summonMinions, roar (stun)
function chooseRajaHutanAttack(boss, absDx) {
  if (boss.phase === 1) {
    const r = Math.random();
    if (r < 0.5) { boss.isTelegraphing = true; boss.telegraphType = 'pounce'; boss.telegraphTimer = 25; }
    else { boss.isTelegraphing = true; boss.telegraphType = 'clawCombo'; boss.telegraphTimer = 20; }
  } else if (boss.phase === 2) {
    const r = Math.random();
    if (r < 0.3) { boss.isTelegraphing = true; boss.telegraphType = 'pounce'; boss.telegraphTimer = 18; }
    else if (r < 0.55) { boss.isTelegraphing = true; boss.telegraphType = 'clawCombo'; boss.telegraphTimer = 15; }
    else if (r < 0.8) { boss.isTelegraphing = true; boss.telegraphType = 'summonMinions'; boss.telegraphTimer = 30; }
    else { boss.isTelegraphing = true; boss.telegraphType = 'roar'; boss.telegraphTimer = 25; }
  } else {
    const r = Math.random();
    if (r < 0.2) { boss.isTelegraphing = true; boss.telegraphType = 'pounce'; boss.telegraphTimer = 12; }
    else if (r < 0.4) { boss.isTelegraphing = true; boss.telegraphType = 'clawCombo'; boss.telegraphTimer = 10; }
    else if (r < 0.6) { boss.isTelegraphing = true; boss.telegraphType = 'summonMinions'; boss.telegraphTimer = 20; }
    else if (r < 0.8) { boss.isTelegraphing = true; boss.telegraphType = 'roar'; boss.telegraphTimer = 15; }
    else { boss.isTelegraphing = true; boss.telegraphType = 'groundPound'; boss.telegraphTimer = 30; }
  }
}

// Boss 2: Naga Api — fireBreath, tailSwipe, meteorRain, fireCharge
function chooseNagaApiAttack(boss, absDx) {
  if (boss.phase === 1) {
    const r = Math.random();
    if (r < 0.4) { boss.isTelegraphing = true; boss.telegraphType = 'fireBreath'; boss.telegraphTimer = 30; }
    else if (r < 0.7) { boss.isTelegraphing = true; boss.telegraphType = 'tailSwipe'; boss.telegraphTimer = 20; }
    else { boss.isTelegraphing = true; boss.telegraphType = 'fireCharge'; boss.telegraphTimer = 40; }
  } else if (boss.phase === 2) {
    const r = Math.random();
    if (r < 0.3) { boss.isTelegraphing = true; boss.telegraphType = 'fireBreath'; boss.telegraphTimer = 20; }
    else if (r < 0.5) { boss.isTelegraphing = true; boss.telegraphType = 'tailSwipe'; boss.telegraphTimer = 15; }
    else if (r < 0.75) { boss.isTelegraphing = true; boss.telegraphType = 'meteorRain'; boss.telegraphTimer = 30; }
    else { boss.isTelegraphing = true; boss.telegraphType = 'fireCharge'; boss.telegraphTimer = 25; }
  } else {
    const r = Math.random();
    if (r < 0.2) { boss.isTelegraphing = true; boss.telegraphType = 'fireBreath'; boss.telegraphTimer = 15; }
    else if (r < 0.4) { boss.isTelegraphing = true; boss.telegraphType = 'meteorRain'; boss.telegraphTimer = 20; }
    else if (r < 0.6) { boss.isTelegraphing = true; boss.telegraphType = 'fireCharge'; boss.telegraphTimer = 18; }
    else if (r < 0.8) { boss.isTelegraphing = true; boss.telegraphType = 'tailSwipe'; boss.telegraphTimer = 10; }
    else { boss.isTelegraphing = true; boss.telegraphType = 'meteorRain'; boss.telegraphTimer = 15; }
  }
}

// Boss 3: Raksasa Laut — tidalWave, tentacleSlam, whirlpool, frostBreath
function chooseRaksasaLautAttack(boss, absDx) {
  if (boss.phase === 1) {
    const r = Math.random();
    if (r < 0.4) { boss.isTelegraphing = true; boss.telegraphType = 'tentacleSlam'; boss.telegraphTimer = 25; }
    else if (r < 0.7) { boss.isTelegraphing = true; boss.telegraphType = 'frostBreath'; boss.telegraphTimer = 30; }
    else { boss.isTelegraphing = true; boss.telegraphType = 'tidalWave'; boss.telegraphTimer = 35; }
  } else if (boss.phase === 2) {
    const r = Math.random();
    if (r < 0.3) { boss.isTelegraphing = true; boss.telegraphType = 'tentacleSlam'; boss.telegraphTimer = 18; }
    else if (r < 0.5) { boss.isTelegraphing = true; boss.telegraphType = 'frostBreath'; boss.telegraphTimer = 22; }
    else if (r < 0.75) { boss.isTelegraphing = true; boss.telegraphType = 'tidalWave'; boss.telegraphTimer = 25; }
    else { boss.isTelegraphing = true; boss.telegraphType = 'whirlpool'; boss.telegraphTimer = 35; }
  } else {
    const r = Math.random();
    if (r < 0.2) { boss.isTelegraphing = true; boss.telegraphType = 'tentacleSlam'; boss.telegraphTimer = 12; }
    else if (r < 0.4) { boss.isTelegraphing = true; boss.telegraphType = 'tidalWave'; boss.telegraphTimer = 18; }
    else if (r < 0.6) { boss.isTelegraphing = true; boss.telegraphType = 'whirlpool'; boss.telegraphTimer = 25; }
    else if (r < 0.8) { boss.isTelegraphing = true; boss.telegraphType = 'frostBreath'; boss.telegraphTimer = 15; }
    else { boss.isTelegraphing = true; boss.telegraphType = 'aoeStomp'; boss.telegraphTimer = 30; }
  }
}

// Boss 4: Raksasa Terakhir — ALL previous attacks + divineStrike, shieldBash, earthquake, summonPhase
function chooseRaksasaTerakhirAttack(boss, absDx) {
  if (boss.phase === 1) {
    const r = Math.random();
    if (r < 0.25) { boss.isTelegraphing = true; boss.telegraphType = 'divineStrike'; boss.telegraphTimer = 30; }
    else if (r < 0.5) { boss.isTelegraphing = true; boss.telegraphType = 'shieldBash'; boss.telegraphTimer = 25; }
    else if (r < 0.75) { boss.isTelegraphing = true; boss.telegraphType = 'armSwipe'; boss.telegraphTimer = 20; }
    else { boss.isTelegraphing = true; boss.telegraphType = 'charge'; boss.telegraphTimer = 35; }
  } else if (boss.phase === 2) {
    const r = Math.random();
    if (r < 0.2) { boss.isTelegraphing = true; boss.telegraphType = 'divineStrike'; boss.telegraphTimer = 20; }
    else if (r < 0.35) { boss.isTelegraphing = true; boss.telegraphType = 'earthquake'; boss.telegraphTimer = 35; }
    else if (r < 0.5) { boss.isTelegraphing = true; boss.telegraphType = 'fireBreath'; boss.telegraphTimer = 20; }
    else if (r < 0.65) { boss.isTelegraphing = true; boss.telegraphType = 'tentacleSlam'; boss.telegraphTimer = 18; }
    else if (r < 0.8) { boss.isTelegraphing = true; boss.telegraphType = 'summonPhase'; boss.telegraphTimer = 30; }
    else { boss.isTelegraphing = true; boss.telegraphType = 'shieldBash'; boss.telegraphTimer = 15; }
  } else {
    const r = Math.random();
    if (r < 0.15) { boss.isTelegraphing = true; boss.telegraphType = 'divineStrike'; boss.telegraphTimer = 12; }
    else if (r < 0.3) { boss.isTelegraphing = true; boss.telegraphType = 'earthquake'; boss.telegraphTimer = 20; }
    else if (r < 0.4) { boss.isTelegraphing = true; boss.telegraphType = 'fireBreath'; boss.telegraphTimer = 12; }
    else if (r < 0.5) { boss.isTelegraphing = true; boss.telegraphType = 'meteorRain'; boss.telegraphTimer = 15; }
    else if (r < 0.6) { boss.isTelegraphing = true; boss.telegraphType = 'summonPhase'; boss.telegraphTimer = 18; }
    else if (r < 0.7) { boss.isTelegraphing = true; boss.telegraphType = 'tidalWave'; boss.telegraphTimer = 15; }
    else if (r < 0.8) { boss.isTelegraphing = true; boss.telegraphType = 'aoeStomp'; boss.telegraphTimer = 25; }
    else if (r < 0.9) { boss.isTelegraphing = true; boss.telegraphType = 'charge'; boss.telegraphTimer = 12; }
    else { boss.isTelegraphing = true; boss.telegraphType = 'shieldBash'; boss.telegraphTimer = 10; }
  }
}

// Step-based charge movement that respects walls (prevents wall-skip)
function stepCharge(boss, totalDist, stepSize) {
  const dir = totalDist > 0 ? 1 : -1;
  const absDist = Math.abs(totalDist);
  let moved = 0;
  while (moved < absDist) {
    const step = Math.min(stepSize, absDist - moved);
    boss.x += dir * step;
    moved += step;
    const cols = tileCollision(boss.x, boss.y, boss.w, boss.h, boss.prevY);
    let blocked = false;
    cols.forEach(c => {
      if (c.oneway) return;
      if (dir > 0) { boss.x = c.x - boss.w; blocked = true; }
      else { boss.x = c.x + c.w; blocked = true; }
    });
    if (blocked) break;
  }
}

// ---- Execute boss attack ----
export function executeBossAttack(boss, player) {
  const dx = (player.x + player.w / 2) - (boss.x + boss.w / 2);
  const dist = Math.abs(dx);
  const checkOverlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const dmgMult = boss.phase === 3 ? 1.5 : (boss.phase === 2 ? 1.2 : 1.0);

  switch (boss.telegraphType) {
    case 'armSwipe':
      if (dist < 110 && player.invincible <= 0)
        damagePlayer(Math.floor(15 * dmgMult));
      spawnParticle(boss.x + boss.w / 2 + boss.facing * 40, boss.y + boss.h / 2, C.stone, 8, 4);
      playSound('hit');
      break;

    case 'groundPound':
      if (dist < 120 && player.invincible <= 0)
        damagePlayer(Math.floor(22 * dmgMult));
      spawnParticle(boss.x + boss.w / 2, boss.y + boss.h, C.stone, 15, 5);
      playSound('heavyAttack');
      break;

    case 'throwRocks':
      for (let i = 0; i < 3; i++) {
        const angle = Math.PI / 2 + (i - 1) * 0.3;
        particlesList.push({
          x: boss.x + boss.w / 2, y: boss.y,
          vx: Math.cos(angle) * -boss.facing * 4, vy: Math.sin(angle) * -4,
          life: 60, maxLife: 60, color: C.stoneDark, size: 6,
          isProjectile: true, damage: Math.floor(12 * dmgMult),
        });
      }
      playSound('hit');
      break;

    case 'throwRocks5':
      for (let i = 0; i < 5; i++) {
        const angle = Math.PI / 2 + (i - 2) * 0.25;
        particlesList.push({
          x: boss.x + boss.w / 2, y: boss.y,
          vx: Math.cos(angle) * -boss.facing * 5, vy: Math.sin(angle) * -5,
          life: 50, maxLife: 50, color: C.stoneDark, size: 7,
          isProjectile: true, damage: Math.floor(14 * dmgMult),
        });
      }
      playSound('hit');
      break;

    case 'charge':
      // Step-based charge to prevent wall-skip
      {
        const chargeDist = boss.facing * 150;
        stepCharge(boss, chargeDist, 8);
        boss.vx = boss.facing * 6;
        if (checkOverlap(player, boss) && player.invincible <= 0)
          damagePlayer(Math.floor(20 * dmgMult));
        spawnParticle(boss.x + boss.w / 2, boss.y + boss.h, C.stoneDark, 10, 3);
        playSound('heavyAttack');
      }
      break;

    case 'aoeStomp':
      if (dist < 150 && player.invincible <= 0)
        damagePlayer(Math.floor(25 * dmgMult));
      spawnParticle(boss.x + boss.w / 2, boss.y + boss.h, C.red, 20, 6);
      spawnParticle(boss.x + boss.w / 2 - 50, boss.y + boss.h, C.stone, 8, 3);
      spawnParticle(boss.x + boss.w / 2 + 50, boss.y + boss.h, C.stone, 8, 3);
      playSound('heavyAttack');
      break;

    // Raja Hutan attacks
    case 'pounce': {
      // Step-based pounce to prevent wall-skip
      const pounceDist = boss.facing * 120;
      stepCharge(boss, pounceDist, 8);
      if (checkOverlap(player, boss) && player.invincible <= 0)
        damagePlayer(Math.floor(20 * dmgMult));
      spawnParticle(boss.x + boss.w / 2, boss.y + boss.h / 2, C.grassLight, 10, 4);
      playSound('heavyAttack');
      break;
    }

    case 'clawCombo':
      // BUG FIX v0.6.2: Replaced setTimeout with frame-based combo tracking.
      // setTimeout broke game loop synchronization and could deal damage
      // after boss died or game state changed.
      boss.comboHits = 3;
      boss.comboHitTimer = 0;
      playSound('hit');
      break;

    case 'summonMinions':
      boss.summonCount = (boss.summonCount || 0) + 1;
      bossSummonQueue.push({ stageId: boss.stageId, count: 2 });
      spawnFloatingText(boss.x + boss.w / 2, boss.y - 20, 'Memanggil!', C.red);
      spawnParticle(boss.x + boss.w / 2, boss.y + boss.h / 2, C.goldDark, 15, 5, 30);
      playSound('boss');
      break;

    case 'roar':
      if (dist < 130 && player.invincible <= 0) {
        damagePlayer(Math.floor(10 * dmgMult));
        if (player.stunTimer !== undefined) player.stunTimer = 45;
        spawnFloatingText(player.x, player.y - 30, 'Stun!', C.orange);
      }
      spawnParticle(boss.x + boss.w / 2, boss.y + boss.h / 4, C.orange, 12, 5, 40);
      playSound('boss');
      break;

    // Naga Api attacks
    case 'fireBreath': {
      // Cone of fire projectiles
      for (let i = 0; i < 7; i++) {
        const angle = (i - 3) * 0.15;
        const dir = boss.facing;
        particlesList.push({
          x: boss.x + boss.w / 2, y: boss.y + boss.h / 3,
          vx: dir * (4 + Math.random() * 2) + Math.sin(angle) * 2,
          vy: Math.cos(angle) * 1.5 - 1,
          life: 45, maxLife: 45, color: C.orange, size: 5,
          isProjectile: true, damage: Math.floor(12 * dmgMult),
        });
      }
      spawnParticle(boss.x + boss.w / 2, boss.y + boss.h / 3, C.lava, 10, 4, 20);
      playSound('heavyAttack');
      break;
    }

    case 'tailSwipe':
      if (dist < 100 && player.invincible <= 0)
        damagePlayer(Math.floor(18 * dmgMult));
      spawnParticle(boss.x + boss.w / 2 - boss.facing * 40, boss.y + boss.h / 2, C.red, 8, 4);
      playSound('hit');
      break;

    case 'meteorRain':
      // BUG FIX v0.6.2: Replaced setTimeout with immediate spawn of all meteors
      // with randomized positions. The delayed version broke game loop sync.
      for (let i = 0; i < 5; i++) {
        const mx = boss.x + (Math.random() - 0.5) * 300;
        particlesList.push({
          x: mx, y: boss.y - 200 - i * 40,
          vx: 0, vy: 5,
          life: 50, maxLife: 50, color: C.lava, size: 8,
          isProjectile: true, damage: Math.floor(15 * dmgMult),
        });
      }
      playSound('boss');
      break;

    case 'fireCharge': {
      // Step-based fire charge to prevent wall-skip
      const fcDist = boss.facing * 180;
      stepCharge(boss, fcDist, 8);
      boss.vx = boss.facing * 8;
      if (checkOverlap(player, boss) && player.invincible <= 0)
        damagePlayer(Math.floor(25 * dmgMult));
      spawnParticle(boss.x + boss.w / 2, boss.y + boss.h, C.lava, 15, 5);
      playSound('heavyAttack');
      break;
    }

    // Raksasa Laut attacks
    case 'tidalWave':
      for (let i = 0; i < 8; i++) {
        const angle = (i - 4) * 0.2;
        particlesList.push({
          x: boss.x + boss.w / 2, y: boss.y + boss.h / 2,
          vx: boss.facing * (3 + i * 0.5), vy: Math.sin(angle) * 2 - 2,
          life: 60, maxLife: 60, color: C.water, size: 6,
          isProjectile: true, damage: Math.floor(10 * dmgMult),
        });
      }
      spawnParticle(boss.x + boss.w / 2, boss.y + boss.h, C.cyan, 15, 5);
      playSound('heavyAttack');
      break;

    case 'tentacleSlam':
      if (dist < 130 && player.invincible <= 0)
        damagePlayer(Math.floor(22 * dmgMult));
      spawnParticle(boss.x + boss.w / 2 - boss.facing * 50, boss.y + boss.h, C.water, 10, 5);
      spawnParticle(boss.x + boss.w / 2 + boss.facing * 50, boss.y + boss.h, C.water, 10, 5);
      playSound('heavyAttack');
      break;

    case 'whirlpool': {
      // BUG FIX v0.6.2: Respect dodge invincibility; check wall collision
      // after pulling player to avoid pushing them through walls
      if (!player.dodging) {
        const pullStrength = 3;
        const pullDir = player.x < boss.x ? 1 : -1; // +1 = pulled right, -1 = pulled left
        player.x += pullStrength * pullDir;
        // Wall collision check for pulled player
        const pullCols = tileCollision(player.x, player.y, player.w, player.h, player.prevY);
        pullCols.forEach(c => {
          if (c.oneway) return;
          // BUG FIX v0.6.3: Collision resolution must push player BACK
          // (opposite to pull direction), not through the wall.
          if (pullDir > 0) player.x = c.x - player.w;   // pulled right → push left
          else player.x = c.x + c.w;                     // pulled left → push right
        });
      }
      if (dist < 60 && player.invincible <= 0)
        damagePlayer(Math.floor(15 * dmgMult));
      spawnParticle(boss.x + boss.w / 2, boss.y + boss.h, C.cyan, 20, 4, 50);
      spawnFloatingText(boss.x + boss.w / 2, boss.y - 20, 'Whirlpool!', C.cyan);
      playSound('boss');
      break;
    }

    case 'frostBreath':
      for (let i = 0; i < 5; i++) {
        const angle = (i - 2) * 0.2;
        particlesList.push({
          x: boss.x + boss.w / 2, y: boss.y + boss.h / 3,
          vx: boss.facing * (3 + i * 0.3) + Math.sin(angle) * 1,
          vy: Math.cos(angle) * 1.5,
          life: 50, maxLife: 50, color: C.cyan, size: 5,
          isProjectile: true, damage: Math.floor(10 * dmgMult),
        });
      }
      // Slow player
      if (dist < 100 && player.invincible <= 0) {
        if (player.slowTimer !== undefined) player.slowTimer = 120;
        spawnFloatingText(player.x, player.y - 20, 'Pelan!', C.cyan);
      }
      spawnParticle(boss.x + boss.w / 2, boss.y + boss.h / 3, C.blue, 8, 3, 15);
      playSound('heavyAttack');
      break;

    // Raksasa Terakhir attacks
    case 'divineStrike':
      if (dist < 140 && player.invincible <= 0)
        damagePlayer(Math.floor(30 * dmgMult));
      spawnParticle(boss.x + boss.w / 2, boss.y, C.goldLight, 25, 6, 50);
      spawnParticle(boss.x + boss.w / 2, boss.y + boss.h, C.gold, 15, 5);
      spawnFloatingText(boss.x + boss.w / 2, boss.y - 30, 'Serangan Dewa!', C.goldLight);
      playSound('skill');
      break;

    case 'shieldBash': {
      // Step-based shield bash to prevent wall-skip
      const sbDist = boss.facing * 140;
      stepCharge(boss, sbDist, 8);
      boss.vx = boss.facing * 7;
      if (checkOverlap(player, boss) && player.invincible <= 0) {
        damagePlayer(Math.floor(18 * dmgMult));
        if (player.stunTimer !== undefined) player.stunTimer = 30;
        spawnFloatingText(player.x, player.y - 20, 'Stun!', C.orange);
      }
      spawnParticle(boss.x + boss.w / 2, boss.y + boss.h / 2, C.gold, 10, 4);
      playSound('heavyAttack');
      break;
    }

    case 'earthquake':
      if (dist < 180 && player.invincible <= 0)
        damagePlayer(Math.floor(20 * dmgMult));
      spawnParticle(boss.x + boss.w / 2 - 60, boss.y + boss.h, C.stone, 10, 4, 40);
      spawnParticle(boss.x + boss.w / 2, boss.y + boss.h, C.red, 15, 5, 40);
      spawnParticle(boss.x + boss.w / 2 + 60, boss.y + boss.h, C.stone, 10, 4, 40);
      playSound('boss');
      break;

    case 'summonPhase':
      boss.summonCount = (boss.summonCount || 0) + 2;
      bossSummonQueue.push({ stageId: boss.stageId, count: 3 });
      spawnFloatingText(boss.x + boss.w / 2, boss.y - 30, 'Raksasa Memanggil!', C.red);
      spawnParticle(boss.x + boss.w / 2, boss.y + boss.h / 2, C.red, 20, 5, 40);
      playSound('boss');
      break;

    default:
      playSound('hit');
      break;
  }
}
