// ============================================================
// enemy.js — Enemy update logic (telegraph, stagger, patrol)
// ============================================================

import { GRAVITY, MAX_FALL, HIT_STOP_FRAMES, C } from './config.js';
import { playSound } from './audio.js';
import { tileCollision } from './physics.js';
import { spawnParticle, spawnFloatingText } from './particles.js';
import { damagePlayer } from './player.js';

export function updateEnemies(entities, hitStopTimer, player) {
  if (hitStopTimer > 0) return;

  entities.forEach(e => {
    if (e.type !== 'enemy' || !e.alive) return;
    if (e.hurtTimer > 0) e.hurtTimer--;

    // Staggered
    if (e.staggered) {
      e.staggerTimer--;
      if (e.staggerTimer <= 0) e.staggered = false;
      return;
    }

    e.prevY = e.y;
    e.vy += GRAVITY;
    if (e.vy > MAX_FALL) e.vy = MAX_FALL;

    // Telegraph
    if (e.isTelegraphing) {
      e.telegraphTimer--;
      if (e.telegraphTimer <= 0) {
        e.isTelegraphing = false;
        e.isAttacking = true;
        e.attackAnimTimer = 10;
        e.attackCooldown = 60 + Math.floor(Math.random() * 30);
      }
    }
    // Attack animation
    else if (e.isAttacking) {
      e.attackAnimTimer--;
      if (e.attackAnimTimer === 5) {
        const checkOverlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
        if (checkOverlap(player, e) && player.invincible <= 0) {
          damagePlayer(e.enemyType === 'patung' ? 15 : 10);
        }
      }
      if (e.attackAnimTimer <= 0) e.isAttacking = false;
    }
    // Patrol
    else {
      e.x += e.vx;
      if (e.x <= e.patrol.left || e.x + e.w >= e.patrol.right) {
        e.vx = -e.vx;
        e.facing = e.vx > 0 ? 1 : -1;
      }
      if (e.attackCooldown > 0) e.attackCooldown--;
      else {
        const dist = Math.abs((player.x + player.w / 2) - (e.x + e.w / 2));
        if (dist < 60) {
          e.isTelegraphing = true;
          e.telegraphTimer = 15;
          e.facing = (player.x > e.x) ? 1 : -1;
        }
      }
    }

    // Collision X
    const colsX = tileCollision(e.x, e.y, e.w, e.h, e.prevY);
    colsX.forEach(c => {
      if (c.oneway) return;
      if (e.vx > 0) e.x = c.x - e.w;
      else if (e.vx < 0) e.x = c.x + c.w;
      e.vx = -e.vx;
      e.facing = e.vx > 0 ? 1 : -1;
    });

    // Move Y
    e.y += e.vy;
    e.grounded = false;
    const colsY = tileCollision(e.x, e.y, e.w, e.h, e.prevY);
    colsY.forEach(c => {
      if (e.vy > 0) { e.y = c.y - e.h; e.vy = 0; e.grounded = true; }
      else if (e.vy < 0 && !c.oneway) { e.y = c.y + c.h; e.vy = 0; }
    });

    // Contact damage
    const checkOverlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    if (!e.isTelegraphing && !e.isAttacking && e.attackCooldown <= 0 && checkOverlap(player, e) && player.invincible <= 0) {
      damagePlayer(e.enemyType === 'patung' ? 8 : 5);
      e.attackCooldown = 40;
    }

    e.animTimer++;
    if (e.animTimer > 10) { e.animTimer = 0; e.animFrame = (e.animFrame + 1) % 2; }
  });
}
