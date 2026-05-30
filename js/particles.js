// ============================================================
// particles.js — Particle and floating text system
// ============================================================

import { C } from './config.js';

export let particles = [];
export let floatingTexts = [];

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
      if (player.invincible <= 0 && rectsOverlapCheck(player, pb)) {
        damagePlayer(p.damage);
        return false;
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
