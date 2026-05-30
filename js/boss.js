// ============================================================
// boss.js — Boss update logic and attack execution
// ============================================================

import {
  GRAVITY, MAX_FALL, BOSS_MAX_POSTURE, BOSS_POSTURE_RECOVERY,
  BOSS_RECOVERY_FRAMES, BOSS_STAGGER_DURATION, C,
} from './config.js';
import { playSound } from './audio.js';
import { tileCollision } from './physics.js';
import { spawnParticle, spawnFloatingText, particles as particlesList } from './particles.js';
import { damagePlayer } from './player.js';

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
  boss.vy += GRAVITY;
  if (boss.vy > MAX_FALL) boss.vy = MAX_FALL;

  // Phase
  const hpPct = boss.hp / boss.maxHp;
  if (hpPct > 0.66) boss.phase = 1;
  else if (hpPct > 0.33) boss.phase = 2;
  else boss.phase = 3;

  // Recovery
  if (boss.recoveryTimer > 0) {
    boss.recoveryTimer--;
    boss.vx = 0;
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

  // Chase player
  const dx = (player.x + player.w / 2) - (boss.x + boss.w / 2);
  boss.facing = dx > 0 ? 1 : -1;
  let moveSpeed = boss.phase === 3 ? 2.2 : (boss.phase === 2 ? 1.8 : 1.2);
  boss.vx = boss.facing * moveSpeed;

  // Attack pattern selection
  boss.attackTimer++;
  let attackThreshold = boss.phase === 3 ? 55 : (boss.phase === 2 ? 75 : 100);

  if (boss.attackTimer > attackThreshold) {
    boss.attackTimer = 0;
    chooseBossAttack(boss, dx);
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
    damagePlayer(10);
  }

  boss.animTimer++;
  if (boss.animTimer > 12) { boss.animTimer = 0; boss.animFrame = (boss.animFrame + 1) % 2; }
}

function applyBossGravity(boss) {
  boss.y += boss.vy;
  boss.grounded = false;
  const colsY = tileCollision(boss.x, boss.y, boss.w, boss.h, boss.prevY);
  colsY.forEach(c => {
    if (boss.vy > 0) { boss.y = c.y - boss.h; boss.vy = 0; boss.grounded = true; }
    else if (boss.vy < 0 && !c.oneway) { boss.y = c.y + c.h; boss.vy = 0; }
  });
}

function chooseBossAttack(boss, dx) {
  const absDx = Math.abs(dx);
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

export function executeBossAttack(boss, player) {
  const dx = (player.x + player.w / 2) - (boss.x + boss.w / 2);
  const dist = Math.abs(dx);
  const checkOverlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  switch (boss.telegraphType) {
    case 'armSwipe':
      if (dist < 110 && player.invincible <= 0) {
        damagePlayer(boss.phase === 3 ? 25 : (boss.phase === 2 ? 20 : 15));
      }
      spawnParticle(boss.x + boss.w / 2 + boss.facing * 40, boss.y + boss.h / 2, C.stone, 8, 4);
      break;
    case 'groundPound':
      if (dist < 120 && player.invincible <= 0) damagePlayer(22);
      spawnParticle(boss.x + boss.w / 2, boss.y + boss.h, C.stone, 15, 5);
      break;
    case 'throwRocks':
      for (let i = 0; i < 3; i++) {
        const angle = Math.PI / 2 + (i - 1) * 0.3;
        particlesList.push({
          x: boss.x + boss.w / 2, y: boss.y,
          vx: Math.cos(angle) * -boss.facing * 4, vy: Math.sin(angle) * -4,
          life: 60, maxLife: 60, color: C.stoneDark, size: 6,
          isProjectile: true, damage: 12,
        });
      }
      break;
    case 'throwRocks5':
      for (let i = 0; i < 5; i++) {
        const angle = Math.PI / 2 + (i - 2) * 0.25;
        particlesList.push({
          x: boss.x + boss.w / 2, y: boss.y,
          vx: Math.cos(angle) * -boss.facing * 5, vy: Math.sin(angle) * -5,
          life: 50, maxLife: 50, color: C.stoneDark, size: 7,
          isProjectile: true, damage: 14,
        });
      }
      break;
    case 'charge':
      boss.vx = boss.facing * 6;
      boss.x += boss.vx * 5;
      if (checkOverlap(player, boss) && player.invincible <= 0)
        damagePlayer(boss.phase === 3 ? 28 : 20);
      spawnParticle(boss.x + boss.w / 2, boss.y + boss.h, C.stoneDark, 10, 3);
      break;
    case 'aoeStomp':
      if (dist < 150 && player.invincible <= 0) damagePlayer(25);
      spawnParticle(boss.x + boss.w / 2, boss.y + boss.h, C.red, 20, 6);
      spawnParticle(boss.x + boss.w / 2 - 50, boss.y + boss.h, C.stone, 8, 3);
      spawnParticle(boss.x + boss.w / 2 + 50, boss.y + boss.h, C.stone, 8, 3);
      break;
  }
  playSound('hit');
}
