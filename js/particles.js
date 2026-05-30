// ============================================================
// particles.js — Particle and floating text system
// ============================================================

import { C } from './config.js';

export let particles = [];
export let floatingTexts = [];

// Shared references for enemy/boss damage (set from game.js)
let damageEnemyFn = null;
let damageBossFn = null;
let getEntitiesFn = null;
let getBossFn = null;
let getBossActiveFn = null;

export function setDamageCallbacks(dmgEnemy, dmgBoss, getEnts, getBoss, getBossActive) {
  damageEnemyFn = dmgEnemy;
  damageBossFn = dmgBoss;
  getEntitiesFn = getEnts;
  getBossFn = getBoss;
  getBossActiveFn = getBossActive;
}

export function spawnParticle(x, y, color, count = 5, speed = 3, life = 30) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd = Math.random() * speed + 0.5;
    particles.push({
      x, y, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd - 1,
      life, maxLife: life, color, size: Math.random() * 3 + 1,
    });
  }
}

export function spawnFloatingText(x, y, text, color) {
  floatingTexts.push({ x, y, text, color, life: 60, vy: -1.5 });
}

export function updateParticles(hitStopTimer, player, damagePlayer) {
  if (hitStopTimer > 0) return;
  particles = particles.filter(p => {
    p.x += p.vx; p.y += p.vy;
    if (p.isProjectile) p.vy += 0.1;
    else p.vy += 0.05;
    p.life--;

    if (p.isProjectile && p.damage) {
      const pb = { x: p.x - p.size, y: p.y - p.size, w: p.size * 2, h: p.size * 2 };

      // BUG FIX v0.6.2: Player arrows (isPlayerArrow) should hit enemies/boss,
      // not the player. Enemy/boss projectiles hit the player as before.
      if (p.isPlayerArrow) {
        // Check against enemies
        if (getEntitiesFn && damageEnemyFn) {
          const ents = getEntitiesFn();
          let hitSomething = false;
          for (let i = 0; i < ents.length; i++) {
            const e = ents[i];
            if (e.type === 'enemy' && e.alive && rectsOverlapCheck(e, pb)) {
              let dmg = p.damage;
              if (e.staggered) dmg = Math.floor(dmg * 1.5);
              damageEnemyFn(e, dmg, ents);
              hitSomething = true;
              break;
            }
          }
          if (hitSomething) return false;
        }
        // Check against boss
        if (getBossActiveFn && getBossFn && damageBossFn) {
          const boss = getBossFn();
          const bossActive = getBossActiveFn();
          if (bossActive && boss && boss.alive && boss.invincible <= 0 && rectsOverlapCheck(boss, pb)) {
            let dmg = p.damage;
            if (boss.staggered) dmg = Math.floor(dmg * 1.5);
            damageBossFn(boss, dmg);
            return false;
          }
        }
        // Player arrows do NOT damage the player
      } else {
        // Enemy/boss projectiles damage the player
        if (player.invincible <= 0 && rectsOverlapCheck(player, pb)) {
          damagePlayer(p.damage);
          return false;
        }
      }
    }
    return p.life > 0;
  });
  floatingTexts = floatingTexts.filter(ft => {
    ft.y += ft.vy;
    ft.life--;
    return ft.life > 0;
  });
}

function rectsOverlapCheck(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function clearParticles() {
  particles = [];
  floatingTexts = [];
}
